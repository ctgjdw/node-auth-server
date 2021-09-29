const axios = require('axios')
const _ = require('lodash/object')

const ORG_HOST = process.env.ORG_HOST

async function sendCreateOrgRequest(rootPartner, orgData) {
    const body = orgData
    body.rootAccount = _.pick(rootPartner, [
        'id',
        'email',
        'firstName',
        'lastName',
        'enabled',
        'verified',
        'userType',
        'profilePicUrl',
    ])
    body.rootAccount.roleName = 'rootPartner'

    let res = await axios.post(`${ORG_HOST}/backend/ap/org`, body)

    return res.data.organisation
}

module.exports = { sendCreateOrgRequest }
