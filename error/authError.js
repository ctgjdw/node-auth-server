class UnauthorisedError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 403
    }
}

class UnauthenticatedError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 401
    }
}

module.exports = { UnauthenticatedError, UnauthorisedError }
