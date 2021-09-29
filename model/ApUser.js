const mongoose = require('mongoose')

// ap = admin platform
const apUserSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        password: {
            type: String,
            required: true,
        },
        firstName: {
            type: String,
            required: true,
        },
        lastName: {
            type: String,
            required: true,
        },
        enabled: { type: Boolean, default: true, required: true },
        verified: { type: Boolean, required: true },
        lastLogin: Date,
        lastRefresh: Date,

        // admin
        // partner
        userType: { type: String, required: true, enum: ['admin', 'partner'] },

        // reference key for the roles collection
        roleId: { type: mongoose.ObjectId, required: true, ref: 'Role' },

        // reference key for the organisation collection
        organisationId: mongoose.ObjectId,

        // picture url
        profilePicUrl: { type: String, default: '' },
        resetPwToken: String,
    },
    { timestamps: true, collection: 'ApUser' }
)

apUserSchema.virtual('fullName').get(function () {
    return this.firstName + ' ' + this.lastName
})

apUserSchema.set('toObject', {
    virtuals: true,
})

module.exports = mongoose.model('ApUser', apUserSchema)
