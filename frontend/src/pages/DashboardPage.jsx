import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { fetchBoards, createBoard } from '../api/api'; // Import new API functions
import BoardCard from '../components/BoardCard'; // Import BoardCard component

const DashboardPage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [boards, setBoards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newBoardTitle, setNewBoardTitle] = useState('');
    const [showCreateForm, setShowCreateForm] = useState(false); // State to toggle create form visibility

    useEffect(() => {
        const getBoards = async () => {
            try {
                const { data } = await fetchBoards();
                setBoards(data);
            } catch (err) {
                console.error('Failed to fetch boards:', err);
                setError('Failed to load boards. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        if (user) { // Only fetch boards if user is logged in
            getBoards();
        } else {
            setLoading(false); // If no user, stop loading and wait for redirect
        }
    }, [user]); // Re-run when user state changes

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoardTitle.trim()) {
            setError('Board title cannot be empty.');
            return;
        }
        try {
            const { data } = await createBoard({ title: newBoardTitle });
            setBoards([...boards, data]); // Add new board to the list
            setNewBoardTitle(''); // Clear input
            setShowCreateForm(false); // Hide form
            setError(''); // Clear any previous errors
        } catch (err) {
            console.error('Failed to create board:', err);
            setError('Failed to create board. Please try again.');
        }
    };

    if (loading) {
        return <p style={styles.loading}>Loading boards...</p>;
    }

    if (!user) {
        // This case should ideally be handled by PrivateRoute, but good for defensive coding
        return <p style={styles.message}>Please log in to view the dashboard.</p>;
    }

    return (
        <div style={styles.container}>
            <div style={styles.header}>
                <h2 style={styles.heading}>Welcome, {user.name}!</h2>
                <button onClick={handleLogout} style={styles.logoutButton}>Logout</button>
            </div>

            <div style={styles.createBoardSection}>
                <button onClick={() => setShowCreateForm(!showCreateForm)} style={styles.createBoardButton}>
                    {showCreateForm ? 'Cancel' : 'Create New Board'}
                </button>
                {showCreateForm && (
                    <form onSubmit={handleCreateBoard} style={styles.createBoardForm}>
                        <input
                            type="text"
                            placeholder="Enter board title"
                            value={newBoardTitle}
                            onChange={(e) => setNewBoardTitle(e.target.value)}
                            style={styles.createBoardInput}
                            required
                        />
                        <button type="submit" style={styles.createBoardSubmitButton}>Add Board</button>
                    </form>
                )}
                {error && <p style={styles.error}>{error}</p>}
            </div>

            <h3 style={styles.subHeading}>Your Boards</h3>
            {boards.length === 0 ? (
                <p style={styles.message}>You don't have any boards yet. Create one!</p>
            ) : (
                <div style={styles.boardsGrid}>
                    {boards.map((board) => (
                        <BoardCard key={board._id} board={board} />
                    ))}
                </div>
            )}
        </div>
    );
};

const styles = {
    container: {
        maxWidth: '1200px',
        margin: '50px auto',
        padding: '20px',
        backgroundColor: '#f9f9f9',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '30px',
        borderBottom: '1px solid #eee',
        paddingBottom: '20px',
    },
    heading: {
        color: '#333',
        margin: 0,
    },
    logoutButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.2s ease-in-out',
    },
    logoutButtonHover: {
        backgroundColor: '#c82333',
    },
    createBoardSection: {
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        textAlign: 'center',
    },
    createBoardButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '12px 20px',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '1.1em',
        marginBottom: '15px',
        transition: 'background-color 0.2s ease-in-out',
    },
    createBoardButtonHover: {
        backgroundColor: '#218838',
    },
    createBoardForm: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '10px',
    },
    createBoardInput: {
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        width: '300px',
        fontSize: '1em',
    },
    createBoardSubmitButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.2s ease-in-out',
    },
    createBoardSubmitButtonHover: {
        backgroundColor: '#0056b3',
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginTop: '10px',
        fontSize: '0.9em',
    },
    subHeading: {
        fontSize: '1.8em',
        color: '#333',
        marginBottom: '25px',
        textAlign: 'center',
    },
    boardsGrid: {
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '20px',
    },
    loading: {
        textAlign: 'center',
        marginTop: '50px',
        fontSize: '1.2em',
        color: '#555',
    },
    message: {
        textAlign: 'center',
        marginTop: '30px',
        fontSize: '1.1em',
        color: '#777',
    },
};

export default DashboardPage;