import { useContext, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogOut, Menu, X, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
        setMobileOpen(false);
    };

    return (
        <>
            <motion.nav
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="fixed top-0 left-0 right-0 z-50"
            >
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="mt-3 mx-2 sm:mx-4 bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl px-5 py-3 flex items-center justify-between shadow-[0_0_40px_rgba(0,0,0,0.5)]">

                        {/* Logo */}
                        <Link to="/" className="font-display text-xl font-bold tracking-tight flex items-center gap-1">
                            <span className="text-white">Attend</span>
                            <span className="gradient-x">X</span>
                        </Link>

                        {/* Desktop: Dashboard link (only when logged in) */}
                        {user && (
                            <Link
                                to="/dashboard"
                                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
                                    location.pathname === '/dashboard'
                                        ? 'bg-white/15 text-white'
                                        : 'text-white/70 hover:text-white hover:bg-white/8'
                                }`}
                            >
                                <LayoutDashboard className="w-3.5 h-3.5" />
                                Dashboard
                            </Link>
                        )}

                        {/* Right side */}
                        <div className="hidden md:flex items-center gap-3">
                            {user ? (
                                <>
                                    {/* User pill */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/8 border border-white/15">
                                        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                            {user.name?.[0]?.toUpperCase()}
                                        </div>
                                        <span className="text-white text-sm font-medium">{user.name}</span>
                                        <span className="text-xs bg-indigo-500/25 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40 capitalize">
                                            {user.role}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/8 transition-all text-sm"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-white/70 hover:text-white text-sm transition-colors px-3 py-1.5">
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-white text-black text-sm font-semibold px-4 py-1.5 rounded-full hover:bg-white/90 transition-all"
                                    >
                                        Get Started →
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden text-white/70 hover:text-white p-1.5"
                            onClick={() => setMobileOpen(o => !o)}
                        >
                            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </motion.nav>

            {/* Mobile Dropdown */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="fixed top-20 left-4 right-4 z-40 bg-white/8 backdrop-blur-2xl border border-white/15 rounded-2xl p-4 shadow-2xl"
                    >
                        <div className="space-y-1">
                            {user && (
                                <Link
                                    to="/dashboard"
                                    onClick={() => setMobileOpen(false)}
                                    className="flex items-center gap-2 px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/8 transition-all text-sm font-medium"
                                >
                                    <LayoutDashboard className="w-4 h-4" /> Dashboard
                                </Link>
                            )}
                            {user ? (
                                <>
                                    <div className="px-4 py-3 border-t border-white/12 mt-2 flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                                            {user.name?.[0]?.toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-white text-sm font-medium">{user.name}</p>
                                            <p className="text-white/50 text-xs capitalize">{user.role}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all text-sm"
                                    >
                                        <LogOut className="w-4 h-4" /> Logout
                                    </button>
                                </>
                            ) : (
                                <div className="pt-2 border-t border-white/12 space-y-2">
                                    <Link to="/login" onClick={() => setMobileOpen(false)}
                                        className="block px-4 py-3 rounded-xl text-white/80 hover:text-white hover:bg-white/8 text-sm">
                                        Login
                                    </Link>
                                    <Link to="/register" onClick={() => setMobileOpen(false)}
                                        className="block px-4 py-3 rounded-xl bg-white text-black text-sm font-semibold text-center">
                                        Get Started →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};

export default Navbar;
