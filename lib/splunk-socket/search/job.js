var libxmljs = require("libxmljs");

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

function dictToJsObject(dictElement) {
  var obj = {},
      children = dictElement.childNodes()
  for (var i=0; i<children.length; i++) {
    var child = children[i]
    if (child.name()=='key') {
      var name = child.attr('name').value()
      obj[name] = valueOf(child)
    }
  }
  return obj
}

function childElements(parent) {
  var elements = []
  var children = parent.childNodes()
  for (var i=0; i<children.length; i++) {
    if (children[i].name() != 'text') elements.push(children[i])
  }
  return elements
}

function firstElementChild(parent) {
  var elements = childElements(parent)
  if (elements.length>=1) {
    return elements[0]
  } else {
    return parent.child(0)
  }
}

function valueOf(element) {
  var firstChild = firstElementChild(element)
  if (firstChild === null) {
    return null
  } else if (firstChild.name()=='dict') {
    return dictToJsObject(firstChild)
  } else if (firstChild.name()=='list') {
    var items = [],
        list = childElements(firstChild)
    for (var i=0; i<list.length; i++) items.push(valueOf(list[i]))
    return items
  } else {
    return element.text().replace(/^[\s]+/, "").replace(/[\s]+$/, "")
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
      function(responseBodyXml) { statusCallback(parseStatus(responseBodyXml)) })
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

module.exports.parseStatus = parseStatus