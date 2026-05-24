export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  isVeg?: boolean;
}

export interface Order {
  id: string;
  userId?: string;
  customerName?: string;
  restaurantId?: string;
  restaurantName: string;
  items: OrderItem[];
  subtotal?: number;
  deliveryFee?: number;
  gst?: number;
  totalAmount: number;
  deliveryAddress?: string;
  status: OrderStatus;
  paymentId?: string;
  paymentStatus?: string;   // 'PAID' | undefined (COD orders have no paymentStatus)
  rated?: boolean;
  createdAt: string;
  updatedAt?: string;
  eta?: string;
}

/** Overview stats for the restaurant partner workspace. */
export interface RestaurantStats {
  todayOrders:   number;
  todayRevenue:  number;
  pendingOrders: number;
  totalOrders:   number;
}

export interface RestaurantOrderNotification {
  id: string;
  restaurantId: string;
  type: string;         // NEW_ORDER
  orderId: string;
  customerName: string;
  deliveryAddress: string;
  itemNames: string[];
  totalAmount: number;
  read: boolean;
  createdAt: string;
}

/**
 * Unified customer notification shape — used in both:
 *  - SSE stream (real-time push when order status changes)
 *  - REST GET /api/v1/customer/notifications (history loaded on page init)
 *
 * Having one interface means the bell component needs no conversion logic.
 */
export interface CustomerOrderUpdate {
  id?: string;          // MongoDB document id (set after DB save; missing only on legacy events)
  orderId: string;
  restaurantName: string;
  newStatus: OrderStatus;
  message: string;      // human-readable, e.g. "👨‍🍳 Spice Garden is preparing your food!"
  updatedAt: string;
  read?: boolean;       // false for new SSE pushes; DB value for history loads
}
