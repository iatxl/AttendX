const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rollNo: {
        type: String,
        required: true,
        unique: true
    },
    department: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    faceEmbeddings: {
        type: [Number], // Array of 128 floats from face_recognition
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
