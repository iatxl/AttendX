const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    subject: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true
    },
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Linking to User for easier querying, or could be Faculty
        required: true
    },
    qrCodeHash: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    expiresAt: {
        type: Date,
        required: true
    }
}, { timestamps: true });

// Index to automatically delete expired sessions if needed, or just use logic
// sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Session', sessionSchema);
