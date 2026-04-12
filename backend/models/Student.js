const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rollNo: {
        type: String,
        default: ''
        // NOTE: NOT unique — students can have empty rollNo before faculty assigns one
    },
    department: {
        type: String,
        default: ''
    },
    year: {
        type: String,
        default: '1'
    },
    // Faculty who invited/enrolled this student
    faculty: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Faculty',
        default: null
    },
    faceEmbeddings: {
        type: [Number],
        default: []
    }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
