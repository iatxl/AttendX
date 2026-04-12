require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(server, {
    cors: {
        origin: FRONTEND_URL,
        methods: ['GET', 'POST']
    }
});

const PORT = process.env.PORT || 5000;

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json());

// Database Connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(async () => {
        console.log('MongoDB Connected');
        // Drop the old unique index on rollNo that blocks multiple students with empty rollNo
        try {
            const db = mongoose.connection.db;
            const collections = await db.listCollections({ name: 'students' }).toArray();
            if (collections.length > 0) {
                const indexes = await db.collection('students').indexes();
                const hasRollNoIndex = indexes.some(idx => idx.name === 'rollNo_1' && idx.unique);
                if (hasRollNoIndex) {
                    await db.collection('students').dropIndex('rollNo_1');
                    console.log('✅ Dropped unique rollNo index — multiple students can now register');
                }
            }
        } catch (e) {
            // Index may not exist, ignore
            if (!e.message?.includes('index not found')) {
                console.warn('Index cleanup warning:', e.message);
            }
        }
    })
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/faculty', require('./routes/facultyRoutes'));

// Live session store (in-memory, keyed by sessionId)
// { sessionId: { facultySocketId, students: Set<socketId>, subject, facultyName } }
const liveRooms = {};

// REST: get all currently live sessions (for student dashboard polling)
app.get('/api/live/sessions', (req, res) => {
    const sessions = Object.entries(liveRooms).map(([id, room]) => ({
        sessionId: id,
        subject: room.subject,
        facultyName: room.facultyName,
        studentCount: room.students.size,
        startedAt: room.startedAt
    }));
    res.json(sessions);
});

// ─── Socket.io WebRTC Signaling ──────────────────────────────────────────────
io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // ── FACULTY: Start a live broadcast ──────────────────────────────────────
    socket.on('start-broadcast', ({ sessionId, subject, facultyName }) => {
        liveRooms[sessionId] = {
            facultySocketId: socket.id,
            students: new Set(),
            subject,
            facultyName,
            startedAt: new Date().toISOString()
        };
        socket.join(sessionId);
        console.log(`Live room started: ${sessionId} by ${facultyName}`);
    });

    // ── STUDENT: Join a live room ─────────────────────────────────────────────
    socket.on('join-room', ({ sessionId, studentName }) => {
        const room = liveRooms[sessionId];
        if (!room) {
            socket.emit('room-not-found');
            return;
        }
        room.students.add(socket.id);
        socket.join(sessionId);

        // Tell the faculty that this student wants to connect
        // Faculty will initiate the WebRTC offer to this student
        io.to(room.facultySocketId).emit('student-joined', {
            studentSocketId: socket.id,
            studentName
        });

        console.log(`Student ${studentName} joined room ${sessionId}`);
    });

    // ── WebRTC Offer: faculty → specific student ──────────────────────────────
    socket.on('offer', ({ targetSocketId, offer }) => {
        io.to(targetSocketId).emit('offer', {
            fromSocketId: socket.id,
            offer
        });
    });

    // ── WebRTC Answer: student → faculty ─────────────────────────────────────
    socket.on('answer', ({ targetSocketId, answer }) => {
        io.to(targetSocketId).emit('answer', {
            fromSocketId: socket.id,
            answer
        });
    });

    // ── ICE Candidates: bidirectional ─────────────────────────────────────────
    socket.on('ice-candidate', ({ targetSocketId, candidate }) => {
        io.to(targetSocketId).emit('ice-candidate', {
            fromSocketId: socket.id,
            candidate
        });
    });

    // ── FACULTY: End broadcast ────────────────────────────────────────────────
    socket.on('end-broadcast', ({ sessionId }) => {
        if (liveRooms[sessionId]) {
            io.to(sessionId).emit('broadcast-ended');
            delete liveRooms[sessionId];
        }
    });

    // ── Disconnect cleanup ────────────────────────────────────────────────────
    socket.on('disconnect', () => {
        // Check if this socket was a faculty broadcaster
        for (const [sessionId, room] of Object.entries(liveRooms)) {
            if (room.facultySocketId === socket.id) {
                io.to(sessionId).emit('broadcast-ended');
                delete liveRooms[sessionId];
                break;
            }
            // Remove student from room
            if (room.students.has(socket.id)) {
                room.students.delete(socket.id);
                // Optionally notify faculty
                io.to(room.facultySocketId).emit('student-left', { studentSocketId: socket.id });
            }
        }
        console.log('Socket disconnected:', socket.id);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.send('AttendX Backend is Running'));

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
