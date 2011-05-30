var Search = require('./search')

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

module.exports = function(splunkConnectionInfo, rawSocket) {
  this.runSplunkSearch = function(searchInfo, nextResultsCallback, doneCallback, errorCallback) { 
    new Search(
      searchInfo,
      function(search) {
        search.onNextResults(nextResultsCallback)
        search.onDone(doneCallback)
        search.onError(errorCallback)
      }
    ).run() 
  }
  
  var self = this

  rawSocket.on('connection', function(client) {

    client.on('message', function(serializedSplunkSearch){
      self.runSplunkSearch(
        extend(JSON.parse(serializedSplunkSearch), splunkConnectionInfo),
        function(results){ client.send({results:results}) },
        function(results){ client.send({done:true}) },
        function(messages){ client.send({errors:messages}) }
      )
    })

  })
}