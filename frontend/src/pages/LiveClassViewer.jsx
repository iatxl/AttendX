import React, { useEffect, useRef, useState, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import EyeTracker from '../components/EyeTracker';
import AuthContext from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    CheckCircle, XCircle, Eye, Clock, PhoneOff, Radio, WifiOff
} from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

function ClassTimer({ classEnded }) {
    const [elapsed, setElapsed] = React.useState(0);
    React.useEffect(() => {
        if (classEnded) return;
        const id = setInterval(() => setElapsed(s => s + 1), 1000);
        return () => clearInterval(id);
    }, [classEnded]);
    const m = Math.floor(elapsed / 60), s = elapsed % 60;
    const f = n => String(n).padStart(2, '0');
    return (
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <p className="text-xs text-white/30 mb-1 flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Duration</p>
            <p className="text-2xl font-bold font-mono text-white">{f(m)}:{f(s)}</p>
        </div>
    );
}

export default function LiveClassViewer() {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session');

    const remoteVideoRef = useRef(null);
    const socketRef = useRef(null);
    const pcRef = useRef(null);
    const classStartTime = useRef(Date.now());

    const [connected, setConnected] = useState(false);
    const [ended, setEnded] = useState(false);
    const [connecting, setConnecting] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Attendance tracking
    const [focusRatio, setFocusRatio] = useState(0);
    const [isCurrentlyFocused, setIsCurrentlyFocused] = useState(true);
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState(null);
    const [classDuration, setClassDuration] = useState(0);

    const handleFocusUpdate = useCallback((ratio, isFocused, isActive = false) => {
        setFocusRatio(ratio);
        setIsCurrentlyFocused(isFocused);
        if (isActive) setIsTrackingActive(true);
    }, []);

    const submitAttendance = async (ratio) => {
        const duration = Math.round((Date.now() - classStartTime.current) / 1000);
        setClassDuration(duration);
        const status = (ratio >= 0.5 && isTrackingActive) ? 'Present' : 'Absent';
        setAttendanceStatus(status);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API}/attendance/mark-online`, {
                sessionId,
                subjectId: 'demo-subject-id',
                focusRatio: ratio,
                duration,
                totalFocusTime: ratio * duration
            }, { headers: { Authorization: `Bearer ${token}` } });
        } catch (err) {
            console.error('Attendance submit error:', err);
        }
    };

    const handleClassEnded = useCallback(() => {
        setEnded(true);
        setConnected(false);
        submitAttendance(focusRatio);

        if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
        if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    }, [focusRatio]);

    useEffect(() => {
        if (!sessionId) {
            setErrorMsg('No session ID found in URL.');
            setConnecting(false);
            return;
        }

        const socket = io(SOCKET_URL);
        socketRef.current = socket;

        // Step 1: Join the room
        socket.emit('join-room', { sessionId, studentName: user?.name || 'Student' });

        // Step 2: Receive WebRTC offer from faculty
        socket.on('offer', async ({ fromSocketId, offer }) => {
            const pc = new RTCPeerConnection(ICE_SERVERS);
            pcRef.current = pc;

            // When we get the remote stream, attach it to the video element
            pc.ontrack = (e) => {
                if (remoteVideoRef.current && e.streams[0]) {
                    remoteVideoRef.current.srcObject = e.streams[0];
                    remoteVideoRef.current.play().catch(() => {});
                    setConnected(true);
                    setConnecting(false);
                }
            };

            // Send ICE candidates to faculty
            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit('ice-candidate', {
                        targetSocketId: fromSocketId,
                        candidate: e.candidate
                    });
                }
            };

            await pc.setRemoteDescription(new RTCSessionDescription(offer));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('answer', { targetSocketId: fromSocketId, answer });
        });

        // Receive ICE candidates from faculty
        socket.on('ice-candidate', async ({ fromSocketId, candidate }) => {
            if (pcRef.current) {
                try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)); }
                catch (err) { console.error('ICE error:', err); }
            }
        });

        // Faculty ended the broadcast
        socket.on('broadcast-ended', handleClassEnded);

        // Room not found
        socket.on('room-not-found', () => {
            setErrorMsg('This live class is not available. It may have ended.');
            setConnecting(false);
        });

        // Timeout if faculty never sends offer within 15s
        const timeout = setTimeout(() => {
            if (!connected) {
                setErrorMsg('Could not connect to the live class. The faculty may not have started yet.');
                setConnecting(false);
            }
        }, 15000);

        return () => {
            clearTimeout(timeout);
            if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
            socket.disconnect();
        };
    }, [sessionId]);

    // Report screen after class ends
    if (ended) {
        const minutes = Math.round(classDuration / 60);
        const focusMinutes = Math.round((focusRatio * classDuration) / 60);
        return (
            <div className="min-h-screen bg-[#060606] flex items-center justify-center p-6">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-md w-full text-center space-y-6 bg-white/5 border border-white/10 rounded-2xl p-8"
                >
                    <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-2xl ${
                        attendanceStatus === 'Present'
                            ? 'bg-green-500/20 shadow-green-500/20 border border-green-500/30'
                            : 'bg-red-500/20 shadow-red-500/20 border border-red-500/30'
                    }`}>
                        {attendanceStatus === 'Present'
                            ? <CheckCircle className="w-10 h-10 text-green-400" />
                            : <XCircle className="w-10 h-10 text-red-400" />}
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1">Class Ended</h2>
                        <p className="text-white/40 text-sm">Your attendance has been recorded.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { label: 'Focus Score', value: `${(focusRatio * 100).toFixed(0)}%`, color: focusRatio >= 0.5 ? 'text-green-400' : 'text-red-400' },
                            { label: 'Duration', value: `${minutes} min`, color: 'text-blue-400' },
                            { label: 'Focused', value: `${focusMinutes} min`, color: 'text-purple-400' },
                            { label: 'Status', value: attendanceStatus, color: attendanceStatus === 'Present' ? 'text-green-400' : 'text-red-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-3">
                                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-white/40 text-xs mt-0.5">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-medium transition-colors"
                    >
                        Back to Dashboard
                    </button>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#060606] text-white p-4 pt-20">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 px-3 py-1.5 rounded-full">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-xs font-bold">LIVE CLASS</span>
                        </div>
                        <span className="text-white/40 text-sm">AI face tracking active</span>
                    </div>
                    <button
                        onClick={handleClassEnded}
                        className="flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/30 px-4 py-2 rounded-xl hover:bg-red-500/20 text-sm font-medium transition-colors"
                    >
                        <PhoneOff className="w-4 h-4" /> Leave Class
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Main video area */}
                    <div className="lg:col-span-2">
                        <div className="bg-black rounded-2xl overflow-hidden border border-white/10 aspect-video relative flex items-center justify-center">
                            <video
                                ref={remoteVideoRef}
                                className="w-full h-full object-contain"
                                playsInline
                                autoPlay
                            />

                            {/* Connecting overlay */}
                            {connecting && !errorMsg && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4">
                                    <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                                    <p className="text-white/60 text-sm">Connecting to live class...</p>
                                    <p className="text-white/30 text-xs">Waiting for faculty to start stream</p>
                                </div>
                            )}

                            {/* Error overlay */}
                            {errorMsg && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 gap-4 p-6 text-center">
                                    <WifiOff className="w-10 h-10 text-red-400" />
                                    <p className="text-red-400 font-medium">{errorMsg}</p>
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm text-white transition-colors"
                                    >
                                        Back to Dashboard
                                    </button>
                                </div>
                            )}

                            {/* Live badge when connected */}
                            {connected && (
                                <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-red-600/90 px-2.5 py-1 rounded-full">
                                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    <span className="text-white text-xs font-bold">LIVE</span>
                                </div>
                            )}
                        </div>

                        {/* Not focused alert */}
                        <AnimatePresence>
                            {isTrackingActive && !isCurrentlyFocused && (
                                <motion.div
                                    initial={{ opacity: 0, y: -8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -8 }}
                                    className="mt-3 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3"
                                >
                                    <XCircle className="w-5 h-5 text-red-400 animate-pulse" />
                                    <div>
                                        <p className="text-red-400 text-sm font-medium">Face not detected</p>
                                        <p className="text-red-400/60 text-xs">Stay in frame to maintain attendance</p>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Sidebar */}
                    <div className="flex flex-col gap-4">
                        {/* Face tracker */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <h3 className="text-xs uppercase tracking-wider text-white/40 font-bold mb-4 flex items-center gap-2">
                                <Eye className="w-3.5 h-3.5" /> Focus Tracker
                            </h3>
                            <EyeTracker onFocusRatioUpdate={handleFocusUpdate} />
                            <div className="mt-4 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-white/50">Focus</span>
                                    <span className={`font-bold ${!isTrackingActive ? 'text-gray-500' : focusRatio >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                                        {isTrackingActive ? `${(focusRatio * 100).toFixed(1)}%` : 'Waiting...'}
                                    </span>
                                </div>
                                <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-white/10 relative">
                                    {!isTrackingActive && <div className="absolute inset-0 bg-gray-500/20 animate-pulse" />}
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${focusRatio >= 0.5 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                                        style={{ width: `${isTrackingActive ? focusRatio * 100 : 0}%` }}
                                    />
                                </div>
                                {isTrackingActive && (
                                    <div className={`text-center text-xs py-1.5 rounded-lg ${focusRatio >= 0.5 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        {focusRatio >= 0.5 ? '✓ On track for Present' : '✗ Risk of Absent'}
                                    </div>
                                )}
                            </div>
                        </div>

                        <ClassTimer classEnded={ended} />
                    </div>
                </div>
            </div>
        </div>
    );
}
