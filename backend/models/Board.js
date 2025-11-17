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
        members: [ // Array of objects, each containing a user and their role
            {
                user: { // Changed from just 'type: mongoose.Schema.Types.ObjectId'
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                    required: true,
                },
                role: {
                    type: String,
                    enum: ['owner', 'admin', 'member'], // Define possible roles
                    default: 'member',
                },
            },
        ],
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// Pre-save hook to ensure the owner is always a member with 'owner' role
boardSchema.pre('save', function (next) {
    // Check if the owner is already in the members array
    const ownerExists = this.members.some(member => member.user.equals(this.owner));

    if (!ownerExists) {
        // If owner is not a member, add them with the 'owner' role
        this.members.push({ user: this.owner, role: 'owner' });
    } else {
        // If owner is already a member, ensure their role is 'owner'
        const ownerMember = this.members.find(member => member.user.equals(this.owner));
        if (ownerMember && ownerMember.role !== 'owner') {
            ownerMember.role = 'owner';
        }
    }
    next();
});

const Board = mongoose.model('Board', boardSchema);

module.exports = Board;