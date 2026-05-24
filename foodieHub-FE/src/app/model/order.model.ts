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
  createdAt: string;
  updatedAt?: string;
  eta?: string;
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

/** Pushed over SSE when the restaurant partner changes an order's status. */
export interface CustomerOrderUpdate {
  orderId: string;
  restaurantName: string;
  newStatus: OrderStatus;
  message: string;      // human-readable, e.g. "👨‍🍳 Spice Garden is preparing your food!"
  updatedAt: string;
}
