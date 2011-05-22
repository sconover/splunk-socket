exports.fakeHttpFactory = (function(){
  var urlToResponse = {}
  
  return {
  	urlToResponse:urlToResponse,
  	request: function(options, callback) {
      var responseEventToEventCallback = {},
          response = {
            on: function(eventName, eventCallback) {
              responseEventToEventCallback[eventName] = eventCallback
            }
         	}
      
  	  callback(response)
  	  
  	  var body = urlToResponse["http://" + options.host + ":" + options.port + options.path],
  	      halfway = parseInt(body.length/2),
  	      firstPart = body.substring(0, halfway),
  	      secondPart = body.substring(halfway),
  	      dataCallNumber = 0
      
      responseEventToEventCallback['data'](firstPart)
      responseEventToEventCallback['data'](secondPart)
      responseEventToEventCallback['end']()
  	}
  }
})