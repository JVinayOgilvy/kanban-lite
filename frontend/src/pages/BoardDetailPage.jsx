import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, addBoardMember, fetchLists, createList, fetchCards, moveCard, updateCard, updateBoardMemberRole } from '../api/api'; // <--- NEW: updateBoardMemberRole
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

// --- NEW: Import CSS Module ---
import styles from '../assets/css/pages/BoardDetailPage.module.css';

const BoardDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth(); // `user` from AuthContext is the current user
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

    console.log('Rendering BoardDetailPage for board ID:', id, 'with user:', user, 'board state:', board);

    // Helper to determine if current user has at least a certain role
    const hasRequiredRole = useCallback((requiredRole) => {
        if (!board || !user) return false;
        const currentUserEntry = board.members.find(m => m.user._id === user._id);
        if (!currentUserEntry) return false; // Not a member
        const roles = ['member', 'admin', 'owner'];
        return roles.indexOf(currentUserEntry.role) >= roles.indexOf(requiredRole);
    }, [board, user]);

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
            setBoard(boardRes.data);

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
                if (selectedCard && selectedCard._id === updatedCard._id) {
                    setSelectedCard(updatedCard);
                }
                return newCardsState;
            });
        });

        // --- Listen for commentCreated event ---
        socket.on('commentCreated', (newComment) => {
            console.log('Real-time: commentCreated', newComment);
            // If the modal is open for the card this comment belongs to, update its comments
            if (selectedCard && selectedCard._id === newComment.card) {
                // To ensure the modal's internal comments state is updated,
                // we need to trigger a re-fetch of comments in the modal.
                // The CardDetailModal's useEffect already does this if `card` prop changes.
                // Since `selectedCard` is updated by `cardUpdated` event, this will naturally trigger.
                // For comments, we might need a more direct way if `selectedCard` itself isn't changing.
                // For now, let's assume `selectedCard` might get updated or the modal will re-fetch.
                // A more robust solution would be to pass a `refreshComments` function to the modal.
            }
        });

        // --- NEW: Listen for boardUpdated event (for member role changes) ---
        socket.on('boardUpdated', (updatedBoard) => {
            console.log('Real-time: boardUpdated', updatedBoard);
            if (board && board._id === updatedBoard._id) {
                setBoard(updatedBoard); // Update the board state with new member roles
            }
        });
        // --- END NEW: Listen for boardUpdated event ---

        return () => {
            console.log('Leaving board room:', id);
            socket.emit('leaveBoard', id);
            socket.disconnect();
        };
    }, [id, user, selectedCard, board]); // Add `board` to dependencies for boardUpdated event

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
            const { data } = await addBoardMember(id, newMemberEmail);
            setNewMemberEmail('');
            setAddMemberSuccess('Member invited successfully!');
            setBoard(data); // Update board state directly from API response
        } catch (err) {
            console.error('Failed to add member:', err);
            setAddMemberError(err.response?.data?.message || 'Failed to add member.');
        }
    };

    // --- NEW: Handle Role Change ---
    const handleRoleChange = async (memberId, newRole) => {
        try {
            const { data } = await updateBoardMemberRole(id, memberId, newRole);
            setBoard(data); // Update board state directly from API response
        } catch (err) {
            console.error('Failed to update member role:', err);
            setError(err.response?.data?.message || 'Failed to update member role.');
        }
    };
    // --- END NEW: Handle Role Change ---

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
            const assignedMember = updatedFields.assignedTo
                ? board.members.find(member => member.user._id === updatedFields.assignedTo)?.user // Find the user object within the member entry
                : null;

            setSelectedCard(prevCard => ({
                ...prevCard,
                ...updatedFields,
                assignedTo: assignedMember,
            }));

            await updateCard(cardId, {
                ...updatedFields,
                assignedTo: updatedFields.assignedTo || null,
            });

        } catch (err) {
            console.error('Failed to save card details:', err);
            setError('Failed to save card details. Please try again.');
            fetchAllBoardData();
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
        return <p className={styles.loading}>Loading board details...</p>;
    }

    if (error) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>{error}</p>
                <Link to="/dashboard" className={styles.backButton}>Back to Dashboard</Link>
            </div>
        );
    }

    if (!board) {
        return (
            <div className={styles.container}>
                <p className={styles.message}>Board not found.</p>
                <Link to="/dashboard" className={styles.backButton}>Back to Dashboard</Link>
            </div>
        );
    }

    const currentUserRole = board.members.find(m => m.user._id === user._id)?.role;
    const canManageBoard = hasRequiredRole('admin'); // Admin or owner can manage board details, add members
    const canCreateList = hasRequiredRole('admin'); // Admin or owner can create lists
    const canDeleteBoard = hasRequiredRole('owner'); // Only owner can delete board

    return (
        <div className={styles.boardPageContainer}>
            <div className={styles.boardHeader}>
                <h2 className={styles.boardTitle}>{board.title}</h2>
                <Link to="/dashboard" className={styles.backButton}>Back to Dashboard</Link>
                {canDeleteBoard && ( // Only owner can delete board
                    <button className={styles.deleteBoardButton}>Delete Board</button> // Implement delete functionality
                )}
            </div>

            <div className={styles.boardMeta}>
                <p>Owner:
                    <strong>
                        {board.owner ? `${board.owner.name} (${board.owner.email})` : 'Unknown Owner'}
                    </strong>
                </p>
                <div className={styles.membersSection}>
                    <h4>Members:</h4>
                    <ul className={styles.memberList}>
                        {board.members && board.members.length > 0 ? (
                            board.members.map((memberEntry) => (
                                // Crucial check: Ensure memberEntry.user is not null before accessing its properties
                                memberEntry.user ? (
                                    <li key={memberEntry.user._id} className={styles.memberItem}>
                                        {memberEntry.user.name} ({memberEntry.user.email}) -
                                        {/* Only allow role change if current user has permission AND it's not the current user */}
                                        {canManageBoard && memberEntry.user._id !== user._id ? (
                                            <select
                                                value={memberEntry.role}
                                                onChange={(e) => handleRoleChange(memberEntry.user._id, e.target.value)}
                                                className={styles.roleSelect}
                                            >
                                                <option value="member">Member</option>
                                                <option value="admin">Admin</option>
                                                {currentUserRole === 'owner' && ( // Only owner can assign owner role
                                                    <option value="owner">Owner</option>
                                                )}
                                            </select>
                                        ) : (
                                            <span className={styles.memberRole}> {memberEntry.role}</span>
                                        )}
                                    </li>
                                ) : (
                                    // Fallback for a member entry with a null user (should be cleaned by migration)
                                    <li key={memberEntry._id} className={styles.memberItem}>
                                        [Deleted User] - {memberEntry.role}
                                    </li>
                                )
                            ))
                        ) : (
                            <li>No members yet.</li>
                        )}
                    </ul>
                </div>
            </div>

            {canManageBoard && ( // Only admin or owner can invite members
                <div className={styles.inviteMemberSection}>
                    <h4 className={styles.subHeading}>Invite New Member:</h4>
                    <form onSubmit={handleInviteMember} className={styles.inviteForm}>
                        <input
                            type="email"
                            placeholder="Enter member's email"
                            value={newMemberEmail}
                            onChange={(e) => setNewMemberEmail(e.target.value)}
                            className={styles.inviteInput}
                            required
                        />
                        <button type="submit" className={styles.inviteButton}>Invite</button>
                    </form>
                    {addMemberError && <p className={styles.error}>{addMemberError}</p>}
                    {addMemberSuccess && <p className={styles.success}>{addMemberSuccess}</p>}
                </div>
            )}

            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={onDragCancel}
            >
                <div className={styles.listsContainer}>
                    {lists.sort((a, b) => a.order - b.order).map((list) => (
                        <ListColumn
                            key={list._id}
                            list={list}
                            cards={cards[list._id] || []}
                            onCardCreated={handleCardCreated}
                            onCardClick={handleCardClick}
                            currentUserRole={currentUserRole} // <--- Pass current user's role
                        />
                    ))}
                    {canCreateList && ( // Only admin or owner can create lists
                        <div className={styles.addListSection}>
                            <form onSubmit={handleCreateList} className={styles.addListForm}>
                                <input
                                    type="text"
                                    placeholder="Add a new list..."
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    className={styles.addListInput}
                                    required
                                />
                                <button type="submit" className={styles.addListButton}>Add List</button>
                                {createListError && <p className={styles.error}>{createListError}</p>}
                            </form>
                        </div>
                    )}
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
                    // MODIFIED LINE: Filter out any member entries where the user is null
                    boardMembers={board.members.map(m => m.user).filter(u => u !== null)}
                    currentUser={user}
                />
            )}
        </div>
    );
};

export default BoardDetailPage;