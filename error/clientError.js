class InvalidParamsError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 400
    }
}

class UserNotFoundError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 404
    }
}

class RoleNotFoundError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 404
    }
}

class PermissionNotFoundError extends Error {
    constructor(msg) {
        super()
        this.name = this.constructor.name
        this.message = msg
        this.statusCode = 404
    }
}

module.exports = {
    InvalidParamsError,
    UserNotFoundError,
    RoleNotFoundError,
    PermissionNotFoundError,
}
