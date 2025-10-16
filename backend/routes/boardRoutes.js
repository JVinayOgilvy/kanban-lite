const express = require('express');
const {
    getBoards,
    getBoardById,
    createBoard,
    updateBoard,
    deleteBoard,
    addBoardMember,
} = require('../controllers/boardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// All board routes will be protected by the 'protect' middleware
router.route('/')
    .get(protect, getBoards)
    .post(protect, createBoard);

router.route('/:id')
    .get(protect, getBoardById)
    .put(protect, updateBoard)
    .delete(protect, deleteBoard);

router.route('/:id/members')
    .put(protect, addBoardMember); // Route to add a member to a board

module.exports = router;