import { Order, OrderItem } from '../types';
import { storage } from './storage';

/**
 * Modifies an existing order in storage, recalculates inventory difference
 * between old items and new items, adjusts customer loyalty if applicable,
 * updates timestamps, logs audit trail, and syncs across devices.
 */
export function modifyOrder(
  orderId: string,
  updatedData: {
    items: OrderItem[];
    subtotal: number;
    discountAmount: number;
    appliedPromoCode?: string;
    loyaltyPointsUsed?: number;
    taxAmount: number;
    grandTotal: number;
    totalCost: number;
    totalProfit: number;
    paymentMethod: Order['paymentMethod'];
    paymentStatus?: 'paid' | 'pending' | 'refunded';
    status?: Order['status'];
    notes?: string;
    customerPhone?: string;
    customerName?: string;
    customerId?: string;
    modificationReason?: string;
    modifiedBy?: string;
  }
): Order | null {
  return storage.modifyOrder(orderId, updatedData);
}
