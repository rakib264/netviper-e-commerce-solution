import { auth } from '@/lib/auth';
import Blog from '@/lib/models/Blog';
import User from '@/lib/models/User';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/blogs - Get all blogs with filters, search, pagination
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';
    const author = searchParams.get('author') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const isActive = searchParams.get('isActive');

    // Build filter object
    const filter: any = {};

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { excerpt: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter.categories = { $in: [category] };
    }

    if (author) {
      filter.author = author;
    }

    if (isActive !== null && isActive !== '') {
      filter.isActive = isActive === 'true';
    }

    // Calculate skip value
    const skip = (page - 1) * limit;

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Check if Blog collection exists and get count first
    const total = await Blog.countDocuments(filter);

    // Return empty result immediately if no blogs
    if (total === 0) {
      
      // Still get authors for filters
      const authors = await User.find({ role: { $in: ['admin', 'manager'] } })
        .select('firstName lastName email')
        .lean();
      
      return NextResponse.json({
        blogs: [],
        pagination: {
          page,
          limit,
          total: 0,
          pages: 0
        },
        filters: {
          categories: [],
          authors: authors || []
        }
      });
    }

    // Get blogs with pagination (only if blogs exist)
    const blogs = await Blog.find(filter)
      .populate('author', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    // Get unique categories and authors for filters
    const categories = await Blog.distinct('categories');
    const authors = await User.find({ role: { $in: ['admin', 'manager'] } })
      .select('firstName lastName email')
      .lean();

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
        authors
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

// POST /api/admin/blogs - Create new blog
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();

    // Validate required fields
    if (!data.title || !data.content) {
      return NextResponse.json(
        { error: 'Title and content are required' },
        { status: 400 }
      );
    }

    // Check if slug already exists
    if (data.slug) {
      const existingBlog = await Blog.findOne({ slug: data.slug });
      if (existingBlog) {
        return NextResponse.json(
          { error: 'Slug already exists' },
          { status: 400 }
        );
      }
    }

    // Get author from session (this is the authoritative source)
    let sessionAuthorId = session.user.id;

    if (!sessionAuthorId) {
      console.error('No author ID found in session:', session.user);
      return NextResponse.json(
        { error: 'Unable to identify author from session' },
        { status: 400 }
      );
    }

    // Check if the user exists in the database
    let authorExists = await User.findById(sessionAuthorId);

    if (authorExists) {
      // console.log('Author details:', {
      //   id: authorExists._id,
      //   firstName: authorExists.firstName,
      //   lastName: authorExists.lastName,
      //   email: authorExists.email
      // });
    } else {
      console.warn('Author not found in database with ID:', sessionAuthorId, '- attempting to find by email');

      // Try to find user by email from session
      if (session.user.email) {
        authorExists = await User.findOne({ email: session.user.email });

        if (authorExists) {
          // Update sessionAuthorId to use the correct ID from database
          sessionAuthorId = authorExists._id.toString();
        }
      }

      if (!authorExists) {
        console.error('Author not found in database by ID or email');
        return NextResponse.json(
          { error: 'Author not found in database. Please contact administrator.' },
          { status: 400 }
        );
      }
    }

    // Validate that the author from request matches session (if provided)
    if (data.author && data.author !== sessionAuthorId) {
      console.warn('Author mismatch - request author:', data.author, 'session author:', sessionAuthorId);
      // For security, we'll use the session author instead of the request author
    }

    // Ensure author ID is a valid ObjectId
    let finalAuthorId;
    if (mongoose.Types.ObjectId.isValid(sessionAuthorId)) {
      finalAuthorId = new mongoose.Types.ObjectId(sessionAuthorId);
    } else {
      finalAuthorId = sessionAuthorId;
    }

    const blogData = {
      ...data,
      author: finalAuthorId, // Always use session author for security
    };


    const blog = new Blog(blogData);

    await blog.save();

    // Populate author data
    let populatedBlog;
    try {
      populatedBlog = await blog.populate('author', 'firstName lastName email');


      if (!populatedBlog.author) {

        // Try to manually populate
        const authorData = await User.findById(blog.author).select('firstName lastName email');

        if (authorData) {
          populatedBlog.author = authorData;
        }
      }
    } catch (populateError) {
      console.error('Error during populate:', populateError);
      // Return blog without populated author but with author ID
      populatedBlog = blog;
    }

    return NextResponse.json(populatedBlog, { status: 201 });

  } catch (error) {
    console.error('Error creating blog:', error);
    return NextResponse.json(
      { error: 'Failed to create blog' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/blogs - Bulk update blogs
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids, action, data } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Blog IDs are required' },
        { status: 400 }
      );
    }

    let updateData: any = {};
    let actionMessage = '';

    switch (action) {
      case 'activate':
        updateData = { isActive: true };
        actionMessage = 'activated';
        break;
      case 'deactivate':
        updateData = { isActive: false };
        actionMessage = 'deactivated';
        break;
      case 'publish':
        updateData = { status: 'published', publishedAt: new Date() };
        actionMessage = 'published';
        break;
      case 'draft':
        updateData = { status: 'draft' };
        actionMessage = 'moved to draft';
        break;
      case 'archive':
        updateData = { status: 'archived' };
        actionMessage = 'archived';
        break;
      case 'feature':
        updateData = { isFeatured: true };
        actionMessage = 'featured';
        break;
      case 'unfeature':
        updateData = { isFeatured: false };
        actionMessage = 'unfeatured';
        break;
      case 'update':
        updateData = data;
        actionMessage = 'updated';
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }

    const result = await Blog.updateMany(
      { _id: { $in: ids } },
      { $set: updateData }
    );

    return NextResponse.json({
      message: `${result.modifiedCount} blog${result.modifiedCount !== 1 ? 's' : ''} ${actionMessage} successfully`,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Error bulk updating blogs:', error);
    return NextResponse.json(
      { error: 'Failed to update blogs' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/blogs - Bulk delete blogs
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids } = await request.json();

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: 'Blog IDs are required' },
        { status: 400 }
      );
    }

    const result = await Blog.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      message: `${result.deletedCount} blog${result.deletedCount !== 1 ? 's' : ''} deleted successfully`,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('Error bulk deleting blogs:', error);
    return NextResponse.json(
      { error: 'Failed to delete blogs' },
      { status: 500 }
    );
  }
}

