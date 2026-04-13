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
                    <div className="mt-3 mx-2 sm:mx-4 bg-white/12 backdrop-blur-2xl border border-white/25 rounded-2xl px-5 py-3 flex items-center justify-between shadow-[0_0_50px_rgba(0,0,0,0.6)]">

                        {/* Logo */}
                        <Link to="/" className="font-display text-xl font-bold tracking-tight flex items-center gap-1.5 transition-transform hover:scale-[1.02] active:scale-[0.98]">
                            <span className="text-white drop-shadow-sm">Attend</span>
                            <span className="gradient-x drop-shadow-md">X</span>
                        </Link>

                        {/* Desktop: Dashboard link (only when logged in) */}
                        {user && (
                            <Link
                                to="/dashboard"
                                className={`hidden md:flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${
                                    location.pathname === '/dashboard'
                                        ? 'bg-white text-black'
                                        : 'text-white/90 hover:text-white hover:bg-white/15'
                                }`}
                            >
                                <LayoutDashboard className="w-4 h-4" />
                                Dashboard
                            </Link>
                        )}

                        {/* Right side */}
                        <div className="hidden md:flex items-center gap-3">
                            {user ? (
                                <>
                                    {/* User pill */}
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/12 border border-white/20 shadow-inner">
                                        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-black text-white shadow-lg">
                                            {user.name?.[0]?.toUpperCase()}
                                        </div>
                                        <span className="text-white text-sm font-bold tracking-tight">{user.name}</span>
                                        <span className="text-[10px] bg-indigo-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest shadow-sm">
                                            {user.role}
                                        </span>
                                    </div>
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-wider"
                                    >
                                        <LogOut className="w-3.5 h-3.5" />
                                        Logout
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-white/90 hover:text-white text-sm font-bold transition-colors px-4 py-2">
                                        Login
                                    </Link>
                                    <Link
                                        to="/register"
                                        className="bg-white text-black text-sm font-black px-6 py-2 rounded-full hover:bg-white/90 transition-all shadow-xl shadow-white/10"
                                    >
                                        Get Started →
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <button
                            className="md:hidden text-white/90 hover:text-white p-2 rounded-xl bg-white/10 border border-white/15"
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
