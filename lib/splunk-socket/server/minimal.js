var http = require('http'), 
    io = require('socket.io'),
    Handler = require('../handler')
    
exports.run = function(port, splunkConnectionInfo) {
  var server = http.createServer(function(req, res){
        res.writeHead(200, {'Content-Type': 'text/html'})
        res.end('This is the splunk-socket search server. Use /splunk-socket to run searches.')
      })

  server.listen(port)
  var socket = io.listen(server, {resource:'/splunk-socket'})
  new Handler(splunkConnectionInfo, socket)
}
