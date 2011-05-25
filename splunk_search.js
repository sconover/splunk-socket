var QueryString = require("querystring")

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

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

function simplePOST(http, options, responseBodyCallback) {
  options.method = 'POST'
  simpleRequest(http, 
                options, 
                function(request){ 
                  var postBody = QueryString.stringify(options.params)
                  request.setHeader('Content-Length', "" + postBody.length)
                  request.write(postBody) 
                }, 
                responseBodyCallback)  
}

function simpleGET(http, options, responseBodyCallback) {
  options.method = 'GET'
  simpleRequest(http, 
                options, 
                function(){}, 
                responseBodyCallback)
}

exports.SplunkSearchJob = function(http, requestInfo) {
  var basicSplunkHttpOptions = {
        user: requestInfo.user, 
        password: requestInfo.password, 
        host: requestInfo.host, 
        port: requestInfo.port
      }
  this._jobId = null
  
  this.create = function(gotJobIdCallback) {
    var self = this
    simplePOST(
      http,
      extend({
        path: '/services/search/jobs',
        params:{
          search: 'search ' + requestInfo.search, 
          max_count: "" + (requestInfo.max_count || 100),
          required_field_list:"*" //forces splunk to output k-v pair style
                                   //see http://splunk-base.splunk.com/answers/24551/structured-fields-and-values-in-json-api-results
        } 
      }, basicSplunkHttpOptions),
      function(responseBody){
        var getJobIdRegexp = /\<sid\>(.*?)\<\/sid\>/,
            match = getJobIdRegexp.exec(responseBody)
        
        self._jobId = match[1]
        gotJobIdCallback(self._jobId)
      }
    )
  }
  
  function checkWhetherWeHaveAllResults(jobId, resultsOffset, callback) {
    simpleGET(
      http, 
      extend({path: '/services/search/jobs/' + jobId}, basicSplunkHttpOptions),
      function(responseBody) { 
        var done = responseBody.indexOf('"isDone">1</') >= 0
        var getResultCountRegexp = /name="resultCount">(.*?)<\/s:key>/,
            match = getResultCountRegexp.exec(responseBody),
            resultCount = parseInt(match[1])
        callback(done && resultsOffset >= resultCount) 
      }
    )    
  }
  
  this.fetchJsonResultsForJob = function(nextResultsCallback, doneCallback, resultsOffset) {
    resultsOffset = resultsOffset || 0
    var self = this
    simpleGET(
      http, 
      extend({path: '/services/search/jobs/' + self._jobId + '/results?output_mode=json&offset=' + resultsOffset},
             basicSplunkHttpOptions),
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
  
  var nextResultsCallback = function(){}
  this.onNextResults = function(callback){nextResultsCallback = callback}
  
  var doneCallback = function(){}
  this.onDone = function(callback){doneCallback = callback}
  
  configCallback(this)
  
  this.run = function(){
    var resultsOffset = 0
    
    var job = new exports.SplunkSearchJob(http, requestInfo)    
    job.create(function(jobId){ job.fetchJsonResultsForJob(nextResultsCallback, doneCallback) })
                // 
                // 
                // fetchJsonResultsForJob(http, 
                //                                       requestInfo, 
                //                                       jobId, 
                //                                       resultsOffset, 
                //                                       nextResultsCallback, 
                //                                       doneCallback) }
    // )
  }
}