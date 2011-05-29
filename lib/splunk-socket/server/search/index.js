var SplunkSearchJob = require("./job")
var SplunkHttp = require("./splunk-http")

module.exports = function(requestInfo, configCallback) {
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
    
    var job = new SplunkSearchJob(splunkHttp, requestInfo)    
    job.create(function(jobId){ job.fetchJsonResultsForJob(nextResultsCallback, doneCallback) })
  }
}