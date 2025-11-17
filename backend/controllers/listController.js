const List = require('../models/List');
const Board = require('../models/Board');
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

// @desc    Get all lists for a specific board
// @route   GET /api/boards/:boardId/lists
// @access  Private (Board Members Only)
const getLists = async (req, res) => {
    const { boardId } = req.params;

    const authCheck = await checkBoardMembership(boardId, req.user._id);
    if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ message: authCheck.message });
    }

    try {
        const lists = await List.find({ board: boardId }).sort('order');
        res.status(200).json(lists);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching lists' });
    }
};

// @desc    Get a single list by ID
// @route   GET /api/lists/:id
// @access  Private (Board Members Only)
const getListById = async (req, res) => {
    try {
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        const authCheck = await checkBoardMembership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        res.status(200).json(list);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid list ID format' });
        }
        res.status(500).json({ message: 'Server error fetching list' });
    }
};

// @desc    Create a new list for a board
// @route   POST /api/boards/:boardId/lists
// @access  Private (Board Admin or Owner)
const createList = async (req, res) => {
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Please add a title for the list' });
    }

    // Authorization: Only board admin or owner can create lists
    const authCheck = await checkBoardMembership(boardId, req.user._id);
    if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ message: authCheck.message });
    }
    if (!hasRequiredRole(authCheck.userRole, 'admin')) { // 'admin' role or higher
        return res.status(403).json({ message: 'Not authorized to create lists on this board' });
    }

    try {
        const highestOrderList = await List.findOne({ board: boardId }).sort('-order');
        const newOrder = highestOrderList ? highestOrderList.order + 1 : 0;

        const list = new List({
            title,
            board: boardId,
            order: newOrder,
        });

        const createdList = await list.save();
        res.status(201).json(createdList);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating list' });
    }
};

// @desc    Update a list (title or order)
// @route   PUT /api/lists/:id
// @access  Private (Board Admin or Owner)
const updateList = async (req, res) => {
    const { title, order } = req.body;

    try {
        let list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Authorization: Only board admin or owner can update lists
        const authCheck = await checkBoardMembership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }
        if (!hasRequiredRole(authCheck.userRole, 'admin')) { // 'admin' role or higher
            return res.status(403).json({ message: 'Not authorized to update lists on this board' });
        }

        list.title = title !== undefined ? title : list.title;
        list.order = order !== undefined ? order : list.order;

        const updatedList = await list.save();
        res.status(200).json(updatedList);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid list ID format' });
        }
        res.status(500).json({ message: 'Server error updating list' });
    }
};

// @desc    Delete a list
// @route   DELETE /api/lists/:id
// @access  Private (Board Admin or Owner)
const deleteList = async (req, res) => {
    try {
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Authorization: Only board admin or owner can delete lists
        const authCheck = await checkBoardMembership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }
        if (!hasRequiredRole(authCheck.userRole, 'admin')) { // 'admin' role or higher
            return res.status(403).json({ message: 'Not authorized to delete lists on this board' });
        }

        await list.deleteOne();

        res.status(200).json({ message: 'List removed' });
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid list ID format' });
        }
        res.status(500).json({ message: 'Server error deleting list' });
    }
};

module.exports = {
    getLists,
    getListById,
    createList,
    updateList,
    deleteList,
};