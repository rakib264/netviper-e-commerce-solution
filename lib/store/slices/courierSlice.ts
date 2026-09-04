import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface CourierItem {
  _id: string;
  courierId: string;
  order: {
    _id: string;
    orderNumber: string;
    total: number;
  };
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
    city: string;
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

export interface CourierState {
  items: CourierItem[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    status?: string;
    courierPartner?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  selectedItems: string[];
  stats: {
    total: number;
    pending: number;
    inTransit: number;
    delivered: number;
    returned: number;
    cancelled: number;
  };
}

const initialState: CourierState = {
  items: [],
  loading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  },
  filters: {},
  selectedItems: [],
  stats: {
    total: 0,
    pending: 0,
    inTransit: 0,
    delivered: 0,
    returned: 0,
    cancelled: 0,
  },
};

// Async thunks
export const fetchCouriers = createAsyncThunk(
  'courier/fetchCouriers',
  async (params?: { 
    page?: number; 
    limit?: number; 
    status?: string; 
    search?: string;
    courierPartner?: string;
    dateFrom?: string;
    dateTo?: string;
  }) => {
    const queryParams = new URLSearchParams();
    
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.courierPartner) queryParams.append('courierPartner', params.courierPartner);
    if (params?.dateFrom) queryParams.append('dateFrom', params.dateFrom);
    if (params?.dateTo) queryParams.append('dateTo', params.dateTo);

    const response = await fetch(`/api/admin/courier?${queryParams}`);
    if (!response.ok) {
      throw new Error('Failed to fetch couriers');
    }
    return response.json();
  }
);

export const createCourier = createAsyncThunk(
  'courier/createCourier',
  async (courierData: Partial<CourierItem>) => {
    const response = await fetch('/api/admin/courier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courierData),
    });
    if (!response.ok) {
      throw new Error('Failed to create courier');
    }
    return response.json();
  }
);

export const updateCourier = createAsyncThunk(
  'courier/updateCourier',
  async ({ id, data }: { id: string; data: Partial<CourierItem> }) => {
    const response = await fetch(`/api/admin/courier/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error('Failed to update courier');
    }
    return response.json();
  }
);

export const updateCourierStatus = createAsyncThunk(
  'courier/updateCourierStatus',
  async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
    const response = await fetch(`/api/admin/courier/${id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, notes }),
    });
    if (!response.ok) {
      throw new Error('Failed to update courier status');
    }
    return response.json();
  }
);

export const deleteCourier = createAsyncThunk(
  'courier/deleteCourier',
  async (id: string) => {
    const response = await fetch(`/api/admin/courier/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error('Failed to delete courier');
    }
    return id;
  }
);

export const bulkUpdateCourierStatus = createAsyncThunk(
  'courier/bulkUpdateCourierStatus',
  async ({ ids, status }: { ids: string[]; status: string }) => {
    const response = await fetch('/api/admin/courier/bulk-status', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courierIds: ids, status }),
    });
    if (!response.ok) {
      throw new Error('Failed to update courier statuses');
    }
    return response.json();
  }
);

export const bulkDeleteCouriers = createAsyncThunk(
  'courier/bulkDeleteCouriers',
  async (ids: string[]) => {
    const response = await fetch('/api/admin/courier/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courierIds: ids }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete couriers');
    }
    return ids;
  }
);

const courierSlice = createSlice({
  name: 'courier',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<CourierState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    setSelectedItems: (state, action: PayloadAction<string[]>) => {
      state.selectedItems = action.payload;
    },
    toggleSelectedItem: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      if (state.selectedItems.includes(id)) {
        state.selectedItems = state.selectedItems.filter(item => item !== id);
      } else {
        state.selectedItems.push(id);
      }
    },
    selectAllItems: (state) => {
      state.selectedItems = state.items.map(item => item._id);
    },
    clearSelectedItems: (state) => {
      state.selectedItems = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch couriers
      .addCase(fetchCouriers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCouriers.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.couriers;
        state.pagination = action.payload.pagination;
        
        // Calculate stats
        const stats = {
          total: action.payload.couriers.length,
          pending: action.payload.couriers.filter((c: CourierItem) => c.status === 'pending').length,
          inTransit: action.payload.couriers.filter((c: CourierItem) => c.status === 'in_transit').length,
          delivered: action.payload.couriers.filter((c: CourierItem) => c.status === 'delivered').length,
          returned: action.payload.couriers.filter((c: CourierItem) => c.status === 'returned').length,
          cancelled: action.payload.couriers.filter((c: CourierItem) => c.status === 'cancelled').length,
        };
        state.stats = stats;
      })
      .addCase(fetchCouriers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch couriers';
      })
      
      // Create courier
      .addCase(createCourier.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createCourier.fulfilled, (state, action) => {
        state.loading = false;
        state.items.unshift(action.payload);
        state.stats.total += 1;
        state.stats.pending += 1;
      })
      .addCase(createCourier.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to create courier';
      })
      
      // Update courier
      .addCase(updateCourier.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      })
      
      // Update courier status
      .addCase(updateCourierStatus.fulfilled, (state, action) => {
        const index = state.items.findIndex(item => item._id === action.payload._id);
        if (index !== -1) {
          const oldStatus = state.items[index].status;
          state.items[index] = action.payload;
          
          // Update stats
          if (oldStatus !== action.payload.status) {
            state.stats[oldStatus as keyof typeof state.stats] -= 1;
            state.stats[action.payload.status as keyof typeof state.stats] += 1;
          }
        }
      })
      
      // Delete courier
      .addCase(deleteCourier.fulfilled, (state, action) => {
        const courier = state.items.find(item => item._id === action.payload);
        if (courier) {
          state.stats[courier.status as keyof typeof state.stats] -= 1;
          state.stats.total -= 1;
        }
        state.items = state.items.filter(item => item._id !== action.payload);
        state.selectedItems = state.selectedItems.filter(id => id !== action.payload);
      })
      
      // Bulk update status
      .addCase(bulkUpdateCourierStatus.fulfilled, (state, action) => {
        const { courierIds, status } = action.payload;
        courierIds.forEach((id: string) => {
          const index = state.items.findIndex(item => item._id === id);
          if (index !== -1) {
            const oldStatus = state.items[index].status;
            state.items[index].status = status;
            
            // Update stats
            if (oldStatus !== status) {
              state.stats[oldStatus as keyof typeof state.stats] -= 1;
              state.stats[status as keyof typeof state.stats] += 1;
            }
          }
        });
        state.selectedItems = [];
      })
      
      // Bulk delete
      .addCase(bulkDeleteCouriers.fulfilled, (state, action) => {
        const idsToDelete = action.payload;
        idsToDelete.forEach((id: string) => {
          const courier = state.items.find(item => item._id === id);
          if (courier) {
            state.stats[courier.status as keyof typeof state.stats] -= 1;
            state.stats.total -= 1;
          }
        });
        state.items = state.items.filter(item => !idsToDelete.includes(item._id));
        state.selectedItems = [];
      });
  },
});

export const {
  setFilters,
  clearFilters,
  setSelectedItems,
  toggleSelectedItem,
  selectAllItems,
  clearSelectedItems,
  clearError,
} = courierSlice.actions;

export default courierSlice.reducer;
