#!/usr/bin/env node
var argv = require('yargs')
  .usage('Usage: $0 <command> [options]')
  .command('update', 'update the translation texts with the latest legacy texts')
  .demand(['l'])
  .alias('l', 'legacyDir')
  .nargs('l', 1)
  .describe('l', 'Specify the directory where the legacy texts are')
  .demand(['n'])
  .alias('n', 'nextDir')
  .nargs('n', 1)
  .describe('n', 'Specify the directory where the next texts are')
  .demand(['o'])
  .alias('o', 'outputDir')
  .nargs('o', 1)
  .describe('o', 'Specify the directory where the updated files will be output to')
  .argv;

var fs = require('fs')
var _ = require('lodash')
var glob = require('glob')
var YAML = require('yamljs')

var nextName = 'texts'
var outputName = 'texts'

var lang_country_pattern = '[a-z]{2}-[A-Z]{2}'
var legacyFileRegexp = new RegExp('\.('+lang_country_pattern+')\.')

var updatedAll = {}

var updates = {}
// Go to the input directory and fetch each translation file
console.log('Loop legacy files under' + argv.legacyDir + '...')
glob
  .sync(argv.legacyDir+'/*.yml')
  .forEach(function (legacyFile) {
    var lang_country = legacyFile.match(legacyFileRegexp)[1]
    var legacy = YAML.load(legacyFile)

    var locale = lang_country.replace('-','_')
    var nextFile = argv.nextDir+'/'+nextName+'.'+locale+'.yml'
    var next = YAML.load(nextFile)

    var updated = {}
    Object.assign(updated, next)

    update('', legacy[lang_country], legacy[lang_country], next[locale], updated[locale], updates)

    updatedAll[locale] = updated[locale]
  })
// Write files
console.log('Write updated files under' + argv.outputDir + '...')
for (var locale in updatedAll) {
  var filePath = argv.outputDir + '/'+ outputName + '.' + locale + '.yml'
  var output = {}
  output[locale] = updatedAll[locale]
  fs.writeFileSync(filePath, YAML.stringify(output, 8, 2))
}
console.log('Write default file (en-updated) under' + argv.outputDir + '...')
// // Write en
var legacyEnUsTexts = YAML.load(argv.legacyDir+'/en-US.yml')
var enTexts = {}// Object.assign({},YAML.load(argv.nextDir+'/'+nextName+'.en.yml')['en'])
Object.keys(updates).reduce(function(obj, keypath){
  var value = updates[keypath]
  var enValue = _.get(obj, keypath)
  if (!enValue || value !== enValue) {
    var legacyEnUSValue = _.get(legacyEnUsTexts['en-US'], keypath)
    if (legacyEnUSValue) {
      value = legacyEnUSValue
    }
    _.set(obj, keypath, value)
  }
}, enTexts)
var enFilePath = argv.outputDir + '/'+ outputName + '.updated-en.yml'
var enOutput = {}
enOutput.en = enTexts
// console.log(enOutput)
fs.writeFileSync(argv.outputDir + '/updates.yml', YAML.stringify(enOutput, 8, 2))

function update(prefix, currentObj, legacyObj, nextObj, updatedObj, updatedKeys){
  for (var key in currentObj) {
    keypath = prefix + (prefix.length>0 ? '.' : '') + key

    if (matchIgnorableKeys(keypath)) {
      continue;
    }
    var value = currentObj[key]
    if (_.isObject(value)) {
      update(keypath, value, legacyObj, nextObj, updatedObj, updatedKeys)
    }
    else {
      var nextValue = _.get(nextObj, keypath)
      if (!nextValue || value !== nextValue){
        var updatedValue = getUpdatedValue(legacyObj, value)
        updatedKeys[keypath] = updatedValue
        _.set(updatedObj, keypath, updatedValue)
      }
    }
  }
}

function getUpdatedValue (obj, value) {
  if (_.isUndefined(value) || _.isNull(value)) {
    return ' '
  }
  if (_.isString(value) && /^\-\w/.test(value)) {
    var valueKey = value.substring(1)
    if (valueKey === 'button.__continue') {
      valueKey = 'button.continue.billing_address.text'
    }
    var updated = _.get(obj, valueKey, value)
    return updated
  }
  return value
}

function matchIgnorableKeys (key) {
  for (var i in ignorableKeys()) {
    var regexp = ignorableKeys()[i]
    if (regexp.test(key)) {
      return true
    }
  }
  return false
}

function ignorableKeys () {
  return [
    /country.*/,
    /currency.*/,
    /date_time_formats.*/,
    /months.*/,
    /field\.(billing|shipping)_address\.title\.(female|male).*/,
    /button\.continue\.(date_of_birth|email|national_identification_number|phone|pin|postal_code)\.text/
  ]
}
