const retrier = require("./retry")

function retry(fn, opts) {
  function run(resolve, reject) {
    const options = opts || {}

    // Default `randomize` to true
    if (!("randomize" in options)) {
      options.randomize = true
    }

    const op = retrier.operation(options)

    // We allow the user to abort retrying
    // this makes sense in the cases where
    // knowledge is obtained that retrying
    // would be futile (e.g.: auth errors)

    function bail(err) {
      reject(err || new Error("Aborted"))
    }

    function onError(err, num) {
      if (err.bail) {
        bail(err)
        return
      }

      if (!op.retry(err)) {
        reject(op.mainError())
      } else if (options.onRetry) {
        options.onRetry(err, num)
      }
    }

    function runAttempt(num) {
      let val

      try {
        val = fn(bail, num)
      } catch (err) {
        onError(err, num)
        return
      }

      Promise.resolve(val)
        .then(resolve)
        .catch((err) => {
          onError(err, num)
        })
    }

    op.attempt(runAttempt)
  }

  return new Promise(run)
}

module.exports = retry
module.exports.operation = retrier.operation
module.exports.timeouts = retrier.timeouts
module.exports.createTimeout = retrier.createTimeout
module.exports.wrap = retrier.wrap
