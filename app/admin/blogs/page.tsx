'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import DateTimePicker from '@/components/ui/datetime-picker';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

import FileUpload from '@/components/ui/file-upload';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import RichTextEditor from '@/components/ui/rich-text-editor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { BarChart3, Calendar, Edit, Eye, FileText, Globe, Plus, Star, User } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Yup from 'yup';
import { AdminListPageSkeleton } from '@/components/admin/ui/loading';

interface Blog {
  _id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  images: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  scheduledAt?: string;
  author: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  categories: string[];
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  readTime: number;
  viewCount: number;
  likes: number;
  isActive: boolean;
  isFeatured: boolean;
  allowComments: boolean;
  comments: any[];
  createdAt: string;
  updatedAt: string;
}

interface BlogFormData {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage: string;
  images: string[];
  status: 'draft' | 'published' | 'archived';
  publishedAt: string;
  scheduledAt: string;
  categories: string[];
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  seoKeywords: string[];
  isActive: boolean;
  isFeatured: boolean;
  allowComments: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface Filters {
  categories: string[];
  authors: any[];
}

interface BlogsResponse {
  blogs: Blog[];
  pagination: Pagination;
  filters: Filters;
}

// Yup validation schema
const BlogValidationSchema = Yup.object().shape({
  title: Yup.string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title must be less than 200 characters')
    .required('Title is required'),
  slug: Yup.string()
    .min(3, 'Slug must be at least 3 characters')
    .max(200, 'Slug must be less than 200 characters')
    .matches(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Slug must be lowercase letters, numbers, and dashes only'
    )
    .required('Slug is required'),
  content: Yup.string()
    .min(50, 'Content must be at least 50 characters')
    .required('Content is required'),
  excerpt: Yup.string()
    .max(500, 'Excerpt must be less than 500 characters'),
  status: Yup.string()
    .oneOf(['draft', 'published', 'archived'], 'Invalid status')
    .required('Status is required'),
  categories: Yup.array()
    .min(1, 'At least one category is required')
    .required('Categories are required'),
  tags: Yup.array()
    .min(1, 'At least one tag is required'),
  metaTitle: Yup.string()
    .max(60, 'Meta title should be less than 60 characters for SEO'),
  metaDescription: Yup.string()
    .max(160, 'Meta description should be less than 160 characters for SEO'),
  seoKeywords: Yup.array()
    .max(10, 'Maximum 10 SEO keywords allowed'),
  publishedAt: Yup.string()
    .when('status', {
      is: 'published',
      then: (schema) => schema.required('Publish date is required when status is published'),
      otherwise: (schema) => schema
    }),
  scheduledAt: Yup.string()
    .test('future-date', 'Scheduled date must be in the future', function(value) {
      if (!value) return true;
      return new Date(value) > new Date();
    })
});

export default function BlogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  // Animation refs
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  
  // State management
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlogs, setSelectedBlogs] = useState<Blog[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showViewDialog, setShowViewDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);

  const [currentBlog, setCurrentBlog] = useState<Blog | null>(null);
  const [formData, setFormData] = useState<BlogFormData & { tagInput: string }>({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    coverImage: '',
    images: [],
    status: 'draft',
    publishedAt: '',
    scheduledAt: '',
    categories: [],
    tags: [],
    metaTitle: '',
    metaDescription: '',
    seoKeywords: [],
    isActive: true,
    isFeatured: false,
    allowComments: true,
    tagInput: '',
  });

  // Track if user has manually edited the slug
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);

  // Server-side pagination and filtering
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [availableFilters, setAvailableFilters] = useState<Filters>({
    categories: [],
    authors: [],
  });

  const [dbCategories, setDbCategories] = useState<any[]>([]);
  const statusOptions = [
    { label: 'Draft', value: 'draft' },
    { label: 'Published', value: 'published' },
    { label: 'Archived', value: 'archived' }
  ];

  // Fetch blogs with server-side pagination, search, and filters
  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sortBy: sortKey,
        sortOrder: sortDirection,
        search: searchQuery,
        ...filterValues,
      });

      const response = await fetch(`/api/admin/blogs?${params}`);
      if (!response.ok) throw new Error('Failed to fetch blogs');
      
      const data: BlogsResponse = await response.json();
      setBlogs(data.blogs);
      setPagination(data.pagination);
      setAvailableFilters(data.filters);
    } catch (error) {
      console.error('Error fetching blogs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch blogs",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, sortKey, sortDirection, searchQuery, filterValues]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBlogs();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, filterValues, sortKey, sortDirection]);

  // Immediate fetch for pagination changes
  useEffect(() => {
    fetchBlogs();
  }, [pagination.page, pagination.limit]);

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (response.ok) {
          const data = await response.json();
          setDbCategories(data.categories || []);
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchCategories();
  }, []);

  useEffect(() => {
    fetchBlogs();
    
    // Enhanced GSAP animations with staggered entrance
    const tl = gsap.timeline({ delay: 0.2 });
    
    if (headerRef.current) {
      tl.fromTo(headerRef.current, 
        { opacity: 0, y: -30, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "power2.out" }
      );
    }
    
    if (statsRef.current) {
      tl.fromTo(statsRef.current.children, 
        { opacity: 0, y: 20, scale: 0.9 },
        { opacity: 1, y: 0, scale: 1, duration: 0.6, stagger: 0.1, ease: "back.out(1.7)" },
        "-=0.4"
      );
    }
    
    if (containerRef.current) {
      tl.fromTo(containerRef.current.children, 
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, ease: "power2.out" },
        "-=0.2"
      );
    }
  }, []);

  // Form handlers
  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      coverImage: '',
      images: [],
      status: 'draft',
      publishedAt: '',
      scheduledAt: '',
      categories: [],
      tags: [],
      metaTitle: '',
      metaDescription: '',
      seoKeywords: [],
      isActive: true,
      isFeatured: false,
      allowComments: true,
      tagInput: '',
    });
    setSlugManuallyEdited(false);
  };

  const handleCreate = () => {
    resetForm();
    setCurrentBlog(null);
    setShowCreateDialog(true);
  };

  const handleEdit = (blog: Blog) => {
    setCurrentBlog(blog);
    setFormData({
      title: blog.title,
      slug: blog.slug,
      content: blog.content,
      excerpt: blog.excerpt || '',
      coverImage: blog.coverImage || '',
      images: blog.images,
      status: blog.status,
      publishedAt: blog.publishedAt || '',
      scheduledAt: blog.scheduledAt || '',
      categories: blog.categories,
      tags: blog.tags,
      metaTitle: blog.metaTitle || '',
      metaDescription: blog.metaDescription || '',
      seoKeywords: blog.seoKeywords || [],
      isActive: blog.isActive,
      isFeatured: blog.isFeatured,
      allowComments: blog.allowComments,
      tagInput: '',
    });
    setSlugManuallyEdited(true); // When editing, assume slug was manually set
    setShowEditDialog(true);
  };

  const handleView = (blog: Blog) => {
    setCurrentBlog(blog);
    setShowViewDialog(true);
  };

  const handleDelete = (blog: Blog) => {
    setCurrentBlog(blog);
    setShowDeleteDialog(true);
  };

  // Auto-generate slug from title
  const generateSlug = (title: string): string => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: prev.slug || generateSlug(title)
    }));
  };

  // CRUD operations with Formik
  const saveBlog = async (values: BlogFormData, { setSubmitting, setFieldError }: any) => {
    try {


      if (status === 'loading') {
        toast({
          title: "Loading...",
          description: "Please wait while we verify your authentication",
          variant: "default",
        });
        setSubmitting(false);
        return;
      }

      if (status === 'unauthenticated' || !session?.user) {
        toast({
          title: "Authentication Error",
          description: "You must be logged in to perform this action",
          variant: "error",
        });
        setSubmitting(false);
        return;
      }

      const url = currentBlog ? `/api/admin/blogs/${currentBlog._id}` : '/api/admin/blogs';
      const method = currentBlog ? 'PUT' : 'POST';

      // Add author information to the payload
      const payload = {
        ...values,
        author: session.user.id,
      };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save blog');
      }

      const savedBlog = await response.json();
      toast({
        title: "Success",
        description: `Blog ${currentBlog ? 'updated' : 'created'} successfully!`,
        variant: "success",
      });

      // Update the blogs list with the new/updated blog data (including populated author)
      if (!currentBlog) {
        // For new blogs, add the returned blog with populated author to the list
        setBlogs(prev => [savedBlog, ...prev]);
        setPagination(prev => ({ ...prev, total: prev.total + 1 }));
      } else {
        // For updated blogs, update the existing blog in the list
        setBlogs(prev => prev.map(blog => 
          blog._id === currentBlog._id ? savedBlog : blog
        ));
        
        // Update currentBlog state if it's the same blog being viewed/edited
        if (currentBlog._id === savedBlog._id) {
          setCurrentBlog(savedBlog);
        }
      }

      setShowCreateDialog(false);
      setShowEditDialog(false);
      resetForm();
    } catch (error) {
      console.error('Error saving blog:', error);
      if (error instanceof Error && error.message.includes('Slug already exists')) {
        setFieldError('slug', 'This slug is already taken');
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : 'Failed to save blog',
          variant: "error",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const deleteBlog = async () => {
    if (!currentBlog) return;

    try {
      const response = await fetch(`/api/admin/blogs/${currentBlog._id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete blog');

      toast({
        title: "Success",
        description: "Blog deleted successfully!",
        variant: "success",
      });
      setShowDeleteDialog(false);
      fetchBlogs();
    } catch (error) {
      console.error('Error deleting blog:', error);
      toast({
        title: "Error",
        description: "Failed to delete blog",
        variant: "error",
      });
    }
  };

  // Bulk operations
  const handleBulkAction = async (action: string, blogs: Blog[]) => {
    // Show confirmation for delete action
    if (action === 'delete') {
      setShowBulkDeleteDialog(true);
      return;
    }

    try {
      const ids = blogs.map(blog => blog._id);
      let url = '/api/admin/blogs';
      let method = 'PATCH';
      let body: any = { ids, action };

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(`Failed to ${action} blogs`);

      const result = await response.json();
      toast({
        title: "Success",
        description: result.message,
        variant: "success",
      });
      fetchBlogs();
      setSelectedBlogs([]);
    } catch (error) {
      console.error(`Error ${action} blogs:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} blogs`,
        variant: "error",
      });
    }
  };

  // Handle bulk delete confirmation
  const handleBulkDeleteConfirm = async () => {
    try {
      const ids = selectedBlogs.map(blog => blog._id);
      const response = await fetch('/api/admin/blogs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });

      if (!response.ok) throw new Error('Failed to delete blogs');

      const result = await response.json();
      toast({
        title: "Success",
        description: result.message,
        variant: "success",
      });
      fetchBlogs();
      setSelectedBlogs([]);
      setShowBulkDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting blogs:', error);
      toast({
        title: "Error",
        description: "Failed to delete blogs",
        variant: "error",
      });
      setShowBulkDeleteDialog(false);
    }
  };

  // Export/Import handlers
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        format: 'csv',
        ...filterValues,
      });

      const response = await fetch(`/api/admin/blogs/export?${params}`);
      if (!response.ok) throw new Error('Failed to export blogs');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `blogs-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Blogs exported successfully!",
        variant: "success",
      });
    } catch (error) {
      console.error('Error exporting blogs:', error);
      toast({
        title: "Error",
        description: "Failed to export blogs",
        variant: "error",
      });
    }
  };

  // Table columns configuration
  const columns = [
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: (value: string, row: Blog) => (
        <div className="max-w-xs">
          <div className="font-medium truncate">{value}</div>
          <div className="text-sm text-subtle-foreground truncate">{row.slug}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string, row: Blog) => (
        <div className="space-y-1">
          <Badge 
            variant={
              value === 'published' ? 'default' : 
              value === 'draft' ? 'secondary' : 'outline'
            }
          >
            {value}
          </Badge>
          {!row.isActive && (
            <Badge variant="destructive" className="block">Inactive</Badge>
          )}
          {row.isFeatured && (
            <Badge variant="default" className="block">Featured</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      render: (value: any) => (
        <div>
          <div className="font-medium">{value?.firstName} {value?.lastName}</div>
          <div className="text-sm text-subtle-foreground">{value?.email}</div>
        </div>
      ),
    },
    {
      key: 'categories',
      label: 'Categories',
      render: (value: string[]) => (
        <div className="space-y-1">
          {value.slice(0, 2).map((category, index) => (
            <Badge key={index} variant="outline" className="block w-fit">
              {category}
            </Badge>
          ))}
          {value.length > 2 && (
            <span className="text-sm text-subtle-foreground">+{value.length - 2} more</span>
          )}
        </div>
      ),
    },
    {
      key: 'stats',
      label: 'Stats',
      render: (value: any, row: Blog) => (
        <div className="text-sm space-y-1">
          <div className="flex items-center space-x-2">
            <Eye size={14} />
            <span>{row.viewCount}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Star size={14} />
            <span>{row.likes}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar size={14} />
            <span>{row.readTime}m read</span>
          </div>
        </div>
      ),
    },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      render: (value: string) => value ? new Date(value).toLocaleDateString() : '-',
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // Table filters configuration
  const filters = [
    {
      key: 'status',
      label: 'Status',
      options: statusOptions,
    },
    {
      key: 'category',
      label: 'Category',
      options: availableFilters.categories.map(cat => ({ label: cat, value: cat })),
    },
    {
      key: 'author',
      label: 'Author',
      options: availableFilters.authors.map(author => ({
        label: `${author.firstName} ${author.lastName}`,
        value: author._id,
      })),
    },
    {
      type: 'boolean' as const,
      key: 'isActive',
      label: 'Active Status',
      trueLabel: 'Active',
      falseLabel: 'Inactive',
    },
    {
      type: 'boolean' as const,
      key: 'isFeatured',
      label: 'Featured',
      trueLabel: 'Featured',
      falseLabel: 'Not Featured',
    },
  ];

  // Bulk actions configuration
  const bulkActions = [
    {
      label: 'Publish',
      action: (blogs: Blog[]) => handleBulkAction('publish', blogs),
    },
    {
      label: 'Draft',
      action: (blogs: Blog[]) => handleBulkAction('draft', blogs),
    },
    {
      label: 'Archive',
      action: (blogs: Blog[]) => handleBulkAction('archive', blogs),
    },
    {
      label: 'Activate',
      action: (blogs: Blog[]) => handleBulkAction('activate', blogs),
    },
    {
      label: 'Deactivate',
      action: (blogs: Blog[]) => handleBulkAction('deactivate', blogs),
    },
    {
      label: 'Feature',
      action: (blogs: Blog[]) => handleBulkAction('feature', blogs),
    },
    {
      label: 'Unfeature',
      action: (blogs: Blog[]) => handleBulkAction('unfeature', blogs),
    },
    {
      label: 'Delete',
      action: (blogs: Blog[]) => handleBulkAction('delete', blogs),
      variant: 'destructive' as const,
    },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <AdminListPageSkeleton rows={6} columns={5} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-secondary-50/30">
        <div 
          ref={containerRef} 
          className="space-y-8 p-4 sm:p-6 lg:p-8"
        >
          {/* Stunning Header Section */}
          <motion.div 
            ref={headerRef}
            className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 rounded-3xl shadow-2xl border border-primary-200/20"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Animated background elements */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-white/10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48 animate-pulse"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-32 -translate-x-32 animate-pulse"></div>
            
            {/* Header Content */}
            <div className="relative p-6 sm:p-8 lg:p-12">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-card/10 backdrop-blur-sm rounded-2xl border border-white/20">
                      <FileText className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-3xl lg:text-4xl font-bold text-white">
                        Blog Management
                      </h1>
                      <p className="text-white/80 text-lg">
                        Manage your blog content, categories, and publishing workflow
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      onClick={handleCreate}
                      className="bg-card/10 backdrop-blur-sm border border-white/20 text-white hover:bg-card/20 transition-all duration-300 px-6 py-3 rounded-xl font-semibold"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Create Blog
                    </Button>
                  </motion.div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Enhanced Stats Cards */}
          <motion.div 
            ref={statsRef}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
          >
            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Blogs</p>
                      <p className="text-3xl font-bold text-foreground">{pagination.total}</p>
                    </div>
                    <div className="p-3 bg-info-100 rounded-full">
                      <FileText className="w-6 h-6 text-info-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Published</p>
                      <p className="text-3xl font-bold text-foreground">
                        {blogs.filter(blog => blog.status === 'published').length}
                      </p>
                    </div>
                    <div className="p-3 bg-success-100 rounded-full">
                      <Globe className="w-6 h-6 text-success-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Drafts</p>
                      <p className="text-3xl font-bold text-foreground">
                        {blogs.filter(blog => blog.status === 'draft').length}
                      </p>
                    </div>
                    <div className="p-3 bg-warning-100 rounded-full">
                      <Edit className="w-6 h-6 text-warning-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              whileHover={{ y: -8, scale: 1.02 }}
              transition={{ duration: 0.3 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Views</p>
                      <p className="text-3xl font-bold text-foreground">
                        {blogs.reduce((total, blog) => total + blog.viewCount, 0)}
                      </p>
                    </div>
                    <div className="p-3 bg-primary-100 rounded-full">
                      <BarChart3 className="w-6 h-6 text-primary-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Enhanced Data Table */}
          <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-foreground">Blog Database</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DataTable
                data={blogs}
                columns={columns}
                selectable
                searchable
                filterable
                exportable
                onSelectionChange={setSelectedBlogs}
                bulkActions={bulkActions}
                filters={filters}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                serverPagination={{
                  page: pagination.page,
                  pageSize: pagination.limit,
                  total: pagination.total,
                  onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
                  onPageSizeChange: (limit) => setPagination(prev => ({ ...prev, limit, page: 1 })),
                }}
                serverSort={{
                  sortKey,
                  sortDirection,
                  onChange: (key, direction) => {
                    setSortKey(key || 'createdAt');
                    setSortDirection(direction || 'desc');
                  },
                }}
                serverSearch={{
                  value: searchQuery,
                  onChange: setSearchQuery,
                }}
                serverFilters={{
                  values: filterValues,
                  onChange: setFilterValues,
                }}
              />
            </CardContent>
          </Card>

          {/* Create/Edit Blog Dialog */}
          <Dialog open={showCreateDialog || showEditDialog} onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setShowEditDialog(false);
              resetForm();
            }
          }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
            <DialogHeader>
              <DialogTitle>
                {currentBlog ? 'Edit Blog' : 'Create New Blog'}
              </DialogTitle>
            </DialogHeader>

            <Formik
              initialValues={formData}
              validationSchema={BlogValidationSchema}
              enableReinitialize={true}
              onSubmit={saveBlog}
            >
              {({ values, setFieldValue, errors, touched, isSubmitting, handleChange, handleBlur }) => (
                <Form className="space-y-6">
                  <Tabs defaultValue="content" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="media">Media</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="title">Title</Label>
                    <Field
                      as={Input}
                      id="title"
                      name="title"
                      placeholder="Enter blog title"
                      className={errors.title && touched.title ? 'border-destructive-500' : ''}
                      onChange={(e: any) => {
                        handleChange(e);
                        // Auto-generate slug from title if not manually edited
                        if (!slugManuallyEdited) {
                          setFieldValue('slug', generateSlug(e.target.value));
                        }
                      }}
                    />
                    <ErrorMessage name="title" component="div" className="text-destructive-500 text-sm mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="slug">Slug</Label>
                    <Field
                      as={Input}
                      id="slug"
                      name="slug"
                      placeholder="blog-url-slug"
                      className={errors.slug && touched.slug ? 'border-destructive-500' : ''}
                      onChange={(e: any) => {
                        handleChange(e);
                        // Mark as manually edited when user types in slug field
                        if (!slugManuallyEdited && e.target.value !== generateSlug(values.title)) {
                          setSlugManuallyEdited(true);
                        }
                      }}
                    />
                    <ErrorMessage name="slug" component="div" className="text-destructive-500 text-sm mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="excerpt">Excerpt</Label>
                  <Field
                    as={Textarea}
                    id="excerpt"
                    name="excerpt"
                    placeholder="Brief description of the blog post..."
                    rows={3}
                    className={errors.excerpt && touched.excerpt ? 'border-destructive-500' : ''}
                  />
                  <ErrorMessage name="excerpt" component="div" className="text-destructive-500 text-sm mt-1" />
                </div>

                <div>
                  <Label htmlFor="content">Content</Label>
                  <RichTextEditor
                    value={values.content}
                    onChange={(content: string) => setFieldValue('content', content)}
                    placeholder="Write your blog content here..."
                  />
                  <ErrorMessage name="content" component="div" className="text-destructive-500 text-sm mt-1" />
                </div>
              </TabsContent>

              <TabsContent value="media" className="space-y-4">
                <div>
                  <Label>Cover Image</Label>
                  <FileUpload
                    onUpload={(url: string) => setFieldValue('coverImage', url)}
                    accept="image/*"
                    multiple={false}
                  />
                  {values.coverImage && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Current Cover Image:</p>
                      <div className="relative inline-block">
                        <img 
                          src={values.coverImage} 
                          alt="Cover preview" 
                          className="w-32 h-32 object-cover rounded-lg border-2 border-border"
                        />
                        <button
                          type="button"
                          onClick={() => setFieldValue('coverImage', '')}
                          className="absolute -top-2 -right-2 bg-destructive-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-destructive-600"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <Label>Additional Images</Label>
                  <FileUpload
                    onUploadMultiple={(urls: string[]) => setFieldValue('images', [...values.images, ...urls])}
                    accept="image/*"
                    multiple={true}
                  />
                  {values.images.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Additional Images ({values.images.length}):</p>
                      <div className="grid grid-cols-3 gap-4">
                        {values.images.map((image, index) => (
                          <div key={index} className="relative">
                            <img 
                              src={image} 
                              alt={`Additional image ${index + 1}`} 
                              className="w-full h-24 object-cover rounded-lg border-2 border-border"
                            />
                            <button
                              type="button"
                              onClick={() => setFieldValue('images', values.images.filter((_, i) => i !== index))}
                              className="absolute -top-2 -right-2 bg-destructive-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-destructive-600"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={values.status}
                      onValueChange={(value: 'draft' | 'published' | 'archived') => 
                        setFieldValue('status', value)
                      }
                    >
                      <SelectTrigger className={errors.status && touched.status ? 'border-destructive-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrorMessage name="status" component="div" className="text-destructive-500 text-sm mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="categories">Categories</Label>
                    <Select
                      value={values.categories[0] || ''}
                      onValueChange={(value) => 
                        setFieldValue('categories', value ? [value] : [])
                      }
                    >
                      <SelectTrigger className={errors.categories && touched.categories ? 'border-destructive-500' : ''}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {dbCategories.map(category => (
                          <SelectItem key={category._id} value={category.name}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <ErrorMessage name="categories" component="div" className="text-destructive-500 text-sm mt-1" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="tags">Tags</Label>
                  <div className="space-y-2">
                    {/* Display existing tags as chips */}
                    {values.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {values.tags.map((tag, index) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="flex items-center gap-1 pr-1"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => {
                                const newTags = values.tags.filter((_, i) => i !== index);
                                setFieldValue('tags', newTags);
                              }}
                              className="ml-1 text-subtle-foreground hover:text-foreground"
                            >
                              ×
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Input for new tags */}
                    <Field
                      as={Input}
                      id="tags"
                      name="tagInput"
                      placeholder="Type a tag and press Enter or comma"
                      className={errors.tags && touched.tags ? 'border-destructive-500' : ''}
                      onKeyDown={(e: any) => {
                        if (e.key === 'Enter' || e.key === ',') {
                          e.preventDefault();
                          const newTag = e.target.value.trim();
                          if (newTag && !values.tags.includes(newTag)) {
                            setFieldValue('tags', [...values.tags, newTag]);
                            setFieldValue('tagInput', '');
                          } else if (values.tags.includes(newTag)) {
                            setFieldValue('tagInput', '');
                          }
                        }
                      }}
                    />
                  </div>
                  <ErrorMessage name="tags" component="div" className="text-destructive-500 text-sm mt-1" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="publishedAt">Publish Date</Label>
                    <DateTimePicker
                      selected={values.publishedAt ? new Date(values.publishedAt) : null}
                      onChange={(date) => setFieldValue('publishedAt', date ? date.toISOString() : '')}
                      placeholder="Select publish date"
                      showTimeSelect={true}
                      error={!!(errors.publishedAt && touched.publishedAt)}
                    />
                    <ErrorMessage name="publishedAt" component="div" className="text-destructive-500 text-sm mt-1" />
                    <p className="text-xs text-subtle-foreground mt-1">
                      {values.publishedAt && `Will publish: ${format(new Date(values.publishedAt), 'PPP at pp')}`}
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="scheduledAt">Schedule Date</Label>
                    <DateTimePicker
                      selected={values.scheduledAt ? new Date(values.scheduledAt) : null}
                      onChange={(date) => setFieldValue('scheduledAt', date ? date.toISOString() : '')}
                      placeholder="Select schedule date"
                      showTimeSelect={true}
                      minDate={new Date()}
                      error={!!(errors.scheduledAt && touched.scheduledAt)}
                    />
                    <ErrorMessage name="scheduledAt" component="div" className="text-destructive-500 text-sm mt-1" />
                    <p className="text-xs text-subtle-foreground mt-1">
                      {values.scheduledAt && `Scheduled for: ${format(new Date(values.scheduledAt), 'PPP at pp')}`}
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="isActive"
                      checked={values.isActive}
                      onCheckedChange={(checked) => setFieldValue('isActive', checked)}
                    />
                    <Label htmlFor="isActive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Active
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="isFeatured"
                      checked={values.isFeatured}
                      onCheckedChange={(checked) => setFieldValue('isFeatured', checked)}
                    />
                    <Label htmlFor="isFeatured" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Featured
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id="allowComments"
                      checked={values.allowComments}
                      onCheckedChange={(checked) => setFieldValue('allowComments', checked)}
                    />
                    <Label htmlFor="allowComments" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      Allow Comments
                    </Label>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4">
                <div>
                  <Label htmlFor="metaTitle">Meta Title</Label>
                  <Field
                    as={Input}
                    id="metaTitle"
                    name="metaTitle"
                    placeholder="SEO title for search engines"
                    className={errors.metaTitle && touched.metaTitle ? 'border-destructive-500' : ''}
                  />
                  <ErrorMessage name="metaTitle" component="div" className="text-destructive-500 text-sm mt-1" />
                  <p className="text-xs text-subtle-foreground mt-1">
                    {values.metaTitle.length}/60 characters (recommended for SEO)
                  </p>
                </div>

                <div>
                  <Label htmlFor="metaDescription">Meta Description</Label>
                  <Field
                    as={Textarea}
                    id="metaDescription"
                    name="metaDescription"
                    placeholder="SEO description for search engines"
                    rows={3}
                    className={errors.metaDescription && touched.metaDescription ? 'border-destructive-500' : ''}
                  />
                  <ErrorMessage name="metaDescription" component="div" className="text-destructive-500 text-sm mt-1" />
                  <p className="text-xs text-subtle-foreground mt-1">
                    {values.metaDescription.length}/160 characters (recommended for SEO)
                  </p>
                </div>

                <div>
                  <Label htmlFor="seoKeywords">SEO Keywords (comma-separated)</Label>
                  <Field
                    as={Input}
                    id="seoKeywords"
                    name="seoKeywords"
                    value={values.seoKeywords.join(', ')}
                    onChange={(e: any) => setFieldValue('seoKeywords', e.target.value.split(',').map((keyword: string) => keyword.trim()).filter(Boolean))}
                    placeholder="keyword1, keyword2, keyword3"
                    className={errors.seoKeywords && touched.seoKeywords ? 'border-destructive-500' : ''}
                  />
                  <ErrorMessage name="seoKeywords" component="div" className="text-destructive-500 text-sm mt-1" />
                  <p className="text-xs text-subtle-foreground mt-1">
                    {values.seoKeywords.length}/10 keywords (recommended maximum)
                  </p>
                </div>
              </TabsContent>
            </Tabs>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCreateDialog(false);
                        setShowEditDialog(false);
                        resetForm();
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Saving...' : (currentBlog ? 'Update Blog' : 'Create Blog')}
                    </Button>
                  </div>
                </Form>
              )}
            </Formik>
          </DialogContent>
          </Dialog>

          {/* View Blog Dialog */}
          <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
            <DialogHeader>
              <DialogTitle>Blog Preview</DialogTitle>
            </DialogHeader>
            
            {currentBlog && (
              <div className="space-y-6">
                {/* Blog Header */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Badge 
                      variant={
                        currentBlog.status === 'published' ? 'default' : 
                        currentBlog.status === 'draft' ? 'secondary' : 'outline'
                      }
                    >
                      {currentBlog.status}
                    </Badge>
                    <div className="flex space-x-2">
                      {currentBlog.isFeatured && (
                        <Badge variant="default">Featured</Badge>
                      )}
                      {!currentBlog.isActive && (
                        <Badge variant="destructive">Inactive</Badge>
                      )}
                    </div>
                  </div>
                  
                  <h1 className="text-3xl font-bold">{currentBlog.title}</h1>
                  
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <User size={16} />
                      <span>{currentBlog.author.firstName} {currentBlog.author.lastName}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>
                        {currentBlog.publishedAt 
                          ? new Date(currentBlog.publishedAt).toLocaleDateString()
                          : 'Not published'
                        }
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Eye size={16} />
                      <span>{currentBlog.viewCount} views</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Star size={16} />
                      <span>{currentBlog.likes} likes</span>
                    </div>
                  </div>

                  {currentBlog.excerpt && (
                    <p className="text-lg text-muted-foreground italic">{currentBlog.excerpt}</p>
                  )}
                </div>

                {/* Cover Image */}
                {currentBlog.coverImage && (
                  <div>
                    <img 
                      src={currentBlog.coverImage} 
                      alt={currentBlog.title}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                )}

                {/* Categories and Tags */}
                <div className="space-y-2">
                  {currentBlog.categories.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground mr-2">Categories:</span>
                      {currentBlog.categories.map((category, index) => (
                        <Badge key={index} variant="outline" className="mr-1">
                          {category}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  {currentBlog.tags.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-muted-foreground mr-2">Tags:</span>
                      {currentBlog.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="mr-1">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: currentBlog.content }}
                />

                {/* Additional Images */}
                {currentBlog.images.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Additional Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {currentBlog.images.map((image, index) => (
                        <img 
                          key={index}
                          src={image} 
                          alt={`${currentBlog.title} - Image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* SEO Information */}
                {(currentBlog.metaTitle || currentBlog.metaDescription || (currentBlog.seoKeywords && currentBlog.seoKeywords.length > 0)) && (
                  <div className="bg-muted p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-2">SEO Information</h3>
                    {currentBlog.metaTitle && (
                      <p><strong>Meta Title:</strong> {currentBlog.metaTitle}</p>
                    )}
                    {currentBlog.metaDescription && (
                      <p><strong>Meta Description:</strong> {currentBlog.metaDescription}</p>
                    )}
                    {currentBlog.seoKeywords && currentBlog.seoKeywords.length > 0 && (
                      <p><strong>Keywords:</strong> {currentBlog.seoKeywords.join(', ')}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
          </Dialog>

          {/* Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onConfirm={deleteBlog}
          title="Delete Blog"
          description={`Are you sure you want to delete "${currentBlog?.title}"? This action cannot be undone.`}
          entityName="blog"
          />

          {/* Bulk Delete Confirmation Dialog */}
          <DeleteConfirmationDialog
          open={showBulkDeleteDialog}
          onOpenChange={setShowBulkDeleteDialog}
          onConfirm={handleBulkDeleteConfirm}
          title="Delete Multiple Blogs"
          description={`Are you sure you want to delete ${selectedBlogs.length} blog(s)? This action cannot be undone.`}
          entityName="blogs"
          />
        </div>
      </div>
    </AdminLayout>
  );
}
