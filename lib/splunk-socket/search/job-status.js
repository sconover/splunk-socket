var libxmljs = require("libxmljs");

function dictToJsObject(dictElement) {
  var obj = {},
      children = dictElement.childNodes()
  for (var i=0; i<children.length; i++) {
    var child = children[i]
    if (child.name()=='key') {
      var name = child.attr('name').value()
      obj[name] = valueOf(child)
    }
  }
  return obj
}

function childElements(parent) {
  var elements = []
  var children = parent.childNodes()
  for (var i=0; i<children.length; i++) {
    if (children[i].name() != 'text') elements.push(children[i])
  }
  return elements
}

function firstElementChild(parent) {
  var elements = childElements(parent)
  if (elements.length>=1) {
    return elements[0]
  } else {
    return parent.child(0)
  }
}

function valueOf(element) {
  var firstChild = firstElementChild(element)
  if (firstChild === null) {
    return null
  } else if (firstChild.name()=='dict') {
    return dictToJsObject(firstChild)
  } else if (firstChild.name()=='list') {
    var items = [],
        list = childElements(firstChild)
    for (var i=0; i<list.length; i++) items.push(valueOf(list[i]))
    return items
  } else {
    return element.text().replace(/^[\s]+/, "").replace(/[\s]+$/, "")
  }
}



module.exports = {}
module.exports.parse = function(jobStatusXmlStr) {
  var doc = libxmljs.parseXmlString(jobStatusXmlStr),
      firstDict = doc.get('//s:dict', {"s": 'http://dev.splunk.com/ns/rest'})
  return dictToJsObject(firstDict)
}
