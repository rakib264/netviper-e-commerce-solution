'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import { DashboardSkeleton } from '@/components/admin/DashboardSkeleton';
import DealsShowcase from '@/components/deals/DealsShowcase';
import { useTranslation } from '@/components/providers/LocalizationProvider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  Gift,
  Moon,
  Package,
  RefreshCw,
  ShoppingBag,
  Star,
  Sun,
  TrendingUp,
  Users,
  XCircle
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis, YAxis
} from 'recharts';
import { Loader } from '@/components/ui/loader';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

// Types
interface DashboardData {
  statCards: {
    totalRevenue: number;
    deliveredRevenue: number;
    confirmedRevenue: number;
    totalOrders: number;
    activeCustomers: number;
    totalCustomers: number;
    totalProducts: number;
    totalCategories: number;
    totalCoupons: number;
    totalMessagesSent: number;
    conversionRate: number;
  };
  charts: {
    revenueOvertime: Array<{ month: string; revenue: number; orders: number }>;
    orderStatusDistribution: Array<{ name: string; count: number; value: number; color: string }>;
    customerGrowth: Array<{ month: string; customers: number }>;
    productSalesByCategory: Array<{ _id: string; sales: number; revenue: number }>;
  };
  widgets: {
    recentOrders: any[];
    recentCustomers: any[];
    lowStockProducts: any[];
    activeCoupons: any[];
    topSellingProducts: any[];
    highValueCustomers: any[];
  };
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [category, setCategory] = useState('all');
  const [customerType, setCustomerType] = useState('all');
  const [categories, setCategories] = useState<any[]>([]);
  const [now, setNow] = useState<Date>(new Date());

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      // Add date range
      const now = new Date();
      let dateFrom = new Date();
      
      switch (timeRange) {
        case '7d':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case '30d':
          dateFrom.setDate(now.getDate() - 30);
          break;
        case '90d':
          dateFrom.setDate(now.getDate() - 90);
          break;
        case '1y':
          dateFrom.setFullYear(now.getFullYear() - 1);
          break;
      }
      
      params.set('dateFrom', dateFrom.toISOString());
      params.set('dateTo', now.toISOString());
      
      if (category && category !== 'all') params.set('category', category);
      if (customerType && customerType !== 'all') params.set('customerType', customerType);

      const response = await fetch(`/api/admin/dashboard/analytics?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      
      const dashboardData = await response.json();
      setData(dashboardData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories for filtering
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(result || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [timeRange, category, customerType]);

  // Live clock for a nice time effect
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(intervalId);
  }, []);

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour < 5) return 'Good night';
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    if (hour < 21) return 'Good evening';
    return 'Good night';
  };

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    }).format(date);

  const formatDate = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    }).format(date);

  const getDayPart = (date: Date): 'morning' | 'afternoon' | 'evening' | 'night' => {
    const hour = date.getHours();
    if (hour < 5) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  const dayPart = getDayPart(now);
  const firstName = session?.user?.name?.split(' ')[0] || '';
  const headerGradient: Record<string, string> = {
    morning: 'from-warning-500/10 via-warning-500/10 to-destructive-500/10',
    afternoon: 'from-info-500/10 via-info-500/10 to-success-500/10',
    evening: 'from-primary-500/10 via-secondary-500/10 to-secondary-500/10',
    night: 'from-foreground/20 via-info-700/10 to-primary-800/10'
  };

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-success-100 text-success-700';
      case 'confirmed': return 'bg-info-100 text-info-700';
      case 'processing': return 'bg-secondary-100 text-secondary-700';
      case 'shipped': return 'bg-primary-100 text-primary-700';
      case 'pending': return 'bg-warning-100 text-warning-700';
      case 'cancelled': return 'bg-destructive-100 text-destructive-700';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={14} />;
      case 'confirmed': return <CheckCircle size={14} />;
      case 'processing': return <Clock size={14} />;
      case 'shipped': return <Package size={14} />;
      case 'pending': return <Clock size={14} />;
      case 'cancelled': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <DashboardSkeleton />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl border border-border p-4 md:p-6 shadow-sm bg-card">
          {/* Decorative gradient and glow based on time of day */}
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${headerGradient[dayPart]} opacity-50`} />
          <div className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-16 h-80 w-80 rounded-full bg-sandy/5 blur-3xl" />
          <div className="relative">
          {/* Title Section */}
          <div className="mb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {dayPart === 'morning' ? (
                    <Sun size={18} className="text-warning-500" />
                  ) : dayPart === 'night' ? (
                    <Moon size={18} className="text-info-400" />
                  ) : (
                    <Clock size={18} className="text-primary" />
                  )}
                  <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                    {getGreeting(now)}{firstName ? `, ${firstName}` : ''}
                  </h1>
                </div>
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="text-sm md:text-base text-muted-foreground"
                >
                  Here's what's happening with your store today.
                </motion.p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {session?.user?.role && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-1 text-xs font-medium border border-primary/20">
                      {session.user.role}
                    </span>
                  )}
                  <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-muted-foreground border border-border">
                    {formatDate(now)}
                  </span>
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/90 backdrop-blur px-3 py-1.5 shadow-sm"
                aria-label="Current time"
              >
                <span className="relative inline-flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                </span>
                <Clock size={14} className="text-muted-foreground" />
                <span className="text-xs font-medium text-foreground tabular-nums">
                  {formatTime(now)}
                </span>
              </motion.div>
            </div>
          </div>
          {/* Filters Section */}
          <div className="space-y-4">
            {/* Filter Label */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground">
                Filters & Controls
              </h3>
              <Button
                onClick={fetchDashboardData}
                variant="outline"
                size="sm"
                disabled={loading}
                className="h-8 px-3 text-xs font-medium border-primary text-primary hover:bg-primary/5"
              >
                {loading ? (
                  <Loader size="xs" label={null} className="mr-1.5" />
                ) : (
                  <RefreshCw size={14} className="mr-1.5" />
                )}
                Refresh
              </Button>
            </div>

            {/* Responsive Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
              {/* Time Range Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Time Range
                </label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                    <SelectItem value="90d">Last 90 days</SelectItem>
                    <SelectItem value="1y">Last year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Category
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat._id} value={cat._id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Customer Type Filter */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Customer Type
                </label>
                <Select value={customerType} onValueChange={setCustomerType}>
                  <SelectTrigger className="w-full h-9 text-sm">
                    <SelectValue placeholder="All Customers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Customers</SelectItem>
                    <SelectItem value="new">New Customers</SelectItem>
                    <SelectItem value="returning">Returning</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Quick Actions - Only visible on larger screens */}
              <div className="hidden xl:flex xl:flex-col xl:space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Quick Actions
                </label>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 text-xs flex-1"
                  >
                    Export
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-9 px-3 text-xs flex-1"
                  >
                    Settings
                  </Button>
                </div>
              </div>
            </div>

            {/* Mobile Quick Actions */}
            <div className="xl:hidden pt-2 border-t border-border">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs flex-1 bg-primary hover:bg-primary-700 text-white"
                >
                  Export Data
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs flex-1 bg-primary hover:bg-primary-700 text-white"
                >
                  View Settings
                </Button>
              </div>
            </div>
          </div>
          </div>
        </div>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative overflow-hidden border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(data?.statCards.totalRevenue || 0)}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">All time</p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-full">
                    <DollarSign size={24} className="text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Delivered Revenue */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Delivered Revenue</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {formatCurrency(data?.statCards.deliveredRevenue || 0)}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">Completed orders</p>
                  </div>
                  <div className="p-3 bg-success-100 rounded-full">
                    <CheckCircle size={24} className="text-success-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Orders */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data?.statCards.totalOrders.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">All status</p>
                  </div>
                  <div className="p-3 bg-sandy/20 rounded-full">
                    <ShoppingBag size={24} className="text-sandy" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Active Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Customers</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data?.statCards.activeCustomers.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">Last 30 days</p>
                  </div>
                  <div className="p-3 bg-info-100 rounded-full">
                    <Users size={24} className="text-info-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Customers</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data?.statCards.totalCustomers.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">Registered users</p>
                  </div>
                  <div className="p-3 bg-secondary-100 rounded-full">
                    <Users size={24} className="text-secondary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Products */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data?.statCards.totalProducts.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">Active products</p>
                  </div>
                  <div className="p-3 bg-info-100 rounded-full">
                    <Package size={24} className="text-info-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Total Coupons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Coupons</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data?.statCards.totalCoupons.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">Valid coupons</p>
                  </div>
                  <div className="p-3 bg-primary-100 rounded-full">
                    <Gift size={24} className="text-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Conversion Rate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-foreground mt-1">
                      {data?.statCards.conversionRate || 0}%
                    </p>
                    <p className="text-xs text-subtle-foreground mt-1">Orders per customer</p>
                  </div>
                  <div className="p-3 bg-warning-100 rounded-full">
                    <TrendingUp size={24} className="text-warning-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Revenue Overview</span>
                <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary/5">
                  <Link href="/admin/orders">
                    <Eye size={16} className="mr-2" />
                    View Details
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data?.charts.revenueOvertime || []}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Orders'
                    ]}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--chart-1))" 
                    fill="url(#revenueGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Order Status Distribution */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Order Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data?.charts.orderStatusDistribution || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="count"
                    >
                      {(data?.charts.orderStatusDistribution || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, 'Orders']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                {(data?.charts.orderStatusDistribution || []).map((entry) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-muted-foreground capitalize">{entry.name}</span>
                    </div>
                    <span className="text-sm font-medium text-foreground">{entry.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Growth */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Customer Growth</span>
                <Button variant="outline" size="sm" asChild className="border-primary text-primary hover:bg-primary/5">
                  <Link href="/admin/customers">
                    <Eye size={16} className="mr-2" />
                    View All
                  </Link>
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data?.charts.customerGrowth || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value) => [value, 'New Customers']} />
                  <Line 
                    type="monotone" 
                    dataKey="customers" 
                    stroke="hsl(var(--chart-3))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-3))', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Product Sales by Category */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="text-foreground">Product Sales by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.charts.productSalesByCategory || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="_id" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => [
                      name === 'revenue' ? formatCurrency(Number(value)) : value,
                      name === 'revenue' ? 'Revenue' : 'Sales'
                    ]}
                  />
                  <Bar dataKey="sales" fill="hsl(var(--chart-2))" name="sales" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Deals the storefront is advertising right now, immediately above the
            orders they are meant to move. Same component as the storefront band
            in its compact form, so the dashboard cannot describe a deal
            differently from the cart it appears in. */}
        <DealsShowcase
          variant="compact"
          autoplay={false}
          className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-5"
          heading={
            <div>
              <h2 className="font-title text-base font-semibold text-foreground">
                {t('deals.showcase.adminTitle')}
              </h2>
              <p className="font-caption text-xs text-muted-foreground">
                {t('deals.showcase.adminSubtitle')}
              </p>
            </div>
          }
          action={
            <Link
              href="/admin/marketing"
              className="font-caption text-xs font-medium text-primary hover:underline"
            >
              {t('deals.showcase.manage')}
            </Link>
          }
        />


        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <Card className="lg:col-span-2 border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Recent Orders</span>
                <Link href="/admin/orders">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(data?.widgets.recentOrders || []).slice(0, 5).map((order) => (
                  <div key={order._id} className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        {getStatusIcon(order.orderStatus)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{order.orderNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'Guest Order'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-foreground">{formatCurrency(order.total)}</p>
                      <div className="flex items-center space-x-2">
                        <Badge className={`text-xs ${getStatusColor(order.orderStatus)}`}>
                          {order.orderStatus}
                        </Badge>
                        <span className="text-xs font-caption text-subtle-foreground">{formatRelativeTime(order.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Customers */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Recent Customers</span>
                <Link href="/admin/customers">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.widgets.recentCustomers || []).slice(0, 5).map((customer) => (
                  <div key={customer._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users size={14} className="text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {customer.firstName} {customer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-subtle-foreground">{formatRelativeTime(customer.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row of Widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Alerts */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <AlertTriangle size={20} className="text-destructive-600" />
                  <span>Low Stock Alerts</span>
                </div>
                <Link href="/admin/products">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.widgets.lowStockProducts || []).slice(0, 5).map((item) => (
                  <div key={item._id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-destructive-600">{item.quantity} left</p>
                      <p className="text-xs text-subtle-foreground">Min: {item.lowStockThreshold || 10}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Coupons */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <Gift size={20} className="text-primary" />
                  <span>Active Coupons</span>
                </div>
                <Link href="/admin/coupons">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.widgets.activeCoupons || []).slice(0, 5).map((coupon) => (
                  <div key={coupon._id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-medium">{coupon.code}</span>
                      <Badge variant="outline" className="border-primary text-primary">
                        {coupon.type === 'percentage' ? `${coupon.value}%` : formatCurrency(coupon.value)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs font-caption text-muted-foreground">
                      <span>{coupon.currentUsage}/{coupon.usageLimit || '∞'} used</span>
                      <span>
                        {coupon.usageLimit 
                          ? `${Math.round((coupon.currentUsage / coupon.usageLimit) * 100)}%`
                          : '∞'
                        }
                      </span>
                    </div>
                    {coupon.usageLimit && (
                      <Progress value={(coupon.currentUsage / coupon.usageLimit) * 100} className="h-1" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Top Selling Products */}
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <Star size={20} className="text-sandy" />
                  <span>Top Products</span>
                </div>
                <Link href="/admin/products">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.widgets.topSellingProducts || []).slice(0, 5).map((product) => (
                  <div key={product._id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-sandy/20 rounded-full flex items-center justify-center">
                        <Star size={14} className="text-sandy" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.totalSales} sales</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-foreground">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* High Value Customers */}
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <div className="flex items-center space-x-2">
                  <DollarSign size={20} className="text-success-600" />
                  <span>High Value Customers</span>
                </div>
                <Link href="/admin/customers">
                  <Button variant="outline" size="sm" className="border-primary text-primary hover:bg-primary/5">
                    View All
                  </Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {(data?.widgets.highValueCustomers || []).slice(0, 5).map((customer) => (
                  <div key={customer._id} className="p-4 bg-muted rounded-lg border border-border">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
                        <DollarSign size={16} className="text-success-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {customer.customer.firstName} {customer.customer.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground">{customer.customer.email}</p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Total Spent:</span>
                        <span className="font-medium text-foreground">{formatCurrency(customer.totalSpent)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Orders:</span>
                        <span className="font-medium text-foreground">{customer.orderCount}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Avg Order:</span>
                        <span className="font-medium text-foreground">{formatCurrency(customer.averageOrderValue)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}