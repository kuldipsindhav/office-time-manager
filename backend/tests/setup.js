/**
 * Jest Test Setup
 * Uses MongoDB Memory Server for isolated database testing
 */

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

/**
 * Connect to the in-memory database before running tests
 */
module.exports.connect = async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();

    await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
};

/**
 * Clear all test data after every test
 */
module.exports.clearDatabase = async () => {
    const collections = mongoose.connection.collections;

    for (const key in collections) {
        const collection = collections[key];
        await collection.deleteMany({});
    }
};

/**
 * Close database connection and stop mongoServer
 */
module.exports.closeDatabase = async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
};

/**
 * Create a test user for authentication tests
 */
module.exports.createTestUser = async (overrides = {}) => {
    const User = require('../src/models/User');

    const defaultUser = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        role: 'User',
        isActive: true,
        profile: {
            timezone: 'Asia/Kolkata',
            dailyWorkTarget: 480,
            workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            preferredPunchMethod: 'NFC'
        }
    };

    const userData = { ...defaultUser, ...overrides };
    return await User.create(userData);
};

/**
 * Create a test admin user
 */
module.exports.createTestAdmin = async (overrides = {}) => {
    return module.exports.createTestUser({
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'Admin',
        ...overrides
    });
};

/**
 * Generate a JWT token for a user
 */
module.exports.generateToken = (user) => {
    const jwt = require('jsonwebtoken');
    const config = require('../src/config');

    return jwt.sign(
        { userId: user._id, role: user.role },
        config.jwt.secret,
        { expiresIn: '1h' }
    );
};

/**
 * Create test punch logs
 */
module.exports.createTestPunches = async (userId, punches) => {
    const PunchLog = require('../src/models/PunchLog');

    const punchDocs = punches.map(punch => ({
        userId,
        punchType: punch.type,
        punchTime: punch.time,
        source: punch.source || 'Manual'
    }));

    return await PunchLog.insertMany(punchDocs);
};
