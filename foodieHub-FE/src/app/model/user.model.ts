import { Role } from "./role.model";

export interface UserDetails {
  userName: string;
  email: string;
  name: string;
  role: Role;
}
