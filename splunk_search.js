var QueryString = require("querystring")

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

var SplunkHttp = exports.SplunkHttp = function(http, options) {
  function simpleRequest(http, options, requestConfigCallback, responseBodyCallback) {
    var responseBody = ''
    var request = http.request({
      host: options.host, 
      port: options.port, 
      path: options.path,
      method: options.method
    }, function(response){
      response.on('data', function(chunk){ responseBody = responseBody + chunk })
      response.on('end',       function(){ responseBodyCallback(responseBody) })
    })
    request.setHeader('Authorization', 
                      'Basic ' + new Buffer(options.user + ':' + options.password).toString('base64'))
    requestConfigCallback(request)
    request.end()  
  }

  this.get = function(path, responseBodyCallback) {
    simpleRequest(http, 
                  extend({path:path, method:'GET'}, options), 
                  function(){}, 
                  responseBodyCallback)
  }
  
  this.post = function(path, params, responseBodyCallback) {
    simpleRequest(http, 
                  extend({path:path, method:'POST'}, options), 
                  function(request){ 
                    var postBody = QueryString.stringify(params)
                    request.setHeader('Content-Length', "" + postBody.length)
                    request.write(postBody) 
                  }, 
                  responseBodyCallback)  
  }
}

exports.SplunkSearchJob = function(splunkHttp, requestInfo) {
  this._jobId = null
  
  this.create = function(gotJobIdCallback) {
    var self = this
    
    splunkHttp.post(
      '/services/search/jobs', 
      { search: 'search ' + requestInfo.search, 
        max_count: "" + (requestInfo.max_count || 100),
        required_field_list:"*" //forces splunk to output k-v pair style
                                 //see http://splunk-base.splunk.com/answers/24551/structured-fields-and-values-in-json-api-results
      },
      function(responseBody) {
        var getJobIdRegexp = /\<sid\>(.*?)\<\/sid\>/,
            match = getJobIdRegexp.exec(responseBody)
        
        self._jobId = match[1]
        gotJobIdCallback(self._jobId)      
      }
    )    
  }
  
  function checkWhetherWeHaveAllResults(jobId, resultsOffset, callback) {
    splunkHttp.get(
      '/services/search/jobs/' + jobId, 
      function(responseBody) { 
        var done = responseBody.indexOf('"isDone">1</') >= 0
        var getResultCountRegexp = /name="resultCount">(.*?)<\/s:key>/,
            match = getResultCountRegexp.exec(responseBody),
            resultCount = parseInt(match[1])
        callback(done && resultsOffset >= resultCount) 
      })
  }
  
  this.fetchJsonResultsForJob = function(nextResultsCallback, doneCallback, resultsOffset) {
    resultsOffset = resultsOffset || 0
    var self = this


    splunkHttp.get(
      '/services/search/jobs/' + self._jobId + '/results?output_mode=json&offset=' + resultsOffset, 
      function(responseBody) {
        if (responseBody) {
          var results = JSON.parse(responseBody)
          nextResultsCallback(results)
          var adjustedResultsOffset = resultsOffset + results.length
          checkWhetherWeHaveAllResults(self._jobId, adjustedResultsOffset, function(done){
            if (done) {
              doneCallback()
            } else {
              self.fetchJsonResultsForJob(nextResultsCallback, doneCallback, adjustedResultsOffset)
            }
          })        
        } else {
          throw new Error("no results. test-drive changes to handle this.")
          // setTimeout(function() {
          //   again(nextResultsCallback, doneCallback, adjustedResultsOffset)          
          // }, 500)
        }

      })
  }
  
  
}

exports.SplunkSearch = function(requestInfo, configCallback) {
  var http = requestInfo.http || require("https")
  delete requestInfo.http
  
  var splunkHttp = 
    new SplunkHttp(http, {
      user: requestInfo.user, 
      password: requestInfo.password, 
      host: requestInfo.host, 
      port: requestInfo.port
    })
  
  
  var nextResultsCallback = function(){}
  this.onNextResults = function(callback){nextResultsCallback = callback}
  
  var doneCallback = function(){}
  this.onDone = function(callback){doneCallback = callback}
  
  configCallback(this)
  
  this.run = function(){
    var resultsOffset = 0
    
    var job = new exports.SplunkSearchJob(splunkHttp, requestInfo)    
    job.create(function(jobId){ job.fetchJsonResultsForJob(nextResultsCallback, doneCallback) })
  }
}