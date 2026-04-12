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
        <div className="space-y-5">
            {/* Subject selector */}
            <div className="bg-white/5 border border-white/12 rounded-2xl p-5 space-y-4">
                <h4 className="text-white font-semibold text-sm flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-indigo-400" />
                    QR Attendance
                </h4>

                <div>
                    <label className="text-xs text-white/50 mb-1.5 block">Select Subject</label>
                    <select
                        value={selectedSubject}
                        onChange={e => { setSelectedSubject(e.target.value); setSession(null); setUploadResult(null); }}
                        className="w-full bg-white/8 border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-400/50 transition-all"
                    >
                        <option value="" className="bg-gray-900">— Select subject —</option>
                        {subjects.map(s => (
                            <option key={s._id} value={s._id} className="bg-gray-900">{s.name} ({s.code})</option>
                        ))}
                    </select>
                    {subjects.length === 0 && (
                        <p className="text-xs text-amber-400/70 mt-1.5">Create a subject first in the Subjects tab</p>
                    )}
                </div>

                {error && (
                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5">
                        <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
                    </div>
                )}

                {!session ? (
                    <button
                        onClick={generateQR}
                        disabled={!selectedSubject || generating}
                        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl py-3 text-sm font-semibold transition-all"
                    >
                        {generating
                            ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                            : <><QrCode className="w-4 h-4" /> Generate QR Code</>
                        }
                    </button>
                ) : (
                    <button
                        onClick={regenerate}
                        disabled={generating}
                        className="w-full flex items-center justify-center gap-2 bg-white/8 hover:bg-white/12 border border-white/15 disabled:opacity-40 text-white rounded-xl py-2.5 text-sm font-medium transition-all"
                    >
                        <RefreshCw className="w-4 h-4" /> New QR Code
                    </button>
                )}
            </div>

            {/* QR Display */}
            <AnimatePresence>
                {session && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {/* Timer bar */}
                        <div className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm ${
                            timeLeft > 20 ? 'bg-green-500/10 border-green-500/25 text-green-400'
                            : timeLeft > 0 ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}>
                            <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium">
                                    {timeLeft > 0 ? `QR expires in ${timeLeft}s` : 'QR expired — generate a new one'}
                                </span>
                            </div>
                            <span className="font-mono font-bold text-lg">{timeLeft > 0 ? timeLeft : '—'}</span>
                        </div>

                        {/* QR Code */}
                        <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-4">
                            <QRImage data={session.qrCodeHash} size={240} />
                            <div className="text-center">
                                <p className="text-white font-semibold text-sm">{subjectName}</p>
                                <p className="text-white/40 text-xs mt-0.5 font-mono">{session.qrCodeHash?.slice(0, 16)}...</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Download */}
                            <button
                                onClick={() => downloadQR(session.qrCodeHash, subjectName)}
                                className="flex items-center justify-center gap-2 bg-white text-black font-semibold py-3 rounded-xl text-sm hover:bg-white/90 transition-all"
                            >
                                <Download className="w-4 h-4" /> Download QR
                            </button>

                            {/* Upload to verify */}
                            <button
                                onClick={() => fileRef.current?.click()}
                                disabled={uploading || timeLeft === 0}
                                className="flex items-center justify-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 disabled:opacity-40 py-3 rounded-xl text-sm font-medium transition-all"
                            >
                                {uploading
                                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Reading...</>
                                    : <><Upload className="w-4 h-4" /> Upload & Verify</>
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
                        <div className="bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-xs text-white/45 space-y-1">
                            <p className="text-white/60 font-medium mb-1">How it works</p>
                            <p>1. Download the QR and display it on your screen / projector</p>
                            <p>2. Students scan it with their phone camera</p>
                            <p>3. Upload a photo of a student's scan to mark them present</p>
                        </div>

                        {/* Upload result */}
                        {uploadError && (
                            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
                                <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>{uploadError}</span>
                            </div>
                        )}

                        {uploadResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 space-y-2"
                            >
                                <div className="flex items-center gap-2 text-green-400 font-semibold text-sm">
                                    <CheckCircle className="w-4 h-4" />
                                    Attendance Marked
                                </div>
                                {uploadResult.studentName && (
                                    <p className="text-white/60 text-xs">✓ {uploadResult.studentName} marked <strong className="text-green-400">Present</strong></p>
                                )}
                                {uploadResult.message && (
                                    <p className="text-white/50 text-xs">{uploadResult.message}</p>
                                )}
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
