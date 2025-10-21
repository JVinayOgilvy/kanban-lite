import React from 'react';

const CardItem = ({ card }) => {
    console.log('Rendering CardItem for card:', card);
    const dueDate = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    return (
        <div style={styles.card}>
            <h4 style={styles.title}>{card.title}</h4>
            {card.description && <p style={styles.description}>{card.description}</p>}
            {card.assignedTo && (
                <p style={styles.assignedTo}>Assigned to: {card.assignedTo.name}</p>
            )}
            <p style={styles.dueDate}>Due: {dueDate}</p>
            {/* We'll add more interactivity (e.g., click to open modal) later */}
        </div>
    );
};

const styles = {
    card: {
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '8px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        cursor: 'grab', // Indicates it's draggable
        transition: 'background-color 0.2s ease-in-out',
    },
    cardHover: {
        backgroundColor: '#f0f0f0',
    },
    title: {
        fontSize: '1em',
        fontWeight: 'bold',
        marginBottom: '5px',
        color: '#333',
    },
    description: {
        fontSize: '0.85em',
        color: '#666',
        marginBottom: '5px',
        whiteSpace: 'pre-wrap', // Preserves whitespace and line breaks
    },
    assignedTo: {
        fontSize: '0.8em',
        color: '#555',
        marginBottom: '3px',
    },
    dueDate: {
        fontSize: '0.8em',
        color: '#777',
    },
};

export default CardItem;