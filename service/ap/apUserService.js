const ApUser = require('../../model/ApUser')
const MpUser = require('../../model/MpUser')
const { getRoleByName, getRoleById, getPermissionNameListByRoleName } = require('../../model/Role')
const { sendCreateOrgRequest } = require('../../client/organisationClient')
const bcrypt = require('bcryptjs')
const _ = require('lodash/object')
const { InternalServerError } = require('../../error/serverError')
const { UnauthorisedError } = require('../../error/authError')
const { InvalidParamsError, UserNotFoundError } = require('../../error/clientError')

// Receives the form data from frontend and sends the request to admin to verify org group and root account
async function registerPartner(req, res) {
    let newPartner = req.body
    let { organisation } = req.body

    // hash password
    console.log('encrypting pw')
    newPartner.password = await getHashedPassword(newPartner.password)

    // add remaining data
    newPartner.enabled = true
    newPartner.verified = false
    newPartner.userType = 'partner'
    newPartner.roleId = await getRoleByName('rootPartner')
    let newApUser = new ApUser(newPartner)

    console.log('saving new partner')
    const user = await newApUser.save()
    let rootPartner = user.toObject()

    // send request to admin to verify org group and root account
    console.log('sending request to admin to process and create organisation')
    const org = await sendCreateOrgRequest(rootPartner, organisation)
    user.organisationId = org.id
    try {
        await user.save()
    } catch (err) {
        throw new InternalServerError(`Unable to save new org id: ${err.message}!`)
    }
    //set response
    const resp = {}
    rootPartner = _.pick(rootPartner, [
        'id',
        'email',
        'firstName',
        'lastName',
        'enabled',
        'verified',
        'createdAt',
        'userType',
    ])

    rootPartner.userId = rootPartner.id
    delete rootPartner.id

    rootPartner.role = 'rootPartner'
    rootPartner.roleId = user.roleId._id
    resp.rootPartner = rootPartner
    resp.organisation = org

    return res.status(202).json(resp)
}

async function createAdmin(req, res) {
    // Assume gateway has verified user is authentic
    const { headers } = req
    const { userrole } = headers
    let resp

    // If user is superAdmin, rwAdmin should be in the permissionNameList
    const permissionNameList = await getPermissionNameListByRoleName(userrole)

    if (permissionNameList.includes('rwAdmin')) {
        let newAdmin = req.body

        // hash password
        newAdmin.password = await getHashedPassword(newAdmin.password)

        // add remaining data
        newAdmin.enabled = true
        newAdmin.verified = true
        newAdmin.userType = 'admin'
        newAdmin.roleId = await getRoleByName('admin')
        let newApUser = new ApUser(newAdmin)

        console.log('Saving new admin...')
        const user = await newApUser.save()

        //set response
        resp = mapUserToResp(user.toObject())
        delete resp.id
        delete resp.roleId._id
        delete resp.roleId.__v
        delete resp.roleId.updatedAt
        delete resp.roleId.createdAt
        return res.status(201).json(resp)
    } else {
        throw new UnauthorisedError('Only Super Admin can create new admin.')
    }
}

// Read ApUser own details only
async function getApUserOwnAccountDetails(req, res) {
    const { headers } = req
    const { userid } = headers

    let targetUser = await ApUser.findById(userid)
        .lean()
        .exec()
        .catch(function () {
            throw new InternalServerError('User ID from token does not exist in database.')
        })
    if (!targetUser) throw new InternalServerError('User ID from token does not exist in database.')

    return res.status(200).json(mapUserToResp(targetUser))
}

// Read a single other ApUser details
async function getOtherUserAccountDetails(req, res) {
    const { headers, params } = req
    const { userrole } = headers
    const targetUserId = params.userid
    const permissionNameList = await getPermissionNameListByRoleName(userrole)
    const targetUser = await ApUser.findById(targetUserId)
        .lean()
        .exec()
        .then(async function tryMpUser(apUser) {
            if (!apUser) {
                return await MpUser.findById(targetUserId).lean().exec()
            } else {
                return apUser
            }
        })
        .catch(function () {
            throw new UserNotFoundError('Target User ID cannot be found in database.')
        })

    if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

    // Check user has valid permissions
    checkUserReadPermissions(permissionNameList, targetUser)
    return res.status(200).json(mapUserToResp(targetUser))
}

// Read other ApUsers details, including own
async function searchUsers(req, res) {
    const { headers, query } = req
    const { userrole } = headers
    const name = query.name
    const email = query.email

    const permissionNameList = await getPermissionNameListByRoleName(userrole)
    let resp = []

    // If email is provided
    if (email) {
        // search for both ap and mp users (both ap and mp are different collections)
        const targetUser = await ApUser.findOne({ email: new RegExp(`^${email}$`, 'i') })
            .populate({ path: 'roleId', select: 'name' })
            .lean()
            .exec()
            .then(async function tryMpUser(apUser) {
                if (!apUser) {
                    return await MpUser.findOne({ email: new RegExp(`^${email}$`, 'i') })
                        .populate({ path: 'roleId', select: 'name' })
                        .lean()
                        .exec()
                        .then(function checkUserIsNull(mpUser) {
                            return mpUser ? mpUser : null
                        })
                } else {
                    return apUser
                }
            })

        // Check targetUser is present else return null set
        if (!targetUser) return res.json([])

        // Check user has valid permissions
        checkUserReadPermissions(permissionNameList, targetUser)
        resp.push(mapUserToResp(targetUser))

        // If name is provided
    } else if (name) {
        // If user's role can rwAdmin/rAdmin, append search results from ApUser collection where userType = admin
        if (permissionNameList.includes('rwAdmin') || permissionNameList.includes('rAdmin')) {
            const option = {
                userType: 'admin',
                $or: [
                    { firstName: new RegExp(`.*${name.toLowerCase()}.*`, 'i') },
                    { lastName: new RegExp(`.*${name.toLowerCase()}.*`, 'i') },
                ],
            }

            await addApUsersToResp(option, resp)
        }

        // // If user's role can rwPartner/rPartner, append search results from ApUser collection where userType = partner
        if (permissionNameList.includes('rwPartner') || permissionNameList.includes('rPartner')) {
            const option = {
                userType: 'partner',
                $or: [
                    { firstName: new RegExp(`.*${name.toLowerCase()}.*`, 'i') },
                    { lastName: new RegExp(`.*${name.toLowerCase()}.*`, 'i') },
                ],
            }

            await addApUsersToResp(option, resp)
        }

        // If user's role can rwYouth/rYouth, append search results from MpUser collection
        if (permissionNameList.includes('rwYouth') || permissionNameList.includes('rYouth')) {
            const option = {
                userType: 'youth',
                $or: [
                    { firstName: new RegExp(`.*${name.toLowerCase()}.*`, 'i') },
                    { lastName: new RegExp(`.*${name.toLowerCase()}.*`, 'i') },
                ],
            }
            await addMpUsersToResp(option, resp)
        }

        // Search without any criteria
    } else {
        // If user's role can rwAdmin/rAdmin, append search results from ApUser collection where userType = admin
        if (permissionNameList.includes('rwAdmin') || permissionNameList.includes('rAdmin')) {
            const option = {
                userType: 'admin',
            }

            await addApUsersToResp(option, resp)
        }

        // // If user's role can rwPartner/rPartner, append search results from ApUser collection where userType = partner
        if (permissionNameList.includes('rwPartner') || permissionNameList.includes('rPartner')) {
            const option = {
                userType: 'partner',
            }

            await addApUsersToResp(option, resp)
        }

        // If user's role can rwYouth/rYouth, append search results from MpUser collection
        if (permissionNameList.includes('rwYouth') || permissionNameList.includes('rYouth')) {
            const option = {
                userType: 'youth',
            }
            await addMpUsersToResp(option, resp)
        }
    }

    return res.status(200).json(resp)
}

// Updates ApUser own details firstName, lastName, and profilePicUrl
async function updateApUserOwnDetails(req, res) {
    const { headers, body } = req
    const { userid } = headers

    let targetUser = await ApUser.findById(userid)
        .exec()
        .catch(function () {
            throw new InternalServerError('Target User ID cannot be found in database.')
        })

    if (!targetUser) throw new InternalServerError('Target User ID cannot be found in database.')

    targetUser.firstName = body.firstName
    targetUser.lastName = body.lastName
    targetUser.profilePicUrl = body.profilePicUrl

    targetUser = await targetUser.save()
    targetUser = targetUser.toObject()
    delete targetUser.id

    return res.status(200).json(mapUserToResp(targetUser))
}

// Updates other ApUser details firstName, lastName, and profilePicUrl given appropriate permissions.
async function updateOtherUserDetails(req, res) {
    const { headers, body, params } = req
    const { userrole } = headers
    const targetUserId = params.userid

    const permissionNameList = await getPermissionNameListByRoleName(userrole)
    let targetUser = await ApUser.findById(targetUserId)
        .exec()
        .then(async function tryMpUser(user) {
            if (!user) {
                return await MpUser.findById(targetUserId).lean().exec()
            } else {
                return user
            }
        })
        .catch(function () {
            throw new UserNotFoundError('Target User ID cannot be found in database.')
        })

    if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

    // Check user has valid permissions
    checkUserReadWritePermissions(permissionNameList, targetUser)
    targetUser.firstName = body.firstName
    targetUser.lastName = body.lastName
    targetUser.profilePicUrl = body.profilePicUrl

    targetUser = await targetUser.save()
    const targetUserObj = targetUser.toObject()
    delete targetUserObj.id
    return res.status(200).json(mapUserToResp(targetUserObj))
}

// Only superAdmin can activate another user, excluding other superUsers
async function activateUser(req, res) {
    const { headers, params } = req
    const { userid, userrole } = headers
    const targetUserId = params.userid

    if (userid == targetUserId) {
        throw new UnauthorisedError('You do not have the permission to activate your own account')
    } else {
        const user = await ApUser.findById(userid)
            .lean()
            .exec()
            .catch(function () {
                throw new InternalServerError('User ID from token does not exist in database.')
            })
        if (!user) throw new InternalServerError('User ID from token does not exist in database.')

        const permissionNameList = await getPermissionNameListByRoleName(userrole)
        const targetUser = await ApUser.findById(targetUserId)
            .exec()
            .catch(function () {
                throw new UserNotFoundError('Target User ID cannot be found in database.')
            })
        if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

        const targetUserRole = await getRoleById(targetUser.roleId)

        // Cannot target superAdmin
        if (targetUserRole.name != 'superAdmin') {
            // Check userType is superAdmin and has permission to activate/deactivate user
            if (permissionNameList.includes('actAndDeactUser')) {
                targetUser.enabled = true

                await targetUser.save()
                return res.status(200).json({
                    date: new Date(),
                    message: 'Activation of user success.',
                })
            } else {
                throw new UnauthorisedError(
                    'You do not have the relevant permissions to edit the target user.'
                )
            }
        } else {
            throw new UnauthorisedError('superAdmins cannot be updated.')
        }
    }
}

// Only superAdmin can deactivate another user, excluding other superUsers
async function deactivateUser(req, res) {
    const { headers, params } = req
    const { userid, userrole } = headers
    const targetUserId = params.userid

    if (userid == targetUserId) {
        throw new UnauthorisedError('You do not have the permission to deactivate your own account')
    } else {
        const user = await ApUser.findById(userid)
            .lean()
            .exec()
            .catch(function () {
                throw new InternalServerError('User ID from token does not exist in database.')
            })
        if (!user) throw new InternalServerError('User ID from token does not exist in database.')

        const permissionNameList = await getPermissionNameListByRoleName(userrole)
        const targetUser = await ApUser.findById(targetUserId)
            .exec()
            .catch(function () {
                throw new UserNotFoundError('Target User ID cannot be found in database.')
            })
        if (!targetUser) throw new UserNotFoundError('Target User ID cannot be found in database.')

        const targetUserRole = await getRoleById(targetUser.roleId)

        // Cannot target superAdmin
        if (targetUserRole.name != 'superAdmin') {
            // Check userType is superAdmin and has permission to activate/deactivate user
            if (permissionNameList.includes('actAndDeactUser')) {
                targetUser.enabled = false

                await targetUser.save()
                return res.status(200).json({
                    date: new Date(),
                    message: 'Deactivation of user success.',
                })
            } else {
                throw new UnauthorisedError(
                    'You do not have the relevant permissions to edit the target user.'
                )
            }
        } else {
            throw new UnauthorisedError('superAdmins cannot be updated.')
        }
    }
}

async function changeApUserOwnPassword(req, res) {
    const { headers, body } = req
    const { userid } = headers

    const user = await ApUser.findById(userid)
        .exec()
        .catch(function () {
            throw new InternalServerError('User ID from token does not exist in database.')
        })
    if (!user) throw InternalServerError('User ID from token does not exist in database.')

    // Check user is valid
    if (await bcrypt.compare(body.oldPassword, user.password)) {
        user.password = await getHashedPassword(body.newPassword)
        await user.save()

        return res.status(200).json({
            date: new Date(),
            message: 'Changed password successfully.',
        })
    } else {
        throw new InvalidParamsError('Invalid password.')
    }
}

async function changeApUserPassword(req, res) {
    const { headers, body, params } = req
    const { userid, userrole } = headers

    if (userrole !== 'superAdmin')
        throw new UnauthorisedError('Only super admins can reset account passwords.')

    if (userid === params.userId)
        throw new InvalidParamsError('Unable to reset own account password via this API.')

    const user = await ApUser.findById(params.userId)
        .exec()
        .catch(function () {
            throw new UserNotFoundError('User ID does not exist in database.')
        })
    if (!user) throw UserNotFoundError('User ID does not exist in database.')

    user.password = await getHashedPassword(body.newPassword)
    await user.save()

    return res.status(200).json({
        date: new Date(),
        message: 'Reset password successfully.',
    })
}

// Helper functions

function mapUserToResp(targetUser) {
    const resp = {
        userId: targetUser._id,
        ...targetUser,
    }
    delete resp['password']
    delete resp['__v']
    delete resp['updatedAt']
    delete resp['_id']
    delete resp['resetPwToken']
    delete resp['verificationToken']
    return resp
}

async function getHashedPassword(password) {
    return await bcrypt.hash(password, 10)
}

function checkUserIsEnabled(user) {
    if (!user.enabled) {
        throw new InternalServerError('User is disabled, please contact your account owner/admin.')
    }
}

function checkUserIsVerified(user) {
    if (!user.verified) {
        throw new InternalServerError(
            'The account is not verified, please check with your admin on the account approval status.'
        )
    }
}

// if permissions are valid return, else attach error code and message.
function checkUserReadPermissions(permList, targetUser) {
    if (
        (permList.includes('rwAdmin') || permList.includes('rAdmin')) &&
        targetUser.userType == 'admin'
    ) {
        return
    }
    if (
        (permList.includes('rwPartner') || permList.includes('rPartner')) &&
        targetUser.userType == 'partner'
    ) {
        return
    } else if (
        (permList.includes('rwYouth') || permList.includes('rYouth')) &&
        targetUser.userType == 'youth'
    ) {
        return
    } else {
        throw new UnauthorisedError('You do not have relavant permissions to read the target user.')
    }
}

// if permissions are valid return, else attach error code and message.
function checkUserReadWritePermissions(permList, targetUser) {
    if (permList.includes('rwAdmin') && targetUser.userType == 'admin') {
        return
    }
    if (permList.includes('rwPartner') && targetUser.userType == 'partner') {
        return
    } else if (permList.includes('rwYouth') && targetUser.userType == 'youth') {
        return
    } else {
        throw new UnauthorisedError(
            'You do not have relavant permissions to read or write the target user.'
        )
    }
}

async function addMpUsersToResp(options, resp) {
    let MpUsers = await MpUser.find(options)
        .populate({ path: 'roleId', select: 'name' })
        .lean()
        .exec()
    MpUsers.forEach((y) => resp.push(mapUserToResp(y)))
}

async function addApUsersToResp(options, resp) {
    let apUsers = await ApUser.find(options)
        .populate({ path: 'roleId', select: 'name' })
        .lean()
        .exec()
    apUsers.forEach((u) => resp.push(mapUserToResp(u)))
}

module.exports = {
    registerPartner,
    getHashedPassword,
    checkUserIsEnabled,
    checkUserIsVerified,
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
}
