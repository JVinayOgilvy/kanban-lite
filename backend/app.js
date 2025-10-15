const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes'); // Import auth routes
const boardRoutes = require('./routes/boardRoutes');

const app = express();

// Middleware
app.use(cors()); // Allows cross-origin requests from your React frontend
app.use(express.json()); // Body parser for JSON data
app.use(express.urlencoded({ extended: false })); // Body parser for URL-encoded data

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/boards', boardRoutes);

// Basic route for testing server
app.get('/', (req, res) => {
    res.send('API is running...');
});

// You can add a simple error handling middleware here if you want
// app.use((err, req, res, next) => {
//     console.error(err.stack);
//     res.status(500).send('Something broke!');
// });

module.exports = app;