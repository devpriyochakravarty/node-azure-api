// __tests__/user.test.js
const request = require('supertest');
const bcrypt = require('bcryptjs'); // Make sure bcryptjs is required
const { app, connectDBAndStartServer, mongooseInstance } = require('../server'); // Import app and connectDB function
const User = require('../models/user'); // Ensure path is correct (User.js or user.js)

// Use a specific test database URI, ideally from an environment variable for tests
const testDbURI = process.env.DB_URI_TEST || 'mongodb://127.0.0.1:27017/recipeHubDb_test';

beforeAll(async () => {
    // If server.js doesn't auto-connect in test env, we connect here.
    // Ensure mongooseInstance is used for test connections.
    if (mongooseInstance.connection.readyState === 0) {
        try {
            // Temporarily override DB_URI for test connection if server.js uses it
            process.env.DB_URI_FOR_TEST_ONLY = testDbURI; // To ensure server uses test DB if it connects
            // Or directly connect:
            await mongooseInstance.connect(testDbURI);
            console.log('Test DB connected successfully in beforeAll using: ' + testDbURI);
        } catch (err) {
            console.error("Test DB connection FAILED in beforeAll:", err);
            throw err; // Fail fast
        }
    }
    // If your server.js's connectDBAndStartServer needs to be called and doesn't run app.listen in test:
    // await connectDBAndStartServer(); // This might be needed if server doesn't connect on require
});

afterEach(async () => {
    // Clean up the users collection after each test
    try {
        if (mongooseInstance.connection.readyState === 1) {
            await User.deleteMany({});
        }
    } catch (error) {
        console.error("Error during afterEach cleanup:", error);
    }
});

afterAll(async () => {
    // Disconnect from the database after all tests are done
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

            const res = await request(app)
                .post('/api/user')
                .send(newUser)
                .expect('Content-Type', /json/)
                .expect(201);

            expect(res.body).toHaveProperty('message', 'User created successfully!');
            expect(res.body.user).toHaveProperty('id');
            expect(res.body.user.username).toBe(newUser.username);
            expect(res.body.user.email).toBe(newUser.email.toLowerCase());
            expect(res.body.user).not.toHaveProperty('password');

            const dbUser = await User.findById(res.body.user.id);
            expect(dbUser).not.toBeNull();
            if (dbUser) {
                expect(dbUser.username).toBe(newUser.username);
                const isMatch = await bcrypt.compare(newUserPassword, dbUser.password);
                expect(isMatch).toBe(true);
            }
        });

        it('should return 400 for missing username', async () => {
            const newUser = {
                email: `missinguser_${Date.now()}@example.com`,
                password: 'password123',
                username: ''
            };
            const res = await request(app)
                .post('/api/user')
                .send(newUser)
                .expect('Content-Type', /json/)
                .expect(400);

            expect(res.body.errors).toBeInstanceOf(Array);
            const usernameError = res.body.errors.find(err => err.path === 'username');
            expect(usernameError).toBeDefined();
            // Example of checking one of the messages
            const possibleMessages = ['username is required', 'Username must be at least 3 characters'];
            expect(possibleMessages).toContain(usernameError.msg);
        });
    });
});