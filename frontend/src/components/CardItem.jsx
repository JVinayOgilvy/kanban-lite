import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Add onCardClick prop
const CardItem = ({ card, onCardClick }) => {
     console.log('Rendering CardItem from components for card:', card); // Can remove this debug log now
    const dueDate = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card._id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...styles.card,
        ...(isDragging ? styles.cardDragging : {}),
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => onCardClick(card)} // <--- Add onClick handler
        >
            <h4 style={styles.title}>{card.title}</h4>
            {card.description && <p style={styles.description}>{card.description}</p>}
            {card.assignedTo && (
                <p style={styles.assignedTo}>Assigned to: {card.assignedTo.name}</p>
            )}
            <p style={styles.dueDate}>Due: {dueDate}</p>
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
        cursor: 'grab', // Keep grab cursor for dragging
        transition: 'background-color 0.2s ease-in-out',
        position: 'relative',
        zIndex: 0,
    },
    cardDragging: {
        backgroundColor: '#e0f7fa',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        transform: 'rotate(2deg)',
        zIndex: 100,
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
        whiteSpace: 'pre-wrap',
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