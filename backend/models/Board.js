const mongoose = require('mongoose');

const boardSchema = mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Please add a board title'],
            trim: true, // Removes whitespace from both ends of a string
            maxlength: [100, 'Title can not be more than 100 characters'],
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // References the User model
            required: true,
        },
        members: [ // Array of User IDs who are members of this board
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        // We will embed Lists and Cards later, or reference them.
        // For now, let's keep it simple.
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Pre-save hook to ensure the owner is always a member
boardSchema.pre('save', function (next) {
    if (this.isNew && !this.members.includes(this.owner)) {
        this.members.push(this.owner);
    }
    next();
});

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;