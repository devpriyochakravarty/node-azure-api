// __tests__/user.test.js
const request = require('supertest');
const bcrypt = require('bcryptjs');
const { app, connectDB, mongooseInstance } = require('../server'); // Import app & connectDB
const User = require('../models/user');

// Use a specific test database URI
const testDbURI = process.env.DB_URI_TEST || 'mongodb://127.0.0.1:27017/recipeHubDb_test';

beforeAll(async () => {
    // Set the DB_URI for the server's connectDB function to use the test DB
    // This ensures the 'app' instance uses the test database when its routes are hit.
    process.env.DB_URI = testDbURI; // Override DB_URI that server.js will use
    await connectDB(); // Call the connectDB function from server.js
    console.log("Test DB connection established through server's connectDB.");
});

afterEach(async () => {
    try {
        if (mongooseInstance.connection.readyState === 1) { // 1 === connected
            const collections = Object.keys(mongooseInstance.connection.collections);
            for (const collectionName of collections) {
                const collection = mongooseInstance.connection.collections[collectionName];
                await collection.deleteMany({});
            }
        }
    } catch (error) {
        console.error("Error during afterEach cleanup:", error.message);
    }
});

afterAll(async () => {
    if (mongooseInstance.connection.readyState === 1) {
        await mongooseInstance.connection.close();
        console.log("Test DB disconnected after all tests.");
    }
});

describe('User API Routes', () => {
    describe('POST /api/user (User Registration)', () => {
        it('should create a new user successfully with valid data', async () => {
            const uniqueUsername = `testuser_${Date.now()}`;
            const uniqueEmail = `jesttest_${Date.now()}@example.com`;
            const newUserPassword = 'password123';

            const newUser = {
                username: uniqueUsername,
                email: uniqueEmail,
                password: newUserPassword
            };

            const res = await request(app) // app is already configured with routes
                .post('/api/user')
                .send(newUser);
                // No .expect('Content-Type', /json/) for now
                // No .expect(201) for now
                // LET'S FIRST LOG THE RESPONSE TO SEE WHAT IT IS
            console.log('Test 1 Response Status:', res.status);
            console.log('Test 1 Response Headers:', res.headers);
            console.log('Test 1 Response Body:', res.body);

            // Then re-enable assertions one by one
            expect(res.status).toBe(201);
            expect(res.headers['content-type']).toMatch(/json/);
            expect(res.body).toHaveProperty('message', 'User created successfully!');
            // ... rest of assertions ...
        });

        it('should return 400 for missing username', async () => {
            const newUser = {
                email: `missinguser_${Date.now()}@example.com`,
                password: 'password123',
                username: ''
            };
            const res = await request(app)
                .post('/api/user')
                .send(newUser);

            console.log('Test 2 Response Status:', res.status);
            console.log('Test 2 Response Headers:', res.headers);
            console.log('Test 2 Response Body:', res.body);

            expect(res.status).toBe(400);
            expect(res.headers['content-type']).toMatch(/json/);
            expect(res.body.errors).toBeInstanceOf(Array);
            const usernameError = res.body.errors.find(err => err.path === 'username');
            expect(usernameError).toBeDefined();
            expect(['username is required', 'Username must be at least 3 characters']).toContain(usernameError.msg);
        });
    });
});