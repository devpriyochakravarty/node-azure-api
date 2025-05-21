// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Import the User model
const bcrypt =require('bcryptjs');
const jwt= require('jsonwebtoken');
const { protect } = require('../Middleware/authMiddleware');
const JWT_SECRET= 'dev1441';
const {body,validationResult}=require('express-validator');

// --- CRUD Routes ---

// POST /api/users - Create a new user
// Path is '/' because '/api/users' is handled by app.use() in server.js

router.post('/',
    [ // Validation rules array
        body('username', 'username is required').not().isEmpty().trim().escape(),
        body('username', 'username must be 3 characters').isLength({ min: 3 }),
        body('email', 'please include the valid email').isEmail().normalizeEmail(),
        body('password', 'password is required').not().isEmpty(),
        body('password', 'password must be atleast 6 characters').isLength({ min: 6 })
    ],
    async (req, res) => {
        console.log('receive request to create user.body:', req.body);
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() }); // RETURN here
        }

        try {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);

            const newUser = new User({
                username: req.body.username,
                email: req.body.email,
                password: hashedPassword
            });

            const savedUser = await newUser.save();
            console.log("User saved successfully:", savedUser._id);
            console.log("User saved successfully, about to send JSON response. User ID:", savedUser._id);

            // --- ONLY ONE SUCCESS RESPONSE ---
            res.status(201).json({
                message: "User created successfully!",
                user: {
                    id: savedUser._id,
                    username: savedUser.username,
                    email: savedUser.email,
                    createdAt: savedUser.createdAt,
                    updatedAt: savedUser.updatedAt
                }
            });
            return; // Explicitly return after sending the success response

        } catch (error) {
            console.error("Error creating user:", error.message);

            // Check if headers have already been sent before trying to send another response
            if (res.headersSent) {
                console.error("Headers already sent, cannot send error response from catch block.");
                return; // Crucial to prevent "Cannot set headers" if an error occurs AFTER res.json in try
            }

            if (error.code === 11000) {
                let field = Object.keys(error.keyPattern)[0];
                return res.status(409).json({ message: `${field} already exists.` });
            } else if (error.name === 'ValidationError') {
                let errorsObj = {};
                Object.keys(error.errors).forEach((key) => {
                    errorsObj[key] = error.errors[key].message;
                });
                return res.status(400).json({ message: "Mongoose Validation Error", errors: errorsObj });
            } else {
                return res.status(500).json({ message: "Server error creating user." });
            }
        }
    }
);

// --- Placeholder for other routes ---
// GET /api/users - Get all users (To be implemented)
router.get('/',protect, async (req, res) => {
    try {
      // Find all documents in the 'users' collection
      // .select('-password') excludes the password field from the results
      const users = await User.find({}).select('-password'); // Empty filter {} means find all
  
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
router.get('/:id',protect, async (req, res) => {
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
router.patch('/:id',protect,[

    body('username').optional().not().isEmpty().withMessage('username cannot be empty if provided').trim().escape().isLength({min:3}).withMessage('please include a valid email if provided').normalizeEmail(),
    body('email').optional().isEmail().withMessage('please include the valid email if provided').normalizeEmail(),
    body('password').optional().isLength({min:6}).withMessage('passsword must be atleast 6 characters if provided ')

] ,async (req, res) => {
    const errors= validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors:errors.array()});
    }
    try {
        const userId = req.params.id;
        const updates = req.body; // Get the fields to update from the request body

        if (updates.password){
            const salt=await bcrypt.genSalt(10);
            updates.password= await bcrypt.hash(updates.password,salt);
            console.log('password being updated and hashed for PATCH request.');
        }

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
router.delete('/:id',protect, async (req, res) => {
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

