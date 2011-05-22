var QueryString = require("querystring")

function simplePOST(http, options, responseBodyCallback) {
  var responseBody = ''
  var request = http.request({
    host: options.host, 
    port: options.port, 
    path: options.path,
    method: 'POST'
  }, function(response){
    response.on('data', function(chunk){ responseBody = responseBody + chunk })
    response.on('end',       function(){ responseBodyCallback(responseBody) })
  })
  request.write(QueryString.stringify(options.params))
  request.end()
}

function simpleGET(http, options, responseBodyCallback) {
  var responseBody = ''
  var request = http.request({
    host: options.host, 
    port: options.port, 
    path: options.path,
    method: 'GET'
  }, function(response){
    response.on('data', function(chunk){ responseBody = responseBody + chunk })
    response.on('end',       function(){ responseBodyCallback(responseBody) })
  })
  request.end()
}

function createJob(http, requestInfo, callback) {
  simplePOST(
    http,
    {host: requestInfo.host, 
     port: requestInfo.port, 
     path: '/services/search/jobs',
     params:{
       search: requestInfo.search, 
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

function checkWhetherJobIsDone(http, requestInfo, jobId, callback) {
  simpleGET(
    http, 
    {host: requestInfo.host, 
     port: requestInfo.port, 
     path: '/services/search/jobs/' + jobId},
    function(responseBody) { callback(responseBody.indexOf('"isDone">1</') >= 0) })
}

function fetchJsonResultsForJob(http, requestInfo, jobId, resultsOffset, nextResultsCallback, doneCallback) {
  simpleGET(
    http, 
    {host: requestInfo.host, 
     port: requestInfo.port, 
     path: '/services/search/jobs/' + jobId + '/results?output_mode=json&offset=' + resultsOffset},
    function(responseBody) {
      var results = JSON.parse(responseBody)
      nextResultsCallback(results)
      checkWhetherJobIsDone(http, requestInfo, jobId, function(done){
        if (done) {
          doneCallback()
        } else {
          fetchJsonResultsForJob(http, 
                                 requestInfo, 
                                 jobId, 
                                 resultsOffset + results.length + 1, 
                                 nextResultsCallback, 
                                 doneCallback)
        }
      })
    })
}

exports.SplunkSearchJob = function(requestInfo, configCallback) {
  var http = requestInfo.http || require("http")
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