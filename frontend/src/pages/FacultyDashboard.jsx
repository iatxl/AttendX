import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import FacultyLiveStream from '../components/FacultyLiveStream';
import {
    Users, BookOpen, Plus, Link2, ChevronDown, ChevronUp,
    CheckCircle, XCircle, BarChart2, Clock, Copy, Check, X,
    UserPlus, Radio, GraduationCap, TrendingUp, AlertCircle,
    ExternalLink, Trash2, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, color = 'white', small = false }) {
    return (
        <div className="bg-white/4 border border-white/8 rounded-2xl p-4 text-center">
            <p className={`font-bold mb-0.5 ${small ? 'text-xl' : 'text-3xl'} ${
                color === 'green' ? 'text-green-400' :
                color === 'red' ? 'text-red-400' :
                color === 'blue' ? 'text-blue-400' :
                color === 'amber' ? 'text-amber-400' : 'text-white'
            }`}>{value}</p>
            <p className="text-white/35 text-xs">{label}</p>
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
        { id: 'students', label: 'Students', icon: Users },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'create-class', label: 'Class Link', icon: Link2 },
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
            <div className="overflow-x-auto pb-1 -mx-1 px-1">
                <div className="flex gap-1 p-1 bg-white/4 rounded-2xl border border-white/8 w-fit">
                    {tabs.map(({ id, label, icon: Icon }) => (
                        <button key={id} onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                                activeTab === id
                                    ? 'bg-white text-black shadow-sm'
                                    : 'text-white/40 hover:text-white/70 hover:bg-white/6'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
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

                {/* ── STUDENTS ─────────────────────────────────────────── */}
                {activeTab === 'students' && (
                    <motion.div key="students" {...slideIn} className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-white flex items-center gap-2">
                                    <Users className="w-4 h-4 text-white/40" />
                                    All Students
                                    <span className="text-xs text-white/30 font-normal bg-white/6 px-2 py-0.5 rounded-full">{students.length}</span>
                                </h3>
                                <p className="text-xs text-white/25 mt-0.5">Click a student to see their attendance report</p>
                            </div>
                            <button onClick={fetchStudents}
                                className="p-2 rounded-xl text-white/30 hover:text-white hover:bg-white/6 transition-all">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {loadingStudents ? (
                            <div className="py-16 text-center text-white/25 text-sm">
                                <div className="w-6 h-6 border border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-3" />
                                Loading students...
                            </div>
                        ) : students.length === 0 ? (
                            <div className="py-16 text-center border border-white/6 rounded-2xl bg-white/2">
                                <GraduationCap className="w-10 h-10 text-white/10 mx-auto mb-3" />
                                <p className="text-white/35 text-sm font-medium">No students yet</p>
                                <p className="text-white/20 text-xs mt-1">Share your invite link — students can also find you during registration</p>
                                <button onClick={() => setActiveTab('invite')}
                                    className="mt-4 px-4 py-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/50 hover:text-white text-xs transition-all">
                                    Go to Invite tab →
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {students.map(student => (
                                    <div key={student._id} className="border border-white/8 rounded-2xl overflow-hidden bg-white/2 hover:bg-white/4 transition-colors">
                                        <button onClick={() => fetchStudentReport(student._id)}
                                            className="w-full flex items-center justify-between p-4 text-left">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/40 to-purple-600/40 border border-white/10 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                                                    {student.user?.name?.[0]?.toUpperCase() || '?'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-medium text-white text-sm">{student.user?.name || 'Unknown'}</p>
                                                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${
                                                            student.enrolledVia === 'invite'
                                                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                                : student.enrolledVia === 'attendance'
                                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                    : 'bg-white/5 text-white/30 border-white/10'
                                                        }`}>
                                                            {student.enrolledVia === 'invite' ? 'Enrolled' : student.enrolledVia === 'attendance' ? 'Attended' : 'Registered'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-white/30 truncate">{student.user?.email}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                                <span className="text-xs text-white/20 hidden sm:block">Report</span>
                                                {selectedStudent?._id === student._id
                                                    ? <ChevronUp className="w-4 h-4 text-white/50" />
                                                    : <ChevronDown className="w-4 h-4 text-white/25" />
                                                }
                                            </div>
                                        </button>

                                        <AnimatePresence>
                                            {selectedStudent?._id === student._id && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    transition={{ duration: 0.25 }}
                                                    className="border-t border-white/8 overflow-hidden"
                                                >
                                                    <div className="p-5 bg-black/20">
                                                        {loadingReport ? (
                                                            <div className="py-6 text-center text-white/30 text-sm">Loading report...</div>
                                                        ) : studentReport ? (
                                                            <div className="space-y-4">
                                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                                    <StatCard label="Total" value={studentReport.total} small />
                                                                    <StatCard label="Present" value={studentReport.present} color="green" small />
                                                                    <StatCard label="Absent" value={studentReport.absent} color="red" small />
                                                                    <StatCard label="Rate" value={`${studentReport.attendancePercent}%`} color={studentReport.attendancePercent >= 75 ? 'green' : studentReport.attendancePercent >= 50 ? 'amber' : 'red'} small />
                                                                </div>
                                                                <div>
                                                                    <div className="flex justify-between text-xs mb-1.5">
                                                                        <span className="text-white/40">Attendance Rate</span>
                                                                        <span className={`font-semibold ${studentReport.attendancePercent >= 75 ? 'text-green-400' : studentReport.attendancePercent >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                                                                            {studentReport.attendancePercent}%
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full bg-white/8 rounded-full h-1.5 overflow-hidden">
                                                                        <motion.div
                                                                            initial={{ width: 0 }}
                                                                            animate={{ width: `${studentReport.attendancePercent}%` }}
                                                                            transition={{ duration: 0.6, delay: 0.1 }}
                                                                            className={`h-full rounded-full ${studentReport.attendancePercent >= 75 ? 'bg-green-400' : studentReport.attendancePercent >= 50 ? 'bg-amber-400' : 'bg-red-400'}`}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                {studentReport.records?.length > 0 && (
                                                                    <div>
                                                                        <p className="text-white/30 text-xs mb-2">Recent Sessions</p>
                                                                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                                                            {studentReport.records.slice(0, 5).map((r, i) => (
                                                                                <div key={i} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-white/4 border border-white/6">
                                                                                    <span className="text-white/50">{r.session?.subject?.name || 'Online Class'}</span>
                                                                                    <span className={`font-medium ${r.status === 'Present' ? 'text-green-400' : 'text-red-400'}`}>{r.status}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="text-white/30 text-sm text-center py-4">No attendance records found.</p>
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
                    <motion.div key="subjects" {...slideIn} className="space-y-5">
                        {/* Create Subject Form */}
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                            <h3 className="font-medium text-white text-sm mb-4 flex items-center gap-2">
                                <Plus className="w-4 h-4 text-white/40" /> Create New Subject
                            </h3>
                            <form onSubmit={handleCreateSubject} className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-xs text-white/35 mb-1 block">Subject Name</label>
                                        <input value={newSubject.name}
                                            onChange={e => setNewSubject(s => ({ ...s, name: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:border-white/25 transition-all"
                                            placeholder="e.g. Data Structures" required />
                                    </div>
                                    <div>
                                        <label className="text-xs text-white/35 mb-1 block">Subject Code</label>
                                        <input value={newSubject.code}
                                            onChange={e => setNewSubject(s => ({ ...s, code: e.target.value }))}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/20 focus:border-white/25 transition-all"
                                            placeholder="e.g. CS301" required />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs text-white/35 mb-1 block">Semester</label>
                                    <select value={newSubject.semester}
                                        onChange={e => setNewSubject(s => ({ ...s, semester: Number(e.target.value) }))}
                                        className="bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:border-white/25 transition-all">
                                        {[1,2,3,4,5,6,7,8].map(n => (
                                            <option key={n} value={n} className="bg-gray-950">Semester {n}</option>
                                        ))}
                                    </select>
                                </div>
                                {subjectError && (
                                    <div className="flex items-center gap-2 text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
                                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {subjectError}
                                    </div>
                                )}
                                <button type="submit" disabled={creatingSubject}
                                    className="w-full bg-white text-black font-semibold py-2.5 rounded-xl text-sm disabled:opacity-50 hover:bg-white/90 transition-all flex items-center justify-center gap-2">
                                    {creatingSubject
                                        ? <><div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> Creating...</>
                                        : <><Plus className="w-4 h-4" /> Add Subject</>
                                    }
                                </button>
                            </form>
                        </div>

                        {/* Subjects list */}
                        {subjects.length === 0 ? (
                            <div className="py-12 text-center border border-white/6 rounded-2xl">
                                <BookOpen className="w-8 h-8 text-white/10 mx-auto mb-3" />
                                <p className="text-white/30 text-sm">No subjects yet — create your first one above</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {subjects.map(sub => (
                                    <div key={sub._id} className="p-4 bg-white/3 border border-white/8 rounded-2xl">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="font-semibold text-white text-sm">{sub.name}</p>
                                                <p className="text-white/35 text-xs mt-0.5">{sub.code} · Sem {sub.semester}</p>
                                            </div>
                                            <span className="text-xs bg-white/6 text-white/40 px-2 py-1 rounded-lg border border-white/8">
                                                {sub.department}
                                            </span>
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
                    <motion.div key="invite" {...slideIn} className="space-y-5">
                        <div className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
                            <div>
                                <h3 className="font-medium text-white text-sm flex items-center gap-2 mb-1">
                                    <UserPlus className="w-4 h-4 text-white/40" /> Your Invite Link
                                </h3>
                                <p className="text-white/30 text-xs">Share this link with students — they'll be automatically enrolled under you.</p>
                            </div>

                            {inviteInfo ? (
                                <>
                                    <div>
                                        <p className="text-xs text-white/35 mb-1.5">Invite Code</p>
                                        <div className="flex items-center gap-3">
                                            <code className="text-2xl font-bold text-white tracking-[0.2em]">{inviteInfo.inviteCode}</code>
                                            <button onClick={() => copyText(inviteInfo.inviteCode, () => {})}
                                                className="p-2 rounded-xl bg-white/6 hover:bg-white/10 text-white/40 hover:text-white transition-all">
                                                <Copy className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/35 mb-1.5">Full Invite Link</p>
                                        <div className="flex items-center gap-2 bg-black/30 border border-white/8 rounded-xl px-4 py-3">
                                            <code className="text-white/50 text-xs flex-1 break-all">{inviteInfo.inviteLink}</code>
                                            <button onClick={() => copyText(inviteInfo.inviteLink, setInviteCopied)}
                                                className="text-white/30 hover:text-white flex-shrink-0 transition-colors">
                                                {inviteCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="bg-indigo-500/8 border border-indigo-500/15 rounded-xl p-4 space-y-1.5 text-xs text-white/40">
                                        <p className="text-indigo-400 font-medium text-xs mb-2">💡 Two ways students can join you</p>
                                        <p>1️⃣ Share the invite link above — student clicks it and gets enrolled</p>
                                        <p>2️⃣ Students search your name during registration on the sign-up page</p>
                                    </div>
                                </>
                            ) : (
                                <div className="py-8 text-center text-white/25 text-sm">Loading invite info...</div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default FacultyDashboard;
