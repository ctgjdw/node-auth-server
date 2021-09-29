class InternalServerError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 500
    }
}

module.exports = { InternalServerError }
