'use client';

import AdminLayout from '@/components/admin/AdminLayout';
import DataTable from '@/components/admin/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import DeleteConfirmationDialog from '@/components/ui/delete-confirmation-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { motion } from 'framer-motion';
import gsap from 'gsap';
import {
  AlertTriangle, BarChart3, Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Edit,
  Eye, Package,
  Phone,
  Plus, Sparkles, Truck,
  User,
  Weight,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AdminListPageSkeleton } from '@/components/admin/ui/loading';
import { formatCurrency as formatStoreCurrency } from '@/lib/currency/format';

interface Courier {
  _id: string;
  courierId: string;
  order: {
    _id: string;
    orderNumber: string;
    total: number;
  } | null;
  sender: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
  };
  receiver: {
    name: string;
    phone: string;
    address: string;
    division: string;
    district: string;
  };
  parcel: {
    type: 'regular' | 'express' | 'fragile';
    quantity: number;
    weight: number;
    value: number;
    description: string;
  };
  isCOD: boolean;
  codAmount?: number;
  isFragile: boolean;
  charges: {
    deliveryCharge: number;
    codCharge: number;
    totalCharge: number;
  };
  status: 'pending' | 'picked' | 'in_transit' | 'delivered' | 'returned' | 'cancelled';
  trackingNumber?: string;
  courierPartner?: string;
  pickupDate?: string;
  deliveryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface CourierFormData {
  orderId: string;
  senderName: string;
  senderPhone: string;
  senderAddress: string;
  senderDivision: string;
  senderDistrict: string;
  receiverName: string;
  receiverPhone: string;
  receiverAddress: string;
  receiverDivision: string;
  receiverDistrict: string;
  parcelType: 'regular' | 'express' | 'fragile';
  quantity: number;
  weight: number;
  value: number;
  description: string;
  isCOD: boolean;
  codAmount: number;
  isFragile: boolean;
  deliveryCharge: number;
  codCharge: number;
  courierPartner: string;
  notes: string;
  status: 'pending' | 'picked' | 'in_transit' | 'delivered' | 'returned' | 'cancelled';
  trackingNumber: string;
}

export default function AdminCourier() {
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [trackingOpen, setTrackingOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState<Courier | null>(null);
  const [courierSettings, setCourierSettings] = useState<any>(null);
  
  // New modal states
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courierToDelete, setCourierToDelete] = useState<Courier | null>(null);
  const [courierToView, setCourierToView] = useState<Courier | null>(null);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [couriersToDelete, setCouriersToDelete] = useState<Courier[]>([]);
  
  const [formData, setFormData] = useState<CourierFormData>({
    orderId: '',
    senderName: process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart',
    senderPhone: '+8801234567890',
    senderAddress: '123 Technology Street',
    senderDivision: 'Dhaka',
    senderDistrict: 'Dhaka',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    receiverDivision: '',
    receiverDistrict: '',
    parcelType: 'regular',
    quantity: 1,
    weight: 0,
    value: 0,
    description: '',
    isCOD: false,
    codAmount: 0,
    isFragile: false,
    deliveryCharge: 60,
    codCharge: 0,
    courierPartner: '',
    notes: '',
    status: 'pending',
    trackingNumber: ''
  });

  useEffect(() => {
    fetchCouriers();
    fetchCourierSettings();
  }, []);

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

  const fetchCourierSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings/courier');
      if (response.ok) {
        const settings = await response.json();
        setCourierSettings(settings);
        // Update form data with settings
        setFormData(prev => ({
          ...prev,
          senderName: settings.senderInfo?.name || prev.senderName,
          senderPhone: settings.senderInfo?.phone || prev.senderPhone,
          senderAddress: settings.senderInfo?.address || prev.senderAddress,
          senderDivision: settings.senderInfo?.division || prev.senderDivision,
          senderDistrict: settings.senderInfo?.district || prev.senderDistrict,
          courierPartner: settings.defaultCourierPartners?.[0] || prev.courierPartner,
        }));
      }
    } catch (error) {
      console.error('Error fetching courier settings:', error);
    }
  };

  const fetchCouriers = async () => {
    try {
      const response = await fetch('/api/admin/courier');
      const data = await response.json();
      // Filter out any invalid courier records
      const validCouriers = (data.couriers || []).filter((courier: any) => 
        courier && 
        courier.courierId && 
        courier.parcel && 
        courier.receiver && 
        courier.sender
      );
      setCouriers(validCouriers);
    } catch (error) {
      console.error('Error fetching couriers:', error);
      setCouriers([]);
    } finally {
      setLoading(false);
    }
  };

  const generateCourierId = () => {
    return `CR${Date.now().toString().slice(-8)}`;
  };

  const calculateCharges = () => {
    if (!courierSettings) return;
    
    let deliveryCharge = 60; // Default fallback
    const isWithinDhaka = formData.receiverDivision?.toLowerCase().includes('dhaka') || 
                         formData.receiverDistrict?.toLowerCase().includes('dhaka');
    
    // Calculate delivery charge based on type and location
    if (formData.parcelType === 'regular') {
      deliveryCharge = isWithinDhaka ? 
        courierSettings.deliveryCharges.regularWithinDhaka : 
        courierSettings.deliveryCharges.regularOutsideDhaka;
    } else if (formData.parcelType === 'express') {
      deliveryCharge = isWithinDhaka ? 
        courierSettings.deliveryCharges.expressWithinDhaka : 
        courierSettings.deliveryCharges.expressOutsideDhaka;
    }
    
    // Add fragile handling charge
    if (formData.isFragile) {
      deliveryCharge += courierSettings.deliveryCharges.fragileHandlingCharge;
    }
    
    // Weight-based charges (if enabled)
    if (courierSettings.weightBasedCharging && formData.weight > 1) {
      deliveryCharge += Math.ceil(formData.weight - 1) * 10;
    }
    
    // COD charges
    let codCharge = 0;
    if (formData.isCOD && formData.codAmount > 0) {
      codCharge = Math.max(10, (formData.codAmount * courierSettings.codChargeRate) / 100);
    }
    
    setFormData(prev => ({
      ...prev,
      deliveryCharge,
      codCharge
    }));
  };

  useEffect(() => {
    calculateCharges();
  }, [formData.parcelType, formData.isFragile, formData.weight, formData.isCOD, formData.codAmount, formData.receiverDivision, formData.receiverDistrict, courierSettings]);

  const resetForm = () => {
    setFormData({
      orderId: '',
      senderName: courierSettings?.senderInfo?.name || process.env.NEXT_PUBLIC_SITE_NAME || 'Muscari Mart',
      senderPhone: courierSettings?.senderInfo?.phone || '+8801234567890',
      senderAddress: courierSettings?.senderInfo?.address || '123 Technology Street',
      senderDivision: courierSettings?.senderInfo?.division || 'Dhaka',
      senderDistrict: courierSettings?.senderInfo?.district || 'Dhaka',
      receiverName: '',
      receiverPhone: '',
      receiverAddress: '',
      receiverDivision: '',
      receiverDistrict: '',
      parcelType: 'regular',
      quantity: 1,
      weight: 0,
      value: 0,
      description: '',
      isCOD: false,
      codAmount: 0,
      isFragile: false,
      deliveryCharge: 60,
      codCharge: 0,
      courierPartner: courierSettings?.defaultCourierPartners?.[0] || '',
      notes: '',
      status: 'pending',
      trackingNumber: ''
    });
    setEditingCourier(null);
  };

  const handleEdit = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      orderId: courier.order?._id || '',
      senderName: courier.sender.name,
      senderPhone: courier.sender.phone,
      senderAddress: courier.sender.address,
      senderDivision: courier.sender.division,
      senderDistrict: courier.sender.district,
      receiverName: courier.receiver.name,
      receiverPhone: courier.receiver.phone,
      receiverAddress: courier.receiver.address,
      receiverDivision: courier.receiver.division,
      receiverDistrict: courier.receiver.district,
      parcelType: courier.parcel.type,
      quantity: courier.parcel.quantity,
      weight: courier.parcel.weight,
      value: courier.parcel.value,
      description: courier.parcel.description,
      isCOD: courier.isCOD,
      codAmount: courier.codAmount || 0,
      isFragile: courier.isFragile,
      deliveryCharge: courier.charges.deliveryCharge,
      codCharge: courier.charges.codCharge,
      courierPartner: courier.courierPartner || '',
      notes: courier.notes || '',
      status: courier.status,
      trackingNumber: courier.trackingNumber || ''
    });
    setDialogOpen(true);
  };

  // New action handlers
  const handleView = (courier: Courier) => {
    setCourierToView(courier);
    setViewModalOpen(true);
  };

  const handleUpdate = (courier: Courier) => {
    setEditingCourier(courier);
    setFormData({
      orderId: courier.order?._id || '',
      senderName: courier.sender.name,
      senderPhone: courier.sender.phone,
      senderAddress: courier.sender.address,
      senderDivision: courier.sender.division,
      senderDistrict: courier.sender.district,
      receiverName: courier.receiver.name,
      receiverPhone: courier.receiver.phone,
      receiverAddress: courier.receiver.address,
      receiverDivision: courier.receiver.division,
      receiverDistrict: courier.receiver.district,
      parcelType: courier.parcel.type,
      quantity: courier.parcel.quantity,
      weight: courier.parcel.weight,
      value: courier.parcel.value,
      description: courier.parcel.description,
      isCOD: courier.isCOD,
      codAmount: courier.codAmount || 0,
      isFragile: courier.isFragile,
      deliveryCharge: courier.charges.deliveryCharge,
      codCharge: courier.charges.codCharge,
      courierPartner: courier.courierPartner || '',
      notes: courier.notes || '',
      status: courier.status,
      trackingNumber: courier.trackingNumber || ''
    });
    setUpdateModalOpen(true);
  };

  const handleDelete = (courier: Courier) => {
    setCourierToDelete(courier);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!courierToDelete) return;
    
    try {
      const response = await fetch(`/api/admin/courier/${courierToDelete._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchCouriers();
        setDeleteModalOpen(false);
        setCourierToDelete(null);
      } else {
        const errorData = await response.json();
        alert('Error deleting courier: ' + (errorData.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting courier:', error);
      alert('Error deleting courier: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCourier 
        ? `/api/admin/courier/${editingCourier._id}`
        : '/api/admin/courier';
      
      const method = editingCourier ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          courierId: editingCourier?.courierId || generateCourierId()
        })
      });

      if (response.ok) {
        fetchCouriers();
        setDialogOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error saving courier:', error);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCourier) return;
    
    try {
      const response = await fetch(`/api/admin/courier/${editingCourier._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          courierId: editingCourier.courierId
        })
      });

      if (response.ok) {
        fetchCouriers();
        setUpdateModalOpen(false);
        resetForm();
      }
    } catch (error) {
      console.error('Error updating courier:', error);
    }
  };

  const updateStatus = async (courierId: string, status: string) => {
    try {
      const response = await fetch(`/api/admin/courier/${courierId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchCouriers();
      }
    } catch (error) {
      console.error('Error updating courier status:', error);
    }
  };

  // Delegates to the central formatter, so this reads the store's
  // configured currency instead of a hardcoded BDT/en-BD pair.
  const formatCurrency = (amount: number) => formatStoreCurrency(amount, { minimumFractionDigits: 0 });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-success-100 text-success-800 border-success-200';
      case 'in_transit': return 'bg-info-100 text-info-800 border-info-200';
      case 'picked': return 'bg-primary-100 text-primary-800 border-primary-200';
      case 'pending': return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'returned': return 'bg-warning-100 text-warning-800 border-warning-200';
      case 'cancelled': return 'bg-destructive-100 text-destructive-800 border-destructive-200';
      default: return 'bg-accent text-foreground border-border';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'delivered': return <CheckCircle size={14} className="text-success-600" />;
      case 'in_transit': return <Truck size={14} className="text-info-600" />;
      case 'picked': return <Package size={14} className="text-primary-600" />;
      case 'pending': return <Clock size={14} className="text-warning-600" />;
      case 'returned': return <AlertTriangle size={14} className="text-warning-600" />;
      case 'cancelled': return <XCircle size={14} className="text-destructive-600" />;
      default: return <Clock size={14} className="text-muted-foreground" />;
    }
  };

  const getStatusProgress = (status: string) => {
    const statusOrder = ['pending', 'picked', 'in_transit', 'delivered'];
    const currentIndex = statusOrder.indexOf(status);
    return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
  };

  const columns = [
    {
      key: 'courierId',
      label: 'Courier ID',
      sortable: true,
      render: (value: string, row: Courier) => {
        if (!row || !value) return <span>N/A</span>;
        return (
          <div>
            <p className="font-mono font-medium">{value}</p>
            <p className="text-sm text-subtle-foreground">{row.order?.orderNumber || 'N/A'}</p>
          </div>
        );
      }
    },
    {
      key: 'receiver',
      label: 'Receiver',
      render: (value: any) => {
        if (!value) return <span>N/A</span>;
        return (
          <div>
            <p className="font-medium">{value.name || 'N/A'}</p>
            <p className="text-sm text-subtle-foreground">{value.phone || 'N/A'}</p>
            <p className="text-sm text-subtle-foreground">{value.division || 'N/A'}, {value.district || 'N/A'}</p>
          </div>
        );
      }
    },
    {
      key: 'parcel',
      label: 'Parcel',
      render: (value: any, row: Courier) => {
        if (!value || !row) return <span>N/A</span>;
        return (
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <Badge variant="outline" className="capitalize">
                {value.type || 'N/A'}
              </Badge>
              {row.isCOD && <Badge variant="secondary">COD</Badge>}
              {row.isFragile && <Badge variant="destructive">Fragile</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              {value.quantity || 0} items • {value.weight || 0}kg
            </p>
            <p className="text-sm text-muted-foreground">
              Value: {formatCurrency(value.value || 0)}
            </p>
          </div>
        );
      }
    },
    {
      key: 'charges',
      label: 'Charges',
      render: (value: any, row: Courier) => {
        if (!value || !row) return <span>N/A</span>;
        return (
          <div>
            <p className="font-medium">{formatCurrency(value.totalCharge || 0)}</p>
            <p className="text-sm text-subtle-foreground">
              Delivery: {formatCurrency(value.deliveryCharge || 0)}
            </p>
            {row.isCOD && (
              <p className="text-sm text-subtle-foreground">
                COD: {formatCurrency(value.codCharge || 0)}
              </p>
            )}
          </div>
        );
      }
    },
    {
      key: 'status',
      label: 'Status & Progress',
      filterable: true,
      render: (value: string, row: Courier) => {
        if (!value || !row) return <span>N/A</span>;
        return (
          <div className="space-y-2">
            <Badge className={`${getStatusColor(value)} flex items-center space-x-1 border`}>
              {getStatusIcon(value)}
              <span className="capitalize">{value.replace('_', ' ')}</span>
            </Badge>
            {!['returned', 'cancelled'].includes(value) && (
              <div className="w-full bg-border rounded-full h-1.5">
                <div 
                  className="bg-info-500 h-1.5 rounded-full transition-all duration-300" 
                  style={{ width: `${getStatusProgress(value)}%` }}
                ></div>
              </div>
            )}
            {row.trackingNumber && (
              <div className="text-xs font-caption text-subtle-foreground font-mono">
                {row.trackingNumber}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'courierPartner',
      label: 'Partner',
      render: (value: string) => (
        value ? (
          <Badge variant="outline">{value}</Badge>
        ) : (
          <span className="text-subtle-foreground">Not assigned</span>
        )
      )
    },
    {
      key: 'trackingNumber',
      label: 'Tracking',
      render: (value: string) => (
        value ? (
          <span className="font-mono text-sm">{value}</span>
        ) : (
          <span className="text-subtle-foreground">-</span>
        )
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-subtle-foreground">
          {new Date(value).toLocaleDateString()}
        </span>
      )
    }
  ];

  // Transform data to flatten nested properties for filtering
  const transformedCouriers = useMemo(() => {
    return couriers.filter(courier => courier && courier.parcel).map(courier => ({
      ...courier,
      parcelType: courier.parcel.type, // Flatten parcel.type to parcelType
      // Ensure order is properly handled
      order: courier.order || null,
    }));
  }, [couriers]);

  const filters = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { label: 'Pending', value: 'pending' },
        { label: 'Picked', value: 'picked' },
        { label: 'In Transit', value: 'in_transit' },
        { label: 'Delivered', value: 'delivered' },
        { label: 'Returned', value: 'returned' },
        { label: 'Cancelled', value: 'cancelled' }
      ]
    },
    {
      key: 'courierPartner',
      label: 'Delivery Partner',
      options: [
        { label: 'Steadfast', value: 'steadfast' },
        { label: 'Pathao', value: 'pathao' },
        { label: 'RedX', value: 'redx' },
        { label: 'Paperfly', value: 'paperfly' },
        { label: 'Sundarban', value: 'sundarban' }
      ]
    },
    {
      type: 'boolean' as const,
      key: 'isCOD',
      label: 'Payment Method',
      trueLabel: 'Cash on Delivery',
      falseLabel: 'Prepaid'
    },
    {
      key: 'parcelType',
      label: 'Parcel Type',
      options: [
        { label: 'Regular', value: 'regular' },
        { label: 'Express', value: 'express' },
        { label: 'Fragile', value: 'fragile' }
      ]
    },
    {
      type: 'boolean' as const,
      key: 'isFragile',
      label: 'Fragile Items',
      trueLabel: 'Yes',
      falseLabel: 'No'
    }
  ];

  const handleBulkStatusUpdate = async (selectedRows: Courier[], status: string) => {
    try {
      const courierIds = selectedRows.map(courier => courier._id);
      const response = await fetch('/api/admin/courier/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierIds, status })
      });

      if (response.ok) {
        fetchCouriers();
      } else {
        throw new Error('Failed to update courier statuses');
      }
    } catch (error) {
      console.error('Error updating courier statuses:', error);
    }
  };

  const handleBulkDelete = async (selectedRows: Courier[]) => {
    setCouriersToDelete(selectedRows);
    setBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    try {
      const courierIds = couriersToDelete.map(courier => courier._id);
      const response = await fetch('/api/admin/courier/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ courierIds })
      });

      if (response.ok) {
        fetchCouriers();
        setBulkDeleteModalOpen(false);
        setCouriersToDelete([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete couriers');
      }
    } catch (error) {
      console.error('Error deleting couriers:', error);
      alert('Error deleting couriers: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const exportSelectedCouriers = (selectedRows: Courier[]) => {
    const headers = [
      'Courier ID',
      'Order Number', 
      'Receiver Name',
      'Receiver Phone',
      'Receiver Address',
      'Status',
      'Delivery Partner',
      'Parcel Type',
      'Weight (kg)',
      'Value (BDT)',
      'Delivery Charge',
      'COD Amount',
      'Total Charge',
      'Created At'
    ];

    const rows = selectedRows.map(courier => [
      courier.courierId,
      courier.order?.orderNumber || 'N/A',
      courier.receiver.name,
      courier.receiver.phone,
      `${courier.receiver.address}, ${courier.receiver.district}, ${courier.receiver.division}`,
      courier.status,
      courier.courierPartner || 'Not assigned',
      courier.parcel.type,
      courier.parcel.weight,
      courier.parcel.value,
      courier.charges.deliveryCharge,
      courier.isCOD ? (courier.codAmount || 0) : 0,
      courier.charges.totalCharge,
      new Date(courier.createdAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `couriers-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const bulkActions = [
    {
      label: 'Mark as Picked',
      action: (selectedRows: Courier[]) => handleBulkStatusUpdate(selectedRows, 'picked'),
      condition: (selectedRows: Courier[]) => selectedRows.some(c => c.status === 'pending')
    },
    {
      label: 'Mark as In Transit',
      action: (selectedRows: Courier[]) => handleBulkStatusUpdate(selectedRows, 'in_transit'),
      condition: (selectedRows: Courier[]) => selectedRows.some(c => ['pending', 'picked'].includes(c.status))
    },
    {
      label: 'Mark as Delivered',
      action: (selectedRows: Courier[]) => handleBulkStatusUpdate(selectedRows, 'delivered'),
      condition: (selectedRows: Courier[]) => selectedRows.some(c => ['picked', 'in_transit'].includes(c.status))
    },
    {
      label: 'Mark as Returned',
      action: (selectedRows: Courier[]) => handleBulkStatusUpdate(selectedRows, 'returned'),
      variant: 'destructive' as 'destructive',
      condition: (selectedRows: Courier[]) => selectedRows.some(c => ['picked', 'in_transit'].includes(c.status))
    },
    {
      label: 'Delete Selected',
      action: handleBulkDelete,
      variant: 'destructive' as 'destructive',
      condition: (selectedRows: Courier[]) => selectedRows.length > 0 && selectedRows.every(c => !['in_transit', 'delivered'].includes(c.status))
    },
    {
      label: 'Export Selected',
      action: (selectedRows: Courier[]) => {
        exportSelectedCouriers(selectedRows);
      }
    }
  ];

  // Calculate stats
  const stats = {
    total: couriers?.length || 0,
    pending: couriers?.filter(c => c.status === 'pending')?.length || 0,
    picked: couriers?.filter(c => c.status === 'picked')?.length || 0,
    inTransit: couriers?.filter(c => c.status === 'in_transit')?.length || 0,
    delivered: couriers?.filter(c => c.status === 'delivered')?.length || 0,
    returned: couriers?.filter(c => c.status === 'returned')?.length || 0,
    cancelled: couriers?.filter(c => c.status === 'cancelled')?.length || 0,
    cod: couriers?.filter(c => c.isCOD)?.length || 0,
    totalRevenue: couriers?.reduce((sum, courier) => sum + (courier.charges?.totalCharge || 0), 0) || 0,
    averageDeliveryTime: 0, // This would be calculated from delivery data
    onTimeDeliveryRate: 0, // This would be calculated from delivery performance
  };

  if (loading) {
    return (
      <AdminLayout>
        <AdminListPageSkeleton rows={8} columns={6} />
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
                    <Truck className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                      Courier Management
                    </h1>
                    <p className="text-info-100 text-lg">
                      Manage deliveries and track shipments with precision
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 mt-6">
                  <div className="flex items-center gap-2 bg-card/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <Sparkles className="text-warning-300" size={16} />
                    <span className="text-white font-medium">Real-time Tracking</span>
                  </div>
                  <div className="flex items-center gap-2 bg-card/20 backdrop-blur-sm rounded-lg px-4 py-2">
                    <BarChart3 className="text-success-300" size={16} />
                    <span className="text-white font-medium">Delivery Analytics</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      onClick={resetForm}
                      className="bg-card/20 hover:bg-card/30 backdrop-blur-sm border border-white/30 text-white hover:text-white transition-all duration-300"
                    >
                      <Plus size={16} className="mr-2" />
                      <span className="hidden sm:inline">Create Courier</span>
                      <span className="sm:hidden">Create</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
                    <DialogHeader>
                      <DialogTitle>
                        {editingCourier ? 'Edit Courier' : 'Create New Courier'}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Order Selection */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Order Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div>
                            <Label htmlFor="orderId">Order ID</Label>
                            <Input
                              id="orderId"
                              value={formData.orderId}
                              onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                              placeholder="Select or enter order ID"
                              required
                            />
                          </div>
                        </CardContent>
                      </Card>

                      {/* Sender & Receiver */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Sender Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="senderName">Name</Label>
                              <Input
                                id="senderName"
                                value={formData.senderName}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="senderPhone">Phone</Label>
                              <Input
                                id="senderPhone"
                                value={formData.senderPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderPhone: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="senderAddress">Address</Label>
                              <Textarea
                                id="senderAddress"
                                value={formData.senderAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, senderAddress: e.target.value }))}
                                rows={2}
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="senderDivision">Division</Label>
                                <Input
                                  id="senderDivision"
                                  value={formData.senderDivision}
                                  onChange={(e) => setFormData(prev => ({ ...prev, senderDivision: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="senderDistrict">District</Label>
                                <Input
                                  id="senderDistrict"
                                  value={formData.senderDistrict}
                                  onChange={(e) => setFormData(prev => ({ ...prev, senderDistrict: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Receiver Information</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="receiverName">Name</Label>
                              <Input
                                id="receiverName"
                                value={formData.receiverName}
                                onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="receiverPhone">Phone</Label>
                              <Input
                                id="receiverPhone"
                                value={formData.receiverPhone}
                                onChange={(e) => setFormData(prev => ({ ...prev, receiverPhone: e.target.value }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="receiverAddress">Address</Label>
                              <Textarea
                                id="receiverAddress"
                                value={formData.receiverAddress}
                                onChange={(e) => setFormData(prev => ({ ...prev, receiverAddress: e.target.value }))}
                                rows={2}
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label htmlFor="receiverDivision">Division</Label>
                                <Input
                                  id="receiverDivision"
                                  value={formData.receiverDivision}
                                  onChange={(e) => setFormData(prev => ({ ...prev, receiverDivision: e.target.value }))}
                                  required
                                />
                              </div>
                              <div>
                                <Label htmlFor="receiverDistrict">District</Label>
                                <Input
                                  id="receiverDistrict"
                                  value={formData.receiverDistrict}
                                  onChange={(e) => setFormData(prev => ({ ...prev, receiverDistrict: e.target.value }))}
                                  required
                                />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Parcel Details */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">Parcel Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                              <Label htmlFor="parcelType">Type</Label>
                              <Select value={formData.parcelType} onValueChange={(value: 'regular' | 'express' | 'fragile') => setFormData(prev => ({ ...prev, parcelType: value }))}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="regular">Regular</SelectItem>
                                  <SelectItem value="express">Express</SelectItem>
                                  <SelectItem value="fragile">Fragile</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="quantity">Quantity</Label>
                              <Input
                                id="quantity"
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="weight">Weight (kg)</Label>
                              <Input
                                id="weight"
                                type="number"
                                step="0.1"
                                value={formData.weight}
                                onChange={(e) => setFormData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="value">Value (BDT)</Label>
                              <Input
                                id="value"
                                type="number"
                                value={formData.value}
                                onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                                required
                              />
                            </div>
                          </div>

                          <div>
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              value={formData.description}
                              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                              placeholder="Describe the parcel contents"
                              rows={2}
                              required
                            />
                          </div>

                          <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="isCOD"
                                checked={formData.isCOD}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCOD: checked }))}
                              />
                              <Label htmlFor="isCOD">Cash on Delivery</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Switch
                                id="isFragile"
                                checked={formData.isFragile}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFragile: checked }))}
                              />
                              <Label htmlFor="isFragile">Fragile</Label>
                            </div>
                          </div>

                          {formData.isCOD && (
                            <div>
                              <Label htmlFor="codAmount">COD Amount (BDT)</Label>
                              <Input
                                id="codAmount"
                                type="number"
                                value={formData.codAmount}
                                onChange={(e) => setFormData(prev => ({ ...prev, codAmount: Number(e.target.value) }))}
                                required
                              />
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Charges & Partner */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Charges</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="deliveryCharge">Delivery Charge</Label>
                              <Input
                                id="deliveryCharge"
                                type="number"
                                value={formData.deliveryCharge}
                                onChange={(e) => setFormData(prev => ({ ...prev, deliveryCharge: Number(e.target.value) }))}
                                required
                              />
                            </div>
                            {formData.isCOD && (
                              <div>
                                <Label htmlFor="codCharge">COD Charge</Label>
                                <Input
                                  id="codCharge"
                                  type="number"
                                  value={formData.codCharge}
                                  onChange={(e) => setFormData(prev => ({ ...prev, codCharge: Number(e.target.value) }))}
                                  required
                                />
                              </div>
                            )}
                            <div className="pt-2 border-t">
                              <div className="flex justify-between font-medium">
                                <span>Total Charge:</span>
                                <span>{formatCurrency(formData.deliveryCharge + formData.codCharge)}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Courier Partner</CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div>
                              <Label htmlFor="courierPartner">Partner</Label>
                              <Select value={formData.courierPartner} onValueChange={(value) => setFormData(prev => ({ ...prev, courierPartner: value }))}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select courier partner" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="steadfast">Steadfast</SelectItem>
                                  <SelectItem value="pathao">Pathao</SelectItem>
                                  <SelectItem value="redx">RedX</SelectItem>
                                  <SelectItem value="paperfly">Paperfly</SelectItem>
                                  <SelectItem value="sundarban">Sundarban</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="notes">Notes</Label>
                              <Textarea
                                id="notes"
                                value={formData.notes}
                                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="Additional notes or instructions"
                                rows={3}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">
                          {editingCourier ? 'Update' : 'Create'} Courier
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <div ref={statsRef} className="px-6 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
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
                      <p className="text-sm font-medium text-muted-foreground mb-1">Total Shipments</p>
                      <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-info-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">All time</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-info-500 to-info-600 rounded-2xl shadow-lg">
                      <Package className="text-white" size={24} />
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
                      <p className="text-sm font-medium text-muted-foreground mb-1">Pending</p>
                      <p className="text-3xl font-bold text-foreground">{stats.pending}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-warning-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Awaiting pickup</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-warning-500 to-warning-500 rounded-2xl shadow-lg">
                      <Clock className="text-white" size={24} />
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
                      <p className="text-sm font-medium text-muted-foreground mb-1">In Transit</p>
                      <p className="text-3xl font-bold text-foreground">{stats.inTransit}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-primary-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">On the way</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                      <Truck className="text-white" size={24} />
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
                      <p className="text-sm font-medium text-muted-foreground mb-1">Delivered</p>
                      <p className="text-3xl font-bold text-foreground">{stats.delivered}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Completed</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl shadow-lg">
                      <CheckCircle className="text-white" size={24} />
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
                      <p className="text-sm font-medium text-muted-foreground mb-1">Returned</p>
                      <p className="text-3xl font-bold text-foreground">{stats.returned}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-warning-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Back to sender</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-warning-500 to-destructive-500 rounded-2xl shadow-lg">
                      <AlertTriangle className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="group"
            >
              <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:scale-105">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-muted-foreground mb-1">COD Orders</p>
                      <p className="text-3xl font-bold text-foreground">{stats.cod}</p>
                      <div className="flex items-center mt-2">
                        <div className="w-2 h-2 bg-success-500 rounded-full mr-2"></div>
                        <span className="text-xs font-caption text-subtle-foreground">Cash on delivery</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-success-500 to-success-600 rounded-2xl shadow-lg">
                      <CreditCard className="text-white" size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Enhanced Couriers Table */}
        <div className="px-6 pb-8">
          <Card className="bg-card/70 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-muted to-accent rounded-t-xl">
              <CardTitle className="text-xl font-semibold text-foreground">Courier Database</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <DataTable
                data={transformedCouriers}
                columns={columns}
                filters={filters}
                bulkActions={bulkActions}
                selectable
                exportable
                onRowClick={(courier) => handleView(courier)}
                onView={handleView}
                onEdit={handleUpdate}
                onDelete={handleDelete}
              />
            </CardContent>
          </Card>
        </div>

        {/* View Courier Modal */}
        <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Eye size={20} />
                <span>Courier Details - {courierToView?.courierId}</span>
              </DialogTitle>
            </DialogHeader>
            {courierToView && (
              <div className="space-y-6">
                {/* Order Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Package size={16} />
                      <span>Order Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Order Number</Label>
                      <p className="font-medium">{courierToView.order?.orderNumber || 'N/A'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Order Total</Label>
                      <p className="font-medium">{courierToView.order?.total ? formatCurrency(courierToView.order.total) : 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Sender & Receiver Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <User size={16} />
                        <span>Sender Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{courierToView.sender.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium flex items-center space-x-2">
                          <Phone size={14} />
                          <span>{courierToView.sender.phone}</span>
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <p className="font-medium">{courierToView.sender.address}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Location</Label>
                        <p className="font-medium">{courierToView.sender.division}, {courierToView.sender.district}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <User size={16} />
                        <span>Receiver Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Name</Label>
                        <p className="font-medium">{courierToView.receiver.name}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Phone</Label>
                        <p className="font-medium flex items-center space-x-2">
                          <Phone size={14} />
                          <span>{courierToView.receiver.phone}</span>
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Address</Label>
                        <p className="font-medium">{courierToView.receiver.address}</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Location</Label>
                        <p className="font-medium">{courierToView.receiver.division}, {courierToView.receiver.district}</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Parcel Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center space-x-2">
                      <Package size={16} />
                      <span>Parcel Details</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <Label className="text-muted-foreground">Type</Label>
                        <Badge variant="outline" className="capitalize">
                          {courierToView.parcel.type}
                        </Badge>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Quantity</Label>
                        <p className="font-medium">{courierToView.parcel.quantity} items</p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Weight</Label>
                        <p className="font-medium flex items-center space-x-1">
                          <Weight size={14} />
                          <span>{courierToView.parcel.weight} kg</span>
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">Value</Label>
                        <p className="font-medium">{formatCurrency(courierToView.parcel.value)}</p>
                      </div>
                    </div>
                    <div className="mb-4">
                      <Label className="text-muted-foreground">Description</Label>
                      <p className="font-medium">{courierToView.parcel.description}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {courierToView.isCOD && (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <CreditCard size={14} />
                          <span>COD: {formatCurrency(courierToView.codAmount || 0)}</span>
                        </Badge>
                      )}
                      {courierToView.isFragile && (
                        <Badge variant="destructive">Fragile</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Charges & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <CreditCard size={16} />
                        <span>Charges</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Delivery Charge:</span>
                        <span className="font-medium">{formatCurrency(courierToView.charges.deliveryCharge)}</span>
                      </div>
                      {courierToView.isCOD && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">COD Charge:</span>
                          <span className="font-medium">{formatCurrency(courierToView.charges.codCharge)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold text-lg border-t pt-3">
                        <span>Total Charge:</span>
                        <span>{formatCurrency(courierToView.charges.totalCharge)}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center space-x-2">
                        <Truck size={16} />
                        <span>Delivery Details</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-muted-foreground">Status</Label>
                        <Badge className={`${getStatusColor(courierToView.status)} flex items-center space-x-1 border w-fit mt-1`}>
                          {getStatusIcon(courierToView.status)}
                          <span className="capitalize">{courierToView.status.replace('_', ' ')}</span>
                        </Badge>
                      </div>
                      {courierToView.courierPartner && (
                        <div>
                          <Label className="text-muted-foreground">Courier Partner</Label>
                          <p className="font-medium">{courierToView.courierPartner}</p>
                        </div>
                      )}
                      {courierToView.trackingNumber && (
                        <div>
                          <Label className="text-muted-foreground">Tracking Number</Label>
                          <p className="font-mono font-medium">{courierToView.trackingNumber}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-muted-foreground">Created At</Label>
                        <p className="font-medium flex items-center space-x-2">
                          <Calendar size={14} />
                          <span>{new Date(courierToView.createdAt).toLocaleDateString()}</span>
                        </p>
                      </div>
                      {courierToView.notes && (
                        <div>
                          <Label className="text-muted-foreground">Notes</Label>
                          <p className="font-medium">{courierToView.notes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Courier Modal */}
        <Dialog open={updateModalOpen} onOpenChange={setUpdateModalOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-card">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Edit size={20} />
                <span>Update Courier - {editingCourier?.courierId}</span>
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdateSubmit} className="space-y-6">
              {/* Order Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Order Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <Label htmlFor="orderId">Order ID</Label>
                    <Input
                      id="orderId"
                      value={formData.orderId}
                      onChange={(e) => setFormData(prev => ({ ...prev, orderId: e.target.value }))}
                      placeholder="Select or enter order ID"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Sender & Receiver */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sender Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="senderName">Name</Label>
                      <Input
                        id="senderName"
                        value={formData.senderName}
                        onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="senderPhone">Phone</Label>
                      <Input
                        id="senderPhone"
                        value={formData.senderPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, senderPhone: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="senderAddress">Address</Label>
                      <Textarea
                        id="senderAddress"
                        value={formData.senderAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, senderAddress: e.target.value }))}
                        rows={2}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="senderDivision">Division</Label>
                        <Input
                          id="senderDivision"
                          value={formData.senderDivision}
                          onChange={(e) => setFormData(prev => ({ ...prev, senderDivision: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="senderDistrict">District</Label>
                        <Input
                          id="senderDistrict"
                          value={formData.senderDistrict}
                          onChange={(e) => setFormData(prev => ({ ...prev, senderDistrict: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Receiver Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="receiverName">Name</Label>
                      <Input
                        id="receiverName"
                        value={formData.receiverName}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="receiverPhone">Phone</Label>
                      <Input
                        id="receiverPhone"
                        value={formData.receiverPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiverPhone: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="receiverAddress">Address</Label>
                      <Textarea
                        id="receiverAddress"
                        value={formData.receiverAddress}
                        onChange={(e) => setFormData(prev => ({ ...prev, receiverAddress: e.target.value }))}
                        rows={2}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="receiverDivision">Division</Label>
                        <Input
                          id="receiverDivision"
                          value={formData.receiverDivision}
                          onChange={(e) => setFormData(prev => ({ ...prev, receiverDivision: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="receiverDistrict">District</Label>
                        <Input
                          id="receiverDistrict"
                          value={formData.receiverDistrict}
                          onChange={(e) => setFormData(prev => ({ ...prev, receiverDistrict: e.target.value }))}
                          required
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Parcel Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Parcel Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <Label htmlFor="parcelType">Type</Label>
                      <Select value={formData.parcelType} onValueChange={(value: 'regular' | 'express' | 'fragile') => setFormData(prev => ({ ...prev, parcelType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="regular">Regular</SelectItem>
                          <SelectItem value="express">Express</SelectItem>
                          <SelectItem value="fragile">Fragile</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input
                        id="quantity"
                        type="number"
                        value={formData.quantity}
                        onChange={(e) => setFormData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="weight">Weight (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        step="0.1"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: Number(e.target.value) }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="value">Value (BDT)</Label>
                      <Input
                        id="value"
                        type="number"
                        value={formData.value}
                        onChange={(e) => setFormData(prev => ({ ...prev, value: Number(e.target.value) }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe the parcel contents"
                      rows={2}
                      required
                    />
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isCOD"
                        checked={formData.isCOD}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isCOD: checked }))}
                      />
                      <Label htmlFor="isCOD">Cash on Delivery</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="isFragile"
                        checked={formData.isFragile}
                        onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isFragile: checked }))}
                      />
                      <Label htmlFor="isFragile">Fragile</Label>
                    </div>
                  </div>

                  {formData.isCOD && (
                    <div>
                      <Label htmlFor="codAmount">COD Amount (BDT)</Label>
                      <Input
                        id="codAmount"
                        type="number"
                        value={formData.codAmount}
                        onChange={(e) => setFormData(prev => ({ ...prev, codAmount: Number(e.target.value) }))}
                        required
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Charges & Partner */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Charges</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="deliveryCharge">Delivery Charge</Label>
                      <Input
                        id="deliveryCharge"
                        type="number"
                        value={formData.deliveryCharge}
                        onChange={(e) => setFormData(prev => ({ ...prev, deliveryCharge: Number(e.target.value) }))}
                        required
                      />
                    </div>
                    {formData.isCOD && (
                      <div>
                        <Label htmlFor="codCharge">COD Charge</Label>
                        <Input
                          id="codCharge"
                          type="number"
                          value={formData.codCharge}
                          onChange={(e) => setFormData(prev => ({ ...prev, codCharge: Number(e.target.value) }))}
                          required
                        />
                      </div>
                    )}
                    <div className="pt-2 border-t">
                      <div className="flex justify-between font-medium">
                        <span>Total Charge:</span>
                        <span>{formatCurrency(formData.deliveryCharge + formData.codCharge)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Courier Partner & Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="courierPartner">Partner</Label>
                      <Select value={formData.courierPartner} onValueChange={(value) => setFormData(prev => ({ ...prev, courierPartner: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select courier partner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="steadfast">Steadfast</SelectItem>
                          <SelectItem value="pathao">Pathao</SelectItem>
                          <SelectItem value="redx">RedX</SelectItem>
                          <SelectItem value="paperfly">Paperfly</SelectItem>
                          <SelectItem value="sundarban">Sundarban</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select 
                        value={formData.status} 
                        onValueChange={(value: 'pending' | 'picked' | 'in_transit' | 'delivered' | 'returned' | 'cancelled') => 
                          setFormData(prev => ({ ...prev, status: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="picked">Picked</SelectItem>
                          <SelectItem value="in_transit">In Transit</SelectItem>
                          <SelectItem value="delivered">Delivered</SelectItem>
                          <SelectItem value="returned">Returned</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="trackingNumber">Tracking Number</Label>
                      <Input
                        id="trackingNumber"
                        value={formData.trackingNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, trackingNumber: e.target.value }))}
                        placeholder="Enter tracking number"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Additional notes or instructions"
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setUpdateModalOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  Update Courier
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationDialog
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={confirmDelete}
          title="Delete Courier"
          description={`Are you sure you want to delete courier ${courierToDelete?.courierId}? This action cannot be undone.`}
          entityName="courier"
        />

        {/* Bulk Delete Confirmation Modal */}
        <DeleteConfirmationDialog
          open={bulkDeleteModalOpen}
          onOpenChange={setBulkDeleteModalOpen}
          onConfirm={confirmBulkDelete}
          title="Delete Multiple Couriers"
          description={`Are you sure you want to delete ${couriersToDelete.length} courier(s)? This action cannot be undone.`}
          entityName="courier"
          entityCount={couriersToDelete.length}
        />
        </div>
      </div>
    </AdminLayout>
  );
}