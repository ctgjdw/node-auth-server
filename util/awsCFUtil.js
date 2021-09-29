// AWS CloudFront (CF) is a content delivery network that is primarily used here to cache static asses (images/other media)
// This JS file is written to return signed cookies for access into the CDN.

const AWS = require('aws-sdk')
const moment = require('moment');

const ACCESS_KEY_ID = process.env.CF_ACCESS_KEY_ID
const PKEY = process.env.PKEY
const cloudFront = new AWS.CloudFront.Signer(ACCESS_KEY_ID, PKEY)
const host = process.env.HOST
const AT_EXPIRY_MINS = process.env.JWT_AT_EXPIRY_DURATION_MINS

function getPolicy() {
    return JSON.stringify({
        Statement: [
            {
                Resource: `http*://cdn.${host}/*`, // http* => http and https
                Condition: {
                    DateLessThan: {
                        'AWS:EpochTime': Math.floor(new Date().getTime() / 1000) + 60 * 60 * 1,
                    },
                },
            },
        ],
    })
}

function getSignedCookies(req, res, next) {
    const cookie = cloudFront.getSignedCookie({
        policy: getPolicy()
    })

    res.cookie('CloudFront-Key-Pair-Id', cookie['CloudFront-Key-Pair-Id'], {
        domain: `.${host}`,
        path: '/',
        httpOnly: true,
        secure: true,
        expires: moment().add(AT_EXPIRY_MINS, 'm').toDate(),
    })

    res.cookie('CloudFront-Policy', cookie['CloudFront-Policy'], {
        domain: `.${host}`,
        path: '/',
        httpOnly: true,
        secure: true,
        expires: moment().add(AT_EXPIRY_MINS, 'm').toDate(),
    })

    res.cookie('CloudFront-Signature', cookie['CloudFront-Signature'], {
        domain: `.${host}`,
        path: '/',
        httpOnly: true,
        secure: true,
        expires: moment().add(AT_EXPIRY_MINS, 'm').toDate(),
    })

    next()
}

function clearSignedCookies(req, res, next) {
    res.cookie('CloudFront-Key-Pair-Id', '', {
        domain: `.${host}`,
        path: '/',
        httpOnly: true,
        secure: true,
        expires: moment().toDate(),
    })

    res.cookie('CloudFront-Policy', '', {
        domain: `.${host}`,
        path: '/',
        httpOnly: true,
        secure: true,
        expires: moment().toDate(),
    })

    res.cookie('CloudFront-Signature', '', {
        domain: `.${host}`,
        path: '/',
        httpOnly: true,
        secure: true,
        expires: moment().toDate(),
    })
    next()
}

module.exports = { getSignedCookies, clearSignedCookies }
