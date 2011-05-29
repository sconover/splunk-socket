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
      self.runSplunkSearch(
        extend(JSON.parse(serializedSplunkSearch), splunkConnectionInfo),
        function(results){ client.send({results:results}) },
        function(results){ client.send({done:true}) }
      )
    })

  })

}