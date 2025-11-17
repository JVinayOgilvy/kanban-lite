import React, { useState, useEffect } from 'react';
import { fetchComments, addComment } from '../api/api'; // <--- NEW IMPORTS
import styles from '../assets/css/components/CardDetailModal.module.css'; // Assuming you've converted to CSS Modules

const CardDetailModal = ({ card, onClose, onSave, boardMembers = [], currentUser }) => { // <--- NEW: currentUser prop
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState(''); // New state for assignedTo
    const [dueDate, setDueDate] = useState('');       // New state for dueDate
    const [isEditing, setIsEditing] = useState(false);
    const [comments, setComments] = useState([]); // <--- NEW STATE for comments
    const [newCommentText, setNewCommentText] = useState(''); // <--- NEW STATE for new comment input
    const [commentError, setCommentError] = useState(''); // <--- NEW STATE for comment errors

    useEffect(() => {
        if (card) {
            setTitle(card.title);
            setDescription(card.description || '');
            setAssignedTo(card.assignedTo ? card.assignedTo._id : '');
            setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
            setIsEditing(false);
            fetchCardComments(card._id); // <--- Fetch comments when card changes
        }
    }, [card]);

    const fetchCardComments = async (cardId) => {
        try {
            const { data } = await fetchComments(cardId);
            setComments(data);
        } catch (err) {
            console.error('Failed to fetch comments:', err);
            setCommentError('Failed to load comments.');
        }
    };

    if (!card) return null;

    const handleSave = () => {
        const updatedFields = {
            title,
            description,
            assignedTo: assignedTo || null,
            dueDate: dueDate || null,
        };
        onSave(card._id, updatedFields);
        setIsEditing(false);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        setCommentError('');
        if (!newCommentText.trim()) {
            setCommentError('Comment cannot be empty.');
            return;
        }
        try {
            const { data } = await addComment(card._id, newCommentText);
            // Optimistically add comment, Socket.IO will confirm/update for other clients
            setComments(prev => [...prev, data]);
            setNewCommentText('');
        } catch (err) {
            console.error('Failed to add comment:', err);
            setCommentError(err.response?.data?.message || 'Failed to add comment.');
        }
    };

    const assignedToName = card.assignedTo ? card.assignedTo.name : 'Unassigned';
    const dueDateFormatted = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>

                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className={styles.titleInput}
                            placeholder="Card Title"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className={styles.descriptionTextarea}
                            placeholder="Add a more detailed description..."
                        />

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Assigned To:</label>
                            <select
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="">Unassigned</option>
                                {boardMembers.map(member => (
                                    // ADDED CHECK: Ensure member and member._id exist
                                    member && member._id ? (
                                        <option key={member._id} value={member._id}>
                                            {member.name} ({member.email})
                                        </option>
                                    ) : null // Don't render option if member is null or invalid
                                ))}
                            </select>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>Due Date:</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                className={styles.dateInput}
                            />
                        </div>

                        <div className={styles.actions}>
                            <button className={styles.saveButton} onClick={handleSave}>Save</button>
                            <button className={styles.cancelButton} onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className={styles.title}>{card.title}</h3>
                        <p className={styles.description}>{card.description || 'No description provided.'}</p>
                        <p className={styles.meta}>Assigned to: <strong>{assignedToName}</strong></p>
                        <p className={styles.meta}>Due Date: <strong>{dueDateFormatted}</strong></p>
                        <div className={styles.actions}>
                            <button className={styles.editButton} onClick={() => setIsEditing(true)}>Edit</button>
                        </div>
                    </>
                )}

                {/* --- Comments Section --- */}
                <div className={styles.commentsSection}>
                    <h4 className={styles.commentsHeading}>Comments</h4>
                    {commentError && <p className={styles.commentError}>{commentError}</p>}
                    <div className={styles.commentList}>
                        {comments.length === 0 ? (
                            <p className={styles.noComments}>No comments yet.</p>
                        ) : (
                            comments.map(comment => (
                                <div key={comment._id} className={styles.commentItem}>
                                    <p className={styles.commentAuthor}>
                                        <strong>{comment.author?.name || 'Unknown'}</strong>
                                        <span className={styles.commentDate}>
                                            {new Date(comment.createdAt).toLocaleString()}
                                        </span>
                                    </p>
                                    <p className={styles.commentText}>{comment.text}</p>
                                </div>
                            ))
                        )}
                    </div>
                    <form onSubmit={handleAddComment} className={styles.addCommentForm}>
                        <textarea
                            value={newCommentText}
                            onChange={(e) => setNewCommentText(e.target.value)}
                            placeholder="Write a comment..."
                            className={styles.addCommentTextarea}
                            rows="3"
                        ></textarea>
                        <button type="submit" className={styles.addCommentButton}>Add Comment</button>
                    </form>
                </div>
                {/* --- END NEW: Comments Section --- */}
            </div>
        </div>
    );
};

export default CardDetailModal;