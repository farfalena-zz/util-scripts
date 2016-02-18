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
  .demand(['m'])
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
    try {
      var code3List =
        YAML.load(argv.mapDir+'/countries.'+locale+'.yml')[locale]
      for (var code3 in code3List) {
        var code2 = map[code3.toUpperCase()] || code3
        resources[locale][code2] = code3List[code3] || code3
        // console.log('code-2: '+code2+' -> code-3: '+ code3+' => '+resources[locale][code2])
      }
    } catch (e) {
      console.log('Skipping '+locale)
    }
  })

for (var locale in resources) {
  var filePath = argv.outputDir + '/'+ outputName + '.' + locale + '.yml'

  var output = {}
  output[locale] = sortObject(resources[locale])
  fs.writeFileSync(filePath, YAML.stringify(output, 6, 2))
}

function sortObject(o) {
  var sorted = {},
  key, a = [];

  for (key in o) {
    if (o.hasOwnProperty(key)) {
      a.push(key);
    }
  }

  a.sort();

  for (key = 0; key < a.length; key++) {
    sorted[a[key]] = o[a[key]];
  }
  return sorted;
}
