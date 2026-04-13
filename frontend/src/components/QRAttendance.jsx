import React, { useState, useRef, useCallback } from 'react';
import axios from 'axios';
import { QrCode, Download, Upload, CheckCircle, XCircle, Loader2, RefreshCw, Clock, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── QR code display via Google Charts API (no extra deps) ─────────────────────
function QRImage({ data, size = 280 }) {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}&bgcolor=0d0d0d&color=ffffff&margin=2`;
    return (
        <img
            src={url}
            alt="QR Code"
            className="rounded-2xl"
            style={{ width: size, height: size }}
        />
    );
}

// ── Download QR as PNG ─────────────────────────────────────────────────────────
async function downloadQR(qrHash, subjectName) {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(qrHash)}&bgcolor=0d0d0d&color=ffffff&margin=4`;
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `AttendX_QR_${subjectName || 'class'}_${new Date().toLocaleDateString('en-IN').replace(/\//g, '-')}.png`;
        link.click();
        URL.revokeObjectURL(link.href);
    } catch {
        // fallback: open in new tab
        window.open(url, '_blank');
    }
}

// ── Read QR from uploaded image ────────────────────────────────────────────────
async function readQRFromImage(file) {
    // Use ZXing WASM via a free public API
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                // Use the canvas method to decode QR
                const img = new Image();
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

                    // Try jsQR-style detection via BarcodeDetector if available
                    if ('BarcodeDetector' in window) {
                        try {
                            const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
                            const codes = await detector.detect(img);
                            if (codes.length > 0) { resolve(codes[0].rawValue); return; }
                        } catch {}
                    }

                    // Fallback: use qrserver.com decode API
                    const formData = new FormData();
                    formData.append('file', file);
                    const res = await fetch('https://api.qrserver.com/v1/read-qr-code/', {
                        method: 'POST',
                        body: formData
                    });
                    const json = await res.json();
                    const text = json?.[0]?.symbol?.[0]?.data;
                    if (text) resolve(text);
                    else reject(new Error('No QR code found in image'));
                };
                img.src = e.target.result;
            } catch (err) { reject(err); }
        };
        reader.readAsDataURL(file);
    });
}

// ── Main QR Attendance Component ───────────────────────────────────────────────
export default function QRAttendance({ subjects, token }) {
    const [selectedSubject, setSelectedSubject] = useState('');
    const [session, setSession] = useState(null);        // { sessionId, qrCodeHash, expiresAt }
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState('');

    // Upload scan state
    const [uploadResult, setUploadResult] = useState(null); // { markedCount, students }
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const fileRef = useRef(null);

    // Timer
    const [timeLeft, setTimeLeft] = useState(null);
    const timerRef = useRef(null);

    const startTimer = useCallback((expiresAt) => {
        clearInterval(timerRef.current);
        const tick = () => {
            const secs = Math.round((new Date(expiresAt) - Date.now()) / 1000);
            if (secs <= 0) { setTimeLeft(0); clearInterval(timerRef.current); } 
            else setTimeLeft(secs);
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, []);

    const generateQR = async () => {
        if (!selectedSubject) { setError('Please select a subject first.'); return; }
        setError('');
        setGenerating(true);
        setSession(null);
        setUploadResult(null);
        try {
            const { data } = await axios.post(`${API}/attendance/session`,
                { subjectId: selectedSubject },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSession(data);
            startTimer(data.expiresAt);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to generate QR.');
        }
        setGenerating(false);
    };

    const regenerate = () => {
        setSession(null);
        setUploadResult(null);
        setUploadError('');
        generateQR();
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setUploadError('');
        setUploadResult(null);
        try {
            // Read QR from image
            const qrData = await readQRFromImage(file);
            // qrData should be the qrCodeHash
            const hash = qrData.trim();

            // Mark attendance via backend — we'll mark the session as "faculty verified"
            const { data } = await axios.post(`${API}/attendance/verify-qr`,
                { qrCodeHash: hash, sessionId: session?.sessionId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setUploadResult(data);
        } catch (err) {
            setUploadError(err.message || err.response?.data?.message || 'Could not read QR from image');
        }
        setUploading(false);
        // Reset file input
        if (fileRef.current) fileRef.current.value = '';
    };

    const subjectName = subjects.find(s => s._id === selectedSubject)?.name || '';

    return (
        <div className="space-y-6">
            {/* Subject selector */}
            <div className="bg-white/10 border border-white/20 rounded-3xl p-6 space-y-5 backdrop-blur-sm shadow-xl shadow-black/10">
                <h4 className="text-white font-bold text-base flex items-center gap-2">
                    <QrCode className="w-5 h-5 text-indigo-400" />
                    Authentication Protocol: QR
                </h4>

                <div className="space-y-1.5">
                    <label className="text-[10px] text-white/50 font-black uppercase tracking-[0.2em] ml-1">Assigned Subject</label>
                    <div className="relative">
                        <select
                            value={selectedSubject}
                            onChange={e => { setSelectedSubject(e.target.value); setSession(null); setUploadResult(null); }}
                            className="w-full bg-white/5 border border-white/15 rounded-2xl px-5 py-3.5 text-white text-sm font-bold focus:outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer"
                        >
                            <option value="" className="bg-gray-950">— Select subject or module —</option>
                            {subjects.map(s => (
                                <option key={s._id} value={s._id} className="bg-gray-950">{s.name} [{s.code}]</option>
                            ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                            <Clock className="w-4 h-4" />
                        </div>
                    </div>
                    {subjects.length === 0 && (
                        <p className="text-[10px] text-amber-400 font-bold mt-2 flex items-center gap-1.5 px-1 uppercase tracking-tighter">
                            <RefreshCw className="w-3 h-3" /> No subjects initialized in your catalog
                        </p>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-3 text-red-400 text-xs font-bold bg-red-500/15 border border-red-500/25 rounded-2xl px-4 py-3">
                        <XCircle className="w-4 h-4 flex-shrink-0" /> {error}
                    </div>
                )}

                {!session ? (
                    <button
                        onClick={generateQR}
                        disabled={!selectedSubject || generating}
                        className="w-full flex items-center justify-center gap-3 bg-white text-black hover:bg-white/90 disabled:opacity-40 rounded-2xl py-4 text-sm font-black transition-all shadow-xl shadow-white/5 uppercase tracking-wider"
                    >
                        {generating
                            ? <><Loader2 className="w-5 h-5 animate-spin" /> Synchronizing...</>
                            : <><QrCode className="w-5 h-5" /> Initialize QR Gateway</>
                        }
                    </button>
                ) : (
                    <button
                        onClick={regenerate}
                        disabled={generating}
                        className="w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 border border-white/20 disabled:opacity-40 text-white rounded-2xl py-3.5 text-sm font-bold transition-all shadow-inner"
                    >
                        <RefreshCw className="w-4 h-4" /> Cycle Security Hash
                    </button>
                )}
            </div>

            {/* QR Display */}
            <AnimatePresence>
                {session && (
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Timer bar */}
                        <div className={`flex items-center justify-between px-5 py-4 rounded-2xl border backdrop-blur-md shadow-2xl ${
                            timeLeft > 20 ? 'bg-green-500/15 border-green-500/30 text-green-400'
                            : timeLeft > 0 ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            : 'bg-red-500/15 border-red-500/30 text-red-400'
                        }`}>
                            <div className="flex items-center gap-3">
                                <span className={`w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor] ${timeLeft > 0 ? '' : 'hidden'}`} />
                                <span className="font-black text-xs uppercase tracking-[0.15em]">
                                    {timeLeft > 0 ? `Token Life: ${timeLeft}s` : 'Token Expired — Security Reset Required'}
                                </span>
                            </div>
                            <span className="font-mono font-black text-xl tabular-nums">{timeLeft > 0 ? timeLeft : '00'}</span>
                        </div>

                        {/* QR Code Container */}
                        <div className="bg-[#0b0b0b] border-2 border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center gap-6 shadow-2xl relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                            <div className="bg-white p-4 rounded-3xl shadow-[0_0_40px_rgba(255,255,255,0.05)]">
                                <QRImage data={session.qrCodeHash} size={260} />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-white font-black text-lg uppercase tracking-tight">{subjectName}</p>
                                <p className="text-white/30 text-[10px] font-mono font-medium tracking-widest">{session.qrCodeHash?.slice(0, 24)}...</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* Download */}
                            <button
                                onClick={() => downloadQR(session.qrCodeHash, subjectName)}
                                className="flex items-center justify-center gap-2 bg-white text-black font-black py-4 rounded-2xl text-sm hover:bg-white/90 transition-all shadow-xl shadow-white/5 uppercase tracking-wide"
                            >
                                <Download className="w-5 h-5" /> Export Token
                            </button>

                            {/* Upload to verify */}
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading || timeLeft === 0}
                                className="flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/40 text-indigo-300 disabled:opacity-40 py-4 rounded-2xl text-sm font-bold transition-all shadow-inner uppercase tracking-wide"
                            >
                                {uploading
                                    ? <><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</>
                                    : <><Upload className="w-5 h-5" /> Capture & Validate</>
                                }
                            </button>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                            />
                        </div>

                        {/* Upload instructions */}
                        <div className="bg-white/8 border border-white/15 rounded-2xl px-5 py-4 text-[10px] text-white/50 space-y-2 uppercase tracking-tight font-bold backdrop-blur-sm">
                            <p className="text-indigo-400 font-black mb-1 tracking-widest text-[11px]">Protocol Instructions</p>
                            <div className="flex gap-4">
                                <p className="flex-1 opacity-80"><span className="text-white mr-1">01.</span> Display the token on a main display device</p>
                                <p className="flex-1 opacity-80"><span className="text-white mr-1">02.</span> Students must initiate scan via their secure portal</p>
                                <p className="flex-1 opacity-80"><span className="text-white mr-1">03.</span> Manual override: upload student image for verification</p>
                            </div>
                        </div>

                        {/* Upload result */}
                        {uploadError && (
                            <div className="flex items-start gap-3 bg-red-500/15 border border-red-500/25 text-red-400 px-5 py-4 rounded-2xl text-sm font-bold shadow-lg">
                                <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                                <span>{uploadError}</span>
                            </div>
                        )}

                        {uploadResult && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-green-500/15 border border-green-500/30 rounded-2xl p-5 space-y-3 shadow-xl shadow-green-900/10"
                            >
                                <div className="flex items-center gap-3 text-green-400 font-black text-sm uppercase tracking-wider">
                                    <CheckCircle className="w-5 h-5" />
                                    Validation Confirmed
                                </div>
                                {uploadResult.studentName && (
                                    <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 border border-white/10">
                                        <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-xs">
                                            {uploadResult.studentName?.[0]}
                                        </div>
                                        <p className="text-white font-bold text-xs capitalize">{uploadResult.studentName} <span className="text-white/40 ml-1 font-medium">— RECORDED PRESENT</span></p>
                                    </div>
                                )}
                                {uploadResult.message && (
                                    <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest px-1">{uploadResult.message}</p>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
