const express = require('express');
const { getComments, addComment } = require('../controllers/commentController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes for comments on a specific card
router.route('/cards/:cardId/comments')
    .get(protect, getComments)
    .post(protect, addComment);

module.exports = router;