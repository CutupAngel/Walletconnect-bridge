'use strict'

const pinoPretty = require('pino-pretty')

const REPLACE_NEWLINES_WITH = '  '

function prettyWrapper (opts) {
  const pretty = pinoPretty(opts)

  return prettifier

  function prettifier (obj) {
    const prettified = pretty(obj)

    return prettified.replace(/\n/g, REPLACE_NEWLINES_WITH) + '\n'
  }
}

module.exports = prettyWrapper
