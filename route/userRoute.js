const router = require('express').Router()
const {
    validatePartnerRegistration,
    validateMpRegistration,
    validateAdminCreation,
    validateChangePassword,
    validateUpdateApUserDetails,
    validateMpUserUpdateDetails,
    validateMpVerifyToken,
    validateSearchApUsers,
    validateResetPassword
} = require('../util/validationUtil')
const {
    registerPartner,
    createAdmin,
    getApUserOwnAccountDetails,
    getOtherUserAccountDetails,
    searchUsers,
    updateApUserOwnDetails,
    updateOtherUserDetails,
    activateUser,
    deactivateUser,
    changeApUserOwnPassword,
    changeApUserPassword,
} = require('../service/ap/apUserService')
const {
    registerMpUser,
    getMpUserOwnAccountDetails,
    getOtherMpUserAccountDetails,
    updateMpUserOwnAccountDetails,
    changeMpUserOwnPassword,
    mpProcessVerificationToken,
    changeMpUserPassword,
    activateMpUser,
    deactivateMpUser,
} = require('../service/mp/mpUserService')

// Mobile Platform (mp)
router.post('/mp/user/register', validateMpRegistration, registerMpUser)
router.post('/mp/user/verify', validateMpVerifyToken, mpProcessVerificationToken)
router.get('/mp/user', getMpUserOwnAccountDetails)
router.get('/mp/user/:userid', getOtherMpUserAccountDetails)
router.put('/mp/user/password', validateChangePassword, changeMpUserOwnPassword)
router.put('/mp/user', validateMpUserUpdateDetails, updateMpUserOwnAccountDetails)

// super admin routes for mp
router.put('/mp/user/:userId/password', validateResetPassword, changeMpUserPassword)
router.put('/mp/user/:userid/activate', activateMpUser)
router.put('/mp/user/:userid/deactivate', deactivateMpUser)

// Admin platform (ap)
// partner only routes
router.post('/ap/partner/register', validatePartnerRegistration, registerPartner)

// super admin routes for ap
router.post('/ap/admin', validateAdminCreation, createAdmin)
router.put('/ap/admin/:userid/activate', activateUser)
router.put('/ap/admin/:userid/deactivate', deactivateUser)

// admin & partner routes
router.put('/ap/user', validateUpdateApUserDetails, updateApUserOwnDetails)
router.put('/ap/user/password', validateChangePassword, changeApUserOwnPassword)
router.put('/ap/user/:userId/password', validateResetPassword, changeApUserPassword)
router.put('/ap/user/:userid', validateUpdateApUserDetails, updateOtherUserDetails)
router.get('/ap/user/list', validateSearchApUsers, searchUsers)
router.get('/ap/user', getApUserOwnAccountDetails)
router.get('/ap/user/:userid', getOtherUserAccountDetails)

module.exports = router
