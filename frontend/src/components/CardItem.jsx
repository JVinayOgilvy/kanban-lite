import React from 'react';
import { useSortable } from '@dnd-kit/sortable'; // <-- Import useSortable
import { CSS } from '@dnd-kit/utilities'; // <-- Import CSS utilities

const CardItem = ({ card }) => { 
    console.log('Rendering CardItem from components for card:', card);
    const dueDate = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    // 1. Use the useSortable hook
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging, // dnd-kit provides this for styling
    } = useSortable({ id: card._id }); // Use card._id as the unique ID

    // 2. Apply transform and transition for smooth dragging
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        ...styles.card, // Merge with our base styles
        ...(isDragging ? styles.cardDragging : {}), // Apply dragging styles
    };

    return (
        <div
            ref={setNodeRef} // 3. Attach the ref
            style={style}
            {...attributes} // 4. Attach accessibility attributes
            {...listeners} // 5. Attach event listeners for dragging
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
        cursor: 'grab',
        transition: 'background-color 0.2s ease-in-out',
        position: 'relative', // Needed for transform to work correctly
        zIndex: 0, // Default z-index
    },
    cardDragging: {
        backgroundColor: '#e0f7fa',
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        transform: 'rotate(2deg)',
        zIndex: 100, // Bring dragged card to front
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