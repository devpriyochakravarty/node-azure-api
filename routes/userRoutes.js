// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Import the User model
const bcrypt =require('bcryptjs');
const jwt= require('jsonwebtoken');
const JWT_SECRET= 'dev1441';

// --- CRUD Routes ---

// POST /api/users - Create a new user
// Path is '/' because '/api/users' is handled by app.use() in server.js
router.post('/', async (req, res) => {
  console.log('Received request to create user. Body:', req.body); // Debug log
  if (!req.body || !req.body.username || !req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Username, email, and password are required." });
  }

  try {
    // --- HASH THE PASSWORD ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(req.body.password, salt);
    // --- END HASHING ---
 
    // Create a new user instance using the data from the request body
    const newUser = new User({
      username: req.body.username,
      email: req.body.email,
      password: hashedPassword // Plain text for now - NEEDS HASHING LATER
    });

    // Save the new user to the database
    const savedUser = await newUser.save(); // .save() handles validation based on schema

    console.log("User saved successfully:", savedUser._id); // Debug log

    // Send back the created user object (excluding password)
    res.status(201).json({ // 201 Created status code
      message: "User created successfully!",
      user: {
         id: savedUser._id,
         username: savedUser.username,
         email: savedUser.email,
         createdAt: savedUser.createdAt,
         updatedAt: savedUser.updatedAt
      }
    });

  } catch (error) {
    console.error("Error creating user:", error.message); // Log the error message

    // Handle specific errors
    if (error.code === 11000) { // Duplicate key error
       // Determine which field caused the duplicate error (more robust check needed for production)
       let field = Object.keys(error.keyPattern)[0];
       res.status(409).json({ message: `${field} already exists.` }); // 409 Conflict
    } else if (error.name === 'ValidationError') {
       // Extract validation messages for a cleaner response
       let errors = {};
       Object.keys(error.errors).forEach((key) => {
           errors[key] = error.errors[key].message;
       });
       res.status(400).json({ message: "Validation Error", errors: errors }); // 400 Bad Request
    } else {
       // Generic server error for other issues
       res.status(500).json({ message: "Server error creating user." }); // 500 Internal Server Error
    }
  }
});

// --- Placeholder for other routes ---
// GET /api/users - Get all users (To be implemented)
router.get('/', async (req, res) => {
    try {
      // Find all documents in the 'users' collection
      // .select('-password') excludes the password field from the results
      const users = await users.find({}).select('-password'); // Empty filter {} means find all
  
      res.status(200).json({ // 200 OK status
        count: users.length, // Optionally include the count
        users: users
      });
  
    } catch (error) {
      console.error("Error fetching users:", error.message);
      res.status(500).json({ message: "Server error fetching users." });
    }
  });
  
  


// GET /api/users/:id - Get a single user (To be implemented)
// GET /api/user/:id - Get a single user by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.params.id; // Get the ID from the URL parameters

    // Find a single document by its _id field
    // Also exclude the password
    const user = await User.findById(userId).select('-password');

    if (!user) {
      // If no user is found with that ID
      return res.status(404).json({ message: 'User not found.' }); // Use return to stop execution here
    }

    // User found, send it back
    res.status(200).json(user); // Send the single user object

  } catch (error) {
    console.error("Error fetching user by ID:", error.message);
    // Handle specific errors, like invalid ID format
    if (error.kind === 'ObjectId') {
        return res.status(400).json({ message: 'Invalid user ID format.' }); // Bad Request
    }
    res.status(500).json({ message: "Server error fetching user." });
  }
});
// PATCH /api/users/:id - Update a user (To be implemented)
// routes/userRoutes.js
// ... (previous code: POST /, GET /, GET /:id ) ...

// PATCH /api/user/:id - Update a user (partially)
// (Replaces the previous placeholder)
router.patch('/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        const updates = req.body; // Get the fields to update from the request body

        // Find the user by ID and update it with the provided data
        // { new: true } option returns the modified document rather than the original
        // { runValidators: true } ensures schema validations are run on the update
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            updates,
            { new: true, runValidators: true }
        ).select('-password'); // Exclude password from the returned object

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found.' });
        }

        // User updated successfully
        res.status(200).json({
            message: "User updated successfully!",
            user: updatedUser
        });

    } catch (error) {
        console.error("Error updating user:", error.message);
         // Handle specific errors
        if (error.code === 11000) { // Duplicate key error (e.g., trying to update email to one that already exists)
            let field = Object.keys(error.keyPattern)[0];
            res.status(409).json({ message: `${field} already exists.` }); // 409 Conflict
        } else if (error.name === 'ValidationError') {
            let errors = {};
            Object.keys(error.errors).forEach((key) => {
                errors[key] = error.errors[key].message;
            });
            res.status(400).json({ message: "Validation Error", errors: errors }); // 400 Bad Request
        } else if (error.kind === 'ObjectId') {
             return res.status(400).json({ message: 'Invalid user ID format.' }); // Bad Request
        }
        else {
            res.status(500).json({ message: "Server error updating user." });
        }
    }
});




// DELETE /api/user/:id - Delete a user
// (Replaces the previous placeholder)
router.delete('/:id', async (req, res) => {
  try {
      const userId = req.params.id;

      // Find the user by ID and delete it
      const deletedUser = await User.findByIdAndDelete(userId);

      if (!deletedUser) {
          // If findByIdAndDelete returns null, the user wasn't found
          return res.status(404).json({ message: 'User not found.' });
      }

      // User deleted successfully
      // Common practice is to send a 200 OK or 204 No Content status
      // Sending back the deleted user object can be useful sometimes
      res.status(200).json({
          message: "User deleted successfully!",
          user: { // Send back some info about the deleted user
              id: deletedUser._id,
              username: deletedUser.username
          }
       });
      // Alternatively, for 204 No Content (if you don't need to send info back):
      // res.status(204).send();

  } catch (error) {
      console.error("Error deleting user:", error.message);
       // Handle specific errors, like invalid ID format
      if (error.kind === 'ObjectId') {
          return res.status(400).json({ message: 'Invalid user ID format.' }); // Bad Request
      }
      res.status(500).json({ message: "Server error deleting user." });
  }
});
// routes/userRoutes.js
// ... require, JWT_SECRET ...

// --- AUTH ROUTES ---

// POST /api/user/login - User Login
router.post('/login', async (req, res) => {
    console.log('Login attempt:', req.body.email); // Log attempt, avoid logging password

    // Check if email and password are provided
    if (!req.body || !req.body.email || !req.body.password) {
        return res.status(400).json({ message: "Email and password are required." });
    }

    const { email, password } = req.body; // Destructure for convenience

    try {
        // 1. Find the user by email
        const user = await User.findOne({ email: email.toLowerCase() }); // Use findOne, ensure email matches case used in schema
        if (!user) {
            // User not found (Generic message for security - don't reveal if email exists)
            return res.status(401).json({ message: 'Invalid credentials.' }); // 401 Unauthorized
        }

        // 2. Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            // Password doesn't match (Generic message for security)
            return res.status(401).json({ message: 'Invalid credentials.' });
        }

        // 3. User is authenticated - Generate JWT
        const payload = {
            user: {
                id: user.id, // or user._id.toString()
                username: user.username,
                email: user.email
                // Add other relevant non-sensitive info if needed (e.g., role)
            }
        };

        jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: '1h' }, // Token expires in 1 hour (e.g., '1d', '7d')
            (err, token) => {
                if (err) throw err; // Handle signing error
                res.status(200).json({
                    message: "Login successful!",
                    token: token // Send the token to the client
                });
            }
        );

    } catch (error) {
        console.error("Error during login:", error.message);
        res.status(500).json({ message: "Server error during login." });
    }
});


// --- CRUD Routes ---
// POST / - Create User (already implemented)
// ... other CRUD routes ...

module.exports = router;