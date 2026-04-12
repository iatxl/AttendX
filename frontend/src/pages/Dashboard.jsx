import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import FacultyDashboard from './FacultyDashboard';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Radio, PlayCircle, QrCode, Scan, MonitorPlay, BarChart3 } from 'lucide-react';

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

// ─── Student Action Card ──────────────────────────────────────────────────────
function ActionCard({ icon: Icon, title, desc, onClick, color = 'indigo' }) {
    const colors = {
        indigo: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:border-indigo-500/40',
        blue: 'bg-blue-500/10 border-blue-500/20 text-blue-400 hover:border-blue-500/40',
        green: 'bg-green-500/10 border-green-500/20 text-green-400 hover:border-green-500/40',
    };
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-5 border rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] ${colors[color]}`}
        >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
                <Icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-white text-sm mb-1">{title}</p>
            <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
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
                <div className="space-y-6">
                    {/* Live Classes */}
                    <motion.div custom={0} variants={fadeUp} initial="hidden" animate="visible"
                        className="bg-white/3 border border-white/8 rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <Radio className="w-4 h-4 text-red-400" />
                                Live Classes
                            </h2>
                            <span className="text-xs text-white/20">Refreshes every 10s</span>
                        </div>
                        <LiveSessionsWidget navigate={navigate} />
                    </motion.div>

                    {/* Action Cards */}
                    <motion.div custom={1} variants={fadeUp} initial="hidden" animate="visible"
                        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <ActionCard
                            icon={MonitorPlay}
                            title="Online Class"
                            desc="Join a class via shared link with AI focus tracking attendance."
                            onClick={() => navigate('/class')}
                            color="indigo"
                        />
                        <ActionCard
                            icon={Scan}
                            title="Scan QR Code"
                            desc="Mark attendance by scanning the classroom QR code."
                            onClick={() => navigate('/dashboard#qr')}
                            color="blue"
                        />
                        <ActionCard
                            icon={BarChart3}
                            title="My Attendance"
                            desc="View your attendance records and focus analytics."
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
