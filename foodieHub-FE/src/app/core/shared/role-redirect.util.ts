export function getHomeRouteForRole(roleName: string | undefined): string {
  switch (roleName) {
    case 'RESTAURANT_OWNER':
    case 'RESTAURANT_STAFF':
      return '/partner';
    case 'ADMIN':
    case 'SUPER_ADMIN':
      return '/admin';
    case 'DRIVER':
      return '/driver';
    default:
      return '/home';
  }
}
