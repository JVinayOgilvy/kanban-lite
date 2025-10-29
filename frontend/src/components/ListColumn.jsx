import React, { useState } from 'react';
import CardItem from './CardItem';
import { createCard } from '../api/api';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

// --- NEW: Import CSS Module ---
import styles from '../assets/css/components/ListColumn.module.css';

const ListColumn = ({ list, cards, onCardCreated, onCardClick }) => {
    const [newCardTitle, setNewCardTitle] = useState('');
    const [error, setError] = useState('');

    const { setNodeRef, isOver } = useDroppable({
        id: list._id,
    });

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
                            <CardItem key={card._id} card={card} onCardClick={onCardClick} />
                        ))
                    )}
                </SortableContext>
            </div>
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
        </div>
    );
};

export default ListColumn;