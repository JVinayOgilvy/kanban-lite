const List = require('../models/List');
const Board = require('../models/Board'); // Needed for authorization checks

// Helper function to check if user is a member of the board
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

// Helper function to check if user is the owner of the board
const checkBoardOwnership = async (boardId, userId) => {
    const board = await Board.findById(boardId);
    if (!board) {
        return { status: 404, message: 'Board not found' };
    }
    if (!board.owner.equals(userId)) {
        return { status: 403, message: 'Not authorized to perform this action on this board' };
    }
    return { status: 200, board };
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
        const lists = await List.find({ board: boardId }).sort('order'); // Sort by order for display
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
// @access  Private (Board Owner Only for now)
const createList = async (req, res) => {
    const { boardId } = req.params;
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Please add a title for the list' });
    }

    // Only board owner can create lists for now
    const authCheck = await checkBoardOwnership(boardId, req.user._id);
    if (authCheck.status !== 200) {
        return res.status(authCheck.status).json({ message: authCheck.message });
    }

    try {
        // Find the highest order value for lists in this board to set the new list's order
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
// @access  Private (Board Owner Only for now)
const updateList = async (req, res) => {
    const { title, order } = req.body;

    try {
        let list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Only board owner can update lists for now
        const authCheck = await checkBoardOwnership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
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
// @access  Private (Board Owner Only for now)
const deleteList = async (req, res) => {
    try {
        const list = await List.findById(req.params.id);

        if (!list) {
            return res.status(404).json({ message: 'List not found' });
        }

        // Only board owner can delete lists for now
        const authCheck = await checkBoardOwnership(list.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        await list.deleteOne(); // Mongoose 6+ uses deleteOne() or deleteMany()

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