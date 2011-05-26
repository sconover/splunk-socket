var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var SplunkHttp = require('../splunk_search').SplunkHttp

describe('splunk http', function(){
  beforeEach(function(){
    this.fakeHttp = fakeHttpFactory()
  })
  
  
  it('executes a proper GET', function(){
    var http = this.fakeHttp,
        httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
        httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
  
    var splunkHttp = new SplunkHttp(http, {
                                      user: "bob",
                                      password: "pass",
                                      host: "splunk.example.com",
                                      port: 8089
                                    })
    splunkHttp.get('/foo', function(){})

    expect(httpRequestSpy.mostRecentCall.args[0]).toEqual({
      path : '/foo',
      host: "splunk.example.com",
      port: 8089,
      method: 'GET'
    })
  
    expect(httpHeaderSpy.argsForCall[0]).toEqual(
      ['Authorization', 'Basic ' + new Buffer('bob:pass').toString('base64')]
    )
  })
  
  it('executes a proper POST', function(){
    var http = this.fakeHttp,
        httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
        httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
  
    var splunkHttp = new SplunkHttp(http, {
                                      user: "bob",
                                      password: "pass",
                                      host: "splunk.example.com",
                                      port: 8089
                                    })
    splunkHttp.post('/foo', {a:"1", b:"2"}, function(){})

    expect(httpRequestSpy.mostRecentCall.args[0]).toEqual({
      path : '/foo',
      host: "splunk.example.com",
      port: 8089,
      method: 'POST'
    })
  
    expect(httpHeaderSpy.argsForCall[0]).toEqual(
      ['Authorization', 'Basic ' + new Buffer('bob:pass').toString('base64')]
    )
  })
  
  
})