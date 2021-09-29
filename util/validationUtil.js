const { validate, Joi } = require('express-validation')
const { InvalidParamsError } = require('../error/clientError')

function validatePartnerRegistration(req, res, next) {
    console.log('validating partner registration')
    const registerPartnerRequest = {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string()
                .regex(/.{8,30}/)
                .required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            organisation: Joi.object({
                name: Joi.string().required(),
                website: Joi.string().allow(''),
                email: Joi.string().required(),
                address1: Joi.string().required(),
                address2: Joi.string().allow(''),
                address3: Joi.string().allow(''),
                postalCode: Joi.string().required(),
                countryCode: Joi.string().required(),
                bizRegistrationId: Joi.string().required(),
            }).required(),
        }),
    }

    const validateReq = validate(registerPartnerRequest, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateApLogin(req, res, next) {
    console.log('validating ap login request')

    const loginReq = {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string()
                .regex(/.{8,30}/)
                .required(),
        }),
    }

    const validateReq = validate(loginReq, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateAdminCreation(req, res, next) {
    console.log('validating create admin request')
    const registerAdminRequest = {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string()
                .regex(/.{8,30}/)
                .required(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
        }),
    }

    const validateReq = validate(registerAdminRequest, { keyByField: true }, {})
    return validateReq(req, res, next)
}

function validateMpLogin(req, res, next) {
    console.log('validating mp login request')

    const loginReq = {
        body: Joi.object({
            email: Joi.string().email(),
            mobile: Joi.string(),
            password: Joi.string().regex(/.{8,30}/),
            fbUserId: Joi.string(),
            fbAccessToken: Joi.string(),
        })
            // if email is present, pw must be present
            .with('email', 'password')
            .with('fbUserId', 'fbAccessToken')
            // either email or mobile must be present
            .xor('email', 'mobile', 'fbUserId'),
        query: Joi.object({
            type: Joi.string().valid('mobile', 'email', 'fb').required(),
        }),
    }

    const validateReq = validate(loginReq, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateUpdateApUserDetails(req, res, next) {
    console.log('validating update own or other ApUser request')
    const updateAdminReq = {
        body: Joi.object({
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            profilePicUrl: Joi.string().allow('', null),
        }),
    }

    const validateReq = validate(updateAdminReq, { keyByField: true }, {})
    return validateReq(req, res, next)
}

async function validateMpRegistration(req, res, next) {
    console.log('validating mp registration')
    const registerMpRequest = {
        body: Joi.object({
            email: Joi.string().email(),
            mobile: Joi.string(),
            password: Joi.string().regex(/.{8,30}/),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            gender: Joi.string().valid('male', 'female', 'others').required(),
            age: Joi.number().min(1).required(),
            dob: Joi.string().required(),
            address1: Joi.string().required(),
            address2: Joi.string().allow(''),
            address3: Joi.string().allow(''),
            postalCode: Joi.string().required(),
            countryCode: Joi.string().min(2).max(2).required(),
            city: Joi.string().required(),
            school: Joi.string().required(),
            profilePicUrl: Joi.string().allow('', null),
            fbUserId: Joi.string(),
            fbAccessToken: Joi.string(),
        }),
        query: Joi.object({
            type: Joi.string().valid('mobile', 'email', 'fb').required(),
        }),
    }

    if (req.query.type == 'fb' && (!req.body.fbUserId || !req.body.fbAccessToken)) {
        throw new InvalidParamsError('fbUserId/fbAccessToken is required for FB/Social Sign Up type.')
    }

    const validateReq = validate(registerMpRequest, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validatePwResetReq(req, res, next) {
    console.log('validating pw reset request')

    const valPwResetReq = {
        body: Joi.object({
            email: Joi.string().email().required(),
        }),
    }

    const validateReq = validate(valPwResetReq, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateChangePassword(req, res, next) {
    console.log('validating user change own password request')
    const changePasswordRequest = {
        body: Joi.object({
            oldPassword: Joi.string()
                .regex(/.{8,30}/)
                .required(),
            newPassword: Joi.string()
                .regex(/.{8,30}/)
                .required(),
        }),
    }

    const validateReq = validate(changePasswordRequest, { keyByField: true }, {})
    return validateReq(req, res, next)
}

function validateResetPassword(req, res, next) {
    console.log('validating reset password request')
    const changePasswordRequest = {
        body: Joi.object({
            newPassword: Joi.string()
                .regex(/.{8,30}/)
                .required(),
        }),
    }

    const validateReq = validate(changePasswordRequest, { keyByField: true }, {})
    return validateReq(req, res, next)
}

function validatePwReset(req, res, next) {
    console.log('validating pw reset request')

    const valPwReset = {
        body: Joi.object({
            token: Joi.string().required(),
            newPassword: Joi.string()
                .regex(/.{8,30}/)
                .required(),
        }),
    }

    const validateReq = validate(valPwReset, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateUpdateRolePermissions(req, res, next) {
    console.log('validating update role request')

    const valRoleReq = {
        body: Joi.object({
            permissionNames: Joi.array().items(Joi.string()).required(),
        }),
        params: Joi.object({
            roleId: Joi.string().required(),
        }),
    }

    const validateReq = validate(valRoleReq, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateMpUserUpdateDetails(req, res, next) {
    console.log('validating MpUser account update request')
    const valMpUserUpdateReq = {
        body: Joi.object({
            mobile: Joi.string(),
            firstName: Joi.string().required(),
            lastName: Joi.string().required(),
            gender: Joi.string().valid('male', 'female', 'others').required(),
            age: Joi.number().min(1).required(),
            dob: Joi.string().required(),
            address1: Joi.string().required(),
            address2: Joi.string().allow(''),
            address3: Joi.string().allow(''),
            postalCode: Joi.string().required(),
            countryCode: Joi.string().min(2).max(2).required(),
            city: Joi.string().required(),
            school: Joi.string().required(),
            profilePicUrl: Joi.string().allow('', null),
        }),
    }

    const validateReq = validate(valMpUserUpdateReq, { keyByField: true }, {})
    return validateReq(req, res, next)
}

function validateMpVerifyToken(req, res, next) {
    console.log('validating mp user verification request')

    const valVerifyToken = {
        body: Joi.object({
            token: Joi.string().required(),
        }),
    }

    const validateReq = validate(valVerifyToken, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateUpdateUserRole(req, res, next) {
    console.log('validating update ApUser role request')

    const valQueryParams = {
        query: Joi.object({
            roleId: Joi.string().required(),
        }),
        params: Joi.object({
            userId: Joi.string().required(),
        }),
    }

    const validateReq = validate(valQueryParams, { keyByField: true }, {})

    return validateReq(req, res, next)
}

function validateSearchApUsers(req, res, next) {
    console.log('validating search ap users request')

    const searchReq = {
        query: Joi.object({
            name: Joi.string(),
            email: Joi.string(),
        }).oxor('name', 'email'),
    }

    const validateReq = validate(searchReq, { keyByField: true }, {})

    return validateReq(req, res, next)
}

module.exports = {
    validatePartnerRegistration,
    validateApLogin,
    validateAdminCreation,
    validateUpdateApUserDetails,
    validateChangePassword,
    validateMpLogin,
    validateMpRegistration,
    validatePwResetReq,
    validatePwReset,
    validateUpdateRolePermissions,
    validateMpUserUpdateDetails,
    validateMpVerifyToken,
    validateUpdateUserRole,
    validateSearchApUsers,
    validateResetPassword,
}
