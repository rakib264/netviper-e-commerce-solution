import { useDebounce } from '@/hooks/use-debounce';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager';
  status: 'active' | 'inactive';
  lastLogin: string;
  createdAt: string;
  avatar?: string;
}

export interface AdminManagerFilters {
  search: string;
  role: 'all' | 'admin' | 'manager';
  status: 'all' | 'active' | 'inactive';
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export interface AdminManagerPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface AdminManagerResponse {
  admins: AdminUser[];
  pagination: AdminManagerPagination;
}

export interface CreateAdminData {
  firstName: string;
  lastName: string;
  email: string;
  role: 'admin' | 'manager';
  password: string;
  isActive?: boolean;
}

export function useAdminManager() {
  const [loading, setLoading] = useState(false);
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<AdminManagerPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });
  const [filters, setFilters] = useState<AdminManagerFilters>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pendingFilters, setPendingFilters] = useState<AdminManagerFilters>({
    search: '',
    role: 'all',
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [debouncedSearch] = useDebounce(filters.search, 500);
  const { toast } = useToast();

  // Fetch admins
  const fetchAdmins = async (page = 1, limit = 10, customFilters?: Partial<AdminManagerFilters>) => {
    setLoading(true);
    try {
      const currentFilters = { ...filters, ...customFilters };
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        search: currentFilters.search || '',
        role: currentFilters.role,
        status: currentFilters.status,
        sortBy: currentFilters.sortBy,
        sortOrder: currentFilters.sortOrder
      });

      const response = await fetch(`/api/admin/admin-manager?${params}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch admins');
      }

      const data: AdminManagerResponse = await response.json();
      setAdmins(data.admins);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching admins:', error);
      toast({
        title: "Error",
        description: "Failed to fetch admin users",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // Create admin
  const createAdmin = async (adminData: CreateAdminData): Promise<AdminUser | null> => {
    try {
      const response = await fetch('/api/admin/admin-manager', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create admin');
      }

      const newAdmin: AdminUser = await response.json();
      
      toast({
        title: "Success",
        description: "Admin created successfully",
      });

      // Refresh the list with current filters
      await fetchAdmins(pagination.page, pagination.limit, filters);
      
      return newAdmin;
    } catch (error) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create admin",
        variant: "error",
      });
      return null;
    }
  };

  // Update admin
  const updateAdmin = async (id: string, updateData: Partial<AdminUser>): Promise<AdminUser | null> => {
    try {
      const response = await fetch(`/api/admin/admin-manager/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update admin');
      }

      const updatedAdmin: AdminUser = await response.json();
      
      toast({
        title: "Success",
        description: "Admin updated successfully",
      });

      // Refresh the list with current filters
      await fetchAdmins(pagination.page, pagination.limit, filters);
      
      return updatedAdmin;
    } catch (error) {
      console.error('Error updating admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update admin",
        variant: "error",
      });
      return null;
    }
  };

  // Delete admin
  const deleteAdmin = async (id: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/admin-manager/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete admin');
      }

      toast({
        title: "Success",
        description: "Admin deleted successfully",
      });

      // Refresh the list with current filters
      await fetchAdmins(pagination.page, pagination.limit, filters);
      
      return true;
    } catch (error) {
      console.error('Error deleting admin:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete admin",
        variant: "error",
      });
      return false;
    }
  };

  // Bulk actions
  const bulkAction = async (action: 'activate' | 'deactivate' | 'delete', adminIds: string[]): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/admin-manager/bulk-actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, adminIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${action} admins`);
      }

      const result = await response.json();
      
      toast({
        title: "Success",
        description: result.message,
      });

      // Refresh the list with current filters
      await fetchAdmins(pagination.page, pagination.limit, filters);
      
      return true;
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${action} admins`,
        variant: "error",
      });
      return false;
    }
  };

  // Export admins
  const exportAdmins = async (adminIds?: string[], format: 'csv' | 'json' = 'csv'): Promise<boolean> => {
    try {
      const response = await fetch('/api/admin/admin-manager/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ adminIds, format }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export admins');
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `admin-export-${new Date().toISOString().split('T')[0]}.${format}`;
      
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Admins exported successfully",
      });
      
      return true;
    } catch (error) {
      console.error('Error exporting admins:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to export admins",
        variant: "error",
      });
      return false;
    }
  };

  // Update filters (pending - not applied until Apply Filters is clicked)
  const updateFilters = (newFilters: Partial<AdminManagerFilters>) => {
    setPendingFilters(prev => ({ ...prev, ...newFilters }));
    
    // For search, apply immediately with debouncing
    if (newFilters.search !== undefined) {
      setFilters(prev => ({ ...prev, search: newFilters.search || '' }));
    }
  };

  // Apply pending filters
  const applyFilters = () => {
    setFilters(pendingFilters);
    fetchAdmins(1, pagination.limit, pendingFilters);
  };

  // Reset filters
  const resetFilters = () => {
    const defaultFilters: AdminManagerFilters = {
      search: '',
      role: 'all',
      status: 'all',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    };
    setPendingFilters(defaultFilters);
    setFilters(defaultFilters);
    fetchAdmins(1, pagination.limit, defaultFilters);
  };

  // Change page
  const changePage = (page: number) => {
    fetchAdmins(page, pagination.limit);
  };

  // Change items per page
  const changeItemsPerPage = (limit: number) => {
    fetchAdmins(1, limit);
  };

  // Auto-fetch when debounced search changes (only for search, not other filters)
  useEffect(() => {
    if (debouncedSearch !== filters.search) {
      fetchAdmins(1, pagination.limit, { search: debouncedSearch });
    }
  }, [debouncedSearch]);

  // Initial load - fetch with empty search string
  useEffect(() => {
    fetchAdmins(1, 10);
  }, []);

  return {
    // State
    loading,
    admins,
    pagination,
    filters,
    pendingFilters,
    
    // Actions
    fetchAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    bulkAction,
    exportAdmins,
    updateFilters,
    applyFilters,
    resetFilters,
    changePage,
    changeItemsPerPage,
  };
}
