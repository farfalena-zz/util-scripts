#!/usr/bin/env node
var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('extract', 'extract translations of taxonomies as key-value structure')
  .demand(['u'])
  .alias('u', 'url')
  .nargs('u', 1)
  .describe('u', 'Load a file')
  .demand(['o'])
  .alias('o', 'output')
  .nargs('o', 1)
  .describe('o', 'Specify the output nature')
  .alias('d', 'outputDir')
  .nargs('d', 1)
  .describe('d', 'Specify the output directory')
  .alias('t', 'type')
  .nargs('t', 1)
  .describe('t', 'Specify the JSON path of the object to extract')
  .alias('m', 'mapping')
  .nargs('m', 1)
  .describe('m', 'Specify an object to map found codes to new ones')
  .alias('s', 'source')
  .nargs('s', 1)
  .describe('s', 'Specify the source translations, locales or languages')
  .argv;
var fs = require('fs')
var YAML = require('yamljs')
var _ = require('lodash')
var sync = require('sync-request')

var i18n_root_pattern = /^define\({"root": ([^}]*}).*\);$/
var i18n_trans_pattern = /^define\((.*)\);$/

var locales = require('./locales.json')
if (!_.isUndefined(argv.source) && argv.source == 'languages'){
  locales = require('./languages.json')
}

if (!_.isUndefined(argv.mapping)){
  var mapping = JSON.parse(argv.mapping)
}
var localizations = {}

for (var i in locales) {
  if (i==4 || i==7){
    continue
  }
  try {
    var locale = locales[i]
    var language = locale.match(/^([a-z]{2}).*$/)[1]
    var url = argv.url.replace(/\/[a-z]{2}\//,'/'+language+'/')
    if (language=='en'){
      url = url.replace(/\/[a-z]{2}\//,'/')
    }
    console.log('GET '+ url + '...');
    var response = sync('GET', url)

    if (response.statusCode!=200) {
      console.log('Unsuccessful call to URL '+url+ '. Status code '+response.statusCode)
      continue
    }
    var body = response.body.toString('utf8')
    var contents = JSON.parse(body.match(language=='en'? i18n_root_pattern : i18n_trans_pattern)[1])
    if (!_.isEmpty(contents)){
      if (_.isUndefined(localizations[locale])){
        localizations[locale] = {}
      }
      // Extract the object if argv.type is given
      // KISS for now, but proper JSON Path needs to be supported
      if (!_.isUndefined(argv.type)) {
        // Multiple types
        var types = argv.type.split(' ')
        var new_contents = {}
        for (var j in types) {
          var type = types[j]
          if (_.isUndefined(contents[type])) {
            throw new Error('The type '+type+' is not available in this file')
          }
          new_contents[type] = contents[type]
        }
        contents = new_contents
      }
      contents = _.mapValues(contents, function(v) {
        if (_.isArray(v)) {
          var v_obj = {}
          for (var l in v) {
            if (_.isNull(v[l])) {
              continue;
            }
            v_obj[(parseInt(l)+1)] = v[l].trim()
          }
          return v_obj
        } else {
          return v.trim()
        }
      })
      if (!_.isUndefined(mapping)){
        contents = _.mapKeys(contents, function(value, key) {
          return _.isUndefined(mapping[key]) ? key : mapping[key]
        })
      }
      // Check for jsonpath keys
      var toRemove = []
      var obj = {}
      for (var key in contents) {
        if (key.indexOf('.')==-1){
          continue
        }
        toRemove.push(key)
        var result = {}
        deepFill(key, contents[key], result)
        _.merge(contents, result)
        delete contents[key]
      }
      localizations[locale] = contents
    }
  } catch (err) {
    console.log('An error has occured '+err.message)
    continue;
  }
}
// console.log(localizations)
// Write each one to seperate file
console.log('Translation Locales: '+_.keys(localizations))
for (var locale in localizations) {
  var filePath = argv.outputDir + '/'+ argv.output + '.' + locale + '.yml'
  var output = {}
  output[locale] = localizations[locale]
  fs.writeFileSync(filePath, YAML.stringify(output, 4, 2))
}

function deepFill (key, value, object) {
  var parts = key.split('.')

  if (object[parts[0]] == null) {
    object[parts[0]] = {}
  }

  if (parts.length > 1) {
    deepFill(parts.slice(1).join('.'), value, object[parts[0]])
  } else {
    object[parts[0]] = value
  }
}
