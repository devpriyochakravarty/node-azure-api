  // middleware/authMiddleware.js
const jwt = require('jsonwebtoken');       // Library to work with JWTs
const User = require('../models/user');    // Our User model to find user details
const JWT_SECRET = 'dev1441'; // Secret to verify the token

// 'protect' is an Express middleware function.
// Middleware sits between the incoming request and the final route handler.
// Its job here is to check if the user is allowed to proceed.
const protect = async (req, res, next) => {
    let token; // Variable to store the token we find

    // HOW CLIENTS SEND TOKENS:
    // Usually, when a client has a JWT, they send it in a special
    // part of the request called the "Authorization" header.
    // It looks like this: Authorization: Bearer <the_actual_long_token_string>
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        // This 'if' checks:
        // 1. Does an "Authorization" header even exist? (req.headers.authorization)
        // 2. If it exists, does it start with the word "Bearer " (notice the space)?

        try {
            // If both checks pass, we try to get the token out.
            // "Bearer eyJhbGci..." -> we want just "eyJhbGci..."
            token = req.headers.authorization.split(' ')[1];
            // .split(' ') splits the string "Bearer <token>" into an array: ["Bearer", "<token>"]
            // [1] takes the second item, which is the token itself.

            // VERIFY THE TOKEN:
            // This is where we check if the token is valid and trustworthy.
            const decoded = jwt.verify(token, JWT_SECRET);
            // jwt.verify() does a few things:
            //  a. Checks if the token's signature matches our JWT_SECRET. If not, it's fake or tampered.
            //  b. Checks if the token has expired (based on 'expiresIn' when it was created).
            //  c. If all good, it "decodes" the payload (the user info we put in it during login).
            // 'decoded' will now be like: { user: { id: '...', username: '...' }, iat: ..., exp: ... }

            // GET FULL USER DETAILS:
            // The token only has basic info (id, username). We might need more from the database.
            // We use the 'id' from the decoded token to find the full user document.
            req.user = await User.findById(decoded.user.id).select('-password');
            // We attach the found user (without password) to the 'req' object as 'req.user'.
            // Now, any LATER route handler can access 'req.user' to know who is making the request.

            if (!req.user) { // Just in case the user was deleted after the token was issued
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            // IF EVERYTHING IS OKAY:
            next(); // This special function tells Express: "Okay, this middleware is done.
                    // Move on to the next thing in line (either another middleware or the
                    // actual route handler like router.get('/', async (req, res) => {...}))."

        } catch (error) { // This 'catch' block runs if jwt.verify() fails (bad token, expired)
                          // or if User.findById() has an issue.
            console.error('Token verification error:', error.message);
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({ message: 'Not authorized, token failed (invalid)' });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Not authorized, token expired' });
            }
            // For any other error during this process:
            return res.status(401).json({ message: 'Not authorized, token verification failed' });
        }
    }

    // IF NO TOKEN WAS PROVIDED AT ALL:
    if (!token) { // This check happens if the 'Authorization' header wasn't there or wasn't "Bearer".
        return res.status(401).json({ message: 'Not authorized, no token provided' });
    }
};

module.exports = { protect }; // We export the 'protect' function to use it elsewhere.  */

/* const 


const protected=async 
let token 
if ()
token = req.header.authorization.split[1];
const decoded= jwt.verify(token,jwt secret);
req.user= await findbyid(req.user.id)-select(-password);
(!user)
next();
catch(err)
 */

