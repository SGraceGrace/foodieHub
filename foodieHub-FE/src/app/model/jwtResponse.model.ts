import { UserDetails } from "./user.model";

export interface JwtResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDetails;
}
