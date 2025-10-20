import React, { createContext, useState, useEffect, useContext } from 'react';
import API from '../api/api'; // Our axios instance

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true); // To indicate if initial user check is done

    useEffect(() => {
        // Check for user in localStorage on initial load
        const storedProfile = localStorage.getItem('profile');
        if (storedProfile) {
            const profile = JSON.parse(storedProfile);
            // Basic check for token expiry (can be more robust)
            const token = profile.token;
            if (token) {
                // You might want to decode the token here to check expiry
                // For now, we'll just assume it's valid if present
                setUser(profile);
            } else {
                localStorage.removeItem('profile');
            }
        }
        setLoading(false);
    }, []);

    const login = async (formData) => {
        try {
            const { data } = await API.post('/auth/login', formData);
            localStorage.setItem('profile', JSON.stringify(data));
            setUser(data);
            return { success: true };
        } catch (error) {
            console.error('Login error:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (formData) => {
        try {
            const { data } = await API.post('/auth/register', formData);
            localStorage.setItem('profile', JSON.stringify(data));
            setUser(data);
            return { success: true };
        } catch (error) {
            console.error('Register error:', error.response?.data || error.message);
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('profile');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);