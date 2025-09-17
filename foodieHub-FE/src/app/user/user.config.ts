import { environment } from "../../environments/environment";

export const UserConfig = {
  userApiUrl: `${environment.apiBaseUrl}/api/v1/user`,
  userLogoutUrl: `${environment.apiBaseUrl}/api/v1/auth/logout`
};