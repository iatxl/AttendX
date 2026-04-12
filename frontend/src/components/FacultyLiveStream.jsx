import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import {
    Monitor, Video, StopCircle, Users, Radio, AlertCircle,
    Link2, Copy, Check, ExternalLink, Clock, Download,
    CheckCircle, XCircle, BarChart2, FileText, X, TrendingUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

// ── CSV downloader ─────────────────────────────────────────────────────────────
function downloadCSV(report) {
    const date = new Date(report.date).toLocaleDateString('en-IN');
    const subject = report.subject ? `${report.subject.name} (${report.subject.code})` : 'Live Class';

    const headers = ['#', 'Student Name', 'Email', 'Status', 'Focus Score (%)', 'Duration (min)', 'Joined At'];
    const rows = report.records.map((r, i) => [
        i + 1,
        `"${r.studentName}"`,
        r.studentEmail,
        r.status,
        r.focusScore !== null ? r.focusScore : 'N/A',
        Math.round((r.duration || 0) / 60),
        new Date(r.joinedAt).toLocaleTimeString('en-IN')
    ]);

    const summary = [
        [], // blank line
        [`Class: ${subject}`],
        [`Date: ${date}`],
        [`Total Students: ${report.totalStudents}`],
        [`Present: ${report.present}`, `Absent: ${report.absent}`],
        [`Attendance Rate: ${report.totalStudents > 0 ? Math.round((report.present / report.totalStudents) * 100) : 0}%`],
    ];

    const csvContent = [
        ...summary.map(r => r.join(',')),
        '',
        headers.join(','),
        ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AttendX_Report_${subject.replace(/[^a-z0-9]/gi, '_')}_${date.replace(/\//g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── Class Report Modal ─────────────────────────────────────────────────────────
function ClassReportModal({ report, onClose, onNewClass }) {
    const attendanceRate = report.totalStudents > 0
        ? Math.round((report.present / report.totalStudents) * 100)
        : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-[#0d0d0d] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/8 flex items-start justify-between flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <FileText className="w-4 h-4 text-white/40" />
                            <h2 className="text-white font-bold text-lg">Class Report</h2>
                        </div>
                        <p className="text-white/30 text-xs">
                            {report.subject
                                ? `${report.subject.name} · ${report.subject.code}`
                                : 'Live Class'
                            } · {new Date(report.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-white/25 hover:text-white transition-colors p-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Stats */}
                <div className="px-6 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 flex-shrink-0">
                    {[
                        { label: 'Total', value: report.totalStudents, color: 'text-white' },
                        { label: 'Present', value: report.present, color: 'text-green-400' },
                        { label: 'Absent', value: report.absent, color: 'text-red-400' },
                        { label: 'Rate', value: `${attendanceRate}%`, color: attendanceRate >= 75 ? 'text-green-400' : attendanceRate >= 50 ? 'text-amber-400' : 'text-red-400' },
                    ].map(stat => (
                        <div key={stat.label} className="bg-white/4 border border-white/8 rounded-2xl p-4 text-center">
                            <p className={`text-2xl font-bold mb-0.5 ${stat.color}`}>{stat.value}</p>
                            <p className="text-white/30 text-xs">{stat.label}</p>
                        </div>
                    ))}
                </div>

                {/* Attendance bar */}
                <div className="px-6 pb-4 flex-shrink-0">
                    <div className="w-full bg-white/6 rounded-full h-1.5 overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${attendanceRate}%` }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className={`h-full rounded-full ${attendanceRate >= 75 ? 'bg-green-400' : attendanceRate >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                        />
                    </div>
                </div>

                {/* Student list */}
                <div className="flex-1 overflow-y-auto px-6 pb-2">
                    {report.records.length === 0 ? (
                        <div className="py-12 text-center">
                            <Users className="w-10 h-10 text-white/10 mx-auto mb-3" />
                            <p className="text-white/30 text-sm">No students attended this class</p>
                            <p className="text-white/15 text-xs mt-1">Students appear here after they submit their attendance</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Column headers */}
                            <div className="grid grid-cols-12 gap-2 px-3 pb-1">
                                <span className="col-span-5 text-xs text-white/25 font-medium">Student</span>
                                <span className="col-span-3 text-xs text-white/25 font-medium text-center">Focus</span>
                                <span className="col-span-2 text-xs text-white/25 font-medium text-center">Duration</span>
                                <span className="col-span-2 text-xs text-white/25 font-medium text-right">Status</span>
                            </div>
                            {report.records.map((r, i) => (
                                <motion.div
                                    key={r._id || i}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.04 }}
                                    className="grid grid-cols-12 gap-2 items-center bg-white/3 border border-white/6 rounded-xl px-3 py-3"
                                >
                                    {/* Name + email */}
                                    <div className="col-span-5 flex items-center gap-2.5 min-w-0">
                                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                            r.status === 'Present'
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-red-500/20 text-red-400'
                                        }`}>
                                            {r.studentName?.[0]?.toUpperCase() || '?'}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-white text-xs font-medium truncate">{r.studentName}</p>
                                            <p className="text-white/25 text-xs truncate">{r.studentEmail || '—'}</p>
                                        </div>
                                    </div>

                                    {/* Focus score */}
                                    <div className="col-span-3 flex flex-col items-center gap-1">
                                        {r.focusScore !== null ? (
                                            <>
                                                <span className={`text-sm font-bold ${r.focusScore >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                                                    {r.focusScore}%
                                                </span>
                                                <div className="w-full bg-white/8 rounded-full h-1 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${r.focusScore >= 50 ? 'bg-green-400' : 'bg-red-400'}`}
                                                        style={{ width: `${r.focusScore}%` }}
                                                    />
                                                </div>
                                            </>
                                        ) : (
                                            <span className="text-white/20 text-xs">—</span>
                                        )}
                                    </div>

                                    {/* Duration */}
                                    <div className="col-span-2 text-center">
                                        <span className="text-white/40 text-xs">
                                            {r.duration ? `${Math.round(r.duration / 60)}m` : '—'}
                                        </span>
                                    </div>

                                    {/* Status badge */}
                                    <div className="col-span-2 flex justify-end">
                                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                                            r.status === 'Present'
                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                : 'bg-red-500/10 text-red-400 border-red-500/20'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer actions */}
                <div className="px-6 py-4 border-t border-white/8 flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={() => downloadCSV(report)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 transition-all"
                    >
                        <Download className="w-4 h-4" />
                        Download CSV
                    </button>
                    <button
                        onClick={onNewClass}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/6 border border-white/10 text-white/60 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all"
                    >
                        Start New Class
                    </button>
                    <button
                        onClick={onClose}
                        className="ml-auto text-white/25 hover:text-white/60 text-sm transition-colors"
                    >
                        Close
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function FacultyLiveStream({ subjects }) {
    const { user } = useContext(AuthContext);
    const token = localStorage.getItem('token');

    const [mode, setMode] = useState('setup'); // setup | link-created | live | ended
    const [selectedSubject, setSelectedSubject] = useState('');
    const [streamType, setStreamType] = useState('screen');
    const [studentCount, setStudentCount] = useState(0);
    const [error, setError] = useState('');

    // Live link
    const [creatingLink, setCreatingLink] = useState(false);
    const [generatedLiveLink, setGeneratedLiveLink] = useState(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // Session
    const [sessionId] = useState(() => `live_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const [liveJoinLink, setLiveJoinLink] = useState('');

    // Report
    const [classReport, setClassReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [showReport, setShowReport] = useState(false);

    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef({});
    const activeLiveRoomId = useRef(null);

    useEffect(() => {
        return () => stopBroadcast(true);
    }, []);

    // ── Fetch report from backend ──────────────────────────────────────────────
    const fetchClassReport = useCallback(async (roomId) => {
        setLoadingReport(true);
        try {
            const { data } = await axios.get(`${API}/faculty/class-report/${roomId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClassReport(data);
            setShowReport(true);
        } catch (err) {
            console.error('Report fetch error:', err);
            // Still show empty report
            setClassReport({
                sessionId: roomId,
                subject: subjects.find(s => s._id === selectedSubject) || null,
                date: new Date(),
                totalStudents: studentCount,
                present: 0,
                absent: studentCount,
                records: []
            });
            setShowReport(true);
        }
        setLoadingReport(false);
    }, [token, subjects, selectedSubject, studentCount]);

    // ── Create Live Link ───────────────────────────────────────────────────────
    const handleCreateLiveLink = async () => {
        if (!selectedSubject) { setError('Please select a subject first.'); return; }
        setError('');
        setCreatingLink(true);
        try {
            const { data } = await axios.post(`${API}/faculty/live/create`, {
                subjectId: selectedSubject,
                durationMinutes: 120
            }, { headers: { Authorization: `Bearer ${token}` } });

            setGeneratedLiveLink(data);
            activeLiveRoomId.current = data.liveRoomId;
            setMode('link-created');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create live link.');
        }
        setCreatingLink(false);
    };

    // ── WebRTC ─────────────────────────────────────────────────────────────────
    const createPeerForStudent = useCallback((studentSocketId) => {
        const pc = new RTCPeerConnection(ICE_SERVERS);
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => {
                pc.addTrack(track, localStreamRef.current);
            });
        }
        pc.onicecandidate = (e) => {
            if (e.candidate && socketRef.current) {
                socketRef.current.emit('ice-candidate', { targetSocketId: studentSocketId, candidate: e.candidate });
            }
        };
        peersRef.current[studentSocketId] = pc;
        return pc;
    }, []);

    const startBroadcast = async () => {
        if (!selectedSubject) { setError('Please select a subject first.'); return; }
        setError('');
        try {
            let stream;
            if (streamType === 'screen') {
                stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
            } else {
                stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            }
            localStreamRef.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.muted = true;
                localVideoRef.current.play();
            }
            stream.getVideoTracks()[0].onended = () => stopBroadcast();

            const socket = io(SOCKET_URL);
            socketRef.current = socket;

            const roomId = generatedLiveLink?.liveRoomId || sessionId;
            activeLiveRoomId.current = roomId;
            const subjectName = subjects.find(s => s._id === selectedSubject)?.name || selectedSubject;

            socket.emit('start-broadcast', {
                sessionId: roomId,
                subject: subjectName,
                facultyName: user?.name || 'Faculty'
            });

            setLiveJoinLink(`${window.location.origin}/live?session=${roomId}`);

            socket.on('student-joined', async ({ studentSocketId }) => {
                setStudentCount(c => c + 1);
                const pc = createPeerForStudent(studentSocketId);
                const offer = await pc.createOffer();
                await pc.setLocalDescription(offer);
                socket.emit('offer', { targetSocketId: studentSocketId, offer });
            });

            socket.on('answer', async ({ fromSocketId, answer }) => {
                const pc = peersRef.current[fromSocketId];
                if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
            });

            socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
                const pc = peersRef.current[fromSocketId];
                if (pc) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            });

            socket.on('student-left', ({ studentSocketId }) => {
                if (peersRef.current[studentSocketId]) {
                    peersRef.current[studentSocketId].close();
                    delete peersRef.current[studentSocketId];
                    setStudentCount(c => Math.max(0, c - 1));
                }
            });

            setMode('live');
        } catch (err) {
            if (err.name !== 'NotAllowedError') setError('Failed to start stream. Please try again.');
        }
    };

    const stopBroadcast = useCallback((silent = false) => {
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (socketRef.current) {
            if (!silent) socketRef.current.emit('end-broadcast', {
                sessionId: generatedLiveLink?.liveRoomId || sessionId
            });
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (!silent) {
            setMode('ended');
            // Fetch report
            const roomId = activeLiveRoomId.current || generatedLiveLink?.liveRoomId || sessionId;
            fetchClassReport(roomId);
        }
    }, [generatedLiveLink, sessionId, fetchClassReport]);

    const handleNewClass = () => {
        setMode('setup');
        setStudentCount(0);
        setGeneratedLiveLink(null);
        setClassReport(null);
        setShowReport(false);
        setSelectedSubject('');
        setLiveJoinLink('');
        activeLiveRoomId.current = null;
    };

    const copyLink = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    return (
        <>
            {/* ── Report Modal ─────────────────────────────────────────────────── */}
            <AnimatePresence>
                {showReport && classReport && (
                    <ClassReportModal
                        report={classReport}
                        onClose={() => setShowReport(false)}
                        onNewClass={() => { setShowReport(false); handleNewClass(); }}
                    />
                )}
            </AnimatePresence>

            <div className="space-y-4">
                {/* ── SETUP / LINK CREATED ─── */}
                {(mode === 'setup' || mode === 'link-created') && (
                    <div className="space-y-4">
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
                            <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                                <Radio className="w-4 h-4 text-red-400" /> Start Live Class
                            </h4>

                            <div>
                                <label className="text-xs text-white/35 mb-1 block">Subject</label>
                                <select
                                    value={selectedSubject}
                                    onChange={e => { setSelectedSubject(e.target.value); setGeneratedLiveLink(null); setMode('setup'); }}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-white/25 transition-all"
                                >
                                    <option value="" className="bg-gray-900">— Select subject —</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id} className="bg-gray-900">{s.name} ({s.code})</option>
                                    ))}
                                </select>
                                {subjects.length === 0 && (
                                    <p className="text-xs text-amber-400/60 mt-1.5 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" /> Create a subject first in the Subjects tab
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-white/35 mb-2 block">Stream source</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { id: 'screen', label: 'Share Screen', icon: Monitor },
                                        { id: 'camera', label: 'Webcam Only', icon: Video },
                                    ].map(({ id, label, icon: Icon }) => (
                                        <button key={id} onClick={() => setStreamType(id)}
                                            className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${streamType === id ? 'bg-white/10 border-white/25 text-white' : 'bg-white/3 border-white/8 text-white/40 hover:text-white/60'}`}>
                                            <Icon className="w-4 h-4" /> {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {error && (
                                <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                    <AlertCircle className="w-3.5 h-3.5" /> {error}
                                </div>
                            )}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <button
                                    onClick={handleCreateLiveLink}
                                    disabled={!selectedSubject || creatingLink}
                                    className="flex items-center justify-center gap-2 bg-white/6 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-white rounded-xl py-2.5 text-sm font-medium transition-all"
                                >
                                    <Link2 className="w-4 h-4" />
                                    {creatingLink ? 'Creating...' : 'Create Live Link First'}
                                </button>
                                <button
                                    onClick={startBroadcast}
                                    disabled={!selectedSubject}
                                    className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium transition-all"
                                >
                                    <Radio className="w-4 h-4" /> Go Live Now
                                </button>
                            </div>
                        </div>

                        {/* Generated link card */}
                        <AnimatePresence>
                            {mode === 'link-created' && generatedLiveLink && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="bg-red-500/8 border border-red-500/20 rounded-2xl p-5 space-y-4"
                                >
                                    <p className="text-red-400 font-semibold text-sm flex items-center gap-2">
                                        <Radio className="w-4 h-4 animate-pulse" />
                                        Live Link Ready — {generatedLiveLink.subjectName}
                                    </p>
                                    <div>
                                        <p className="text-xs text-white/35 mb-1.5">Share with students</p>
                                        <div className="flex items-center gap-2 bg-black/30 rounded-xl px-3 py-2.5">
                                            <code className="text-red-300/80 text-xs flex-1 break-all">{generatedLiveLink.liveLink}</code>
                                            <button onClick={() => copyLink(generatedLiveLink.liveLink)} className="text-white/30 hover:text-white flex-shrink-0">
                                                {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                            <a href={generatedLiveLink.liveLink} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-indigo-400">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-white/25">
                                        <Clock className="w-3.5 h-3.5" />
                                        Expires: {new Date(generatedLiveLink.expiresAt).toLocaleString('en-IN')}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                )}

                {/* ── LIVE BROADCASTING ─── */}
                {mode === 'live' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                        {/* Status bar */}
                        <div className="flex items-center justify-between p-4 bg-red-500/8 border border-red-500/20 rounded-2xl">
                            <div className="flex items-center gap-3">
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                <div>
                                    <p className="text-red-400 font-bold text-sm">YOU ARE LIVE</p>
                                    <p className="text-white/30 text-xs">
                                        {subjects.find(s => s._id === selectedSubject)?.name} · {streamType === 'screen' ? 'Screen' : 'Webcam'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 bg-white/6 border border-white/8 px-3 py-1.5 rounded-full">
                                    <Users className="w-3.5 h-3.5 text-white/40" />
                                    <span className="text-white font-bold text-sm">{studentCount}</span>
                                    <span className="text-white/30 text-xs">watching</span>
                                </div>
                                <button
                                    onClick={() => stopBroadcast()}
                                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
                                >
                                    <StopCircle className="w-3.5 h-3.5" /> End Class
                                </button>
                            </div>
                        </div>

                        {/* Share link while live */}
                        {liveJoinLink && (
                            <div className="flex items-center gap-2 bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                                <Link2 className="w-3.5 h-3.5 text-white/25 flex-shrink-0" />
                                <code className="text-white/40 text-xs flex-1 truncate">{liveJoinLink}</code>
                                <button onClick={() => copyLink(liveJoinLink)} className="text-white/25 hover:text-white flex-shrink-0">
                                    {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                        )}

                        {/* Video preview */}
                        <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                            <video ref={localVideoRef} className="w-full aspect-video object-contain" playsInline muted />
                            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 px-2.5 py-1 rounded-full">
                                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                <span className="text-white text-xs font-bold">LIVE</span>
                            </div>
                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5 border border-white/10">
                                <Users className="w-3 h-3 text-white/50" />
                                <span className="text-white text-xs font-bold">{studentCount}</span>
                            </div>
                        </div>

                        <div className="bg-amber-500/8 border border-amber-500/15 rounded-xl px-4 py-3 text-xs text-amber-400/70 flex items-center gap-2">
                            <BarChart2 className="w-3.5 h-3.5 flex-shrink-0" />
                            A full attendance report will be generated when you click <strong className="text-amber-400 mx-1">"End Class"</strong>
                        </div>
                    </motion.div>
                )}

                {/* ── LOADING REPORT ─── */}
                {mode === 'ended' && loadingReport && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-16 text-center space-y-4"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-white/6 border border-white/10 flex items-center justify-center mx-auto">
                            <FileText className="w-6 h-6 text-white/40" />
                        </div>
                        <div>
                            <p className="text-white font-medium text-sm">Generating Class Report</p>
                            <p className="text-white/30 text-xs mt-1">Collecting attendance data from all students...</p>
                        </div>
                        <div className="flex justify-center gap-1.5">
                            {[0, 1, 2].map(i => (
                                <div key={i} className="w-1.5 h-1.5 bg-white/30 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </motion.div>
                )}

                {/* ── POST-CLASS (View Report button if modal was closed) ─── */}
                {mode === 'ended' && !loadingReport && classReport && !showReport && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 text-center space-y-3">
                            <CheckCircle className="w-10 h-10 text-green-400 mx-auto" />
                            <div>
                                <p className="text-white font-semibold text-sm">Class Ended</p>
                                <p className="text-white/30 text-xs mt-0.5">
                                    {classReport.present}/{classReport.totalStudents} students marked Present
                                </p>
                            </div>
                            <div className="flex gap-2 justify-center">
                                <button onClick={() => setShowReport(true)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white text-black font-semibold text-sm rounded-xl hover:bg-white/90 transition-all">
                                    <FileText className="w-4 h-4" /> View Report
                                </button>
                                <button onClick={() => downloadCSV(classReport)}
                                    className="flex items-center gap-2 px-4 py-2.5 bg-white/6 border border-white/10 text-white/60 hover:text-white text-sm rounded-xl hover:bg-white/10 transition-all">
                                    <Download className="w-4 h-4" /> Download CSV
                                </button>
                                <button onClick={handleNewClass}
                                    className="px-4 py-2.5 text-white/30 hover:text-white/60 text-sm transition-colors">
                                    New Class
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </>
    );
}
