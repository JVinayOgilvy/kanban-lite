import React from 'react';
import { Link } from 'react-router-dom';

const BoardCard = ({ board }) => {
    console.log('Rendering BoardCard for board:', board);
    return (
        <div style={styles.card}>
            <h3 style={styles.title}>{board.title}</h3>
            <p style={styles.owner}>Owner: {board.owner?.name || 'N/A'}</p>
            <p style={styles.members}>Members: {board.members?.length || 0}</p>
            <Link to={`/board/${board._id}`} style={styles.linkButton}>
                Go to Board
            </Link>
        </div>
    );
};

const styles = {
    card: {
        backgroundColor: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        padding: '20px',
        margin: '15px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
        width: '280px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        transition: 'transform 0.2s ease-in-out',
    },
    cardHover: {
        transform: 'translateY(-5px)',
    },
    title: {
        fontSize: '1.5em',
        marginBottom: '10px',
        color: '#333',
    },
    owner: {
        fontSize: '0.9em',
        color: '#666',
        marginBottom: '5px',
    },
    members: {
        fontSize: '0.9em',
        color: '#666',
        marginBottom: '15px',
    },
    linkButton: {
        display: 'block',
        width: '100%',
        padding: '10px 15px',
        backgroundColor: '#007bff',
        color: 'white',
        textAlign: 'center',
        borderRadius: '5px',
        textDecoration: 'none',
        marginTop: '10px',
        transition: 'background-color 0.2s ease-in-out',
    },
    linkButtonHover: {
        backgroundColor: '#0056b3',
    },
};

export default BoardCard;