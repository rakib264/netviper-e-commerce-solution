import mongoose, { Document, Schema } from 'mongoose';

export interface IBlog extends Document {
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  images: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  scheduledAt?: Date;
  author: mongoose.Types.ObjectId;
  categories: string[];
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  readTime?: number;
  viewCount: number;
  likes: number;
  isActive: boolean;
  isFeatured: boolean;
  allowComments: boolean;
  comments: {
    user: mongoose.Types.ObjectId;
    comment: string;
    isApproved: boolean;
    createdAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const BlogSchema = new Schema<IBlog>({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  content: { type: String, required: true },
  excerpt: { type: String },
  coverImage: { type: String },
  images: [{ type: String }],
  status: { 
    type: String, 
    enum: ['draft', 'published', 'archived'], 
    default: 'draft' 
  },
  publishedAt: { type: Date },
  scheduledAt: { type: Date },
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  categories: [{ type: String }],
  tags: [{ type: String }],
  metaTitle: { type: String },
  metaDescription: { type: String },
  seoKeywords: [{ type: String }],
  readTime: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },
  likes: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  allowComments: { type: Boolean, default: true },
  comments: [{
    user: { type: Schema.Types.ObjectId, ref: 'User' },
    comment: String,
    isApproved: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

// Create index for search and performance
BlogSchema.index({ title: 'text', content: 'text', excerpt: 'text' });
BlogSchema.index({ status: 1, publishedAt: -1 });
BlogSchema.index({ author: 1 });
BlogSchema.index({ categories: 1 });
BlogSchema.index({ tags: 1 });

// Auto-generate slug from title if not provided
BlogSchema.pre('save', function(next) {
  if (!this.slug && this.title) {
    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
  
  // Calculate read time based on content (average 200 words per minute)
  if (this.content) {
    const wordCount = this.content.split(/\s+/).length;
    this.readTime = Math.ceil(wordCount / 200);
  }
  
  // Set published date when status changes to published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  
  next();
});

export default mongoose.models.Blog || mongoose.model<IBlog>('Blog', BlogSchema);

