const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Faculty = require('../models/Faculty');
const crypto = require('crypto');

// ─── INVITE SYSTEM ────────────────────────────────────────────────────────────

// @desc   Get faculty's own invite link info
// @route  GET /api/faculty/my-invite
router.get('/my-invite', protect, async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ user: req.user._id });
        if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });

        const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/join?code=${faculty.inviteCode}`;
        res.json({ inviteCode: faculty.inviteCode, inviteLink });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Get faculty info from invite code (public - no auth needed)
// @route  GET /api/faculty/invite-info/:code
router.get('/invite-info/:code', async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ inviteCode: req.params.code }).populate('user', 'name email');
        if (!faculty) return res.status(404).json({ message: 'Invalid invite code' });
        res.json({ facultyName: faculty.user.name, department: faculty.department });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Student joins faculty using invite code
// @route  POST /api/faculty/join
router.post('/join', protect, async (req, res) => {
    try {
        const { inviteCode } = req.body;
        const faculty = await Faculty.findOne({ inviteCode });
        if (!faculty) return res.status(404).json({ message: 'Invalid invite code' });

        const student = await Student.findOne({ user: req.user._id });
        if (!student) return res.status(404).json({ message: 'Student profile not found' });

        if (student.faculty && student.faculty.toString() === faculty._id.toString()) {
            return res.status(400).json({ message: 'Already enrolled under this faculty' });
        }

        student.faculty = faculty._id;
        await student.save();

        res.json({ message: `Successfully enrolled under ${faculty.user ? 'faculty' : 'your teacher'}`, facultyId: faculty._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ─── SUBJECTS ─────────────────────────────────────────────────────────────────

// @desc   Get all subjects created by this faculty
// @route  GET /api/faculty/subjects
router.get('/subjects', protect, async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ user: req.user._id });
        if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });

        const subjects = await Subject.find({ faculty: faculty._id });
        res.json(subjects);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Create a subject
// @route  POST /api/faculty/subjects
router.post('/subjects', protect, async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ user: req.user._id });
        if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });

        const { name, code, department, semester } = req.body;
        const subject = await Subject.create({
            name,
            code,
            department: department || faculty.department,
            semester: semester || 1,
            faculty: faculty._id
        });
        res.status(201).json(subject);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Get students enrolled under this faculty
// @route  GET /api/faculty/students
router.get('/students', protect, async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ user: req.user._id });
        if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });

        const students = await Student.find({ faculty: faculty._id }).populate('user', 'name email');
        res.json(students);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Get attendance report for a specific student
// @route  GET /api/faculty/students/:studentId/report
router.get('/students/:studentId/report', protect, async (req, res) => {
    try {
        const attendance = await Attendance.find({ student: req.params.studentId })
            .populate({
                path: 'session',
                populate: { path: 'subject', select: 'name code' }
            })
            .sort({ createdAt: -1 });

        const total = attendance.length;
        const present = attendance.filter(a => a.status === 'Present').length;
        const focusScore = attendance
            .filter(a => a.verificationMethod === 'Face')
            .reduce((sum, a) => sum + (a.confidenceScore || 0), 0);

        res.json({
            total,
            present,
            absent: total - present,
            attendancePercent: total ? Math.round((present / total) * 100) : 0,
            records: attendance
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Create an online class link (session) for a subject
// @route  POST /api/faculty/class/create
router.post('/class/create', protect, async (req, res) => {
    try {
        const { subjectId, durationMinutes = 60 } = req.body;

        if (!subjectId) return res.status(400).json({ message: 'subjectId is required' });

        const qrCodeHash = 'ONLINE_' + crypto.randomBytes(12).toString('hex');
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

        const session = await Session.create({
            subject: subjectId,
            faculty: req.user._id,
            qrCodeHash,
            expiresAt,
            isActive: true
        });

        const classLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/class?session=${session._id}`;

        res.status(201).json({
            sessionId: session._id,
            classLink,
            expiresAt,
            durationMinutes
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
