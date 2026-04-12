import React, { useState, useEffect, useContext } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { UserPlus, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function JoinFaculty() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user } = useContext(AuthContext);
    const code = searchParams.get('code');

    const [facultyInfo, setFacultyInfo] = useState(null);
    const [status, setStatus] = useState('loading'); // loading | ready | joining | success | error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!code) {
            setStatus('error');
            setMessage('Invalid invite link — no code found.');
            return;
        }
        // Fetch faculty info from code
        axios.get(`${API}/faculty/invite-info/${code}`)
            .then(({ data }) => {
                setFacultyInfo(data);
                setStatus(user ? 'ready' : 'need-login');
            })
            .catch(() => {
                setStatus('error');
                setMessage('This invite link is invalid or has expired.');
            });
    }, [code, user]);

    const handleJoin = async () => {
        setStatus('joining');
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(`${API}/faculty/join`, { inviteCode: code }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus('success');
            setMessage(data.message);
        } catch (err) {
            setStatus('error');
            setMessage(err.response?.data?.message || 'Failed to join. Please try again.');
        }
    };

    return (
        <div className="min-h-screen bg-[#060606] flex items-center justify-center p-6">
            <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-green-500/20 border border-green-500/30 flex items-center justify-center mx-auto">
                    <UserPlus className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white">Join Class</h1>

                {status === 'loading' && (
                    <div className="flex flex-col items-center gap-3 py-4">
                        <Loader className="w-6 h-6 animate-spin text-green-400" />
                        <p className="text-white/40 text-sm">Verifying invite link...</p>
                    </div>
                )}

                {(status === 'ready' || status === 'joining') && facultyInfo && (
                    <>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-white/50 text-xs mb-1">You are joining</p>
                            <p className="text-white font-semibold text-lg">{facultyInfo.facultyName}</p>
                            <p className="text-green-400 text-sm">{facultyInfo.department} Department</p>
                        </div>
                        <p className="text-white/40 text-sm">
                            Joining will enroll you under this faculty. Your attendance records will be visible to them.
                        </p>
                        <button
                            onClick={handleJoin}
                            disabled={status === 'joining'}
                            className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl py-3 font-medium transition-colors flex items-center justify-center gap-2"
                        >
                            {status === 'joining' ? (
                                <><Loader className="w-4 h-4 animate-spin" /> Joining...</>
                            ) : (
                                <><UserPlus className="w-4 h-4" /> Confirm & Join</>
                            )}
                        </button>
                    </>
                )}

                {status === 'need-login' && facultyInfo && (
                    <>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                            <p className="text-white/50 text-xs mb-1">Invite from</p>
                            <p className="text-white font-semibold">{facultyInfo.facultyName}</p>
                            <p className="text-green-400 text-sm">{facultyInfo.department}</p>
                        </div>
                        <p className="text-white/50 text-sm">You need to log in as a student to accept this invite.</p>
                        <button
                            onClick={() => navigate(`/login?redirect=/join?code=${code}`)}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl py-3 font-medium transition-colors"
                        >
                            Login to Join
                        </button>
                    </>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
                        <p className="text-green-400 font-semibold">{message}</p>
                        <p className="text-white/40 text-sm">You are now enrolled! Head to your dashboard to see your classes.</p>
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="w-full bg-green-600 hover:bg-green-500 text-white rounded-xl py-3 font-medium transition-colors"
                        >
                            Go to Dashboard
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
                        <p className="text-red-400 font-semibold">{message}</p>
                        <button
                            onClick={() => navigate('/')}
                            className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 font-medium transition-colors"
                        >
                            Go Home
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
