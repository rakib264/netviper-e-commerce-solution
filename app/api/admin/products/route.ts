import { createAuditLog, getClientIP } from '@/lib/audit';
import { auth } from '@/lib/auth';
import AuditLog from '@/lib/models/AuditLog';
import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { validateProductPayload } from '@/lib/products/validate-payload';
import { mediaToLegacy, legacyToMedia } from '@/lib/products/types';
import mongoose from 'mongoose';
 
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager', 'staff'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const minPrice = parseFloat(searchParams.get('minPrice') || '0');
    const maxPrice = parseFloat(searchParams.get('maxPrice') || '999999');
    const featured = searchParams.get('featured') === 'true';
    const active = searchParams.get('active');
    const isNewArrival = searchParams.get('isNewArrival');
    const isLimitedEdition = searchParams.get('isLimitedEdition');
    const giftable = searchParams.get('giftable');
    const minRating = parseFloat(searchParams.get('minRating') || '0');
    const stock = searchParams.get('stock');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    const skip = (page - 1) * limit;
    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } },
        { 'variants.sku': { $regex: search, $options: 'i' } },
      ];
    }

    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        query.category = categoryDoc._id;
      }
    }

    if (minPrice > 0 || maxPrice < 999999) {
      query.price = { $gte: minPrice, $lte: maxPrice };
    }

    if (featured) {
      query.isFeatured = true;
    }

    if (active !== null && active !== undefined) {
      query.isActive = active === 'true';
    }

    if (isNewArrival !== null && isNewArrival !== undefined) {
      query.isNewArrival = isNewArrival === 'true';
    }

    if (isLimitedEdition !== null && isLimitedEdition !== undefined) {
      query.isLimitedEdition = isLimitedEdition === 'true';
    }

    if (!isNaN(minRating) && minRating > 0) {
      query.averageRating = { $gte: minRating };
    }

    // The deals editor's gift and mystery-box pickers only offer products the
    // merchant has marked giftable.
    if (giftable !== null && giftable !== undefined) {
      query.giftable = giftable === 'true';
    }

    if (stock === 'in') {
      query.quantity = { $gt: 0 };
    } else if (stock === 'out') {
      query.quantity = { $lte: 0 };
    }

    if (dateFrom || dateTo) {
      query.createdAt = {} as any;
      if (dateFrom) {
        const [fy, fm, fd] = dateFrom.split('-').map((v) => parseInt(v, 10));
        const from = new Date(fy, (fm || 1) - 1, fd || 1, 0, 0, 0, 0);
        (query.createdAt as any).$gte = from;
      }
      if (dateTo) {
        const [ty, tm, td] = dateTo.split('-').map((v) => parseInt(v, 10));
        const to = new Date(ty, (tm || 1) - 1, td || 1, 23, 59, 59, 999);
        (query.createdAt as any).$lte = to;
      }
    }

    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Product.countDocuments(query);

    await createAuditLog({
      userId: session.user.id,
      action: 'VIEW',
      resource: 'Product',
      resourceId: 'list',
      metadata: {
        filters: { search, category, sortBy, sortOrder, minPrice, maxPrice, featured, active, isNewArrival, isLimitedEdition, minRating, stock, dateFrom, dateTo },
        resultCount: products.length,
        totalCount: total
      },
      ipAddress: getClientIP(request)
    });

    return NextResponse.json({
      products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

function normalizeIncomingProduct(data: any) {
  const mode = data.variantMode === 'multi' ? 'multi' : 'single';

  let media = Array.isArray(data.media) ? data.media : [];
  if (!media.length) {
    media = legacyToMedia(data.images || [], data.videoLinks || []);
  }
  const legacy = mediaToLegacy(media);

  const variants = Array.isArray(data.variants)
    ? data.variants.map((v: any) => {
        let vMedia = Array.isArray(v.media) ? v.media : [];
        if (!vMedia.length && v.image) {
          vMedia = legacyToMedia([v.image], []);
        }
        return {
          ...v,
          id: v.id || `var_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          attributeName: v.attributeName || v.name || 'Color',
          attributeValue: v.attributeValue || v.value || '',
          name: v.attributeName || v.name || 'Color',
          value: v.attributeValue || v.value || '',
          thumbnailImage: v.thumbnailImage || v.image || '',
          image: v.thumbnailImage || v.image || '',
          media: vMedia,
          barcodeType: v.barcodeType || 'Custom',
          trackQuantity: v.trackQuantity !== false,
        };
      })
    : [];

  return {
    ...data,
    variantMode: mode,
    media,
    images: legacy.images,
    videoLinks: legacy.videoLinks,
    variants: mode === 'multi' ? variants : [],
    productSize: [],
    sizeImage: data.sizeImage || '',
    shippingCost: undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const raw = await request.json();
    const data = normalizeIncomingProduct(raw);
    
    const errors = validateProductPayload(data);
    
    let categoryId;
    if (data.category) {
      if (mongoose.Types.ObjectId.isValid(data.category)) {
        const category = await Category.findById(data.category);
        if (!category) {
          errors.push(`Category not found: ${data.category}`);
        } else {
          categoryId = category._id;
        }
      } else {
        const category = await Category.findOne({ slug: data.category });
        if (!category) {
          errors.push(`Category not found: ${data.category}`);
        } else {
          categoryId = category._id;
        }
      }
    }

    const skusToCheck: string[] =
      data.variantMode === 'multi'
        ? (data.variants || []).map((v: any) => v.sku).filter(Boolean)
        : [data.sku].filter(Boolean);

    for (const sku of skusToCheck) {
      const exists = await Product.findOne({
        $or: [{ sku }, { 'variants.sku': sku }],
      }).select('_id');
      if (exists) {
        errors.push(`SKU already exists: ${sku}`);
      }
    }
    
    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: errors 
      }, { status: 400 });
    }

    const existingSlug = await Product.findOne({ slug: data.slug });
    if (existingSlug) {
      return NextResponse.json({
        error: 'Validation failed',
        details: ['Slug already exists. Please use a unique slug'],
      }, { status: 400 });
    }
    
    const productData = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      editorsNotes: data.editorsNotes,
      category: categoryId,
      variantMode: data.variantMode,
      price: parseFloat(data.price),
      comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : undefined,
      cost: data.cost ? parseFloat(data.cost) : undefined,
      sku: data.sku,
      barcodeType: data.barcodeType || 'Custom',
      barcode: data.barcode,
      trackQuantity: data.trackQuantity,
      quantity: data.quantity ? parseInt(data.quantity, 10) : 0,
      lowStockThreshold: data.lowStockThreshold ? parseInt(data.lowStockThreshold, 10) : 10,
      thumbnailImage: data.thumbnailImage,
      media: data.media || [],
      images: data.images || [],
      videoLinks: data.videoLinks || [],
      sizeImage: '',
      weight: data.weight ? String(data.weight) : undefined,
      dimensions: data.dimensions
        ? {
            length: data.dimensions.length != null ? String(data.dimensions.length) : '',
            width: data.dimensions.width != null ? String(data.dimensions.width) : '',
            height: data.dimensions.height != null ? String(data.dimensions.height) : '',
          }
        : undefined,
      shippingClass: data.shippingClass || undefined,
      taxRate: data.taxRate ? parseFloat(data.taxRate) : undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isFeatured: data.isFeatured !== undefined ? data.isFeatured : false,
      isNewArrival: data.isNewArrival !== undefined ? data.isNewArrival : false,
      isLimitedEdition: data.isLimitedEdition !== undefined ? data.isLimitedEdition : false,
      excludedFromPromotions: data.excludedFromPromotions === true,
      giftable: data.giftable === true,
      // Returnable unless the admin says otherwise, matching the schema default
      // so the existing catalogue is unaffected.
      isReturnable: data.isReturnable !== false,
      nonReturnableReason:
        data.isReturnable === false ? data.nonReturnableReason || 'custom' : undefined,
      returnWindowDays:
        Number(data.returnWindowDays) > 0 ? Number(data.returnWindowDays) : undefined,
      tags: data.tags || [],
      productSize: [],
      sizeVisualizer: data.sizeVisualizer,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      seoKeywords: data.seoKeywords || [],
      variants: data.variants || [],
    };

    const product = await Product.create(productData);

    await AuditLog.create({
      user: session.user.id,
      action: 'CREATE',
      resource: 'Product',
      resourceId: product._id.toString(),
      metadata: { productName: product.name, sku: product.sku }
    });
    
    return NextResponse.json({
      message: 'Product created successfully',
      product
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('Create product error:', error);
    
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return NextResponse.json({ 
        error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` 
      }, { status: 400 });
    }
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err: any) => err.message);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: validationErrors 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      error: 'Failed to create product',
      details: error.message 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin', 'manager'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids, isActive } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product ids provided' }, { status: 400 });
    }
    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive } }
    );

    const logs = ids.map((id: string) => ({
      user: session.user.id,
      action: 'UPDATE',
      resource: 'Product',
      resourceId: id,
      changes: [
        {
          field: 'isActive',
          oldValue: undefined,
          newValue: isActive,
        },
      ],
      metadata: { bulk: true },
    }));
    try {
      await AuditLog.insertMany(logs);
    } catch (_) {
      // best-effort
    }

    return NextResponse.json({ updated: result.modifiedCount || 0 });
  } catch (error) {
    console.error('Bulk update products error:', error);
    return NextResponse.json({ error: 'Failed to update products' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !['admin'].includes(session.user?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No product ids provided' }, { status: 400 });
    }

    const results: Array<{ id: string; status: 'deleted' | 'skipped'; reason?: string }> = [];

    for (const id of ids) {
      try {
        const product = await Product.findById(id);
        if (!product) {
          results.push({ id, status: 'skipped', reason: 'Product not found' });
          continue;
        }

        await Product.findByIdAndDelete(id);

        await AuditLog.create({
          user: session.user.id,
          action: 'DELETE',
          resource: 'Product',
          resourceId: id,
          metadata: { productName: product.name, sku: product.sku, bulk: true }
        });

        results.push({ id, status: 'deleted' });
      } catch (_err) {
        results.push({ id, status: 'skipped', reason: 'Unexpected error' });
      }
    }

    const deleted = results.filter(r => r.status === 'deleted').length;
    const skipped = results.length - deleted;

    return NextResponse.json({ deleted, skipped, results });
  } catch (error) {
    console.error('Bulk delete products error:', error);
    return NextResponse.json({ error: 'Failed to bulk delete products' }, { status: 500 });
  }
}
