module.exports = function(splunkHttp, requestInfo) {
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
  
  this.checkWhetherWeHaveAllResults = function(resultsOffset, callback) {
    splunkHttp.get(
      '/services/search/jobs/' + this._jobId, 
      function(responseBody) { 
        var done = responseBody.indexOf('"isDone">1</') >= 0
        var getResultCountRegexp = /name="resultCount">(.*?)<\/s:key>/,
            match = getResultCountRegexp.exec(responseBody),
            resultCount = parseInt(match[1])
        callback(done && resultsOffset >= resultCount) 
      })
  }
  
  this.fetchJsonResultsForJob = function(nextResultsCallback, doneCallback, resultsOffset) {
    var self = this
    resultsOffset = resultsOffset || 0
    splunkHttp.get(
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
          //   again(nextResultsCallback, doneCallback, adjustedResultsOffset)          
          // }, 500)
        }

      })
  }
  
  
}
