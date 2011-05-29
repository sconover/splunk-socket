var SplunkSearchJob = require("./job")
var ApiClient = require("./api-client")

module.exports = function(requestInfo, configCallback) {
  var http = requestInfo.http || require("https")
  delete requestInfo.http
  
  var apiClient = 
    new ApiClient(http, {
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
    
    var job = new SplunkSearchJob(apiClient, requestInfo)    
    job.create(function(jobId){ job.fetchJsonResultsForJob(nextResultsCallback, doneCallback) })
  }
}