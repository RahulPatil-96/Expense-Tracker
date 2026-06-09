import { createContext, useContext, useEffect, useState } from 'react';
import api from '../lib/axios.js';
import { API_PATHS } from '../utils/apiPaths.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    
    // Theme & AI Global States
    // Default theme follows the system preference when the user has not saved an override.
    const getInitialTheme = () => {
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return saved;

        return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    };

    const [theme, setTheme] = useState(getInitialTheme);
    const [aiActive, setAiActive] = useState(localStorage.getItem('aiActive') !== 'false');

    useEffect(() => {
        const applyResolvedTheme = (resolved) => {
            if (resolved === 'dark') {
                document.body.classList.add('dark');
                document.documentElement.classList.add('dark');
            } else {
                document.body.classList.remove('dark');
                document.documentElement.classList.remove('dark');
            }
        };

        applyResolvedTheme(theme);
    }, [theme]);

    useEffect(() => {
        // If user has an explicit override, do not follow system changes.
        const saved = localStorage.getItem('theme');
        if (saved === 'light' || saved === 'dark') return;

        const mql = window.matchMedia?.('(prefers-color-scheme: dark)');
        if (!mql) return;

        const handler = () => {
            setTheme(mql.matches ? 'dark' : 'light');
        };

        // Set immediately in case system preference changed since initial render.
        handler();
        if (mql.addEventListener) mql.addEventListener('change', handler);
        else mql.addListener(handler);

        return () => {
            if (mql.removeEventListener) mql.removeEventListener('change', handler);
            else mql.removeListener(handler);
        };
    }, []);


    const toggleTheme = () => {
        const next = theme === 'light' ? 'dark' : 'light';
        setTheme(next);
        localStorage.setItem('theme', next);
    };

    const toggleAi = () => {
        const next = !aiActive;
        setAiActive(next);
        localStorage.setItem('aiActive', String(next));
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            setLoading(false);
            return;
        }
        api.get(API_PATHS.AUTH.ME)
            .then((res) => setUser(res.data))
            .catch(() => localStorage.removeItem('token'))
            .finally(() => setLoading(false));
    }, []);

    const login = async (email, password) => {
        const res = await api.post(API_PATHS.AUTH.LOGIN, { email, password });
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
    };

    const register = async (payload) => {
        const res = await api.post(API_PATHS.AUTH.REGISTER, payload);
        localStorage.setItem('token', res.data.token);
        setUser(res.data.user);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, theme, toggleTheme, aiActive, toggleAi }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
