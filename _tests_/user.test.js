// __tests__/user.test.js
const request = require('supertest');
const { app, connectDB, mongooseInstance, startAppListening } = require('../server'); // Import what's needed
const User = require('../models/user');
const bcrypt = require('bcryptjs');

const testDbURILocal = 'mongodb://127.0.0.1:27017/recipeHubDb_test';

beforeAll(async () => {
    process.env.NODE_ENV = 'test_setup'; // Prevent server.js from auto-starting listen
    process.env.DB_URI = testDbURILocal; // Set for connectDB
    try {
        await connectDB(); // Call connectDB which will use the overridden process.env.DB_URI
        // If you need the server to listen for Supertest (often Supertest handles this if you pass `app`)
        // you could call startAppListening() here if necessary, or Supertest might manage it.
        // For now, let's assume Supertest(app) works without explicit listen if DB is connected.
    } catch (err) {
        console.error("Test setup DB connection failed:", err);
        throw err; // Fail fast
    }
});

afterEach(async () => {
    if (mongooseInstance.connection.readyState === 1) {
        try {
            const collections = Object.keys(mongooseInstance.connection.collections);
            for (const collectionName of collections) {
                const collection = mongooseInstance.connection.collections[collectionName];
                await collection.deleteMany({});
            }
        } catch (error) {
            console.error("Error during afterEach cleanup:", error);
        }
    }
});

afterAll(async () => {
    if (mongooseInstance.connection.readyState === 1) {
        await mongooseInstance.connection.close();
    }
    delete process.env.NODE_ENV; // Clean up env var
    delete process.env.DB_URI;
});

// ... your describe blocks and tests ...
// Your test for "create new user"
describe('User API Routes', () => {
    describe('POST /api/user (User Registration)', () => {
        it('should create a new user successfully with valid data', async () => {
            const uniqueUsername = `testuser_${Date.now()}`;
            const uniqueEmail = `jesttest_${Date.now()}@example.com`;
            const newUser = { username: uniqueUsername, email: uniqueEmail, password: 'password123' };

            // Ensure your mongo container (for local tests) is running before this test
            // e.g., via docker-compose up -d mongo
            const res = await request(app)
                .post('/api/user')
                .send(newUser)
                .expect('Content-Type', /json/)
                .expect(201);
            // ... rest of assertions ...
        });
        // ... other tests ...
    });
});