import { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import QRGenerator from '../components/QRGenerator';
import QRScanner from '../components/QRScanner';
import FaceRecognition from '../components/FaceRecognition';
import AnalyticsCharts from '../components/AnalyticsCharts';
import FacultyDashboard from './FacultyDashboard';
import { motion } from 'framer-motion';

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    return (
        <div className="container mx-auto p-6">
            <motion.h1
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-4xl font-bold mb-8 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent"
            >
                Dashboard
            </motion.h1>

            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="glass-panel p-8 rounded-2xl"
            >
                <motion.div variants={itemVariants} className="mb-8">
                    <h2 className="text-2xl font-semibold mb-2 text-white">Welcome back, {user?.name}!</h2>
                    <p className="text-gray-400">Role: <span className="capitalize font-medium text-purple-400">{user?.role}</span></p>
                </motion.div>

                <div className="grid gap-8">
                    {user?.role === 'student' && (
                        <motion.div variants={itemVariants} className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                            <h3 className="text-xl font-bold text-blue-400 mb-6">Student Actions</h3>
                            <div className="grid md:grid-cols-2 gap-8">
                                <div className="glass-panel p-4 rounded-xl">
                                    <QRScanner />
                                </div>
                                <div className="glass-panel p-4 rounded-xl">
                                    <FaceRecognition />
                                </div>
                                <div className="glass-panel p-6 rounded-xl flex flex-col items-center justify-center text-center col-span-1 md:col-span-2 mt-4 bg-indigo-500/10 border-indigo-500/20">
                                    <h4 className="text-lg font-bold mb-2">Online Classes</h4>
                                    <p className="text-sm text-gray-400 mb-4">Join active classes and track your focus attendance.</p>
                                    <button 
                                        onClick={() => navigate('/class')}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2 rounded-lg transition-all"
                                    >
                                        Join Physics 101
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {user?.role === 'faculty' && (
                        <motion.div variants={itemVariants} className="p-6 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <h3 className="text-xl font-bold text-green-400 mb-6">Faculty Dashboard</h3>
                            <FacultyDashboard />
                        </motion.div>
                    )}

                    {user?.role === 'admin' && (
                        <motion.div variants={itemVariants} className="p-6 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                            <h3 className="text-xl font-bold text-purple-400 mb-6">Admin Analytics</h3>
                            <p className="mb-6 text-gray-400">Overview of system performance and attendance trends.</p>
                            <AnalyticsCharts />
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default Dashboard;
