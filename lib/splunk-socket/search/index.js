var Job = require("./job")
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
  
  delete requestInfo.user
  delete requestInfo.password
  delete requestInfo.host
  delete requestInfo.port
  
  var nextResultsCallback = function(){}
  this.onNextResults = function(callback){nextResultsCallback = callback}
  
  var doneCallback = function(){}
  this.onDone = function(callback){doneCallback = callback}
  
  var errorCallback = function(){}
  this.onError = function(callback){errorCallback = callback}
  
  configCallback(this)
  
  this.run = function(){
    var resultsOffset = 0
    
    var job = new Job(apiClient, requestInfo)    
    job.create(function(jobId){ 
      job.getJobStatus(function(status) {
        if (status.isFailed=='1') {
          errorCallback(status.messages.error)
        } else {
          job.fetchJsonResultsForJob(nextResultsCallback, doneCallback) 
        }
      })
    })
  }
}