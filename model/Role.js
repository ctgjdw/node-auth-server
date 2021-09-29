const mongoose = require('mongoose')
const { InternalServerError } = require('../error/serverError')

// ap = admin platform
const roleSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, index: true, unique: true },

        // youth
        // admin
        // partner
        roleType: String,

        permissions: [{ type: mongoose.ObjectId, ref: 'Permission' }],

        // System default roles are fixed and cannot be deleted
        // superAdmin
        // admin
        // youth
        // upYouth
        // rootPartner
        // partner
        systemDefault: Boolean,
    },
    { timestamps: true, collection: 'Role' }
)

const Role = mongoose.model('Role', roleSchema)

async function getRoleByName(name) {
    const role = await Role.findOne({ name: name }).populate({path:'permissions', select: 'name'}).exec()

    if (role) {
        return role
    }

    throw new InternalServerError(`Unable to retrieve role. Role name ( ${name} ) does not exist.`)
}

async function getRoleById(id) {
    const role = await Role.findById(id).exec()

    if (role) {
        return role
    }
    throw new InternalServerError(`Unable to retrieve role. Role ID ( ${id} ) does not exist.`)
}

async function getPermissionNameListByRoleName(roleName) {
    const permissionNameList = await Role.findOne({ name: roleName })
        .populate({ path: 'permissions', select: '-_id name' })
        .lean()
        .catch(function () {
            throw new InternalServerError('Role Name does not exist in database.')
        })

    return permissionNameList.permissions.map(p => p.name)
}

async function getAllRoleNames() {
    const roleNames = await Role.find({}).select('name').lean().exec()
    return roleNames
}

roleSchema.set('toObject', {
    virtuals: true,
})

module.exports = {
    Role,
    getRoleByName,
    getRoleById,
    getAllRoleNames,
    getPermissionNameListByRoleName,
}
