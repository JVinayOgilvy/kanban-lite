const mongoose = require('mongoose');

const cardSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a card title'],
            trim: true,
            maxlength: [200, 'Title can not be more than 200 characters'],
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description can not be more than 1000 characters'],
            default: '',
        },
        list: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'List', // References the List model
            required: true,
        },
        board: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Board', // References the Board model (for easier querying/auth)
            required: true,
        },
        order: {
            type: Number,
            required: true,
            default: 0, // Default order, will be updated dynamically
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // References the User model
            default: null, // Card can be unassigned
        },
        dueDate: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

const Card = mongoose.model('Card', cardSchema);

module.exports = Card;