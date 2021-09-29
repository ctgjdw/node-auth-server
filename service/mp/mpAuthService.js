const { getTokens, revokeOldTokens } = require('../../util/tokenUtil')
const { checkUserIsEnabled, checkUserIsVerified } = require('./mpUserService')
const MpUser = require('../../model/MpUser')
const { Role } = require('../../model/Role')
const bcrypt = require('bcryptjs')
const { ValidationError } = require('express-validation')
const _ = require('lodash/object')
const { InvalidParamsError } = require('../../error/clientError')
const { checkFbAccessToken } = require('../../client/fbClient')
const { InternalServerError } = require('../../error/serverError')
const { UnauthenticatedError } = require('../../error/authError')

// login to mobile platform (mp) using email and password or mobile number and OTP, returns access and refresh tokens
// Overwrites/Revokes any old access and refresh tokens
async function loginMpUser(req, res) {
    const type = req.query.type
    let user

    // Email Login
    if (type == 'email' && req.body.email) {
        const email = req.body.email
        const pw = req.body.password

        user = await MpUser.findOne({ email: email }).exec()

        if (user == null) {
            throw new ValidationError(
                {
                    name: 'Invalid Login Credentials',
                    message: 'Invalid email.',
                },
                { statusCode: 401 }
            )
        }
        checkUserLoginType(user, type)
        await checkPassword(pw, user.password)

        // Mobile Login
        // To be implemented by equity lab
    } else if (type == 'mobile' && req.body.mobile) {
        const mobile = req.body.mobile
        user = await MpUser.findOne({ mobile: mobile }).exec()

        if (user == null) {
            throw new ValidationError(
                {
                    name: 'Invalid Login Credentials',
                    message: 'Invalid mobile number.',
                },
                { statusCode: 401 }
            )
        }
        checkUserLoginType(user, type)

        // Generate Login token
        // SMS to mobile number
        // TODO: Implement API to consume Login token and return JWT.
        return res.status(202).send('Sent Login token to mobile number.')
    } else if (type == 'fb') {
        const fbUserId = req.body.fbUserId
        const fbAccessToken = req.body.fbAccessToken
        await checkFbAccessToken(fbUserId, fbAccessToken)

        user = await MpUser.findOne({ fbUserId: fbUserId }).exec()

        if (!user) throw new UnauthenticatedError('FB User does not exist in MpUser.')
        if (!user.loginType == 'fb') throw new InternalServerError('User has the wrong loginType in db.')
    } else {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: 'Invalid Login Request.',
            },
            { statusCode: 400 }
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

async function logoutMpUser(req, res) {
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

    const user = await MpUser.findById(userId).lean().exec()

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

// Check the user's login method, determined during registration.
function checkUserLoginType(user, type) {
    if (user.loginType != type) {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: `This user does not have ${type} login enabled.`,
            },
            { statusCode: 400 }
        )
    }
}

// Check password with db password hash
async function checkPassword(pw, pwHash) {
    if (!(await bcrypt.compare(pw, pwHash))) {
        throw new ValidationError(
            {
                name: 'Invalid Login Credentials',
                message: 'Invalid password.',
            },
            { statusCode: 401 }
        )
    }
}

module.exports = {
    loginMpUser,
    logoutMpUser,
}
