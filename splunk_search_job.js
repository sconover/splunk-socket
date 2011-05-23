var QueryString = require("querystring")

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
  var auth = 'Basic ' + new Buffer(options.user + ':' + options.password).toString('base64');
  request.setHeader('Authorization', auth)
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

function createJob(http, requestInfo, callback) {
  simplePOST(
    http,
    {user: requestInfo.user, 
     password: requestInfo.password, 
     host: requestInfo.host, 
     port: requestInfo.port, 
     path: '/services/search/jobs',
     params:{
       search: 'search ' + requestInfo.search, 
       max_count: "" + (requestInfo.max_count || 100),
       required_field_list:"*" //forces splunk to output k-v pair style
                               //see http://splunk-base.splunk.com/answers/24551/structured-fields-and-values-in-json-api-results
     }},
    function(responseBody){
      var getJobIdRegexp = /\<sid\>(.*?)\<\/sid\>/,
          match = getJobIdRegexp.exec(responseBody),
          jobId = match[1]
      
      callback(jobId)
    }
  )
}

function checkWhetherWeHaveAllResults(http, requestInfo, jobId, resultsOffset, callback) {
  simpleGET(
    http, 
    {user: requestInfo.user, 
     password: requestInfo.password,
     host: requestInfo.host, 
     port: requestInfo.port, 
     path: '/services/search/jobs/' + jobId},
    function(responseBody) { 
      var done = responseBody.indexOf('"isDone">1</') >= 0
      var getResultCountRegexp = /name="resultCount">(.*?)<\/s:key>/,
          match = getResultCountRegexp.exec(responseBody),
          resultCount = parseInt(match[1])
      callback(done && resultsOffset >= resultCount) 
    })
}

function fetchJsonResultsForJob(http, requestInfo, jobId, resultsOffset, nextResultsCallback, doneCallback) {
  simpleGET(
    http, 
    {user: requestInfo.user, 
     password: requestInfo.password,
     host: requestInfo.host, 
     port: requestInfo.port, 
     path: '/services/search/jobs/' + jobId + '/results?output_mode=json&offset=' + resultsOffset},
    function(responseBody) {
      if (responseBody) {
        var results = JSON.parse(responseBody)
        nextResultsCallback(results)
        var adjustedResultsOffset = resultsOffset + results.length
        checkWhetherWeHaveAllResults(http, requestInfo, jobId, adjustedResultsOffset, function(done){
          if (done) {
            doneCallback()
          } else {
            fetchJsonResultsForJob(http, 
                                   requestInfo, 
                                   jobId, 
                                   adjustedResultsOffset, 
                                   nextResultsCallback, 
                                   doneCallback)
          }
        })        
      } else {
        setTimeout(function() {
          fetchJsonResultsForJob(http, 
                                 requestInfo, 
                                 jobId, 
                                 resultsOffset, 
                                 nextResultsCallback, 
                                 doneCallback)          
        }, 500)
      }
      
    })
}

exports.SplunkSearchJob = function(requestInfo, configCallback) {
  var http = requestInfo.http || require("https")
  delete requestInfo.http
  
  var nextResultsCallback = function(){}
  this.onNextResults = function(callback){nextResultsCallback = callback}
  
  var doneCallback = function(){}
  this.onDone = function(callback){doneCallback = callback}
  
  configCallback(this)
  
  this.run = function(){
    var resultsOffset = 0
    createJob(
      http, 
      requestInfo, 
      function(jobId){ fetchJsonResultsForJob(http, 
                                              requestInfo, 
                                              jobId, 
                                              resultsOffset, 
                                              nextResultsCallback, 
                                              doneCallback) }
    )
  }
}