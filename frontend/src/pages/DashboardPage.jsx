import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    if (!user) {
        return <p style={{ textAlign: 'center', marginTop: '50px' }}>Please log in to view the dashboard.</p>;
    }

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>Welcome to your Dashboard, {user.name}!</h2>
            <p style={styles.text}>You are logged in as: {user.email}</p>
            <button onClick={handleLogout} style={styles.button}>Logout</button>
            {/* <p style={styles.note}>
                (This is a placeholder. We'll build out the board listing here next!)
            </p> */}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '800px',
        margin: '50px auto',
        padding: '20px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        backgroundColor: '#fff',
        textAlign: 'center',
    },
    heading: {
        color: '#333',
        marginBottom: '15px',
    },
    text: {
        color: '#555',
        marginBottom: '20px',
    },
    button: {
        backgroundColor: '#dc3545', // Red for logout
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '16px',
        marginTop: '10px',
    },
    buttonHover: {
        backgroundColor: '#c82333',
    },
    note: {
        marginTop: '30px',
        color: '#888',
        fontSize: '0.9em',
    }
};

export default DashboardPage;