const { getTokens, revokeOldTokens } = require('../../util/tokenUtil')
const { checkUserIsEnabled, checkUserIsVerified } = require('./apUserService')
const ApUser = require('../../model/ApUser')
const { Role } = require('../../model/Role')
const bcrypt = require('bcryptjs')
const { ValidationError } = require('express-validation')
const _ = require('lodash/object')

// login to admin platform (ap) using email and password, returns access and refresh tokens
// Overwrites/Revokes any old access and refresh tokens
async function loginApUser(req, res) {
    const reqEmail = req.body.email
    const pw = req.body.password

    // get user
    let user = await ApUser.findOne({ email: new RegExp(`^${reqEmail}$`, 'i') }).exec()

    if (user == null || !(await bcrypt.compare(pw, user.password))) {
        throw new ValidationError(
            {
                name: 'Invalid Login Credentials',
                message: 'Invalid email/password',
            },
            { statusCode: 401 }
        )
    }

    checkUserIsEnabled(user)
    checkUserIsVerified(user)

    // generate token
    let response = user.toObject()
    const role = await Role.findById(user.roleId).select('name').exec()
    const token = getTokens(user.id, user.userType, role, user.enabled, user.verified)

    // set last login time
    const time = new Date()
    user.lastLogin = time.toISOString()
    await user.save()

    //re init response after save and set response
    response = user.toObject()
    response.role = role.name
    response = mapUserDocToResponse(response)
    response.token = token

    return res.status(200).json(response)
}

async function logoutApUser(req, res) {
    const userId = req.body.userId

    if (!userId) {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: 'userId field is missing from request body.',
            },
            { statusCode: 400 }
        )
    }

    const user = await ApUser.findById(userId).lean().exec()

    if (user) {
        revokeOldTokens(userId)
        res.send('logged out')
    } else {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: `The userId ${userId} does not exist!`,
            },
            { statusCode: 400 }
        )
    }
}

// Map user db object to response DTO
function mapUserDocToResponse(response) {
    response = _.pick(response, [
        'id',
        'email',
        'firstName',
        'lastName',
        'enabled',
        'roleId',
        'role',
        'organisationId',
        'createdAt',
        'lastLogin',
        'lastRefresh',
        'userType',
    ])
    response.userId = response.id
    delete response.id
    return response
}

module.exports = {
    loginApUser,
    logoutApUser,
}
