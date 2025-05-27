// server.js

// 1. Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const mainRoutes = require('./routes/mainroutes');
const userRoutes = require('./routes/userRoutes');

// 2. Initialize Express app
const app = express();
const port = process.env.PORT || 3000; // Use environment variable for port if available

// --- MIDDLEWARE ---
app.use(express.json());
// --- END MIDDLEWARE ---

// 3. Define Database Connection URI
// Prioritize DB_URI from environment (for CI), then fallback for local Docker Compose
const dbURI = process.env.DB_URI || 'mongodb://mongo:27017/recipeHubDb';

// --- DATABASE CONNECTION ---
// Wrap in a function to control when connection and listening happens, especially for tests
const connectDBAndStartServer = async () => {
  try {
    await mongoose.connect(dbURI);
    console.log('Connected successfully to MongoDB database!');

    // Mount Routers (can be done before or after connection, but before listen)
    app.use('/', mainRoutes);
    app.use('/api/user', userRoutes); // Assuming your user routes are at /api/user

    // Start listening for HTTP requests ONLY if not in a 'test' environment
    // or if this file is the main module being run.
    // Jest typically sets NODE_ENV to 'test'.
    if (process.env.NODE_ENV !== 'test') {
      app.listen(port, () => {
        console.log(`Server running and listening on http://localhost:${port}`);
      });
    }
  } catch (err) {
    console.error('Database connection error:', err.message); // Log only error message for brevity
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1); // Exit if not in test mode and DB connection fails
    } else {
      throw err; // Re-throw error in test mode so Jest sees the failure
    }
  }
};

// If this file is run directly (e.g., `node server.js`), connect and start.
// If required by another module (like tests), just export 'app' and the function.
if (require.main === module) {
  connectDBAndStartServer();
}

// Export the app for testing purposes and the connect function if tests need to manage it
module.exports = { app, connectDBAndStartServer, mongooseInstance: mongoose };