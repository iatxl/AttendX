const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    department: {
        type: String,
        default: 'General'
    },
    designation: {
        type: String,
        default: 'Lecturer'
    },
    // Unique invite code for adding students
    inviteCode: {
        type: String,
        unique: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Faculty', facultySchema);
