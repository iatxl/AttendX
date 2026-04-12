const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
    session: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    status: {
        type: String,
        enum: ['Present', 'Absent', 'Late'],
        default: 'Present'
    },
    verificationMethod: {
        type: String,
        enum: ['QR', 'Face', 'Manual'],
        required: true
    },
    confidenceScore: {
        type: Number,
        default: 0
    },
    location: {
        lat: Number,
        long: Number
    },
    deviceInfo: {
        type: String
    }
}, { timestamps: true });

// Prevent duplicate attendance for the same session and student
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);
