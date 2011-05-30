var Search = require('./search')

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

var Handler = function(splunkConnectionInfo, rawSocket) {
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

Handler.run = function(port, splunkConnectionInfo) {
  var http = require('http'), 
      io = require('socket.io'),
      server = http.createServer(function(req, res){
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end('This is the splunk-socket search server. Use /splunk-socket to run searches.')
      })

  server.listen(port)
  var socket = io.listen(server, {resource:'/splunk-socket'})
  new Handler(splunkConnectionInfo, socket)
}

module.exports = Handler