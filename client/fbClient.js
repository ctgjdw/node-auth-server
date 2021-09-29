const axios = require('axios');
const { UnauthenticatedError } = require('../error/authError');

async function checkFbAccessToken(fbUserId, fbAccessToken) {
    try {
        await axios.get(`https://graph.facebook.com/v12.0/${fbUserId}/?access_token=${fbAccessToken}`)
    } catch (err) {
        throw new UnauthenticatedError('Invalid FB Credentials')
    }
}

module.exports = { checkFbAccessToken }