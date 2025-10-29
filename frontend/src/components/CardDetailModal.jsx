import React, { useState, useEffect } from 'react';

// Add boardMembers prop
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
            // Initialize assignedTo with the ID of the assigned user, or empty string if unassigned
            setAssignedTo(card.assignedTo ? card.assignedTo._id : '');
            // Format dueDate for input type="date" (YYYY-MM-DD)
            setDueDate(card.dueDate ? new Date(card.dueDate).toISOString().split('T')[0] : '');
            setIsEditing(false); // Reset editing state when card changes
        }
    }, [card]);

    if (!card) return null;

    const handleSave = () => {
        // Prepare updated fields, converting assignedTo to null if empty
        const updatedFields = {
            title,
            description,
            assignedTo: assignedTo || null, // Send null if no user selected
            dueDate: dueDate || null,       // Send null if no date selected
        };
        onSave(card._id, updatedFields);
        setIsEditing(false);
    };

    // Display values for non-editing mode
    const assignedToName = card.assignedTo ? card.assignedTo.name : 'Unassigned';
    const dueDateFormatted = card.dueDate ? new Date(card.dueDate).toLocaleDateString() : 'No due date';

    return (
        <div style={modalStyles.overlay} onClick={onClose}>
            <div style={modalStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button style={modalStyles.closeButton} onClick={onClose}>&times;</button>

                {isEditing ? (
                    <>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            style={modalStyles.titleInput}
                            placeholder="Card Title"
                        />
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            style={modalStyles.descriptionTextarea}
                            placeholder="Add a more detailed description..."
                        />

                        {/* Assigned To Dropdown */}
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Assigned To:</label>
                            <select
                                value={assignedTo}
                                onChange={(e) => setAssignedTo(e.target.value)}
                                style={modalStyles.selectInput}
                            >
                                <option value="">Unassigned</option>
                                {boardMembers.map(member => (
                                    <option key={member._id} value={member._id}>
                                        {member.name} ({member.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Due Date Picker */}
                        <div style={modalStyles.formGroup}>
                            <label style={modalStyles.label}>Due Date:</label>
                            <input
                                type="date"
                                value={dueDate}
                                onChange={(e) => setDueDate(e.target.value)}
                                style={modalStyles.dateInput}
                            />
                        </div>

                        <div style={modalStyles.actions}>
                            <button style={modalStyles.saveButton} onClick={handleSave}>Save</button>
                            <button style={modalStyles.cancelButton} onClick={() => setIsEditing(false)}>Cancel</button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 style={modalStyles.title}>{card.title}</h3>
                        <p style={modalStyles.description}>{card.description || 'No description provided.'}</p>
                        <p style={modalStyles.meta}>Assigned to: <strong>{assignedToName}</strong></p>
                        <p style={modalStyles.meta}>Due Date: <strong>{dueDateFormatted}</strong></p>
                        <div style={modalStyles.actions}>
                            <button style={modalStyles.editButton} onClick={() => setIsEditing(true)}>Edit</button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const modalStyles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: '#fff',
        padding: '25px',
        borderRadius: '8px',
        width: 'clamp(300px, 80%, 600px)',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative',
        boxShadow: '0 5px 15px rgba(0, 0, 0, 0.3)',
    },
    closeButton: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'none',
        border: 'none',
        fontSize: '1.5em',
        cursor: 'pointer',
        color: '#555',
    },
    title: {
        fontSize: '1.8em',
        marginBottom: '10px',
        color: '#333',
    },
    titleInput: {
        width: 'calc(100% - 20px)',
        padding: '10px',
        fontSize: '1.8em',
        border: '1px solid #ddd',
        borderRadius: '4px',
        marginBottom: '10px',
    },
    description: {
        fontSize: '1em',
        color: '#666',
        marginBottom: '15px',
        whiteSpace: 'pre-wrap',
    },
    descriptionTextarea: {
        width: 'calc(100% - 20px)',
        minHeight: '100px',
        padding: '10px',
        fontSize: '1em',
        border: '1px solid #ddd',
        borderRadius: '4px',
        marginBottom: '15px',
        resize: 'vertical',
    },
    meta: {
        fontSize: '0.9em',
        color: '#777',
        marginBottom: '5px',
    },
    formGroup: { // New style for form groups
        marginBottom: '15px',
    },
    label: { // New style for labels
        display: 'block',
        marginBottom: '5px',
        fontWeight: 'bold',
        color: '#555',
    },
    selectInput: { // New style for select dropdown
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f8f8f8',
        fontSize: '1em',
    },
    dateInput: { // New style for date input
        width: '100%',
        padding: '10px',
        border: '1px solid #ddd',
        borderRadius: '4px',
        backgroundColor: '#f8f8f8',
        fontSize: '1em',
    },
    actions: {
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '10px',
        marginTop: '20px',
    },
    editButton: {
        backgroundColor: '#007bff',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    saveButton: {
        backgroundColor: '#28a745',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
    },
    cancelButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        padding: '8px 15px',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1em',
    },
};

export default CardDetailModal;