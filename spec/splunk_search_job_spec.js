var fakeHttpFactory = require('./fake_http').fakeHttpFactory
var SplunkSearchJob = require('../splunk_search_job').SplunkSearchJob

describe('splunk search job', function(){
  beforeEach(function(){
    this.http = fakeHttpFactory()
  })
  
  
  //!! resultCount !!
  
  it('kicks off a search job', function(){
    this.http.urlToResponse['http://splunk.example.com:8089/services/search/jobs'] = 
      "<?xml version='1.0' encoding='UTF-8'?>\n" +
      "<response><sid>1234.567</sid></response>"
    
    this.http.urlToResponse['http://splunk.example.com:8089/services/search/jobs/1234.567/results?output_mode=json&offset=0'] =
      '[' + resultJson({color:'red'}) + ',' + resultJson({color:'green'}) + ']'
    
    this.http.urlToResponse['http://splunk.example.com:8089/services/search/jobs/1234.567'] = []
    this.http.urlToResponse['http://splunk.example.com:8089/services/search/jobs/1234.567'].
      push(jobResponseXml({isDone:0, resultCount:2}))

    this.http.urlToResponse['http://splunk.example.com:8089/services/search/jobs/1234.567/results?output_mode=json&offset=2'] =
      '[' + resultJson({color:'blue'}) + ']'
    
    this.http.urlToResponse['http://splunk.example.com:8089/services/search/jobs/1234.567'].
      push(jobResponseXml({isDone:1, resultCount:3}))
    
    var allResults = [],
        done = false
    new SplunkSearchJob({
      http: this.http,
      user: 'admin',
      password: 'pass',
      host: 'splunk.example.com',
      port: 8089,
      search: "source=cars color=red | head 10"
    }, function(searchJob){
      searchJob.onNextResults(  function(results){ allResults.push.apply(allResults, results) })
      searchJob.onDone(         function()       { done = true })
    }).run()
    
    expect(allResults).toEqual([{color:'red'}, {color:'green'}, {color:'blue'}])
    expect(done).toEqual(true)
  })
  
  
  function jobResponseXml(contentKeys) {
    var keysXml = "\n"
    for (var k in contentKeys) keysXml = keysXml + 
                                         '      <s:key name="' + k + '">' +
                                         contentKeys[k] +
                                         '</s:key>'
                                         "\n"
    
    return ['<?xml version="1.0" encoding="UTF-8"?>',
            '<?xml-stylesheet type="text/xml" href="/static/atom.xsl"?>',
            '<entry xmlns="http://www.w3.org/2005/Atom" xmlns:s="http://dev.splunk.com/ns/rest" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">',
            '  <content type="text/xml">',
            '    <s:dict>',
            keysXml,
            '    </s:dict>',
            '  </content>',
            '</entry>'].join("\n")
  }
  
  function resultJson(entries) {
    var entriesArr = []
    for (var k in entries) {
      entriesArr.push('  "' + k + '": "' + entries[k] + '"')
    }
    return "{\n" + entriesArr.join(",\n") + "\n}"
  }
})


// {
//  "_cd": "8:77888833",
//  "_indextime": "1305939922",
//  "_kv": "1",
//  "_raw": "",
//  "_serial": "93",
//  "_sourcetype": "cars_sourcetype",
//  "_time": "2011-05-15T19:33:32.000+00:00",
//  "date_hour": "19",
//  "date_mday": "15",
//  "date_minute": "33",
//  "date_month": "may",
//  "date_second": "32",
//  "date_wday": "sunday",
//  "date_year": "2011",
//  "date_zone": "local",
//  "index": "main",
//  "source": "cars",
//  "sourcetype": "cars_sourcetype",
//  "splunk_server": "splunk.example.com",
//  "timestartpos": "66",
//  "timeendpos": "85"
// }


// <s:key name="cursorTime">1970-01-01T00:00:00.000+00:00</s:key>
// <s:key name="delegate"></s:key>
// <s:key name="diskUsage">196608</s:key>
// <s:key name="dispatchState">DONE</s:key>
// <s:key name="doneProgress">1.00000</s:key>
// <s:key name="dropCount">0</s:key>
// <s:key name="earliestTime">2009-06-27T03:46:27.000+00:00</s:key>
// <s:key name="eventAvailableCount">855</s:key>
// <s:key name="eventCount">855</s:key>
// <s:key name="eventFieldCount">6</s:key>
// <s:key name="eventIsStreaming">1</s:key>
// <s:key name="eventIsTruncated">0</s:key>
// <s:key name="eventSearch">search source</s:key>
// <s:key name="eventSorting">desc</s:key>
// <s:key name="isDone">1</s:key>
// <s:key name="isFailed">0</s:key>
// <s:key name="isFinalized">0</s:key>
// <s:key name="isPaused">0</s:key>
// <s:key name="isPreviewEnabled">0</s:key>
// <s:key name="isRealTimeSearch">0</s:key>
// <s:key name="isRemoteTimeline">0</s:key>
// <s:key name="isSaved">0</s:key>
// <s:key name="isSavedSearch">0</s:key>
// <s:key name="isZombie">0</s:key>
// <s:key name="keywords">source</s:key>
// <s:key name="label"></s:key>
// <s:key name="latestTime">1970-01-01T00:00:00.000+00:00</s:key>
// <s:key name="numPreviews">0</s:key>
// <s:key name="priority">5</s:key>
// <s:key name="remoteSearch">litsearch source | fields  keepcolorder=t "host" "index" "linecount" "source" "sourcetype" "splunk_server"</s:key>
// <s:key name="reportSearch"></s:key>
// <s:key name="resultCount">855</s:key>
// <s:key name="resultIsStreaming">1</s:key>
// <s:key name="resultPreviewCount">855</s:key>
// <s:key name="runDuration">3.101000</s:key>
// <s:key name="scanCount">855</s:key>
// <s:key name="sid">1306074485.2925</s:key>
// <s:key name="statusBuckets">0</s:key>
// <s:key name="ttl">587</s:key>




