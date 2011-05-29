exports.fakeHttpFactory = (function(){
  var urlToResponse = {}
  
  return {
  	urlToResponse:urlToResponse,
  	request: function(options, callback) {
      var responseEventToCallback = {},
          response = {
            on: function(eventName, eventCallback) {
              responseEventToCallback[eventName] = eventCallback
            }
         	}
      
  	  callback(response)
  	  var url = 'http://' + options.host + ':' + options.port + options.path,
  	      response = urlToResponse[url]

  	  if (typeof response == 'undefined') throw new Error('No response found for url: ' + url)
  	  
  	  var body = null
  	  if (typeof response == 'string') {
  	    body = response
  	  } else {
  	    if (response.length>=1) {
  	      body = response.shift()
  	    } else {
  	      throw 'No responses left in fake http for url: ' + url
  	    }
  	  }
  	  
      halfway = parseInt(body.length/2),
      firstPart = body.substring(0, halfway),
      secondPart = body.substring(halfway),
      dataCallNumber = 0
      
      responseEventToCallback['data'](firstPart)
      responseEventToCallback['data'](secondPart)
      responseEventToCallback['end']()
      
      return this
  	},
  	write: function(){},
  	setHeader: function(){},
  	end: function(){}
  }
})