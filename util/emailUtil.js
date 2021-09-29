const nodemailer = require('nodemailer')
const path = require('path')
const fs = require('fs')
const _ = require('lodash')
const host = process.env.HOST

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PW,
    },
})

transporter.verify().then(console.log('Connected to email')).catch(console.error)

function apSendResetPwEmail(token, email) {
    const bodyPath = path.join(__dirname, 'emailBody', 'resetPwAp.html')
    let emailBody = fs.readFileSync(bodyPath, 'utf8')
    const link = `https://web.${host}/ap/reset-pw?token=${token}`

    // Replace both inserts
    emailBody = _.replace(emailBody, 'insert1', link)
    emailBody = _.replace(emailBody, 'insert2', link)

    // send email with reset url via SMTP using an existing email address
    transporter
        .sendMail({
            from: `"Equity Lab Dev" ${process.env.EMAIL}`,
            to: email,
            subject: 'Equity Lab Admin Platform: Password Reset Request',
            html: emailBody,
        })
        .then((info) => {
            console.log(info)
        })
        .catch(console.error)
}

function mpSendResetPwEmail(token, email) {
    const bodyPath = path.join(__dirname, 'emailBody', 'resetPwMp.html')
    let emailBody = fs.readFileSync(bodyPath, 'utf8')
    const link = `https://web.${host}/mp/reset-pw?token=${token}`

    // Replace both inserts
    emailBody = _.replace(emailBody, 'insert1', link)
    emailBody = _.replace(emailBody, 'insert2', link)

    // send email with reset url via SMTP using an existing email address
    transporter
        .sendMail({
            from: `"Equity Lab Dev" ${process.env.EMAIL}`,
            to: email,
            subject: 'Equity Lab Account: Password Reset Request',
            html: emailBody,
        })
        .then((info) => {
            console.log(info)
        })
        .catch(console.error)
}

function mpSendAccountVerificationEmail(token, email) {
    const bodyPath = path.join(__dirname, 'emailBody', 'verifyAccMp.html')
    let emailBody = fs.readFileSync(bodyPath, 'utf8')
    const link = `https://web.${host}/mp/verify-acc?token=${token}`

    // Replace both inserts
    emailBody = _.replace(emailBody, 'insert1', link)
    emailBody = _.replace(emailBody, 'insert2', link)

    // send email with reset url via SMTP using an existing email address
    transporter
        .sendMail({
            from: `"Equity Lab Dev" ${process.env.EMAIL}`,
            to: email,
            subject: 'Equity Lab Account: Verify New Account',
            html: emailBody,
        })
        .then((info) => {
            console.log(info)
        })
        .catch(console.error)
}

module.exports = { apSendResetPwEmail, mpSendResetPwEmail, mpSendAccountVerificationEmail }
