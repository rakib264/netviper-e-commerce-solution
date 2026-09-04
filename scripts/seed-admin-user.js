/**
 * Seed admin user script
 * This script creates or updates the admin user with specified credentials
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// User Schema (simplified version for seeding)
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String },
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'customer'], default: 'customer' },
  phone: { type: String },
  profileImage: { type: String },
  address: {
    street: String,
    division: String,
    district: String,
    postCode: String,
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  isActive: { type: Boolean, default: true },
  emailVerified: { type: Boolean, default: false },
  authProvider: { type: String, enum: ['google', 'facebook', 'credentials'], default: 'credentials' },
  authProviderId: { type: String },
  lastLogin: { type: Date },
  deletedAt: { type: Date },
}, {
  timestamps: true
});

async function seedAdminUser() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set in .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    
    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Connected to MongoDB\n');

    // Get or create User model
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    console.log('🌱 Seeding admin user...');
    
    // Check if admin user exists
    const adminExists = await User.findOne({ email: 'redwan.rakib264@gmail.com' });
    
    if (!adminExists) {
      // Create new admin user
      const hashedPassword = await bcrypt.hash('Aa123456+', 12);
      await User.create({
        email: 'redwan.rakib264@gmail.com',
        password: hashedPassword,
        firstName: 'Redwan',
        lastName: 'Rakib',
        phone: '+8801828123264',
        role: 'admin',
        isActive: true,
        emailVerified: true,
        profileImage: '',
        authProvider: 'credentials'
      });
      console.log('✅ Admin user created successfully');
    } else {
      // Update existing user with new password and ensure admin role
      const hashedPassword = await bcrypt.hash('Aa123456+', 12);
      await User.findOneAndUpdate(
        { email: 'redwan.rakib264@gmail.com' },
        {
          password: hashedPassword,
          role: 'admin',
          isActive: true,
          emailVerified: true,
          authProvider: 'credentials'
        }
      );
      console.log('✅ Admin user updated successfully');
    }
    
    console.log('\n🎉 Admin user seeding completed!');
    console.log('📧 Email: redwan.rakib264@gmail.com');
    console.log('🔑 Password: Aa123456+');
    console.log('👤 Role: admin');
    
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in DATABASE_URL');
    } else if (error.message.includes('querySrv')) {
      console.error('\n💡 Tip: Check your MongoDB cluster connection string format');
    }
    
    await mongoose.connection.close();
    process.exit(1);
  }
}

seedAdminUser();