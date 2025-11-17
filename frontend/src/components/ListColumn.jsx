import React, { useState } from 'react';
import CardItem from './CardItem';
import { createCard } from '../api/api';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// --- NEW: Import CSS Module ---
import styles from '../assets/css/components/ListColumn.module.css';

// Add currentUserRole prop
const ListColumn = ({ list, cards, onCardCreated, onCardClick, currentUserRole }) => {
    console.log('Rendering ListColumn for list:', list, 'with cards:', cards, 'and currentUserRole:', currentUserRole);
    const [newCardTitle, setNewCardTitle] = useState('');
    const [error, setError] = useState('');

    const { setNodeRef, isOver } = useDroppable({
        id: list._id,
    });

    // Helper to determine if current user has at least a certain role (simplified for component)
    const hasRequiredRole = (requiredRole) => {
        const roles = ['member', 'admin', 'owner'];
        return roles.indexOf(currentUserRole) >= roles.indexOf(requiredRole);
    };

    const canCreateCard = hasRequiredRole('member'); // Any member can create cards
    const canDeleteCard = hasRequiredRole('admin'); // Admin or owner can delete cards (for future use)

    const handleCreateCard = async (e) => {
        e.preventDefault();
        setError('');
        if (!newCardTitle.trim()) {
            setError('Card title cannot be empty.');
            return;
        }

        try {
            const { data } = await createCard(list._id, { title: newCardTitle });
            setNewCardTitle('');
            if (onCardCreated) {
                onCardCreated(data);
            }
        } catch (err) {
            console.error('Failed to create card:', err);
            setError(err.response?.data?.message || 'Failed to create card.');
        }
    };

    return (
        <div className={styles.listColumn}>
            <h3 className={styles.listTitle}>{list.title}</h3>
            <div
                ref={setNodeRef}
                className={`${styles.cardsContainer} ${isOver ? styles.cardsContainerDraggingOver : ''}`}
            >
                <SortableContext items={cards.map(card => card._id)} strategy={verticalListSortingStrategy}>
                    {cards.length === 0 ? (
                        <p className={styles.noCardsMessage}>No cards in this list.</p>
                    ) : (
                        cards.map((card) => (
                            <CardItem key={card._id} card={card} onCardClick={onCardClick} currentUserRole={currentUserRole} />
                        ))
                    )}
                </SortableContext>
            </div>
            {canCreateCard && ( // Conditionally render "Add Card" form
                <form onSubmit={handleCreateCard} className={styles.addCardForm}>
                    <input
                        type="text"
                        placeholder="Add a new card..."
                        value={newCardTitle}
                        onChange={(e) => setNewCardTitle(e.target.value)}
                        className={styles.addCardInput}
                        required
                    />
                    <button type="submit" className={styles.addCardButton}>Add Card</button>
                    {error && <p className={styles.error}>{error}</p>}
                </form>
            )}
        </div>
    );
};

export default ListColumn;