function handleError(err, req, res, next) {
    console.log(err.stack)

    let resp = {
        date: new Date().toISOString(),
        error: err,
    }

    return res.status(err.statusCode || 500).json(resp)
}

module.exports = handleError
