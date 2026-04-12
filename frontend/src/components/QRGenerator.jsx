import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import api from '../utils/api';
import { motion } from 'framer-motion';

const QRGenerator = () => {
    const [subjectId, setSubjectId] = useState('');
    const [session, setSession] = useState(null);
    const [timeLeft, setTimeLeft] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (session) {
            setSession(null);
        }
    }, [timeLeft, session]);

    const generateSession = async () => {
        if (!subjectId) return alert('Please enter a Subject ID');
        setLoading(true);
        try {
            const { data } = await api.post('/attendance/session', { subjectId });
            setSession(data);
            setTimeLeft(60);
        } catch (error) {
            alert(error.response?.data?.message || 'Error generating QR');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white/5 p-6 rounded-xl border border-white/10 text-center">
            <h2 className="text-xl font-bold mb-6 text-white">Generate Attendance QR</h2>

            {!session ? (
                <div className="flex flex-col gap-4">
                    <input
                        type="text"
                        placeholder="Enter Subject ID"
                        value={subjectId}
                        onChange={(e) => setSubjectId(e.target.value)}
                        className="glass-input w-full p-3 rounded-lg outline-none"
                    />
                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={generateSession}
                        disabled={loading}
                        className="glass-button w-full p-3 rounded-lg disabled:opacity-50"
                    >
                        {loading ? 'Generating...' : 'Generate QR Code'}
                    </motion.button>
                </div>
            ) : (
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center"
                >
                    <div className="mb-6 p-4 bg-white rounded-xl shadow-lg shadow-purple-500/20">
                        <QRCode
                            value={JSON.stringify({
                                sessionId: session.sessionId,
                                qrCodeHash: session.qrCodeHash
                            })}
                            size={200}
                        />
                    </div>
                    <p className="text-2xl font-bold text-red-400 font-mono mb-2">
                        {timeLeft}s
                    </p>
                    <p className="text-sm text-gray-400 mb-4">
                        Session ID: <span className="font-mono text-purple-400">{session.sessionId}</span>
                    </p>
                    <button
                        onClick={() => setSession(null)}
                        className="text-purple-400 hover:text-purple-300 underline transition-colors"
                    >
                        Generate New
                    </button>
                </motion.div>
            )}
        </div>
    );
};

export default QRGenerator;
