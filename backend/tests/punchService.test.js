/**
 * PunchService Unit Tests
 */

const dbHandler = require('./setup');
const PunchService = require('../src/services/PunchService');
const PunchLog = require('../src/models/PunchLog');
const User = require('../src/models/User');

describe('PunchService', () => {
    let testUser;

    beforeAll(async () => {
        await dbHandler.connect();
    });

    beforeEach(async () => {
        testUser = await dbHandler.createTestUser();
    });

    afterEach(async () => {
        await dbHandler.clearDatabase();
    });

    afterAll(async () => {
        await dbHandler.closeDatabase();
    });

    describe('createPunch', () => {
        it('should create a manual punch', async () => {
            const result = await PunchService.createPunch({
                userId: testUser._id,
                punchType: 'IN',
                source: 'Manual'
            });

            expect(result.success).toBe(true);
            expect(result.punch.punchType).toBe('IN');
            expect(result.punch.source).toBe('Manual');
            expect(result.punch.userId.toString()).toBe(testUser._id.toString());
        });

        it('should detect first punch of the day', async () => {
            const result = await PunchService.createPunch({
                userId: testUser._id,
                punchType: 'IN',
                source: 'Manual'
            });

            expect(result.isFirstPunch).toBe(true);
        });

        it('should detect subsequent punches', async () => {
            // First punch
            await PunchService.createPunch({
                userId: testUser._id,
                punchType: 'IN',
                source: 'Manual'
            });

            // Second punch
            const result = await PunchService.createPunch({
                userId: testUser._id,
                punchType: 'OUT',
                source: 'Manual'
            });

            expect(result.isFirstPunch).toBe(false);
        });
    });

    describe('getLastPunch', () => {
        it('should return null if no punches exist', async () => {
            const lastPunch = await PunchService.getLastPunch(testUser._id);
            expect(lastPunch).toBeNull();
        });

        it('should return the most recent punch', async () => {
            const now = new Date();

            await PunchLog.create({
                userId: testUser._id,
                punchType: 'IN',
                punchTime: new Date(now.getTime() - 3600000),
                source: 'Manual'
            });

            await PunchLog.create({
                userId: testUser._id,
                punchType: 'OUT',
                punchTime: now,
                source: 'Manual'
            });

            const lastPunch = await PunchService.getLastPunch(testUser._id);
            expect(lastPunch.punchType).toBe('OUT');
        });
    });

    describe('getTodayPunches', () => {
        it('should return only today\'s punches', async () => {
            const timezone = 'Asia/Kolkata';
            const now = new Date();
            const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            // Yesterday's punch
            await PunchLog.create({
                userId: testUser._id,
                punchType: 'IN',
                punchTime: yesterday,
                source: 'Manual'
            });

            // Today's punch
            await PunchLog.create({
                userId: testUser._id,
                punchType: 'IN',
                punchTime: now,
                source: 'Manual'
            });

            const todayPunches = await PunchService.getTodayPunches(testUser._id, timezone);
            expect(todayPunches.length).toBe(1);
        });
    });

    describe('editPunch', () => {
        let existingPunch;

        beforeEach(async () => {
            const result = await PunchService.createPunch({
                userId: testUser._id,
                punchType: 'IN',
                source: 'Manual'
            });
            existingPunch = result.punch;
        });

        it('should edit punch time with reason', async () => {
            const newTime = new Date(Date.now() - 3600000);

            const result = await PunchService.editPunch({
                punchId: existingPunch._id,
                userId: testUser._id,
                newPunchTime: newTime,
                editReason: 'Correcting punch time'
            });

            expect(result.success).toBe(true);
            expect(result.punch.edited).toBe(true);
            expect(result.punch.editReason).toBe('Correcting punch time');
            expect(new Date(result.punch.punchTime).getTime()).toBe(newTime.getTime());
        });

        it('should store original values when editing', async () => {
            const originalTime = existingPunch.punchTime;
            const newTime = new Date(Date.now() - 3600000);

            const result = await PunchService.editPunch({
                punchId: existingPunch._id,
                userId: testUser._id,
                newPunchTime: newTime,
                editReason: 'Correcting punch time'
            });

            expect(new Date(result.punch.originalPunchTime).getTime())
                .toBe(new Date(originalTime).getTime());
        });
    });

    describe('getPunchStats', () => {
        beforeEach(async () => {
            const now = new Date();

            // Create punches for an 8-hour work day
            await PunchLog.create({
                userId: testUser._id,
                punchType: 'IN',
                punchTime: new Date(now.getTime() - 8 * 60 * 60 * 1000),
                source: 'Manual'
            });

            await PunchLog.create({
                userId: testUser._id,
                punchType: 'OUT',
                punchTime: now,
                source: 'Manual'
            });
        });

        it('should calculate correct work duration', async () => {
            const stats = await PunchService.getPunchStats(
                testUser._id,
                testUser.profile.timezone
            );

            // Should be approximately 8 hours (480 minutes)
            expect(stats.workedMinutes).toBeGreaterThanOrEqual(478);
            expect(stats.workedMinutes).toBeLessThanOrEqual(482);
        });
    });
});
