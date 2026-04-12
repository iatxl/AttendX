import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { 
    Users, BookOpen, Plus, Link2, ChevronDown, ChevronUp, 
    CheckCircle, XCircle, BarChart2, Clock, Copy, Check, X, UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const FacultyDashboard = () => {
    const { user } = useContext(AuthContext);
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [studentReport, setStudentReport] = useState(null);
    const [loadingReport, setLoadingReport] = useState(false);
    const [activeTab, setActiveTab] = useState('students'); // students | subjects | create-class

    // Subject creation form
    const [newSubject, setNewSubject] = useState({ name: '', code: '', semester: 1 });
    const [creatingSubject, setCreatingSubject] = useState(false);

    // Class link creation
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [classDuration, setClassDuration] = useState(60);
    const [generatedLink, setGeneratedLink] = useState(null);
    const [copied, setCopied] = useState(false);
    const [creatingClass, setCreatingClass] = useState(false);

    // Invite system
    const [inviteInfo, setInviteInfo] = useState(null);
    const [inviteCopied, setInviteCopied] = useState(false);

    useEffect(() => {
        fetchSubjects();
        fetchStudents();
        // Fetch invite info
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
        try {
            const { data } = await axios.get(`${API}/faculty/students`, { headers });
            setStudents(data);
        } catch (e) { console.error(e); }
    };

    const fetchStudentReport = async (studentId) => {
        if (selectedStudent?._id === studentId) {
            setSelectedStudent(null);
            setStudentReport(null);
            return;
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
        setCreatingSubject(true);
        try {
            await axios.post(`${API}/faculty/subjects`, newSubject, { headers });
            setNewSubject({ name: '', code: '', semester: 1 });
            fetchSubjects();
        } catch (e) { alert(e.response?.data?.message || 'Failed to create subject'); }
        setCreatingSubject(false);
    };

    const handleCreateClass = async () => {
        if (!selectedSubjectId) return alert('Please select a subject first');
        setCreatingClass(true);
        try {
            const { data } = await axios.post(`${API}/faculty/class/create`, {
                subjectId: selectedSubjectId,
                durationMinutes: classDuration
            }, { headers });
            setGeneratedLink(data);
        } catch (e) { alert(e.response?.data?.message || 'Failed to create class'); }
        setCreatingClass(false);
    };

    const copyLink = () => {
        navigator.clipboard.writeText(generatedLink.classLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const copyInviteLink = () => {
        if (!inviteInfo) return;
        navigator.clipboard.writeText(inviteInfo.inviteLink);
        setInviteCopied(true);
        setTimeout(() => setInviteCopied(false), 2000);
    };

    const tabs = [
        { id: 'students', label: 'Students', icon: Users },
        { id: 'subjects', label: 'Subjects', icon: BookOpen },
        { id: 'create-class', label: 'Create Class', icon: Link2 },
        { id: 'invite', label: 'Invite Students', icon: UserPlus },
    ];

    return (
        <div className="space-y-6">
            {/* Tab Bar */}
            <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/10 w-fit">
                {tabs.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === id
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'text-white/50 hover:text-white/80'
                        }`}
                    >
                        <Icon className="w-4 h-4" />
                        {label}
                    </button>
                ))}
            </div>

            {/* STUDENTS TAB */}
            {activeTab === 'students' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Users className="w-5 h-5 text-green-400" />
                        All Students ({students.length})
                    </h3>

                    {students.length === 0 ? (
                        <div className="text-white/40 text-center py-12 border border-white/10 rounded-xl">
                            No students registered yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {students.map(student => (
                                <div key={student._id} className="border border-white/10 rounded-xl overflow-hidden">
                                    {/* Student Row */}
                                    <button
                                        onClick={() => fetchStudentReport(student._id)}
                                        className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-green-500/20 border border-green-500/30 flex items-center justify-center text-green-400 font-bold text-sm">
                                                {student.user?.name?.[0]?.toUpperCase() || '?'}
                                            </div>
                                            <div>
                                                <p className="font-medium text-white">{student.user?.name || 'Unknown'}</p>
                                                <p className="text-xs text-white/40">{student.user?.email}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-white/40 hidden sm:block">View Report</span>
                                            {selectedStudent?._id === student._id
                                                ? <ChevronUp className="w-4 h-4 text-green-400" />
                                                : <ChevronDown className="w-4 h-4 text-white/40" />
                                            }
                                        </div>
                                    </button>

                                    {/* Expanded Report */}
                                    <AnimatePresence>
                                        {selectedStudent?._id === student._id && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/10 overflow-hidden"
                                            >
                                                <div className="p-5 bg-white/3">
                                                    {loadingReport ? (
                                                        <div className="text-white/40 text-sm text-center py-4">Loading report...</div>
                                                    ) : studentReport ? (
                                                        <div className="space-y-4">
                                                            {/* Stats */}
                                                            <div className="grid grid-cols-3 gap-3">
                                                                {[
                                                                    { label: 'Total Classes', value: studentReport.total, color: 'text-white' },
                                                                    { label: 'Present', value: studentReport.present, color: 'text-green-400' },
                                                                    { label: 'Absent', value: studentReport.absent, color: 'text-red-400' },
                                                                ].map(stat => (
                                                                    <div key={stat.label} className="bg-white/5 rounded-lg p-3 text-center border border-white/10">
                                                                        <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                                                                        <p className="text-xs text-white/40 mt-1">{stat.label}</p>
                                                                    </div>
                                                                ))}
                                                            </div>

                                                            {/* Attendance % bar */}
                                                            <div>
                                                                <div className="flex justify-between text-xs mb-1">
                                                                    <span className="text-white/50">Attendance Rate</span>
                                                                    <span className={`font-bold ${studentReport.attendancePercent >= 75 ? 'text-green-400' : studentReport.attendancePercent >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                                        {studentReport.attendancePercent}%
                                                                    </span>
                                                                </div>
                                                                <div className="w-full bg-white/10 rounded-full h-2">
                                                                    <div
                                                                        className={`h-2 rounded-full transition-all ${studentReport.attendancePercent >= 75 ? 'bg-green-500' : studentReport.attendancePercent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                        style={{ width: `${studentReport.attendancePercent}%` }}
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Records */}
                                                            {studentReport.records.length > 0 && (
                                                                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                                                    <p className="text-xs text-white/40 uppercase tracking-wider">Recent Sessions</p>
                                                                    {studentReport.records.map(record => (
                                                                        <div key={record._id} className="flex items-center justify-between text-sm p-2 bg-white/5 rounded-lg">
                                                                            <div>
                                                                                <p className="text-white/80 text-xs font-medium">
                                                                                    {record.session?.subject?.name || 'Unknown Subject'}
                                                                                </p>
                                                                                <p className="text-white/30 text-[10px]">{new Date(record.createdAt).toLocaleDateString()} · {record.verificationMethod}</p>
                                                                            </div>
                                                                            <span className={`flex items-center gap-1 text-xs font-bold ${record.status === 'Present' ? 'text-green-400' : 'text-red-400'}`}>
                                                                                {record.status === 'Present' ? <CheckCircle className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                                                                                {record.status}
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : null}
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

            {/* SUBJECTS TAB */}
            {activeTab === 'subjects' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* Create Subject Form */}
                    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                        <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Plus className="w-4 h-4 text-green-400" /> Add New Subject
                        </h4>
                        <form onSubmit={handleCreateSubject} className="grid sm:grid-cols-3 gap-3">
                            <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-green-400/50"
                                placeholder="Subject Name (e.g. Physics)"
                                value={newSubject.name}
                                onChange={e => setNewSubject({ ...newSubject, name: e.target.value })}
                                required
                            />
                            <input
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-green-400/50"
                                placeholder="Code (e.g. PHY101)"
                                value={newSubject.code}
                                onChange={e => setNewSubject({ ...newSubject, code: e.target.value })}
                                required
                            />
                            <input
                                type="number" min={1} max={8}
                                className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm placeholder-white/30 focus:outline-none focus:border-green-400/50"
                                placeholder="Semester (1-8)"
                                value={newSubject.semester}
                                onChange={e => setNewSubject({ ...newSubject, semester: parseInt(e.target.value) })}
                            />
                            <button
                                type="submit"
                                disabled={creatingSubject}
                                className="sm:col-span-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg py-2 text-sm font-medium transition-colors"
                            >
                                {creatingSubject ? 'Creating...' : 'Create Subject'}
                            </button>
                        </form>
                    </div>

                    {/* Subjects List */}
                    <div className="space-y-3">
                        <h4 className="text-white/60 text-sm uppercase tracking-wider">Your Subjects ({subjects.length})</h4>
                        {subjects.length === 0 ? (
                            <div className="text-white/30 text-center py-8 border border-white/10 rounded-xl text-sm">
                                No subjects yet. Create one above.
                            </div>
                        ) : (
                            subjects.map(sub => (
                                <div key={sub._id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl">
                                    <div>
                                        <p className="font-medium text-white">{sub.name}</p>
                                        <p className="text-xs text-white/40">Code: {sub.code} · Semester {sub.semester}</p>
                                    </div>
                                    <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded border border-green-500/30">
                                        Sem {sub.semester}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </motion.div>
            )}

            {/* CREATE CLASS TAB */}
            {activeTab === 'create-class' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-lg">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                        <h4 className="text-white font-semibold flex items-center gap-2">
                            <Link2 className="w-4 h-4 text-green-400" /> Create Online Class Link
                        </h4>
                        <p className="text-white/40 text-sm">
                            Generate a shareable link for students to join an online class with AI face tracking attendance.
                        </p>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Select Subject</label>
                                <select
                                    value={selectedSubjectId}
                                    onChange={e => setSelectedSubjectId(e.target.value)}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400/50"
                                >
                                    <option value="" className="bg-gray-900">-- Select subject --</option>
                                    {subjects.map(sub => (
                                        <option key={sub._id} value={sub._id} className="bg-gray-900">
                                            {sub.name} ({sub.code})
                                        </option>
                                    ))}
                                </select>
                                {subjects.length === 0 && (
                                    <p className="text-xs text-yellow-400/70 mt-1">
                                        ⚠ No subjects yet — create one in the Subjects tab first.
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="text-xs text-white/50 mb-1 block">Class Duration (minutes)</label>
                                <input
                                    type="number" min={5} max={300}
                                    value={classDuration}
                                    onChange={e => setClassDuration(parseInt(e.target.value))}
                                    className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-green-400/50"
                                />
                            </div>

                            <button
                                onClick={handleCreateClass}
                                disabled={creatingClass || !selectedSubjectId}
                                className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white rounded-lg py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <Link2 className="w-4 h-4" />
                                {creatingClass ? 'Generating...' : 'Generate Class Link'}
                            </button>
                        </div>
                    </div>

                    {/* Generated Link */}
                    {generatedLink && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 space-y-3"
                        >
                            <p className="text-green-400 font-semibold text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4" /> Class Created!
                            </p>
                            <div className="bg-black/30 rounded-lg p-3 flex items-center gap-2">
                                <code className="text-green-300 text-xs flex-1 break-all">{generatedLink.classLink}</code>
                                <button onClick={copyLink} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
                                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                </button>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-white/40">
                                <Clock className="w-3.5 h-3.5" />
                                Expires: {new Date(generatedLink.expiresAt).toLocaleString()}
                            </div>
                            <p className="text-white/40 text-xs">Share this link with students. They can click it to join and their attendance will be tracked automatically via AI camera.</p>
                        </motion.div>
                    )}
                </motion.div>
            )}
            {/* INVITE TAB */}
            {activeTab === 'invite' && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-lg">
                    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
                        <h4 className="text-white font-semibold flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-green-400" /> Your Student Invite Link
                        </h4>
                        <p className="text-white/40 text-sm">
                            Share this link with students. When they open it and click "Join", they'll be enrolled under you and visible in your Students tab.
                        </p>

                        {inviteInfo ? (
                            <div className="space-y-3">
                                <div className="bg-black/30 rounded-xl p-4 space-y-3">
                                    <div>
                                        <p className="text-xs text-white/40 mb-1">Invite Code</p>
                                        <code className="text-green-400 text-lg font-bold tracking-widest">{inviteInfo.inviteCode}</code>
                                    </div>
                                    <div>
                                        <p className="text-xs text-white/40 mb-1">Invite Link</p>
                                        <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2">
                                            <code className="text-green-300 text-xs flex-1 break-all">{inviteInfo.inviteLink}</code>
                                            <button onClick={copyInviteLink} className="text-white/40 hover:text-white flex-shrink-0">
                                                {inviteCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-300">
                                    ✅ This link is permanent — students can join anytime using it.
                                </div>
                            </div>
                        ) : (
                            <div className="text-white/30 text-sm text-center py-4">
                                Loading invite info...
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default FacultyDashboard;
