const bcrypt = require('bcryptjs')
const { getRoleByName } = require('../../model/Role')
const { InvalidParamsError, UserNotFoundError } = require('../../error/clientError')
const { InternalServerError } = require('../../error/serverError')
const ApUser = require('../../model/ApUser')
const MpUser = require('../../model/MpUser')

async function verifyRootPartner(req, res) {
    const partnerId = req.params.rootPartner

    const rp = await ApUser.findById(partnerId).populate({ path: 'roleId', select: 'name' }).exec()

    if (rp && rp.roleId.name === 'rootPartner') {
        rp.verified = true
        await rp.save()
    } else {
        throw new InvalidParamsError('The provided id is not a rootPartner.')
    }

    return res.json({
        date: new Date(),
        message: 'Successfully verified root partner.',
    })
}

async function deleteRootPartner(req, res) {
    const partnerId = req.params.rootPartner

    const rp = await ApUser.findById(partnerId).populate({ path: 'roleId', select: 'name' }).exec()

    if (rp && rp.roleId.name === 'rootPartner') {
        await rp.remove()
    } else {
        throw new InvalidParamsError('The provided id is not a rootPartner.')
    }

    return res.json({
        date: new Date(),
        message: 'Successfully deleted root partner.',
    })
}

async function getRootPartner(req, res) {
    console.log('Retrieving root partner...')
    const rpId = req.params.rootPartnerId
    const rp = await ApUser.findById(rpId)
        .populate({ path: 'roleId', select: 'name' })
        .populate({ path: 'organisationId', select: '_id' })
        .select('-password -__v')
        .exec()

    if (rp && rp.roleId.name === 'rootPartner') {
        const rpObj = rp.toObject()
        return res.status(200).json(rpObj)
    } else {
        throw new Error('The provided id is not a rootPartner.')
    }
}

async function getPartner(req, res) {
    console.log('Retrieving partner...')
    const partnerId = req.params.partnerId
    const partner = await ApUser.findById(partnerId)
        .populate({ path: 'roleId', select: 'name' })
        .populate({ path: 'organisationId', select: '_id' })
        .select('-password -__v')
        .exec()

    if (partner && partner.roleId.name === 'partner') {
        const partnerObj = partner.toObject()
        return res.status(200).json(partnerObj)
    } else {
        throw new Error('The provided id is not a partner.')
    }
}

async function createPartner(req, res) {
    let newPartner = req.body
    console.log('Creating new partner...')
    newPartner.password = await getHashedPassword(newPartner.password)
    console.log(newPartner)
    // add remaining data
    newPartner.enabled = true
    newPartner.verified = true
    newPartner.userType = 'partner'
    newPartner.roleId = await getRoleByName('partner')
    let newApUser = new ApUser(newPartner)

    console.log('Saving new partner...')
    const user = await newApUser.save()
    let partnerObj = user.toObject()

    return res.status(200).json(partnerObj)
}

async function deactivatePartner(req, res) {
    const partnerId = req.params.partnerId

    const partner = await ApUser.findById(partnerId)
        .populate({ path: 'roleId', select: 'name' })
        .exec()

    if (partner && partner.roleId.name === 'partner') {
        partner.enabled = false
        await partner.save()
    } else {
        throw new Error('The provided id is not a partner.')
    }

    return res.json({
        date: new Date(),
        message: 'Successfully deactivated partner.',
    })
}

async function updatePartner(req, res) {
    console.log('Updating partner...')
    const partnerId = req.params.partnerId
    const { body } = req

    let partner = await ApUser.findById(partnerId)
        .populate({ path: 'roleId', select: 'name' })
        .select('-password -__v')
        .exec()
    if (partner && partner.roleId.name === 'partner') {
        partner.firstName = body.firstName
        partner.lastName = body.lastName
        partner.profilePicUrl = body.profilePicUrl
        partner = await partner.save()
        const partnerObj = partner.toObject()

        return res.status(200).json(partnerObj)
    } else {
        throw new Error('The provided id is not a partner.')
    }
}

async function resetPassword(req, res) {
    console.log('Changing partner password...')
    const partnerId = req.params.partnerId
    const { body } = req

    let partner = await ApUser.findById(partnerId)
        .populate({ path: 'roleId', select: 'name' })
        .select('-__v')
        .exec()
    console.log(partner)
    if (partner && partner.roleId.name === 'partner') {
        partner.password = await getHashedPassword(body.newPassword)
        await partner.save()

        return res.status(200).json({
            date: new Date(),
            message: 'Reset password successfully.',
        })
    } else {
        throw new Error('The provided id is not a partner.')
    }
}

async function getHashedPassword(password) {
    return await bcrypt.hash(password, 10)
}

async function getApUser(req, res) {
    const { userId } = req.params

    const user = await ApUser.findById(userId)
        .lean()
        .exec()
        .catch((err) => {
            throw new UserNotFoundError('Invalid UserId in path param.')
        })

    if (!user) throw new UserNotFoundError('Invalid UserId in path param.')

    return res.json(user)
}

async function getApUser(req, res) {
    const { userId } = req.params

    const user = await ApUser.findById(userId)
        .populate({ path: 'roleId' })
        .select('-password')
        .lean()
        .exec()
        .catch((err) => {
            throw new UserNotFoundError('Invalid UserId in path param.')
        })

    if (!user) throw new UserNotFoundError('Invalid UserId in path param.')

    return res.json(user)
}

async function getMpUser(req, res) {
    const { userId } = req.params

    const user = await MpUser.findById(userId)
        .populate({ path: 'roleId' })
        .select('-password')
        .lean()
        .exec()
        .catch((err) => {
            throw new UserNotFoundError('Invalid UserId in path param.')
        })

    if (!user) throw new UserNotFoundError('Invalid UserId in path param.')

    return res.json(user)
}

async function updateApUser(req, res) {
    const { userId } = req.params
    const body = req.body

    const user = await ApUser.findById(userId)
        .exec()
        .catch((err) => {
            throw new UserNotFoundError('Invalid UserId in path param.')
        })

    if (!user) throw new UserNotFoundError('Invalid UserId in path param.')

    for (key in body) {
        user[key] = body[key]
    }

    try {
        await user.save()
    } catch (err) {
        throw new InternalServerError('Unable to update user')
    }

    return res.json(user)
}

async function updateMpUser(req, res) {
    const { userId } = req.params
    const body = req.body

    const user = await MpUser.findById(userId)
        .populate({ path: 'roleId' })
        .exec()
        .catch((err) => {
            throw new UserNotFoundError('Invalid UserId in path param.')
        })

    if (!user) throw new UserNotFoundError('Invalid UserId in path param.')

    for (key in body) {
        user[key] = body[key]
    }

    try {
        await user.save()
    } catch (err) {
        throw new InternalServerError('Unable to update user')
    }

    return res.json(user)
}

module.exports = {
    verifyRootPartner,
    deleteRootPartner,
    getRootPartner,
    getPartner,
    createPartner,
    deactivatePartner,
    updatePartner,
    resetPassword,
    getApUser,
    getMpUser,
    updateApUser,
    updateMpUser,
}
