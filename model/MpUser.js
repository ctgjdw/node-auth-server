const mongoose = require('mongoose')

// mp = mobile platform
const mpUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            sparse: true,
        },
        mobile: {
            type: String,
            unique: true,
            sparse: true,
        },
        password: String,
        loginType: { type: String, enum: ['mobile', 'email', 'fb'] },
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        gender: { type: String, enum: ['male', 'female', 'others'], required: true },
        age: { type: Number, required: true },
        dob: { type: String, required: true },
        address1: { type: String, required: true },
        address2: String,
        address3: String,
        postalCode: { type: String, required: true },
        countryCode: { type: String, required: true },
        city: { type: String, required: true },
        school: { type: String, required: true },
        enabled: { type: Boolean, default: true, required: true },
        verified: { type: Boolean, required: true },
        lastLogin: Date,
        lastRefresh: Date,
        userType: { type: String, default: 'youth', enum: ['youth'], required: true },

        // reference key for the roles collection
        // youth
        // underprivileged youths
        roleId: { type: mongoose.ObjectId, required: true, ref: 'Role' },
        // picture url
        profilePicUrl: { type: String, default: '' },
        resetPwToken: { type: String, default: undefined },
        verificationToken: { type: String, default: undefined },
        fbUserId: { type: String, sparse: true, unique: true },
    },
    { timestamps: true, collection: 'MpUser' }
)

mpUserSchema.virtual('fullName').get(function () {
    return this.firstName + ' ' + this.lastName
})

mpUserSchema.set('toObject', {
    virtuals: true,
})

module.exports = mongoose.model('MpUser', mpUserSchema)
