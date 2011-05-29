require('./search')

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

module.exports = function(splunkConnectionInfo, rawSocket) {
  this.runSplunkSearch = function(searchInfo, nextResultsCallback, doneCallback) { 
    new SplunkSearch(
      searchInfo,
      function(search) {
        search.onNextResults(nextResultsCallback)
        search.onDone(doneCallback)
      }
    ).run() 
  }
  
  var self = this

  rawSocket.on('connection', function(client) {

    client.on('message', function(serializedSplunkSearch){
      var searchInfo = extend(JSON.parse(serializedSplunkSearch), splunkConnectionInfo)
      self.runSplunkSearch(
        searchInfo,
        function(results){ client.send(results) }
      )
    })

  })

}