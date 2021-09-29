const MpUser = require('../../model/MpUser')
const ApUser = require('../../model/ApUser')
const { getRoleByName, getPermissionNameListByRoleName } = require('../../model/Role')
const { mpSendAccountVerificationEmail } = require('../../util/emailUtil')
const bcrypt = require('bcryptjs')
const _ = require('lodash/object')
const { nanoid } = require('nanoid')
const { setString, getString } = require('../../util/redisUtil')
const { InvalidParamsError, UserNotFoundError } = require('../../error/clientError')
const { UnauthorisedError } = require('../../error/authError')
const { InternalServerError } = require('../../error/serverError')
const { checkFbAccessToken } = require('../../client/fbClient')

const MP_VERIFY_REDIS_KEY = 'verifyMp'
let token

// Registration for Mobile Platform with email and password
async function registerMpUser(req, res, next) {
    const type = req.query.type
    let resp
    let user = new MpUser(req.body)

    if (type == 'email') {
        // hash password
        console.log('encrypting pw')
        user.password = await getHashedPassword(user.password)
        user.loginType = 'email'
        user.verified = false

        // send verification email
        console.log('sending verification email')
        token = nanoid()
        mpSendAccountVerificationEmail(token, user.email)
    } else if (type == 'fb') {
        const fbUserId = req.body.fbUserId
        const fbAccessToken = req.body.fbAccessToken

        checkFbAccessToken(fbUserId, fbAccessToken)

        user.loginType = 'fb'
        user.fbUserId = fbUserId
        user.verified = true
    } else if (type == 'mobile') {
    }

    // add remaining data
    console.log('saving new mp user')
    user.enabled = true
    user.userType = 'youth'
    user.roleId = await getRoleByName('youth')
    user = await user.save()
    resp = user.toObject()

    // save verify token to redis after saving user, as the userId will be generated
    if (type == 'email') {
        setString(`${MP_VERIFY_REDIS_KEY}-${token}`, user.id, 7 * 24 * 60 * 60)
        user.verificationToken = token
        user = await user.save()
    }

    //set response
    resp = _.pick(resp, [
        'id',
        'email',
        'mobile',
        'firstName',
        'lastName',
        'loginType',
        'enabled',
        'verified',
        'createdAt',
        'userType',
        'fbUserId',
    ])
    resp.userId = resp.id
    delete resp.id

    resp.role = 'youth'
    return res.status(202).json(resp)
}

// Receives the verify token, verifies with the token in redis and sets user to verified if valid
async function mpProcessVerificationToken(req, res) {
    const token = req.body.token
    const key = `${MP_VERIFY_REDIS_KEY}-${token}`
    const userId = await getString(key)

    if (!userId) {
        throw new InternalServerError('The verification token is invalid/expired.')
    }

    const user = await MpUser.findById(userId).exec()

    if (!user || user.verificationToken !== token) {
        throw new InternalServerError('The verification token is invalid.')
    }

    if (user.verified) throw new InternalServerError('The user has already been verified.')

    // save new password hash
    user.verified = true
    await user.save()

    // remove reset token from redis and mongo
    setString(key, '', 1)
    user.verificationToken = undefined
    await user.save()

    return res.send('User account verified.')
}

// Read MpUser own details only
async function getMpUserOwnAccountDetails(req, res, next) {
    const { headers } = req
    const { userid } = headers

    const targetUser = await MpUser.findById(userid)
        .select('-__v -updatedAt -password')
        .lean()
        .exec()
        .catch(function (e) {
            throw new InternalServerError('User ID in token does not exist in database.')
        })

    if (!targetUser) throw new InternalServerError('User ID in token does not exist in database.')

    return res.status(200).json(mapUserToResp(targetUser))
}

// Read a single MpUser details
async function getOtherMpUserAccountDetails(req, res, next) {
    const { headers, params } = req
    const { userrole } = headers
    const targetUserId = params.userid

    const permissionNameList = await getPermissionNameListByRoleName(userrole)
    if (!permissionNameList.includes('rYouth') && !permissionNameList.includes('rwYouth'))
        throw new UnauthorisedError('You do not have the permissions to view this user.')

    const targetUser = await MpUser.findById(targetUserId)
        .select('-__v -updatedAt -password')
        .lean()
        .exec()
        .catch(function (e) {
            throw new UserNotFoundError('User ID does not exist in database.')
        })

    if (!targetUser) throw new UserNotFoundError('User ID does not exist in database.')

    return res.status(200).json(mapUserToResp(targetUser))
}

async function updateMpUserOwnAccountDetails(req, res, next) {
    const { headers, body } = req
    const { userid } = headers

    const user = await MpUser.findById(userid)
        .exec()
        .catch(function (e) {
            throw new InternalServerError('User ID in token does not exist in database.')
        })

    if (!user) throw new InternalServerError('User ID in token does not exist in database.')

    user.mobile = body.mobile
    user.firstName = body.firstName
    user.lastName = body.lastName
    user.gender = body.gender
    user.age = body.age
    user.dob = body.dob
    user.address1 = body.address1
    user.address2 = body.address2
    user.address3 = body.address3
    user.postalCode = body.postalCode
    user.countryCode = body.countryCode
    user.city = body.city
    user.school = body.school
    user.profilePicUrl = body.profilePicUrl

    let returnUser = await user.save()

    returnUser = returnUser.toObject()
    delete returnUser.id
    return res.status(200).json(mapUserToResp(returnUser))
}

async function changeMpUserOwnPassword(req, res, next) {
    const { headers, body } = req
    const { userid } = headers

    const user = await MpUser.findById(userid)
        .exec()
        .catch(function (e) {
            throw new InternalServerError('User ID in token does not exist in database.')
        })

    if (!user) throw new InternalServerError('User ID in token does not exist in database.')

    if (await bcrypt.compare(body.oldPassword, user.password)) {
        user.password = await getHashedPassword(body.newPassword)
        await user.save()
        const returnUser = user.toObject()
        delete returnUser['password']

        return res.status(200).json({
            date: new Date(),
            message: 'Success',
        })
    } else {
        throw new InvalidParamsError('Invalid Password.')
    }
}

async function changeMpUserPassword(req, res) {
    const { headers, body, params } = req
    const { userid, userrole } = headers

    if (userrole !== 'superAdmin')
        throw new UnauthorisedError('Only super admins can reset account passwords.')

    if (userid === params.userId)
        throw new InvalidParamsError('Unable to reset own account password via this API.')

    const user = await MpUser.findById(params.userId)
        .exec()
        .catch(function () {
            throw new UserNotFoundError('User ID does not exist in database.')
        })
    if (!user) throw UserNotFoundError('User ID does not exist in database.')

    if (user.loginType !== 'email')
        throw new InvalidParamsError(
            "This user's login type is not email. Unable to reset password."
        )

    user.password = await getHashedPassword(body.newPassword)
    await user.save()

    return res.status(200).json({
        date: new Date(),
        message: 'Reset password successfully.',
    })
}

async function activateMpUser(req, res) {
    const { headers, params } = req
    const { userid, userrole } = headers
    const targetUserId = params.userid

    const user = await ApUser.findById(userid)
        .lean()
        .exec()
        .catch(function () {
            throw new InternalServerError('User ID from token does not exist in database.')
        })
    if (!user) throw new InternalServerError('User ID from token does not exist in database.')

    const permissionNameList = await getPermissionNameListByRoleName(userrole)
    const targetUser = await MpUser.findById(targetUserId)
        .exec()
        .catch(function () {
            throw new UserNotFoundError('Target User ID cannot be found in database.')
        })
    if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

    if (permissionNameList.includes('actAndDeactUser')) {
        targetUser.enabled = true

        await targetUser.save()
        return res.status(200).json({
            date: new Date(),
            message: 'Activation of user success.',
        })
    } else {
        throw new UnauthorisedError(
            'You do not have the relevant permissions to edit the target user.'
        )
    }
}

// Only superAdmin can deactivate another user, excluding other superUsers
async function deactivateMpUser(req, res) {
    const { headers, params } = req
    const { userid, userrole } = headers
    const targetUserId = params.userid

    const user = await ApUser.findById(userid)
        .lean()
        .exec()
        .catch(function () {
            throw new InternalServerError('User ID from token does not exist in database.')
        })
    if (!user) throw new InternalServerError('User ID from token does not exist in database.')

    const permissionNameList = await getPermissionNameListByRoleName(userrole)
    const targetUser = await MpUser.findById(targetUserId)
        .exec()
        .catch(function () {
            throw new UserNotFoundError('Target User ID cannot be found in database.')
        })
    if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

    if (permissionNameList.includes('actAndDeactUser')) {
        targetUser.enabled = false

        await targetUser.save()
        return res.status(200).json({
            date: new Date(),
            message: 'Deactivation of user success.',
        })
    } else {
        throw new UnauthorisedError(
            'You do not have the relevant permissions to edit the target user.'
        )
    }
}

function mapUserToResp(returnUser) {
    const resp = {
        userId: returnUser._id,
        ...returnUser,
    }
    delete resp['password']
    delete resp['__v']
    delete resp['updatedAt']
    delete resp['_id']
    delete resp['verificationToken']
    delete resp['resetPwToken']
    return resp
}

async function getHashedPassword(password) {
    return await bcrypt.hash(password, 10)
}

function checkUserIsEnabled(user) {
    if (!user.enabled) {
        throw new InternalServerError('User is disabled, please contact the admin.')
    }
}

function checkUserIsVerified(user) {
    if (!user.verified) {
        throw new InternalServerError(
            'The account is not verified, please check your email for the verification link.'
        )
    }
}

module.exports = {
    registerMpUser,
    getHashedPassword,
    checkUserIsEnabled,
    checkUserIsVerified,
    getMpUserOwnAccountDetails,
    getOtherMpUserAccountDetails,
    updateMpUserOwnAccountDetails,
    changeMpUserOwnPassword,
    mpProcessVerificationToken,
    changeMpUserPassword,
    activateMpUser,
    deactivateMpUser,
}
