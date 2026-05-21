export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  notificationServiceUrl: string;
  cloudinary: { cloudName: string; uploadPreset: string; };
}