import { auth } from '@/lib/auth';
import Blog from '@/lib/models/Blog';
import connectDB from '@/lib/mongodb';
import { NextRequest, NextResponse } from 'next/server';

// GET /api/admin/blogs/export - Export blogs to CSV
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const status = searchParams.get('status') || '';
    const category = searchParams.get('category') || '';

    // Build filter object
    const filter: any = {};
    if (status) filter.status = status;
    if (category) filter.categories = { $in: [category] };

    const blogs = await Blog.find(filter)
      .populate('author', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'ID',
        'Title',
        'Slug',
        'Status',
        'Author',
        'Categories',
        'Tags',
        'Published At',
        'View Count',
        'Likes',
        'Is Active',
        'Is Featured',
        'Created At',
        'Updated At'
      ];

      const csvRows = blogs.map((blog: any) => [
        blog._id.toString(),
        `"${blog.title.replace(/"/g, '""')}"`,
        blog.slug,
        blog.status,
        `"${blog.author?.firstName} ${blog.author?.lastName}"`,
        `"${blog.categories.join(', ')}"`,
        `"${blog.tags.join(', ')}"`,
        blog.publishedAt ? new Date(blog.publishedAt).toISOString() : '',
        blog.viewCount,
        blog.likes,
        blog.isActive,
        blog.isFeatured,
        new Date(blog.createdAt).toISOString(),
        new Date(blog.updatedAt).toISOString()
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="blogs-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }

    // Return JSON format
    return NextResponse.json(blogs);

  } catch (error) {
    console.error('Error exporting blogs:', error);
    return NextResponse.json(
      { error: 'Failed to export blogs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/blogs/export - Import blogs from CSV
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const data = await request.json();
    const { blogs } = data;

    if (!blogs || !Array.isArray(blogs)) {
      return NextResponse.json(
        { error: 'Invalid import data' },
        { status: 400 }
      );
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const blogData of blogs) {
      try {
        // Validate required fields
        if (!blogData.title || !blogData.content) {
          results.failed++;
          results.errors.push(`Missing title or content for blog: ${blogData.title || 'Unknown'}`);
          continue;
        }

        // Check if slug already exists
        if (blogData.slug) {
          const existingBlog = await Blog.findOne({ slug: blogData.slug });
          if (existingBlog) {
            results.failed++;
            results.errors.push(`Slug already exists: ${blogData.slug}`);
            continue;
          }
        }

        // Create blog with author as current user
        const blog = new Blog({
          ...blogData,
          author: session.user.id,
        });

        await blog.save();
        results.success++;

      } catch (error) {
        results.failed++;
        results.errors.push(`Failed to import blog "${blogData.title}": ${error}`);
      }
    }

    return NextResponse.json({
      message: `Import completed. ${results.success} successful, ${results.failed} failed.`,
      results
    });

  } catch (error) {
    console.error('Error importing blogs:', error);
    return NextResponse.json(
      { error: 'Failed to import blogs' },
      { status: 500 }
    );
  }
}

