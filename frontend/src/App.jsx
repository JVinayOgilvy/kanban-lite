import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage'; // Our placeholder dashboard

// A simple PrivateRoute component
const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading user...</div>;
  }

  return user ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          {/* Redirect root to login or dashboard based on auth status */}
          <Route path="/" element={<AuthRedirect />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

// Helper component to redirect based on auth status
const AuthRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ textAlign: 'center', marginTop: '50px' }}>Loading...</div>;
  return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />;
};

export default App;