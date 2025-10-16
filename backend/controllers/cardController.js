const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const User = require('../models/User');

// Helper function to check if user is a member of the board
// (Copied from listController.js, or you could refactor into a shared utility)
const checkBoardMembership = async (boardId, userId) => {
    const board = await Board.findById(boardId);
    if (!board) {
        return { status: 404, message: 'Board not found' };
    }
    const isMember = board.members.some(member => member.equals(userId));
    if (!isMember) {
        return { status: 403, message: 'Not authorized to access this board' };
    }
    return { status: 200, board };
};

// --- NEW: Helper to emit Socket.IO events ---
const emitBoardUpdate = (req, boardId, eventName, payload) => {
    const io = req.app.get('socketio');
    if (io) {
        io.to(boardId.toString()).emit(eventName, payload);
        console.log(`Emitted event '${eventName}' to board ${boardId}:`, payload);
    } else {
        console.warn('Socket.IO instance not available in request context.');
    }
};

// @desc    Get all cards for a specific list
// @route   GET /api/lists/:listId/cards
// @access  Private (Board Members Only)
const getCards = async (req, res) => {
    const { listId } = req.params;

    try {
        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const authCheck = await checkBoardMembership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        const cards = await Card.find({ list: listId })
            .populate('assignedTo', 'name email') // Populate assigned user details
            .sort('order'); // Sort by order for display
        res.status(200).json(cards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching cards' });
    }
};

// @desc    Get a single card by ID
// @route   GET /api/cards/:id
// @access  Private (Board Members Only)
const getCardById = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id)
            .populate('assignedTo', 'name email');

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const authCheck = await checkBoardMembership(card.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        res.status(200).json(card);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid card ID format' });
        }
        res.status(500).json({ message: 'Server error fetching card' });
    }
};

// @desc    Create a new card for a list
// @route   POST /api/lists/:listId/cards
// @access  Private (Board Members Only)
const createCard = async (req, res) => {
    const { listId } = req.params;
    const { title, description, assignedTo, dueDate } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Please add a title for the card' });
    }

    try {
        const list = await List.findById(listId);
        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const authCheck = await checkBoardMembership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        const highestOrderCard = await Card.findOne({ list: listId }).sort('-order');
        const newOrder = highestOrderCard ? highestOrderCard.order + 1 : 0;

        const card = new Card({
            title,
            description,
            list: listId,
            board: list.board,
            order: newOrder,
            assignedTo: assignedTo || null,
            dueDate: dueDate || null,
        });

        const createdCard = await card.save();
        const populatedCard = await Card.findById(createdCard._id)
            .populate('assignedTo', 'name email');

        res.status(201).json(populatedCard);

        // --- NEW: Emit real-time event ---
        emitBoardUpdate(req, list.board, 'cardCreated', populatedCard);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating card' });
    }
};

// @desc    Update a card (title, description, order, assignedTo, dueDate)
// @route   PUT /api/cards/:id
// @access  Private (Board Members Only)
const updateCard = async (req, res) => {
    const { title, description, order, assignedTo, dueDate, listId } = req.body; // Added listId for potential move

    try {
        let card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const authCheck = await checkBoardMembership(card.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        const oldListId = card.list.toString(); // Store old list ID for comparison
        const oldOrder = card.order;

        card.title = title !== undefined ? title : card.title;
        card.description = description !== undefined ? description : card.description;
        card.assignedTo = assignedTo !== undefined ? assignedTo : card.assignedTo;
        card.dueDate = dueDate !== undefined ? dueDate : card.dueDate;

        // Handle card movement between lists or reordering within a list
        if (listId && listId.toString() !== oldListId) {
            // Card is moving to a new list
            const newList = await List.findById(listId);
            if (!newList) {
                return res.status(404).json({ message: 'New list not found' });
            }
            // Ensure new list belongs to the same board
            if (newList.board.toString() !== card.board.toString()) {
                return res.status(400).json({ message: 'Cannot move card to a list on a different board' });
            }
            card.list = listId;
            // When moving to a new list, typically put it at the end
            const highestOrderCard = await Card.findOne({ list: listId }).sort('-order');
            card.order = highestOrderCard ? highestOrderCard.order + 1 : 0;
        } else if (order !== undefined && order !== oldOrder) {
            // Card is reordering within the same list
            card.order = order;
        }

        const updatedCard = await card.save();
        const populatedCard = await Card.findById(updatedCard._id)
            .populate('assignedTo', 'name email');

        res.status(200).json(populatedCard);

        // --- NEW: Emit real-time event ---
        if (listId && listId.toString() !== oldListId) {
            // If card moved lists, emit a 'cardMoved' event with old and new list IDs
            emitBoardUpdate(req, card.board, 'cardMoved', {
                card: populatedCard,
                oldListId: oldListId,
                newListId: populatedCard.list.toString(),
            });
        } else {
            // Otherwise, it's just an update or reorder within the same list
            emitBoardUpdate(req, card.board, 'cardUpdated', populatedCard);
        }

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid card ID format' });
        }
        res.status(500).json({ message: 'Server error updating card' });
    }
};

// @desc    Delete a card
// @route   DELETE /api/cards/:id
// @access  Private (Board Members Only)
const deleteCard = async (req, res) => {
    try {
        const card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const authCheck = await checkBoardMembership(card.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        await card.deleteOne();

        res.status(200).json({ message: 'Card removed' });

        // --- NEW: Emit real-time event ---
        emitBoardUpdate(req, card.board, 'cardDeleted', {
            _id: card._id,
            list: card.list.toString(),
            board: card.board.toString(),
        });

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid card ID format' });
        }
        res.status(500).json({ message: 'Server error deleting card' });
    }
};

module.exports = {
    getCards,
    getCardById,
    createCard,
    updateCard,
    deleteCard,
};