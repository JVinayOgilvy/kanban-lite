const mongoose = require('mongoose');

const listSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a list title'],
            trim: true,
            maxlength: [100, 'Title can not be more than 100 characters'],
        },
        board: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Board', // References the Board model
            required: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0, // Default order, will be updated dynamically
        },
        // We will embed Cards later, or reference them.
        // For now, lists just belong to boards.
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

const List = mongoose.model('List', listSchema);

module.exports = List;