const request = require('supertest');
const app = require('../server');
const User = require('../models/user'); // Ensure this path matches your User.js model
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');

afterEach(async () => {
    if (mongoose.connection.readyState === 1) { // 1 means connected
        // Simplified: just delete all users. If specific collections are added later, target them.
        await User.deleteMany({});
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
        console.log("Test DB connection closed in afterAll.");
    }
});

describe('User API Routes', () => {
    describe('POST /api/user (User Registration)', () => {
        it('should create a new user successfully with valid data', async () => {
            const uniqueSuffix = Date.now();
            const newUser = {
                username: `testuser_${uniqueSuffix}`,
                email: `jesttest_${uniqueSuffix}@example.com`,
                password: 'password123'
            };

            const res = await request(app)
                .post('/api/user')
                .send(newUser);

            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body).toHaveProperty('message', 'User created successfully!');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.username).toBe(newUser.username);

            const dbUser = await User.findById(res.body.user.id);
            expect(dbUser).toBeTruthy();
            if (dbUser) {
                 const isMatch = await bcrypt.compare(newUser.password, dbUser.password);
                 expect(isMatch).toBe(true);
            }
        });

        it('should return 400 for missing username', async () => {
            const uniqueSuffix = Date.now();
            const newUser = {
                email: `missing_${uniqueSuffix}@example.com`,
                password: 'password123',
                username: ''
            };
            const res = await request(app)
                .post('/api/user')
                .send(newUser);

            expect(res.status).toBe(400);
            expect(res.headers['content-type']).toMatch(/application\/json/);
            expect(res.body.errors).toBeInstanceOf(Array);
            const usernameError = res.body.errors.find(err => err.path === 'username');
            expect(usernameError).toBeDefined();
            // This message depends on your express-validator chain for username
            // It could be "username is required" or "username must be 3 characters"
            // For an empty string, .not().isEmpty() should catch it first.
            expect(usernameError.msg).toBe('username is required');
        });
    });
});