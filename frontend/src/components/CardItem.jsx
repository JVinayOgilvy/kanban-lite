import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- NEW: Import CSS Module ---
import styles from '../assets/css/components/CardItem.module.css';

const CardItem = ({ card, onCardClick }) => {
    const dueDate = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: card._id });

    // Apply transform and transition for smooth dragging dynamically
    const dynamicStyle = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div
            ref={setNodeRef}
            // Merge dynamic styles with CSS module classes
            style={dynamicStyle}
            className={`${styles.card} ${isDragging ? styles.cardDragging : ''}`}
            {...attributes}
            {...listeners}
            onClick={() => onCardClick(card)}
        >
            <h4 className={styles.title}>{card.title}</h4>
            {card.description && <p className={styles.description}>{card.description}</p>}
            {card.assignedTo && (
                <p className={styles.assignedTo}>Assigned to: {card.assignedTo.name}</p>
            )}
            <p className={styles.dueDate}>Due: {dueDate}</p>
        </div>
    );
};

export default CardItem;