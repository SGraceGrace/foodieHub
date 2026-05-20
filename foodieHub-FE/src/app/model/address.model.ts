export interface UserAddress {
  id: number;
  label: string;
  addressText: string;
  landmark?: string;
  defaultAddress: boolean;
  lat?: number;
  lng?: number;
}
