var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var SplunkHttp = require('../../../lib/splunk-socket/server/search/splunk-http')
var SplunkSearchJob = require('../../../lib/splunk-socket/server/search/job')

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
    
    describe('requesting results', function(){
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
    
    
    describe('getting results', function(){
      it("returns next results, calls back. not all results have arrived yet.", function(){
        var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
        job.checkWhetherWeHaveAllResults = function(offsetNotImportant, allResultsCallback){
          allResultsCallback(false)
        }

        var splunkHttpSpy = spyOn(this.splunkHttp, 'get').
          andCallFake(function(path, responseBodyCallback) {
            if (path.indexOf("results")>=0) {
              responseBodyCallback('[{"a":"101","b":"102"}, {"a":"201","b":"202"}]')
            } else {
              responseBodyCallback("<foo>\n<s:key name=\"isDone\">1</s:key>\n<s:key name=\"resultCount\">2</s:key>\n</foo>")
            }
            
          })
    
        var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
        job._jobId = "1234.567"    
        job.fetchJsonResultsForJob(function(results){
          expect(results).toEqual([{a:"101",b:"102"}, {a:"201",b:"202"}])
        }, function(done){
          expect(done).toEqual(true)
        }, 
        0)
      })
    })
    
    //todo: fake out checkWhetherWeHaveAllResults, 
      //test nextResultsCallback and doneCallback 
  })
  
  describe('checking whether we have all the results for an existing search job', function(){
    it('requests job status', function(){
      var splunkHttpSpy = spyOn(this.splunkHttp, 'get').andCallFake(function() {})
      var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
      job._jobId = "1234.567"    
      job.checkWhetherWeHaveAllResults(7, function(){})
      
      expect(splunkHttpSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567')
    })

    it('is not finished if isDone != 1, even if the offset is > the result count', function(){
      var splunkHttpSpy = 
        spyOn(this.splunkHttp, 'get').
          andCallFake(function(url, responseBodyCallback) {
            responseBodyCallback("<foo>\n<s:key name=\"isDone\">0</s:key>\n<s:key name=\"resultCount\">5</s:key>\n</foo>")
          })
      var job = new SplunkSearchJob(this.splunkHttp, {search:"foo"})
      job._jobId = "1234.567"    
      job.checkWhetherWeHaveAllResults(7, 
        function(weHaveAllResults) { expect(weHaveAllResults).toEqual(false) })
    })

    it('is not finished if isDone = 1, but the offset is < the result count', function(){
      var splunkHttpSpy = 
        spyOn(this.splunkHttp, 'get').
          andCallFake(function(url, responseBodyCallback) {
            responseBodyCallback("<foo>\n<s:key name=\"isDone\">1</s:key>\n<s:key name=\"resultCount\">9</s:key>\n</foo>")
          })
      var job = new SplunkSearchJob(this.splunkHttp, {})  
      job.checkWhetherWeHaveAllResults(7, 
        function(weHaveAllResults) { expect(weHaveAllResults).toEqual(false) })
    })

    it('is finished if isDone = 1 and the offset is = the result count', function(){
      var splunkHttpSpy = 
        spyOn(this.splunkHttp, 'get').
          andCallFake(function(url, responseBodyCallback) {
            responseBodyCallback("<foo>\n<s:key name=\"isDone\">1</s:key>\n<s:key name=\"resultCount\">7</s:key>\n</foo>")
          })
      var job = new SplunkSearchJob(this.splunkHttp, {})
      job.checkWhetherWeHaveAllResults(7, 
        function(weHaveAllResults) { expect(weHaveAllResults).toEqual(true) })
    })
  })  
  
})