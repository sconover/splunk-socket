var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var splunk = require('../splunk_search')
var SplunkHttp = splunk.SplunkHttp
var SplunkSearchJob = splunk.SplunkSearchJob

describe('splunk search job', function(){
  beforeEach(function(){
    this.splunkHttp = new SplunkHttp(fakeHttpFactory(), {
                            user: "bob",
                            password: "pass",
                            host: "splunk.example.com",
                            port: 8089
                          })
  })
  
  
  describe('a new search job', function(){
    it('creates a job', function(){
      var splunkHttpSpy = spyOn(this.splunkHttp, 'post').andCallFake(function() {})
    
      var job = new SplunkSearchJob(this.splunkHttp, {search:"source=foo | head 1"})
      job.create(function(){})

      expect(splunkHttpSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs')
      expect(splunkHttpSpy.mostRecentCall.args[1].search).toEqual('search source=foo | head 1')
    })
  })
  
  describe('fetching results for an existing search job', function(){
    it('makes a call to get results for the job', function(){
      var splunkHttpSpy = spyOn(this.splunkHttp, 'get').andCallFake(function() {})
    
      var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
      job._jobId = "1234.567"    
      job.fetchJsonResultsForJob(function(){}, function(){})

      expect(splunkHttpSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567/results?output_mode=json&offset=0')
    })
    
    it('makes a call with the incremented offset to get more results', function(){
      var splunkHttpSpy = spyOn(this.splunkHttp, 'get').andCallFake(function() {})
    
      var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
      job._jobId = "1234.567"    
      job.fetchJsonResultsForJob(function(){}, function(){}, 7)

      expect(splunkHttpSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567/results?output_mode=json&offset=7')
    })
  })
  
  describe('checking whether we have all the results for an existing search job', function(){
    it('requests job status', function(){
      var splunkHttpSpy = spyOn(this.splunkHttp, 'get').andCallFake(function() {})
      var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
      job._jobId = "1234.567"    
      job.checkWhetherWeHaveAllResults(function(){}, 7)
      
      expect(splunkHttpSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567')
    })
  })  
  
})