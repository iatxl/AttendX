const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Generate JWT
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d',
    });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        const userExists = await User.findOne({ email });

        if (userExists) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const user = await User.create({ name, email, password, role });

        if (user) {
            // Auto-create profile based on role
            if (role === 'faculty') {
                const Faculty = require('../models/Faculty');
                const crypto = require('crypto');
                const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
                await Faculty.create({
                    user: user._id,
                    department: 'General',
                    designation: 'Lecturer',
                    inviteCode
                });
            } else if (role === 'student') {
                const Student = require('../models/Student');
                await Student.create({ user: user._id });
            }

            res.status(201).json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(400).json({ message: 'Invalid user data' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });

        if (user && (await user.matchPassword(password))) {
            // Ensure profile exists (backfill for pre-fix accounts)
            if (user.role === 'faculty') {
                const Faculty = require('../models/Faculty');
                const crypto = require('crypto');
                const existing = await Faculty.findOne({ user: user._id });
                if (!existing) {
                    const inviteCode = crypto.randomBytes(6).toString('hex').toUpperCase();
                    await Faculty.create({
                        user: user._id,
                        department: 'General',
                        designation: 'Lecturer',
                        inviteCode
                    });
                }
            } else if (user.role === 'student') {
                const Student = require('../models/Student');
                const existing = await Student.findOne({ user: user._id });
                if (!existing) {
                    await Student.create({ user: user._id });
                }
            }

            res.json({
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                token: generateToken(user._id),
            });
        } else {
            res.status(401).json({ message: 'Invalid email or password' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { registerUser, loginUser, getMe };
