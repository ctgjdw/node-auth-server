const ApUser = require('../../model/ApUser')
const { Role, getRoleById } = require('../../model/Role')
const { getPermissionByName, Permission } = require('../../model/Permission')
const { UnauthorisedError } = require('../../error/authError')
const {
    InvalidParamsError,
    UserNotFoundError,
    RoleNotFoundError,
} = require('../../error/clientError')

// Checks if user is superAdmin before returning list of all roles with permissions
async function getAllRoles(req, res) {
    const { headers } = req
    const { userrole } = headers
    let resp

    if (userrole == 'superAdmin') {
        const roleList = await Role.find({})
            .populate({ path: 'permissions', select: '-__v -updatedAt -createdAt' })
            .select('-__v -createdAt -updatedAt')
            .lean()
            .exec()

        resp = roleList
        return res.status(200).json(resp)
    } else {
        throw new UnauthorisedError('You do not have the relevant permissions.')
    }
}

async function getAllPermissions(req, res) {
     const { headers } = req
     const { userrole } = headers
     let resp

     if (userrole == 'superAdmin') {
         const permList = await Permission.find({})
             .select('-__v -createdAt -updatedAt')
             .lean()
             .exec()

         resp = permList
         return res.status(200).json(resp)
     } else {
         throw new UnauthorisedError('You do not have the relevant permissions.')
     }
}

// Checks if user is superAdmin before returning targeted Role with permissions
async function getRole(req, res) {
    const { headers, params } = req
    const { userrole } = headers
    const { roleId } = params
    let resp

    if (userrole == 'superAdmin') {
        // Retreive role and associated permissions
        const role = await Role.findById(roleId)
            .populate({ path: 'permissions', select: '-__v -updatedAt -createdAt' })
            .select('-__v -createdAt -updatedAt')
            .lean()
            .exec()
            .catch(function () {
                throw new RoleNotFoundError('Role ID in token cannot be found in database.')
            })

        // Get permission details
        resp = role
        return res.status(200).json(resp)
    } else {
        throw new UnauthorisedError('You do not have the relevant permissions.')
    }
}

// Checks if user is superAdmin before updating target Role's permissions
async function updateRolePermissions(req, res) {
    const { headers, body, params } = req
    const { userrole } = headers
    const newPermissionNames = body.permissionNames
    const { roleId } = params
    let resp

    if (userrole == 'superAdmin') {
        let newPermissions = []

        // Get new Permissions
        for (let i = 0; i < newPermissionNames.length; i++) {
            const permName = newPermissionNames[i]
            console.log('New permission assigned...' + permName)
            const perm = await getPermissionByName(permName).catch(function () {
                throw new InvalidParamsError(
                    'One or more permissions names have been spelled incorrectly. Update unsuccessful.'
                )
            })

            if (perm) {
                newPermissions.push(perm)
            } else {
                throw new InvalidParamsError(
                    'One or more permissions names have been spelled incorrectly. Update unsuccessful.'
                )
            }
        }

        // Update Role with new Permissions
        let updatedRole = await Role.findOneAndUpdate(
            { _id: roleId },
            { permissions: newPermissions },
            { new: true, lean: true }
        )
            .exec()
            .catch(function () {
                throw new RoleNotFoundError('Role ID is not found in database.')
            })

        if (!updatedRole) throw new RoleNotFoundError('Role ID is not found in database.')

        // // Get permission details
        updatedRole = await Role.findById(updatedRole._id)
            .populate({ path: 'permissions', select: 'name' })
            .select('-__v')
            .lean()
            .exec()
        resp = updatedRole
        return res.status(200).json(resp)
    } else {
        throw new UnauthorisedError('You do not have the relevant permissions.')
    }
}

async function updateUserRole(req, res) {
    const { headers, params, query } = req
    const { userrole } = headers
    const targetUserId = params.userId
    const newRoleId = query.roleId
    let resp

    const targetUser = await ApUser.findById(targetUserId)
        .select('-password -__v -updatedAt -createdAt -resetPwToken')
        .exec()
        .catch(function () {
            throw new UserNotFoundError('Target User ID cannot be found in database.')
        })
    if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

    // Check user is superAdmin
    if (userrole == 'superAdmin') {
        const newRole = await getRoleById(newRoleId).catch(function () {
            throw new InvalidParamsError('Role ID is not found in database.')
        })
        if (!newRole) throw new InvalidParamsError('Role ID is not found in database.')

        // Check roleType is compatible with userType
        if (targetUser.userType == newRole.roleType) {
            targetUser.roleId = newRole.id

            const returnUser = await targetUser.save()
            const returnUserObj = returnUser.toObject()
            resp = returnUserObj
            delete resp['_id']
            resp.role = newRole
            return res.status(200).json(resp)
        } else {
            throw new InvalidParamsError(
                'Cannot update to a role that is meant for another userType.'
            )
        }
    } else {
        throw new UnauthorisedError(
            'You do not have the relevant permissions. Only superAdmins can update user roles.'
        )
    }
}

module.exports = {
    getAllRoles,
    getRole,
    updateRolePermissions,
    updateUserRole,
    getAllPermissions,
}
