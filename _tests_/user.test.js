// __tests__/user.test.js
const request = require('supertest');
const app = require('../server'); // This will trigger DB connection in server.js using process.env.DB_URI
const User = require('../models/user');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose'); // For direct access to connection object

// No beforeAll needed to connect if server.js does it on require
// and DB_URI is set correctly by the test script / CI env.

afterEach(async () => {
    // Clean up
    if (mongoose.connection.readyState === 1) { // 1 means connected
        try {
            await User.deleteMany({});
        } catch (e) {
            console.error("Error in afterEach User.deleteMany:", e);
        }
    }
});

afterAll(async () => {
    // Close the connection that server.js (and thus mongoose globally) opened
    if (mongoose.connection.readyState === 1) {
        await mongoose.connection.close();
    }
});

describe('User API Routes', () => {
    describe('POST /api/user (User Registration)', () => {
        it('should create a new user successfully with valid data', async () => {
            // ... (your test for successful creation)
            // The .expect('Content-Type', /json/) should work if no error occurs in the route
        });

        it('should return 400 for missing username', async () => {
            // ... (your test for missing username)
            // The .expect('Content-Type', /json/) should work here too as your error handlers send JSON
        });
    });
});