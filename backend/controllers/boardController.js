// controllers/boardController.js
const Board = require('../models/Board');
const User = require('../models/User'); // Needed for populating member details if desired

// @desc    Get all boards for the authenticated user
// @route   GET /api/boards
// @access  Private
const getBoards = async (req, res) => {
    try {
        // Find boards where the authenticated user is either the owner or a member
        const boards = await Board.find({
            $or: [
                { owner: req.user._id },
                { members: req.user._id }
            ]
        })
            .populate('owner', 'name email') // Populate owner details (name and email)
            .populate('members', 'name email'); // Populate member details

        res.status(200).json(boards);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching boards' });
    }
};

// @desc    Get a single board by ID
// @route   GET /api/boards/:id
// @access  Private
const getBoardById = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('members', 'name email');

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if the authenticated user is an owner or member of the board
        const isMember = board.members.some(member => member._id.equals(req.user._id));
        const isOwner = board.owner._id.equals(req.user._id);

        if (!isMember && !isOwner) {
            return res.status(403).json({ message: 'Not authorized to access this board' });
        }

        res.status(200).json(board);
    } catch (error) {
        console.error(error);
        // Handle invalid ObjectId format
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid board ID format' });
        }
        res.status(500).json({ message: 'Server error fetching board' });
    }
};

// @desc    Create a new board
// @route   POST /api/boards
// @access  Private
const createBoard = async (req, res) => {
    const { title } = req.body;

    if (!title) {
        return res.status(400).json({ message: 'Please add a title for the board' });
    }

    try {
        const board = new Board({
            title,
            owner: req.user._id, // The authenticated user is the owner
            members: [req.user._id], // Owner is automatically a member
        });

        const createdBoard = await board.save();
        // Populate owner and members for the response
        const populatedBoard = await Board.findById(createdBoard._id)
            .populate('owner', 'name email')
            .populate('members', 'name email');

        res.status(201).json(populatedBoard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating board' });
    }
};

// @desc    Update a board
// @route   PUT /api/boards/:id
// @access  Private (Owner only for now, can be extended for members)
const updateBoard = async (req, res) => {
    const { title } = req.body;

    try {
        let board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if the authenticated user is the owner of the board
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to update this board' });
        }

        board.title = title || board.title; // Only update title for now

        const updatedBoard = await board.save();
        const populatedBoard = await Board.findById(updatedBoard._id)
            .populate('owner', 'name email')
            .populate('members', 'name email');

        res.status(200).json(populatedBoard);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid board ID format' });
        }
        res.status(500).json({ message: 'Server error updating board' });
    }
};

// @desc    Delete a board
// @route   DELETE /api/boards/:id
// @access  Private (Owner only)
const deleteBoard = async (req, res) => {
    try {
        const board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if the authenticated user is the owner of the board
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to delete this board' });
        }

        await board.deleteOne(); // Mongoose 6+ uses deleteOne() or deleteMany()

        res.status(200).json({ message: 'Board removed' });
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid board ID format' });
        }
        res.status(500).json({ message: 'Server error deleting board' });
    }
};

// @desc    Add a member to a board
// @route   PUT /api/boards/:id/members
// @access  Private (Owner only)
const addBoardMember = async (req, res) => {
    const { email } = req.body; // Email of the user to add

    try {
        let board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if the authenticated user is the owner of the board
        if (board.owner.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized to add members to this board' });
        }

        // Find the user to add by email
        const userToAdd = await User.findOne({ email });
        if (!userToAdd) {
            return res.status(404).json({ message: 'User with that email not found' });
        }

        // Check if user is already a member
        if (board.members.includes(userToAdd._id)) {
            return res.status(400).json({ message: 'User is already a member of this board' });
        }

        board.members.push(userToAdd._id);
        const updatedBoard = await board.save();

        const populatedBoard = await Board.findById(updatedBoard._id)
            .populate('owner', 'name email')
            .populate('members', 'name email');

        res.status(200).json(populatedBoard);

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid board ID format' });
        }
        res.status(500).json({ message: 'Server error adding member' });
    }
};

module.exports = {
    getBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
    addBoardMember,
};