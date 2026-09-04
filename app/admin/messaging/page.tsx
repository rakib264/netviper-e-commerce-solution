'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDeleteConfirmationDialog } from '@/components/ui/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useErrorDialog } from '@/components/ui/error-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToastWithTypes } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  AlertTriangle,
  BarChart3,
  Calendar,
  CheckCircle,
  Clock,
  MessageSquare,
  Phone,
  RefreshCw,
  Send,
  Sparkles,
  Target,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader } from '@/components/ui/loader';
import { AdminListPageSkeleton } from '@/components/admin/ui/loading';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

/** Per-message SMS rate. A business constant, rendered through the
 * central formatter so it cannot disagree with the estimate below it. */
const SMS_COST_PER_MESSAGE = 0.5;

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderDate?: string;
  createdAt: string;
}

interface Message {
  _id: string;
  content: string;
  type: 'bulk' | 'individual';
  targetFilter: {
    type: string;
    criteria?: any;
  };
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  failedCount: number;
  provider: string;
  cost?: number;
  sender: {
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  completedAt?: string;
}

interface MessageFormData {
  content: string;
  targetType: 'all' | 'new' | 'repeated' | 'best' | 'single';
  singleCustomerId?: string;
  messageType: 'bulk' | 'individual';
  scheduledAt?: string;
}

export default function AdminMessaging() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState<MessageFormData>({
    content: '',
    targetType: 'all',
    messageType: 'bulk'
  });

  const [stats, setStats] = useState({
    totalMessages: 0,
    totalSent: 0,
    totalDelivered: 0,
    totalFailed: 0,
    totalCost: 0
  });

  // Server-side data management
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<{ key?: string; direction?: 'asc' | 'desc' }>({});

  // Hooks
  const { showError, ErrorDialogComponent } = useErrorDialog();
  const { success, error: showToastError, warning } = useToastWithTypes();
  const { showDeleteConfirmation, DeleteConfirmationComponent } = useDeleteConfirmationDialog();

  // GSAP animations
  useEffect(() => {
    if (!loading) {
      const tl = gsap.timeline();
      
      // Animate header
      if (headerRef.current) {
        tl.fromTo(headerRef.current, 
          { y: -50, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
        );
      }
      
      // Animate stats cards
      if (statsRef.current) {
        tl.fromTo(statsRef.current.children,
          { y: 30, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.6, stagger: 0.1, ease: "power2.out" },
          "-=0.4"
        );
      }
    }
  }, [loading]);

  useEffect(() => {
    fetchMessages();
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [formData.targetType, customers, customerSearch]);

  // Debounced search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);

    return () => clearTimeout(timer);
  }, [search]);

  // Fetch messages when debounced search, filters, sort, or pagination changes
  useEffect(() => {
    fetchMessages();
  }, [debouncedSearch, filters, sort, pagination.page, pagination.pageSize]);

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.pageSize.toString(),
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(filters.type && { type: filters.type }),
        ...(filters.provider && { provider: filters.provider }),
        ...(filters.status && { status: filters.status }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
        ...(sort.key && { sortBy: sort.key }),
        ...(sort.direction && { sortOrder: sort.direction })
      });

      const response = await fetch(`/api/admin/messaging?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch messages');
      }

      setMessages(data.messages || []);
      setPagination(prev => ({ ...prev, total: data.pagination?.total || 0 }));
      
      // Calculate stats - for stats we might want to fetch all messages or have a separate stats endpoint
      const totalMessages = data.pagination?.total || 0;
      const totalSent = data.messages?.reduce((sum: number, msg: Message) => sum + msg.sentCount, 0) || 0;
      const totalDelivered = data.messages?.reduce((sum: number, msg: Message) => sum + msg.deliveredCount, 0) || 0;
      const totalFailed = data.messages?.reduce((sum: number, msg: Message) => sum + msg.failedCount, 0) || 0;
      const totalCost = data.messages?.reduce((sum: number, msg: Message) => sum + (msg.cost || 0), 0) || 0;
      
      setStats({ totalMessages, totalSent, totalDelivered, totalFailed, totalCost });
    } catch (error) {
      console.error('Error fetching messages:', error);
      showToastError('Failed to fetch messages', 'Please try again');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.pageSize, debouncedSearch, filters, sort, showToastError]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/admin/customers?limit=1000');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  // Message actions
  const handleViewMessage = async (message: Message) => {
    try {
      const response = await fetch(`/api/admin/messaging/${message._id}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch message details');
      }
      
      setSelectedMessage(data.message);
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error fetching message details:', error);
      showToastError('Failed to load message details', 'Please try again');
    }
  };

  const handleDeleteMessage = (message: Message) => {
    showDeleteConfirmation({
      title: 'Delete Message',
      description: `Are you sure you want to delete this message? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/messaging/${message._id}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete message');
          }

          success('Message deleted successfully');
          fetchMessages();
        } catch (error) {
          console.error('Error deleting message:', error);
          showToastError('Failed to delete message', 'Please try again');
        }
      }
    });
  };

  const handleBulkDelete = (selectedMessages: Message[]) => {
    const messageIds = selectedMessages.map(msg => msg._id);
    
    showDeleteConfirmation({
      title: 'Delete Messages',
      description: `Are you sure you want to delete ${selectedMessages.length} message(s)? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          const response = await fetch(`/api/admin/messaging?ids=${messageIds.join(',')}`, {
            method: 'DELETE'
          });

          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || 'Failed to delete messages');
          }

          success(`${data.deletedCount} message(s) deleted successfully`);
          fetchMessages();
        } catch (error) {
          console.error('Error deleting messages:', error);
          showToastError('Failed to delete messages', 'Please try again');
        }
      }
    });
  };

  const handleExportSelected = (selectedMessages: Message[]) => {
    const headers = ['Content', 'Type', 'Target', 'Recipients', 'Sent', 'Delivered', 'Failed', 'Cost', 'Sender', 'Created At'];
            const rows = selectedMessages.map(msg => [
      msg.content,
      msg.type,
      msg.targetFilter.type,
      msg.totalRecipients,
      msg.sentCount,
      msg.deliveredCount,
      msg.failedCount,
      msg.cost || 0,
      msg.sender?.firstName && msg.sender?.lastName 
        ? `${msg.sender.firstName} ${msg.sender.lastName}` 
        : 'Unknown User',
      new Date(msg.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `messages-export-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    success(`${selectedMessages.length} message(s) exported successfully`);
  };

  const filterCustomers = () => {
    let filtered = customers;

    // Apply search filter
    if (customerSearch) {
      filtered = filtered.filter(customer =>
        `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
        customer.phone.includes(customerSearch) ||
        customer.email.toLowerCase().includes(customerSearch.toLowerCase())
      );
    }

    // Apply target type filter
    switch (formData.targetType) {
      case 'new':
        // Customers with 0-1 orders
        filtered = filtered.filter(customer => customer.totalOrders <= 1);
        break;
      case 'repeated':
        // Customers with 2+ orders
        filtered = filtered.filter(customer => customer.totalOrders >= 2);
        break;
      case 'best':
        // Top 20% customers by spending
        const sortedBySpending = [...filtered].sort((a, b) => b.totalSpent - a.totalSpent);
        const top20Percent = Math.ceil(sortedBySpending.length * 0.2);
        filtered = sortedBySpending.slice(0, top20Percent);
        break;
      case 'single':
        // Will be handled separately in single customer selection
        filtered = [];
        break;
      default:
        // All customers
        break;
    }

    setFilteredCustomers(filtered);
  };

  const getTargetDescription = () => {
    switch (formData.targetType) {
      case 'new':
        return `New customers (${filteredCustomers.length} customers with 0-1 orders)`;
      case 'repeated':
        return `Repeated buyers (${filteredCustomers.length} customers with 2+ orders)`;
      case 'best':
        return `Best customers (${filteredCustomers.length} top 20% by spending)`;
      case 'single':
        return 'Single customer';
      default:
        return `All customers (${filteredCustomers.length} total customers)`;
    }
  };

  const calculateEstimatedCost = () => {
    const recipientCount = formData.targetType === 'single' ? 1 : filteredCustomers.length;
    return recipientCount * SMS_COST_PER_MESSAGE;
  };

  const handlePreview = () => {
    if (!formData.content.trim()) {
      showError('Please enter a message', 'Validation Error');
      return;
    }
    setPreviewOpen(true);
  };

  const handleSendMessage = async () => {
    if (!formData.content.trim()) {
      showError('Please enter a message', 'Validation Error');
      return;
    }

    if (formData.targetType === 'single' && !formData.singleCustomerId) {
      showError('Please select a customer', 'Validation Error');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/admin/messaging/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        success('Message sent successfully', 'Your message has been queued for delivery');
        setComposeOpen(false);
        setPreviewOpen(false);
        setFormData({
          content: '',
          targetType: 'all',
          messageType: 'bulk'
        });
        fetchMessages();
      } else {
        showToastError('Failed to send message', data.error || 'Please try again');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showToastError('Failed to send message', 'Please check your connection and try again');
    } finally {
      setSending(false);
    }
  };

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 2 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-success-100 text-success-800';
      case 'sent': return 'bg-info-100 text-info-800';
      case 'failed': return 'bg-destructive-100 text-destructive-800';
      case 'pending': return 'bg-warning-100 text-warning-800';
      default: return 'bg-accent text-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={14} />;
      case 'sent': return <Send size={14} />;
      case 'failed': return <XCircle size={14} />;
      case 'pending': return <Clock size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  // Define filter options
  const messageFilters = [
    {
      type: 'select' as const,
      key: 'type',
      label: 'Message Type',
      options: [
        { label: 'Bulk SMS', value: 'bulk' },
        { label: 'Individual SMS', value: 'individual' }
      ]
    },
    {
      type: 'select' as const,
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Sent', value: 'sent' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Failed', value: 'failed' },
        { label: 'Pending', value: 'pending' }
      ]
    },
    {
      type: 'select' as const,
      key: 'provider',
      label: 'Provider',
      options: [
        { label: 'Twilio', value: 'twilio' },
        { label: 'Teletalk', value: 'teletalk' },
        { label: 'ZamanIT', value: 'zamanit' }
      ]
    },
    {
      type: 'dateRange' as const,
      label: 'Date Range',
      fromKey: 'dateFrom',
      toKey: 'dateTo'
    }
  ];

  // Define bulk actions
  const bulkActions = [
    {
      label: 'Export Selected',
      action: handleExportSelected,
      variant: 'default' as const
    },
    {
      label: 'Delete Selected',
      action: handleBulkDelete,
      variant: 'destructive' as const
    }
  ];

  const messageColumns = [
    {
      key: 'content',
      label: 'Message',
      render: (value: string, row: Message) => (
        <div>
          <p className="font-medium text-foreground line-clamp-2">{value}</p>
          <div className="flex items-center space-x-2 mt-1">
            <Badge variant="outline" className="capitalize">
              {row.type}
            </Badge>
            <Badge variant="secondary">
              {row.targetFilter.type}
            </Badge>
          </div>
        </div>
      )
    },
    {
      key: 'totalRecipients',
      label: 'Recipients',
      sortable: true,
      render: (value: number) => (
        <div className="text-center">
          <p className="font-medium">{value}</p>
          <p className="text-xs text-subtle-foreground">recipients</p>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: any, row: Message) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Badge className={`${getStatusColor('sent')} flex items-center space-x-1`}>
              <Send size={12} />
              <span>{row.sentCount}</span>
            </Badge>
            <Badge className={`${getStatusColor('delivered')} flex items-center space-x-1`}>
              <CheckCircle size={12} />
              <span>{row.deliveredCount}</span>
            </Badge>
            {row.failedCount > 0 && (
              <Badge className={`${getStatusColor('failed')} flex items-center space-x-1`}>
                <XCircle size={12} />
                <span>{row.failedCount}</span>
              </Badge>
            )}
          </div>
          <Progress 
            value={(row.sentCount / row.totalRecipients) * 100} 
            className="h-1"
          />
        </div>
      )
    },
    {
      key: 'cost',
      label: 'Cost',
      sortable: true,
      render: (value: number) => (
        value ? (
          <span className="font-medium">{formatCurrency(value)}</span>
        ) : (
          <span className="text-subtle-foreground">-</span>
        )
      )
    },
    {
      key: 'sender',
      label: 'Sent By',
      render: (value: any) => {
        if (!value || !value.firstName || !value.lastName) {
          return (
            <div className="flex items-center space-x-2">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-xs">
                  N/A
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-subtle-foreground">Unknown</span>
            </div>
          );
        }
        
        return (
          <div className="flex items-center space-x-2">
            <Avatar className="w-8 h-8">
              <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${value.firstName} ${value.lastName}`} />
              <AvatarFallback className="text-xs">
                {value.firstName.charAt(0)}{value.lastName.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{value.firstName} {value.lastName}</span>
          </div>
        );
      }
    },
    {
      key: 'createdAt',
      label: 'Sent At',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm">
          <p>{new Date(value).toLocaleDateString()}</p>
          <p className="text-subtle-foreground">{new Date(value).toLocaleTimeString()}</p>
        </div>
      )
    }
  ];

  const customerColumns = [
    {
      key: 'name',
      label: 'Customer',
      render: (value: any, row: Customer) => (
        <div className="flex items-center space-x-3">
          <Avatar className="w-10 h-10">
            <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${row.firstName} ${row.lastName}`} />
            <AvatarFallback>
              {row.firstName.charAt(0)}{row.lastName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{row.firstName} {row.lastName}</p>
            <p className="text-sm text-subtle-foreground">{row.phone}</p>
          </div>
        </div>
      )
    },
    {
      key: 'totalOrders',
      label: 'Orders',
      sortable: true,
      render: (value: number) => (
        <Badge variant="outline">{value}</Badge>
      )
    },
    {
      key: 'totalSpent',
      label: 'Total Spent',
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'lastOrderDate',
      label: 'Last Order',
      render: (value: string) => (
        value ? (
          <span className="text-sm">{new Date(value).toLocaleDateString()}</span>
        ) : (
          <span className="text-subtle-foreground">Never</span>
        )
      )
    }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <AdminListPageSkeleton showStats={false} rows={6} columns={4} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-primary-50/30 via-white to-secondary-50/30">
        <div ref={containerRef} className="space-y-8 p-4 sm:p-6 lg:p-8">
          {/* Stunning Header Section */}
        <motion.div 
            ref={headerRef}
            className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-secondary-700 rounded-3xl shadow-2xl border border-primary-200/20"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Animated Background Elements */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary-600/90 to-secondary-600/90" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-gradient-to-tr from-white/5 to-transparent rounded-full blur-2xl" />
            
            {/* Header Content */}
            <div className="relative p-6 sm:p-8 lg:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-card/20 backdrop-blur-sm rounded-xl">
                    <MessageSquare className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Messaging Center
                    </h1>
                    <p className="text-info-100 text-lg">
                      Send SMS messages and manage customer communications
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-2 bg-card/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <Sparkles className="text-warning-300" size={16} />
                    <span className="text-white font-medium">Bulk Messaging</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <BarChart3 className="text-success-300" size={16} />
                    <span className="text-white font-medium">Delivery Analytics</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      className="bg-card/20 hover:bg-card/30 backdrop-blur-sm border border-white/30 text-white hover:text-white transition-all duration-300"
                    >
                      <MessageSquare size={16} className="mr-2" />
                      <span className="hidden sm:inline">Compose Message</span>
                      <span className="sm:hidden">Compose</span>
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <div ref={statsRef}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Messages</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalMessages}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-info-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">All time</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-info-500 to-info-600 rounded-2xl shadow-lg">
                      <MessageSquare className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">SMS Sent</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalSent}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Delivered</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl shadow-lg">
                      <Send className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Delivered</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalDelivered}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Successful</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                      <CheckCircle className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Failed</p>
                      <p className="text-3xl font-bold text-foreground">{stats.totalFailed}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-destructive-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Errors</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-destructive-500 to-destructive-600 rounded-2xl shadow-lg">
                      <XCircle className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Cost</p>
                      <p className="text-3xl font-bold text-foreground">
                        {formatCurrency(stats.totalCost)}
                      </p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-warning-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Spent</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-warning-500 to-warning-500 rounded-2xl shadow-lg">
                      <Phone className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Messages History */}
        <div>
          <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-muted to-accent rounded-t-xl">
              <CardTitle className="text-xl font-semibold text-foreground flex items-center justify-between">
                <span>Message History</span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={fetchMessages}>
                    <RefreshCw size={16} className="mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DataTable
                data={messages}
                columns={messageColumns}
                searchable
                filterable
                exportable
                selectable
                pagination
                pageSize={pagination.pageSize}
                filters={messageFilters}
                bulkActions={bulkActions}
                onView={handleViewMessage}
                onDelete={handleDeleteMessage}
                serverPagination={{
                  page: pagination.page,
                  pageSize: pagination.pageSize,
                  total: pagination.total,
                  onPageChange: (page) => setPagination(prev => ({ ...prev, page })),
                  onPageSizeChange: (size) => setPagination(prev => ({ ...prev, pageSize: size, page: 1 })),
                  pageSizeOptions: [10, 25, 50, 100]
                }}
                serverSort={{
                  sortKey: sort.key,
                  sortDirection: sort.direction,
                  onChange: (key, direction) => setSort({ key, direction })
                }}
                serverSearch={{
                  value: search,
                  onChange: setSearch
                }}
                serverFilters={{
                  values: filters,
                  onChange: setFilters
                }}
              />
            </CardContent>
          </Card>
        </div>

        {/* Compose Message Dialog */}
        <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
              <DialogHeader>
                <DialogTitle>Compose SMS Message</DialogTitle>
              </DialogHeader>
              
              <Tabs defaultValue="compose" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="compose">Compose</TabsTrigger>
                  <TabsTrigger value="preview">Preview & Send</TabsTrigger>
                </TabsList>

                <TabsContent value="compose" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Message Composition */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="content">Message Content *</Label>
                        <Textarea
                          id="content"
                          value={formData.content}
                          onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                          placeholder="Type your message here..."
                          rows={6}
                          maxLength={1600}
                          className="resize-none"
                        />
                        <div className="flex justify-between text-xs font-caption text-subtle-foreground mt-1">
                          <span>{formData.content.length}/1600 characters</span>
                          <span>{Math.ceil(formData.content.length / 160)} SMS</span>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="messageType">Message Type</Label>
                        <Select 
                          value={formData.messageType} 
                          onValueChange={(value: 'bulk' | 'individual') => setFormData(prev => ({ ...prev, messageType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="bulk">Bulk SMS</SelectItem>
                            <SelectItem value="individual">Individual SMS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Target Selection */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="targetType">Target Customers</Label>
                        <Select 
                          value={formData.targetType} 
                          onValueChange={(value: any) => setFormData(prev => ({ ...prev, targetType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Customers</SelectItem>
                            <SelectItem value="new">New Customers</SelectItem>
                            <SelectItem value="repeated">Repeated Buyers</SelectItem>
                            <SelectItem value="best">Best Customers</SelectItem>
                            <SelectItem value="single">Single Customer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.targetType === 'single' && (
                        <div>
                          <Label htmlFor="customer">Select Customer</Label>
                          <div className="space-y-2">
                            <Input
                              placeholder="Search customers..."
                              value={customerSearch}
                              onChange={(e) => setCustomerSearch(e.target.value)}
                            />
                            <Select 
                              value={formData.singleCustomerId} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, singleCustomerId: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {customers
                                  .filter(customer =>
                                    `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(customerSearch.toLowerCase()) ||
                                    customer.phone.includes(customerSearch)
                                  )
                                  .slice(0, 50)
                                  .map(customer => (
                                    <SelectItem key={customer._id} value={customer._id}>
                                      {customer.firstName} {customer.lastName} - {customer.phone}
                                    </SelectItem>
                                  ))
                                }
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}

                      {/* Target Summary */}
                      <div className="p-4 bg-info-50 border border-info-200 rounded-lg">
                        <div className="flex items-center space-x-2 mb-2">
                          <Target size={16} className="text-info-600" />
                          <span className="font-medium text-info-800">Target Summary</span>
                        </div>
                        <p className="text-sm text-info-700">{getTargetDescription()}</p>
                        <div className="flex items-center justify-between mt-2 text-sm">
                          <span>Estimated Cost:</span>
                          <span className="font-medium">{formatCurrency(calculateEstimatedCost())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="space-y-6">
                  {/* Message Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Message Preview</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="bg-muted p-4 rounded-lg border-l-4 border-info-500">
                        <p className="whitespace-pre-wrap">{formData.content}</p>
                      </div>
                      <div className="flex justify-between text-xs font-caption text-subtle-foreground mt-2">
                        <span>Length: {formData.content.length} characters</span>
                        <span>SMS Count: {Math.ceil(formData.content.length / 160)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recipients Preview */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center justify-between">
                        <span>Recipients ({formData.targetType === 'single' ? 1 : filteredCustomers.length})</span>
                        <Badge variant="outline">{getTargetDescription()}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {formData.targetType === 'single' ? (
                        <div className="text-center py-4">
                          <p className="text-muted-foreground">Single customer selected</p>
                        </div>
                      ) : (
                        <div className="max-h-40 overflow-y-auto">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {filteredCustomers.slice(0, 10).map(customer => (
                              <div key={customer._id} className="flex items-center space-x-2 text-sm p-2 bg-muted rounded">
                                <Avatar className="w-6 h-6">
                                  <AvatarFallback className="text-xs">
                                    {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{customer.firstName} {customer.lastName}</span>
                                <span className="text-subtle-foreground">{customer.phone}</span>
                              </div>
                            ))}
                          </div>
                          {filteredCustomers.length > 10 && (
                            <p className="text-center text-subtle-foreground text-sm mt-2">
                              +{filteredCustomers.length - 10} more customers
                            </p>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Cost Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Cost Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Recipients:</span>
                          <span>{formData.targetType === 'single' ? 1 : filteredCustomers.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SMS per recipient:</span>
                          <span>{Math.ceil(formData.content.length / 160)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Cost per SMS:</span>
                          <span>{formatCurrency(SMS_COST_PER_MESSAGE)}</span>
                        </div>
                        <div className="flex justify-between font-medium text-base border-t pt-2">
                          <span>Total Estimated Cost:</span>
                          <span>{formatCurrency(calculateEstimatedCost())}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Send Button */}
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setComposeOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSendMessage} disabled={sending}>
                      {sending ? (
                        <>
                          <Loader size="sm" label={null} />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send size={16} className="mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>

        {/* Message Details Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
            <DialogHeader>
              <DialogTitle>Message Details</DialogTitle>
            </DialogHeader>
            
            {selectedMessage && (
              <div className="space-y-6">
                {/* Message Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Message Overview</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Message Type</Label>
                        <Badge variant="outline" className="mt-1 capitalize">
                          {selectedMessage.type}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Target Filter</Label>
                        <Badge variant="secondary" className="mt-1">
                          {selectedMessage.targetFilter.type}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Provider</Label>
                        <p className="text-sm">{selectedMessage.provider}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Total Recipients</Label>
                        <p className="text-sm font-medium">{selectedMessage.totalRecipients}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Message Content */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Message Content</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted p-4 rounded-lg border-l-4 border-info-500">
                      <p className="whitespace-pre-wrap">{selectedMessage.content}</p>
                    </div>
                    <div className="flex justify-between text-xs font-caption text-subtle-foreground mt-2">
                      <span>Length: {selectedMessage.content.length} characters</span>
                      <span>SMS Count: {Math.ceil(selectedMessage.content.length / 160)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Delivery Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Delivery Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-info-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <Send className="text-info-600" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-info-600">{selectedMessage.sentCount}</p>
                        <p className="text-sm text-muted-foreground">Sent</p>
                      </div>
                      <div className="text-center p-4 bg-success-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <CheckCircle className="text-success-600" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-success-600">{selectedMessage.deliveredCount}</p>
                        <p className="text-sm text-muted-foreground">Delivered</p>
                      </div>
                      <div className="text-center p-4 bg-destructive-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <XCircle className="text-destructive-600" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-destructive-600">{selectedMessage.failedCount}</p>
                        <p className="text-sm text-muted-foreground">Failed</p>
                      </div>
                      <div className="text-center p-4 bg-warning-50 rounded-lg">
                        <div className="flex items-center justify-center mb-2">
                          <Clock className="text-warning-600" size={20} />
                        </div>
                        <p className="text-2xl font-bold text-warning-600">
                          {selectedMessage.totalRecipients - selectedMessage.sentCount}
                        </p>
                        <p className="text-sm text-muted-foreground">Pending</p>
                      </div>
                    </div>
                    
                    <div className="mt-4">
                      <div className="flex justify-between text-sm text-muted-foreground mb-2">
                        <span>Delivery Progress</span>
                        <span>{Math.round((selectedMessage.sentCount / selectedMessage.totalRecipients) * 100)}%</span>
                      </div>
                      <Progress 
                        value={(selectedMessage.sentCount / selectedMessage.totalRecipients) * 100} 
                        className="h-2"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Sender & Cost Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Sender & Cost Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Sent By</Label>
                        <div className="flex items-center space-x-3 mt-2">
                          <Avatar className="w-10 h-10">
                            {selectedMessage.sender?.firstName && selectedMessage.sender?.lastName ? (
                              <>
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedMessage.sender.firstName} ${selectedMessage.sender.lastName}`} />
                                <AvatarFallback>
                                  {selectedMessage.sender.firstName.charAt(0)}{selectedMessage.sender.lastName.charAt(0)}
                                </AvatarFallback>
                              </>
                            ) : (
                              <AvatarFallback>
                                N/A
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {selectedMessage.sender?.firstName && selectedMessage.sender?.lastName 
                                ? `${selectedMessage.sender.firstName} ${selectedMessage.sender.lastName}`
                                : 'Unknown User'
                              }
                            </p>
                            <p className="text-sm text-subtle-foreground">{(selectedMessage.sender as any)?.email || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Cost Information</Label>
                        <div className="mt-2 space-y-2">
                          {selectedMessage.cost ? (
                            <p className="text-lg font-bold text-success-600">{formatCurrency(selectedMessage.cost)}</p>
                          ) : (
                            <p className="text-subtle-foreground">Cost not available</p>
                          )}
                          <div className="text-xs font-caption text-subtle-foreground">
                            <p>SMS Count: {Math.ceil(selectedMessage.content.length / 160)}</p>
                            <p>Recipients: {selectedMessage.totalRecipients}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timestamps */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Timestamps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
                        <div className="flex items-center space-x-2 mt-1">
                          <Calendar size={16} className="text-subtle-foreground" />
                          <div>
                            <p className="text-sm">{new Date(selectedMessage.createdAt).toLocaleDateString()}</p>
                            <p className="text-xs text-subtle-foreground">{new Date(selectedMessage.createdAt).toLocaleTimeString()}</p>
                          </div>
                        </div>
                      </div>
                      {selectedMessage.completedAt && (
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Completed At</Label>
                          <div className="flex items-center space-x-2 mt-1">
                            <CheckCircle size={16} className="text-success-500" />
                            <div>
                              <p className="text-sm">{new Date(selectedMessage.completedAt).toLocaleDateString()}</p>
                              <p className="text-xs text-subtle-foreground">{new Date(selectedMessage.completedAt).toLocaleTimeString()}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>
        </div>
      </div>
      <ErrorDialogComponent />
      <DeleteConfirmationComponent />
    </AdminLayout>
  );
}