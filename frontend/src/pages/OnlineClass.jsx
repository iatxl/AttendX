import React, { useState, useContext, useCallback, useRef } from 'react';
import EyeTracker from '../components/EyeTracker';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle, XCircle, Users, Video, ExternalLink,
    PhoneOff, BarChart2, Eye, Clock, MonitorPlay
} from 'lucide-react';

// ─── Helper: parse & validate meeting links ───────────────────────────────────
const getMeetingMeta = (url) => {
    if (!url) return null;
    try {
        const u = new URL(url);
        const host = u.hostname;
        if (host.includes('meet.google'))
            return { type: 'google', label: 'Google Meet', color: '#00AC47', icon: '🎥' };
        if (host.includes('teams.microsoft') || host.includes('teams.live'))
            return { type: 'teams', label: 'Microsoft Teams', color: '#6264A7', icon: '💼' };
        if (host.includes('zoom.us'))
            return { type: 'zoom', label: 'Zoom', color: '#2D8CFF', icon: '🔵' };
        return { type: 'other', label: 'Meeting Link', color: '#6366f1', icon: '🔗' };
    } catch {
        return null;
    }
};

// ─── Post-class Report ────────────────────────────────────────────────────────
const ClassReport = ({ focusRatio, attendanceStatus, classDuration, navigate }) => {
    const minutes = Math.round(classDuration / 60);
    const focusMinutes = Math.round((focusRatio * classDuration) / 60);

    const stats = [
        { label: 'Focus Score', value: `${(focusRatio * 100).toFixed(0)}%`, color: focusRatio >= 0.5 ? 'text-green-400' : 'text-red-400' },
        { label: 'Time In Class', value: `${minutes} min`, color: 'text-blue-400' },
        { label: 'Focused Time', value: `${focusMinutes} min`, color: 'text-purple-400' },
        { label: 'Status', value: attendanceStatus, color: attendanceStatus === 'Present' ? 'text-green-400' : 'text-red-400' },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl mx-auto py-12 px-6 text-center"
        >
            {/* Status badge */}
            <div className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-2xl ${
                attendanceStatus === 'Present'
                    ? 'bg-green-500/20 shadow-green-500/20 border border-green-500/30'
                    : 'bg-red-500/20 shadow-red-500/20 border border-red-500/30'
            }`}>
                {attendanceStatus === 'Present'
                    ? <CheckCircle className="w-12 h-12 text-green-400" />
                    : <XCircle className="w-12 h-12 text-red-400" />
                }
            </div>

            <h2 className="text-3xl font-bold mb-1 font-['General_Sans']">Class Completed</h2>
            <p className="text-white/40 text-sm mb-8">Your attendance has been submitted automatically.</p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                {stats.map(s => (
                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4">
                        <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-white/40 text-xs mt-1">{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Focus bar */}
            <div className="mb-8">
                <div className="flex justify-between text-xs text-white/40 mb-1.5">
                    <span>Focus over class duration</span>
                    <span>{(focusRatio * 100).toFixed(1)}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-3 overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${focusRatio * 100}%` }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className={`h-3 rounded-full ${
                            focusRatio >= 0.75 ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                            : focusRatio >= 0.5 ? 'bg-gradient-to-r from-yellow-400 to-green-400'
                            : 'bg-gradient-to-r from-red-500 to-orange-400'
                        }`}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-white/20 mt-1">
                    <span>0%</span>
                    <span className="text-white/40">50% threshold</span>
                    <span>100%</span>
                </div>
            </div>

            <div className="flex gap-3 justify-center">
                <button
                    onClick={() => navigate('/dashboard')}
                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-medium transition-colors text-sm"
                >
                    Back to Dashboard
                </button>
            </div>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnlineClass() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const urlSessionId = searchParams.get('session');
    const urlMeetLink = searchParams.get('meet'); // ?meet=<encoded URL>

    const classStartTime = useRef(Date.now());

    // Focus tracking state
    const [focusRatio, setFocusRatio] = useState(0);
    const [isCurrentlyFocused, setIsCurrentlyFocused] = useState(true);
    const [isTrackingActive, setIsTrackingActive] = useState(false);

    // Class state
    const [classEnded, setClassEnded] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [classDuration, setClassDuration] = useState(0);

    // Meeting link UI
    const [meetLink, setMeetLink] = useState(urlMeetLink ? decodeURIComponent(urlMeetLink) : '');
    const [meetLinkInput, setMeetLinkInput] = useState('');
    const [showMeetPanel, setShowMeetPanel] = useState(!!urlMeetLink);

    const handleFocusUpdate = useCallback((ratio, isFocused, isActive = false) => {
        setFocusRatio(ratio);
        setIsCurrentlyFocused(isFocused);
        if (isActive) setIsTrackingActive(true);
    }, []);

    const handleEndClass = async () => {
        const duration = Math.round((Date.now() - classStartTime.current) / 1000);
        setClassDuration(duration);
        setClassEnded(true);
        setIsSubmitting(true);

        const status = (focusRatio >= 0.5 && isTrackingActive) ? 'Present' : 'Absent';
        setAttendanceStatus(status);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/attendance/mark-online`, {
                sessionId: urlSessionId || null,
                subjectId: 'demo-subject-id',
                focusRatio,
                duration,
                totalFocusTime: focusRatio * duration
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to mark online attendance', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const applyMeetLink = () => {
        const meta = getMeetingMeta(meetLinkInput);
        if (!meta) return alert('Please enter a valid Google Meet, Teams, or Zoom link.');
        setMeetLink(meetLinkInput);
        setShowMeetPanel(true);
    };

    const meetMeta = getMeetingMeta(meetLink);

    return (
        <div className="min-h-screen bg-[#060606] text-white p-4 lg:p-6 pt-20">
            <div className="max-w-7xl mx-auto">

                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                            <MonitorPlay className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold font-['General_Sans']">
                                {urlSessionId ? 'Live Class' : 'Online Class'}
                            </h1>
                            <p className="text-white/30 text-xs">AI Attendance Tracking Active</p>
                        </div>
                    </div>

                    {!classEnded && (
                        <button
                            onClick={handleEndClass}
                            className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl hover:bg-red-500/20 transition-all font-medium text-sm"
                        >
                            <PhoneOff className="w-4 h-4" />
                            End Class & Submit
                        </button>
                    )}
                </div>

                {classEnded ? (
                    /* ─── POST CLASS REPORT ─── */
                    <ClassReport
                        focusRatio={focusRatio}
                        attendanceStatus={attendanceStatus}
                        classDuration={classDuration}
                        navigate={navigate}
                    />
                ) : (
                    /* ─── LIVE CLASS VIEW ─── */
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

                        {/* Main Area */}
                        <div className="lg:col-span-2 flex flex-col gap-4">

                            {/* Meeting Link Banner */}
                            {!meetLink ? (
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                    <p className="text-white/60 text-sm font-medium mb-3 flex items-center gap-2">
                                        <Video className="w-4 h-4 text-indigo-400" />
                                        Add your Google Meet / Teams / Zoom link
                                    </p>
                                    <div className="flex gap-2">
                                        <input
                                            value={meetLinkInput}
                                            onChange={e => setMeetLinkInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && applyMeetLink()}
                                            placeholder="https://meet.google.com/xxx-xxxx-xxx"
                                            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-indigo-400/50"
                                        />
                                        <button
                                            onClick={applyMeetLink}
                                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors"
                                        >
                                            Open
                                        </button>
                                    </div>
                                    <p className="text-white/20 text-xs mt-2">
                                        Supports: Google Meet · Microsoft Teams · Zoom
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                                    {/* Meeting header bar */}
                                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                                        <div className="flex items-center gap-2">
                                            <span className="text-base">{meetMeta?.icon}</span>
                                            <span className="text-sm font-medium text-white">{meetMeta?.label}</span>
                                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                                            <span className="text-xs text-green-400">Live</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a
                                                href={meetLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20"
                                            >
                                                <ExternalLink className="w-3.5 h-3.5" />
                                                Open in New Tab
                                            </a>
                                            <button
                                                onClick={() => { setMeetLink(''); setShowMeetPanel(false); }}
                                                className="text-white/30 hover:text-white/60 text-xs px-2 py-1.5"
                                            >
                                                Change
                                            </button>
                                        </div>
                                    </div>

                                    {/* Embed area */}
                                    <div className="relative aspect-video bg-black/50 flex flex-col items-center justify-center gap-4 p-6 text-center">
                                        {/* Note: Google Meet/Teams block iframe embedding for security. We show a launch button instead. */}
                                        <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl mb-2"
                                            style={{ background: `${meetMeta?.color}22`, border: `1px solid ${meetMeta?.color}44` }}>
                                            {meetMeta?.icon}
                                        </div>
                                        <div>
                                            <p className="text-white font-semibold mb-1">{meetMeta?.label} is ready</p>
                                            <p className="text-white/40 text-sm mb-4">
                                                Click below to open your meeting.<br/>
                                                AttendX will keep tracking your focus in the background.
                                            </p>
                                        </div>
                                        <a
                                            href={meetLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium text-sm transition-all hover:scale-105 active:scale-95"
                                            style={{ background: meetMeta?.color }}
                                        >
                                            <ExternalLink className="w-4 h-4" />
                                            Join {meetMeta?.label}
                                        </a>
                                        <p className="text-white/20 text-xs mt-2">
                                            ℹ️ Keep this tab open — your attendance is being tracked here
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Alert banner when not focused */}
                            <AnimatePresence>
                                {isTrackingActive && !isCurrentlyFocused && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -8 }}
                                        className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
                                    >
                                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 animate-pulse" />
                                        <div>
                                            <p className="text-red-400 text-sm font-medium">Face not detected</p>
                                            <p className="text-red-400/60 text-xs">Please stay in front of your camera to maintain attendance</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>

                        {/* Sidebar */}
                        <div className="flex flex-col gap-4">
                            {/* Eye Tracker */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <h3 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-4 flex items-center gap-2">
                                    <Eye className="w-3.5 h-3.5" /> AI Focus Tracker
                                </h3>
                                <EyeTracker onFocusRatioUpdate={handleFocusUpdate} />

                                <div className="mt-5 space-y-3">
                                    {/* Focus progress */}
                                    <div>
                                        <div className="flex justify-between text-xs mb-1.5">
                                            <span className="text-white/50">Current Focus</span>
                                            <span className={`font-bold ${
                                                !isTrackingActive ? 'text-gray-500'
                                                : focusRatio >= 0.5 ? 'text-green-400' : 'text-red-400'
                                            }`}>
                                                {isTrackingActive ? `${(focusRatio * 100).toFixed(1)}%` : 'Waiting...'}
                                            </span>
                                        </div>
                                        <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/10 relative">
                                            {!isTrackingActive && <div className="absolute inset-0 bg-gray-500/20 animate-pulse" />}
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${
                                                    focusRatio >= 0.5
                                                        ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                                                        : 'bg-gradient-to-r from-red-400 to-rose-500'
                                                }`}
                                                style={{ width: `${isTrackingActive ? focusRatio * 100 : 0}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Threshold line */}
                                    <div className="flex justify-between text-[11px] text-white/30 pt-1 border-t border-white/5">
                                        <span>Threshold for Present</span>
                                        <span className="text-white/50 font-medium">≥ 50%</span>
                                    </div>

                                    {/* Status pill */}
                                    {isTrackingActive && (
                                        <div className={`text-center text-xs font-medium py-1.5 rounded-lg ${
                                            focusRatio >= 0.5
                                                ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}>
                                            {focusRatio >= 0.5 ? '✓ On track for Present' : '✗ Risk of Absent'}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Class timer */}
                            <ClassTimer classEnded={classEnded} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Live Class Timer ─────────────────────────────────────────────────────────
function ClassTimer({ classEnded }) {
    const [elapsed, setElapsed] = React.useState(0);
    React.useEffect(() => {
        if (classEnded) return;
        const id = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [classEnded]);

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    const fmt = (n) => String(n).padStart(2, '0');

    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
            <p className="text-xs uppercase tracking-wider text-white/30 mb-2 flex items-center justify-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Class Duration
            </p>
            <p className="text-3xl font-bold font-mono text-white tracking-widest">
                {h > 0 && `${fmt(h)}:`}{fmt(m)}:{fmt(s)}
            </p>
        </div>
    );
}
