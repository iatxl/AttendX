import { createContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { jwtDecode } from 'jwt-decode';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            try {
                const decoded = jwtDecode(token);
                if (decoded.exp * 1000 < Date.now()) {
                    // Token genuinely expired
                    logout();
                    setLoading(false);
                    return;
                }

                // Set user from token immediately so UI doesn't flash logged-out
                const tokenUser = {
                    _id: decoded.id,
                    name: decoded.name,
                    email: decoded.email,
                    role: decoded.role,
                };

                api.get('/auth/me')
                    .then(res => {
                        setUser(res.data);
                    })
                    .catch((err) => {
                        // Only logout on 401 (invalid/revoked token)
                        // Network errors or 500s should NOT log the user out
                        if (err.response?.status === 401) {
                            logout();
                        } else {
                            // Keep user logged in using token data as fallback
                            setUser(tokenUser);
                        }
                    })
                    .finally(() => {
                        setLoading(false);
                    });
            } catch (error) {
                logout();
                setLoading(false);
            }
        } else {
            setLoading(false);
        }
    }, []);

    const login = async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        setUser(data);
        return data;
    };

    const register = async (name, email, password, role) => {
        const { data } = await api.post('/auth/register', { name, email, password, role });
        localStorage.setItem('token', data.token);
        setUser(data);
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
