import bcrypt from 'bcryptjs';
import Category from './models/Category';
import Product from './models/Product';
import User from './models/User';
import connectDB from './mongodb';

export async function seedDatabase() {
  await connectDB();

  // Seed Admin User - Redwan Rakib
  const adminExists = await User.findOne({ email: 'redwan.rakib264@gmail.com' });
  if (!adminExists) {
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
      profileImage: '', // Initialize as empty string
    });
    console.log('Admin user seeded successfully');
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
      }
    );
    console.log('Admin user updated successfully');
  }

  // Seed Categories
  const categories = [
    {
      name: 'Fresh Vegetables',
      slug: 'fresh-vegetables',
      description: 'Organic farm-fresh vegetables grown without chemicals',
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Fresh Fruits',
      slug: 'fresh-fruits',
      description: 'Seasonal organic fruits picked at peak ripeness',
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Fish & Seafood',
      slug: 'fish-seafood',
      description: 'Fresh fish and seafood from sustainable sources',
      isActive: true,
      sortOrder: 3,
    },
    {
      name: 'Dairy & Eggs',
      slug: 'dairy-eggs',
      description: 'Fresh dairy products and free-range eggs',
      isActive: true,
      sortOrder: 4,
    },
    {
      name: 'Grains & Pulses',
      slug: 'grains-pulses',
      description: 'Organic rice, lentils, and whole grains',
      isActive: true,
      sortOrder: 5,
    },
    {
      name: 'Herbs & Spices',
      slug: 'herbs-spices',
      description: 'Fresh herbs and authentic spices',
      isActive: true,
      sortOrder: 6,
    },
  ];

  for (const categoryData of categories) {
    const exists = await Category.findOne({ slug: categoryData.slug });
    if (!exists) {
      await Category.create(categoryData);
    }
  }

  // Get category IDs for products
  const vegetablesCategory = await Category.findOne({ slug: 'fresh-vegetables' });
  const fruitsCategory = await Category.findOne({ slug: 'fresh-fruits' });
  const fishCategory = await Category.findOne({ slug: 'fish-seafood' });
  const dairyCategory = await Category.findOne({ slug: 'dairy-eggs' });
  const grainsCategory = await Category.findOne({ slug: 'grains-pulses' });
  const herbsCategory = await Category.findOne({ slug: 'herbs-spices' });

  // Seed Products
  const products = [
    {
      name: 'Organic Spinach (500g)',
      slug: 'organic-spinach-500g',
      description: 'Fresh organic spinach grown without pesticides or chemicals. Rich in iron, vitamins, and minerals. Perfect for healthy meals and smoothies.',
      shortDescription: 'Fresh organic spinach, pesticide-free, rich in nutrients',
      category: vegetablesCategory?._id,
      price: 120,
      comparePrice: 150,
      sku: 'VEG-001',
      trackQuantity: true,
      quantity: 50,
      images: ['https://images.pexels.com/photos/2325843/pexels-photo-2325843.jpeg?auto=compress&cs=tinysrgb&w=800'],
      isActive: true,
      isFeatured: true,
      tags: ['organic', 'spinach', 'vegetables', 'healthy', 'iron'],
      averageRating: 4.8,
      totalSales: 324,
    },
    {
      name: 'Fresh Organic Tomatoes (1kg)',
      slug: 'fresh-organic-tomatoes-1kg',
      description: 'Vine-ripened organic tomatoes bursting with flavor. Grown using natural farming methods without harmful chemicals. Perfect for cooking and salads.',
      shortDescription: 'Vine-ripened organic tomatoes, naturally grown',
      category: vegetablesCategory?._id,
      price: 180,
      comparePrice: 220,
      sku: 'VEG-002',
      trackQuantity: true,
      quantity: 75,
      images: ['https://images.pexels.com/photos/533280/pexels-photo-533280.jpeg?auto=compress&cs=tinysrgb&w=800'],
      isActive: true,
      isFeatured: true,
      tags: ['organic', 'tomatoes', 'vegetables', 'fresh', 'vine-ripened'],
      averageRating: 4.7,
      totalSales: 456,
    },
    {
      name: 'Organic Bananas (1 dozen)',
      slug: 'organic-bananas-1-dozen',
      description: 'Sweet and nutritious organic bananas, naturally ripened. Rich in potassium and perfect for breakfast, snacks, or smoothies.',
      shortDescription: 'Sweet organic bananas, naturally ripened',
      category: fruitsCategory?._id,
      price: 90,
      comparePrice: 120,
      sku: 'FRT-001',
      trackQuantity: true,
      quantity: 100,
      images: ['https://images.pexels.com/photos/61127/pexels-photo-61127.jpeg?auto=compress&cs=tinysrgb&w=800'],
      isActive: true,
      isFeatured: true,
      tags: ['organic', 'bananas', 'fruits', 'potassium', 'healthy'],
      averageRating: 4.9,
      totalSales: 678,
    },
    {
      name: 'Fresh Hilsa Fish (1kg)',
      slug: 'fresh-hilsa-fish-1kg',
      description: 'Premium fresh Hilsa fish, caught from clean waters. Rich in omega-3 fatty acids and perfect for traditional Bengali dishes.',
      shortDescription: 'Premium fresh Hilsa fish, omega-3 rich',
      category: fishCategory?._id,
      price: 1200,
      comparePrice: 1400,
      sku: 'FSH-001',
      trackQuantity: true,
      quantity: 25,
      images: ['https://images.pexels.com/photos/1683545/pexels-photo-1683545.jpeg?auto=compress&cs=tinysrgb&w=800'],
      isActive: true,
      isFeatured: true,
      tags: ['fresh', 'hilsa', 'fish', 'omega-3', 'bengali'],
      averageRating: 4.8,
      totalSales: 234,
    },
    {
      name: 'Organic Free-Range Eggs (12 pieces)',
      slug: 'organic-free-range-eggs-12-pieces',
      description: 'Fresh organic eggs from free-range chickens. Rich in protein and nutrients, perfect for healthy breakfast and cooking.',
      shortDescription: 'Fresh organic eggs from free-range chickens',
      category: dairyCategory?._id,
      price: 180,
      comparePrice: 220,
      sku: 'DAI-001',
      trackQuantity: true,
      quantity: 80,
      images: ['https://images.pexels.com/photos/162712/egg-white-food-protein-162712.jpeg?auto=compress&cs=tinysrgb&w=800'],
      isActive: true,
      isFeatured: true,
      tags: ['organic', 'eggs', 'free-range', 'protein', 'fresh'],
      averageRating: 4.6,
      totalSales: 567,
    },
    {
      name: 'Organic Basmati Rice (5kg)',
      slug: 'organic-basmati-rice-5kg',
      description: 'Premium organic Basmati rice with long grains and aromatic fragrance. Grown using traditional methods without chemicals.',
      shortDescription: 'Premium organic Basmati rice, aromatic and chemical-free',
      category: grainsCategory?._id,
      price: 850,
      comparePrice: 1000,
      sku: 'GRN-001',
      trackQuantity: true,
      quantity: 40,
      images: ['https://images.pexels.com/photos/723198/pexels-photo-723198.jpeg?auto=compress&cs=tinysrgb&w=800'],
      isActive: true,
      isFeatured: true,
      tags: ['organic', 'basmati', 'rice', 'grains', 'aromatic'],
      averageRating: 4.7,
      totalSales: 345,
    },
  ];

  for (const productData of products) {
    const exists = await Product.findOne({ slug: productData.slug });
    if (!exists) {
      await Product.create(productData);
    }
  }

  // console.log('Database seeded successfully');
}
