const { Role, getRoleByName } = require('../../model/Role')
const { Permission, getPermissionByName } = require('../../model/Permission')
const ApUser = require('../../model/ApUser')
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

// init env variables
require('dotenv').config()

initPermissions()
initRoles()
initSuperAdmin()

async function initPermissions() {
    mongoose
        .connect(process.env.MONGO_URL)
        .then(console.log('Connected to Mongo DB'))
        .catch(console.log)

    const existingPermissions = await Permission.find()

    const defaultPermissions = [
        new Permission({
            name: 'actAndDeactUser',
            read: true,
            write: true,
            desc: 'Activate or deactivate all admins',
        }),
        new Permission({
            name: 'rwAdmin',
            read: true,
            write: true,
            desc: 'View and edit all admins',
        }),
        new Permission({
            name: 'rAdmin',
            read: true,
            write: false,
            desc: 'View all admins',
        }),
        new Permission({
            name: 'rwPartner',
            read: true,
            write: true,
            desc: 'View and edit all partners',
        }),
        new Permission({
            name: 'rPartner',
            read: true,
            write: false,
            desc: 'View all partners',
        }),
        new Permission({
            name: 'rwYouth',
            read: true,
            write: true,
            desc: 'View and edit all youths',
        }),
        new Permission({
            name: 'rYouth',
            read: true,
            write: false,
            desc: 'View all youths',
        }),
        new Permission({
            name: 'rwOrganisation',
            read: true,
            write: true,
            desc: 'View and edit all organisations',
        }),
        new Permission({
            name: 'rOrganisation',
            read: true,
            write: false,
            desc: 'View all organisations',
        }),
    ]

    if (existingPermissions.length > 0) {
        // Save
        Promise.all(
            defaultPermissions.map((r, index) => {
                console.log(`Saving ${r.name}`)
                return r.save()
            })
        ).then((res) => {
            console.log('Successfully seeded initial Permissions for Account Management DB')
            mongoose.disconnect()
        })
    }
}

async function initRoles() {
    mongoose
        .connect(process.env.MONGO_URL)
        .then(console.log('Connected to Mongo DB'))
        .catch(console.log)

    const existingRoles = await Role.find({}).exec()
    const actAndDeactUser = await getPermissionByName('actAndDeactUser')
    const rwAdmin = await getPermissionByName('rwAdmin')
    const rAdmin = await getPermissionByName('rAdmin')
    const rwPartner = await getPermissionByName('rwPartner')
    const rPartner = await getPermissionByName('rPartner')
    const rwYouth = await getPermissionByName('rwYouth')
    const rYouth = await getPermissionByName('rYouth')
    const rwOrganisation = await getPermissionByName('rwOrganisation')
    const rOrganisation = await getPermissionByName('rOrganisation')

    // init default roles
    const defaultRoles = [
        new Role({
            name: 'superAdmin',
            roleType: 'admin',
            permissions: [actAndDeactUser, rwAdmin, rwPartner, rwYouth, rwOrganisation],
            systemDefault: true,
        }),
        new Role({
            name: 'admin',
            roleType: 'admin',
            permissions: [rAdmin, rwPartner, rwYouth, rwOrganisation],
            systemDefault: true,
        }),
        new Role({
            name: 'rootPartner',
            roleType: 'partner',
            permissions: [rwPartner, rYouth, rOrganisation],
            systemDefault: true,
        }),
        new Role({
            name: 'partner',
            roleType: 'partner',
            permissions: [rPartner, rYouth, rOrganisation],
            systemDefault: true,
        }),
        new Role({
            name: 'youth',
            roleType: 'youth',
            permissions: [rPartner, rYouth, rOrganisation],
            systemDefault: true,
        }),
        new Role({
            name: 'upYouth',
            roleType: 'youth',
            permissions: [rPartner, rYouth, rOrganisation],
            systemDefault: true,
        }),
    ]

    if (existingRoles.length == 0) {
        // Save
        Promise.all(
            defaultRoles.map((r, index) => {
                console.log(`Saving ${r.name}`)
                return r.save()
            })
        ).then((res) => {
            console.log('Successfully seeded initial data for Account Management DB')
            mongoose.disconnect()
        })
    }
}

// TODO: Put into initialization
async function initSuperAdmin() {
    mongoose
        .connect(process.env.MONGO_URL)
        .then(console.log('Connected to Mongo DB'))
        .catch(console.log)

    const existingRoles = await Role.find()
    const superAdminRoleId = await getRoleByName('superAdmin')

    const defaultSuperAdmin = [
        new ApUser({
            firstName: 'superAdmin',
            lastName: 'superAdmin',
            roleId: '6134afb19c4c5afde49886da',
            email: 'superAdmin@email.com',
            password: await bcrypt.hash('12345678', 10),
            enabled: true,
            verified: true,
            userType: 'admin',
            profilePicUrl: '',
            systemDefault: true,
            roleId: superAdminRoleId,
        }),
    ]

    if (existingRoles.length == 0) {
        // Save
        Promise.all(
            defaultSuperAdmin.map((r, index) => {
                console.log(`Saving ${r.name}`)
                return r.save()
            })
        ).then((res) => {
            console.log('Successfully seeded initial superAdmin for Account Management DB')
            mongoose.disconnect()
        })
    }
}
