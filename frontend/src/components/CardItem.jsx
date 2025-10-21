import React from 'react';
import { Draggable } from 'react-beautiful-dnd'; // <-- Import Draggable

const CardItem = ({ card, index }) => { // <-- Receive 'index' prop
    console.log('Rendering CardItem from Components for card:', card);
    const dueDate = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    return (
        // 1. Wrap with Draggable
        <Draggable draggableId={card._id} index={index}>
            {(provided, snapshot) => ( // 2. Render prop pattern
                <div
                    ref={provided.innerRef} // 3. Attach innerRef
                    {...provided.draggableProps} // 4. Attach draggableProps
                    {...provided.dragHandleProps} // 5. Attach dragHandleProps
                    style={{
                        ...styles.card,
                        ...(snapshot.isDragging ? styles.cardDragging : {}), // 6. Apply dragging styles
                        ...provided.draggableProps.style, // 7. Apply dnd-specific styles
                    }}
                >
                    <h4 style={styles.title}>{card.title}</h4>
                    {card.description && <p style={styles.description}>{card.description}</p>}
                    {card.assignedTo && (
                        <p style={styles.assignedTo}>Assigned to: {card.assignedTo.name}</p>
                    )}
                    <p style={styles.dueDate}>Due: {dueDate}</p>
                </div>
            )}
        </Draggable>
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
    },
    cardDragging: { // NEW: Style for when a card is being dragged
        backgroundColor: '#e0f7fa', // Light blue background
        boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
        transform: 'rotate(2deg)', // Slight rotation for visual feedback
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