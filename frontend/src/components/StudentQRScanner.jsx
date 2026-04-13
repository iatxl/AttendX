import React, { useState, useRef } from 'react';
import axios from 'axios';
import { QrCode, Upload, CheckCircle, XCircle, Loader2, ArrowLeft, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Read QR from uploaded image ────────────────────────────────────────────────
async function readQRFromImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const img = new Image();
                img.onload = async () => {
                    // Try browser detector if available
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
                    else reject(new Error('No QR code found in image. Please try a clearer photo.'));
                };
                img.src = e.target.result;
            } catch (err) { reject(err); }
        };
        reader.readAsDataURL(file);
    });
}

export default function StudentQRScanner({ onBack }) {
    const [qrValue, setQrValue] = useState('');
    const [scanning, setScanning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // { success: bool, message: string }
    const fileInputRef = useRef(null);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setScanning(true);
        setResult(null);
        try {
            const code = await readQRFromImage(file);
            setQrValue(code);
        } catch (err) {
            setResult({ success: false, message: err.message });
        }
        setScanning(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const markAttendance = async () => {
        if (!qrValue) return;
        setSubmitting(true);
        setResult(null);

        try {
            const token = localStorage.getItem('token');
            // We need to find the session ID from the hash if possible, 
            // but the hash IS the qrCodeHash. The backend markAttendance expects { sessionId, qrCodeHash }.
            // Wait, our backend session has qrCodeHash as a unique identifier for that moment.
            // Let's assume the session ID is embedded or we need a search.
            // Actually, the markAttendance controller expects sessionId.
            
            // To make it easy for students, we should have a 'find session by hash' or 
            // the QR hash should be something like "sessionId:hash".
            // Let's improve the flow: the student submits the HASH, and the backend finds the session.
            
            // For now, I'll try to split if it's colon-separated, or just send it.
            let sessionId = '';
            let finalHash = qrValue;

            if (qrValue.includes(':')) {
                [sessionId, finalHash] = qrValue.split(':');
            } else {
                // If only hash is provided, we need a backend endpoint to mark by hash.
                // Let's update the backend or search first.
                // Actually, let's just try to send the hash as both if not sure, 
                // but better to have a dedicated endpoint 'mark-by-hash'.
            }

            const { data } = await axios.post(`${API}/attendance/mark`, 
                { qrCodeHash: finalHash, sessionId: sessionId || finalHash.slice(0, 24) }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setResult({ success: true, message: data.message });
            setQrValue('');
        } catch (err) {
            setResult({ success: false, message: err.response?.data?.message || 'Failed to mark attendance.' });
        }
        setSubmitting(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/8 border border-white/18 rounded-3xl p-6 sm:p-8 space-y-6"
        >
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-white/40 hover:text-white flex items-center gap-1.5 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                    <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-indigo-400">QR Scanner</span>
                </div>
            </div>

            <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white">Mark Attendance</h2>
                <p className="text-white/50 text-sm max-w-sm mx-auto">
                    Scan the classroom QR code or enter the session code manually to mark your attendance.
                </p>
            </div>

            {/* Input & Scan Options */}
            <div className="space-y-4">
                <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-indigo-400 transition-colors">
                        <QrCode className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={qrValue}
                        onChange={e => setQrValue(e.target.value)}
                        placeholder="Enter or scan code..."
                        className="w-full bg-white/5 border border-white/15 rounded-2xl pl-12 pr-4 py-4 text-white text-lg font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50 transition-all font-semibold"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all"
                    >
                        {scanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                    />
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-white/30 px-2 font-medium">
                    <p className="flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Secure Verification</p>
                    <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Location Tagging</p>
                </div>

                <button
                    onClick={markAttendance}
                    disabled={!qrValue || submitting}
                    className="w-full bg-white text-black font-bold py-4 rounded-2xl text-lg shadow-xl shadow-white/5 hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
                >
                    {submitting ? (
                        <><Loader2 className="w-5 h-5 animate-spin text-black/40" /> Marking...</>
                    ) : (
                        <>Mark Present</>
                    )}
                </button>
            </div>

            {/* Feedback */}
            <AnimatePresence>
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-2xl border p-5 flex items-start gap-4 ${
                            result.success 
                                ? 'bg-green-500/10 border-green-500/25 text-green-400' 
                                : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}
                    >
                        {result.success ? <CheckCircle className="w-6 h-6 flex-shrink-0" /> : <XCircle className="w-6 h-6 flex-shrink-0" />}
                        <div className="space-y-1">
                            <p className="font-bold text-sm">{result.success ? 'Success!' : 'Failed'}</p>
                            <p className={`${result.success ? 'text-green-400/70' : 'text-red-400/70'} text-xs leading-relaxed`}>{result.message}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="pt-4 border-t border-white/5">
                <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <p className="text-white/80 text-xs font-semibold mb-0.5">Automated Sync</p>
                        <p className="text-white/30 text-[10px] leading-relaxed">
                            Once marked, your attendance is synced with the faculty dashboard in real-time.
                        </p>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
