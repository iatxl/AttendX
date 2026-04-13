import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import FacultyLiveStream from '../components/FacultyLiveStream';
import QRAttendance from '../components/QRAttendance';
import {
    Users, BookOpen, Plus, Link2, ChevronDown, ChevronUp,
    CheckCircle, XCircle, BarChart2, Clock, Copy, Check, X,
    UserPlus, Radio, GraduationCap, TrendingUp, AlertCircle,
    ExternalLink, Trash2, RefreshCw, QrCode, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'white', small = false }) {
    return (
        <div className="bg-white/10 border border-white/20 rounded-2xl p-4 text-center backdrop-blur-sm shadow-lg shadow-black/10">
            <p className={`font-bold mb-0.5 ${small ? 'text-xl' : 'text-3xl'} ${
                color === 'green' ? 'text-green-400' :
                color === 'red' ? 'text-red-400' :
                color === 'blue' ? 'text-blue-400' :
                color === 'amber' ? 'text-amber-400' : 'text-white'
            }`}>{value}</p>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        </div>
    );
}

const FacultyDashboard = () => {
    const { user } = useContext(AuthContext);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentReport, setStudentReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [loadingStudents, setLoadingStudents] = useState(true);
    const [activeTab, setActiveTab] = useState('live');

    const [newSubject, setNewSubject] = useState({ name: '', code: '', semester: 1 });
    const [creatingSubject, setCreatingSubject] = useState(false);
    const [subjectError, setSubjectError] = useState('');

    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [classDuration, setClassDuration] = useState(60);
    const [generatedLink, setGeneratedLink] = useState(null);
    const [copied, setCopied] = useState(false);
    const [creatingClass, setCreatingClass] = useState(false);

    const [inviteInfo, setInviteInfo] = useState(null);
    const [inviteCopied, setInviteCopied] = useState(false);

    const tabs = [
        { id: 'live', label: 'Go Live', icon: Radio },
        { id: 'qr', label: 'QR Attendance', icon: QrCode },
        { id: 'students', label: 'Students', icon: Users },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'invite', label: 'Invite', icon: UserPlus },
    ];

    useEffect(() => {
        fetchSubjects();
        fetchStudents();
        axios.get(`${API}/faculty/my-invite`, { headers })
            .then(({ data }) => setInviteInfo(data))
            .catch(() => {});
    }, []);

    const fetchSubjects = async () => {
        try {
            const { data } = await axios.get(`${API}/faculty/subjects`, { headers });
            setSubjects(data);
        } catch (e) { console.error(e); }
    };

    const fetchStudents = async () => {
        setLoadingStudents(true);
        try {
            const { data } = await axios.get(`${API}/faculty/students`, { headers });
            setStudents(data);
        } catch (e) { console.error(e); }
        setLoadingStudents(false);
    };

    const fetchStudentReport = async (studentId) => {
        if (selectedStudent?._id === studentId) {
            setSelectedStudent(null); setStudentReport(null); return;
        }
        setLoadingReport(true);
        try {
            const student = students.find(s => s._id === studentId);
            setSelectedStudent(student);
            const { data } = await axios.get(`${API}/faculty/students/${studentId}/report`, { headers });
            setStudentReport(data);
        } catch (e) { console.error(e); }
        setLoadingReport(false);
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        setSubjectError('');
        setCreatingSubject(true);
        try {
            await axios.post(`${API}/faculty/subjects`, newSubject, { headers });
            setNewSubject({ name: '', code: '', semester: 1 });
            fetchSubjects();
        } catch (e) {
            setSubjectError(e.response?.data?.message || 'Failed to create subject');
        }
        setCreatingSubject(false);
    };

    const handleCreateClass = async () => {
        if (!selectedSubjectId) return;
        setCreatingClass(true);
        try {
            const { data } = await axios.post(`${API}/faculty/class/create`, {
                subjectId: selectedSubjectId, durationMinutes: classDuration
            }, { headers });
            setGeneratedLink(data);
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to create class');
        }
        setCreatingClass(false);
    };

    const copyText = (text, setter) => {
        navigator.clipboard.writeText(text);
        setter(true);
        setTimeout(() => setter(false), 2000);
    };

    const slideIn = {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 }
    };

    return (
        <div className="space-y-5">
            {/* ── Tab bar ──────────────────────────────────────────────── */}
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
                <div className="flex gap-1.5 p-1.5 bg-white/8 rounded-2xl border border-white/20 w-fit backdrop-blur-md">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                                activeTab === id
                                    ? 'bg-white text-black shadow-lg shadow-white/5'
                                    : 'text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                        >
                            <Icon className="w-4 h-4" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── GO LIVE ──────────────────────────────────────────────── */}
            <AnimatePresence mode="wait">
                {activeTab === 'live' && (
                    <motion.div key="live" {...slideIn}>
                        <FacultyLiveStream subjects={subjects} />
                    </motion.div>
                )}

                {/* ── QR ATTENDANCE ─────────────────────────────────────── */}
                {activeTab === 'qr' && (
                    <motion.div key="qr" {...slideIn}>
                        <QRAttendance subjects={subjects} token={token} />
                    </motion.div>
                )}

                {/* ── STUDENTS ─────────────────────────────────────────── */}
                {activeTab === 'students' && (
                    <motion.div key="students" {...slideIn} className="space-y-5">
                        <div className="flex items-center justify-between px-1">
                            <div>
                                <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                                    <Users className="w-5 h-5 text-indigo-400" />
                                    Department Students
                                    <span className="text-[10px] text-white/50 font-bold bg-white/10 px-2.5 py-1 rounded-full border border-white/15 ml-1 uppercase tracking-tighter">
                                        {students.length} Total
                                    </span>
                                </h3>
                                <p className="text-xs text-white/40 mt-1 font-medium">Detailed roster and individual reports</p>
                            </div>
                            <button onClick={fetchStudents}
                                className="p-2.5 rounded-xl bg-white/8 border border-white/15 text-white/40 hover:text-white hover:border-white/20 transition-all">
                                <RefreshCw className="w-4.5 h-4.5" />
                            </button>
                        </div>

                        {loadingStudents ? (
                            <div className="py-20 text-center text-white/40 text-sm font-medium">
                                <div className="w-8 h-8 border-2 border-white/20 border-t-indigo-400 rounded-full animate-spin mx-auto mb-4" />
                                Synchronizing student records...
                            </div>
                        ) : students.length === 0 ? (
                            <div className="py-20 text-center border border-white/15 rounded-3xl bg-white/5 backdrop-blur-sm">
                                <GraduationCap className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                <p className="text-white/60 text-lg font-bold">No students found</p>
                                <p className="text-white/30 text-sm mt-1 max-w-xs mx-auto">Share your invite link to start enrolling students.</p>
                                <button onClick={() => setActiveTab('invite')}
                                    className="mt-6 px-6 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-white/90 transition-all shadow-xl shadow-white/5">
                                    Get Invite Link
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {students.map(student => (
                                    <div key={student._id} className="border border-white/15 rounded-2xl overflow-hidden bg-white/5 hover:bg-white/8 hover:border-white/25 transition-all group">
                                        <button onClick={() => fetchStudentReport(student._id)}
                                            className="w-full flex items-center justify-between p-5 text-left">
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 border border-white/20 flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-lg group-hover:scale-105 transition-transform">
                                                    {student.user?.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                                        <p className="font-bold text-white text-base group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{student.user?.name || 'Unknown'}</p>
                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-widest ${
                                                            student.enrolledVia === 'invite'
                                                                ? 'bg-green-500/15 text-green-400 border-green-500/30'
                                                                : student.enrolledVia === 'attendance'
                                                                    ? 'bg-blue-500/15 text-blue-400 border-blue-500/30'
                                                                    : 'bg-white/10 text-white/50 border-white/20'
                                                        }`}>
                                                            {student.enrolledVia === 'invite' ? 'Enrolled' : student.enrolledVia === 'attendance' ? 'Attended' : 'Registered'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-white/40 font-medium truncate mt-0.5">{student.user?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                                                <span className="text-[10px] text-white/30 font-bold uppercase tracking-widest hidden sm:block">View Data</span>
                                                <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 group-hover:text-white transition-colors">
                                                    {selectedStudent?._id === student._id
                                                        ? <ChevronUp className="w-4 h-4" />
                                                        : <ChevronDown className="w-4 h-4" />
                                                    }
                                                </div>
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {selectedStudent?._id === student._id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                    className="border-t border-white/10 overflow-hidden"
                                                >
                                                    <div className="p-6 bg-black/40 backdrop-blur-xl">
                                                        {loadingReport ? (
                                                            <div className="py-10 text-center text-white/50 text-sm font-bold animate-pulse">Analyzing student analytics...</div>
                                                        ) : studentReport ? (
                                                            <div className="space-y-6">
                                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                                    <StatCard label="Total Classes" value={studentReport.total} small />
                                                                    <StatCard label="Present" value={studentReport.present} color="green" small />
                                                                    <StatCard label="Absent" value={studentReport.absent} color="red" small />
                                                                    <StatCard label="Attendance" value={`${studentReport.attendancePercent}%`} color={studentReport.attendancePercent >= 75 ? 'green' : studentReport.attendancePercent >= 50 ? 'amber' : 'red'} small />
                                                                </div>
                                                                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                                                    <div className="flex justify-between text-xs mb-2 px-1">
                                                                        <span className="text-white/60 font-bold uppercase tracking-wider">Attendance Integrity</span>
                                                                        <span className={`font-black tracking-tighter text-sm ${studentReport.attendancePercent >= 75 ? 'text-green-400' : studentReport.attendancePercent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                            {studentReport.attendancePercent}% SCORE
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full bg-black/40 rounded-full h-3 border border-white/10 overflow-hidden p-0.5">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${studentReport.attendancePercent}%` }}
                                                                            transition={{ duration: 0.8, ease: 'circOut' }}
                                                                            className={`h-full rounded-full shadow-[0_0_12px_rgba(255,255,255,0.1)] ${
                                                                                studentReport.attendancePercent >= 75 ? 'bg-gradient-to-r from-green-600 to-green-400' : 
                                                                                studentReport.attendancePercent >= 50 ? 'bg-gradient-to-r from-amber-600 to-amber-400' : 
                                                                                'bg-gradient-to-r from-red-600 to-red-400'
                                                                            }`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {studentReport.records?.length > 0 && (
                                                                    <div className="space-y-3">
                                                                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] px-1">Session History</p>
                                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                                                                            {studentReport.records.map((r, i) => (
                                                                                <div key={i} className="flex items-center justify-between py-3 px-4 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-colors group/record">
                                                                                    <div className="min-w-0">
                                                                                        <p className="text-white font-bold text-xs truncate">{r.session?.subject?.name || 'Session Entry'}</p>
                                                                                        <p className="text-[9px] text-white/30 font-medium mt-0.5">{new Date(r.createdAt).toLocaleDateString()}</p>
                                                                                    </div>
                                                                                    <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-lg border ${
                                                                                        r.status === 'Present' ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-red-500/15 text-red-400 border-red-500/20'
                                                                                    }`}>{r.status}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <div className="py-10 text-center">
                                                                <AlertCircle className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                                                <p className="text-white/40 text-sm font-medium italic">No attendance records documented for this student.</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── SUBJECTS ─────────────────────────────────────────── */}
                {activeTab === 'subjects' && (
                    <motion.div key="subjects" {...slideIn} className="space-y-6">
                        {/* Create Subject Form */}
                        <div className="bg-white/10 border border-white/20 rounded-3xl p-6 shadow-2xl shadow-black/20 backdrop-blur-md">
                            <h3 className="font-bold text-white text-lg mb-5 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-400" /> Catalog New Subject
                            </h3>
                            <form onSubmit={handleCreateSubject} className="space-y-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-white/60 font-bold uppercase tracking-wider ml-1">Subject Name</label>
                                        <input value={newSubject.name}
                                            onChange={e => setNewSubject(s => ({ ...s, name: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/20 rounded-2xl px-5 py-3.5 text-white text-sm placeholder-white/20 focus:border-indigo-500/50 transition-all font-medium"
                                            placeholder="e.g. Distributed Systems" required />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs text-white/60 font-bold uppercase tracking-wider ml-1">Callsign / Code</label>
                                        <input value={newSubject.code}
                                            onChange={e => setNewSubject(s => ({ ...s, code: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/20 rounded-2xl px-5 py-3.5 text-white text-sm placeholder-white/20 focus:border-indigo-500/50 transition-all font-mono font-bold"
                                            placeholder="e.g. CS-402" required />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs text-white/60 font-bold uppercase tracking-wider ml-1">Academic Semester</label>
                                    <select value={newSubject.semester}
                                        onChange={e => setNewSubject(s => ({ ...s, semester: Number(e.target.value) }))}
                                        className="w-full bg-white/5 border border-white/20 rounded-2xl px-5 py-3.5 text-white text-sm font-bold focus:border-indigo-500/50 transition-all appearance-none cursor-pointer">
                                        {[1,2,3,4,5,6,7,8].map(n => (
                                            <option key={n} value={n} className="bg-gray-950">Semester {n}</option>
                                        ))}
                                    </select>
                                </div>
                                {subjectError && (
                                    <div className="flex items-center gap-3 text-red-400 text-xs font-bold bg-red-500/15 border border-red-500/25 rounded-2xl px-4 py-3">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0" /> {subjectError}
                                    </div>
                                )}
                                <button type="submit" disabled={creatingSubject}
                                    className="w-full bg-white text-black font-black py-4 rounded-2xl text-base disabled:opacity-50 hover:bg-white/90 transition-all flex items-center justify-center gap-3 shadow-xl shadow-white/5">
                                    {creatingSubject
                                        ? <><Loader2 className="w-5 h-5 animate-spin" /> Recording...</>
                                        : <><Plus className="w-5 h-5" /> Initialize Subject</>
                                    }
                                </button>
                            </form>
                        </div>

                        {/* Subjects list */}
                        {subjects.length === 0 ? (
                            <div className="py-20 text-center border border-white/12 rounded-3xl bg-white/5">
                                <BookOpen className="w-12 h-12 text-white/10 mx-auto mb-4" />
                                <p className="text-white/40 text-base font-bold">No active subjects registered</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {subjects.map(sub => (
                                    <div key={sub._id} className="p-5 bg-white/10 border border-white/20 rounded-2xl backdrop-blur-md hover:border-indigo-500/40 transition-all flex flex-col justify-between group">
                                        <div className="mb-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/15 px-2 py-0.5 rounded border border-indigo-500/25">SEM {sub.semester}</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-white/40">{sub.code}</span>
                                            </div>
                                            <p className="font-bold text-white text-base leading-tight group-hover:text-indigo-200 transition-colors uppercase tracking-tighter">{sub.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2 pt-4 border-t border-white/15">
                                            <div className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center">
                                                <GraduationCap className="w-3.5 h-3.5 text-white/50" />
                                            </div>
                                            <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest">{sub.department} Dept</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ── CLASS LINK ───────────────────────────────────────── */}
                {activeTab === 'create-class' && (
                    <motion.div key="create-class" {...slideIn} className="space-y-5">
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-4">
                            <h3 className="font-medium text-white text-sm flex items-center gap-2">
                                <Link2 className="w-4 h-4 text-white/40" /> Create Class Link
                            </h3>
                            <p className="text-white/30 text-xs leading-relaxed">
                                Generate a link students can use to join an online class with AI focus tracking.
                            </p>
                            <div>
                                <label className="text-xs text-white/35 mb-1 block">Select Subject</label>
                                <select value={selectedSubjectId}
                                    onChange={e => setSelectedSubjectId(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-white/25 transition-all">
                                    <option value="" className="bg-gray-950">-- Select subject --</option>
                                    {subjects.map(s => (
                                        <option key={s._id} value={s._id} className="bg-gray-950">{s.name} ({s.code})</option>
                                    ))}
                                </select>
                                {subjects.length === 0 && (
                                    <p className="text-amber-400/70 text-xs mt-1.5 flex items-center gap-1.5">
                                        <AlertCircle className="w-3.5 h-3.5" /> Create a subject first in the Subjects tab
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="text-xs text-white/35 mb-1 block">Duration</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[30, 60, 90, 120].map(d => (
                                        <button key={d} onClick={() => setClassDuration(d)}
                                            className={`px-4 py-2 rounded-xl text-sm border transition-all ${
                                                classDuration === d
                                                    ? 'bg-white/10 border-white/25 text-white'
                                                    : 'bg-white/3 border-white/8 text-white/40 hover:text-white/60'
                                            }`}>
                                            {d} min
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={handleCreateClass}
                                disabled={!selectedSubjectId || creatingClass}
                                className="w-full bg-white text-black font-semibold py-2.5 rounded-xl text-sm disabled:opacity-40 hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                                {creatingClass
                                    ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Creating...</>
                                    : <><Link2 className="w-4 h-4" /> Generate Class Link</>
                                }
                            </button>
                        </div>

                        <AnimatePresence>
                            {generatedLink && (
                                <motion.div
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-white/3 border border-white/10 rounded-2xl p-5 space-y-4"
                                >
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                        <p className="text-green-400 text-sm font-medium">Class link created!</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/35 mb-1.5">Share with students</p>
                                        <div className="flex items-center gap-2 bg-black/30 border border-white/8 rounded-xl px-4 py-3">
                                            <code className="text-white/60 text-xs flex-1 break-all">{generatedLink.classLink}</code>
                                            <button onClick={() => copyText(generatedLink.classLink, setCopied)}
                                                className="text-white/30 hover:text-white flex-shrink-0 transition-colors">
                                                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                            <a href={generatedLink.classLink} target="_blank" rel="noopener noreferrer"
                                                className="text-white/30 hover:text-white flex-shrink-0 transition-colors">
                                                <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-white/25">
                                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {generatedLink.durationMinutes} min</span>
                                        <span>Expires: {new Date(generatedLink.expiresAt).toLocaleTimeString()}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* ── INVITE ───────────────────────────────────────────── */}
                {activeTab === 'invite' && (
                    <motion.div key="invite" {...slideIn} className="max-w-xl mx-auto py-4">
                        <div className="bg-white/15 border border-white/25 rounded-[2.5rem] p-10 space-y-10 backdrop-blur-2xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 blur-3xl -mr-20 -mt-20 rounded-full" />
                            
                            <div className="text-center space-y-3">
                                <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto mb-6 shadow-xl">
                                    <UserPlus className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h3 className="font-black text-white text-3xl uppercase tracking-tighter">Onboard Students</h3>
                                <p className="text-white/70 text-base font-medium px-4">Provide these credentials to your students for immediate enrollment.</p>
                            </div>

                            {inviteInfo ? (
                                <div className="space-y-8">
                                    <div className="bg-black/60 border border-white/20 rounded-3xl p-8 text-center group active:scale-[0.98] transition-all cursor-pointer relative shadow-inner"
                                         onClick={() => copyText(inviteInfo.inviteCode, () => {})}>
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.3em] mb-4 opacity-80">Unique Access Token</p>
                                        <code className="text-5xl font-black text-white tracking-[0.25em] pl-[0.25em] group-hover:text-indigo-400 transition-colors drop-shadow-md">{inviteInfo.inviteCode}</code>
                                        <div className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Copy className="w-4 h-4 text-white/60" />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <p className="text-[10px] text-white/50 font-black uppercase tracking-widest ml-1">Direct Gateway URL</p>
                                        <div className="flex items-center gap-3 bg-black/60 border border-white/20 rounded-2xl px-6 py-5 focus-within:border-indigo-500/50 transition-all group shadow-inner">
                                            <code className="text-white/80 text-xs flex-1 break-all font-mono font-bold">{inviteInfo.inviteLink}</code>
                                            <button onClick={() => copyText(inviteInfo.inviteLink, setInviteCopied)}
                                                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/25 text-white/60 group-hover:text-white transition-all border border-white/15">
                                                {inviteCopied ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-indigo-500/15 to-purple-600/15 border border-white/20 rounded-3xl p-8 space-y-4 shadow-2xl">
                                        <p className="text-indigo-300 font-black text-sm flex items-center gap-3 uppercase tracking-wider">
                                            <TrendingUp className="w-5 h-5" /> Efficiency Report
                                        </p>
                                        <div className="space-y-3">
                                            <p className="text-white/70 text-sm font-bold leading-relaxed">Students scanning this token bypass all discovery protocols and link directly to your mainframe.</p>
                                            <div className="flex items-center gap-5 pt-4">
                                                <div className="flex -space-x-3">
                                                    {[1,2,3,4].map(n => <div key={n} className="w-8 h-8 rounded-full border-2 border-gray-950 bg-white/20 backdrop-blur-sm" />)}
                                                </div>
                                                <p className="text-white font-black text-xs uppercase tracking-[0.15em]">+ {students.length} VERIFIED STUDENTS</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="py-24 text-center space-y-4">
                                    <div className="w-10 h-10 border-4 border-indigo-400/20 border-t-indigo-400 rounded-full animate-spin mx-auto" />
                                    <p className="text-white/60 text-base font-black uppercase tracking-widest animate-pulse">Decrypting access keys...</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacultyDashboard;
