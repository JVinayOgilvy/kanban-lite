const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // For password hashing

const userSchema = mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'Please add a name'],
        },
        email: {
            type: String,
            required: [true, 'Please add an email'],
            unique: true,
            match: [
                /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
                'Please add a valid email',
            ],
        },
        password: {
            type: String,
            required: [true, 'Please add a password'],
            minlength: 6,
            select: false, // Don't return password in queries by default
        },
    },
    {
        timestamps: true, // Adds createdAt and updatedAt fields
    }
);

// --- Middleware to hash password before saving ---
userSchema.pre('save', async function (next) {
    // Only run this function if password was actually modified
    if (!this.isModified('password')) {
        next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// --- Method to compare entered password with hashed password ---
userSchema.methods.matchPassword = async function (enteredPassword) {
    // 'this.password' here refers to the hashed password from the database
    // Note: We need to explicitly select the password field in queries if 'select: false' is used.
    return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;