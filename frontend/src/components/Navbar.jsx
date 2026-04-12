import { useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { LogOut, User } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <motion.nav
            initial={{ y: -100 }}
            animate={{ y: 0 }}
            className="glass-panel sticky top-0 z-50 rounded-none border-x-0 border-t-0"
        >
            <div className="container mx-auto px-6 py-4 flex justify-between items-center">
                <Link to="/" className="text-2xl font-bold flex items-center gap-2 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                    AttendX
                </Link>

                <div className="flex items-center gap-6">
                    {user ? (
                        <>
                            <span className="flex items-center gap-2 text-gray-300">
                                <User size={18} className="text-purple-400" />
                                {user.name} <span className="text-xs bg-purple-500/20 px-2 py-1 rounded border border-purple-500/50 capitalize">{user.role}</span>
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors"
                            >
                                <LogOut size={18} /> Logout
                            </button>
                        </>
                    ) : (
                        <div className="flex gap-6">
                            <Link to="/login" className="text-gray-300 hover:text-white transition-colors">Login</Link>
                            <Link to="/register" className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors">Register</Link>
                        </div>
                    )}
                </div>
            </div>
        </motion.nav>
    );
};

export default Navbar;
