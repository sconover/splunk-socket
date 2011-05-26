var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var splunk = require('../splunk_search')
var SplunkHttp = splunk.SplunkHttp
var SplunkSearchJob = splunk.SplunkSearchJob

describe('splunk search job', function(){
  beforeEach(function(){
    this.fakeHttp = fakeHttpFactory()
  })
  
  
  describe('a new search job', function(){
    it('creates a job', function(){
      var http = this.fakeHttp,
          httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
          httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
    
      var job = new SplunkSearchJob(new SplunkHttp(http, {
                                      user: "bob",
                                      password: "pass",
                                      host: "splunk.example.com",
                                      port: 8089
                                    }), 
                                    {search:"foo"})
      job.create(function(){})

      expect(httpRequestSpy.mostRecentCall.args[0]).toEqual({
        path : '/services/search/jobs',
        host: "splunk.example.com",
        port: 8089,
        method: 'POST'
      })
    
      expect(httpHeaderSpy.argsForCall[0]).toEqual(
        ['Authorization', 'Basic ' + new Buffer('bob:pass').toString('base64')]
      )
    })
  })
  
  describe('fetching results for an existing search job', function(){
    
    it('makes a call to get results for the job', function(){
      var http = this.fakeHttp,
          httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
          httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
    
      var job = new SplunkSearchJob(new SplunkHttp(http, {
                                      user: "bob",
                                      password: "pass",
                                      host: "splunk.example.com",
                                      port: 8089
                                    }),
                                    {search:"foo"})
      job._jobId = "1234.567"    
      job.fetchJsonResultsForJob(function(){}, function(){})
    
      expect(httpRequestSpy.mostRecentCall.args[0]).toEqual({
        path : '/services/search/jobs/1234.567/results?output_mode=json&offset=0',
        host: "splunk.example.com",
        port: 8089,
        method: 'GET'
      })
    
      expect(httpHeaderSpy.argsForCall[0]).toEqual(
        ['Authorization', 'Basic ' + new Buffer('bob:pass').toString('base64')])
    })
    
    // it('makes a call to get results for the job', function(){
    //   
    // })
    
    it('more results - makes a call with the incremented offset', function(){
      // var http = this.fakeHttp,
      //     httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
      //     httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
      //     
      // var job = new SplunkSearchJob(new SplunkHttp(http), {
      //             user: "bob",
      //             password: "pass",
      //             host: "splunk.example.com",
      //             port: 8089
      //           })
      // job._jobId = "1234.567"    
      // job.fetchJsonResultsForJob(function(){}, function(){})
      //     
      // expect(httpRequestSpy.mostRecentCall.args[0]).toEqual({
      //   path : '/services/search/jobs/1234.567/results?output_mode=json&offset=0',
      //   host: "splunk.example.com",
      //   port: 8089,
      //   method: 'GET'
      // })
      //     
      // expect(httpHeaderSpy.argsForCall[0]).toEqual(
      //   ['Authorization', 'Basic ' + new Buffer('bob:pass').toString('base64')])
    })
    
  })
  
  
  
})