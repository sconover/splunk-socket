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

  it('can respond in order using an array of response bodies', function(){
    var http = fakeHttpFactory(),
        body1 = '',
        body2 = ''
    http.urlToResponse['http://fake.com:80/foo'] = ['hello', 'world']

    http.request({host:'fake.com', port:80, path:'/foo', method:'GET'},
      function(response) {
        response.on('data', function(chunk){ body1 = body1 + chunk})
        response.on('end', function(){})
      }
    )

    http.request({host:'fake.com', port:80, path:'/foo', method:'GET'},
      function(response) {
        response.on('data', function(chunk){ body2 = body2 + chunk})
        response.on('end', function(){})
      }
    )

    expect(body1).toEqual('hello')
    expect(body2).toEqual('world')
  })
})
