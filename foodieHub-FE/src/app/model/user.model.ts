import { Role } from "./role.model";

export interface UserDetails {
  id?: number;
  userName: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  bio?: string;
}
