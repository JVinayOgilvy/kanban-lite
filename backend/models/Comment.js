const mongoose = require('mongoose');

const commentSchema = mongoose.Schema(
    {
        text: {
            type: String,
            required: [true, 'Comment text cannot be empty'],
            trim: true,
            maxlength: [500, 'Comment cannot be more than 500 characters'],
        },
        author: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        card: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Card',
            required: true,
        },
        board: { // Store board ID for easier authorization and Socket.IO emission
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Board',
            required: true,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

const Comment = mongoose.model('Comment', commentSchema);

module.exports = Comment;