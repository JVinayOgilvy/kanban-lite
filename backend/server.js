const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env file

const http = require('http'); // Import Node.js http module
const { Server } = require('socket.io'); // Import Socket.IO Server

const app = require('./app'); // Import the Express app
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Create HTTP server using the Express app
const server = http.createServer(app);

// Initialize Socket.IO server
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000", // Allow connections from your React frontend
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Make io available to our Express app (routes and controllers)
app.set('socketio', io);

// Basic Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Example: Join a board room
    socket.on('joinBoard', (boardId) => {
        socket.join(boardId);
        console.log(`User ${socket.id} joined board room: ${boardId}`);
    });

    // Example: Leave a board room
    socket.on('leaveBoard', (boardId) => {
        socket.leave(boardId);
        console.log(`User ${socket.id} left board room: ${boardId}`);
    });

    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

// Start the HTTP server (which Express and Socket.IO are attached to)
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});