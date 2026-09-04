import Courier from '@/lib/models/Courier';
import { Types } from 'mongoose';

/**
 * Utility functions for managing courier record cleanup when orders are deleted
 */

export interface CourierCleanupResult {
  deletedCount: number;
  deletedCourierIds: string[];
}

/**
 * Delete all courier records associated with a single order
 * @param orderId - The order ID to clean up couriers for
 * @returns Promise with cleanup results
 */
export async function cleanupCouriersForOrder(orderId: string | Types.ObjectId): Promise<CourierCleanupResult> {
  try {
    // Find all courier records associated with this order
    const associatedCouriers = await Courier.find({ order: orderId });
    const courierIds = associatedCouriers.map(courier => courier.courierId);
    
    // Delete all courier records for this order
    const deleteResult = await Courier.deleteMany({ order: orderId });
    
    console.log(`Cleaned up ${deleteResult.deletedCount} courier records for order ${orderId}`);
    
    return {
      deletedCount: deleteResult.deletedCount,
      deletedCourierIds: courierIds
    };
  } catch (error) {
    console.error(`Error cleaning up couriers for order ${orderId}:`, error);
    throw new Error(`Failed to cleanup courier records for order ${orderId}`);
  }
}

/**
 * Delete all courier records associated with multiple orders
 * @param orderIds - Array of order IDs to clean up couriers for
 * @returns Promise with cleanup results
 */
export async function cleanupCouriersForOrders(orderIds: (string | Types.ObjectId)[]): Promise<CourierCleanupResult> {
  try {
    // Find all courier records associated with these orders
    const associatedCouriers = await Courier.find({ order: { $in: orderIds } });
    const courierIds = associatedCouriers.map(courier => courier.courierId);
    
    // Delete all courier records for these orders
    const deleteResult = await Courier.deleteMany({ order: { $in: orderIds } });
    
    console.log(`Cleaned up ${deleteResult.deletedCount} courier records for ${orderIds.length} orders`);
    
    return {
      deletedCount: deleteResult.deletedCount,
      deletedCourierIds: courierIds
    };
  } catch (error) {
    console.error(`Error cleaning up couriers for orders:`, error);
    throw new Error(`Failed to cleanup courier records for ${orderIds.length} orders`);
  }
}

/**
 * Get count of courier records associated with an order (for preview purposes)
 * @param orderId - The order ID to check
 * @returns Promise with count of associated couriers
 */
export async function getCourierCountForOrder(orderId: string | Types.ObjectId): Promise<number> {
  try {
    const count = await Courier.countDocuments({ order: orderId });
    return count;
  } catch (error) {
    console.error(`Error getting courier count for order ${orderId}:`, error);
    return 0;
  }
}

/**
 * Get count of courier records associated with multiple orders (for bulk preview)
 * @param orderIds - Array of order IDs to check
 * @returns Promise with count of associated couriers
 */
export async function getCourierCountForOrders(orderIds: (string | Types.ObjectId)[]): Promise<number> {
  try {
    const count = await Courier.countDocuments({ order: { $in: orderIds } });
    return count;
  } catch (error) {
    console.error(`Error getting courier count for orders:`, error);
    return 0;
  }
}

/**
 * Validate that orders exist before attempting cleanup
 * @param orderIds - Array of order IDs to validate
 * @returns Promise with array of valid order IDs
 */
export async function validateOrdersExist(orderIds: (string | Types.ObjectId)[]): Promise<(string | Types.ObjectId)[]> {
  try {
    const Order = require('@/lib/models/Order').default;
    const existingOrders = await Order.find({ _id: { $in: orderIds } }, '_id');
    return existingOrders.map((order: any) => order._id);
  } catch (error) {
    console.error('Error validating orders:', error);
    return [];
  }
}
