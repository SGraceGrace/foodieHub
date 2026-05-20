import { Environment } from "../app/model/environment.model";

export const environment: Environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8080',
  cloudinary: { cloudName: 'dyv0innvy', uploadPreset: 'foodiehub-images' },
};
