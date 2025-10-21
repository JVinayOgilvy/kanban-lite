import React, { useState } from 'react';
import CardItem from './CardItem';
import { createCard } from '../api/api';
import { Droppable } from 'react-beautiful-dnd'; // <-- Import Droppable

const ListColumn = ({ list, cards, onCardCreated }) => {
    const [newCardTitle, setNewCardTitle] = useState('');
    const [error, setError] = useState('');

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
        <div style={styles.listColumn}>
            <h3 style={styles.listTitle}>{list.title}</h3>
            {/* 1. Wrap with Droppable */}
            <Droppable droppableId={list._id}>
                {(provided, snapshot) => ( // 2. Render prop pattern
                    <div
                        ref={provided.innerRef} // 3. Attach innerRef
                        {...provided.droppableProps} // 4. Attach droppableProps
                        style={{
                            ...styles.cardsContainer,
                            ...(snapshot.isDraggingOver ? styles.cardsContainerDraggingOver : {}), // 5. Apply dragging over styles
                        }}
                    >
                        {cards.length === 0 ? (
                            <p style={styles.noCardsMessage}>No cards in this list.</p>
                        ) : (
                            cards.map((card, index) => ( // 6. Pass 'index' to CardItem
                                <CardItem key={card._id} card={card} index={index} />
                            ))
                        )}
                        {provided.placeholder} {/* 7. Placeholder for draggable item */}
                    </div>
                )}
            </Droppable>
            <form onSubmit={handleCreateCard} style={styles.addCardForm}>
                <input
                    type="text"
                    placeholder="Add a new card..."
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    style={styles.addCardInput}
                    required
                />
                <button type="submit" style={styles.addCardButton}>Add Card</button>
                {error && <p style={styles.error}>{error}</p>}
            </form>
        </div>
    );
};

const styles = {
    listColumn: {
        backgroundColor: '#ebecf0',
        borderRadius: '8px',
        padding: '10px',
        width: '300px',
        minWidth: '300px',
        margin: '0 10px',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: 'calc(100vh - 150px)',
        overflowY: 'auto',
    },
    listTitle: {
        fontSize: '1.2em',
        fontWeight: 'bold',
        marginBottom: '10px',
        color: '#333',
        padding: '0 5px',
    },
    cardsContainer: {
        flexGrow: 1,
        minHeight: '50px',
        padding: '0 5px',
        transition: 'background-color 0.2s ease-in-out',
    },
    cardsContainerDraggingOver: { // NEW: Style for when a draggable item is over this droppable area
        backgroundColor: '#cce0ff', // Light blue background
    },
    noCardsMessage: {
        fontSize: '0.9em',
        color: '#777',
        textAlign: 'center',
        marginTop: '20px',
    },
    addCardForm: {
        marginTop: '10px',
        padding: '0 5px',
    },
    addCardInput: {
        width: 'calc(100% - 22px)',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px',
        marginBottom: '5px',
        fontSize: '0.9em',
    },
    addCardButton: {
        backgroundColor: '#5aac44',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '0.9em',
        width: '100%',
        transition: 'background-color 0.2s ease-in-out',
    },
    addCardButtonHover: {
        backgroundColor: '#4a9a34',
    },
    error: {
        color: 'red',
        fontSize: '0.8em',
        marginTop: '5px',
        textAlign: 'center',
    },
};

export default ListColumn;