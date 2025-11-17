const Card = require('../models/Card');
const List = require('../models/List');
const Board = require('../models/Board');
const User = require('../models/User');
const { getUserBoardRole, hasRequiredRole } = require('./boardController'); // <--- NEW IMPORT

// Helper function to check if user is a member of the board (now using role-based check)
const checkBoardMembership = async (boardId, userId) => {
    const board = await Board.findById(boardId);
    if (!board) {
        return { status: 404, message: 'Board not found' };
    }
    const userRole = getUserBoardRole(board, userId);
    if (!userRole) { // If user is not a member at all
        return { status: 403, message: 'Not authorized to access this board' };
    }
    return { status: 200, board, userRole }; // Return userRole for further checks
};

// Helper to emit Socket.IO events from request context
const { emitBoardUpdate } = require('../utils/socketEmitter');

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
            .populate('assignedTo', 'name email')
            .sort('order');
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
        // Authorization: Any member can create cards
        // if (!hasRequiredRole(authCheck.userRole, 'member')) { // 'member' role or higher
        //     return res.status(403).json({ message: 'Not authorized to create cards on this board' });
        // }

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

        emitBoardUpdate(req, list.board, 'cardCreated', populatedCard);

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating card' });
    }
};

// @desc    Update a card (title, description, assignedTo, dueDate)
// @route   PUT /api/cards/:id
// @access  Private (Board Members Only)
const updateCard = async (req, res) => {
    const { title, description, assignedTo, dueDate } = req.body;

    try {
        let card = await Card.findById(req.params.id);

        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const authCheck = await checkBoardMembership(card.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }
        // Authorization: Any member can update cards
        // if (!hasRequiredRole(authCheck.userRole, 'member')) { // 'member' role or higher
        //     return res.status(403).json({ message: 'Not authorized to update cards on this board' });
        // }

        card.title = title !== undefined ? title : card.title;
        card.description = description !== undefined ? description : card.description;
        card.assignedTo = assignedTo !== undefined ? assignedTo : card.assignedTo;
        card.dueDate = dueDate !== undefined ? dueDate : card.dueDate;

        const updatedCard = await card.save();
        const populatedCard = await Card.findById(updatedCard._id)
            .populate('assignedTo', 'name email');

        res.status(200).json(populatedCard);

        emitBoardUpdate(req, card.board, 'cardUpdated', populatedCard);

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
// @access  Private (Board Admin or Owner)
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
        // Authorization: Only board admin or owner can delete cards
        if (!hasRequiredRole(authCheck.userRole, 'admin')) { // 'admin' role or higher
            return res.status(403).json({ message: 'Not authorized to delete cards on this board' });
        }

        const oldListId = card.list.toString();
        const boardId = card.board.toString();

        await card.deleteOne();

        res.status(200).json({ message: 'Card removed' });

        emitBoardUpdate(req, boardId, 'cardDeleted', {
            _id: card._id,
            list: oldListId,
            board: boardId,
        });

        const remainingCards = await Card.find({ list: oldListId }).sort('order');
        const bulkOps = remainingCards.map((c, index) => ({
            updateOne: {
                filter: { _id: c._id },
                update: { $set: { order: index } }
            }
        }));
        if (bulkOps.length > 0) {
            await Card.bulkWrite(bulkOps);
            emitBoardUpdate(req, boardId, 'listReordered', { listId: oldListId, cards: remainingCards.map((c, index) => ({ _id: c._id, order: index })) });
        }

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid card ID format' });
        }
        res.status(500).json({ message: 'Server error deleting card' });
    }
};

// @desc    Move a card between lists or reorder within a list
// @route   PUT /api/cards/:id/move
// @access  Private (Board Members Only)
const moveCard = async (req, res) => {
    const { id: cardId } = req.params;
    const { targetListId, newOrderIndex } = req.body;

    console.log('moveCard received:', { cardId, targetListId, newOrderIndex });

    if (!targetListId || newOrderIndex === undefined || newOrderIndex < 0) {
        console.error('Validation failed: Missing targetListId or invalid newOrderIndex', { targetListId, newOrderIndex });
        return res.status(400).json({ message: 'Missing targetListId or invalid newOrderIndex' });
    }

    try {
        const cardToMove = await Card.findById(cardId);
        console.log('cardToMove found:', cardToMove ? cardToMove._id : 'null');
        if (!cardToMove) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const oldListId = cardToMove.list.toString();
        const boardId = cardToMove.board.toString();
        console.log('oldListId:', oldListId, 'boardId:', boardId);

        const authCheck = await checkBoardMembership(boardId, req.user._id);
        console.log('authCheck status:', authCheck.status, 'message:', authCheck.message);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }
        // Authorization: Any member can move cards
        // if (!hasRequiredRole(authCheck.userRole, 'member')) { // 'member' role or higher
        //     return res.status(403).json({ message: 'Not authorized to move cards on this board' });
        // }

        const targetList = await List.findById(targetListId);
        console.log('targetList found:', targetList ? targetList._id : 'null');
        if (!targetList) {
            return res.status(404).json({ message: 'Target list not found' });
        }
        if (targetList.board.toString() !== boardId) {
            console.error('Attempted to move card to a list on a different board.');
            return res.status(400).json({ message: 'Cannot move card to a list on a different board' });
        }

        const bulkOperations = [];

        if (oldListId === targetListId) {
            console.log('Moving within the same list:', oldListId);
            const cardsInList = await Card.find({ list: oldListId, _id: { $ne: cardId } })
                .sort('order');

            cardsInList.splice(newOrderIndex, 0, cardToMove);

            cardsInList.forEach((card, index) => {
                if (card.order !== index) {
                    bulkOperations.push({
                        updateOne: {
                            filter: { _id: card._id },
                            update: { $set: { order: index } }
                        }
                    });
                }
            });
            cardToMove.order = newOrderIndex;
        } else {
            console.log('Moving between different lists. From:', oldListId, 'To:', targetListId);

            const oldListCards = await Card.find({ list: oldListId, _id: { $ne: cardId } })
                .sort('order');
            oldListCards.forEach((card, index) => {
                if (card.order !== index) {
                    bulkOperations.push({
                        updateOne: {
                            filter: { _id: card._id },
                            update: { $set: { order: index } }
                        }
                    });
                }
            });

            const targetListCards = await Card.find({ list: targetListId })
                .sort('order');
            targetListCards.splice(newOrderIndex, 0, cardToMove);

            targetListCards.forEach((card, index) => {
                if (card.order !== index) {
                    bulkOperations.push({
                        updateOne: {
                            filter: { _id: card._id },
                            update: { $set: { order: index } }
                        }
                    });
                }
            });

            cardToMove.list = targetListId;
            cardToMove.order = newOrderIndex;
        }

        await cardToMove.save();
        console.log('Moved card saved:', cardToMove._id, 'new list:', cardToMove.list, 'new order:', cardToMove.order);

        if (bulkOperations.length > 0) {
            await Card.bulkWrite(bulkOperations);
            console.log('Bulk write operations executed:', bulkOperations.length);
        }

        const updatedCard = await Card.findById(cardId).populate('assignedTo', 'name email');

        res.status(200).json({
            message: 'Card moved successfully',
            card: updatedCard,
            oldListId: oldListId,
            newListId: targetListId,
        });

        emitBoardUpdate(req, boardId, 'cardMoved', {
            card: updatedCard,
            oldListId: oldListId,
            newListId: targetListId,
        });

    } catch (error) {
        console.error('Caught error in moveCard:', error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        res.status(500).json({ message: 'Server error moving card' });
    }
};

module.exports = {
    getCards,
    getCardById,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
};