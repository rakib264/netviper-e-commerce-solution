import Blog from '@/lib/models/Blog';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/blogs - Get published blogs for public display
export async function GET(request: NextRequest) {
  try {
    // Connect to database with timeout
    const connectionPromise = connectDB();
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    );
    
    await Promise.race([connectionPromise, timeoutPromise]);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const tag = searchParams.get('tag') || '';
    const featured = searchParams.get('featured');
    const sortBy = searchParams.get('sortBy') || 'publishedAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Build filter object - only show published and active blogs
    const filter: any = {
      status: 'published',
      isActive: true,
      publishedAt: { $lte: new Date() }
    };

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (category) {
      filter.categories = { $in: [category] };
    }

    if (tag) {
      filter.tags = { $in: [tag] };
    }

    if (featured === 'true') {
      filter.isFeatured = true;
    }

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get blogs with pagination
    const blogs = await Blog.find(filter)
      .populate('author', 'firstName lastName')
      .select('-content -comments') // Exclude full content and comments for list view
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean() || [];

    // Get total count for pagination
    const total = await Blog.countDocuments(filter);

    // Get unique categories and tags for filters
    const categories = await Blog.distinct('categories', { 
      status: 'published', 
      isActive: true 
    }) || [];
    const tags = await Blog.distinct('tags', { 
      status: 'published', 
      isActive: true 
    }) || [];

    return NextResponse.json({
      blogs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      filters: {
        categories,
        tags
      }
    });

  } catch (error) {
    console.error('Error fetching blogs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blogs' },
      { status: 500 }
    );
  }
}

