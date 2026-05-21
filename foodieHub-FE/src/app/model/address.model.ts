export interface Location {
  city: string;
  state: string;
  country: string;
  lat: number;
  lng: number;
}

export interface UserAddress {
  id: number;
  label: string;
  addressText: string;
  landmark?: string;
  defaultAddress: boolean;
  location?: Location;
}
