import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, Clock, CheckCircle, XCircle, ArrowLeft, Loader2, Calendar, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function StudentAttendanceRecords({ onBack }) {
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, present: 0, percentage: 0 });

    useEffect(() => {
        const fetchAttendance = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get(`${API}/attendance/student`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRecords(data);
                
                // Calculate stats
                const total = data.length;
                const present = data.filter(r => r.status === 'Present').length;
                const percentage = total > 0 ? (present / total) * 100 : 0;
                setStats({ total, present, percentage });
            } catch (err) {
                console.error(err);
            }
            setLoading(false);
        };
        fetchAttendance();
    }, []);

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: { staggerChildren: 0.05 }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0 }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            <p className="text-white/40 text-sm font-medium">Fetching attendance history...</p>
        </div>
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <button onClick={onBack} className="text-white/40 hover:text-white flex items-center gap-1.5 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">Back</span>
                </button>
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20">
                    <BarChart3 className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-[10px] uppercase tracking-wider font-bold text-green-400">Attendance Report</span>
                </div>
            </div>

            {/* Global Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatBox label="Attendance" value={`${stats.percentage.toFixed(0)}%`} color="text-indigo-400" />
                <StatBox label="Total Classes" value={stats.total} color="text-white/80" />
                <StatBox label="Present" value={stats.present} color="text-green-400" />
                <StatBox label="Absent" value={stats.total - stats.present} color="text-red-400" />
            </div>

            {/* Records List */}
            <div className="space-y-3">
                <h3 className="text-sm font-bold text-white/40 px-1 uppercase tracking-widest flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> Recent Records
                </h3>
                
                {records.length === 0 ? (
                    <div className="bg-white/5 border border-white/12 rounded-2xl p-10 text-center">
                        <Calendar className="w-8 h-8 text-white/10 mx-auto mb-3" />
                        <p className="text-white/30 text-sm">No attendance records found.</p>
                    </div>
                ) : (
                    <motion.div 
                        variants={container}
                        initial="hidden"
                        animate="show"
                        className="space-y-2.5"
                    >
                        {records.map((record) => (
                            <motion.div
                                key={record._id}
                                variants={item}
                                className="bg-white/5 border border-white/15 rounded-2xl p-4 flex items-center justify-between group hover:border-white/25 transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                                        record.status === 'Present' 
                                            ? 'bg-green-500/10 border-green-500/20 text-green-400' 
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        <BookOpen className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-white font-semibold text-sm">
                                            {record.session?.subject?.name || 'Unknown Class'}
                                        </p>
                                        <div className="flex items-center gap-2 mt-0.5">
                                            <span className="text-[10px] text-white/40 font-medium bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                                {record.session?.subject?.code || 'N/A'}
                                            </span>
                                            <span className="text-[10px] text-white/30 truncate">
                                                {new Date(record.createdAt).toLocaleDateString()} · {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1.5">
                                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                                        record.status === 'Present'
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                                    }`}>
                                        {record.status === 'Present' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {record.status.toUpperCase()}
                                    </div>
                                    <span className="text-[9px] text-white/20 uppercase tracking-tighter mr-1">
                                        Verified via {record.verificationMethod || 'AI'}
                                    </span>
                                </div>
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </div>
        </motion.div>
    );
}

function StatBox({ label, value, color }) {
    return (
        <div className="bg-white/8 border border-white/18 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold mb-0.5 ${color}`}>{value}</p>
            <p className="text-white/40 text-[10px] font-semibold uppercase tracking-widest">{label}</p>
        </div>
    );
}
