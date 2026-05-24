export interface Location {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

export interface MenuExtra {
  label: string;
  amount: number;
}

export interface MenuItem {
  /** Populated from menu_items collection — sent back as menuItemId when adding to cart. */
  id?: string;
  name: string;
  price: number;
  gstPercent?: number;
  isVeg: boolean;
  available: boolean;
  description?: string;
  imageUrl?: string;
  extras?: MenuExtra[];
}

export interface MenuCategory {
  category: string;
  items: MenuItem[];
}

export interface DaySchedule {
  day: string;       // "MONDAY", "TUESDAY", …
  open: boolean;
  openTime: string;  // "09:00"
  closeTime: string; // "22:00"
}

export interface Restaurant {
  id: string;
  ownerId?: string;
  name: string;
  cuisine?: string[];
  rating?: number;
  ratingCount?: number;
  deliveryTime?: number;
  open?: boolean;
  imageUrl?: string;
  address?: string;
  minOrder?: number;
  priceRange?: string;
  menu?: MenuCategory[];
  status?: string;
  fssaiNumber?: string;
  gstNumber?: string;
  operatingHours?: DaySchedule[];
  location?: Location;
  distanceKm?: number;
}

export interface AdminUserResponse {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  roleName: string;
  status: string;
  restaurantName?: string;
  restaurantLocation?: Location;
  fssaiNumber?: string;
  gstNumber?: string;
  vehicleType?: string;
  licenseNumber?: string;
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

export interface AdminNotification {
  id: string;
  type: 'ACTIVITY' | 'PENDING_OWNER' | 'PENDING_DRIVER' | 'CONTACT_MESSAGE';
  message: string;
  actorEmail?: string;
  timestamp: string;
}

export interface RestaurantStaff {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  status: string;
  assignedRestaurantIds: string[];
}

export interface ContactMessage {
  id: number;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdDate: string;
  read: boolean;
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
