import { environment } from "../../environments/environment";

export const LoginConfig = {
  loginUrl: `${environment.apiBaseUrl}/api/v1/auth/login`,
  refreshTokenUrl: `${environment.apiBaseUrl}/api/v1/refresh-token`
};
