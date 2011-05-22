var fakeHttpFactory = require('./fake_http').fakeHttpFactory

describe('fake http', function(){
  it('acts like a minimal http.request', function(){
    var http = fakeHttpFactory(),
        body = '',
        ended = false
    http.urlToResponse['http://fake.com:80/foo'] = 'hello world'

    http.request({host:'fake.com', port:80, path:'/foo', method:'GET'},
      function(response) {
        response.on('data', function(chunk){ body = body + chunk})
        response.on('end', function(){ended = true})
      }
    )

    expect(body).toEqual('hello world')
    expect(ended).toEqual(true)
  })
})
