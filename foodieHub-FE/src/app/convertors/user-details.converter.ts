import { UserDetails } from '../model/user.model';

export function toUserDetails(data: any): UserDetails {
  return {
    userName: data.username,
    firstName: data.firstName,
    lastName: data.lastName,
    email: data.email,
    role: data.role.roleName,
  };
}