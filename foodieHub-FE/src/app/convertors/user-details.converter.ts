import { UserDetails } from '../model/user.model';

export function toUserDetails(data: any): UserDetails {
  return {
    userName: data.username,
    name: data.name,
    email: data.email,
    role: data.role.roleName,
  };
}