export type OrderStatus = 'PLACED' | 'CONFIRMED' | 'PREPARING' | 'ON_WAY' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  restaurantName: string;
  restaurantEmoji: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  eta?: string;
}
