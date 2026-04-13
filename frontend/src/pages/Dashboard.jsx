import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FacultyDashboard from './FacultyDashboard';
import StudentQRScanner from '../components/StudentQRScanner';
import StudentAttendanceRecords from '../components/StudentAttendanceRecords';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import React from 'react';
import {
    Radio, PlayCircle, QrCode, Scan, MonitorPlay, BarChart3,
    UserPlus, CheckCircle, X, AlertCircle, Building2, Loader2
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// ─── Live Sessions Widget ─────────────────────────────────────────────────────
function LiveSessionsWidget({ navigate }) {
    const [liveSessions, setLiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = () => {
            axios.get(`${SOCKET_BASE}/api/live/sessions`)
                .then(({ data }) => { setLiveSessions(data); setLoading(false); })
                .catch(() => setLoading(false));
        };
        fetch();
        const interval = setInterval(fetch, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="text-white/30 text-sm text-center py-6 animate-pulse font-medium">Checking for live classes...</div>
    );

    if (liveSessions.length === 0) return (
        <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/8 border border-white/15 flex items-center justify-center mx-auto mb-4">
                <Radio className="w-6 h-6 text-white/30" />
            </div>
            <p className="text-white/50 text-sm font-medium">No live classes right now</p>
            <p className="text-white/25 text-xs mt-1">Your faculty will start a session when class begins</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {liveSessions.map(session => (
                <motion.div
                    key={session.sessionId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/25 rounded-2xl hover:bg-red-500/15 hover:border-red-500/40 transition-all group"
                >
                    <div className="flex items-center gap-4 min-w-0">
                        <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse flex-shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                        <div className="min-w-0">
                            <p className="text-white font-bold text-sm truncate">{session.subject}</p>
                            <p className="text-white/50 text-[10px] font-medium uppercase tracking-wider">{session.facultyName} · {session.studentCount} joined</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/live?session=${session.sessionId}`)}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex-shrink-0 ml-3 shadow-lg shadow-red-900/40"
                    >
                        <PlayCircle className="w-4 h-4" /> Join Class
                    </button>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Join Faculty Widget ──────────────────────────────────────────────────────
function JoinFacultyWidget() {
    const [input, setInput] = useState('');
    const [preview, setPreview] = useState(null);
    const [checking, setChecking] = useState(false);
    const [joining, setJoining] = useState(false);
    const [result, setResult] = useState(null);      // 'success' | 'already' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const debounceRef = React.useRef(null);

    const extractCode = (raw) => {
        const trimmed = raw.trim();
        try {
            const url = new URL(trimmed);
            return url.searchParams.get('code') || trimmed;
        } catch { return trimmed; }
    };

    const handleInputChange = (val) => {
        setInput(val);
        setPreview(null);
        setResult(null);
        setErrorMsg('');
        const code = extractCode(val);
        if (code.length < 4) return;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setChecking(true);
            try {
                const { data } = await axios.get(`${API}/faculty/invite-info/${code}`);
                setPreview(data);
            } catch { setPreview(null); }
            setChecking(false);
        }, 500);
    };

    const handleJoin = async () => {
        const code = extractCode(input);
        if (!code) return;
        setJoining(true);
        setErrorMsg('');
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API}/faculty/join`, { inviteCode: code }, { headers: { Authorization: `Bearer ${token}` } });
            setResult('success');
            setInput('');
            setPreview(null);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to join';
            if (msg.toLowerCase().includes('already')) setResult('already');
            else { setResult('error'); setErrorMsg(msg); }
        }
        setJoining(false);
    };

    return (
        <div className="bg-white/8 border border-white/18 rounded-3xl p-6 space-y-5">
            <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2 mb-1">
                    <UserPlus className="w-4 h-4 text-indigo-400" />
                    Join a Faculty Class
                </h3>
                <p className="text-white/40 text-[11px] font-medium">Paste your faculty's invite code or link to enroll</p>
            </div>

            {result === 'success' && (
                <div className="flex items-center gap-3 bg-green-500/15 border border-green-500/30 rounded-2xl px-5 py-4">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-green-400 text-xs font-semibold">Successfully joined the faculty class!</p>
                </div>
            )}

            {result !== 'success' && (
                <>
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => handleInputChange(e.target.value)}
                            placeholder="Paste invite code or link..."
                            className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3.5 text-white text-sm placeholder-white/20 focus:border-white/30 transition-all font-mono"
                        />
                        {checking && (
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                        )}
                    </div>

                    <AnimatePresence>
                        {preview && (
                            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                                className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-2xl px-4 py-3"
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {preview.facultyName?.[0]?.toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-bold">{preview.facultyName}</p>
                                    <p className="text-white/60 text-[10px] uppercase tracking-wider font-bold">{preview.department} Dept</p>
                                </div>
                                <span className="ml-auto text-[10px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">Valid</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {result === 'error' && <p className="text-red-400 text-xs px-1 font-medium italic">{errorMsg}</p>}
                    {result === 'already' && <p className="text-amber-400 text-xs px-1 font-medium italic font-bold tracking-tight bg-amber-500/10 border border-amber-500/20 py-2 rounded-xl text-center px-4">You are already enrolled with this faculty</p>}

                    <button
                        onClick={handleJoin}
                        disabled={!preview || joining}
                        className="w-full bg-white text-black font-bold py-3.5 rounded-2xl text-sm disabled:opacity-30 hover:bg-white/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5"
                    >
                        {joining ? <><Loader2 className="w-4 h-4 animate-spin" /> Enrolling...</> : <><UserPlus className="w-4 h-4" /> Enroll in Class</>}
                    </button>
                </>
            )}
        </div>
    );
}

// ─── Student Action Card ──────────────────────────────────────────────────────
function ActionCard({ icon: Icon, title, desc, onClick, color = 'indigo' }) {
    const colors = {
        indigo: 'border-white/15 hover:border-indigo-500/30 text-indigo-400 bg-indigo-500/5',
        blue: 'border-white/15 hover:border-blue-500/30 text-blue-400 bg-blue-500/5',
        green: 'border-white/15 hover:border-green-500/30 text-green-400 bg-green-500/5',
    };
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-6 border rounded-3xl backdrop-blur-md transition-all hover:scale-[1.02] active:scale-[0.98] ${colors[color]}`}
        >
            <div className={`w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center mb-4 border border-white/10`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="font-bold text-white text-base mb-1.5">{title}</p>
            <p className="text-white/60 text-xs leading-relaxed font-medium">{desc}</p>
        </button>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [studentView, setStudentView] = useState('home'); // home | qr | attendance

    const fadeUp = {
        hidden: { opacity: 0, y: 16 },
        visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatePresence mode="wait">
                {user?.role === 'student' && studentView === 'home' && (
                    <motion.div key="student-home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-8">
                        {/* Page header */}
                        <motion.div variants={fadeUp} initial="hidden" animate="visible" className="pt-2">
                            <p className="text-white/40 text-[10px] uppercase tracking-widest mb-3 font-bold">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                            </p>
                            <h1 className="font-display text-4xl sm:text-5xl font-bold text-white mb-2 leading-tight">
                                Welcome, {user?.name?.split(' ')[0]}<span className="text-indigo-500">.</span>
                            </h1>
                            <div className="flex items-center gap-3">
                                <span className="text-white/60 text-sm font-medium capitalize bg-white/10 px-3 py-1 rounded-full border border-white/10">{user?.role} Profile</span>
                                <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                                    System Active
                                </span>
                            </div>
                        </motion.div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                                <JoinFacultyWidget />
                            </motion.div>

                            <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible" className="bg-white/8 border border-white/18 rounded-3xl p-6">
                                <div className="flex items-center justify-between mb-5">
                                    <h2 className="font-bold text-white text-sm flex items-center gap-2">
                                        <Radio className="w-4 h-4 text-red-500" />
                                        Classes Live Now
                                    </h2>
                                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Auto-refresh Active</span>
                                </div>
                                <LiveSessionsWidget navigate={navigate} />
                            </motion.div>
                        </div>

                        <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <ActionCard icon={MonitorPlay} title="Online Class" desc="Join via shared link with AI focus tracking." onClick={() => navigate('/class')} color="indigo" />
                            <ActionCard icon={Scan} title="Scan QR" desc="Mark attendance by scanning classroom QR." onClick={() => setStudentView('qr')} color="blue" />
                            <ActionCard icon={BarChart3} title="My Attendance" desc="View your records and analytics." onClick={() => setStudentView('attendance')} color="green" />
                        </motion.div>
                    </motion.div>
                )}

                {user?.role === 'student' && studentView === 'qr' && (
                    <motion.div key="student-qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="max-w-2xl mx-auto">
                            <StudentQRScanner onBack={() => setStudentView('home')} />
                        </div>
                    </motion.div>
                )}

                {user?.role === 'student' && studentView === 'attendance' && (
                    <motion.div key="student-attendance" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                        <div className="max-w-3xl mx-auto">
                            <StudentAttendanceRecords onBack={() => setStudentView('home')} />
                        </div>
                    </motion.div>
                )}

                {user?.role === 'faculty' && (
                    <motion.div key="faculty-home" custom={0} variants={fadeUp} initial="hidden" animate="visible">
                        <FacultyDashboard />
                    </motion.div>
                )}

                {user?.role === 'admin' && (
                    <motion.div key="admin-home" custom={0} variants={fadeUp} initial="hidden" animate="visible" className="bg-white/8 border border-white/18 rounded-3xl p-8">
                        <h2 className="font-bold text-white text-xl mb-4 flex items-center gap-2">
                            <BarChart3 className="w-6 h-6 text-purple-400" />
                            System Administration
                        </h2>
                        <p className="text-white/60 text-sm font-medium">Enterprise analytics and user management coming in v2.0.</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Dashboard;
