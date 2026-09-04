'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ImageUploader } from '@/components/ui/image-uploader';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useFormik } from 'formik';
import { motion } from 'framer-motion';
import {
  Edit,
  Eye,
  Facebook,
  Instagram,
  MessageCircle,
  Plus,
  Search,
  Star,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import * as Yup from 'yup';
import { Loader } from '@/components/ui/loader';

interface CustomerFeedback {
  _id: string;
  platform: string;
  platformName: string;
  customer: {
    name: string; // Can be Bengali or English
    avatar: string;
    location: string;
    verified: boolean;
  };
  message: string; // Can be Bengali or English
  rating: number;
  productImage?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  platform: string;
  platformName: string;
  customerName: string;
  customerAvatar: string;
  customerLocation: string;
  customerVerified: boolean;
  message: string;
  rating: number;
  productImage: string;
  isActive: boolean;
}

const platformOptions = [
  { value: 'facebook', label: 'Facebook', icon: Facebook, color: 'bg-info-600' },
  { value: 'messenger', label: 'Messenger', icon: MessageCircle, color: 'bg-info-500' },
  { value: 'instagram', label: 'Instagram', icon: Instagram, color: 'bg-gradient-to-r from-primary-500 to-secondary-500' },
  { value: 'whatsapp', label: 'WhatsApp', icon: MessageCircle, color: 'bg-success-500' },
  { value: 'email', label: 'Email', icon: MessageCircle, color: 'bg-foreground' },
];

// Validation Schema
const validationSchema = Yup.object({
  platform: Yup.string()
    .required('Platform is required')
    .oneOf(['facebook', 'messenger', 'instagram', 'whatsapp', 'email'], 'Invalid platform'),
  platformName: Yup.string().required('Platform name is required'),
  customerName: Yup.string()
    .required('Customer name is required')
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name must not exceed 100 characters'),
  customerAvatar: Yup.string()
    .required('Customer avatar is required')
    .url('Must be a valid image URL'),
  customerLocation: Yup.string()
    .required('Customer location is required')
    .min(2, 'Location must be at least 2 characters')
    .max(100, 'Location must not exceed 100 characters'),
  customerVerified: Yup.boolean(),
  message: Yup.string()
    .required('Message is required')
    .min(10, 'Message must be at least 10 characters')
    .max(500, 'Message must not exceed 500 characters'),
  rating: Yup.number()
    .required('Rating is required')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5')
    .integer('Rating must be a whole number'),
  productImage: Yup.string()
    .test('is-url-or-empty', 'Must be a valid image URL', function(value) {
      if (!value || value.trim() === '') return true; // Allow empty
      const urlRegex = /^https?:\/\/.+/i;
      const imageRegex = /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;
      return urlRegex.test(value) && imageRegex.test(value);
    })
    .nullable(),
  isActive: Yup.boolean(),
});

export default function CustomerFeedbackPage() {
  const { toast } = useToast();
  const [feedbacks, setFeedbacks] = useState<CustomerFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingFeedback, setViewingFeedback] = useState<CustomerFeedback | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Formik form handling
  const formik = useFormik<FormData>({
    initialValues: {
      platform: 'facebook',
      platformName: 'Facebook',
      customerName: '',
      customerAvatar: '',
      customerLocation: '',
      customerVerified: false,
      message: '',
      rating: 5,
      productImage: '',
      isActive: true,
    },
    validationSchema: validationSchema,
    onSubmit: async (values) => {
      setSubmitting(true);

      try {
        const payload = {
          platform: values.platform,
          platformName: values.platformName,
          customer: {
            name: values.customerName,
            avatar: values.customerAvatar,
            location: values.customerLocation,
            verified: values.customerVerified,
          },
          message: values.message,
          rating: values.rating,
          productImage: values.productImage,
          isActive: values.isActive,
        };

        const url = editingId
          ? `/api/admin/customer-feedback/${editingId}`
          : '/api/admin/customer-feedback';
        const method = editingId ? 'PUT' : 'POST';

        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (response.ok) {
          toast({
            title: 'Success',
            description: data.message || `Feedback ${editingId ? 'updated' : 'created'} successfully`,
          });
          setIsDialogOpen(false);
          formik.resetForm();
          setEditingId(null);
          fetchFeedbacks();
        } else {
          toast({
            title: 'Error',
            description: data.error || 'Failed to save feedback',
            variant: 'error',
          });
        }
      } catch (error) {
        console.error('Error saving feedback:', error);
        toast({
          title: 'Error',
          description: 'Failed to save feedback',
          variant: 'error',
        });
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    fetchFeedbacks();
  }, [page, platformFilter, statusFilter, searchQuery]);

  const fetchFeedbacks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      
      if (platformFilter !== 'all') params.append('platform', platformFilter);
      if (statusFilter !== 'all') params.append('isActive', statusFilter);
      if (searchQuery) params.append('search', searchQuery);

      const response = await fetch(`/api/admin/customer-feedback?${params}`);
      const data = await response.json();

      if (response.ok) {
        setFeedbacks(data.feedbacks);
        setTotalPages(data.pagination.pages);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fetch feedback',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Error fetching feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch feedback',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feedback: CustomerFeedback) => {
    setEditingId(feedback._id);
    formik.setValues({
      platform: feedback.platform,
      platformName: feedback.platformName,
      customerName: feedback.customer.name,
      customerAvatar: feedback.customer.avatar,
      customerLocation: feedback.customer.location,
      customerVerified: feedback.customer.verified,
      message: feedback.message,
      rating: feedback.rating,
      productImage: feedback.productImage || '',
      isActive: feedback.isActive,
    });
    setIsDialogOpen(true);
  };

  const handleView = (feedback: CustomerFeedback) => {
    setViewingFeedback(feedback);
    setIsViewDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/customer-feedback/${deletingId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Feedback deleted successfully',
        });
        setIsDeleteDialogOpen(false);
        setDeletingId(null);
        fetchFeedbacks();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete feedback',
          variant: 'error',
        });
      }
    } catch (error) {
      console.error('Error deleting feedback:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete feedback',
        variant: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    formik.resetForm();
  };

  const getPlatformIcon = (platform: string) => {
    const platformOption = platformOptions.find(p => p.value === platform);
    return platformOption ? platformOption.icon : MessageCircle;
  };

  const getPlatformColor = (platform: string) => {
    const platformOption = platformOptions.find(p => p.value === platform);
    return platformOption ? platformOption.color : 'bg-foreground';
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Customer Feedback Management</h1>
          <p className="text-muted-foreground">Manage customer reviews and testimonials from social media</p>
        </div>

      {/* Filters and Search */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-subtle-foreground" />
                <Input
                  placeholder="Search by name or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <Label>Platform</Label>
              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Platforms</SelectItem>
                  {platformOptions.map((platform) => (
                    <SelectItem key={platform.value} value={platform.value}>
                      {platform.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => setIsDialogOpen(true)} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Feedback
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader size="lg" label={null} className="text-primary-500" />
        </div>
      ) : feedbacks.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-subtle-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 text-subtle-foreground" />
              <p className="text-lg font-medium mb-2">No feedback found</p>
              <p className="text-sm">Add your first customer feedback to get started</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedbacks.map((feedback, index) => {
            const PlatformIcon = getPlatformIcon(feedback.platform);
            return (
              <motion.div
                key={feedback._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow">
                  <CardContent className="p-0">
                    {/* Platform Header */}
                    <div className={`${getPlatformColor(feedback.platform)} px-4 py-3 flex items-center justify-between`}>
                      <div className="flex items-center gap-2">
                        <PlatformIcon className="h-5 w-5 text-white" />
                        <span className="text-white font-semibold text-sm">{feedback.platformName}</span>
                      </div>
                      <Badge variant={feedback.isActive ? 'default' : 'secondary'}>
                        {feedback.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>

                    {/* Customer Info */}
                    <div className="p-4 border-b">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Image
                            src={feedback.customer.avatar}
                            alt={feedback.customer.name}
                            width={48}
                            height={48}
                            className="rounded-full object-cover"
                          />
                          {feedback.customer.verified && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-info-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{feedback.customer.name}</p>
                          <p className="text-xs text-subtle-foreground truncate">{feedback.customer.location}</p>
                        </div>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="p-4 border-b">
                      <p className="text-sm text-foreground line-clamp-3 mb-2">{feedback.message}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-warning-50 px-2 py-1 rounded-full">
                          {[...Array(feedback.rating)].map((_, i) => (
                            <Star key={i} className="h-3 w-3 text-warning-400 fill-current" />
                          ))}
                          <span className="text-xs font-semibold text-muted-foreground ml-1">{feedback.rating}.0</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="p-4 flex items-center justify-end">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleView(feedback)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleEdit(feedback)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setDeletingId(feedback._id);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive-500" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} Customer Feedback</DialogTitle>
            <DialogDescription>
              {editingId ? 'Update' : 'Create'} customer feedback from social media
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={formik.handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Platform */}
              <div>
                <Label>Platform *</Label>
                <Select
                  value={formik.values.platform}
                  onValueChange={(value) => {
                    const platform = platformOptions.find(p => p.value === value);
                    formik.setFieldValue('platform', value);
                    formik.setFieldValue('platformName', platform?.label || value);
                  }}
                >
                  <SelectTrigger className={formik.touched.platform && formik.errors.platform ? 'border-destructive-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {platformOptions.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formik.touched.platform && formik.errors.platform && (
                  <p className="text-xs text-destructive-500 mt-1">{formik.errors.platform}</p>
                )}
              </div>

              {/* Rating */}
              <div>
                <Label>Rating *</Label>
                <Select
                  value={formik.values.rating.toString()}
                  onValueChange={(value) => formik.setFieldValue('rating', parseInt(value))}
                >
                  <SelectTrigger className={formik.touched.rating && formik.errors.rating ? 'border-destructive-500' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 4, 3, 2, 1].map((rating) => (
                      <SelectItem key={rating} value={rating.toString()}>
                        {rating} Stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formik.touched.rating && formik.errors.rating && (
                  <p className="text-xs text-destructive-500 mt-1">{formik.errors.rating}</p>
                )}
              </div>

              {/* Customer Name */}
              <div>
                <Label>Customer Name *</Label>
                <Input
                  name="customerName"
                  value={formik.values.customerName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Can be in Bengali or English"
                  className={formik.touched.customerName && formik.errors.customerName ? 'border-destructive-500' : ''}
                />
                {formik.touched.customerName && formik.errors.customerName && (
                  <p className="text-xs text-destructive-500 mt-1">{formik.errors.customerName}</p>
                )}
              </div>

              {/* Customer Location */}
              <div>
                <Label>Customer Location *</Label>
                <Input
                  name="customerLocation"
                  value={formik.values.customerLocation}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  placeholder="Dhaka, Bangladesh"
                  className={formik.touched.customerLocation && formik.errors.customerLocation ? 'border-destructive-500' : ''}
                />
                {formik.touched.customerLocation && formik.errors.customerLocation && (
                  <p className="text-xs text-destructive-500 mt-1">{formik.errors.customerLocation}</p>
                )}
              </div>

              {/* Verified */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="verified"
                  checked={formik.values.customerVerified}
                  onCheckedChange={(checked) => formik.setFieldValue('customerVerified', checked)}
                />
                <Label htmlFor="verified">Verified Customer</Label>
              </div>

              {/* Active */}
              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formik.values.isActive}
                  onCheckedChange={(checked) => formik.setFieldValue('isActive', checked)}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            {/* Customer Avatar */}
            <div className="mt-4">
              <ImageUploader
                label="Customer Avatar *"
                description="Upload customer profile picture"
                value={formik.values.customerAvatar}
                onChange={(url) => formik.setFieldValue('customerAvatar', url)}
                maxSize={2}
                dimensions="150x150px"
              />
              {formik.touched.customerAvatar && formik.errors.customerAvatar && (
                <p className="text-xs text-destructive-500 mt-1">{formik.errors.customerAvatar}</p>
              )}
            </div>

            {/* Product Image */}
            <div className="mt-4">
              <ImageUploader
                label="Product Image (Optional)"
                description="Upload a product image if relevant to the feedback"
                value={formik.values.productImage}
                onChange={(url) => formik.setFieldValue('productImage', url)}
                maxSize={3}
              />
              {formik.touched.productImage && formik.errors.productImage && (
                <p className="text-xs text-destructive-500 mt-1">{formik.errors.productImage}</p>
              )}
            </div>

            {/* Message */}
            <div className="mt-4">
              <Label>Feedback Message *</Label>
              <p className="text-xs text-subtle-foreground mb-2">Can be in Bengali or English</p>
              <Textarea
                name="message"
                value={formik.values.message}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                rows={4}
                placeholder="Enter customer feedback message..."
                className={formik.touched.message && formik.errors.message ? 'border-destructive-500' : ''}
              />
              {formik.touched.message && formik.errors.message && (
                <p className="text-xs text-destructive-500 mt-1">{formik.errors.message}</p>
              )}
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsDialogOpen(false);
                  resetForm();
                }}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
              type="submit" 
              // disabled={submitting || !formik.isValid}
              >
                {submitting && <Loader size="sm" label={null} className="mr-2" />}
                {editingId ? 'Update' : 'Create'} Feedback
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>View Feedback</DialogTitle>
          </DialogHeader>
          {viewingFeedback && (
            <div className="space-y-4">
              <div className={`${getPlatformColor(viewingFeedback.platform)} px-4 py-3 rounded-lg flex items-center gap-3`}>
                {(() => {
                  const PlatformIcon = getPlatformIcon(viewingFeedback.platform);
                  return <PlatformIcon className="h-6 w-6 text-white" />;
                })()}
                <span className="text-white font-semibold">{viewingFeedback.platformName}</span>
                <Badge variant={viewingFeedback.isActive ? 'default' : 'secondary'} className="ml-auto">
                  {viewingFeedback.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <div className="flex items-center gap-3">
                <Image
                  src={viewingFeedback.customer.avatar}
                  alt={viewingFeedback.customer.name}
                  width={64}
                  height={64}
                  className="rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold">{viewingFeedback.customer.name}</p>
                  <p className="text-sm text-subtle-foreground">{viewingFeedback.customer.location}</p>
                  <p className="text-xs text-subtle-foreground">
                    {viewingFeedback.customer.verified ? '✓ Verified' : 'Not Verified'}
                  </p>
                </div>
              </div>

              <div>
                <Label>Feedback Message</Label>
                <p className="text-sm bg-muted p-3 rounded-lg">{viewingFeedback.message}</p>
              </div>

              <div>
                <Label>Rating</Label>
                <div className="flex items-center gap-1">
                  {[...Array(viewingFeedback.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-warning-400 fill-current" />
                  ))}
                  <span className="text-sm ml-2">{viewingFeedback.rating}.0</span>
                </div>
              </div>

              {viewingFeedback.productImage && (
                <div>
                  <Label>Product Image</Label>
                  <Image
                    src={viewingFeedback.productImage}
                    alt="Product"
                    width={300}
                    height={200}
                    className="rounded-lg object-cover mt-2"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Feedback</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this feedback? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setDeletingId(null);
              }}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive-600 hover:bg-destructive-700 text-white"
            >
              {submitting && <Loader size="sm" label={null} className="mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </AdminLayout>
  );
}

