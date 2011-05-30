var libxmljs = require("libxmljs");

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

function dictToJsObject(dictElement) {
  var obj = {}
  var children = dictElement.childNodes()
  for (var i=0; i<children.length; i++) {
    var child = children[i]
    if (child.name()=='key') {
      var name = child.attr('name').value()
      obj[name] = valueOf(child)
    }
  }
  return obj
}

function valueOf(element) {
  if (element.child(0).name()=='dict') {
    return dictToJsObject(element.child(0))
  } else if (element.child(0).name()=='list') {
    var items = []
    var list = element.child(0).childNodes()
    for (var i=0; i<list.length; i++) items.push(list[i].text())
    return items
  } else {
    return element.text()
  }
}

function parseStatus(jobStatusXmlStr) {
  var doc = libxmljs.parseXmlString(jobStatusXmlStr),
      firstDict = doc.get('//s:dict', {"s": 'http://dev.splunk.com/ns/rest'})
  return dictToJsObject(firstDict)
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