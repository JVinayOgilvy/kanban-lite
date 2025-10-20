import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, addBoardMember } from '../api/api'; // Import API functions
import { useAuth } from '../context/AuthContext'; // Import useAuth to check owner

const BoardDetailPage = () => {
    const { id } = useParams(); // Get the board ID from the URL
    const { user } = useAuth(); // Get current authenticated user
    const [board, setBoard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [addMemberError, setAddMemberError] = useState('');
    const [addMemberSuccess, setAddMemberSuccess] = useState('');

    // Function to fetch board details
    const fetchBoardDetails = async () => {
        try {
            setLoading(true);
            setError('');
            const { data } = await getBoard(id);
            setBoard(data);
        } catch (err) {
            console.error('Failed to fetch board details:', err);
            setError(err.response?.data?.message || 'Failed to load board details.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) { // Only fetch if user is logged in
            fetchBoardDetails();
        }
    }, [id, user]); // Re-fetch if board ID or user changes

    const handleInviteMember = async (e) => {
        e.preventDefault();
        setAddMemberError('');
        setAddMemberSuccess('');
        if (!newMemberEmail.trim()) {
            setAddMemberError('Email cannot be empty.');
            return;
        }

        try {
            await addBoardMember(id, newMemberEmail);
            setNewMemberEmail('');
            setAddMemberSuccess('Member invited successfully!');
            // Re-fetch board details to update the members list
            fetchBoardDetails();
        } catch (err) {
            console.error('Failed to add member:', err);
            setAddMemberError(err.response?.data?.message || 'Failed to add member.');
        }
    };

    if (loading) {
        return <p style={styles.loading}>Loading board details...</p>;
    }

    if (error) {
        return (
            <div style={styles.container}>
                <p style={styles.error}>{error}</p>
                <Link to="/dashboard" style={styles.backButton}>Back to Dashboard</Link>
            </div>
        );
    }

    if (!board) {
        return (
            <div style={styles.container}>
                <p style={styles.message}>Board not found.</p>
                <Link to="/dashboard" style={styles.backButton}>Back to Dashboard</Link>
            </div>
        );
    }

    // Check if the current user is the owner of the board
    const isOwner = user && board.owner && user._id === board.owner._id;

    return (
        <div style={styles.container}>
            <h2 style={styles.heading}>{board.title}</h2>
            <p style={styles.text}>Board ID: <strong>{board._id}</strong></p>
            <p style={styles.text}>Owner: <strong>{board.owner?.name} ({board.owner?.email})</strong></p>

            <div style={styles.section}>
                <h3 style={styles.subHeading}>Members:</h3>
                {board.members && board.members.length > 0 ? (
                    <ul style={styles.memberList}>
                        {board.members.map((member) => (
                            <li key={member._id} style={styles.memberItem}>
                                {member.name} ({member.email})
                                {member._id === board.owner._id && <span style={styles.ownerTag}> (Owner)</span>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p style={styles.message}>No members yet.</p>
                )}
            </div>

            {isOwner && ( // Only show "Add Member" form if current user is the board owner
                <div style={styles.section}>
                    <h3 style={styles.subHeading}>Invite New Member:</h3>
                    <form onSubmit={handleInviteMember} style={styles.inviteForm}>
                        <input
                            type="email"
                            placeholder="Enter member's email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            style={styles.inviteInput}
                            required
                        />
                        <button type="submit" style={styles.inviteButton}>Invite</button>
                    </form>
                    {addMemberError && <p style={styles.error}>{addMemberError}</p>}
                    {addMemberSuccess && <p style={styles.success}>{addMemberSuccess}</p>}
                </div>
            )}

            <Link to="/dashboard" style={styles.backButton}>Back to Dashboard</Link>
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
    loading: {
        textAlign: 'center',
        marginTop: '50px',
        fontSize: '1.2em',
        color: '#555',
    },
    error: {
        color: 'red',
        textAlign: 'center',
        marginTop: '20px',
        fontSize: '1.1em',
    },
    success: {
        color: 'green',
        textAlign: 'center',
        marginTop: '10px',
        fontSize: '0.9em',
    },
    message: {
        textAlign: 'center',
        marginTop: '30px',
        fontSize: '1.1em',
        color: '#777',
    },
    heading: {
        color: '#333',
        marginBottom: '15px',
        fontSize: '2em',
    },
    subHeading: {
        color: '#444',
        marginTop: '30px',
        marginBottom: '15px',
        fontSize: '1.5em',
    },
    text: {
        color: '#555',
        marginBottom: '10px',
    },
    section: {
        marginTop: '20px',
        padding: '15px',
        borderTop: '1px solid #eee',
    },
    memberList: {
        listStyleType: 'none',
        padding: 0,
        margin: '10px 0',
    },
    memberItem: {
        backgroundColor: '#f8f9fa',
        border: '1px solid #e9ecef',
        borderRadius: '4px',
        padding: '8px 12px',
        marginBottom: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '5px',
    },
    ownerTag: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '0.75em',
        fontWeight: 'bold',
    },
    inviteForm: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
        marginTop: '15px',
    },
    inviteInput: {
        padding: '10px',
        border: '1px solid #ced4da',
        borderRadius: '4px',
        width: '250px',
        fontSize: '1em',
    },
    inviteButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.2s ease-in-out',
    },
    inviteButtonHover: {
        backgroundColor: '#218838',
    },
    backButton: {
        display: 'inline-block',
        marginTop: '30px',
        padding: '10px 20px',
        backgroundColor: '#6c757d',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '5px',
        transition: 'background-color 0.2s ease-in-out',
    },
    backButtonHover: {
        backgroundColor: '#5a6268',
    },
};

export default BoardDetailPage;