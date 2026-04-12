import React, { useState, useContext, useEffect, useCallback } from 'react';
import EyeTracker from '../components/EyeTracker';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Users } from 'lucide-react';

export default function OnlineClass() {
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // In a real app, this would be passed via params/state
    const demoSubjectId = "demo-subject-id"; 
    
    const [focusRatio, setFocusRatio] = useState(0);
    const [isCurrentlyFocused, setIsCurrentlyFocused] = useState(true);
    const [isTrackingActive, setIsTrackingActive] = useState(false);
    const [classEnded, setClassEnded] = useState(false);
    const [attendanceStatus, setAttendanceStatus] = useState(null); // 'Present' | 'Absent'
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleFocusUpdate = useCallback((ratio, isFocused, isActive = false) => {
        setFocusRatio(ratio);
        setIsCurrentlyFocused(isFocused);
        if (isActive) setIsTrackingActive(true);
    }, []);

    const handleEndClass = async () => {
        setClassEnded(true);
        setIsSubmitting(true);
        
        // If tracking never started, force Absent
        const status = (focusRatio >= 0.5 && isTrackingActive) ? 'Present' : 'Absent';
        setAttendanceStatus(status);

        try {
            await axios.post('http://localhost:5000/api/attendance/mark-online', {
                subjectId: demoSubjectId,
                focusRatio: focusRatio,
                duration: 60, // Dummy length
                totalFocusTime: focusRatio * 60
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`Attendance submitted as: ${status}`);
        } catch (error) {
            console.error("Failed to mark online attendance", error);
            // Ignore error for demo
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] text-white p-6 pt-24">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-['General_Sans'] tracking-tight flex items-center">
                        <Users className="mr-3 text-indigo-400" /> Advanced Physics 101
                    </h1>
                    {!classEnded && (
                        <button 
                            onClick={handleEndClass}
                            className="bg-red-500/10 text-red-400 border border-red-500/20 px-4 py-2 rounded-lg hover:bg-red-500/20 transition-all font-medium text-sm">
                            End Class & Submit
                        </button>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Main Class Video Area */}
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-hidden aspect-video relative flex items-center justify-center">
                        {!classEnded ? (
                            <>
                                <h2 className="text-white/20 text-4xl font-bold font-['General_Sans'] absolute z-0 pointer-events-none">
                                    [Live Presentation Stream]
                                </h2>
                                
                                {/* Overlay focus wrapper */}
                                <div className={`absolute top-4 right-4 z-10 transition-opacity duration-300 ${(!isCurrentlyFocused && isTrackingActive) ? 'opacity-100' : 'opacity-0'}`}>
                                    <div className="bg-red-500/90 text-white text-sm px-3 py-1 rounded-full shadow-lg flex items-center shadow-red-500/20 animate-pulse font-medium">
                                        <XCircle className="w-4 h-4 mr-2" /> Please look at the screen
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center">
                                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-2xl ${attendanceStatus === 'Present' ? 'bg-green-500/20 shadow-green-500/20' : 'bg-red-500/20 shadow-red-500/20'}`}>
                                    {attendanceStatus === 'Present' ? <CheckCircle className="w-10 h-10 text-green-400" /> : <XCircle className="w-10 h-10 text-red-400" />}
                                </div>
                                <h2 className="text-3xl font-bold mb-3 font-['General_Sans']">Class Completed</h2>
                                <p className="text-lg text-white/70 mb-2">
                                    Your Focus Score: <span className="text-white font-bold text-xl ml-2">{(focusRatio * 100).toFixed(0)}%</span>
                                </p>
                                <p className="text-white/50">
                                    Attendance marked as: <span className={attendanceStatus === 'Present' ? 'text-green-400' : 'text-red-400'}>{attendanceStatus}</span>
                                </p>
                                <button 
                                    onClick={() => navigate('/dashboard')}
                                    className="mt-8 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors">
                                    Return to Dashboard
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="w-full lg:w-80 flex flex-col gap-6">
                         <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <h3 className="text-sm uppercase tracking-wider text-white/50 font-bold mb-4">Focus Tracking System</h3>
                            {!classEnded && (
                                <EyeTracker onFocusRatioUpdate={handleFocusUpdate} />
                            )}
                            
                            <div className="mt-6">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-white/70">Required for Present</span>
                                    <span className="text-white font-medium">50%</span>
                                </div>
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-white/70">Current Focus</span>
                                    <span className={`font-bold ${isTrackingActive ? (focusRatio >= 0.5 ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>
                                        {isTrackingActive ? `${(focusRatio * 100).toFixed(1)}%` : 'Waiting...'}
                                    </span>
                                </div>
                                <div className="w-full bg-black rounded-full h-2 mt-4 overflow-hidden border border-white/10 relative">
                                    {!isTrackingActive && (
                                        <div className="absolute inset-0 bg-gray-500/20 animate-pulse"></div>
                                    )}
                                    <div 
                                        className={`h-2 rounded-full transition-all duration-300 ease-out ${focusRatio >= 0.5 ? 'bg-gradient-to-r from-green-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-rose-500'}`}
                                        style={{ width: `${isTrackingActive ? Math.max(0, Math.min(100, focusRatio * 100)) : 0}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex-1 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent pointer-events-none"></div>
                           <h3 className="text-sm uppercase tracking-wider text-white/50 font-bold mb-4 relative z-10">Live Chat</h3>
                           <div className="text-white/30 text-sm text-center mt-10 relative z-10 italic">
                               Chat is disabled in demo mode
                           </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
