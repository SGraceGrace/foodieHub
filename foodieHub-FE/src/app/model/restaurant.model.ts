export interface MenuItem {
  name: string;
  price: number;
  isVeg: boolean;
  available: boolean;
  description?: string;
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface Restaurant {
  id: string;
  name: string;
  cuisine: string[];
  rating: number;
  deliveryTime: number;
  isOpen: boolean;
  imageUrl: string;
  address: string;
  minOrder: number;
  priceRange: string;
  menu?: MenuCategory[];
}

export interface AdminUserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
  status: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  currentPage: number;
  totalPages: number;
  totalElements: number;
  pageSize: number;
}

export interface ActivityLog {
  id: number;
  actorEmail: string;
  action: string;
  targetEntity: string;
  targetId: number;
  details: string;
  createdAt: string;
}

export interface Slide {
  id: string;
  title: string;
  highlightWord: string;
  description: string;
  btn1Text: string;
  btn2Text: string;
  emoji: string;
  badgeIcon: string;
  badgeText: string;
  displayOrder: number;
  active: boolean;
}
