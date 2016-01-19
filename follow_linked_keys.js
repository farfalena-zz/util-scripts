#!/usr/bin/env node
var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('replace', 'replace linked key with actual values in localization files')
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
  .argv;
var fs = require('fs')
var YAML = require('yamljs')
var _ = require('lodash')

console.log('Extracting '+argv.output+'.')

try {
  var ymlData = YAML.load(argv.f)

  var locale = Object.keys(ymlData)[0]

  traverse('', ymlData, replaceKey)

  var filePath = argv.outputDir + '/'+ argv.output + '.' + locale + '.yml'
  fs.writeFileSync(filePath, YAML.stringify(ymlData, 8, 2))

} catch (ex) {
  console.log('Failed to read/write file at '+argv.f)
  console.log(ex)
  process.exit(1)
}

// Follow linked keys and replace them with the actual values
function replaceKey(key, value) {
  // if (_.isNull(value)){
  //   _.set(ymlData, key, '')
  // }
  if (_.isString(value) && /^\-\w/.test(value)) {
    //Get
    var valueKey = locale + '.' + value.substring(1)

    //Set
    var replacedValue = _.get(ymlData, valueKey, value)
    _.set(ymlData, key, replacedValue)
  }
}

// Traverse the localizations tree
function traverse(prefix, o, f) {
  for (var i in o) {
    keypath = prefix + (prefix.length>0 ? '.' : '') + i

    f.apply(this,[keypath, o[i]]);

    if (o[i] !== null && typeof(o[i])=="object") {
        traverse(keypath, o[i], f);
    }
  }
}