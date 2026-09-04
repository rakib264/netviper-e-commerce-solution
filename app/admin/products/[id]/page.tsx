'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Edit,
  Package,
  Search,
  Star,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AdminDetailPageSkeleton } from '@/components/admin/ui/loading';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription?: string;
  editorsNotes?: string;
  price: number;
  comparePrice?: number;
  cost?: number;
  sku: string;
  barcodeType?: string;
  barcode?: string;
  trackQuantity?: boolean;
  quantity: number;
  lowStockThreshold?: number;
  thumbnailImage: string;
  images: string[];
  videoLinks?: string[];
  media?: Array<{ id: string; type: 'image' | 'video'; url: string }>;
  variantMode?: 'single' | 'multi';
  sizeImage?: string;
  category: {
    name: string;
    slug: string;
  };
  weight?: string | number;
  dimensions?: {
    length: string | number;
    width: string | number;
    height: string | number;
  };
  shippingCost?: number;
  shippingClass?: string;
  taxRate?: number;
  isActive: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isLimitedEdition: boolean;
  averageRating: number;
  totalSales: number;
  totalReviews: number;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  productSize?: string[];
  sizeVisualizer?: {
    enabled: boolean;
    referenceObjectIds: string[];
    bodySilhouetteEnabled: boolean;
  };
  metaTitle?: string;
  metaDescription?: string;
  seoKeywords?: string[];
  variants?: Array<{
    id?: string;
    attributeName?: string;
    attributeValue?: string;
    name?: string;
    value?: string;
    price?: number;
    sku?: string;
    quantity?: number;
    image?: string;
    thumbnailImage?: string;
    media?: Array<{ id: string; type: 'image' | 'video'; url: string }>;
  }>;
}

export default function ProductView() {
  const params = useParams();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
  const [isZooming, setIsZooming] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSizeChartOpen, setIsSizeChartOpen] = useState(false);

  useEffect(() => {
    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await fetch(`/api/admin/products/${params.id}`);
      if (response.ok) {
        const data = await response.json();
        setProduct(data);
      } else {
        console.error('Failed to fetch product');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatPrice = (price: number) => formatStoreCurrency(price, { minimumFractionDigits: 0 });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleEdit = () => {
    router.push(`/admin/products/${params.id}/edit`);
  };

  const confirmDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/products/${params.id}`, { method: 'DELETE' });
      if (response.ok) {
        setIsDeleteOpen(false);
        router.push('/admin/products');
      } else {
        console.error('Failed to delete product');
      }
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleImageHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  };

  // Render description without raw HTML tags
  const cleanHtml = (html: string): string => {
    if (!html) return '';
    if (typeof window === 'undefined') {
      return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    const el = document.createElement('div');
    el.innerHTML = html;
    const text = el.textContent || el.innerText || '';
    return text.replace(/\s+/g, ' ').trim();
  };

  if (loading) {
    return (
      <AdminLayout>
        <AdminDetailPageSkeleton />
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h2>
            <p className="text-muted-foreground mb-4">The product you're looking for doesn't exist.</p>
            <Button onClick={() => router.push('/admin/products')}>
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-4">
        <Button
              variant="outline"
              onClick={() => router.push('/admin/products')}
            >
              <ArrowLeft size={16} className="mr-2" />
              Back
            </Button>
            <div className="flex items-center justify-between">
          <div className="">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
              <p className="text-muted-foreground mt-1">Product Details</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={handleEdit}>
              <Edit size={16} className="mr-2" />
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 size={16} className="mr-2" />
              Delete
            </Button>
          </div>
        </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Product Gallery */}
            <Card>
              <CardHeader>
                <CardTitle>Product Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                {(() => {
                  const galleryImages = [product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)];
                  return galleryImages.length > 0 ? (
                  <div className="hidden lg:grid lg:grid-cols-12 lg:gap-4">
                    {/* Vertical thumbnails */}
                    <div className="lg:col-span-2 max-h-[480px] overflow-y-auto pr-1">
                      <div className="flex lg:flex-col gap-2">
                        {galleryImages.map((image, index) => (
                          <motion.button
                            key={index}
                            whileHover={{ scale: 1.03 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => setSelectedImage(index)}
                            className={`relative w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                              selectedImage === index ? 'border-primary' : 'border-border hover:border-ring'
                            }`}
                            aria-label={`Show image ${index + 1}`}
                          >
                            <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    {/* Main Image */}
                    <div className="lg:col-span-10 relative group">
                      <div
                        className="relative overflow-hidden rounded-xl bg-accent cursor-zoom-in ring-1 ring-ring"
                        onMouseEnter={() => setIsZooming(true)}
                        onMouseLeave={() => setIsZooming(false)}
                        onMouseMove={handleImageHover}
                        onClick={() => setIsLightboxOpen(true)}
                      >
                        <img
                          src={galleryImages[selectedImage] || product.thumbnailImage}
                          alt={product.name}
                          className="w-full h-[480px] object-cover transition-transform duration-500 ease-&lsqb;cubic-bezier(0.22,1,0.36,1)&rsqb;"
                          style={{
                            transform: isZooming ? 'scale(2.05)' : 'scale(1)',
                            transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                          }}
                        />
                        <div
                          className={`pointer-events-none absolute inset-0 transition-opacity duration-500 bg-gradient-to-t from-black/10 via-transparent to-black/10 ${
                            isZooming ? 'opacity-100' : 'opacity-0'
                          }`}
                        />
                        <div className="absolute top-4 right-4 bg-black/60 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Search size={16} />
                        </div>
                        {galleryImages.length > 1 && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(Math.max(0, selectedImage - 1));
                              }}
                              disabled={selectedImage === 0}
                              aria-label="Previous image"
                            >
                              <ChevronLeft size={20} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-card/80 hover:bg-card p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedImage(Math.min(galleryImages.length - 1, selectedImage + 1));
                              }}
                              disabled={selectedImage === galleryImages.length - 1}
                              aria-label="Next image"
                            >
                              <ChevronRight size={20} />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  ) : (
                  <div className="aspect-video bg-accent rounded-lg flex items-center justify-center">
                    <Package size={48} className="text-subtle-foreground" />
                  </div>
                  );
                })()}

                {/* Mobile thumbnails */}
                {(() => {
                  const galleryImages = [product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)];
                  return galleryImages.length > 1 ? (
                  <div className="lg:hidden mt-3 flex gap-2 overflow-x-auto pb-2">
                    {galleryImages.map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                          selectedImage === index ? 'border-primary' : 'border-border'
                        }`}
                        aria-label={`Show image ${index + 1}`}
                      >
                        <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  ) : null;
                })()}

                {/* Lightbox */}
                <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                  <DialogContent className="max-w-5xl p-0 overflow-hidden bg-card">
                    <DialogHeader>
                      <DialogTitle className="sr-only">{product.name} image preview</DialogTitle>
                    </DialogHeader>
                    <div className="relative bg-black">
                      <img
                        src={([product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)][selectedImage]) || product.thumbnailImage}
                        alt={product.name}
                        className="w-full max-h-[80vh] object-contain bg-black"
                      />
                      {([product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)].length > 1) && (
                        <>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute left-3 top-1/2 -translate-y-1/2"
                            onClick={() => setSelectedImage(Math.max(0, selectedImage - 1))}
                            disabled={selectedImage === 0}
                            aria-label="Previous image"
                          >
                            <ChevronLeft />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="absolute right-3 top-1/2 -translate-y-1/2"
                            onClick={() => {
                              const galleryLength = [product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)].length;
                              setSelectedImage(Math.min(galleryLength - 1, selectedImage + 1));
                            }}
                            disabled={selectedImage === ([product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)].length - 1)}
                            aria-label="Next image"
                          >
                            <ChevronRight />
                          </Button>
                        </>
                      )}
                    </div>
                    {[product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)].length > 1 && (
                      <div className="flex gap-2 p-3 bg-card">
                        {[product.thumbnailImage, ...(product.images || []).filter((img) => img !== product.thumbnailImage)].map((image, index) => (
                          <button
                            key={index}
                            onClick={() => setSelectedImage(index)}
                            className={`w-16 h-16 rounded-md overflow-hidden border ${
                              selectedImage === index ? 'border-primary' : 'border-transparent'
                            }`}
                            aria-label={`Select image ${index + 1}`}
                          >
                            <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <DeleteConfirmationDialog
                  open={isDeleteOpen}
                  onOpenChange={setIsDeleteOpen}
                  onConfirm={confirmDelete}
                  title="Delete Product"
                  description="Are you sure you want to delete this product? This action cannot be undone."
                  entityName="product"
                  isLoading={isDeleting}
                />

                {/* Size Chart Dialog */}
                {product.sizeImage && (
                  <Dialog open={isSizeChartOpen} onOpenChange={setIsSizeChartOpen}>
                    <DialogContent className="max-w-4xl bg-card">
                      <DialogHeader>
                        <DialogTitle>Size Chart</DialogTitle>
                      </DialogHeader>
                      <div className="max-h-[70vh] overflow-auto">
                        <img
                          src={product.sizeImage}
                          alt="Size chart"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardContent>
            </Card>

            {/* Product Information */}
            <Card>
              <CardHeader>
                <CardTitle>Product Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Description</h3>
                  <p className="text-muted-foreground">{cleanHtml(product.shortDescription || product.description) || 'No description available.'}</p>
                </div>

                {/* Variants */}
                {product.variants && product.variants.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">Variants</h3>
                        <Badge variant="outline">
                          {product.variantMode || 'multi'}
                        </Badge>
                      </div>
                      {Object.entries(
                        product.variants.reduce((acc, variant) => {
                          const key = variant.attributeName || variant.name || 'Option';
                          if (!acc[key]) acc[key] = [] as NonNullable<Product['variants']>;
                          acc[key].push(variant);
                          return acc;
                        }, {} as Record<string, NonNullable<Product['variants']>>)
                      ).map(([variantName, options]) => (
                        <div key={variantName}>
                          <Label className="text-sm font-medium mb-2 block">{variantName}</Label>
                          <div className="flex flex-wrap gap-3">
                            {options.map((option) => {
                              const label = option.attributeValue || option.value || '';
                              const thumb = option.thumbnailImage || option.image;
                              return (
                              <div key={`${variantName}-${label}-${option.sku}`} className="flex items-center gap-2 p-2 border rounded-lg">
                                {thumb && (
                                  <img 
                                    src={thumb} 
                                    alt={label}
                                    className="w-10 h-10 rounded object-cover border"
                                  />
                                )}
                                <div className="flex flex-col">
                                  <Badge variant="outline" className="mb-1">
                                    {label}
                                  </Badge>
                                  <div className="flex gap-2 text-xs font-caption text-muted-foreground">
                                    {option.sku && <span>{option.sku}</span>}
                                    {typeof option.price === 'number' && (
                                      <span>{formatPrice(option.price)}</span>
                                    )}
                                    {typeof option.quantity === 'number' && (
                                      <span>qty {option.quantity}</span>
                                    )}
                                    {option.media?.length ? (
                                      <span>{option.media.length} media</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                            )})}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Basic Details</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="font-medium">{product.sku}</span>
                      </div>
                      {product.barcode && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Barcode:</span>
                          <span className="font-medium">{product.barcode}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge variant="outline">{product.category?.name || 'Uncategorized'}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={product.isActive ? "default" : "secondary"}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      {product.isFeatured && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Featured:</span>
                          <Badge variant="outline">Featured</Badge>
                        </div>
                      )}
                      {product.isNewArrival && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">New Arrival:</span>
                          <Badge variant="outline" className="bg-info-50 text-info-700 border-info-200">New Arrival</Badge>
                        </div>
                      )}
                      {product.isLimitedEdition && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Limited Edition:</span>
                          <Badge variant="outline" className="bg-primary-50 text-primary-700 border-primary-200">Limited Edition</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-2">Pricing & Stock</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Price:</span>
                        <span className="font-price font-medium">{formatPrice(product.price)}</span>
                      </div>
                      {product.comparePrice && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Compare Price:</span>
                          <span className="font-caption font-medium line-through text-subtle-foreground">
                            {formatPrice(product.comparePrice)}
                          </span>
                        </div>
                      )}
                      {product.cost && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Cost:</span>
                          <span className="font-price font-medium text-success-600">
                            {formatPrice(product.cost)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stock:</span>
                        <Badge 
                          variant={product.quantity < 10 ? "destructive" : product.quantity < 50 ? "secondary" : "default"}
                        >
                          {product.quantity} units
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {product.weight || product.dimensions && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Physical Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {product.weight ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Weight:</span>
                            <span className="font-medium">{product.weight}</span>
                          </div>
                        ) : null}
                        {product.dimensions?.length ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Length:</span>
                            <span className="font-medium">{product.dimensions.length}</span>
                          </div>
                        ) : null}
                        {product.dimensions?.height ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Height:</span>
                            <span className="font-medium">{product.dimensions.height}</span>
                          </div>
                        ) : null}
                        {product.dimensions?.width ? (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Width:</span>
                            <span className="font-medium">{product.dimensions.width}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </>
                )}

                {product?.tags && product?.tags?.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {product.tags.map((tag, index) => (
                          <Badge key={index} variant="secondary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {product.shippingClass ? (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipping class:</span>
                      <Badge variant="outline">{product.shippingClass}</Badge>
                    </div>
                  </>
                ) : null}

                {product.sizeVisualizer?.enabled ? (
                  <>
                    <Separator />
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Size & Fit Visualizer</h3>
                      <p className="text-sm text-muted-foreground">
                        Enabled · refs: {(product.sizeVisualizer.referenceObjectIds || []).join(', ')}
                        {product.sizeVisualizer.bodySilhouetteEnabled ? ' · body mode on' : ''}
                      </p>
                    </div>
                  </>
                ) : null}
              </CardContent>
            </Card>

            {/* Product Videos */}
            {product.videoLinks && product.videoLinks.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Product Videos ({product.videoLinks.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {product.videoLinks.map((link, index) => (
                      <div key={index} className="space-y-2">
                        <div className="aspect-video bg-accent rounded-lg overflow-hidden">
                          <iframe
                            src={link.includes('youtube.com') || link.includes('youtu.be') 
                              ? link.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
                              : link.includes('vimeo.com') 
                                ? link.replace('vimeo.com/', 'player.vimeo.com/video/')
                                : link
                            }
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            title={`${product.name} - Video ${index + 1}`}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Video {index + 1}
                        </p>
                        <p className="text-xs text-subtle-foreground truncate">
                          {link}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Size Reference Image (legacy) */}
            {product.sizeImage && !product.sizeVisualizer?.enabled && (
              <Card>
                <CardHeader>
                  <CardTitle>Legacy Size Reference Image</CardTitle>
                </CardHeader>
                <CardContent>
                  <img
                    src={product.sizeImage}
                    alt="Size reference"
                    className="w-64 h-64 object-cover rounded-lg border"
                  />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Star className="text-warning-400" size={16} />
                    <span className="text-sm text-muted-foreground">Rating</span>
                  </div>
                  <span className="font-medium">{product.averageRating.toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="text-success-600" size={16} />
                    <span className="text-sm text-muted-foreground">Total Sales</span>
                  </div>
                  <span className="font-medium">{product.totalSales}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className="text-info-600" size={16} />
                    <span className="text-sm text-muted-foreground">Reviews</span>
                  </div>
                  <span className="font-medium">{product.totalReviews}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-sm font-medium">{formatDate(product.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-sm font-medium">{formatDate(product.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>

            {/* SEO Details */}
            {(product.metaTitle || product.metaDescription || (product.seoKeywords && product.seoKeywords.length > 0)) && (
              <Card>
                <CardHeader>
                  <CardTitle>SEO & Meta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {product.metaTitle && (
                    <div>
                      <p className="text-sm text-muted-foreground">Meta Title</p>
                      <p className="text-sm font-medium">{product.metaTitle}</p>
                    </div>
                  )}
                  {product.metaDescription && (
                    <div>
                      <p className="text-sm text-muted-foreground">Meta Description</p>
                      <p className="text-sm font-medium">{product.metaDescription}</p>
                    </div>
                  )}
                  {product.seoKeywords && product.seoKeywords.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">SEO Keywords</p>
                      <div className="flex flex-wrap gap-1">
                        {product.seoKeywords.map((keyword, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 