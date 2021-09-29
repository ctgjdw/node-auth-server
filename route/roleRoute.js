const router = require('express').Router()
const {
    validateUpdateRolePermissions,
    validateUpdateUserRole,
} = require('../util/validationUtil')
const {
    getRole,
    updateRolePermissions,
    updateUserRole,
    getAllRoles,
    getAllPermissions,
} = require('../service/ap/roleService')

router.get('/ap/role/list', getAllRoles)
router.get('/ap/role/permission/list', getAllPermissions)
router.get('/ap/role/:roleId', getRole)
router.put('/ap/role/:roleId', validateUpdateRolePermissions, updateRolePermissions)
router.put('/ap/role/user/:userId', validateUpdateUserRole, updateUserRole)

module.exports = router