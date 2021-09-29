var jwt = require('jsonwebtoken')
const moment = require('moment')
const { nanoid } = require('nanoid')
const { setString, getString } = require('./redisUtil')
const { UnauthenticatedError } = require('../error/authError')
const { InternalServerError } = require('../error/serverError')

const atExpiryMins = process.env.JWT_AT_EXPIRY_DURATION_MINS
const rtExpiryDays = process.env.JWT_RT_EXPIRY_DURATION_DAYS

// Returns the pair of access and refresh tokens, this method overwrites/revokes any old access and refresh tokens
function getTokens(userId, userType, role, enabled, verified) {
    const token = signAccessToken(userType, role, userId, enabled, verified)
    const rt = signRefreshToken(userType, role, userId, enabled, verified)

    return {
        accessToken: token,
        refreshToken: rt,
        accessExpires: moment().add(atExpiryMins, 'm'),
        refreshExpires: moment().add(rtExpiryDays, 'd'),
    }
}

// Verify the access token and its signature else throws error
// Also verifies that the JWT Token ID (JTI) is the latest and most current one
const verifyAccessToken = async (req, res, next) => {
    const bearerHeader = req.headers.authorization

    if (bearerHeader && bearerHeader.includes('Bearer ')) {
        const jwtToken = bearerHeader.split(' ')[1]
        const decodedToken = jwt.verify(jwtToken, process.env.JWT_AT_KEY)

        // check if decode has failed
        if (decodedToken != null) {
            // check if JTI is valid in redis
            if (await validJTI(decodedToken)) {
                checkVerified(decodedToken.enabled, decodedToken.verified)
                req.jwt = decodedToken
                next()
            } else {
                throw new UnauthenticatedError('Access Token has been consumed/revoked.')
            }
        } else {
            throw new UnauthenticatedError('Invalid/Expired Access Token.')
        }
    } else {
        throw new UnauthenticatedError('Bearer Token required in the Authorization Header.')
    }
}

// Verify the refresh token and its signature else throws error
// Also verifies that the JWT Token ID (JTI) is the latest and most current one
const verifyRefreshToken = async (req, res, next) => {
    const token = req.body.token

    if (token) {
        const decodedToken = jwt.verify(token, process.env.JWT_RT_KEY)

        // check if decode has failed
        if (decodedToken != null) {
            // check if JTI is valid in redis
            if (await validJTI(decodedToken)) {
                checkVerified(decodedToken.enabled, decodedToken.verified)
                req.jwt = decodedToken
                next()
            } else {
                throw new UnauthenticatedError('Refresh Token has been consumed/revoked.')
            }
        } else {
            throw new UnauthenticatedError('Invalid/Expired Refresh JWT Token.')
        }
    } else {
        throw new UnauthenticatedError('Refresh token required in the body.')
    }
}

function signRefreshToken(userType, role, userId, enabled, verified) {
    const jti = generateJWTId()
    const token = jwt.sign(
        {
            tokenType: 'rt',
            userType: userType,
            userRoleId: role.id,
            userRole: role.name,
            jti: jti,
            enabled: enabled,
            verified: verified,
        },
        process.env.JWT_RT_KEY,
        { expiresIn: rtExpiryDays + 'd', subject: userId }
    )

    // link userId to jti and save in redis
    // this will be used to keep track of the most current refresh token
    // when generates new set of access and refresh token, the new jti will be saved (during login/logout/refresh)
    // any other non-expired refresh token that is not saved in redis is rejected
    const exp = rtExpiryDays * 24 * 60 * 60
    setString(`rt-${userId}`, jti, exp)

    return token
}

function signAccessToken(userType, role, userId, enabled, verified) {
    const jti = generateJWTId()
    const token = jwt.sign(
        {
            tokenType: 'at',
            userType: userType,
            userRoleId: role.id,
            userRole: role.name,
            jti: jti,
            enabled: enabled,
            verified: verified,
        },
        process.env.JWT_AT_KEY,
        { expiresIn: atExpiryMins + 'm', subject: userId }
    )

    // link userId to jti and save in redis
    // this will be used to keep track of the most current refresh token
    // when generates new set of access and refresh token, the new jti will be saved (during login/logout/refresh)
    // any other non-expired refresh token that is not saved in redis is rejected
    const exp = atExpiryMins * 60
    setString(`at-${userId}`, jti, exp)

    return token
}

function generateJWTId() {
    return nanoid()
}

function revokeOldTokens(userId) {
    setString(`rt-${userId}`, 'jti', 1)
    setString(`at-${userId}`, 'jti', 1)
}

async function validJTI(token) {
    if (token.tokenType == 'at') {
        return (await getString(`at-${token.sub}`)) == token.jti
    } else if (token.tokenType == 'rt') {
        return (await getString(`rt-${token.sub}`)) == token.jti
    }

    throw new UnauthenticatedError('Invalid token jti for JWT Token.')
}

function checkVerified(enabled, verified) {
    if (!enabled)
        throw new InternalServerError('The Access Token\'s User is not enabled')
    if (!verified)
        throw new InternalServerError('The Access Token\'s User is not verified')
}

// JWT should have been verified to be valid. This is for decoding when the JWT is passed between services internally.
const decodeAccessToken = async (req, res, next) => {
    const bearerHeader = req.headers.authorization
    const jwtToken = bearerHeader.split(' ')[1]
    const decodedToken = jwt.decode(jwtToken, { complete: true })
    req.jwt = decodedToken.payload
    next()
}

module.exports = {
    getTokens,
    verifyAccessToken,
    verifyRefreshToken,
    revokeOldTokens,
    decodeAccessToken,
}
