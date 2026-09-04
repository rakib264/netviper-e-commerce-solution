// Script to seed initial customer feedback data
// Run with: node scripts/seed-customer-feedback.js

const mongoose = require('mongoose');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'your-mongodb-uri-here';

const customerFeedbackSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ['facebook', 'messenger', 'instagram', 'whatsapp', 'email'],
      required: true,
    },
    platformName: {
      type: String,
      required: true,
    },
    customer: {
      name: {
        type: String,
        required: true,
      },
      avatar: {
        type: String,
        required: true,
      },
      location: {
        type: String,
        required: true,
      },
      verified: {
        type: Boolean,
        default: false,
      },
    },
    message: {
      type: String,
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    productImage: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const CustomerFeedback =
  mongoose.models.CustomerFeedback ||
  mongoose.model('CustomerFeedback', customerFeedbackSchema);

const sampleFeedbacks = [
  {
    platform: 'facebook',
    platformName: 'Facebook',
    customer: {
      name: 'রাহিমা খাতুন',
      avatar:
        'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      location: 'Dhaka, Bangladesh',
      verified: true,
    },
    message:
      'অসাধারণ quality! আমার order টা ২ দিনেই পেয়ে গেছি। Size perfect fit হয়েছে। Muscari Mart এর service really impressive! 💯',
    rating: 5,
    productImage:
      'https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?w=300&h=200&fit=crop&auto=format&q=80',
    isActive: true,
  },
  {
    platform: 'messenger',
    platformName: 'Messenger',
    customer: {
      name: 'Karim Ahmed',
      avatar:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      location: 'Chittagong, Bangladesh',
      verified: false,
    },
    message:
      'Everyone is praising the shirt I bought from your website! Both quality and price are perfect. Will definitely recommend!',
    rating: 5,
    productImage:
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=300&h=200&fit=crop&auto=format&q=80',
    isActive: true,
  },
  {
    platform: 'instagram',
    platformName: 'Instagram',
    customer: {
      name: 'ফাতেমা বেগম',
      avatar:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      location: 'Sylhet, Bangladesh',
      verified: true,
    },
    message:
      'Muscari Mart থেকে কিনা dress টা দেখে সবাই জিজ্ঞেস করছে কোথা থেকে কিনেছি! 😍 Quality top-notch, delivery super fast. Love it! 💕',
    rating: 5,
    productImage:
      'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=300&h=200&fit=crop&auto=format&q=80',
    isActive: true,
  },
  {
    platform: 'facebook',
    platformName: 'Facebook',
    customer: {
      name: 'Nasir Uddin',
      avatar:
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      location: 'Rajshahi, Bangladesh',
      verified: false,
    },
    message:
      'Customer service is absolutely excellent! Had a problem with my order, they solved it immediately. I have full trust in Muscari Mart!',
    rating: 5,
    productImage:
      'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=300&h=200&fit=crop&auto=format&q=80',
    isActive: true,
  },
  {
    platform: 'messenger',
    platformName: 'Messenger',
    customer: {
      name: 'সালমা আক্তার',
      avatar:
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      location: 'Khulna, Bangladesh',
      verified: true,
    },
    message:
      'My first online shopping experience with Muscari Mart. Was scared but the result is amazing! Product exactly same as shown. Highly satisfied! 👍',
    rating: 5,
    productImage:
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=200&fit=crop&auto=format&q=80',
    isActive: true,
  },
  {
    platform: 'instagram',
    platformName: 'Instagram',
    customer: {
      name: 'Mahmud Hasan',
      avatar:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face&auto=format&q=80',
      location: 'Barisal, Bangladesh',
      verified: false,
    },
    message:
      "Impressed by Muscari Mart's collection! Both freshness and quality are perfect. Reasonable price, quick delivery. Perfect organic food store! ✨",
    rating: 5,
    productImage:
      'https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=200&fit=crop&auto=format&q=80',
    isActive: true,
  },
];

async function seedFeedback() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing feedback
    console.log('Clearing existing feedback...');
    await CustomerFeedback.deleteMany({});
    console.log('Existing feedback cleared');

    // Insert sample feedback
    console.log('Inserting sample feedback...');
    const result = await CustomerFeedback.insertMany(sampleFeedbacks);
    console.log(`Successfully inserted ${result.length} feedback entries`);

    console.log('Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding feedback:', error);
    process.exit(1);
  }
}

seedFeedback();

