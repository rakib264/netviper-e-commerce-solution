// Script to check if there are any events with showInLanding enabled
const mongoose = require('mongoose');

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

async function checkLandingEvents() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const Event = mongoose.model('Event', new mongoose.Schema({}, { strict: false }));

    const now = new Date();

    // Check all events
    const allEvents = await Event.find({}).lean();
    console.log('\n📊 Total Events in Database:', allEvents.length);

    // Check events with showInLanding
    const landingEvents = await Event.find({ showInLanding: true }).lean();
    console.log('📊 Events with showInLanding=true:', landingEvents.length);

    // Check active events
    const activeEvents = await Event.find({ isActive: true }).lean();
    console.log('📊 Active Events (isActive=true):', activeEvents.length);

    // Check current events (within date range)
    const currentEvents = await Event.find({
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();
    console.log('📊 Current Events (within date range):', currentEvents.length);

    // Check events that SHOULD show on landing page
    const validLandingEvents = await Event.find({
      isActive: true,
      showInLanding: true,
      startDate: { $lte: now },
      endDate: { $gte: now }
    }).lean();

    console.log('\n🎯 Events That SHOULD Show on Landing Page:', validLandingEvents.length);

    if (validLandingEvents.length > 0) {
      console.log('\n✅ Landing Events Found:');
      validLandingEvents.forEach((event, i) => {
        console.log(`\n${i + 1}. ${event.title}`);
        console.log(`   - ID: ${event._id}`);
        console.log(`   - Active: ${event.isActive}`);
        console.log(`   - Show on Landing: ${event.showInLanding}`);
        console.log(`   - Start: ${event.startDate}`);
        console.log(`   - End: ${event.endDate}`);
        console.log(`   - Products: ${event.products?.length || 0}`);
      });
    } else {
      console.log('\n❌ NO EVENTS FOUND FOR LANDING PAGE!');
      console.log('\n📝 To fix this, you need to:');
      console.log('1. Go to Admin → Events');
      console.log('2. Create a new event OR edit existing event');
      console.log('3. Enable "Show on Home Page" toggle');
      console.log('4. Set start date to NOW or earlier');
      console.log('5. Set end date to FUTURE date');
      console.log('6. Make sure isActive is TRUE');
      console.log('7. Add at least 1 product');
      console.log('8. Save the event');

      if (allEvents.length > 0) {
        console.log('\n📋 Here are your existing events:');
        allEvents.slice(0, 5).forEach((event, i) => {
          console.log(`\n${i + 1}. ${event.title}`);
          console.log(`   - Active: ${event.isActive}`);
          console.log(`   - Show on Landing: ${event.showInLanding || false}`);
          console.log(`   - Start: ${event.startDate}`);
          console.log(`   - End: ${event.endDate}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Disconnected from MongoDB');
  }
}

checkLandingEvents();
