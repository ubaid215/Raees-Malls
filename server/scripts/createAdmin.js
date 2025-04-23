require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const ApiError = require('../utils/apiError');

const createAdmin = async () => {
  try {
    // Validate environment variables
    if (!process.env.MONGO_URI) {
      throw new ApiError(500, 'MONGO_URI not configured in .env');
    }
    console.log('Using MONGO_URI:', process.env.MONGO_URI);

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000
    });
    console.log('MongoDB connected successfully');
    console.log('Database Name:', mongoose.connection.db.databaseName);

    // Delete existing admin user to ensure clean state
    const existingAdmin = await User.findOneAndDelete({ email: 'admin@example.com' });
    if (existingAdmin) {
      console.log('Deleted existing admin user:', existingAdmin.email);
    }

    // Create admin user
    console.log('Creating admin user...');
    const admin = new User({
      name: 'System Admin',
      email: 'admin@example.com',
      password: 'Admin@1234', // Let pre('save') hook hash the password
      role: 'admin',
      isVerified: true,
      createdAt: new Date()
    });

    // Debug: Log password before saving
    console.log('Password before save:', admin.password);

    await admin.save();

    // Debug: Log password after saving
    console.log('Password after save (should be hashed):', admin.password);

    console.log('Admin user created successfully');
    console.log('Email: admin@example.com');
    console.log('Temporary password: Admin@1234');
    console.log('IMPORTANT: Change this password immediately after first login!');

    // Verify user creation
    const verifyUser = await User.findOne({ email: 'admin@example.com' });
    if (!verifyUser) {
      throw new Error('Failed to verify admin user creation');
    }
    console.log('Verified admin user:', verifyUser.email, 'Role:', verifyUser.role);

    // Debug: Log stored password
    console.log('Stored password from DB:', verifyUser.password);

    // Verify password hash
    const isPasswordValid = await bcrypt.compare('Admin@1234', verifyUser.password);
    if (!isPasswordValid) {
      // Debug: Manually hash and compare
      const manualHash = await bcrypt.hash('Admin@1234', 12);
      console.log('Manually generated hash for Admin@1234:', manualHash);
      throw new Error('Password hash verification failed');
    }
    console.log('Password hash verified successfully');

    await mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (err) {
    console.error('Admin creation failed:', err.message);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to error');
    }
    process.exit(1);
  }
};

createAdmin();