const mongoose = require('mongoose')
const { PermissionNotFoundError } = require('../error/clientError')

const permissionSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            index: true,
            unique: true,
        },
        read: Boolean,
        write: Boolean,
        desc: { type: String, required: true },
    },
    { timestamps: true, collection: 'Permission' }
)

const Permission = mongoose.model('Permission', permissionSchema)

async function getPermissionByName(name) {
    const perm = await Permission.findOne({ name: name }).select('-__v -updatedAt -createdAt').exec()

    if (perm) {
        return perm
    }

    throw new PermissionNotFoundError(`Unable to retrieve permission. Permission name ( ${name} ) does not exist.`)
}

async function getPermissionById(id) {
    const perm = await Permission.findById(id).exec()

    if (perm) {
        return perm
    }

    throw new PermissionNotFoundError(`Unable to retrieve permission. Permission ID ( ${id} ) does not exist.`)
}

module.exports = { Permission, getPermissionByName, getPermissionById }
