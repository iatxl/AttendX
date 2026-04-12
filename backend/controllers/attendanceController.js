const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const Student = require('../models/Student');
const crypto = require('crypto');

// @desc    Generate a new attendance session (QR Code)
// @route   POST /api/attendance/session
// @access  Private (Faculty only)
const generateSession = async (req, res) => {
    const { subjectId } = req.body;

    try {
        // Generate a random hash for the QR code
        const qrCodeHash = crypto.randomBytes(20).toString('hex');

        // Set expiry to 60 seconds from now
        const expiresAt = new Date(Date.now() + 60 * 1000);

        const session = await Session.create({
            subject: subjectId,
            faculty: req.user._id,
            qrCodeHash,
            expiresAt
        });

        res.status(201).json({
            sessionId: session._id,
            qrCodeHash: session.qrCodeHash,
            expiresAt: session.expiresAt
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Mark attendance via QR Code
// @route   POST /api/attendance/mark
// @access  Private (Student only)
const markAttendance = async (req, res) => {
    const { sessionId, qrCodeHash, location } = req.body;

    try {
        // 1. Find the session
        const session = await Session.findById(sessionId);

        if (!session) {
            return res.status(404).json({ message: 'Session not found' });
        }

        // 2. Validate QR Hash
        if (session.qrCodeHash !== qrCodeHash) {
            return res.status(400).json({ message: 'Invalid QR Code' });
        }

        // 3. Check Expiry
        if (new Date() > session.expiresAt) {
            return res.status(400).json({ message: 'QR Code has expired' });
        }

        // 4. Find Student Record
        const student = await Student.findOne({ user: req.user._id });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        // 5. Check for Duplicate Attendance
        const existingAttendance = await Attendance.findOne({
            session: sessionId,
            student: student._id
        });

        if (existingAttendance) {
            return res.status(400).json({ message: 'Attendance already marked' });
        }

        // 6. Create Attendance Record
        const attendance = await Attendance.create({
            session: sessionId,
            student: student._id,
            status: 'Present',
            verificationMethod: 'QR',
            location: location || {}, // { lat, long }
            confidenceScore: 100 // QR is considered 100% if validated
        });

        res.status(201).json({ message: 'Attendance marked successfully', attendance });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get attendance for a student
// @route   GET /api/attendance/student
// @access  Private (Student)
const getStudentAttendance = async (req, res) => {
    try {
        const student = await Student.findOne({ user: req.user._id });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        const attendance = await Attendance.find({ student: student._id })
            .populate('session')
            .populate({
                path: 'session',
                populate: { path: 'subject', select: 'name code' }
            })
            .sort({ createdAt: -1 });

        res.status(200).json(attendance);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const mongoose = require('mongoose');

// @desc    Mark attendance via online class focus tracking
// @route   POST /api/attendance/mark-online
// @access  Private (Student only)
const markOnlineAttendance = async (req, res) => {
    let { subjectId, focusRatio, duration, totalFocusTime } = req.body;

    try {
        // 1. Find Student Record
        const student = await Student.findOne({ user: req.user._id });
        if (!student) {
            return res.status(404).json({ message: 'Student profile not found' });
        }

        // Validate subjectId is ObjectId
        if (!mongoose.Types.ObjectId.isValid(subjectId)) {
            // Find any subject to use for demo purposes
            let anySubject = await require('../models/Subject').findOne();
            if (!anySubject) {
                anySubject = await require('../models/Subject').create({
                    name: 'Demo Subject',
                    code: 'DEMO101',
                    department: 'CS',
                    semester: 1
                });
            }
            subjectId = anySubject._id;
        }

        // 2. Here we could either use a Session or just mock one for the demo.
        // Let's create a generic session for this subject if it doesn't exist just so the Attendance model satisfies refs constraint
        let session = await Session.findOne({ subject: subjectId }).sort({ createdAt: -1 });
        if (!session) {
            session = await Session.create({
                subject: subjectId,
                faculty: req.user._id, // Ideally this is linked to faculty, but mock for now
                qrCodeHash: 'ONLINE_SESSION_' + Date.now(),
                expiresAt: new Date(Date.now() + 60 * 60 * 1000)
            });
        }

        // 3. Mark attendance status based on focus ratio >= 50%
        const status = focusRatio >= 0.5 ? 'Present' : 'Absent';
        
        // 4. Update or Create Attendance Record
        const attendance = await Attendance.findOneAndUpdate(
            { session: session._id, student: student._id },
            { 
                status: status,
                verificationMethod: 'Face',
                confidenceScore: focusRatio * 100,
                deviceInfo: `Total Focus: ${totalFocusTime}s / ${duration}s`
            },
            { new: true, upsert: true }
        );

        res.status(201).json({ message: 'Online attendance processed', attendance });
    } catch (error) {
        console.error("markOnlineAttendance error:", error);
        res.status(500).json({ message: error.message });
    }
}

module.exports = {
    generateSession,
    markAttendance,
    getStudentAttendance,
    markOnlineAttendance
};
