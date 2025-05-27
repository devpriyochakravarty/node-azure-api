// server.js
const express = require('express');
const mongoose = require('mongoose');
const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');

const app = express();
const port = process.env.PORT || 3000;
const dbURI = process.env.DB_URI || 'mongodb://mongo:27017/recipeHubDb'; // Default for compose

app.use(express.json());

// --- MOUNT ROUTERS IMMEDIATELY ---
// So they are part of the 'app' instance that gets exported
app.use('/', mainRoutes);
app.use('/api/user', userRoutes);

const connectDB = async () => {
    try {
        await mongoose.connect(dbURI);
        console.log('MongoDB Connected via connectDB function...');
    } catch (err) {
        console.error('Failed to connect to MongoDB via connectDB function', err.message);
        // In a real app, you might want to throw this to stop test execution
        // or handle it more gracefully if tests can run partially without DB.
        // For our CRUD tests, DB is essential.
        if (process.env.NODE_ENV !== 'test') { // Only exit if not testing
            process.exit(1);
        }
        throw err; // Make sure test setup knows connection failed
    }
};

// Start server only if run directly and not in test mode
if (require.main === module && process.env.NODE_ENV !== 'test') {
    connectDB().then(() => {
        app.listen(port, () => {
            console.log(`Server running and listening on http://localhost:${port}`);
        });
    });
}

// Export the app and the connectDB function for tests to manage
module.exports = { app, connectDB, mongooseInstance: mongoose };