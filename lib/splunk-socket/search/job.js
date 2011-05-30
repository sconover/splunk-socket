var JobStatus = require("./job-status")

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

module.exports = function(apiClient, requestInfo) {
  this._jobId = null
  
  this.create = function(gotJobIdCallback) {
    var self = this
    
    var searchOptions = {
      required_field_list:"*" //forces splunk to output k-v pair style
                              //see http://splunk-base.splunk.com/answers/24551/structured-fields-and-values-in-json-api-results
    }
    for (var k in requestInfo) {
      searchOptions[k] = requestInfo[k].push ? requestInfo[k].join(',') : requestInfo[k]
    }
    searchOptions.search = 'search ' + requestInfo.search
    apiClient.post(
      '/services/search/jobs', 
      searchOptions,      
      function(responseBody) {
        var getJobIdRegexp = /\<sid\>(.*?)\<\/sid\>/,
            match = getJobIdRegexp.exec(responseBody)
        
        self._jobId = match[1]
        gotJobIdCallback(self._jobId)      
      }
    )    
  }
  
  this.getJobStatus = function(statusCallback) {
    apiClient.get(
      '/services/search/jobs/' + this._jobId, 
      function(responseBodyXml) { statusCallback(JobStatus.parse(responseBodyXml)) })
  }
  
  this.checkWhetherWeHaveAllResults = function(resultsOffset, callback) {
    this.getJobStatus(function(status){
      callback(status.isDone=='1' && resultsOffset >= parseInt(status.resultCount)) 
    })
  }
  
  this.fetchJsonResultsForJob = function(nextResultsCallback, doneCallback, resultsOffset) {
    var self = this
    resultsOffset = resultsOffset || 0
    apiClient.get(
      '/services/search/jobs/' + this._jobId + '/results?output_mode=json&offset=' + resultsOffset, 
      function(responseBody) {
        if (responseBody) {
          var results = JSON.parse(responseBody)
          nextResultsCallback(results)
          var adjustedResultsOffset = resultsOffset + results.length
          self.checkWhetherWeHaveAllResults(adjustedResultsOffset, function(done){
            if (done) {
              doneCallback(true)
            } else {
              self.fetchJsonResultsForJob(nextResultsCallback, doneCallback, adjustedResultsOffset)
            }
          })        
        } else {
          throw new Error("no results. test-drive changes to handle this.")
          // setTimeout(function() {
          //   self.fetchJsonResultsForJob(nextResultsCallback, doneCallback, adjustedResultsOffset)          
          // }, 100)
        }

      })
  }
}