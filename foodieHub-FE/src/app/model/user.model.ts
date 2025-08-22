import { Role } from "./role.model";

export interface UserDetails {
  id: string;
  userName: string;
  email: string;
  name: string;
  role: Role;
}
