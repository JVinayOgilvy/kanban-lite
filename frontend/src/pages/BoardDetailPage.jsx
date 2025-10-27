import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getBoard, addBoardMember, fetchLists, createList, fetchCards, updateCard } from '../api/api';
import { useAuth } from '../context/AuthContext';
import ListColumn from '../components/ListColumn';

// dnd-kit imports
import {
    DndContext,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    closestCorners, // A common collision detection algorithm
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { createPortal } from 'react-dom'; // For DragOverlay
import CardItem from '../components/CardItem'; // Needed for DragOverlay

const BoardDetailPage = () => {
    const { id } = useParams();
    const { user } = useAuth();
    const [board, setBoard] = useState(null);
    const [lists, setLists] = useState([]);
    const [cards, setCards] = useState({}); // Object to store cards, keyed by listId
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [newMemberEmail, setNewMemberEmail] = useState('');
    const [addMemberError, setAddMemberError] = useState('');
    const [addMemberSuccess, setAddMemberSuccess] = useState('');
    const [newListName, setNewListName] = useState('');
    const [createListError, setCreateListError] = useState('');

    const [activeId, setActiveId] = useState(null); // State to track the currently dragged item's ID

    // dnd-kit sensors configuration
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px minimum movement to start drag
            },
        })
    );

    // Helper to find which list an ID (card or list) belongs to
    const findList = useCallback((itemId) => {
        // Check if the itemId itself is a list ID
        if (lists.some(list => list._id === itemId)) {
            return itemId;
        }
        // Otherwise, assume it's a card ID and find its parent list
        const listId = Object.keys(cards).find((key) =>
            cards[key].some((card) => card._id === itemId)
        );
        return listId || null; // Return null if not found
    }, [lists, cards]); // Dependencies for useCallback

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
    }, [id]); // Dependency on 'id'

    useEffect(() => {
        if (user) { // Only fetch if user is logged in
            fetchAllBoardData();
        }
    }, [user, fetchAllBoardData]); // Re-fetch if user or fetchAllBoardData changes

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
            // Re-fetch board details to update the members list
            const boardRes = await getBoard(id);
            setBoard(boardRes.data);
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
            setCards(prevCards => ({ ...prevCards, [data._id]: [] })); // Initialize an empty array for new list's cards
            setNewListName('');
        } catch (err) {
            console.error('Failed to create list:', err);
            setCreateListError(err.response?.data?.message || 'Failed to create list.');
        }
    };

    const handleCardCreated = (newCard) => {
        setCards(prevCards => ({
            ...prevCards,
            [newCard.list]: [...(prevCards[newCard.list] || []), newCard].sort((a, b) => a.order - b.order)
        }));
    };

    // dnd-kit event handlers
    const onDragStart = (event) => {
        setActiveId(event.active.id);
    };

    const onDragEnd = async (event) => {
        const { active, over } = event;

        if (!over) { // Dropped outside any droppable area
            setActiveId(null);
            return;
        }

        const activeId = active.id;
        const overId = over.id;

        const activeListId = findList(activeId);
        const overListId = findList(overId);

        // Crucial check: Ensure both active and over IDs belong to valid lists
        if (!activeListId || !overListId) {
            console.warn("Drag operation involved an invalid list ID. ActiveListId:", activeListId, "OverListId:", overListId);
            setActiveId(null);
            return;
        }

        // Optimistic UI update
        setCards((prevCards) => {
            const newCardsState = { ...prevCards };

            // Ensure the lists exist in the state before trying to access them
            if (!newCardsState[activeListId] || !newCardsState[overListId]) {
                console.error("Attempted to access non-existent list in cards state during drag-end optimistic update.");
                return prevCards; // Revert to previous state
            }

            // Make mutable copies of the card arrays for manipulation
            const activeCards = Array.from(newCardsState[activeListId]);
            const overCards = Array.from(newCardsState[overListId]);

            const activeIndex = activeCards.findIndex((card) => card._id === activeId);
            // If the card isn't found in its supposed list, something is wrong with state.
            if (activeIndex === -1) {
                console.error("Dragged card not found in its active list during optimistic update.");
                return prevCards;
            }

            // Determine the final index in the destination list
            // If overId is a list ID (not a card ID), overIndex will be -1.
            // In this case, we want to place the card at the end of the list.
            const overIndex = overCards.findIndex((card) => card._id === overId);
            const finalOverIndex = overIndex === -1 ? overCards.length : overIndex;

            if (activeListId === overListId) {
                // Moving within the same list
                const newOrder = arrayMove(activeCards, activeIndex, finalOverIndex);
                newCardsState[activeListId] = newOrder;
            } else {
                // Moving to a different list
                const [movedCard] = activeCards.splice(activeIndex, 1); // This should now always find a card
                if (!movedCard) { // Double-check, though activeIndex check above should prevent this
                    console.error("Moved card was undefined after splice.");
                    return prevCards;
                }
                movedCard.list = overListId; // Update the card's list ID
                newCardsState[activeListId] = activeCards; // Update source list
                overCards.splice(finalOverIndex, 0, movedCard); // Insert into destination list
                newCardsState[overListId] = overCards; // Update destination list
            }
            return newCardsState;
        });

        // Backend update
        try {
            // Re-calculate indices and list IDs based on the final state after optimistic update
            // This ensures we send the correct data to the backend.
            const currentActiveListCards = cards[activeListId]; // Get the current state of the active list
            const currentOverListCards = cards[overListId];     // Get the current state of the over list

            const newActiveIndex = currentActiveListCards.findIndex((card) => card._id === activeId);
            const newOverIndex = currentOverListCards.findIndex((card) => card._id === overId);
            const finalBackendOrder = newOverIndex === -1 ? currentOverListCards.length : newOverIndex;

            let updatedCardData = {
                order: finalBackendOrder, // New order within the destination list
            };

            if (activeListId !== overListId) {
                // Card moved to a different list
                updatedCardData.listId = overListId;
            }

            await updateCard(activeId, updatedCardData);

            // Re-fetch all cards for both affected lists to ensure correct order/state from backend
            // This is a robust way to handle potential backend reordering logic
            const updatedSourceListCards = await fetchCards(activeListId);
            const updatedDestinationListCards = await fetchCards(overListId);

            setCards(prevCards => ({
                ...prevCards,
                [activeListId]: updatedSourceListCards.data,
                [overListId]: updatedDestinationListCards.data,
            }));

        } catch (err) {
            console.error('Failed to update card position on backend:', err);
            setError('Failed to update card position. Please refresh.');
            // TODO: Implement a more robust UI revert mechanism here if needed for production
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
                collisionDetection={closestCorners} // Use closestCorners for better sorting
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
                        {activeCard ? <CardItem card={activeCard} /> : null}
                    </DragOverlay>,
                    document.body
                )}
            </DndContext>
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