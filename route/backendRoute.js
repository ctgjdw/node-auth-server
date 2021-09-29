const router = require('express').Router()
const {
    verifyRootPartner,
    deleteRootPartner,
    createPartner,
    getRootPartner,
    getPartner,
    deactivatePartner,
    updatePartner,
    resetPassword,
    getApUser,
    getMpUser,
    updateApUser,
    updateMpUser,
} = require('../service/common/backendService')

// ap
router.put('/ap/root-partner/verify/:rootPartner', verifyRootPartner)
router.delete('/ap/root-partner/:rootPartner', deleteRootPartner)
router.get('/ap/root-partner/:rootPartnerId', getRootPartner)
router.get('/ap/partner/:partnerId', getPartner)
router.post('/ap/partner', createPartner),
    router.put('/ap/partner/:partnerId/deactivate', deactivatePartner)
router.put('/ap/partner/:partnerId', updatePartner)
router.put('/ap/partner/:partnerId/password', resetPassword)
router.get('/ap/user/:userId', getApUser)
router.put('/ap/user/:userId', updateApUser)

// mp
router.get('/mp/user/:userId', getMpUser)
router.put('/mp/user/:userId', updateMpUser)

module.exports = router
