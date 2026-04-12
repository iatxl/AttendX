const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Faculty = require('../models/Faculty');
const crypto = require('crypto');

// ─── PUBLIC ROUTES (no auth needed) ──────────────────────────────────────────

// @desc   Search faculty by name (public — used during student registration)
// @route  GET /api/faculty/search?q=name
router.get('/search', async (req, res) => {
    try {
        const q = (req.query.q || '').trim();
        if (!q || q.length < 2) return res.json([]);

        const User = require('../models/User');
        // Find users with role=faculty whose name matches
        const matchingUsers = await User.find({
            role: 'faculty',
            name: { $regex: q, $options: 'i' }
        }).select('name email');

        const results = await Promise.all(matchingUsers.map(async (u) => {
            const fac = await Faculty.findOne({ user: u._id }).select('department inviteCode');
            if (!fac) return null;
            return {
                facultyId: fac._id,
                userId: u._id,
                name: u.name,
                email: u.email,
                department: fac.department || 'General',
                inviteCode: fac.inviteCode
            };
        }));

        res.json(results.filter(Boolean));
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Enroll a student under a faculty by facultyId (called right after registration)
// @route  POST /api/faculty/enroll
router.post('/enroll', protect, async (req, res) => {
    try {
        const { facultyId } = req.body;
        if (!facultyId) return res.status(400).json({ message: 'facultyId is required' });

        const faculty = await Faculty.findById(facultyId);
        if (!faculty) return res.status(404).json({ message: 'Faculty not found' });

        let student = await Student.findOne({ user: req.user._id });
        if (!student) {
            student = await Student.create({ user: req.user._id });
        }

        if (student.faculty && student.faculty.toString() === facultyId.toString()) {
            return res.json({ message: 'Already enrolled under this faculty' });
        }

        student.faculty = facultyId;
        await student.save();

        res.json({ message: `Successfully enrolled under faculty`, facultyId });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

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
        if (!faculty) return res.status(404).json({ message: 'Faculty profile not found. Please log out and log back in.' });

        const { name, code, semester } = req.body;
        if (!name || !code) return res.status(400).json({ message: 'Subject name and code are required.' });

        // Check for duplicate code
        const existing = await Subject.findOne({ code: code.toUpperCase().trim() });
        if (existing) return res.status(400).json({ message: `Subject code "${code}" already exists. Use a different code.` });

        const subject = await Subject.create({
            name: name.trim(),
            code: code.toUpperCase().trim(),
            department: faculty.department || 'General',
            semester: parseInt(semester) || 1,
            faculty: faculty._id
        });
        res.status(201).json(subject);
    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: 'That subject code is already taken. Please use a unique code.' });
        }
        res.status(500).json({ message: err.message });
    }
});

// @desc   Get students the faculty can see (enrolled + attended + all system students as fallback)
// @route  GET /api/faculty/students
router.get('/students', protect, async (req, res) => {
    try {
        const faculty = await Faculty.findOne({ user: req.user._id });
        if (!faculty) return res.status(404).json({ message: 'Faculty profile not found' });

        // Set to track unique student IDs
        const seen = new Set();
        let allStudents = [];

        // Method 1: Students who explicitly joined via invite link
        const inviteStudents = await Student.find({ faculty: faculty._id })
            .populate('user', 'name email');
        for (const s of inviteStudents) {
            if (!seen.has(s._id.toString())) {
                seen.add(s._id.toString());
                allStudents.push({ ...s.toObject(), enrolledVia: 'invite' });
            }
        }

        // Method 2: Students who have attended any of this faculty's sessions
        const facultySessions = await Session.find({ faculty: req.user._id }).select('_id');
        const sessionIds = facultySessions.map(s => s._id);
        if (sessionIds.length > 0) {
            const attendanceRecords = await Attendance.find({ session: { $in: sessionIds } })
                .populate({ path: 'student', populate: { path: 'user', select: 'name email' } });
            for (const record of attendanceRecords) {
                if (record.student && !seen.has(record.student._id.toString())) {
                    seen.add(record.student._id.toString());
                    allStudents.push({ ...record.student.toObject(), enrolledVia: 'attendance' });
                }
            }
        }

        // Method 3: Fallback — show ALL students in the system so the tab is never empty
        // This helps when no one has used invite link yet
        if (allStudents.length === 0) {
            const User = require('../models/User');
            const studentUsers = await User.find({ role: 'student' }).select('name email');
            for (const u of studentUsers) {
                const studentRecord = await Student.findOne({ user: u._id });
                if (studentRecord && !seen.has(studentRecord._id.toString())) {
                    seen.add(studentRecord._id.toString());
                    allStudents.push({
                        ...studentRecord.toObject(),
                        user: { _id: u._id, name: u.name, email: u.email },
                        enrolledVia: 'system'
                    });
                }
            }
        }

        res.json(allStudents);
    } catch (err) {
        console.error('Get students error:', err);
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

// @desc   Create an online class join link (session)
// @route  POST /api/faculty/class/create
router.post('/class/create', protect, async (req, res) => {
    try {
        const { subjectId, durationMinutes = 60 } = req.body;
        if (!subjectId) return res.status(400).json({ message: 'subjectId is required' });

        // Validate subject exists
        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        const qrCodeHash = 'ONLINE_' + crypto.randomBytes(12).toString('hex');
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

        const session = await Session.create({
            subject: subjectId,
            faculty: req.user._id,
            qrCodeHash,
            expiresAt,
            isActive: true
        });

        const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
        const classLink = `${FRONTEND}/class?session=${session._id}`;

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

// @desc   Create a live class session and return a joinable link
// @route  POST /api/faculty/live/create
router.post('/live/create', protect, async (req, res) => {
    try {
        const { subjectId, durationMinutes = 120 } = req.body;
        if (!subjectId) return res.status(400).json({ message: 'subjectId is required' });

        const subject = await Subject.findById(subjectId);
        if (!subject) return res.status(404).json({ message: 'Subject not found' });

        // Generate a unique live room ID
        const liveRoomId = 'LIVE_' + crypto.randomBytes(10).toString('hex');
        const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

        const session = await Session.create({
            subject: subjectId,
            faculty: req.user._id,
            qrCodeHash: liveRoomId,
            liveRoomId,
            expiresAt,
            isActive: true
        });

        const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
        const liveLink = `${FRONTEND}/live?session=${liveRoomId}`;
        const broadcastLink = `${FRONTEND}/live?session=${liveRoomId}&mode=broadcast`;

        res.status(201).json({
            sessionId: session._id,
            liveRoomId,
            liveLink,       // share with students
            broadcastLink,  // faculty uses this to stream
            subjectName: subject.name,
            expiresAt
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// @desc   Get class report for a live session (called when faculty ends class)
// @route  GET /api/faculty/class-report/:roomId
router.get('/class-report/:roomId', protect, async (req, res) => {
    try {
        const { roomId } = req.params;

        // Find session by liveRoomId or _id
        let session = await Session.findOne({ liveRoomId: roomId }).populate('subject', 'name code');
        if (!session) {
            // Try by _id
            session = await Session.findById(roomId).populate('subject', 'name code').catch(() => null);
        }

        if (!session) {
            // Return empty report — session may not have been formally created
            return res.json({
                sessionId: roomId,
                subject: null,
                date: new Date(),
                totalStudents: 0,
                present: 0,
                absent: 0,
                records: []
            });
        }

        // Get all attendance records for this session
        const records = await Attendance.find({ session: session._id })
            .populate({
                path: 'student',
                populate: { path: 'user', select: 'name email' }
            })
            .sort({ createdAt: -1 });

        const present = records.filter(r => r.status === 'Present').length;

        res.json({
            sessionId: session._id,
            liveRoomId: roomId,
            subject: session.subject ? { name: session.subject.name, code: session.subject.code } : null,
            date: session.createdAt,
            totalStudents: records.length,
            present,
            absent: records.length - present,
            records: records.map(r => ({
                _id: r._id,
                studentName: r.student?.user?.name || 'Unknown',
                studentEmail: r.student?.user?.email || '',
                status: r.status,
                focusScore: r.focusRatio != null ? Math.round(r.focusRatio * 100) : null,
                duration: r.duration || 0,
                joinedAt: r.createdAt
            }))
        });
    } catch (err) {
        console.error('Class report error:', err);
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
