const express = require('express');
const mongoose = require('mongoose');
const app = express();

const port = process.env.PORT || 3000;

// --- Determine DB_URI ---
let dbURI;
if (process.env.NODE_ENV === 'test') { // Set by CI workflow's env block
    dbURI = process.env.DB_URI; // Should be mongodb://mongo:27017/recipeHubDb_test_ci
    console.log(`CI TEST ENVIRONMENT. DB_URI from workflow: ${dbURI}`);
} else if (process.env.NODE_ENV === 'test_local') { // Set by npm test script in package.json
    dbURI = process.env.DB_URI; // Should be mongodb://127.0.0.1:27017/recipeHubDb_test_local
    console.log(`LOCAL TEST ENVIRONMENT. DB_URI from npm script: ${dbURI}`);
} else {
    // Default for development (docker-compose up) or local 'node server.js'
    // For docker-compose, 'mongo' is the hostname. For direct 'node server.js', use '127.0.0.1'.
    // We can make this smarter, but for now, let's assume docker-compose is primary local dev.
    dbURI = process.env.DB_URI || 'mongodb://mongo:27017/recipeHubDb';
    console.log(`DEVELOPMENT/OTHER. Effective DB_URI: ${dbURI}`);
}

if (!dbURI) {
    console.error("FATAL ERROR: DB_URI is not defined. Check environment variables.");
    process.exit(1);
}

// --- Database Connection ---
mongoose.connect(dbURI)
  .then(() => {
    console.log(`MongoDB Connected: ${dbURI}`);
    // Start listening only if not in a test environment initiated by Jest
    // and if this file is the main module being run.
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'test_local' && require.main === module) {
      app.listen(port, () => {
        console.log(`Server running and listening on http://localhost:${port}`);
      });
    }
  })
  .catch(err => {
    console.error(`DB Connection Error for ${dbURI}:`, err.message);
    if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'test_local' && require.main === module) {
      process.exit(1);
    }
    // In test mode, error will be handled/seen by Jest
  });

// Middleware
app.use(express.json());

// Routes - Ensure casing matches your actual file/folder names
const mainRoutes = require('./routes/mainroutes');
const userRoutes = require('./routes/userRoutes');

app.use('/', mainRoutes);
app.use('/api/user', userRoutes); // Using singular 'user' as per your successful Postman tests

module.exports = app; // Export app for supertest