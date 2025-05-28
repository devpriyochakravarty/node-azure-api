// server.js
const express = require('express');
const mongoose = require('mongoose');
// ... other requires ...
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
// ... mount routers ...
// app.use('/', mainRoutes);
// app.use('/api/user', userRoutes);

// Separate DB connection logic
const connectDB = async () => {
    // Determine URI at the time of calling connectDB
    const uriToConnect = process.env.DB_URI || 'mongodb://mongo:27017/recipeHubDb'; // Default for Docker Compose
    console.log(`Attempting to connect to MongoDB at: ${uriToConnect}`); // DEBUG LOG
    try {
        await mongoose.connect(uriToConnect);
        console.log(`MongoDB Connected: ${uriToConnect}`);
    } catch (err) {
        console.error(`DB Connection Error for ${uriToConnect}:`, err.message);
        // In test environment, we might not want to process.exit
        if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'test_setup') {
            process.exit(1);
        }
        throw err; // Re-throw for test environment to catch
    }
};

// Start server logic
const startAppListening = () => {
    if (process.env.NODE_ENV !== 'test') {
        app.listen(port, () => {
            console.log(`Server running and listening on http://localhost:${port}`);
        });
    }
};

// If run directly, connect to DB and start listening
if (require.main === module && process.env.NODE_ENV !== 'test_setup') {
    connectDB().then(() => {
        startAppListening();
    });
}

// Export for testing
module.exports = { app, connectDB, mongooseInstance: mongoose, startAppListening };