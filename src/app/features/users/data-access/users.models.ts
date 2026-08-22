export const USER_STATUSES = ['active', 'closed'] as const;
export const USER_ROLES = ['driver', 'host', 'admin'] as const;

export type UserStatus = (typeof USER_STATUSES)[number];
export type UserRole = (typeof USER_ROLES)[number];

export interface AdminUserListItem {
  id: number;
  displayName: string;
  roles: UserRole[];
  status: UserStatus;
  emailVerified: boolean;
  createdAt: string;
  closedAt: string | null;
}

export interface AdminUserFootprint {
  currentlyOwnedChargingPoints: number;
  activeChargingPoints: number;
  driverBookings: number;
  bookingsOnCurrentlyOwnedPoints: number;
  chargingSessionsAsDriver: number;
  reviewsAuthored: number;
  incidentsReported: number;
}

export interface AdminUserDetail extends AdminUserListItem {
  email: string | null;
  updatedAt: string;
  footprint: AdminUserFootprint;
}

export interface UserFilters {
  status: UserStatus | '';
  role: UserRole | '';
  emailVerified: 'true' | 'false' | '';
}
