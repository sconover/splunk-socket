var libxmljs = require("libxmljs");

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

function parseStatus(jobStatusXmlStr) {
  var status = {}
  var doc = libxmljs.parseXmlString(jobStatusXmlStr)
  var entries = doc.find('//s:key', {"s": 'http://dev.splunk.com/ns/rest'})
  for (var i=0; i<entries.length; i++) {
    var name = entries[i].attr('name').value()
    var value = entries[i].text()
    status[name] = value
  }
  return status
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
      if (requestInfo[k].push) {
        searchOptions[k] = requestInfo[k].join(',')
      } else {
        searchOptions[k] = requestInfo[k]
      }
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
      function(responseBodyXml) { 
        var status = parseStatus(responseBodyXml)
        statusCallback(status)
      })
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
          // throw new Error("no results. test-drive changes to handle this.")
          setTimeout(function() {
            self.fetchJsonResultsForJob(nextResultsCallback, doneCallback, adjustedResultsOffset)          
          }, 100)
        }

      })
  }
}

module.exports.parseStatus = parseStatus