export const ADMIN_ROLE = 'admin';
export const AUTH_ROLES = ['driver', 'host', 'admin'] as const;

export type AuthRole = (typeof AUTH_ROLES)[number];

export interface AdminIdentity {
  id: number;
  displayName: string;
  email: string;
  roles: AuthRole[];
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface LoginResult {
  token: string;
  tokenType: 'Bearer';
  user: AdminIdentity;
}
