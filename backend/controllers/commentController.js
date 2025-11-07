const Comment = require('../models/Comment');
const Card = require('../models/Card');
const Board = require('../models/Board'); // For authorization
const User = require('../models/User'); // For populating author details

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

// Helper to emit Socket.IO events from request context
const { emitBoardUpdate } = require('../utils/socketEmitter');

// @desc    Get comments for a specific card
// @route   GET /api/cards/:cardId/comments
// @access  Private (Board Members Only)
const getComments = async (req, res) => {
    const { cardId } = req.params;

    try {
        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const authCheck = await checkBoardMembership(card.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        const comments = await Comment.find({ card: cardId })
            .populate('author', 'name email') // Populate author details
            .sort('createdAt'); // Sort by creation time

        res.status(200).json(comments);
    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid card ID format' });
        }
        res.status(500).json({ message: 'Server error fetching comments' });
    }
};

// @desc    Add a comment to a card
// @route   POST /api/cards/:cardId/comments
// @access  Private (Board Members Only)
const addComment = async (req, res) => {
    const { cardId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text cannot be empty' });
    }

    try {
        const card = await Card.findById(cardId);
        if (!card) {
            return res.status(404).json({ message: 'Card not found' });
        }

        const authCheck = await checkBoardMembership(card.board, req.user._id);
        if (authCheck.status !== 200) {
            return res.status(authCheck.status).json({ message: authCheck.message });
        }

        const comment = new Comment({
            text,
            author: req.user._id,
            card: cardId,
            board: card.board, // Link comment to board for easier Socket.IO emission
        });

        const createdComment = await comment.save();
        const populatedComment = await Comment.findById(createdComment._id)
            .populate('author', 'name email');

        res.status(201).json(populatedComment);

        // Emit real-time event
        emitBoardUpdate(req, card.board, 'commentCreated', populatedComment);

    } catch (error) {
        console.error(error);
        if (error.kind === 'ObjectId') {
            return res.status(400).json({ message: 'Invalid card ID format' });
        }
        res.status(500).json({ message: 'Server error adding comment' });
    }
};

module.exports = {
    getComments,
    addComment,
};