import { useContext, useState, useEffect } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import QRGenerator from '../components/QRGenerator';
import QRScanner from '../components/QRScanner';
import FaceRecognition from '../components/FaceRecognition';
import AnalyticsCharts from '../components/AnalyticsCharts';
import FacultyDashboard from './FacultyDashboard';
import { motion } from 'framer-motion';
import axios from 'axios';
import { Radio, Users, PlayCircle } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const SOCKET_BASE = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// ─── Live Sessions Widget (student only) ─────────────────────────────────────
function LiveSessionsWidget({ navigate }) {
    const [liveSessions, setLiveSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSessions = () => {
            axios.get(`${SOCKET_BASE}/api/live/sessions`)
                .then(({ data }) => { setLiveSessions(data); setLoading(false); })
                .catch(() => setLoading(false));
        };
        fetchSessions();
        // Poll every 10 seconds
        const interval = setInterval(fetchSessions, 10000);
        return () => clearInterval(interval);
    }, []);

    if (loading) return (
        <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-white/30 text-sm text-center">
            Checking for live classes...
        </div>
    );

    if (liveSessions.length === 0) return (
        <div className="p-5 bg-white/5 border border-white/10 rounded-xl text-center">
            <Radio className="w-6 h-6 text-white/20 mx-auto mb-2" />
            <p className="text-white/30 text-sm">No live classes right now</p>
            <p className="text-white/20 text-xs mt-1">Check back later or ask your faculty to start a session</p>
        </div>
    );

    return (
        <div className="space-y-3">
            {liveSessions.map(session => (
                <motion.div
                    key={session.sessionId}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-xl"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-xs font-bold">LIVE</span>
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">{session.subject}</p>
                            <p className="text-white/40 text-xs">
                                {session.facultyName} · {session.studentCount} student{session.studentCount !== 1 ? 's' : ''} watching
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/live?session=${session.sessionId}`)}
                        className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                    >
                        <PlayCircle className="w-3.5 h-3.5" />
                        Join
                    </button>
                </motion.div>
            ))}
        </div>
    );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="container mx-auto p-6">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
            >
                Dashboard
            </motion.h1>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="glass-panel p-8 rounded-2xl"
            >
                <motion.div variants={itemVariants} className="mb-8">
                    <h2 className="text-2xl font-semibold mb-2 text-white">Welcome back, {user?.name}!</h2>
                    <p className="text-gray-400">Role: <span className="capitalize font-medium text-purple-400">{user?.role}</span></p>
                </motion.div>

                <div className="grid gap-8">
                    {user?.role === 'student' && (
                        <motion.div variants={itemVariants} className="space-y-6">
                            {/* 🔴 Live Classes */}
                            <div className="p-6 bg-red-500/5 border border-red-500/10 rounded-xl">
                                <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                                    <Radio className="w-5 h-5" />
                                    Live Classes
                                </h3>
                                <LiveSessionsWidget navigate={navigate} />
                            </div>

                            {/* Student Actions */}
                            <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                <h3 className="text-xl font-bold text-blue-400 mb-6">Student Actions</h3>
                                <div className="grid md:grid-cols-2 gap-8">
                                    <div className="glass-panel p-4 rounded-xl">
                                        <QRScanner />
                                    </div>
                                    <div className="glass-panel p-4 rounded-xl">
                                        <FaceRecognition />
                                    </div>
                                    <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center col-span-1 md:col-span-2 mt-4 bg-indigo-500/10 border-indigo-500/20">
                                        <h4 className="text-lg font-bold mb-2">Online Class (Self-paced)</h4>
                                        <p className="text-sm text-gray-400 mb-4">Join a class link and track your focus attendance.</p>
                                        <button
                                            onClick={() => navigate('/class')}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2 rounded-lg transition-all"
                                        >
                                            Open Class Page
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {user?.role === 'faculty' && (
                        <motion.div variants={itemVariants} className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <h3 className="text-xl font-bold text-green-400 mb-6">Faculty Dashboard</h3>
                            <FacultyDashboard />
                        </motion.div>
                    )}

                    {user?.role === 'admin' && (
                        <motion.div variants={itemVariants} className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <h3 className="text-xl font-bold text-purple-400 mb-6">Admin Analytics</h3>
                            <p className="mb-6 text-gray-400">Overview of system performance and attendance trends.</p>
                            <AnalyticsCharts />
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
