var QueryString = require("querystring")

function extend(toExtend, other) {
  for (var k in other) toExtend[k] = other[k]
  return toExtend
}

module.exports = function(http, options) {
  function simpleRequest(http, options, requestConfigCallback, responseBodyCallback) {
    var responseBody = ''
    var request = http.request({
      host: options.host, 
      port: options.port, 
      path: options.path,
      method: options.method
    }, function(response){
      response.on('data', function(chunk){ responseBody = responseBody + chunk })
      response.on('end',       function(){ responseBodyCallback(responseBody) })
    })
    request.setHeader('Authorization', 
                      'Basic ' + new Buffer(options.user + ':' + options.password).toString('base64'))
    requestConfigCallback(request)
    request.end()  
  }

  this.get = function(path, responseBodyCallback) {
    simpleRequest(http, 
                  extend({path:path, method:'GET'}, options), 
                  function(){}, 
                  responseBodyCallback)
  }
  
  this.post = function(path, params, responseBodyCallback) {
    simpleRequest(http, 
                  extend({path:path, method:'POST'}, options), 
                  function(request){ 
                    var postBody = QueryString.stringify(params)
                    request.setHeader('Content-Length', "" + postBody.length)
                    request.write(postBody) 
                  }, 
                  responseBodyCallback)  
  }
}
