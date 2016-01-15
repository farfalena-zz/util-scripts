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
  .alias('m', 'mapping')
  .nargs('m', 1)
  .describe('m', 'Specify an object to map found codes to new ones')
  .argv;
var fs = require('fs')
var YAML = require('yamljs')
var _ = require('lodash')
var sync = require('sync-request')

var i18n_root_pattern = /^define\({"root": ([^}]*}).*\);$/
var i18n_trans_pattern = /^define\((.*)\);$/
var languages = require('./languages.json')

if (!_.isUndefined(argv.mapping)){
  var mapping = JSON.parse(argv.mapping)
}
var localizations = {}

for (var i in languages) {
  var language = languages[i]
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
    if (_.isUndefined(localizations[language])){
      localizations[language] = {}
    }
    contents = _.mapValues(contents, function(v) {
      return v.trim()
    })
    if (!_.isUndefined(mapping)){
      contents = _.mapKeys(contents, function(value, key) {
        return _.isUndefined(mapping[key]) ? key : mapping[key]
      })
    }
    localizations[language] = contents
  }
}
// console.log(localizations)
// Write each one to seperate file
console.log('Translation Languages: '+_.keys(localizations))
for (var locale in localizations) {
  var filePath = argv.outputDir + '/'+ argv.output + '.' + locale + '.yml'
  var output = {}
  output[locale] = localizations[locale]
  fs.writeFileSync(filePath, YAML.stringify(output, 2, 2))
}
