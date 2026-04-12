import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient orbs */}
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md"
            >
                {/* Card */}
                <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {/* Logo */}
                    <div className="text-center mb-8">
                        <Link to="/" className="inline-block font-display text-2xl font-bold tracking-tight mb-4">
                            <span className="text-white">Attend</span>
                            <span className="gradient-x">X</span>
                        </Link>
                        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
                        <p className="text-white/40 text-sm">Sign in to continue to AttendX</p>
                    </div>

                    {/* Error */}
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
                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-white/25 focus:border-white/25 transition-all"
                                placeholder="Email address"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-white text-sm placeholder-white/25 focus:border-white/25 transition-all"
                                placeholder="Password"
                                required
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Submit */}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm transition-all hover:bg-white/90 disabled:opacity-50 mt-2"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                            ) : (
                                <>Sign In <ArrowRight className="w-4 h-4" /></>
                            )}
                        </motion.button>
                    </form>

                    {/* Divider */}
                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-white/20 text-xs">or</span>
                        <div className="flex-1 h-px bg-white/10" />
                    </div>

                    <p className="text-center text-white/40 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-white hover:text-white/80 font-medium transition-colors">
                            Sign up →
                        </Link>
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
