var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var ApiClient = require('../../lib/splunk-socket/search/api-client')
var Job = require('../../lib/splunk-socket/search/job')

describe('splunk search job', function(){
  beforeEach(function(){
    this.apiClient = new ApiClient(fakeHttpFactory(), {
                           user: "bob",
                           password: "pass",
                           host: "splunk.example.com",
                           port: 8089
                         })
  })
  
  
  describe('a new search job', function(){
    it('creates a job', function(){
      var apiClientSpy = spyOn(this.apiClient, 'post').andCallFake(function() {})
    
      var job = new Job(this.apiClient, {search:"source=foo | head 1"})
      job.create(function(){})

      expect(apiClientSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs')
      expect(apiClientSpy.mostRecentCall.args[1].search).toEqual('search source=foo | head 1')
    })

    it('passes through other params to the splunk search', function(){
      var apiClientSpy = spyOn(this.apiClient, 'post').andCallFake(function() {})
    
      var job = new Job(this.apiClient, {search:"source=foo | head 1", 
                                         max_count:277})
      job.create(function(){})
      
      var postedSearchOptions = apiClientSpy.mostRecentCall.args[1]
      expect(postedSearchOptions.search).toEqual('search source=foo | head 1')
      expect(postedSearchOptions.max_count).toEqual(277)
    })

    it('turns arrays into comma separated lists', function(){
      var apiClientSpy = spyOn(this.apiClient, 'post').andCallFake(function() {})
    
      var job = new Job(this.apiClient, {search:"source=foo | head 1", 
                                         required_field_list:['color', 'model']})
      job.create(function(){})
      
      var postedSearchOptions = apiClientSpy.mostRecentCall.args[1]
      expect(postedSearchOptions.search).toEqual('search source=foo | head 1')
      expect(postedSearchOptions.required_field_list).toEqual('color,model')
    })
  })
  
  describe('parsing job status', function(){
    it('parses simple keys and values', function(){
      var status = Job.parseStatus(
        '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
          '<s:dict>' +
            '<s:key name="isDone">1</s:key>' +
            '<s:key name="resultCount">2</s:key>' +
          '</s:dict>' +
        '</foo>'
      )
      expect(status).toEqual({isDone:'1', resultCount:'2'})
    })

    it('parses sub dicts as js objects', function(){
      var status = Job.parseStatus(
        '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
          '<s:dict>' +
            '<s:key name="request">' +
              '<s:dict>' +
                '<s:key name="max_count">100</s:key>' +
                '<s:key name="required_field_list">*</s:key>' +
                '<s:key name="search">search source=cars | head zzz</s:key>' +
              '</s:dict>' +
            '</s:key>' +
          '</s:dict>' +
        '</foo>'
      )
      expect(status).toEqual({
        request:{
          max_count:'100',
          required_field_list:'*',
          search:'search source=cars | head zzz'
        }
      })
    })

    it('parses sub dicts as js objects', function(){
      var status = Job.parseStatus(
        '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
          '<s:dict>' +
            '<s:key name="someKey">' +
               '<s:list>' +
                 '<s:item>First item</s:item>' +
                 '<s:item>Second item</s:item>' +
               '</s:list>' +
            '</s:key>' +
          '</s:dict>' +
        '</foo>'
      )
      expect(status).toEqual({
        someKey:[
          'First item',
          'Second item'
        ]
      })
    })

    it('strips leading and trailing whitespace', function(){
      var status = Job.parseStatus(
        '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
          '<s:dict>' +
            '<s:key name="someKey">' +
               '<s:list>' +
                 "<s:item>\n\n\tFirst\n item\n\t   \n</s:item>" +
               '</s:list>' +
            '</s:key>' +
          '</s:dict>' +
        '</foo>'
      )
      expect(status).toEqual({
        someKey:["First\n item"]
      })
    })

    it('parses sub dicts and lists (integration, with text elements)', function(){
      var status = Job.parseStatus(
        '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
          '<s:dict>' +
            '<s:key name="messages">' +
              '   ' +
              '<s:dict>' +
                '<s:key name="fatal">' +
                  '<s:list>' +
                    '<s:item>Something fatal</s:item>' +
                  '</s:list>' +
                '</s:key>' +
                '<s:key name="error">' +
                  '<s:list>  ' +
                    '<s:item>Some error</s:item>' +
                  '  </s:list>' +
                '</s:key>' +
              '</s:dict>' +
            '</s:key>' +
          '</s:dict>' +
        '</foo>'
      )
      
      expect(status).toEqual({
        messages:{
          fatal:['Something fatal'],
          error:['Some error']
        }
      })
    })

    it('handles empty elements', function(){
      var status = Job.parseStatus(
        '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
          '<s:dict>' +
            '<s:key name="empty"></s:key>' +
          '</s:dict>' +
        '</foo>'
      )
      
      expect(status).toEqual({empty:null})
    })
  })
  
  describe('fetching results for an existing search job', function(){
    
    describe('requesting results', function(){
      it('makes a call to get results for the job', function(){
        var apiClientSpy = spyOn(this.apiClient, 'get').andCallFake(function() {})
    
        var job = new Job(this.apiClient, {search:"foo"})
        job._jobId = "1234.567"    
        job.fetchJsonResultsForJob(function(){}, function(){})

        expect(apiClientSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567/results?output_mode=json&offset=0')
      })
    
      it('makes a call with the incremented offset to get more results', function(){
        var apiClientSpy = spyOn(this.apiClient, 'get').andCallFake(function() {})
    
        var job = new Job(this.apiClient, {search:"foo"})
        job._jobId = "1234.567"    
        job.fetchJsonResultsForJob(function(){}, function(){}, 7)

        expect(apiClientSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567/results?output_mode=json&offset=7')
      })
    })
    
    
    describe('getting results', function(){
      it("returns next results, calls back", function(){
        var job = new Job(this.apiClient, {search:"foo"})
        job.checkWhetherWeHaveAllResults = function(offsetNotImportant, allResultsCallback){
          allResultsCallback(false)
        }

        var apiClientSpy = spyOn(this.apiClient, 'get').
          andCallFake(function(path, responseBodyCallback) {
            if (path.indexOf("results")>=0) {
              responseBodyCallback('[{"a":"101","b":"102"}, {"a":"201","b":"202"}]')
            } else {
              responseBodyCallback(
                '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
                  '<s:dict>' +
                    '<s:key name="isDone">1</s:key>' +
                    '<s:key name="resultCount">2</s:key>' +
                  '</s:dict>' +
                '</foo>'
              )
            }
            
          })
    
        var job = new Job(this.apiClient, {search:"foo"})
        job._jobId = "1234.567"    
        job.fetchJsonResultsForJob(function(results){
          expect(results).toEqual([{a:"101",b:"102"}, {a:"201",b:"202"}])
        }, function(done){
          expect(done).toEqual(true)
        }, 
        0)
      })
    })
    
    // <?xml version='1.0' encoding='UTF-8'?>
    // <response><messages><msg type='FATAL'>Error in &apos;head&apos; command: The argument must be a positive number or a boolean expression.</msg></messages></response>
    //todo: fake out checkWhetherWeHaveAllResults, 
      //test nextResultsCallback and doneCallback 
  })
  
  describe('checking whether we have all the results for an existing search job', function(){
    it('requests job status', function(){
      var apiClientSpy = spyOn(this.apiClient, 'get').andCallFake(function() {})
      var job = new Job(this.apiClient, {search:"foo"})
      job._jobId = "1234.567"    
      job.checkWhetherWeHaveAllResults(7, function(){})
      
      expect(apiClientSpy.mostRecentCall.args[0]).toEqual('/services/search/jobs/1234.567')
    })

    it('is not finished if isDone != 1, even if the offset is > the result count', function(){
      var apiClientSpy = 
        spyOn(this.apiClient, 'get').
          andCallFake(function(url, responseBodyCallback) {
            responseBodyCallback(
              '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
                '<s:dict>' +
                  '<s:key name="isDone">0</s:key>' +
                  '<s:key name="resultCount">5</s:key>' +
                '</s:dict>' +
              '</foo>'
            )
          })
      var job = new Job(this.apiClient, {search:"foo"})
      job._jobId = "1234.567"    
      job.checkWhetherWeHaveAllResults(7, 
        function(weHaveAllResults) { expect(weHaveAllResults).toEqual(false) })
    })

    it('is not finished if isDone = 1, but the offset is < the result count', function(){
      var apiClientSpy = 
        spyOn(this.apiClient, 'get').
          andCallFake(function(url, responseBodyCallback) {
            responseBodyCallback(
              '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
                '<s:dict>' +
                  '<s:key name="isDone">1</s:key>' +
                  '<s:key name="resultCount">9</s:key>' +
                '</s:dict>' +
              '</foo>'
            )
          })
      var job = new Job(this.apiClient, {})  
      job.checkWhetherWeHaveAllResults(7, 
        function(weHaveAllResults) { expect(weHaveAllResults).toEqual(false) })
    })

    it('is finished if isDone = 1 and the offset is = the result count', function(){
      var apiClientSpy = 
        spyOn(this.apiClient, 'get').
          andCallFake(function(url, responseBodyCallback) {
            responseBodyCallback(
              '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
                '<s:dict>' +
                  '<s:key name="isDone">1</s:key>' +
                  '<s:key name="resultCount">7</s:key>' +
                '</s:dict>' +
              '</foo>'
            )
          })
      var job = new Job(this.apiClient, {})
      job.checkWhetherWeHaveAllResults(7, 
        function(weHaveAllResults) { expect(weHaveAllResults).toEqual(true) })
    })
  })  
  
})