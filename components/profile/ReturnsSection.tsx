'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Eye,
  Package,
  Plus,
  RefreshCw,
  Search,
  Truck
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/components/providers/LocalizationProvider';

interface ReturnRequest {
  _id: string;
  requestId: string;
  orderId: string;
  customerName: string;
  email: string;
  phone: string;
  type: 'return' | 'exchange';
  reason: string;
  details: string;
  products: {
    productName: string;
    quantity: number;
    variant?: string;
    reason: string;
    details?: string;
  }[];
  attachments: string[];
  status: string;
  statusHistory: {
    status: string;
    message: string;
    timestamp: string;
    updatedBy?: string;
  }[];
  adminNotes?: string;
  refundAmount?: number;
  refundMethod?: string;
  trackingNumber?: string;
  courierName?: string;
  createdAt: string;
  updatedAt: string;
}

const getStatusColor = (status: string) => {
  const colors: { [key: string]: string } = {
    pending: 'bg-warning-100 text-warning-800 hover:bg-warning-200',
    approved: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
    processing: 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200',
    shipped: 'bg-secondary-100 text-secondary-800 hover:bg-secondary-200',
    delivered: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
    completed: 'bg-primary-100 text-primary-800 hover:bg-primary-200',
    rejected: 'bg-destructive-100 text-destructive-800 hover:bg-destructive-200',
    cancelled: 'bg-accent text-foreground hover:bg-border'
  };
  return colors[status] || 'bg-accent text-foreground hover:bg-border';
};

const getStatusIcon = (status: string) => {
  const icons: { [key: string]: any } = {
    pending: Clock,
    approved: CheckCircle,
    processing: RefreshCw,
    shipped: Truck,
    delivered: Package,
    completed: CheckCircle,
    rejected: AlertCircle,
    cancelled: AlertCircle
  };
  return icons[status] || Clock;
};

export default function ReturnsSection() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [returnRequests, setReturnRequests] = useState<ReturnRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    if (session?.user?.id) {
      fetchReturnRequests();
    }
  }, [session]);

  const fetchReturnRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/returns');
      const data = await response.json();
      
      if (response.ok) {
        setReturnRequests(data.returnRequests || []);
      } else {
        console.error('Error fetching return requests:', data.error);
      }
    } catch (error) {
      console.error('Error fetching return requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredRequests = returnRequests.filter(request => {
    const matchesSearch = 
      request.requestId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.products.some(p => p.productName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || request.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const statusCounts = returnRequests.reduce((acc, request) => {
    acc[request.status] = (acc[request.status] || 0) + 1;
    return acc;
  }, {} as { [key: string]: number });

  if (loading) {
    return (
      <div className="py-8 text-center">
        <RefreshCw className="mx-auto mb-4 h-7 w-7 animate-spin text-muted-foreground" />
        <p className="typography-caption text-hierarchy-subtitle">{t('profile.returnsSection.loadingYourReturnRequests')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-0 bg-transparent shadow-none hover:shadow-none">
        <CardContent className="p-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(statusCounts).map(([status, count]) => {
              const StatusIcon = getStatusIcon(status);
              return (
                <motion.div
                  key={status}
                  className="rounded-xl border border-border bg-muted/40 p-4 text-center"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-card text-muted-foreground">
                    <StatusIcon size={16} />
                  </div>
                  <div className="text-2xl font-bold text-foreground">{count}</div>
                  <div className="text-sm text-muted-foreground capitalize">{status}</div>
                </motion.div>
              );
            })}
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search-returns" className="text-sm font-semibold flex items-center mb-2 text-muted-foreground">
                <Search className="w-4 h-4 mr-2 text-primary-600" />
                {t('profile.returnsSection.searchReturns')}
              </Label>
              <Input
                id="search-returns"
                placeholder={t('profile.returnsSection.searchByRequestIdOrderId')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 rounded-xl border-border focus:border-primary-500 focus:ring-primary-500/20 transition-all duration-300"
              />
            </div>
            <div className="md:w-48">
              <Label htmlFor="filter-status" className="text-sm font-semibold mb-2 block text-muted-foreground">
                {t('profile.returnsSection.filterByStatus')}
              </Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full h-12 rounded-xl border-border focus:border-primary-500 focus:ring-primary-500/20">
                  <SelectValue placeholder={t('profile.returnsSection.allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('profile.returnsSection.allStatus')}</SelectItem>
                  <SelectItem value="pending">{t('profile.returnsSection.pending')}</SelectItem>
                  <SelectItem value="approved">{t('profile.returnsSection.approved')}</SelectItem>
                  <SelectItem value="processing">{t('profile.returnsSection.processing')}</SelectItem>
                  <SelectItem value="shipped">{t('profile.returnsSection.shipped')}</SelectItem>
                  <SelectItem value="delivered">{t('profile.returnsSection.delivered')}</SelectItem>
                  <SelectItem value="completed">{t('profile.returnsSection.completed')}</SelectItem>
                  <SelectItem value="rejected">{t('profile.returnsSection.rejected')}</SelectItem>
                  <SelectItem value="cancelled">{t('profile.returnsSection.cancelled')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Return Requests List */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <Package className="w-8 h-8 text-subtle-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-muted-foreground">{t('profile.returnsSection.noReturnRequestsFound')}</h3>
              <p className="text-subtle-foreground mb-4">
                {searchTerm || filterStatus !== 'all' 
                  ? t('profile.returnsSection.tryAdjustingYourSearchOrFilter')
                  : t('profile.returnsSection.youHavenTSubmittedAnyReturn')
                }
              </p>
              {!searchTerm && filterStatus === 'all' && (
                <Link href="/returns">
                  <Button size="lg">
                    <Plus className="w-4 h-4 mr-2" />
                    {t('profile.returnsSection.submitYourFirstRequest')}
                  </Button>
                </Link>
              )}
            </motion.div>
          ) : (
            filteredRequests.map((request, index) => {
              const StatusIcon = getStatusIcon(request.status);
              return (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="group rounded-xl border border-border bg-card shadow-none transition-colors hover:border-ring hover:shadow-none">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                              <StatusIcon size={18} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-foreground">{request.requestId}</h3>
                              <p className="text-sm text-muted-foreground">
                                {t('profile.returnsSection.order')} {request.orderId} • {request.type === 'return' ? 'Return' : 'Exchange'}
                              </p>
                            </div>
                            <Badge className={`${getStatusColor(request.status)} text-xs font-medium px-3 py-1 rounded-full`}>
                              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                            </Badge>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="font-medium mb-2 text-muted-foreground">{t('profile.returnsSection.products')}</h4>
                              <div className="space-y-1">
                                {request.products.slice(0, 2).map((product, idx) => (
                                  <div key={idx} className="text-sm text-muted-foreground">
                                    {product.productName} {t('profile.returnsSection.qty')} {product.quantity})
                                  </div>
                                ))}
                                {request.products.length > 2 && (
                                  <div className="text-sm text-subtle-foreground">
                                    {t('profile.returnsSection.moreProductsCount', { count: request.products.length - 2 })}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-muted-foreground">{t('profile.returnsSection.requestDetails')}</h4>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>{t('profile.returnsSection.reason')} {request.reason}</p>
                                <p>{t('profile.returnsSection.submitted')} {formatDate(request.createdAt)}</p>
                                {request.trackingNumber && (
                                  <p>{t('profile.returnsSection.tracking')} {request.trackingNumber}</p>
                                )}
                              </div>
                            </div>
                          </div>

                          {request.statusHistory.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-medium mb-2 text-muted-foreground">{t('profile.returnsSection.latestUpdate')}</h4>
                              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{request.statusHistory[request.statusHistory.length - 1].message}</span>
                                <span>•</span>
                                <span>{formatDate(request.statusHistory[request.statusHistory.length - 1].timestamp)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col space-y-2 ml-4">
                          <Link href={`/returns?track=${request.requestId}`}>
                            <Button variant="outline" size="sm" className="group border-border hover:border-primary-300 hover:bg-primary-50 text-muted-foreground hover:text-primary-700">
                              <Eye className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                              {t('profile.returnsSection.viewDetails')}
                            </Button>
                          </Link>
                          <Link href="/returns">
                            <Button variant="ghost" size="sm" className="group text-muted-foreground hover:text-primary-600 hover:bg-primary-50">
                              <ArrowRight className="w-4 h-4 mr-2 group-hover:translate-x-1 transition-transform" />
                              {t('profile.returnsSection.trackStatus')}
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
