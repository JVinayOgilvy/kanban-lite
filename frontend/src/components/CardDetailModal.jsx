import React, { useState, useEffect } from 'react';

// --- NEW: Import CSS Module ---
import styles from '../assets/css/components/CardDetailModal.module.css';

const CardDetailModal = ({ card, onClose, onSave, boardMembers = [] }) => {
    console.log('Rendering CardDetailModal from components for card:', card);
    console.log('Board members available for assignment:', boardMembers);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState(''); // New state for assignedTo
    const [dueDate, setDueDate] = useState('');       // New state for dueDate
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        if (card) {
            setTitle(card.title);
            setDescription(card.description || '');
            setAssignedTo(card.assignedTo ? card.assignedTo._id : '');
            setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
            setIsEditing(false);
        }
    }, [card]);

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

    // Display values for non-editing mode
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
                                    <option key={member._id} value={member._id}>
                                        {member.name} ({member.email})
                                    </option>
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
            </div>
        </div>
    );
};

export default CardDetailModal;