import { Environment } from "../app/model/environment.model";

export const environment: Environment = {
  production: true,
  apiBaseUrl: 'https://foodiehub-gateway.onrender.com',
  notificationServiceUrl: 'https://foodiehub-notification-service.onrender.com',
  cloudinary: { cloudName: 'dyv0innvy', uploadPreset: 'foodiehub-images' },
};
