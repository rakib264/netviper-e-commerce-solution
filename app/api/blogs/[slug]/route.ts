import Blog from '@/lib/models/Blog';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/blogs/[slug] - Get single blog by slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { slug } = await params;
    const blog = await Blog.findOne({
      slug: slug,
      status: 'published',
      isActive: true,
      publishedAt: { $lte: new Date() }
    })
    .populate('author', 'firstName lastName email')
    .populate('comments.user', 'firstName lastName email')
    .lean() as any;

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    // Increment view count
    await Blog.findByIdAndUpdate(blog._id, { $inc: { viewCount: 1 } });

    // Get related blogs (same categories, excluding current blog)
    const relatedBlogs = await Blog.find({
      _id: { $ne: blog._id },
      categories: { $in: blog.categories },
      status: 'published',
      isActive: true,
      publishedAt: { $lte: new Date() }
    })
    .populate('author', 'firstName lastName')
    .select('-content -comments')
    .sort({ publishedAt: -1 })
    .limit(3)
    .lean() as any;

    return NextResponse.json({
      blog: {
        ...blog,
        viewCount: blog.viewCount + 1 // Return updated view count
      },
      relatedBlogs
    });

  } catch (error) {
    console.error('Error fetching blog:', error);
    return NextResponse.json(
      { error: 'Failed to fetch blog' },
      { status: 500 }
    );
  }
}

// POST /api/blogs/[slug] - Add comment to blog
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { comment, userId } = await request.json();

    if (!comment || !userId) {
      return NextResponse.json(
        { error: 'Comment and user ID are required' },
        { status: 400 }
      );
    }

    const { slug } = await params;
    const blog = await Blog.findOne({
      slug: slug,
      status: 'published',
      isActive: true,
      allowComments: true
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    const newComment = {
      user: userId,
      comment,
      isApproved: false, // Comments need approval by default
      createdAt: new Date()
    };

    blog.comments.push(newComment);
    await blog.save();

    return NextResponse.json({
      message: 'Comment added successfully. It will be visible after approval.',
      comment: newComment
    });

  } catch (error) {
    console.error('Error adding comment:', error);
    return NextResponse.json(
      { error: 'Failed to add comment' },
      { status: 500 }
    );
  }
}

// PATCH /api/blogs/[slug] - Like/unlike blog
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    await connectDB();

    const { action } = await request.json();

    if (!action || !['like', 'unlike'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const { slug } = await params;
    const blog = await Blog.findOne({
      slug: slug,
      status: 'published',
      isActive: true
    });

    if (!blog) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    const increment = action === 'like' ? 1 : -1;
    const updatedBlog = await Blog.findByIdAndUpdate(
      blog._id,
      { $inc: { likes: increment } },
      { new: true }
    ).select('likes');

    return NextResponse.json({
      message: `Blog ${action}d successfully`,
      likes: updatedBlog?.likes || 0
    });

  } catch (error) {
    console.error('Error updating blog likes:', error);
    return NextResponse.json(
      { error: 'Failed to update blog likes' },
      { status: 500 }
    );
  }
}

