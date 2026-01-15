/**
 * Punch API Tests
 */

const request = require('supertest');
const express = require('express');
const dbHandler = require('./setup');

// Create a minimal express app for testing
const createTestApp = () => {
    const app = express();
    app.use(express.json());

    // Import routes
    const punchRoutes = require('../src/routes/punch');
    const { protect } = require('../src/middleware/auth');

    app.use('/api/punch', protect, punchRoutes);

    // Error handler
    app.use((err, req, res, next) => {
        res.status(err.status || 500).json({
            success: false,
            message: err.message
        });
    });

    return app;
};

describe('Punch API', () => {
    let app;
    let testUser;
    let authToken;

    beforeAll(async () => {
        await dbHandler.connect();
        app = createTestApp();
    });

    beforeEach(async () => {
        testUser = await dbHandler.createTestUser();
        authToken = dbHandler.generateToken(testUser);
    });

    afterEach(async () => {
        await dbHandler.clearDatabase();
    });

    afterAll(async () => {
        await dbHandler.closeDatabase();
    });

    describe('POST /api/punch', () => {
        it('should create a punch IN successfully', async () => {
            const response = await request(app)
                .post('/api/punch')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchType: 'IN' })
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.punch.punchType).toBe('IN');
            expect(response.body.data.punch.source).toBe('Manual');
        });

        it('should create a punch OUT after punch IN', async () => {
            // First punch IN
            await request(app)
                .post('/api/punch')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchType: 'IN' });

            // Then punch OUT
            const response = await request(app)
                .post('/api/punch')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchType: 'OUT' })
                .expect('Content-Type', /json/)
                .expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.punch.punchType).toBe('OUT');
        });

        it('should reject punch without authentication', async () => {
            const response = await request(app)
                .post('/api/punch')
                .send({ punchType: 'IN' })
                .expect('Content-Type', /json/)
                .expect(401);

            expect(response.body.success).toBe(false);
        });

        it('should reject punch with invalid type', async () => {
            const response = await request(app)
                .post('/api/punch')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchType: 'INVALID' })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /api/punch/history', () => {
        beforeEach(async () => {
            // Create some test punches
            const now = new Date();
            await dbHandler.createTestPunches(testUser._id, [
                { type: 'IN', time: new Date(now.getTime() - 8 * 60 * 60 * 1000) },
                { type: 'OUT', time: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
                { type: 'IN', time: new Date(now.getTime() - 2 * 60 * 60 * 1000) },
                { type: 'OUT', time: now }
            ]);
        });

        it('should return punch history', async () => {
            const response = await request(app)
                .get('/api/punch/history')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.punches).toBeDefined();
            expect(Array.isArray(response.body.data.punches)).toBe(true);
            expect(response.body.data.punches.length).toBe(4);
        });

        it('should return empty array for user with no punches', async () => {
            // Clear punches
            await dbHandler.clearDatabase();
            testUser = await dbHandler.createTestUser();
            authToken = dbHandler.generateToken(testUser);

            const response = await request(app)
                .get('/api/punch/history')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.punches.length).toBe(0);
        });
    });

    describe('GET /api/punch/today', () => {
        it('should return today\'s punches', async () => {
            // Create punch for today
            await request(app)
                .post('/api/punch')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchType: 'IN' });

            const response = await request(app)
                .get('/api/punch/today')
                .set('Authorization', `Bearer ${authToken}`)
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.punches).toBeDefined();
        });
    });

    describe('PUT /api/punch/:id', () => {
        let punchId;

        beforeEach(async () => {
            // Create a punch to edit
            const response = await request(app)
                .post('/api/punch')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchType: 'IN' });

            punchId = response.body.data.punch._id;
        });

        it('should allow user to edit their own punch with reason', async () => {
            const newTime = new Date(Date.now() - 3600000); // 1 hour ago

            const response = await request(app)
                .put(`/api/punch/${punchId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    punchTime: newTime.toISOString(),
                    editReason: 'Forgot to punch in earlier'
                })
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.data.punch.edited).toBe(true);
            expect(response.body.data.punch.editReason).toBe('Forgot to punch in earlier');
        });

        it('should reject edit without reason', async () => {
            const newTime = new Date(Date.now() - 3600000);

            const response = await request(app)
                .put(`/api/punch/${punchId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ punchTime: newTime.toISOString() })
                .expect('Content-Type', /json/)
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});
