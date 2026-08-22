export const DEFAULT_ADMIN_ROUTE = '/users';

const ADMIN_ROUTES = [
  /^\/users(?:\/[1-9]\d*)?$/u,
  /^\/moderation\/charging-point-reports(?:\/[1-9]\d*)?$/u,
  /^\/moderation\/reviews(?:\/[1-9]\d*)?$/u,
  /^\/moderation\/incidents(?:\/[1-9]\d*)?$/u,
  /^\/audit(?:\/[1-9]\d*)?$/u,
] as const;

export function safeAdminReturnUrl(value: string | null): string {
  if (value === null) {
    return DEFAULT_ADMIN_ROUTE;
  }

  try {
    const decoded = decodeURIComponent(value);
    return ADMIN_ROUTES.some((route) => route.test(decoded)) ? decoded : DEFAULT_ADMIN_ROUTE;
  } catch {
    return DEFAULT_ADMIN_ROUTE;
  }
}
