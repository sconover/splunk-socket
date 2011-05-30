var Handler = require('../lib/splunk-socket/handler')

describe('splunk search server', function(){

  var FakeClient = function(){
    var eventHandlers = {}
    this.on = function(eventName, eventHandlerFunction) {
      eventHandlers[eventName] = eventHandlerFunction
    }
    this.message = function(message) { eventHandlers.message(message) }
    this.disconnect = function() { eventHandlers.disconnect() }
    
    this.sent = []
    var self = this
    this.send = function(jsonStruct) {
      self.sent.push(jsonStruct)
    }
  }
  var FakeRawSocket = function(){
    var eventHandlers = {}
    this.on = function(eventName, eventHandlerFunction) {
      eventHandlers[eventName] = eventHandlerFunction
    }
    this.connection = function(client) { eventHandlers.connection(client) }
  }
  
  it('executes a splunk search based on the json-serialized search received from the client', function(){
    var fakeRawSocket = new FakeRawSocket()
    var server = 
      new Handler({
        user: 'admin',
        password: 'pass',
        host: 'splunk.example.com',
        port: 8089
      }, fakeRawSocket)
    
    var splunkSearchSpy = spyOn(server, 'runSplunkSearch').andCallFake(function() {return {}})
    
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
  
  it('sends results of the search to the client as they come in', function(){
    var fakeRawSocket = new FakeRawSocket()
    var server = new Handler({}, fakeRawSocket)
    
    var splunkSearchSpy = spyOn(server, 'runSplunkSearch').andCallFake(function() {return {}})
    
    var fakeClient = new FakeClient()
    fakeRawSocket.connection(fakeClient)
    
    fakeClient.message(JSON.stringify({search: "source=cars | head 100"}))
    
    var onNextResultsCallback = splunkSearchSpy.mostRecentCall.args[1]
    onNextResultsCallback([{color:'red'},{color:'blue'}])
    
    expect(fakeClient.sent).toEqual([
      {results:[{color:'red'},{color:'blue'}]}
    ])
    
    onNextResultsCallback([{color:'green'}])

    expect(fakeClient.sent).toEqual([
      {results:[{color:'red'},{color:'blue'}]},
      {results:[{color:'green'}]}
    ])

  })

  it('sends error messages to the client if an error occurrs', function(){
    var fakeRawSocket = new FakeRawSocket()
    var server = new Handler({}, fakeRawSocket)
    
    var splunkSearchSpy = spyOn(server, 'runSplunkSearch').andCallFake(function() {return {}})
    
    var fakeClient = new FakeClient()
    fakeRawSocket.connection(fakeClient)
    
    fakeClient.message(JSON.stringify({search: "source=cars | head zzz"}))
    
    var onErrorCallback = splunkSearchSpy.mostRecentCall.args[3]
    onErrorCallback(['Sorry try again'])
    
    expect(fakeClient.sent).toEqual([
      {errors:['Sorry try again']}
    ])    
  })
  

  it('disconnects the client when the search is done', function(){
    var fakeRawSocket = new FakeRawSocket()
    var server = new Handler({}, fakeRawSocket)
    
    var splunkSearchSpy = spyOn(server, 'runSplunkSearch').andCallFake(function() {return {}})
    
    var fakeClient = new FakeClient()
    fakeRawSocket.connection(fakeClient)
    
    fakeClient.message(JSON.stringify({search: "source=cars | head 100"}))
    
    var onDoneCallback = splunkSearchSpy.mostRecentCall.args[2]
    onDoneCallback()
    
    expect(fakeClient.sent).toEqual([
      {done:true}
    ])

  })
})



