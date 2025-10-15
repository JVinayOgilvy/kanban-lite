const dotenv = require('dotenv');
dotenv.config(); // Load environment variables from .env file

const app = require('./app'); // Import the Express app
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});