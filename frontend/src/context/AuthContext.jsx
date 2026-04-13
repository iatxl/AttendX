import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Immediately hydrate from localStorage so UI never flashes logged-out
    const [user, setUser] = useState(() => {
        try {
            const stored = localStorage.getItem('user');
            return stored ? JSON.parse(stored) : null;
        } catch { return null; }
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }

        // Check JWT expiry locally first (no network needed)
        try {
            const decoded = jwtDecode(token);
            if (decoded.exp * 1000 < Date.now()) {
                // Token genuinely expired — clear everything
                logout();
                setLoading(false);
                return;
            }
        } catch {
            logout();
            setLoading(false);
            return;
        }

        // Verify token is still valid on the server
        api.get('/auth/me')
            .then(res => {
                setUser(res.data);
                localStorage.setItem('user', JSON.stringify(res.data));
            })
            .catch((err) => {
                if (err.response?.status === 401) {
                    // Token rejected by server (user deleted, cluster switched, etc.)
                    logout();
                }
                // Network errors / 500s: keep existing user state from localStorage
            })
            .finally(() => {
                setLoading(false);
            });
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const register = async (name, email, password, role) => {
        const { data } = await api.post('/auth/register', { name, email, password, role });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data));
        setUser(data);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
