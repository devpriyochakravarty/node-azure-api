// server.js
const express = require('express');
const mongoose = require('mongoose');
const app = express();
const port = process.env.PORT || 3000;

// Determine DB_URI:
// 1. From environment (set by CI, or by npm script for local tests)
// 2. Fallback for local 'docker-compose up'
// 3. Fallback for local 'node server.js' without compose (if you want to support that)
const ci_test_db_uri = process.env.DB_URI; // This will be primary
const local_compose_db_uri = 'mongodb://mongo:27017/recipeHubDb';
const local_direct_db_uri = 'mongodb://127.0.0.1:27017/recipeHubDb';

let dbURI;
if (ci_test_db_uri) {
    dbURI = ci_test_db_uri;
} else {
    // Simplistic check: if running in a test environment locally, use 127.0.0.1 for test DB
    // This assumes npm test script sets DB_URI to 127.0.0.1.../recipeHubDb_test
    // For regular 'node server.js' or 'docker-compose up', DB_URI won't be from test script.
    // This part needs careful thought based on how you run locally.
    // Let's assume for now your `npm test` script sets the DB_URI for local tests.
    // And `docker-compose up` will not have DB_URI set, so default to `mongo` hostname.
    dbURI = local_compose_db_uri; // Default for docker-compose
    if (process.env.NODE_ENV === 'development_direct_node') { // Hypothetical env for direct run
         dbURI = local_direct_db_uri;
    }
}
console.log(`Attempting to connect to MongoDB at: ${dbURI}`);


// --- Database Connection ---
mongoose.connect(dbURI)
  .then(() => {
    console.log(`MongoDB Connected: ${dbURI}`);
    if (process.env.NODE_ENV !== 'test' && require.main === module) { // Only listen if run directly and not in test
      app.listen(port, () => console.log(`Server listening on port ${port}`));
    }
  })
  .catch(err => {
    console.error(`DB Connection Error for ${dbURI}:`, err.message);
    if (process.env.NODE_ENV !== 'test' && require.main === module) process.exit(1);
  });

// Middleware & Routes
app.use(express.json());
const mainRoutes = require('./routes/mainRoutes');
const userRoutes = require('./routes/userRoutes');
app.use('/', mainRoutes);
app.use('/api/user', userRoutes);

module.exports = app;