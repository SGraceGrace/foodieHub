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
