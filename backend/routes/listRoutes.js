const express = require('express');
const {
    getLists,
    getListById,
    createList,
    updateList,
    deleteList,
} = require('../controllers/listController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Routes for lists within a specific board
router.route('/boards/:boardId/lists')
    .get(protect, getLists)
    .post(protect, createList);

// Routes for individual lists
router.route('/lists/:id')
    .get(protect, getListById)
    .put(protect, updateList)
    .delete(protect, deleteList);

module.exports = router;