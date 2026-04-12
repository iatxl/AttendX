import React, { useRef, useState, useEffect, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { Monitor, Video, StopCircle, Users, Radio, AlertCircle, Link2, Copy, Check, ExternalLink, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ]
};

export default function FacultyLiveStream({ subjects }) {
    const { user } = useContext(AuthContext);
    const token = localStorage.getItem('token');

    const [mode, setMode] = useState('setup'); // setup | live | link-created
    const [selectedSubject, setSelectedSubject] = useState('');
    const [streamType, setStreamType] = useState('screen');
    const [studentCount, setStudentCount] = useState(0);
    const [error, setError] = useState('');

    // Live link creation
    const [creatingLink, setCreatingLink] = useState(false);
    const [generatedLiveLink, setGeneratedLiveLink] = useState(null);
    const [copiedLink, setCopiedLink] = useState(false);

    // session ID for this broadcast
    const [sessionId] = useState(() => `live_${Date.now()}_${Math.random().toString(36).slice(2)}`);
    const [liveJoinLink, setLiveJoinLink] = useState('');

    const localVideoRef = useRef(null);
    const localStreamRef = useRef(null);
    const socketRef = useRef(null);
    const peersRef = useRef({});

    useEffect(() => {
        return () => stopBroadcast(true);
    }, []);

    // ── Create a persistent live link in DB ─────────────────────────────────
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
            // Use the liveRoomId as our session for Socket.io room
            setLiveJoinLink(data.liveLink);
            setMode('link-created');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create live link.');
        }
        setCreatingLink(false);
    };

    const copyLiveLink = () => {
        navigator.clipboard.writeText(generatedLiveLink?.liveLink || '');
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    // ── WebRTC Broadcast ─────────────────────────────────────────────────────
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

            // Use generated liveRoomId if available, else use local sessionId
            const roomId = generatedLiveLink?.liveRoomId || sessionId;
            const subjectName = subjects.find(s => s._id === selectedSubject)?.name || selectedSubject;

            socket.emit('start-broadcast', {
                sessionId: roomId,
                subject: subjectName,
                facultyName: user?.name || 'Faculty'
            });

            // Set join link
            const base = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5173';
            setLiveJoinLink(`${window.location.origin}/live?session=${roomId}`);

            socket.on('student-joined', async ({ studentSocketId, studentName }) => {
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

    const stopBroadcast = (silent = false) => {
        Object.values(peersRef.current).forEach(pc => pc.close());
        peersRef.current = {};
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = null;
        if (socketRef.current) {
            if (!silent) socketRef.current.emit('end-broadcast', { sessionId: generatedLiveLink?.liveRoomId || sessionId });
            socketRef.current.disconnect();
            socketRef.current = null;
        }
        if (!silent) { setMode('setup'); setStudentCount(0); setGeneratedLiveLink(null); }
    };

    return (
        <div className="space-y-4">

            {/* ─── SETUP / LINK CREATED ─── */}
            {(mode === 'setup' || mode === 'link-created') && (
                <div className="space-y-4">
                    {/* Subject + stream type selectors */}
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                        <h4 className="text-white font-semibold flex items-center gap-2">
                            <Radio className="w-4 h-4 text-red-400" /> Start Live Class
                        </h4>

                        <div>
                            <label className="text-xs text-white/50 mb-1 block">Subject</label>
                            <select
                                value={selectedSubject}
                                onChange={e => { setSelectedSubject(e.target.value); setGeneratedLiveLink(null); setMode('setup'); }}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-red-400/50"
                            >
                                <option value="" className="bg-gray-900">-- Select subject --</option>
                                {subjects.map(s => (
                                    <option key={s._id} value={s._id} className="bg-gray-900">{s.name} ({s.code})</option>
                                ))}
                            </select>
                            {subjects.length === 0 && (
                                <p className="text-xs text-yellow-400/70 mt-1">⚠ Create a subject first in the Subjects tab.</p>
                            )}
                        </div>

                        <div>
                            <label className="text-xs text-white/50 mb-2 block">What to stream</label>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { id: 'screen', label: 'Share Screen', icon: Monitor },
                                    { id: 'camera', label: 'Webcam Only', icon: Video },
                                ].map(({ id, label, icon: Icon }) => (
                                    <button key={id} onClick={() => setStreamType(id)}
                                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${streamType === id ? 'bg-red-500/20 border-red-500/40 text-red-300' : 'bg-white/5 border-white/10 text-white/50 hover:text-white/70'}`}
                                    >
                                        <Icon className="w-4 h-4" /> {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {error && <div className="flex items-center gap-2 text-red-400 text-xs"><AlertCircle className="w-3.5 h-3.5" /> {error}</div>}

                        {/* Two action buttons */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            {/* Create shareable link first */}
                            <button
                                onClick={handleCreateLiveLink}
                                disabled={!selectedSubject || creatingLink}
                                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 disabled:opacity-40 border border-white/20 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                            >
                                <Link2 className="w-4 h-4" />
                                {creatingLink ? 'Creating...' : 'Create Live Link First'}
                            </button>
                            {/* Go Live immediately */}
                            <button
                                onClick={startBroadcast}
                                disabled={!selectedSubject}
                                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
                            >
                                <Radio className="w-4 h-4" />
                                Go Live Now
                            </button>
                        </div>
                    </div>

                    {/* Generated live link card */}
                    <AnimatePresence>
                        {mode === 'link-created' && generatedLiveLink && (
                            <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0 }}
                                className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 space-y-4"
                            >
                                <p className="text-red-400 font-semibold text-sm flex items-center gap-2">
                                    <Radio className="w-4 h-4 animate-pulse" />
                                    Live Link Created — {generatedLiveLink.subjectName}
                                </p>

                                <div>
                                    <p className="text-xs text-white/40 mb-1">Share this link with students</p>
                                    <div className="flex items-center gap-2 bg-black/40 rounded-xl px-3 py-2.5">
                                        <code className="text-red-300 text-xs flex-1 break-all">{generatedLiveLink.liveLink}</code>
                                        <button onClick={copyLiveLink} className="text-white/40 hover:text-white flex-shrink-0">
                                            {copiedLink ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </button>
                                        <a href={generatedLiveLink.liveLink} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-indigo-400">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-white/30">
                                    <Clock className="w-3.5 h-3.5" />
                                    Expires: {new Date(generatedLiveLink.expiresAt).toLocaleString()}
                                </div>

                                <div className="bg-white/5 rounded-xl p-3 text-xs text-white/50 space-y-1">
                                    <p>1. Share the link above with your students</p>
                                    <p>2. Click <strong className="text-white">Go Live Now</strong> above to start streaming</p>
                                    <p>3. Students click the link → they see your stream live</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* ─── LIVE BROADCASTING ─── */}
            {mode === 'live' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                    {/* Live status bar */}
                    <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                            <div>
                                <p className="text-red-400 font-bold text-sm">YOU ARE LIVE</p>
                                <p className="text-white/40 text-xs">
                                    {subjects.find(s => s._id === selectedSubject)?.name} · {streamType === 'screen' ? 'Screen share' : 'Webcam'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full">
                                <Users className="w-3.5 h-3.5 text-white/60" />
                                <span className="text-white font-bold text-sm">{studentCount}</span>
                                <span className="text-white/40 text-xs">watching</span>
                            </div>
                            <button
                                onClick={() => stopBroadcast()}
                                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
                            >
                                <StopCircle className="w-3.5 h-3.5" /> End Class
                            </button>
                        </div>
                    </div>

                    {/* Join link for sharing even after going live */}
                    {liveJoinLink && (
                        <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3">
                            <Link2 className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
                            <code className="text-white/50 text-xs flex-1 truncate">{liveJoinLink}</code>
                            <button onClick={() => { navigator.clipboard.writeText(liveJoinLink); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 2000); }}
                                className="text-white/30 hover:text-white flex-shrink-0">
                                {copiedLink ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    )}

                    {/* Stream preview */}
                    <div className="relative rounded-2xl overflow-hidden border border-white/10 bg-black">
                        <video ref={localVideoRef} className="w-full aspect-video object-contain" playsInline muted />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-red-600/90 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="text-white text-xs font-bold">LIVE</span>
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
