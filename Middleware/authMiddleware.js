// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/user'); // Assuming models/User.js

const JWT_SECRET = process.env.JWT_SECRET || 'a-default-local-secret-that-is-very-secure-dev1441';

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = await User.findById(decoded.user.id).select('-password');
            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found for token' });
            }
            next();
        } catch (error) {
            console.error('Token verification error:', error.message);
            if (res.headersSent) { return; }
            if (error.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Not authorized, token invalid' });
            if (error.name === 'TokenExpiredError') return res.status(401).json({ message: 'Not authorized, token expired' });
            return res.status(401).json({ message: 'Not authorized, general token failure' });
        }
    }

    if (!token) { // This will be true if the above if/try didn't set token
        if (res.headersSent) { return; }
        return res.status(401).json({ message: 'Not authorized, no token or Bearer scheme incorrect' });
    }
};
module.exports = { protect };