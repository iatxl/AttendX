import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import {
    Mail, Lock, User, ArrowRight, Eye, EyeOff,
    GraduationCap, BookOpen, Search, Check, X,
    Building2, ChevronRight, Loader2, UserCheck
} from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// ── Step indicator ────────────────────────────────────────────────────────────
function StepDots({ current, total }) {
    return (
        <div className="flex items-center gap-2 justify-center mb-6">
            {Array.from({ length: total }).map((_, i) => (
                <div key={i} className={`h-1 rounded-full transition-all duration-300 ${
                    i < current ? 'w-6 bg-white' :
                    i === current ? 'w-6 bg-white/60' :
                    'w-3 bg-white/15'
                }`} />
            ))}
        </div>
    );
}

// ── Faculty search + select ───────────────────────────────────────────────────
function FacultySearchStep({ onSelect, onSkip }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(null);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (query.length < 2) { setResults([]); return; }
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            setLoading(true);
            try {
                const { data } = await axios.get(`${API}/faculty/search?q=${encodeURIComponent(query)}`);
                setResults(data);
            } catch { setResults([]); }
            setLoading(false);
        }, 400);
        return () => clearTimeout(debounceRef.current);
    }, [query]);

    return (
        <div className="space-y-5">
            <div className="text-center">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 border border-indigo-500/25 flex items-center justify-center mx-auto mb-3">
                    <UserCheck className="w-6 h-6 text-indigo-400" />
                </div>
                <h2 className="text-xl font-bold text-white mb-1">Find Your Faculty</h2>
                <p className="text-white/40 text-sm">Search for your faculty member to join their class. You can skip this step.</p>
            </div>

            {/* Search input */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                    type="text"
                    value={query}
                    onChange={e => { setQuery(e.target.value); setSelected(null); }}
                    placeholder="Type faculty name..."
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-white/25 focus:border-white/25 transition-all"
                    autoFocus
                />
                {loading && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 animate-spin" />
                )}
            </div>

            {/* Results */}
            <AnimatePresence mode="wait">
                {results.length > 0 && (
                    <motion.div
                        key="results"
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="space-y-2 max-h-52 overflow-y-auto"
                    >
                        {results.map(f => (
                            <button
                                key={f.facultyId}
                                onClick={() => setSelected(f)}
                                className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                                    selected?.facultyId === f.facultyId
                                        ? 'bg-indigo-500/20 border-indigo-400/40'
                                        : 'bg-white/3 border-white/8 hover:bg-white/7 hover:border-white/15'
                                }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-white font-bold text-sm">
                                        {f.name[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium text-white text-sm">{f.name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-white/40">
                                            <Building2 className="w-3 h-3" />
                                            {f.department}
                                        </div>
                                    </div>
                                </div>
                                {selected?.facultyId === f.facultyId && (
                                    <Check className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
                {query.length >= 2 && !loading && results.length === 0 && (
                    <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="text-center py-4 text-white/30 text-sm">
                        No faculty found for "{query}"
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Actions */}
            <div className="space-y-2">
                <button
                    onClick={() => selected && onSelect(selected)}
                    disabled={!selected}
                    className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-white/90 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    <UserCheck className="w-4 h-4" />
                    Join {selected ? `under ${selected.name}` : 'Faculty'}
                </button>
                <button
                    onClick={onSkip}
                    className="w-full py-2.5 rounded-xl text-white/40 hover:text-white/60 text-sm transition-colors"
                >
                    Skip for now →
                </button>
            </div>
        </div>
    );
}

// ── Main Register component ───────────────────────────────────────────────────
const Register = () => {
    const [step, setStep] = useState(0); // 0=details, 1=faculty-search (student only)
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = e => setFormData(f => ({ ...f, [e.target.name]: e.target.value }));

    const handleStep0 = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(formData.name, formData.email, formData.password, formData.role);
            if (formData.role === 'student') {
                // Go to faculty search step
                setStep(1);
            } else {
                navigate('/dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        }
        setLoading(false);
    };

    const handleFacultySelect = async (faculty) => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API}/faculty/enroll`, {
                facultyId: faculty.facultyId
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
        } catch (err) {
            console.error('Enroll error:', err);
        }
        setLoading(false);
        navigate('/dashboard');
    };

    const handleSkipFaculty = () => {
        navigate('/dashboard');
    };

    const totalSteps = formData.role === 'student' ? 2 : 1;

    return (
        <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-600/6 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md"
            >
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">

                    {/* Logo */}
                    <div className="text-center mb-2">
                        <Link to="/" className="inline-block font-display text-2xl font-bold tracking-tight mb-1">
                            <span className="text-white">Attend</span>
                            <span className="gradient-x">X</span>
                        </Link>
                    </div>

                    {/* Step dots */}
                    {step > 0 || totalSteps > 1 ? <StepDots current={step} total={totalSteps} /> : null}

                    {/* ── STEP 0: Account Details ── */}
                    <AnimatePresence mode="wait">
                        {step === 0 && (
                            <motion.div
                                key="step0"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                            >
                                <div className="text-center mb-6">
                                    <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
                                    <p className="text-white/40 text-sm">Join AttendX — it's free</p>
                                </div>

                                {error && (
                                    <motion.div
                                        initial={{ opacity: 0, y: -8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 text-sm text-center"
                                    >
                                        {error}
                                    </motion.div>
                                )}

                                <form onSubmit={handleStep0} className="space-y-4">
                                    {/* Name */}
                                    <div className="relative">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input type="text" name="name" value={formData.name} onChange={handleChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-white/25 focus:border-white/25 transition-all"
                                            placeholder="Full Name" required />
                                    </div>

                                    {/* Email */}
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input type="email" name="email" value={formData.email} onChange={handleChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-white/25 focus:border-white/25 transition-all"
                                            placeholder="Email address" required />
                                    </div>

                                    {/* Password */}
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                                        <input type={showPw ? 'text' : 'password'} name="password" value={formData.password} onChange={handleChange}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-white text-sm placeholder-white/25 focus:border-white/25 transition-all"
                                            placeholder="Password (min 6 chars)" required minLength={6} />
                                        <button type="button" onClick={() => setShowPw(v => !v)}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </div>

                                    {/* Role selector */}
                                    <div>
                                        <p className="text-xs text-white/35 mb-2 px-1">I am a...</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'student', label: 'Student', icon: GraduationCap, desc: 'Attend classes' },
                                                { value: 'faculty', label: 'Faculty', icon: BookOpen, desc: 'Teach & manage' },
                                            ].map(({ value, label, icon: Icon, desc }) => (
                                                <button key={value} type="button"
                                                    onClick={() => setFormData(f => ({ ...f, role: value }))}
                                                    className={`flex flex-col items-center gap-1 p-4 rounded-xl border text-sm transition-all ${
                                                        formData.role === value
                                                            ? 'bg-white/10 border-white/25 text-white'
                                                            : 'bg-white/3 border-white/8 text-white/35 hover:text-white/55 hover:border-white/15'
                                                    }`}
                                                >
                                                    <Icon className="w-5 h-5" />
                                                    <span className="font-semibold">{label}</span>
                                                    <span className="text-xs opacity-60">{desc}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                                        type="submit" disabled={loading}
                                        className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-white/90 disabled:opacity-50 mt-1"
                                    >
                                        {loading
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : formData.role === 'student'
                                                ? <> Continue <ChevronRight className="w-4 h-4" /></>
                                                : <> Create Account <ArrowRight className="w-4 h-4" /></>
                                        }
                                    </motion.button>
                                </form>

                                <div className="flex items-center gap-3 my-5">
                                    <div className="flex-1 h-px bg-white/8" />
                                    <span className="text-white/20 text-xs">or</span>
                                    <div className="flex-1 h-px bg-white/8" />
                                </div>

                                <p className="text-center text-white/35 text-sm">
                                    Already have an account?{' '}
                                    <Link to="/login" className="text-white hover:text-white/80 font-medium transition-colors">
                                        Sign in →
                                    </Link>
                                </p>
                            </motion.div>
                        )}

                        {/* ── STEP 1: Faculty Search (students only) ── */}
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.25 }}
                            >
                                {loading ? (
                                    <div className="py-12 flex flex-col items-center gap-3">
                                        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                                        <p className="text-white/40 text-sm">Enrolling you...</p>
                                    </div>
                                ) : (
                                    <FacultySearchStep
                                        onSelect={handleFacultySelect}
                                        onSkip={handleSkipFaculty}
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
