import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FacultyDashboard from './FacultyDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import React from 'react';
import {
    Radio, PlayCircle, QrCode, Scan, MonitorPlay, BarChart3,
    UserPlus, CheckCircle, X, AlertCircle, Building2
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
        <div className="text-white/20 text-sm text-center py-6 animate-pulse">Checking for live classes...</div>
    );

    if (liveSessions.length === 0) return (
        <div className="py-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                <Radio className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-white/30 text-sm">No live classes right now</p>
            <p className="text-white/15 text-xs mt-1">Your faculty will start a session when class begins</p>
        </div>
    );

    return (
        <div className="space-y-2">
            {liveSessions.map(session => (
                <motion.div
                    key={session.sessionId}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-red-500/8 border border-red-500/20 rounded-xl hover:border-red-500/30 transition-colors"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />
                        <div className="min-w-0">
                            <p className="text-white font-medium text-sm truncate">{session.subject}</p>
                            <p className="text-white/40 text-xs">{session.facultyName} · {session.studentCount} watching</p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/live?session=${session.sessionId}`)}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ml-3"
                    >
                        <PlayCircle className="w-3.5 h-3.5" /> Join
                    </button>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Join Faculty Widget ──────────────────────────────────────────────────────
function JoinFacultyWidget() {
    const [input, setInput] = useState('');
    const [preview, setPreview] = useState(null);    // { facultyName, department }
    const [checking, setChecking] = useState(false);
    const [joining, setJoining] = useState(false);
    const [result, setResult] = useState(null);      // 'success' | 'already' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const debounceRef = React.useRef(null);

    // Extract invite code from input (handles both raw code and full URL)
    const extractCode = (raw) => {
        const trimmed = raw.trim();
        // If it looks like a URL, pull the 'code' param
        try {
            const url = new URL(trimmed);
            return url.searchParams.get('code') || trimmed;
        } catch {
            return trimmed; // raw code
        }
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
            } catch {
                setPreview(null);
            }
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
            await axios.post(`${API}/faculty/join`,
                { inviteCode: code },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setResult('success');
            setInput('');
            setPreview(null);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to join';
            if (msg.toLowerCase().includes('already')) {
                setResult('already');
            } else {
                setResult('error');
                setErrorMsg(msg);
            }
        }
        setJoining(false);
    };

    return (
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
            <div>
                <h3 className="font-semibold text-white text-sm flex items-center gap-2 mb-0.5">
                    <UserPlus className="w-4 h-4 text-white/40" />
                    Join a Faculty Class
                </h3>
                <p className="text-white/25 text-xs">Paste your faculty's invite code or link</p>
            </div>

            {/* Success state */}
            {result === 'success' && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3"
                >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <div>
                        <p className="text-green-400 text-sm font-medium">Joined successfully!</p>
                        <p className="text-green-400/60 text-xs">You're now enrolled. Reload to see updates.</p>
                    </div>
                    <button onClick={() => setResult(null)} className="ml-auto text-white/20 hover:text-white/50">
                        <X className="w-4 h-4" />
                    </button>
                </motion.div>
            )}

            {result === 'already' && (
                <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <p className="text-amber-400 text-sm">You're already enrolled under this faculty.</p>
                </div>
            )}

            {result !== 'success' && (
                <>
                    {/* Input */}
                    <div className="relative">
                        <input
                            type="text"
                            value={input}
                            onChange={e => handleInputChange(e.target.value)}
                            placeholder="Paste invite code or link (e.g. E084C3D57DA0)"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:border-white/25 transition-all font-mono pr-10"
                        />
                        {checking && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border border-white/20 border-t-white/60 rounded-full animate-spin" />
                        )}
                        {preview && !checking && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                        )}
                    </div>

                    {/* Preview card */}
                    <AnimatePresence>
                        {preview && (
                            <motion.div
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
                            >
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {preview.facultyName?.[0]?.toUpperCase() || 'F'}
                                </div>
                                <div>
                                    <p className="text-white text-sm font-medium">{preview.facultyName}</p>
                                    <p className="text-white/35 text-xs flex items-center gap-1">
                                        <Building2 className="w-3 h-3" /> {preview.department}
                                    </p>
                                </div>
                                <span className="ml-auto text-xs text-green-400 font-medium">✓ Valid</span>
                            </motion.div>
                        )}
                        {input.length >= 4 && !checking && !preview && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-xs text-red-400/70 flex items-center gap-1.5 px-1"
                            >
                                <AlertCircle className="w-3.5 h-3.5" />
                                Code not found — double-check your invite code
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {result === 'error' && (
                        <p className="text-red-400 text-xs">{errorMsg}</p>
                    )}

                    <button
                        onClick={handleJoin}
                        disabled={!preview || joining}
                        className="w-full bg-white text-black font-semibold py-2.5 rounded-xl text-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/90 transition-all flex items-center justify-center gap-2"
                    >
                        {joining
                            ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Joining...</>
                            : <><UserPlus className="w-4 h-4" /> Join Faculty</>
                        }
                    </button>
                </>
            )}
        </div>
    );
}

// ─── Student Action Card ──────────────────────────────────────────────────────
function ActionCard({ icon: Icon, title, desc, onClick, color = 'indigo' }) {
    const colors = {
        indigo: 'border-white/8 hover:border-white/15 text-indigo-400',
        blue: 'border-white/8 hover:border-white/15 text-blue-400',
        green: 'border-white/8 hover:border-white/15 text-green-400',
    };
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-5 border rounded-2xl bg-white/3 hover:bg-white/5 transition-all hover:scale-[1.01] active:scale-[0.99] ${colors[color]}`}
        >
            <div className="w-8 h-8 rounded-xl bg-white/6 border border-white/8 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4" />
            </div>
            <p className="font-semibold text-white text-sm mb-1">{title}</p>
            <p className="text-white/35 text-xs leading-relaxed">{desc}</p>
        </button>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const fadeUp = {
        hidden: { opacity: 0, y: 16 },
        visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } })
    };

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Page header */}
            <motion.div
                variants={fadeUp} initial="hidden" animate="visible"
                className="mb-8 pt-2"
            >
                <p className="text-white/20 text-xs uppercase tracking-widest mb-2 font-mono">
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                </p>
                <h1 className="font-display text-3xl sm:text-4xl font-bold text-white mb-1.5">
                    {user?.name?.split(' ')[0]}<span className="text-white/20">,</span>
                </h1>
                <p className="text-white/30 text-sm">
                    <span className="capitalize">{user?.role}</span> — AttendX
                    <span className="ml-2 inline-flex items-center gap-1 text-green-400/70">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
                        Online
                    </span>
                </p>
            </motion.div>

            {/* ─── STUDENT VIEW ─── */}
            {user?.role === 'student' && (
                <div className="space-y-5">
                    {/* Join Faculty Widget */}
                    <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                        <JoinFacultyWidget />
                    </motion.div>

                    {/* Live Classes */}
                    <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
                        className="bg-white/3 border border-white/8 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white text-sm flex items-center gap-2">
                                <Radio className="w-4 h-4 text-red-400" />
                                Live Now
                            </h2>
                            <span className="text-xs text-white/20">Refreshes every 10s</span>
                        </div>
                        <LiveSessionsWidget navigate={navigate} />
                    </motion.div>

                    {/* Action Cards */}
                    <motion.div custom={2} variants={fadeUp} initial="hidden" animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <ActionCard
                            icon={MonitorPlay}
                            title="Online Class"
                            desc="Join via shared link with AI focus tracking."
                            onClick={() => navigate('/class')}
                            color="indigo"
                        />
                        <ActionCard
                            icon={Scan}
                            title="Scan QR"
                            desc="Mark attendance by scanning classroom QR."
                            onClick={() => navigate('/dashboard#qr')}
                            color="blue"
                        />
                        <ActionCard
                            icon={BarChart3}
                            title="My Attendance"
                            desc="View your attendance records and analytics."
                            onClick={() => navigate('/dashboard#analytics')}
                            color="green"
                        />
                    </motion.div>
                </div>
            )}

            {/* ─── FACULTY VIEW ─── */}
            {user?.role === 'faculty' && (
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible">
                    <FacultyDashboard />
                </motion.div>
            )}

            {/* ─── ADMIN VIEW ─── */}
            {user?.role === 'admin' && (
                <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
                    className="bg-white/3 border border-white/8 rounded-2xl p-6">
                    <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-purple-400" />
                        Admin Analytics
                    </h2>
                    <p className="text-white/40 text-sm">Analytics overview coming soon.</p>
                </motion.div>
            )}
        </div>
    );
};

export default Dashboard;
