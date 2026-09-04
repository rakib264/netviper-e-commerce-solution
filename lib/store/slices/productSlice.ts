import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Product {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  images: string[];
  category: string;
  rating: number;
  reviews: number;
  inStock: boolean;
  isFeatured: boolean;
}

interface ProductState {
  products: Product[];
  featuredProducts: Product[];
  searchResults: Product[];
  categories: any[];
  loading: boolean;
  error: string | null;
  filters: {
    category: string;
    priceRange: [number, number];
    rating: number;
    inStock: boolean;
    sortBy: 'name' | 'price' | 'rating' | 'newest';
    sortOrder: 'asc' | 'desc';
  };
  searchQuery: string;
}

const initialState: ProductState = {
  products: [],
  featuredProducts: [],
  searchResults: [],
  categories: [],
  loading: false,
  error: null,
  filters: {
    category: '',
    priceRange: [0, 10000],
    rating: 0,
    inStock: false,
    sortBy: 'name',
    sortOrder: 'asc',
  },
  searchQuery: '',
};

const productSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    
    setProducts: (state, action: PayloadAction<Product[]>) => {
      state.products = action.payload;
      state.loading = false;
    },
    
    setFeaturedProducts: (state, action: PayloadAction<Product[]>) => {
      state.featuredProducts = action.payload;
    },
    
    setSearchResults: (state, action: PayloadAction<Product[]>) => {
      state.searchResults = action.payload;
    },
    
    setCategories: (state, action: PayloadAction<any[]>) => {
      state.categories = action.payload;
    },
    
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    
    updateFilters: (state, action: PayloadAction<Partial<ProductState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    
    clearFilters: (state) => {
      state.filters = initialState.filters;
      state.searchQuery = '';
    },
  },
});

export const {
  setLoading,
  setProducts,
  setFeaturedProducts,
  setSearchResults,
  setCategories,
  setError,
  updateFilters,
  setSearchQuery,
  clearFilters,
} = productSlice.actions;

export default productSlice.reducer;