var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var SplunkSearchJob = require('../splunk_search').SplunkSearchJob

describe('splunk search job', function(){
  beforeEach(function(){
    this.fakeHttp = fakeHttpFactory()
  })
  
  //todo:
    //use spies?
    //assert stuff posted to create job
    //assert auth (url + headers)
  
  it('posts a search job', function(){
    var http = this.fakeHttp,
        httpRequestSpy = spyOn(http, 'request').andCallFake(function() {return http}),
        httpHeaderSpy = spyOn(http, 'setHeader').andCallThrough()
    
    var job = new SplunkSearchJob(http, {
                user: "bob",
                password: "pass",
                host: "splunk.example.com",
                port: 8089
              })
    job.create(function(){})
    expect(httpRequestSpy.mostRecentCall.args[0]).toEqual({
      path : '/services/search/jobs',
      host: "splunk.example.com",
      port: 8089,
      method: 'POST'
    })
    
    expect(httpHeaderSpy.argsForCall[0]).toEqual(
      ['Authorization', 'Basic ' + new Buffer('bob:pass').toString('base64')])
  })
  
})