export interface Environment {
  production: boolean;
  apiBaseUrl: string;
  cloudinary: { cloudName: string; uploadPreset: string; };
}