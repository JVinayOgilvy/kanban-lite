const Board = require('../models/Board');
const User = require('../models/User');

// Helper function to get a user's role on a specific board
const getUserBoardRole = (board, userId) => {
    const memberEntry = board.members.find(m => {
        // Ensure m.user exists and is not null
        if (!m.user) return false;

        // If m.user is a populated object (has an _id property)
        // then compare its _id with userId
        if (m.user._id) {
            return m.user._id.equals(userId);
        }
        // If m.user is still an ObjectId (not populated or partially populated),
        // then compare it directly with userId
        return m.user.equals(userId);
    });
    return memberEntry ? memberEntry.role : null;
};

// Helper function to check if a user has at least a certain role
const hasRequiredRole = (userRole, requiredRole) => {
    const roles = ['member', 'admin', 'owner'];
    return roles.indexOf(userRole) >= roles.indexOf(requiredRole);
};

// @desc    Get all boards for the authenticated user
// @route   GET /api/boards
// @access  Private
const getBoards = async (req, res) => {
    try {
        // Find boards where the authenticated user is a member (regardless of role)
        const boards = await Board.find({
            'members.user': req.user._id
        })
            .populate('owner', 'name email')
            .populate('members.user', 'name email'); // Populate the 'user' field within the members array

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
            .populate('members.user', 'name email'); // Populate the 'user' field within the members array

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Check if the authenticated user is a member of the board
        const userRole = getUserBoardRole(board, req.user._id);
        if (!userRole) {
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
            owner: req.user._id,
            // The pre-save hook in the Board model will automatically add the owner with 'owner' role
            members: [], // Initialize as empty, pre-save hook will populate owner
        });

        const createdBoard = await board.save();
        // Populate owner and members for the response
        const populatedBoard = await Board.findById(createdBoard._id)
            .populate('owner', 'name email')
            .populate('members.user', 'name email');

        res.status(201).json(populatedBoard);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating board' });
    }
};

// @desc    Update a board
// @route   PUT /api/boards/:id
// @access  Private (Owner or Admin)
const updateBoard = async (req, res) => {
    const { title } = req.body;

    try {
        let board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Authorization: Only owner or admin can update board details
        const userRole = getUserBoardRole(board, req.user._id);
        if (!hasRequiredRole(userRole, 'admin')) { // 'admin' role or higher
            return res.status(403).json({ message: 'Not authorized to update this board' });
        }

        board.title = title || board.title;

        const updatedBoard = await board.save();
        const populatedBoard = await Board.findById(updatedBoard._id)
            .populate('owner', 'name email')
            .populate('members.user', 'name email');

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

        // Authorization: Only owner can delete the board
        const userRole = getUserBoardRole(board, req.user._id);
        if (!hasRequiredRole(userRole, 'owner')) { // Only 'owner' role
            return res.status(403).json({ message: 'Not authorized to delete this board' });
        }

        await board.deleteOne();

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
// @access  Private (Owner or Admin)
const addBoardMember = async (req, res) => {
    const { email, role = 'member' } = req.body; // Default role is 'member'

    try {
        let board = await Board.findById(req.params.id);

        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Authorization: Only owner or admin can add members
        const currentUserRole = getUserBoardRole(board, req.user._id);
        if (!hasRequiredRole(currentUserRole, 'admin')) {
            return res.status(403).json({ message: 'Not authorized to add members to this board' });
        }

        const userToAdd = await User.findOne({ email });
        if (!userToAdd) {
            return res.status(404).json({ message: 'User with that email not found' });
        }

        // Check if user is already a member
        if (board.members.some(member => member.user.equals(userToAdd._id))) {
            return res.status(400).json({ message: 'User is already a member of this board' });
        }

        // Validate the role being assigned
        if (!['member', 'admin'].includes(role)) { // Owner role can only be assigned by pre-save hook
            return res.status(400).json({ message: 'Invalid role specified' });
        }
        // An admin cannot assign an owner role
        if (role === 'owner' && !hasRequiredRole(currentUserRole, 'owner')) {
            return res.status(403).json({ message: 'Only board owner can assign owner role' });
        }

        board.members.push({ user: userToAdd._id, role });
        const updatedBoard = await board.save();

        const populatedBoard = await Board.findById(updatedBoard._id)
            .populate('owner', 'name email')
            .populate('members.user', 'name email');

        res.status(200).json(populatedBoard);

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid board ID format' });
        }
        res.status(500).json({ message: 'Server error adding member' });
    }
};

// @desc    Update a member's role on a board
// @route   PUT /api/boards/:id/members/:userId/role
// @access  Private (Owner only)
const updateMemberRole = async (req, res) => {
    const { id: boardId, userId } = req.params;
    const { role } = req.body;

    if (!role || !['member', 'admin', 'owner'].includes(role)) {
        return res.status(400).json({ message: 'Invalid role specified' });
    }

    try {
        let board = await Board.findById(boardId);
        if (!board) {
            return res.status(404).json({ message: 'Board not found' });
        }

        // Authorization: Only owner can change roles
        const currentUserRole = getUserBoardRole(board, req.user._id);
        if (!hasRequiredRole(currentUserRole, 'owner')) {
            return res.status(403).json({ message: 'Not authorized to change member roles' });
        }

        const memberIndex = board.members.findIndex(m => m.user.equals(userId));
        if (memberIndex === -1) {
            return res.status(404).json({ message: 'Member not found on this board' });
        }

        // Prevent owner from changing their own role (or demoting themselves)
        if (board.members[memberIndex].user.equals(req.user._id) && role !== 'owner') {
            return res.status(403).json({ message: 'Owner cannot change their own role' });
        }
        // Prevent changing owner role of another user if not owner
        if (role === 'owner' && !board.members[memberIndex].user.equals(board.owner)) {
            return res.status(403).json({ message: 'Cannot assign owner role to another user' });
        }
        // If changing the actual owner's role, ensure it remains 'owner'
        if (board.members[memberIndex].user.equals(board.owner) && role !== 'owner') {
            return res.status(403).json({ message: 'Cannot change the board owner\'s role' });
        }

        board.members[memberIndex].role = role;
        const updatedBoard = await board.save();

        const populatedBoard = await Board.findById(updatedBoard._id)
            .populate('owner', 'name email')
            .populate('members.user', 'name email');

        res.status(200).json(populatedBoard);

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid ID format' });
        }
        res.status(500).json({ message: 'Server error updating member role' });
    }
};

module.exports = {
    getBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
    addBoardMember,
    updateMemberRole, // <--- NEW EXPORT
    getUserBoardRole, // <--- Export helper for other controllers
    hasRequiredRole,  // <--- Export helper for other controllers
};