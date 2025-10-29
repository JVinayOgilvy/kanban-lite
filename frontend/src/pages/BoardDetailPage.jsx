import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, addBoardMember, fetchLists, createList, fetchCards, moveCard, updateCard } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ListColumn from '../components/ListColumn';
import CardDetailModal from '../components/CardDetailModal';

// dnd-kit imports
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCorners,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom';
import CardItem from '../components/CardItem';

// Socket.IO client import
import { io } from 'socket.io-client';

const BoardDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [cards, setCards] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [addMemberError, setAddMemberError] = useState('');
    const [addMemberSuccess, setAddMemberSuccess] = useState('');
    const [newListName, setNewListName] = useState('');
    const [createListError, setCreateListError] = useState('');

    const [activeId, setActiveId] = useState(null);
    const [selectedCard, setSelectedCard] = useState(null);

    // dnd-kit sensors configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        })
    );

    // Helper to find which list an ID (card or list) belongs to
    const findList = useCallback((itemId) => {
        if (lists.some(list => list._id === itemId)) {
            return itemId;
        }
        const listId = Object.keys(cards).find((key) =>
            cards[key].some((card) => card._id === itemId)
        );
        return listId || null;
    }, [lists, cards]);

    // Helper to get the currently dragged card for DragOverlay
    const activeCard = activeId ? Object.values(cards).flat().find(card => card._id === activeId) : null;

    const fetchAllBoardData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            setCreateListError('');

            const boardRes = await getBoard(id);
            setBoard(boardRes.data); // boardRes.data will contain populated members

            const listsRes = await fetchLists(id);
            const fetchedLists = listsRes.data;
            setLists(fetchedLists);

            const cardsPromises = fetchedLists.map(list => fetchCards(list._id));
            const cardsResponses = await Promise.all(cardsPromises);

            const cardsByList = {};
            cardsResponses.forEach((res, index) => {
                cardsByList[fetchedLists[index]._id] = res.data;
            });
            setCards(cardsByList);

        } catch (err) {
            console.error('Failed to fetch all board data:', err);
            setError(err.response?.data?.message || 'Failed to load board data.');
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        if (user) {
            fetchAllBoardData();
        }
    }, [user, fetchAllBoardData]);

    // --- Socket.IO Integration ---
    useEffect(() => {
        if (!id || !user) return;

        const socketUrl = import.meta.env.VITE_API_BASE_URL.replace('/api', '');
        const socket = io(socketUrl, {
            withCredentials: true,
        });

        socket.on('connect', () => {
            console.log('Socket.IO connected:', socket.id);
            socket.emit('joinBoard', id);
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
        });

        socket.on('cardCreated', (newCard) => {
            console.log('Real-time: cardCreated', newCard);
            setCards(prevCards => {
                const listCards = prevCards[newCard.list] || [];
                if (listCards.some(card => card._id === newCard._id)) {
                    return prevCards;
                }
                return {
                    ...prevCards,
                    [newCard.list]: [...listCards, newCard].sort((a, b) => a.order - b.order)
                };
            });
        });

        socket.on('cardMoved', ({ card, oldListId, newListId }) => {
            console.log('Real-time: cardMoved', { card, oldListId, newListId });
            setCards(prevCards => {
                const newCardsState = { ...prevCards };

                if (newCardsState[oldListId]) {
                    newCardsState[oldListId] = newCardsState[oldListId].filter(c => c._id !== card._id);
                }

                if (newCardsState[newListId]) {
                    const updatedListCards = [...newCardsState[newListId].filter(c => c._id !== card._id), card];
                    newCardsState[newListId] = updatedListCards.sort((a, b) => a.order - b.order);
                } else {
                    newCardsState[newListId] = [card];
                }

                return newCardsState;
            });
        });

        socket.on('cardDeleted', ({ _id, list, board }) => {
            console.log('Real-time: cardDeleted', { _id, list, board });
            setCards(prevCards => {
                const newCardsState = { ...prevCards };
                if (newCardsState[list]) {
                    newCardsState[list] = newCardsState[list].filter(c => c._id !== _id);
                }
                return newCardsState;
            });
        });

        socket.on('cardUpdated', (updatedCard) => {
            console.log('Real-time: cardUpdated', updatedCard);
            setCards(prevCards => {
                const newCardsState = { ...prevCards };
                const listId = updatedCard.list;
                if (newCardsState[listId]) {
                    newCardsState[listId] = newCardsState[listId].map(c =>
                        c._id === updatedCard._id ? updatedCard : c
                    );
                }
                // If the updated card is the one currently in the modal, update the modal's card too
                if (selectedCard && selectedCard._id === updatedCard._id) {
                    // To ensure the assignedTo and dueDate are fully populated in the modal
                    // we might need to fetch the card again or ensure the emitted card has full details.
                    // For now, we'll update with what's provided.
                    setSelectedCard(updatedCard);
                }
                return newCardsState;
            });
        });

        return () => {
            console.log('Leaving board room:', id);
            socket.emit('leaveBoard', id);
            socket.disconnect();
        };
    }, [id, user, selectedCard]);

    // --- End Socket.IO Integration ---

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
            const boardRes = await getBoard(id);
            setBoard(boardRes.data); // Update board state to reflect new member
        } catch (err) {
            console.error('Failed to add member:', err);
            setAddMemberError(err.response?.data?.message || 'Failed to add member.');
        }
    };

    const handleCreateList = async (e) => {
        e.preventDefault();
        setCreateListError('');
        if (!newListName.trim()) {
            setCreateListError('List title cannot be empty.');
            return;
        }

        try {
            const { data } = await createList(id, { title: newListName });
            setLists([...lists, data]);
            setCards(prevCards => ({ ...prevCards, [data._id]: [] }));
            setNewListName('');
        } catch (err) {
            console.error('Failed to create list:', err);
            setCreateListError(err.response?.data?.message || 'Failed to create list.');
        }
    };

    const handleCardCreated = (newCard) => {
        setCards(prevCards => {
            const listCards = prevCards[newCard.list] || [];
            if (listCards.some(card => card._id === newCard._id)) {
                return prevCards;
            }
            return {
                ...prevCards,
                [newCard.list]: [...listCards, newCard].sort((a, b) => a.order - b.order)
            };
        });
    };

    const handleCardClick = (card) => {
        setSelectedCard(card);
    };

    const handleCloseModal = () => {
        setSelectedCard(null);
    };

    const handleSaveCardDetails = async (cardId, updatedFields) => {
        try {
            // Optimistic UI update for the modal's card
            // We need to ensure assignedTo is a full user object if it changed,
            // or just the ID if it's being passed to the backend.
            // For the modal's display, we'll update the assignedTo property to reflect the member object.
            const assignedMember = updatedFields.assignedTo
                ? board.members.find(member => member._id === updatedFields.assignedTo)
                : null;

            setSelectedCard(prevCard => ({
                ...prevCard,
                ...updatedFields,
                assignedTo: assignedMember, // Update with the full member object for display
            }));

            // Call API to update card (send assignedTo as ID or null)
            await updateCard(cardId, {
                ...updatedFields,
                assignedTo: updatedFields.assignedTo || null, // Ensure it's ID or null for backend
            });

            // The Socket.IO 'cardUpdated' event will handle updating the main cards state
            // and will also update the modal's card if it's still open.
        } catch (err) {
            console.error('Failed to save card details:', err);
            setError('Failed to save card details. Please try again.');
            fetchAllBoardData(); // Revert UI by fetching fresh data
        }
    };

    // dnd-kit event handlers
    const onDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const onDragEnd = async (event) => {
        const { active, over } = event;

        if (!over) {
            setActiveId(null);
            return;
        }

        const activeCardId = active.id;
        const overItemId = over.id;

        const sourceListId = findList(activeCardId);
        const targetListId = findList(overItemId);

        if (!sourceListId || !targetListId) {
            console.warn("Drag operation involved an invalid list ID. SourceListId:", sourceListId, "TargetListId:", targetListId);
            setActiveId(null);
            return;
        }

        const draggedCard = cards[sourceListId].find(card => card._id === activeCardId);
        if (!draggedCard) {
            console.error("Dragged card not found in source list state.");
            setActiveId(null);
            return;
        }

        let newOrderIndex;
        const targetListCards = cards[targetListId];

        if (overItemId === targetListId) {
            newOrderIndex = targetListCards.length;
        } else {
            const overCardIndex = targetListCards.findIndex(card => card._id === overItemId);
            if (overCardIndex === -1) {
                newOrderIndex = targetListCards.length;
            } else {
                newOrderIndex = overCardIndex;
            }
        }

        // --- Optimistic UI Update ---
        setCards((prevCards) => {
            const newCardsState = { ...prevCards };

            const sourceCards = Array.from(newCardsState[sourceListId]);
            const destinationCards = Array.from(newCardsState[targetListId]);

            const activeIndex = sourceCards.findIndex((card) => card._id === activeCardId);
            if (activeIndex === -1) return prevCards;

            const [movedCard] = sourceCards.splice(activeIndex, 1);

            if (sourceListId === targetListId) {
                destinationCards.splice(newOrderIndex, 0, movedCard);
                newCardsState[sourceListId] = destinationCards;
            } else {
                movedCard.list = targetListId;
                newCardsState[sourceListId] = sourceCards;
                destinationCards.splice(newOrderIndex, 0, movedCard);
                newCardsState[targetListId] = destinationCards;
            }

            return newCardsState;
        });

        // --- Backend Update ---
        try {
            await moveCard(activeCardId, targetListId, newOrderIndex);
        } catch (err) {
            console.error('Failed to update card position on backend:', err);
            setError('Failed to update card position. Please refresh.');
            fetchAllBoardData();
        }

        setActiveId(null);
    };

    const onDragCancel = () => {
        setActiveId(null);
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

    const isOwner = user && board.owner && user._id === board.owner._id;

    return (
        <div style={styles.boardPageContainer}>
            <div style={styles.boardHeader}>
                <h2 style={styles.boardTitle}>{board.title}</h2>
                <Link to="/dashboard" style={styles.backButton}>Back to Dashboard</Link>
            </div>

            <div style={styles.boardMeta}>
                <p>Owner: <strong>{board.owner?.name} ({board.owner?.email})</strong></p>
                <div style={styles.membersSection}>
                    <h4>Members:</h4>
                    <ul style={styles.memberList}>
                        {board.members && board.members.length > 0 ? (
                            board.members.map((member) => (
                                <li key={member._id} style={styles.memberItem}>
                                    {member.name} ({member.email})
                                    {member._id === board.owner._id && <span style={styles.ownerTag}> (Owner)</span>}
                                </li>
                            ))
                        ) : (
                            <li>No members yet.</li>
                        )}
                    </ul>
                </div>
            </div>

            {isOwner && (
                <div style={styles.inviteMemberSection}>
                    <h4 style={styles.subHeading}>Invite New Member:</h4>
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

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={onDragCancel}
            >
                <div style={styles.listsContainer}>
                    {lists.sort((a, b) => a.order - b.order).map((list) => (
                        <ListColumn
                            key={list._id}
                            list={list}
                            cards={cards[list._id] || []}
                            onCardCreated={handleCardCreated}
                            onCardClick={handleCardClick}
                        />
                    ))}
                    <div style={styles.addListSection}>
                        <form onSubmit={handleCreateList} style={styles.addListForm}>
                            <input
                                type="text"
                                placeholder="Add a new list..."
                                value={newListName}
                                onChange={(e) => setNewListName(e.target.value)}
                                style={styles.addListInput}
                                required
                            />
                            <button type="submit" style={styles.addListButton}>Add List</button>
                            {createListError && <p style={styles.error}>{createListError}</p>}
                        </form>
                    </div>
                </div>

                {/* DragOverlay for custom visual feedback during drag */}
                {createPortal(
                    <DragOverlay>
                        {activeCard ? <CardItem card={activeCard} onCardClick={() => { }} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>

            {/* Card Detail Modal */}
            {selectedCard && (
                <CardDetailModal
                    card={selectedCard}
                    onClose={handleCloseModal}
                    onSave={handleSaveCardDetails}
                    boardMembers={board.members} /* <--- Pass board members here */
                />
            )}
        </div>
    );
};

const styles = {
    boardPageContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0079bf',
        padding: '20px',
        overflowX: 'auto',
    },
    boardHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        paddingBottom: '10px',
        borderBottom: '1px solid rgba(255,255,255,0.3)',
    },
    boardTitle: {
        color: 'white',
        fontSize: '2.5em',
        margin: 0,
    },
    backButton: {
        display: 'inline-block',
        padding: '8px 15px',
        backgroundColor: 'rgba(255,255,255,0.2)',
        color: 'white',
        textDecoration: 'none',
        borderRadius: '5px',
        transition: 'background-color 0.2s ease-in-out',
    },
    backButtonHover: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    boardMeta: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        color: 'white',
        fontSize: '0.9em',
    },
    membersSection: {
        marginTop: '10px',
    },
    memberList: {
        listStyleType: 'none',
        padding: 0,
        margin: '5px 0',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px',
        justifyContent: 'center',
    },
    memberItem: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: '4px',
        padding: '5px 10px',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
    },
    ownerTag: {
        backgroundColor: '#f4d03f',
        color: '#333',
        padding: '2px 6px',
        borderRadius: '3px',
        fontSize: '0.75em',
        fontWeight: 'bold',
    },
    inviteMemberSection: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '15px',
        marginBottom: '20px',
        color: 'white',
        textAlign: 'center',
    },
    subHeading: {
        color: 'white',
        fontSize: '1.2em',
        marginBottom: '10px',
    },
    inviteForm: {
        display: 'flex',
        justifyContent: 'center',
        gap: '10px',
    },
    inviteInput: {
        padding: '8px',
        border: 'none',
        borderRadius: '4px',
        width: '200px',
    },
    inviteButton: {
        backgroundColor: '#5aac44',
        color: 'white',
        padding: '8px 12px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease-in-out',
    },
    inviteButtonHover: {
        backgroundColor: '#4a9a34',
    },
    error: {
        color: '#ffdddd',
        backgroundColor: 'rgba(255,0,0,0.3)',
        padding: '5px 10px',
        borderRadius: '4px',
        marginTop: '10px',
        fontSize: '0.9em',
    },
    success: {
        color: '#ddffdd',
        backgroundColor: 'rgba(0,255,0,0.3)',
        padding: '5px 10px',
        borderRadius: '4px',
        marginTop: '10px',
        fontSize: '0.9em',
    },
    loading: {
        textAlign: 'center',
        marginTop: '50px',
        fontSize: '1.2em',
        color: 'white',
    },
    message: {
        textAlign: 'center',
        marginTop: '30px',
        fontSize: '1.1em',
        color: 'white',
    },
    listsContainer: {
        display: 'flex',
        flexGrow: 1,
        alignItems: 'flex-start',
        paddingBottom: '10px',
    },
    addListSection: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: '8px',
        padding: '10px',
        width: '300px',
        minWidth: '300px',
        margin: '0 10px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addListForm: {
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
    },
    addListInput: {
        padding: '10px',
        border: 'none',
        borderRadius: '4px',
        width: 'calc(100% - 20px)',
        fontSize: '1em',
    },
    addListButton: {
        backgroundColor: '#5aac44',
        color: 'white',
        padding: '10px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
        transition: 'background-color 0.2s ease-in-out',
    },
    addListButtonHover: {
        backgroundColor: '#4a9a34',
    },
};
export default BoardDetailPage;