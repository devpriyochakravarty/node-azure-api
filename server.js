// server.js

// 1. Import necessary modules
const express = require('express');
const mongoose = require('mongoose');
const mainRoutes = require('./routes/mainroutes'); // Assuming this path is correct
const userRoutes = require('./routes/userRoutes')

// 2. Initialize Express app and define port
const app = express();
const port = 3000;

app.use(express.json());

// 3. Define Database Connection URI
const dbURI = process.env.DB_URI || 'mongodb://mongo:27017/recipeHubDb';

// --- DATABASE CONNECTION ---
// Attempt to connect to MongoDB
mongoose.connect(dbURI)
  .then((result) => {
    // This block runs ONLY if the connection is successful
    console.log('Connected successfully to MongoDB database!');

    // It's best practice to start listening for HTTP requests *after*
    // the database connection is established.
       if (process.env.NODE_ENV !== 'test') { 
    app.listen(port, () => {
      console.log(`Server running and listening on http://localhost:${port}`);
      // Note: Changed your log message slightly for standard format
    });
  }

    app.use('/', mainRoutes);
    app.use('/api/user',userRoutes);

  })
  .catch((err) => {
    // This block runs ONLY if the connection fails
    console.error('Database connection error:', err);
    // Consider exiting if the DB is critical for startup:
    // process.exit(1);
      if (process.env.NODE_ENV !== 'test') { // Only exit if not testing
        process.exit(1);
    }
  });

  module.exports=app;
  

// --- NO app.listen() here anymore ---
// --- NO app.use() here anymore (moved inside .then for clarity) ---