// __tests__/user.test.js
const request = require('supertest');
const mongoose = require('mongoose');
const bcrypt= require('bcryptjs')
const app = require('../server'); // Import your Express app (ensure server.js exports 'app')
const User = require('../models/user'); // Make sure this path is correct relative to __tests__ folder

// MongoDB Connection URI for testing
const dbURI = 'mongodb://127.0.0.1:27017/recipeHubDb_test'; // Using a _test DB is best practice

beforeAll(async () => {
    // Connect to a test database before running any tests
    // Check if mongoose is already connected by server.js (if server.js runs listen on import)
    // A better pattern is for server.js NOT to call app.listen() if process.env.NODE_ENV === 'test'
    // and let tests manage server start/stop or just use the 'app' instance.
    // For now, we'll ensure a connection.
    if (mongoose.connection.readyState === 0) { // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        await mongoose.connect(dbURI);
    }
});

afterEach(async () => {
    // Clean up the users collection after each test
    // This ensures tests are independent
    try {
        await User.deleteMany({});
    } catch (error) {
        console.error("Error during afterEach cleanup:", error);
    }
});

afterAll(async () => {
    // Disconnect from the database after all tests are done
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

describe('User API Routes', () => {
    describe('POST /api/user (User Registration)', () => {
        it('should create a new user successfully with valid data', async () => {
            const uniqueUsername = `testuser_${Date.now()}`;
            const uniqueEmail = `jesttest_${Date.now()}@example.com`;

            const newUser = {
                username: uniqueUsername,
                email: uniqueEmail,
                password: 'password123'
            };

            const res = await request(app) // Use the imported app
                .post('/api/user')         // Ensure this matches your server.js app.use() path for userRoutes
                .send(newUser)
                .expect('Content-Type', /json/) // Check if Content-Type header contains 'json'
                .expect(201);                  // Check for 201 status code

            // Check response body properties and values
            expect(res.body).toHaveProperty('message', 'User created successfully!');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.username).toBe(newUser.username);
            expect(res.body.user.email).toBe(newUser.email.toLowerCase()); // Mongoose schema lowercases email
            expect(res.body.user).not.toHaveProperty('password'); // Ensure password isn't returned

            // Optionally, check the database directly
            const dbUser = await User.findById(res.body.user.id);
            expect(dbUser).not.toBeNull(); // Check if user exists in DB
            if (dbUser) { // Additional checks if user is found
                expect(dbUser.username).toBe(newUser.username);
                expect(dbUser.password).not.toBe(newUser.password); // Password should be hashed
                const isMatch = await bcrypt.compare(newUser.password, dbUser.password); // Need bcrypt here
                expect(isMatch).toBe(true);
            }
        });

        it('should return 400 for missing username', async () => {
            const newUser = {
                // username is missing or empty
                email: `missinguser_${Date.now()}@example.com`,
                password: 'password123',
                username: '' // Explicitly send empty string for this test
            };
            const res = await request(app)
                .post('/api/user')
                .send(newUser)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeInstanceOf(Array);
            const usernameError = res.body.errors.find(err => err.path === 'username');
            expect(usernameError).toBeDefined();
            // Check specific message if needed, e.g.,
            // expect(usernameError.msg).toBe('username is required');
            // or based on your validator for minLength if empty string is considered not empty by .not().isEmpty()
            // For empty string, isLength({min:3}) might be the one failing, or .not().isEmpty()
        });

        // Add more tests here for:
        // - Duplicate username
        // - Duplicate email
        // - Invalid email format
        // - Password too short
        // - etc.
    });

    // We will add describe blocks for login, GET users, etc. later
});