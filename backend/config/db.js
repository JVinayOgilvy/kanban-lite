const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI, {
            // These options are deprecated in newer Mongoose versions,
            // but good to include for broader compatibility if needed.
            // useNewUrlParser: true,
            // useUnifiedTopology: true,
            // useCreateIndex: true, // Deprecated
            // useFindAndModify: false // Deprecated
        });

        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1); // Exit process with failure
    }
};

module.exports = connectDB;