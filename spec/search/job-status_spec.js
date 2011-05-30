var JobStatus = require('../../lib/splunk-socket/search/job-status')

describe('parsing job status', function(){
  it('parses simple keys and values', function(){
    var status = JobStatus.parse(
      '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
        '<s:dict>' +
          '<s:key name="isDone">1</s:key>' +
          '<s:key name="resultCount">2</s:key>' +
        '</s:dict>' +
      '</foo>'
    )
    expect(status).toEqual({isDone:'1', resultCount:'2'})
  })

  it('parses sub dicts as js objects', function(){
    var status = JobStatus.parse(
      '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
        '<s:dict>' +
          '<s:key name="request">' +
            '<s:dict>' +
              '<s:key name="max_count">100</s:key>' +
              '<s:key name="required_field_list">*</s:key>' +
              '<s:key name="search">search source=cars | head zzz</s:key>' +
            '</s:dict>' +
          '</s:key>' +
        '</s:dict>' +
      '</foo>'
    )
    expect(status).toEqual({
      request:{
        max_count:'100',
        required_field_list:'*',
        search:'search source=cars | head zzz'
      }
    })
  })

  it('parses sub dicts as js objects', function(){
    var status = JobStatus.parse(
      '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
        '<s:dict>' +
          '<s:key name="someKey">' +
             '<s:list>' +
               '<s:item>First item</s:item>' +
               '<s:item>Second item</s:item>' +
             '</s:list>' +
          '</s:key>' +
        '</s:dict>' +
      '</foo>'
    )
    expect(status).toEqual({
      someKey:[
        'First item',
        'Second item'
      ]
    })
  })

  it('strips leading and trailing whitespace', function(){
    var status = JobStatus.parse(
      '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
        '<s:dict>' +
          '<s:key name="someKey">' +
             '<s:list>' +
               "<s:item>\n\n\tFirst\n item\n\t   \n</s:item>" +
             '</s:list>' +
          '</s:key>' +
        '</s:dict>' +
      '</foo>'
    )
    expect(status).toEqual({
      someKey:["First\n item"]
    })
  })

  it('parses sub dicts and lists (integration, with text elements)', function(){
    var status = JobStatus.parse(
      '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
        '<s:dict>' +
          '<s:key name="messages">' +
            '   ' +
            '<s:dict>' +
              '<s:key name="fatal">' +
                '<s:list>' +
                  '<s:item>Something fatal</s:item>' +
                '</s:list>' +
              '</s:key>' +
              '<s:key name="error">' +
                '<s:list>  ' +
                  '<s:item>Some error</s:item>' +
                '  </s:list>' +
              '</s:key>' +
            '</s:dict>' +
          '</s:key>' +
        '</s:dict>' +
      '</foo>'
    )
    
    expect(status).toEqual({
      messages:{
        fatal:['Something fatal'],
        error:['Some error']
      }
    })
  })

  it('handles empty elements', function(){
    var status = JobStatus.parse(
      '<foo xmlns:s="http://dev.splunk.com/ns/rest">' +
        '<s:dict>' +
          '<s:key name="empty"></s:key>' +
        '</s:dict>' +
      '</foo>'
    )
    
    expect(status).toEqual({empty:null})
  })
})