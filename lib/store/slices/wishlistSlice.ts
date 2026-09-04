import { wishlistToasts } from '@/lib/utils/toast-notifications';
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  comparePrice?: number;
  inStock: boolean;
}

interface WishlistState {
  items: WishlistItem[];
  itemCount: number;
}

const initialState: WishlistState = {
  items: [],
  itemCount: 0,
};

// Load wishlist from localStorage
const loadWishlistFromStorageHelper = (): WishlistState => {
  if (typeof window !== 'undefined') {
    try {
      const savedWishlist = localStorage.getItem('wishlist');
      if (savedWishlist) {
        const parsed = JSON.parse(savedWishlist);
        return { ...initialState, ...parsed };
      }
    } catch (error) {
      console.error('Error loading wishlist from localStorage:', error);
    }
  }
  return initialState;
};

// Save wishlist to localStorage
const saveWishlistToStorage = (state: WishlistState) => {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('wishlist', JSON.stringify(state));
    } catch (error) {
      console.error('Error saving wishlist to localStorage:', error);
    }
  }
};

const wishlistSlice = createSlice({
  name: 'wishlist',
  // Start with a stable, SSR-safe initial state to avoid hydration mismatches.
  // Client will hydrate from localStorage via the loadWishlistFromStorage action (dispatched on mount in Header).
  initialState,
  reducers: {
    addToWishlist: (state, action: PayloadAction<WishlistItem>) => {
      const existingItem = state.items.find(item => item.id === action.payload.id);
      
      if (!existingItem) {
        state.items.push(action.payload);
        state.itemCount = state.items.length;
        saveWishlistToStorage(state);
        
        // Show added toast
        wishlistToasts.added(action.payload.name, action.payload.price);
      } else {
        // Item already exists in wishlist
        wishlistToasts.alreadyExists(action.payload.name);
      }
    },
    
    removeFromWishlist: (state, action: PayloadAction<string>) => {
      const itemToRemove = state.items.find(item => item.id === action.payload);
      
      state.items = state.items.filter(item => item.id !== action.payload);
      state.itemCount = state.items.length;
      saveWishlistToStorage(state);
      
      // Show removed toast
      if (itemToRemove) {
        wishlistToasts.removed(itemToRemove.name);
      }
    },
    
    clearWishlist: (state) => {
      const hadItems = state.items.length > 0;
      state.items = [];
      state.itemCount = 0;
      saveWishlistToStorage(state);
      
      // Show cleared toast only if there were items
      if (hadItems) {
        wishlistToasts.cleared();
      }
    },
    
    loadWishlistFromStorage: (state) => {
      const loaded = loadWishlistFromStorageHelper();
      Object.assign(state, loaded);
    },
  },
});

export const { 
  addToWishlist, 
  removeFromWishlist, 
  clearWishlist,
  loadWishlistFromStorage
} = wishlistSlice.actions;

export default wishlistSlice.reducer;