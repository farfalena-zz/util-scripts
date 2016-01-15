#!/usr/bin/env node
var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('extract', 'extract translations of taxonomies as key-value structure')
  .demand(['f'])
  .alias('f', 'file')
  .nargs('f', 1)
  .describe('f', 'Load a file')
  .demand(['o'])
  .alias('o', 'output')
  .nargs('o', 1)
  .describe('o', 'Specify the output nature')
  .alias('d', 'outputDir')
  .nargs('d', 1)
  .describe('d', 'Specify the output directory')
  .demand(['t'])
  .alias('t', 'type')
  .nargs('t', 1)
  .describe('t', 'Specify the XSD SimpleType')
  .alias('m', 'mapping')
  .nargs('m', 1)
  .describe('m', 'Specify an object to map found codes to new ones')
  .argv;
var fs = require('fs')
var xml2js = require('xml2js')
var YAML = require('yamljs')
var _ = require('lodash')

var pattern = {
  languages: /^[a-z]{2}$/,
  countries: /^[A-Z]{2}$/
}
if (!_.isUndefined(argv.mapping)){
  var mapping = JSON.parse(argv.mapping)
}

console.log('Extracting '+argv.output+' and type ' + argv.type)
try {
  var filedata = fs.readFileSync(argv.f, 'utf8')
} catch (ex) {
  console.log('Failed to read file at '+argv.f)
  console.log(ex)
  process.exit(1)
}
var parser = new xml2js.Parser({preserveChildrenOrder:true})
parser.parseString(filedata, function(error, result) {
  if (error) throw error

  var localizations = {}

  var xmlTypes = result['xsd:schema']['xsd:simpleType']

  var types = xmlTypes.filter(function(t){
    if (t['$'].name == argv.type){
      return t
    }
  })
  var type = types[0]

  var codesInfo = type['xsd:restriction'][0]['xsd:enumeration']
  for (var i in codesInfo) {
    var codeInfo = codesInfo[i]

    var code = codeInfo['$']['value']
    if (code.match(pattern[argv.output])==null) {
      continue;
    }
    // See if there is a mapping for this code
    if (!_.isUndefined(mapping) && !_.isUndefined(mapping[code])){
      code = mapping[code]
    }

    var documentation = codeInfo['xsd:annotation'][0]['xsd:documentation']

    for (var j in documentation){
      var doc = documentation[j]
      var lang = doc['$']['xml:lang']
      var translation = doc['_']
      if (_.isUndefined(translation)){
        continue
      }
      if (_.isUndefined(localizations[lang])){
        localizations[lang] = {}
      }
      localizations[lang][code] = translation.trim()
    }
  }
  // console.log(localizations)

  // Enrich en with ISO list
  if (argv.output == 'countries') {
    var iso_countries = require('./iso-3166-countries.json')
    for (var iso_country in iso_countries) {
      if (_.isEmpty(iso_country)) {
        continue
      }
      if (_.isUndefined(localizations['en'][iso_country])) {
        localizations['en'][iso_country] = iso_countries[iso_country]
      }
    }
    console.log(localizations['en'])
  }

  // Write each one to seperate file
  console.log('Translation Languages: '+_.keys(localizations))
  for (var locale in localizations) {
    var filePath = argv.outputDir + '/'+ argv.output + '.' + locale + '.yml'
    var output = {}
    output[locale] = localizations[locale]
    fs.writeFileSync(filePath, YAML.stringify(output, 2, 2))
  }

})



