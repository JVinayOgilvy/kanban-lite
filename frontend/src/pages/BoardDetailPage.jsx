import React, { useState, useEffect, useCallback } from 'react'; // Added useCallback
import { useParams, Link } from 'react-router-dom';
import { getBoard, addBoardMember, fetchLists, createList, fetchCards } from '../api/api'; // Import new API functions
import { useAuth } from '../context/AuthContext';
import ListColumn from '../components/ListColumn'; // Import ListColumn component

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

    // Function to fetch all board data (board, lists, and cards for each list)
    const fetchAllBoardData = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            setCreateListError(''); // Clear list creation error

            // 1. Fetch board details
            const boardRes = await getBoard(id);
            setBoard(boardRes.data);

            // 2. Fetch lists for the board
            const listsRes = await fetchLists(id);
            const fetchedLists = listsRes.data;
            setLists(fetchedLists);

            // 3. Fetch cards for each list concurrently
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
            // We only need to update the board object, not all lists/cards
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
            setLists([...lists, data]); // Add new list to state
            setCards({ ...cards, [data._id]: [] }); // Initialize an empty array for new list's cards
            setNewListName('');
        } catch (err) {
            console.error('Failed to create list:', err);
            setCreateListError(err.response?.data?.message || 'Failed to create list.');
        }
    };

    const handleCardCreated = (newCard) => {
        // Update the cards state for the specific list
        setCards(prevCards => ({
            ...prevCards,
            [newCard.list]: [...(prevCards[newCard.list] || []), newCard].sort((a, b) => a.order - b.order)
        }));
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

            <div style={styles.listsContainer}>
                {lists.sort((a, b) => a.order - b.order).map((list) => (
                    <ListColumn
                        key={list._id}
                        list={list}
                        cards={cards[list._id] || []} // Pass cards for this specific list
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
        </div>
    );
};

const styles = {
    boardPageContainer: {
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        backgroundColor: '#0079bf', // Trello-like blue background
        padding: '20px',
        overflowX: 'auto', // Allow horizontal scrolling for many lists
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
        alignItems: 'flex-start', // Align lists to the top
        paddingBottom: '10px', // Space for horizontal scrollbar
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