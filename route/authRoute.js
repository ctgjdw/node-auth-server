const router = require('express').Router()
const { loginApUser, logoutApUser } = require('../service/ap/apAuthService')
const { loginMpUser, logoutMpUser } = require('../service/mp/mpAuthService')
const { refreshToken } = require('../service/common/authService')
const {
    forgetPassword,
    forgetPasswordToken,
    mpForgetPassword,
    mpForgetPasswordToken,
} = require('../service/common/resetPasswordService')
const { verifyAccessToken, verifyRefreshToken } = require('../util/tokenUtil')
const {
    validateApLogin,
    validateMpLogin,
    validatePwResetReq,
    validatePwReset,
} = require('../util/validationUtil')
const { getSignedCookies, clearSignedCookies } = require('../util/awsCFUtil')

// AP User Auth Routes
router.post('/ap/auth/login', validateApLogin, getSignedCookies, loginApUser)
router.put('/ap/auth/logout', clearSignedCookies, logoutApUser)

// MP User Auth Routes
router.post('/mp/auth/login', validateMpLogin, getSignedCookies, loginMpUser)
router.put('/mp/auth/logout', clearSignedCookies, logoutMpUser)

// AP Forget password routes
router.post('/ap/auth/forget-password', validatePwResetReq, forgetPassword)
router.post('/ap/auth/forget-password/token', validatePwReset, forgetPasswordToken)

// MP Forget password routes
router.post('/mp/auth/forget-password', validatePwResetReq, mpForgetPassword)
router.post('/mp/auth/forget-password/token', validatePwReset, mpForgetPasswordToken)

// JWTToken Routes
router.post('/auth/refresh', verifyRefreshToken, getSignedCookies, refreshToken)
router.get('/auth/verify', verifyAccessToken, (req, res) => {
    // Change object prop name from sub to userId
    req.jwt.userId = req.jwt.sub
    delete req.jwt.sub
    return res.json(req.jwt)
})

// Get AWS CloudFront Signed Cookies
// Read Postman Doc
router.get('/auth/signed-cookies', getSignedCookies, (req, res) => {
    res.send('ok')
})

module.exports = router
