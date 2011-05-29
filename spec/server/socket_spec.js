var SplunkServerSocket = require('../../lib/splunk-socket/server/socket')

describe('splunk server socket', function(){

  var FakeClient = function(){
    var eventHandlers = {}
    this.on = function(eventName, eventHandlerFunction) {
      eventHandlers[eventName] = eventHandlerFunction
    }
    this.message = function(message) { eventHandlers.message(message) }
    this.disconnect = function() { eventHandlers.disconnect() }
  }
  var FakeRawSocket = function(){
    var eventHandlers = {}
    this.on = function(eventName, eventHandlerFunction) {
      eventHandlers[eventName] = eventHandlerFunction
    }
    this.connection = function(client) { eventHandlers.connection(client) }
  }
  
  it('executes a splunk search based on the message received from the client', function(){
    var fakeRawSocket = new FakeRawSocket()
    var splunkSocket = 
      new SplunkServerSocket({
        user: 'admin',
        password: 'pass',
        host: 'splunk.example.com',
        port: 8089
      }, fakeRawSocket)
    
    var splunkSearchSpy = spyOn(splunkSocket, 'runSplunkSearch').andCallFake(function() {return {}})
    
    var fakeClient = new FakeClient()
    fakeRawSocket.connection(fakeClient)
    
    fakeClient.message(JSON.stringify(
      {search: "source=cars | head 100"}
    ))
    
    expect(splunkSearchSpy.mostRecentCall.args[0]).toEqual({
      user: 'admin',
      password: 'pass',
      host: 'splunk.example.com',
      port: 8089,
      search: "source=cars | head 100"
    })
  })

})



