require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Models
const User = require('../models/User');
const NfcTag = require('../models/NfcTag');

const seedData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongodb.uri);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await NfcTag.deleteMany({});
    console.log('Cleared existing data');

    // Create Admin User
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@example.com',
      password: 'admin123',
      role: 'Admin',
      profile: {
        timezone: 'Asia/Kolkata',
        dailyWorkTarget: 480, // 8 hours
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        preferredPunchMethod: 'NFC'
      }
    });
    console.log('Created admin user:', adminUser.email);

    // Create Regular Users
    const user1 = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      role: 'User',
      profile: {
        timezone: 'Asia/Kolkata',
        dailyWorkTarget: 480,
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        preferredPunchMethod: 'NFC'
      }
    });
    console.log('Created user:', user1.email);

    const user2 = await User.create({
      name: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      role: 'User',
      profile: {
        timezone: 'America/New_York',
        dailyWorkTarget: 540, // 9 hours
        workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        preferredPunchMethod: 'Manual'
      }
    });
    console.log('Created user:', user2.email);

    // Create NFC Tags
    const tag1 = await NfcTag.create({
      uid: 'NFC001ABC',
      userId: user1._id,
      label: 'John Primary Card',
      registeredBy: adminUser._id
    });
    console.log('Created NFC tag:', tag1.uid);

    const tag2 = await NfcTag.create({
      uid: 'NFC002DEF',
      userId: user2._id,
      label: 'Jane Primary Card',
      registeredBy: adminUser._id
    });
    console.log('Created NFC tag:', tag2.uid);

    const tag3 = await NfcTag.create({
      uid: 'NFCADMIN01',
      userId: adminUser._id,
      label: 'Admin Card',
      registeredBy: adminUser._id
    });
    console.log('Created NFC tag:', tag3.uid);

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📋 Test Accounts:');
    console.log('══════════════════════════════════════');
    console.log('Admin: admin@example.com / admin123');
    console.log('User 1: john@example.com / password123');
    console.log('User 2: jane@example.com / password123');
    console.log('══════════════════════════════════════');
    console.log('\n📱 NFC Tags:');
    console.log('══════════════════════════════════════');
    console.log('John: NFC001ABC');
    console.log('Jane: NFC002DEF');
    console.log('Admin: NFCADMIN01');
    console.log('══════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
