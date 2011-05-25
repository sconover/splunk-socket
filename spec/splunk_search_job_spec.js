var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var SplunkSearchJob = require('../splunk_search').SplunkSearchJob

describe('splunk search job', function(){
  beforeEach(function(){
    this.fakeHttp = fakeHttpFactory()
  })
  
  it('posts a search job', function(){
    var http = this.fakeHttp,
        httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
        httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
    
    var job = new SplunkSearchJob(http, {
                user: "bob",
                password: "pass",
                host: "splunk.example.com",
                port: 8089
              })
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
    
  it('fetches json results for a job', function(){
    var http = this.fakeHttp,
        httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
        httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
    
    var job = new SplunkSearchJob(http, {
                user: "bob",
                password: "pass",
                host: "splunk.example.com",
                port: 8089
              })
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
  
  
  
})