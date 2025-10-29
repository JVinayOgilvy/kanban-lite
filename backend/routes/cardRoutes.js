const express = require('express');
const {
    getCards,
    getCardById,
    createCard,
    updateCard,
    deleteCard,
    moveCard, // <--- Add this
} = require('../controllers/cardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes for cards within a specific list
router.route('/lists/:listId/cards')
    .get(protect, getCards)
    .post(protect, createCard);

// Routes for individual cards
router.route('/cards/:id')
    .get(protect, getCardById)
    .put(protect, updateCard)
    .delete(protect, deleteCard);

// New route for moving a card
router.put('/cards/:id/move', protect, moveCard); // <--- Add this new route

module.exports = router;