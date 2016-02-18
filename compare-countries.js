#!/usr/bin/env node
var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('generate', 'generate localization resources for kco-countries')
  .demand(['i'])
  .alias('i', 'inputDir')
  .nargs('i', 1)
  .describe('i', 'Specify input directory')
  .demand(['o'])
  .alias('o', 'outputDir')
  .nargs('o', 1)
  .describe('o', 'Specify the output directory')
  .alias('m', 'mapDir')
  .nargs('m', 1)
  .describe('m', 'Specify the directory where the code3 countries translations exist')
  .argv;
var fs = require('fs')
var _ = require('lodash')
var glob = require('glob')
var YAML = require('yamljs')

var inputName = 'countries'
var outputName = 'countries'

var map = require('./country-code-map.json')
var code3Countries = require('./code3-countries.json')

var resources = {}
// Go to the input directory and fetch each translation file
console.log('Fetch from' + argv.inputDir)
glob
  .sync(argv.inputDir+'/'+'countries.*.yml')
  .forEach(function (file) {
    var locale = file.match(/\.([a-z]{2})\./)[1]
    // console.log(locale+': ')
    var translations = YAML.load(file)
    resources[locale] = Object.assign({}, translations[locale])

    // console.log(_.values(map).join(', '))
    // console.log('----')
    // console.log(Object.keys(translations[locale]).join(', '))
    var missing = _.difference(_.values(map), Object.keys(translations[locale]))
    // console.log('----')
    // console.log(missing.join(', '))
    var code3List = code3Countries
    try {
      if (argv.mapDir) {
        code3List = require(argv.mapDir+'/countries.'+locale+'.yml')[locale]
      }
    } catch (e) {}
    missing.forEach(function(code2) {
      code3 = _.findKey(map, function(v) {
        return v == code2
      })
      resources[locale][code2] = code3List[code3.toLowerCase()] || code3
      // console.log('code-2: '+code2+' -> code-3: '+ code3+' => '+resources[locale][code2])
    })
    // process.exit(1)
  })

for (var locale in resources) {
  var filePath = argv.outputDir + '/'+ outputName + '.' + locale + '.yml'

  var output = {}
  output[locale] = resources[locale]
  fs.writeFileSync(filePath, YAML.stringify(output, 6, 2))
}

