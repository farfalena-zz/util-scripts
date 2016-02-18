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
  .argv;
var fs = require('fs')
var _ = require('lodash')
var glob = require('glob')
var YAML = require('yamljs')

var inputName = 'texts'
var outputName = 'texts'

var updated = {}
// Go to the input directory and fetch each translation file
console.log('Fetch from' + argv.inputDir)
glob
  .sync(argv.inputDir+'/'+inputName+'.*.yml')
  .forEach(function (file) {
    var locale = file.match(/\.([a-z]{2}(_[A-Z]{2})?)\./)[1]
    var translations = YAML.load(file)

    handleEmpty(translations)
    Object.assign(updated, translations)
  })
// Output to files
for (var locale in updated) {
  var filePath = argv.outputDir + '/'+ outputName + '.' + locale + '.yml'
  var output = {}
  output[locale] = updated[locale]
  fs.writeFileSync(filePath, YAML.stringify(output, 8, 2))
}

function handleEmpty(obj){
  for (var key in obj) {
    var value = obj[key]
    if (_.isObject(value)) {
      handleEmpty(value)
    }
    else {
      if (_.isNull(value) ) {
        obj[key] = ' '
      }
    }
  }
}
