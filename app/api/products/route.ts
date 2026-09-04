import Category from '@/lib/models/Category';
import Product from '@/lib/models/Product';
import connectDB from '@/lib/mongodb';
import { getSessionFromCookies } from '@/lib/auth';
import mongoose from 'mongoose';
import { getCachedCategoryScopeIds } from '@/lib/home/storefront-content';
import { NextRequest, NextResponse } from 'next/server';

// Define confidential fields that should only be visible to admin/manager/super-admin
// Note: quantity is kept public as it's needed for UI functionality (stock status, add to cart)
const CONFIDENTIAL_FIELDS = ['cost', 'sku', 'barcode', 'dimensions', 'totalSales'];

// Helper function to check if user has admin privileges
function hasAdminAccess(role: string): boolean {
  return ['admin', 'manager', 'super-admin'].includes(role);
}

// Helper function to filter confidential fields from products array
function filterProductsData(products: any[], hasAccess: boolean): any[] {
  if (hasAccess) {
    return products; // Return all fields for admin users
  }

  // Create a copy and remove confidential fields for public users
  return products.map(product => {
    const filtered = { ...product };
    CONFIDENTIAL_FIELDS.forEach(field => {
      delete filtered[field];
    });
    return filtered;
  });
}

// Sorting is driven by a query param, so the field has to come off a whitelist —
// an arbitrary key produces a silently unordered (and therefore unpaginatable)
// result set, and would let a caller order by a confidential field.
const SORTABLE_FIELDS = new Set([
  'createdAt',
  'updatedAt',
  'price',
  'name',
  'averageRating',
  'totalReviews',
]);

const MAX_LIMIT = 100;

/**
 * Field exclusions for the listing projection.
 *
 * Stated as exclusions rather than as a field list so a newly added product
 * field keeps showing up in listings by default — the previous behaviour —
 * rather than silently disappearing until someone remembers to add it here.
 *
 * `reviews` is the one that mattered: an unbounded array of subdocuments, read
 * out of Mongo and shipped to the browser for every row of every listing, and
 * rendered by nothing (a card shows `averageRating` and `totalReviews`, both
 * denormalised onto the product). `media` is the same story for the newer image
 * model, which no card reads — they all use the legacy `images` array that is
 * kept in sync with it on write.
 */
const LIST_EXCLUDE = '-reviews -media -__v';
const COLOR_VARIANT_NAME = /^colou?r$/i;

/** User input reaches `$regex`, so metacharacters must be neutralised. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

/** Returns null for absent/blank/non-numeric input so callers can skip the filter. */
function readFloat(value: string | null): number | null {
  if (value === null || value.trim() === '') return null;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Get user session to determine access level
    const session = await getSessionFromCookies();
    const userRole = session?.user?.role || '';
    const hasAccess = hasAdminAccess(userRole);

    const { searchParams } = new URL(request.url);
    const page = readInt(searchParams.get('page'), 1, 1, 100000);
    const limit = readInt(searchParams.get('limit'), 12, 1, MAX_LIMIT);
    const search = (searchParams.get('search') || '').trim();
    const categorySlug = (searchParams.get('category') || '').trim();
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const minPrice = readFloat(searchParams.get('minPrice'));
    const maxPrice = readFloat(searchParams.get('maxPrice'));
    const featured = searchParams.get('featured') === 'true';
    const isNewArrival = searchParams.get('isNewArrival') === 'true';
    const isLimitedEdition = searchParams.get('isLimitedEdition') === 'true';
    const active = searchParams.get('active');
    const minRating = Math.min(5, Math.max(0, readFloat(searchParams.get('minRating')) ?? 0));
    const colorParam = searchParams.get('color') || '';
    const wantsFacets = searchParams.get('facets') === 'true';

    const requestedSortBy = searchParams.get('sortBy') || 'createdAt';
    const sortField = SORTABLE_FIELDS.has(requestedSortBy) ? requestedSortBy : 'createdAt';

    const skip = (page - 1) * limit;

    // `baseQuery` holds everything except the price and colour constraints, so the
    // facet pass can report the full range of values still reachable from here.
    const baseQuery: any = {};

    if (active !== null) {
      baseQuery.isActive = active === 'true';
    } else {
      baseQuery.isActive = true; // Default to active products only
    }

    if (search) {
      const safeSearch = escapeRegex(search);
      baseQuery.$or = [
        { name: { $regex: safeSearch, $options: 'i' } },
        { description: { $regex: safeSearch, $options: 'i' } },
        { tags: { $in: [new RegExp(safeSearch, 'i')] } },
      ];
    }

    let categoryDoc: any = null;
    let categoryScopeIds: string[] = [];

    if (categorySlug) {
      categoryDoc = await Category.findOne({ slug: categorySlug, isActive: true })
        .select('_id name slug')
        .lean();

      // An unknown slug used to leave the category constraint off the query
      // entirely, which returned the whole catalogue as if it belonged to a
      // category that does not exist. Say so instead.
      if (!categoryDoc) {
        return NextResponse.json({
          products: [],
          pagination: { page, limit, total: 0, pages: 0 },
          isFallback: false,
          fallbackInfo: null,
          categoryNotFound: true,
          facets: wantsFacets ? { colors: [], priceRange: null } : undefined,
        });
      }

      // A category page lists its own products *and* everything filed under its
      // descendants. The previous either/or meant a parent holding one product
      // hid every product in its subcategories.
      categoryScopeIds = await getCachedCategoryScopeIds(String(categoryDoc._id));
      baseQuery.category = { $in: categoryScopeIds };
    }

    if (featured) baseQuery.isFeatured = true;
    if (isNewArrival) baseQuery.isNewArrival = true;
    if (isLimitedEdition) baseQuery.isLimitedEdition = true;
    if (minRating > 0) baseQuery.averageRating = { $gte: minRating };

    const query: any = { ...baseQuery };

    if (minPrice !== null || maxPrice !== null) {
      const price: any = {};
      if (minPrice !== null) price.$gte = minPrice;
      if (maxPrice !== null) price.$lte = maxPrice;
      query.price = price;
    }

    const colors = colorParam
      .split(',')
      .map((color) => color.trim())
      .filter(Boolean);

    if (colors.length > 0) {
      // Match products carrying a "Color"/"Colour" variant with any of the values.
      query.variants = {
        $elemMatch: {
          name: { $regex: COLOR_VARIANT_NAME },
          value: { $in: colors.map((color) => new RegExp(`^${escapeRegex(color)}$`, 'i')) },
        },
      };
    }

    // A non-unique sort key (price, rating, name) leaves ties in an arbitrary
    // order that can differ between pages, so rows get repeated or skipped as
    // you page through. `_id` makes the order total.
    const sort: Record<string, 1 | -1> = { [sortField]: sortOrder as 1 | -1 };
    if (sortField !== '_id') sort._id = -1;

    const [products, total] = await Promise.all([
      Product.find(query)
        // A listing renders cards. `reviews` is an unbounded subdocument array
        // and `description` a full body: neither appears on a card, and both
        // were being read out of Mongo and shipped to the browser for every row.
        .select(LIST_EXCLUDE)
        .populate('category', 'name slug')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    // Fallback now means "everything on this page comes from a subcategory",
    // which is worth telling the shopper; it is only possible when the category
    // actually has descendants.
    let isFallback = false;
    let fallbackInfo: {
      originalCategory: { name: string; slug: string };
      showingFromSubcategories: { name: string; slug: string }[];
    } | null = null;

    if (categoryDoc && total > 0 && categoryScopeIds.length > 1) {
      const ownCount = await Product.countDocuments({
        ...query,
        category: categoryDoc._id,
      });

      if (ownCount === 0) {
        const subcategories = await Category.find({
          _id: { $in: categoryScopeIds.slice(1) },
        })
          .select('name slug')
          .lean();

        isFallback = true;
        fallbackInfo = {
          originalCategory: { name: categoryDoc.name, slug: categoryDoc.slug },
          showingFromSubcategories: subcategories.map((sub: any) => ({
            name: sub.name,
            slug: sub.slug,
          })),
        };
      }
    }

    // Facets describe the values still selectable within the current scope, so
    // the client can offer a real colour list and a real price range instead of
    // a hardcoded guess. Opt-in, because only the listing pages need them.
    let facets: { colors: string[]; priceRange: { min: number; max: number } | null } | undefined;

    if (wantsFacets) {
      // `aggregate` runs the pipeline raw — unlike `find`, it does not cast the
      // schema's ObjectId fields, so the category ids have to be cast by hand or
      // the `$match` silently matches nothing.
      const facetMatch: any = { ...baseQuery };
      if (categoryScopeIds.length > 0) {
        facetMatch.category = {
          $in: categoryScopeIds.map((id) => new mongoose.Types.ObjectId(id)),
        };
      }

      const [aggregated] = await Product.aggregate([
        { $match: facetMatch },
        {
          $facet: {
            colors: [
              { $unwind: '$variants' },
              { $match: { 'variants.name': { $regex: COLOR_VARIANT_NAME } } },
              { $group: { _id: '$variants.value' } },
              { $sort: { _id: 1 } },
              { $limit: 60 },
            ],
            price: [{ $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } }],
          },
        },
      ]);

      const priceStats = aggregated?.price?.[0];

      facets = {
        colors: (aggregated?.colors || [])
          .map((entry: any) => entry._id)
          .filter((value: unknown): value is string => typeof value === 'string' && value.trim() !== ''),
        priceRange:
          priceStats && Number.isFinite(priceStats.min) && Number.isFinite(priceStats.max)
            ? { min: Math.floor(priceStats.min), max: Math.ceil(priceStats.max) }
            : null,
      };
    }

    // Filter products based on user role
    const filteredProducts = filterProductsData(products, hasAccess);

    return NextResponse.json({
      products: filteredProducts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      isFallback,
      fallbackInfo,
      categoryNotFound: false,
      ...(facets ? { facets } : {}),
    });
  } catch (error) {
    console.error('Products API error:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const data = await request.json();

    // Validation
    const errors: string[] = [];

    // Required fields validation
    if (!data.name || data.name.trim().length === 0) {
      errors.push('Product name is required');
    }

    if (!data.slug || data.slug.trim().length === 0) {
      errors.push('Product slug is required');
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push('Product description is required');
    }

    if (!data.category) {
      errors.push('Product category is required');
    }

    if (!data.price || data.price <= 0) {
      errors.push('Product price must be greater than 0');
    }

    if (!data.sku || data.sku.trim().length === 0) {
      errors.push('Product SKU is required');
    }

    if (!data.thumbnailImage || data.thumbnailImage.trim().length === 0) {
      errors.push('Product thumbnail image is required');
    }

    // Validate category exists
    let categoryId;
    if (data.category) {
      const category = await Category.findOne({
        $or: [
          { slug: data.category },
          { _id: data.category }
        ]
      });

      if (!category) {
        errors.push('Category not found');
      } else {
        categoryId = category._id;
      }
    }

    // Validate price logic
    if (data.comparePrice && data.comparePrice <= data.price) {
      errors.push('Compare price must be greater than regular price');
    }

    if (data.cost && data.cost > data.price) {
      errors.push('Cost cannot be greater than selling price');
    }

    // Validate quantity
    if (data.trackQuantity && (data.quantity === undefined || data.quantity < 0)) {
      errors.push('Quantity must be 0 or greater when tracking quantity');
    }

    // Validate images array
    if (data.images && !Array.isArray(data.images)) {
      errors.push('Images must be an array');
    }

    // Validate variants
    if (data.variants && Array.isArray(data.variants)) {
      for (let i = 0; i < data.variants.length; i++) {
        const variant = data.variants[i];
        if (!variant.name || !variant.value) {
          errors.push(`Variant ${i + 1}: name and value are required`);
        }
        if (variant.price && variant.price <= 0) {
          errors.push(`Variant ${i + 1}: price must be greater than 0`);
        }
        if (variant.quantity !== undefined && variant.quantity < 0) {
          errors.push(`Variant ${i + 1}: quantity must be 0 or greater`);
        }
      }
    }

    // Check for duplicate SKU
    const existingProduct = await Product.findOne({ sku: data.sku });
    if (existingProduct) {
      errors.push('SKU already exists. Please use a unique SKU');
    }

    // Check for duplicate slug
    const existingSlug = await Product.findOne({ slug: data.slug });
    if (existingSlug) {
      errors.push('Slug already exists. Please use a unique slug');
    }

    if (errors.length > 0) {
      return NextResponse.json({
        error: 'Validation failed',
        details: errors
      }, { status: 400 });
    }

    // Prepare data for creation
    const productData = {
      ...data,
      category: categoryId,
      price: parseFloat(data.price),
      comparePrice: data.comparePrice ? parseFloat(data.comparePrice) : undefined,
      cost: data.cost ? parseFloat(data.cost) : undefined,
      quantity: data.quantity ? parseInt(data.quantity) : 0,
      lowStockThreshold: data.lowStockThreshold ? parseInt(data.lowStockThreshold) : 10,
      shippingCost: data.shippingCost ? parseFloat(data.shippingCost) : undefined,
      taxRate: data.taxRate ? parseFloat(data.taxRate) : undefined,
      weight: data.weight != null && data.weight !== '' ? String(data.weight) : undefined,
      isActive: data.isActive !== undefined ? data.isActive : true,
      isFeatured: data.isFeatured !== undefined ? data.isFeatured : false,
      tags: data.tags || [],
      seoKeywords: data.seoKeywords || [],
      variants: data.variants || []
    };

    const product = await Product.create(productData);

    return NextResponse.json({
      message: 'Product created successfully',
      product
    }, { status: 201 });

  } catch (error: any) {
    console.error('Create product error:', error);

    // Handle specific MongoDB errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
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
