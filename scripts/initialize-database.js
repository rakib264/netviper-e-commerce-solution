/**
 * Initialize MongoDB database and create collections
 * This script ensures all collections exist by creating at least one document in each
 */

require('dotenv').config();
const mongoose = require('mongoose');

// Import models (we'll use direct collection operations instead)
async function initializeDatabase() {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    if (!DATABASE_URL) {
      console.error('❌ DATABASE_URL is not set in .env file');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    
    // Ensure database name is in connection string
    let connectionUri = DATABASE_URL;
    const defaultDbName = process.env.MONGODB_DB_NAME || 'myfood';
    
    if (connectionUri.includes('mongodb+srv://')) {
      const hasDbName = /mongodb\+srv:\/\/[^/]+\/[^/?]+/.test(connectionUri);
      if (!hasDbName) {
        const separator = connectionUri.includes('?') ? '?' : '/';
        connectionUri = connectionUri.replace(separator, `/${defaultDbName}${separator}`);
        console.log(`📝 Added database name "${defaultDbName}" to connection string`);
      }
    } else if (connectionUri.includes('mongodb://')) {
      const hasDbName = /mongodb:\/\/[^/]+\/[^/?]+/.test(connectionUri);
      if (!hasDbName) {
        const separator = connectionUri.includes('?') ? '?' : '/';
        connectionUri = connectionUri.replace(separator, `/${defaultDbName}${separator}`);
        console.log(`📝 Added database name "${defaultDbName}" to connection string`);
      }
    }

    // Connect to MongoDB
    await mongoose.connect(connectionUri);
    const dbName = mongoose.connection.db.databaseName;
    console.log(`✅ Connected to database: ${dbName}\n`);

    // List of collections that should exist based on your models
    const collections = [
      'users',
      'categories',
      'products',
      'orders',
      'blogs',
      'banners',
      'coupons',
      'auditlogs',
      'generalsettings',
      'paymentsettings',
      'returnexchangerequests',
      'returnrequests'
    ];

    console.log('📁 Checking collections...\n');
    
    const existingCollections = await mongoose.connection.db.listCollections().toArray();
    const existingCollectionNames = existingCollections.map(col => col.name);
    
    let collectionsCreated = 0;
    let documentsInserted = 0;

    for (const collectionName of collections) {
      const exists = existingCollectionNames.includes(collectionName);
      
      if (!exists) {
        // Create collection by inserting and then deleting a temporary document
        const collection = mongoose.connection.db.collection(collectionName);
        await collection.insertOne({ _temp: true, createdAt: new Date() });
        await collection.deleteOne({ _temp: true });
        console.log(`✅ Created collection: ${collectionName}`);
        collectionsCreated++;
      } else {
        const count = await mongoose.connection.db.collection(collectionName).countDocuments();
        console.log(`📊 Collection exists: ${collectionName} (${count} documents)`);
        if (count === 0) {
          // Insert a placeholder document to ensure collection is visible in Atlas
          await mongoose.connection.db.collection(collectionName).insertOne({
            _initialized: true,
            createdAt: new Date(),
            message: 'Collection initialized'
          });
          documentsInserted++;
        }
      }
    }

    console.log(`\n✨ Summary:`);
    console.log(`   - Collections checked: ${collections.length}`);
    console.log(`   - Collections created: ${collectionsCreated}`);
    console.log(`   - Placeholder documents inserted: ${documentsInserted}`);
    console.log(`\n💡 Note: Collections in MongoDB Atlas only appear after they contain at least one document.`);
    console.log(`   You can now run your seed script to populate the database with actual data.`);

    await mongoose.connection.close();
    console.log('\n✅ Database initialization completed!');
    
  } catch (error) {
    console.error('❌ Initialization failed:');
    console.error(error.message);
    
    if (error.message.includes('authentication failed')) {
      console.error('\n💡 Tip: Check your MongoDB username and password in DATABASE_URL');
    } else if (error.message.includes('querySrv')) {
      console.error('\n💡 Tip: Check your MongoDB cluster connection string format');
      console.error('   Should be: mongodb+srv://username:password@cluster.mongodb.net/database-name');
    }
    
    process.exit(1);
  }
}

initializeDatabase();

