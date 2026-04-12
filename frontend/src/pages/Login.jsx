import { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Eye, EyeOff, ChevronDown } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const videoRef = useRef(null);
    const fadeRef = useRef(null);

    // Same fade loop as hero
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let startTime = null;
        let isFadingOut = false;

        const updateOpacity = (time) => {
            if (!startTime) startTime = time;
            const elapsed = time - startTime;
            const duration = video.duration || 5;

            if (elapsed < 500 && !isFadingOut) {
                video.style.opacity = elapsed / 500;
            } else if (duration && video.currentTime >= duration - 0.5) {
                isFadingOut = true;
                const fadeOutElapsed = video.currentTime - (duration - 0.5);
                video.style.opacity = Math.max(0, 1 - (fadeOutElapsed / 0.5));
            } else if (!isFadingOut) {
                video.style.opacity = 1;
            }

            fadeRef.current = requestAnimationFrame(updateOpacity);
        };

        const onPlay = () => {
            startTime = performance.now();
            isFadingOut = false;
            video.style.opacity = 0;
            fadeRef.current = requestAnimationFrame(updateOpacity);
        };

        const onEnded = () => {
            cancelAnimationFrame(fadeRef.current);
            video.style.opacity = 0;
            setTimeout(() => { video.currentTime = 0; video.play(); }, 100);
        };

        video.addEventListener('play', onPlay);
        video.addEventListener('ended', onEnded);
        video.play().catch(console.error);

        return () => {
            video.removeEventListener('play', onPlay);
            video.removeEventListener('ended', onEnded);
            if (fadeRef.current) cancelAnimationFrame(fadeRef.current);
        };
    }, []);

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
        <div className="min-h-screen bg-[#060606] flex">

            {/* ── LEFT PANEL — hero video in top-left corner ───────────────── */}
            <div className="hidden lg:flex relative w-[45%] flex-col overflow-hidden">

                {/* Video — anchored top-left, fills panel */}
                <div className="absolute inset-0 overflow-hidden">
                    <video
                        ref={videoRef}
                        className="absolute top-0 left-0 w-full h-full object-cover transition-opacity"
                        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4"
                        muted
                        playsInline
                        style={{ opacity: 0 }}
                    />
                    {/* Dark gradient fade — right edge bleeds into login card */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#060606]/20 to-[#060606]" />
                    {/* Bottom fade */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-transparent to-transparent" />
                    {/* Blurred center overlay like hero */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] opacity-60 bg-gray-950 blur-[60px] pointer-events-none" />
                </div>

                {/* Logo in top-left of video panel */}
                <div className="relative z-10 p-8">
                    <Link to="/" className="inline-block font-display text-xl font-bold tracking-tight">
                        <span className="text-white">Attend</span>
                        <span className="gradient-x">X</span>
                    </Link>
                </div>

                {/* Bottom-left brand text */}
                <div className="relative z-10 mt-auto p-8">
                    <h2 className="text-white text-3xl font-bold leading-tight mb-2">
                        AI-Powered<br />Attendance
                    </h2>
                    <p className="text-white/35 text-sm leading-relaxed max-w-xs">
                        Face tracking, live streaming, and instant reports — all in one platform.
                    </p>
                </div>
            </div>

            {/* ── RIGHT PANEL — login card ─────────────────────────────────── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative">

                {/* Mobile logo (shown when left panel is hidden) */}
                <div className="lg:hidden mb-8 text-center">
                    <Link to="/" className="inline-block font-display text-2xl font-bold tracking-tight">
                        <span className="text-white">Attend</span>
                        <span className="gradient-x">X</span>
                    </Link>
                </div>

                {/* Ambient orbs */}
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-indigo-600/8 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-1/4 left-1/4 w-56 h-56 bg-purple-600/8 rounded-full blur-3xl pointer-events-none" />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="w-full max-w-sm relative z-10"
                >
                    <div className="mb-7">
                        <h1 className="text-2xl font-bold text-white mb-1">Welcome back</h1>
                        <p className="text-white/35 text-sm">Sign in to continue to AttendX</p>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2.5 rounded-xl mb-5 text-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* Email */}
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3 text-white text-sm placeholder-white/20 focus:border-white/25 focus:outline-none transition-all"
                                placeholder="Email address"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-11 py-3 text-white text-sm placeholder-white/20 focus:border-white/25 focus:outline-none transition-all"
                                placeholder="Password"
                                required
                            />
                            <button type="button" onClick={() => setShowPw(v => !v)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            type="submit"
                            disabled={loading}
                            className="w-full bg-white text-black font-semibold py-3 rounded-xl flex items-center justify-center gap-2 text-sm hover:bg-white/90 disabled:opacity-50 transition-all mt-1"
                        >
                            {loading
                                ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>
                            }
                        </motion.button>
                    </form>

                    <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-white/8" />
                        <span className="text-white/20 text-xs">or</span>
                        <div className="flex-1 h-px bg-white/8" />
                    </div>

                    <p className="text-center text-white/35 text-sm">
                        Don't have an account?{' '}
                        <Link to="/register" className="text-white hover:text-white/75 font-medium transition-colors">
                            Sign up →
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default Login;
