const ApUser = require('../../model/ApUser')
const MpUser = require('../../model/MpUser')
const { nanoid } = require('nanoid')
const { ValidationError } = require('express-validation')
const { setString, getString } = require('../../util/redisUtil')
const {
    getHashedPassword,
    checkUserIsVerified,
    checkUserIsEnabled,
} = require('../ap/apUserService')
const { mpSendResetPwEmail, apSendResetPwEmail } = require('../../util/emailUtil')
const { InternalServerError } = require('../../error/serverError')

// AP User sends email address, if valid, a reset password url will be sent
async function forgetPassword(req, res) {
    const email = req.body.email

    const user = await ApUser.findOne({ email: email }).exec()

    if (user) {
        console.log('Retrieved user for password reset, sending reset email')
        checkUserIsEnabled(user)
        checkUserIsVerified(user)

        // Send reset pw email
        const token = nanoid()
        apSendResetPwEmail(token, email)

        // save resetPwToken with 7 days expiry
        // save to redis and mongo
        setString(`resetPwAp-${token}`, user.id, 7 * 24 * 60 * 60)
        user.resetPwToken = token
        await user.save()

        return res.send('email sent')
    } else {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: `The account with email (${email}) does not exist!`,
            },
            { statusCode: 400 }
        )
    }
}

// MP User sends email address, if valid and user's login type is email, a reset password url will be sent
async function mpForgetPassword(req, res) {
    const email = req.body.email

    const user = await MpUser.findOne({ email: email }).exec()

    if (user) {
        console.log('Retrieved user for password reset, sending reset email')
        checkUserIsEnabled(user)
        checkUserIsVerified(user)
        checkUserLoginTypeIsEmail(user)

        // Retrieve email body from html file
        const token = nanoid()
        mpSendResetPwEmail(token, email)

        // save resetPwToken with 7 days expiry
        // save to redis and mongo
        setString(`resetPwMp-${token}`, user.id, 7 * 24 * 60 * 60)
        user.resetPwToken = token
        await user.save()

        return res.send('email sent')
    } else {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: `The account with email (${email}) does not exist!`,
            },
            { statusCode: 400 }
        )
    }
}

// Receives the reset token, verifies with the token in redis and resets password if valid
async function forgetPasswordToken(req, res) {
    const token = req.body.token
    const newPassword = req.body.newPassword
    const key = `resetPwAp-${token}`
    const userId = await getString(key)

    if (!userId) {
        throw new InternalServerError('The reset token is invalid/expired.')
    }

    const user = await ApUser.findById(userId).exec()

    if (!user || user.resetPwToken !== token) {
        throw new InternalServerError('The reset token is invalid.')
    }

    checkUserIsEnabled(user)
    checkUserIsVerified(user)

    // save new password hash
    user.password = await getHashedPassword(newPassword)
    await user.save()

    // remove reset token from redis and mongo
    setString(key, '', 1)
    user.resetPwToken = undefined
    await user.save()

    return res.send('Password reset successful.')
}

// For Mp. Receives the reset token, verifies with the token in redis and resets password if valid
async function mpForgetPasswordToken(req, res) {
    const token = req.body.token
    const newPassword = req.body.newPassword
    const key = `resetPwMp-${token}`
    const userId = await getString(key)

    if (!userId) {
        throw new InternalServerError('The reset token is invalid/expired.')
    }

    const user = await MpUser.findById(userId).exec()

    if (!user || user.resetPwToken !== token) {
        throw new InternalServerError('The reset token is invalid.')
    }

    checkUserIsEnabled(user)
    checkUserIsVerified(user)
    checkUserLoginTypeIsEmail(user)

    // save new password hash
    user.password = await getHashedPassword(newPassword)
    await user.save()

    // remove reset token from redis and mongo
    setString(key, '', 1)
    user.resetPwToken = undefined
    await user.save()

    return res.send('Password reset successful.')
}

function checkUserLoginTypeIsEmail(user) {
    if (user.loginType != 'email') {
        throw new ValidationError(
            {
                name: 'Invalid Request',
                message: `The user account does not have an email login type. Please use the correct login type (mobile or social login).`,
            },
            { statusCode: 400 }
        )
    }
}

module.exports = {
    forgetPassword,
    forgetPasswordToken,
    mpForgetPasswordToken,
    mpForgetPassword,
}
