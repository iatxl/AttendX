import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, GraduationCap, BookOpen } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({ name: '', email: '', password: '', role: 'student' });
    const [showPw, setShowPw] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await register(formData.name, formData.email, formData.password, formData.role);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-amber-600/8 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="text-center mb-7">
                        <Link to="/" className="inline-block font-display text-2xl font-bold tracking-tight mb-4">
                            <span className="text-white">Attend</span>
                            <span className="gradient-x">X</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-white mb-1">Create account</h1>
                        <p className="text-white/40 text-sm">Join the AI-powered attendance platform</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-5 text-sm text-center"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                placeholder="Password" required />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Role selector */}
                        <div>
                            <p className="text-xs text-white/40 mb-2 px-1">I am a...</p>
                            <div className="grid grid-cols-2 gap-2">
                                {[
                                    { value: 'student', label: 'Student', icon: GraduationCap, desc: 'Attend classes' },
                                    { value: 'faculty', label: 'Faculty', icon: BookOpen, desc: 'Teach classes' },
                                ].map(({ value, label, icon: Icon, desc }) => (
                                    <button
                                        key={value}
                                        type="button"
                                        onClick={() => setFormData(f => ({ ...f, role: value }))}
                                        className={`flex flex-col items-center gap-1 p-4 rounded-xl border text-sm transition-all ${
                                            formData.role === value
                                                ? 'bg-white/10 border-white/30 text-white'
                                                : 'bg-white/3 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                                        }`}
                                    >
                                        <Icon className="w-5 h-5" />
                                        <span className="font-medium">{label}</span>
                                        <span className="text-xs opacity-60">{desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-white/90 disabled:opacity-50 mt-1"
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                : <> Create Account <ArrowRight className="w-4 h-4" /></>
                            }
                        </motion.button>
                    </form>

                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/20 text-xs">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <p className="text-center text-white/40 text-sm">
                        Already have an account?{' '}
                        <Link to="/login" className="text-white hover:text-white/80 font-medium transition-colors">
                            Sign in →
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Register;
