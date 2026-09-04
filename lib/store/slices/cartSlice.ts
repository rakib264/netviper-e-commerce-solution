import type { DealProgress } from '@/lib/deals/types';
import { cartToasts } from '@/lib/utils/toast-notifications';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/** One component of a combo/bundle line, snapshotted for display only. */
export interface CartComboComponent {
  productId: string;
  variantId?: string;
  name: string;
  qty: number;
}

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variant?: string;
  maxQuantity: number;
  /** Injected by the deals engine. Priced at 0, locked, and not removable. */
  isGift?: boolean;
  lockedQty?: boolean;
  sourceDealId?: string | null;
  /** The gift's normal price, struck through in the cart. */
  listPrice?: number;
  /**
   * A combo/bundle is one sellable unit: one name, one image, one fixed price
   * and one quantity. `components` is a display snapshot only — the price and
   * the availability are re-derived server-side on every sync and again at
   * order creation, exactly as gift lines are.
   */
  itemType?: 'product' | 'combo_bundle';
  comboBundleId?: string;
  comboBundleSlug?: string;
  comboType?: 'combo' | 'bundle';
  components?: CartComboComponent[];
}

interface CartState {
  items: CartItem[];
  total: number;
  itemCount: number;
  isOpen: boolean;
  shippingCost: number;
  tax: number;
  discount: number;
  couponCode?: string;
  /** Server-computed, one entry per running deal this cart could reach. */
  dealProgress: DealProgress[];
  /** Server-computed discount from the deals engine, separate from a coupon. */
  dealDiscount: number;
  dealsSyncing: boolean;
  /**
   * The lines as the server last confirmed them, kept only while an optimistic
   * quantity change is in flight. A failed sync restores it; a successful one
   * throws it away.
   */
  confirmedItems: CartItem[] | null;
}

const initialState: CartState = {
  items: [],
  total: 0,
  itemCount: 0,
  isOpen: false,
  shippingCost: 0,
  tax: 0,
  discount: 0,
  couponCode: undefined,
  dealProgress: [],
  dealDiscount: 0,
  dealsSyncing: false,
  confirmedItems: null,
};

// Load cart from localStorage
const loadCartFromStorage = (): CartState => {
  if (typeof window !== 'undefined') {
    try {
      const savedCart = localStorage.getItem('cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        
        // Clean up invalid items (those with invalid product IDs)
        if (parsed.items && Array.isArray(parsed.items)) {
          const validItems = parsed.items.filter((item: any) => {
            // Both a product line and a combo line are keyed by an ObjectId —
            // the product's, or the offer's — so one check covers both.
            const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(item.id);
            if (!isValidObjectId) {
              console.warn('Removing invalid cart item with ID:', item.id);
            }
            return isValidObjectId;
          });
          
          if (validItems.length !== parsed.items.length) {
            parsed.items = validItems;
            // Recalculate totals after cleaning
            const subtotal = validItems.reduce((total: number, item: any) => total + (item.price * item.quantity), 0);
            parsed.total = subtotal + (parsed.shippingCost || 0) + (parsed.tax || 0) - (parsed.discount || 0);
            parsed.itemCount = validItems.reduce((total: number, item: any) => total + item.quantity, 0);
          }
        }
        
        // Always start with the cart closed to avoid SSR/CSR hydration mismatches
        // and ignore any persisted UI-only fields. Deal state starts empty and
        // is refilled by the first server recalculation.
        const items = (parsed.items || []).filter((item: any) => !item.isGift);
        // The persisted aggregates were computed while a gift line was in the
        // cart, and that line is dropped on the way back in — so they are
        // recomputed rather than trusted, or the cart reopens claiming one item
        // more than it holds.
        const restoredSubtotal = items.reduce(
          (total: number, item: any) => total + item.price * item.quantity,
          0
        );
        return {
          ...initialState,
          ...parsed,
          items,
          itemCount: items.reduce((total: number, item: any) => total + item.quantity, 0),
          total:
            restoredSubtotal +
            (parsed.shippingCost || 0) +
            (parsed.tax || 0) -
            (parsed.discount || 0),
          isOpen: false,
          dealProgress: [],
          dealDiscount: 0,
          dealsSyncing: false,
          confirmedItems: null,
        };
      }
    } catch (error) {
      console.error('Error loading cart from localStorage:', error);
    }
  }
  return initialState;
};

// Save cart to localStorage
const saveCartToStorage = (state: CartState) => {
  if (typeof window !== 'undefined') {
    try {
      // Exclude UI-only fields from persistence to avoid restoring open overlays.
      // Gift lines and deal progress are server-derived and deliberately not
      // persisted: a stale gift restored from a previous session would be a
      // free product the engine never granted.
      const {
        isOpen,
        dealProgress,
        dealDiscount,
        dealsSyncing,
        confirmedItems,
        ...persistedState
      } = state;
      persistedState.items = persistedState.items.filter((item) => !item.isGift);
      localStorage.setItem('cart', JSON.stringify(persistedState));
    } catch (error) {
      console.error('Error saving cart to localStorage:', error);
    }
  }
};

const cartSlice = createSlice({
  name: 'cart',
  initialState: loadCartFromStorage(),
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      // Validate product ID format (24-character hex string)
      const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(action.payload.id);
      if (!isValidObjectId) {
        console.error('Invalid product ID format:', action.payload.id);
        return; // Don't add invalid items to cart
      }
      
      const existingItem = state.items.find(item => 
        item.id === action.payload.id && item.variant === action.payload.variant
      );
      
      let isNewItem = false;
      if (existingItem) {
        const oldQuantity = existingItem.quantity;
        existingItem.quantity = Math.min(
          existingItem.quantity + action.payload.quantity,
          existingItem.maxQuantity
        );
        // Show appropriate toast based on quantity change
        if (existingItem.quantity > oldQuantity) {
          cartToasts.updated(existingItem.name, existingItem.quantity);
        } else {
          // Item is at max quantity, show already exists toast
          cartToasts.alreadyExists(existingItem.name);
        }
      } else {
        state.items.push(action.payload);
        isNewItem = true;
      }
      
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
      
      // Show added toast for new items
      if (isNewItem) {
        cartToasts.added(action.payload.name, action.payload.price);
      }
    },
    
    removeFromCart: (state, action: PayloadAction<{ id: string; variant?: string; name?: string }>) => {
      const itemToRemove = state.items.find(item => 
        item.id === action.payload.id && item.variant === action.payload.variant
      );

      // A gift line belongs to the deal that created it. It leaves when the
      // cart stops qualifying, not when the customer clicks remove.
      if (itemToRemove?.isGift) {
        return;
      }
      
      state.items = state.items.filter(item => 
        !(item.id === action.payload.id && item.variant === action.payload.variant)
      );
      
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
      
      // Show removed toast
      if (itemToRemove) {
        cartToasts.removed(action.payload.name || itemToRemove.name);
      }
    },
    
    updateQuantity: (state, action: PayloadAction<{ id: string; variant?: string; quantity: number }>) => {
      const item = state.items.find(item => 
        item.id === action.payload.id && item.variant === action.payload.variant
      );

      // Gift quantities are fixed by the deal.
      if (item?.lockedQty) {
        return;
      }

      if (item) {
        // Optimistic: the new quantity renders immediately and the deals sync
        // confirms it. Only the first change in a burst snapshots, so a rapid
        // series of clicks rolls back to the last state the server agreed with
        // rather than to the click before.
        if (!state.confirmedItems) {
          state.confirmedItems = state.items.map((entry) => ({ ...entry }));
        }
        item.quantity = Math.min(Math.max(1, action.payload.quantity), item.maxQuantity);
      }
      
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
    },
    
    clearCart: (state) => {
      const hadItems = state.items.length > 0;
      state.items = [];
      state.total = 0;
      state.itemCount = 0;
      state.shippingCost = 0;
      state.tax = 0;
      state.discount = 0;
      state.couponCode = undefined;
      state.dealProgress = [];
      state.dealDiscount = 0;
      state.confirmedItems = null;
      saveCartToStorage(state);
      
      // Show cleared toast only if there were items
      if (hadItems) {
        cartToasts.cleared();
      }
    },
    
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    
    setShippingCost: (state, action: PayloadAction<number>) => {
      state.shippingCost = action.payload;
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
    },
    
    applyCoupon: (state, action: PayloadAction<{ code: string; discount: number }>) => {
      state.couponCode = action.payload.code;
      state.discount = action.payload.discount;
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
    },
    
    removeCoupon: (state) => {
      state.couponCode = undefined;
      state.discount = 0;
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
    },
    
    calculateTotals: (state) => {
      state.itemCount = state.items.reduce((total, item) => total + item.quantity, 0);
      const subtotal = state.items.reduce((total, item) => total + (item.price * item.quantity), 0);
      state.tax = Math.round(subtotal * 0.00); // 0% tax
      // `dealDiscount` is deliberately not folded in here: several surfaces
      // read `total` as a subtotal, so the deal discount is subtracted where
      // the final figure is actually rendered.
      state.total = subtotal + state.shippingCost + state.tax - state.discount;
    },
    
    /**
     * Re-reads the persisted cart without discarding anything the server has
     * already said.
     *
     * The drawer dispatches this on mount, which can land after the first deals
     * sync has returned. A blind overwrite would drop the gift lines and the
     * discount, and nothing would fetch them again — the resync is keyed on the
     * customer's own lines, which this does not change.
     */
    reloadCartFromStorage: (state) => {
      const gifts = state.items.filter((item) => item.isGift);
      const { dealProgress, dealDiscount, dealsSyncing, confirmedItems } = state;
      const loaded = loadCartFromStorage();

      Object.assign(state, loaded);
      state.items = [...loaded.items, ...gifts];
      state.dealProgress = dealProgress;
      state.dealDiscount = dealDiscount;
      state.dealsSyncing = dealsSyncing;
      state.confirmedItems = confirmedItems;

      cartSlice.caseReducers.calculateTotals(state);
    },

    /**
     * Apply the server's verdict on the combo/bundle lines.
     *
     * The cart is only ever *corrected* here — repriced, clamped to what the
     * components can actually cover, or dropped when the offer is no longer
     * sellable. Nothing is added: a combo line exists because the customer
     * added it.
     */
    applyComboVerdicts: (
      state,
      action: PayloadAction<
        Array<{
          comboBundleId: string;
          ok: boolean;
          price?: number;
          name?: string;
          sellableQty: number;
          maxUnits: number;
        }>
      >
    ) => {
      if (action.payload.length === 0) return;

      const byId = new Map(action.payload.map((verdict) => [verdict.comboBundleId, verdict]));
      let changed = false;
      const dropped: string[] = [];

      const next: CartItem[] = [];
      for (const item of state.items) {
        if (item.itemType !== 'combo_bundle') {
          next.push(item);
          continue;
        }

        const verdict = byId.get(item.comboBundleId || item.id);
        // No verdict means the sync did not cover this line (a request that
        // raced a mutation); leaving it alone is safer than dropping it.
        if (!verdict) {
          next.push(item);
          continue;
        }

        if (verdict.sellableQty < 1) {
          dropped.push(item.name);
          changed = true;
          continue;
        }

        const price = typeof verdict.price === 'number' ? verdict.price : item.price;
        const quantity = Math.min(item.quantity, verdict.sellableQty);
        const maxQuantity = Math.max(1, verdict.maxUnits || quantity);

        if (
          price !== item.price ||
          quantity !== item.quantity ||
          maxQuantity !== item.maxQuantity
        ) {
          changed = true;
        }

        next.push({ ...item, price, quantity, maxQuantity });
      }

      if (!changed) return;

      state.items = next;
      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);

      for (const name of dropped) {
        cartToasts.removed(name);
      }
    },

    dealsSyncStarted: (state) => {
      state.dealsSyncing = true;
    },

    /**
     * Replaces the gift lines, the deal discount and the progress list with
     * the server's answer. The customer's own lines are left alone — only the
     * server may add or remove a gift.
     */
    applyDealResult: (
      state,
      action: PayloadAction<{
        lines: Array<CartItem & { sourceDealId?: string | null; listPrice?: number }>;
        dealDiscount: number;
        dealProgress: DealProgress[];
      }>
    ) => {
      const gifts = action.payload.lines
        .filter((line) => line.isGift)
        .map((line) => ({
          id: line.id,
          name: line.name,
          price: 0,
          quantity: line.quantity,
          image: line.image,
          variant: line.variant,
          maxQuantity: line.quantity,
          isGift: true,
          lockedQty: true,
          sourceDealId: line.sourceDealId ?? null,
          listPrice: line.listPrice,
        }));

      // No transition is recorded and nothing is announced. Every deal the
      // customer can see is one entry of `dealProgress` rendered in whichever
      // state it is currently in, so a threshold crossed in either direction
      // is just the next render — there is no "was unlocked" flag to go stale.
      state.items = [...state.items.filter((item) => !item.isGift), ...gifts];
      state.dealDiscount = action.payload.dealDiscount;
      state.dealProgress = action.payload.dealProgress;
      state.dealsSyncing = false;
      // The server has now priced these lines, so there is nothing to roll
      // back to.
      state.confirmedItems = null;

      cartSlice.caseReducers.calculateTotals(state);
      saveCartToStorage(state);
    },

    /**
     * Rolls the optimistic quantity change back. A cart the server could not
     * price is shown as the server last agreed it was, rather than at a
     * quantity whose deals and discount are a guess.
     */
    dealsSyncFailed: (state) => {
      state.dealsSyncing = false;
      if (state.confirmedItems) {
        state.items = state.confirmedItems;
        state.confirmedItems = null;
        cartSlice.caseReducers.calculateTotals(state);
        saveCartToStorage(state);
      }
    },
  },
});

export const { 
  addToCart, 
  removeFromCart, 
  updateQuantity, 
  clearCart, 
  toggleCart,
  setShippingCost,
  applyCoupon,
  removeCoupon,
  calculateTotals,
  reloadCartFromStorage,
  applyComboVerdicts,
  dealsSyncStarted,
  applyDealResult,
  dealsSyncFailed
} = cartSlice.actions;

export default cartSlice.reducer;