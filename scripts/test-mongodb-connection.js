require('dotenv').config();
const mongoose = require('mongoose');

async function testConnection() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set in .env file');
      process.exit(1);
    }

    console.log('🔍 Testing MongoDB connection...');
    console.log('📍 Connection string:', DATABASE_URL.replace(/\/\/.*@/, '//***:***@')); // Hide credentials
    
    // Parse the connection string to check if it has a database name
    const url = new URL(DATABASE_URL.replace('mongodb+srv://', 'https://').replace('mongodb://', 'http://'));
    const pathname = url.pathname;
    const databaseName = pathname && pathname.length > 1 ? pathname.slice(1) : null;
    
    if (!databaseName) {
      console.warn('⚠️  WARNING: No database name found in connection string!');
      console.warn('   Your connection string should be: mongodb+srv://user:pass@cluster.mongodb.net/your-database-name');
      console.warn('   Adding default database name: myfood');
    } else {
      console.log('✅ Database name found:', databaseName);
    }

    // Connect to MongoDB
    await mongoose.connect(DATABASE_URL);
    console.log('✅ Successfully connected to MongoDB!');
    
    // Get database name from connection
    const dbName = mongoose.connection.db.databaseName;
    console.log('📊 Connected to database:', dbName);
    
    // List all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📁 Collections in database:');
    if (collections.length === 0) {
      console.log('   (No collections found - collections are created when first document is inserted)');
    } else {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    }
    
    // Count documents in each collection
    if (collections.length > 0) {
      console.log('\n📈 Document counts:');
      for (const col of collections) {
        const count = await mongoose.connection.db.collection(col.name).countDocuments();
        console.log(`   ${col.name}: ${count} documents`);
      }
    }
    
    // Test creating a collection by inserting a test document
    console.log('\n🧪 Testing collection creation...');
    const testCollection = mongoose.connection.db.collection('_test_connection');
    await testCollection.insertOne({ test: true, createdAt: new Date() });
    console.log('✅ Test document inserted successfully');
    
    // Clean up test document
    await testCollection.deleteOne({ test: true });
    console.log('🧹 Test document cleaned up');
    
    await mongoose.connection.close();
    console.log('\n✅ Connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Connection test failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in DATABASE_URL');
    } else if (error.message.includes('querySrv') || error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Check your MongoDB cluster connection string');
      console.error('   Common issues:');
      console.error('   - Cluster name might be incorrect');
      console.error('   - Network connectivity issues');
      console.error('   - IP whitelist restrictions in MongoDB Atlas');
      console.error('   - Connection string format should be:');
      console.error('     mongodb+srv://username:password@cluster.mongodb.net/database-name');
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('\n💡 Tip: Check your internet connection and MongoDB cluster URL');
    }
    
    process.exit(1);
  }
}

testConnection();

