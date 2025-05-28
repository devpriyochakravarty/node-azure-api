// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/user'); // Assuming models/User.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../Middleware/authMiddleware'); // Assuming middleware/authMiddleware.js
const { body, validationResult } = require('express-validator');

const JWT_SECRET = process.env.JWT_SECRET || 'a-default-local-secret-that-is-very-secure-dev1441';

// POST / (Create user)
router.post('/',
    [
        body('username', 'username is required').not().isEmpty().trim().escape(),
        body('username', 'username must be 3 characters').isLength({ min: 3 }),
        body('email', 'please include the valid email').isEmail().normalizeEmail(),
        body('password', 'password is required').not().isEmpty(),
        body('password', 'password must be atleast 6 characters').isLength({ min: 6 })
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
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
            return res.status(201).json({ // Added return
                message: "User created successfully!",
                user: { id: savedUser._id, username: savedUser.username, email: savedUser.email, createdAt: savedUser.createdAt, updatedAt: savedUser.updatedAt }
            });
        } catch (error) {
            if (res.headersSent) { console.error("Create user: Headers already sent"); return; }
            console.error("Error creating user:", error.message);
            if (error.code === 11000) {
                let field = Object.keys(error.keyPattern)[0];
                return res.status(409).json({ message: `${field} already exists.` });
            } else if (error.name === 'ValidationError') {
                let errorsObj = {};
                Object.keys(error.errors).forEach((key) => { errorsObj[key] = error.errors[key].message; });
                return res.status(400).json({ message: "Mongoose Validation Error", errors: errorsObj });
            } else {
                return res.status(500).json({ message: "Server error creating user." });
            }
        }
    }
);

// POST /login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: 'Email and password required' });
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) return res.status(401).json({ message: 'Invalid credentials (email)' });
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(401).json({ message: 'Invalid credentials (password)' });
        const payload = { user: { id: user.id, username: user.username, email: user.email } };
        jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) {
                console.error("JWT Sign Error:", err);
                if (res.headersSent) { console.error("Login JWT: Headers already sent"); return; }
                return res.status(500).json({ message: "Error generating token" });
            }
            return res.status(200).json({ message: "Login successful!", token: token });
        });
    } catch (error) {
        if (res.headersSent) { console.error("Login Catch: Headers already sent"); return; }
        console.error("Login server error:", error.message);
        return res.status(500).json({ message: 'Server error during login.' });
    }
});

// GET / (Get all users) - Protected
router.get('/', protect, async (req, res) => {
    try {
        const users = await User.find({}).select('-password');
        return res.status(200).json({ count: users.length, users: users });
    } catch (error) {
        if (res.headersSent) { return; }
        console.error("Get all users error:", error.message);
        return res.status(500).json({ message: 'Server error fetching users.'});
    }
});

// GET /:id (Get one user) - Protected
router.get('/:id', protect, async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json(user);
    } catch (error) {
        if (res.headersSent) { return; }
        console.error("Get user by ID error:", error.message);
        if (error.kind === 'ObjectId') return res.status(400).json({ message: 'Invalid user ID format.' });
        return res.status(500).json({ message: 'Server error fetching user.' });
    }
});


// PATCH /:id (Update user) - Protected
router.patch('/:id', protect,
    [ /* Your validation rules for PATCH, using .optional() */
        body('username').optional().not().isEmpty().withMessage('Username cannot be empty if provided').trim().escape().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
        body('email').optional().isEmail().withMessage('Please include a valid email if provided').normalizeEmail(),
        body('password').optional().isLength({ min: 6 }).withMessage('Password must be atleast 6 characters if provided')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        try {
            const updates = req.body;
            if (updates.password) {
                const salt = await bcrypt.genSalt(10);
                updates.password = await bcrypt.hash(updates.password, salt);
            }
            const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select('-password');
            if (!updatedUser) return res.status(404).json({ message: 'User not found' });
            return res.status(200).json({ message: "User updated successfully!", user: updatedUser });
        } catch (error) {
            if (res.headersSent) { return; }
            console.error("Update user error:", error.message);
            if (error.code === 11000) { /* ... */ return res.status(409).json({ message: 'Duplicate field.' }); }
            else if (error.name === 'ValidationError') { /* ... */ return res.status(400).json({ message: 'Validation error.' });}
            else if (error.kind === 'ObjectId') return res.status(400).json({ message: 'Invalid user ID format.' });
            else return res.status(500).json({ message: 'Server error updating user.' });
        }
    }
);

// DELETE /:id (Delete user) - Protected
router.delete('/:id', protect, async (req, res) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id);
        if (!deletedUser) return res.status(404).json({ message: 'User not found' });
        return res.status(200).json({ message: "User deleted successfully!", user: { id: deletedUser._id, username: deletedUser.username } });
    } catch (error) {
        if (res.headersSent) { return; }
        console.error("Delete user error:", error.message);
        if (error.kind === 'ObjectId') return res.status(400).json({ message: 'Invalid user ID format.' });
        return res.status(500).json({ message: 'Server error deleting user.' });
    }
});

module.exports = router;