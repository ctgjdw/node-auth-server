const { getTokens } = require('../../util/tokenUtil')
const ApUser = require('../../model/ApUser')
const MpUser = require('../../model/MpUser')
const { checkUserIsEnabled, checkUserIsVerified } = require('../ap/apUserService')
const { Role } = require('../../model/Role')
const _ = require('lodash/object')
const { InternalServerError } = require('../../error/serverError')

// Takes in a refresh token and returns a new set of access token and refresh token
// Overwrites/Revokes any old access and refresh tokens
async function refreshToken(req, res) {
    const jwt = req.jwt

    const apUser = await ApUser.findById(jwt.sub).exec()
    const mpUser = await MpUser.findById(jwt.sub).exec()

    // Refresh for admin platform user
    if (apUser) {
        checkUserIsEnabled(apUser)
        checkUserIsVerified(apUser)
        console.log(`Refreshing Token for ap user ${jwt.sub}`)

        // init response
        let resp = mapUserDocToResponse(apUser.toObject())
        const role = await Role.findById(apUser.roleId).select('name').exec()
        resp.token = getTokens(
            apUser.id,
            apUser.userType,
            role,
            apUser.enabled,
            apUser.verified
        )

        // save last refresh date
        apUser.lastRefresh = new Date().toISOString()
        apUser.save()

        resp.role = role.name
        return res.json(resp)
    }
    // Refresh for mobile platform user
    else if (mpUser) {
        checkUserIsEnabled(mpUser)
        checkUserIsVerified(mpUser)
        console.log(`Refreshing Token for mp user ${jwt.sub}`)

        // init response
        let resp = mapUserDocToResponse(mpUser.toObject())
        const role = await Role.findById(mpUser.roleId).select('name').exec()
        resp.token = getTokens(
            mpUser.id,
            mpUser.userType,
            role,
            mpUser.enabled,
            mpUser.verified
        )

        // save last refresh date
        mpUser.lastRefresh = new Date().toISOString()
        mpUser.save()

        resp.role = role.name
        return res.json(resp)
    } else {
        throw new InternalServerError('Unable to retrieve user from db using jwt claim.')
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
    refreshToken,
}
