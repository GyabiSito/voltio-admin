import {
  AdminChargingPointReference,
  AdminChargingPointTerritoryReference,
  AdminUserReference,
} from '../../../shared/utilities/admin-references';

export const INCIDENT_TYPES = [
  'charging_point_unavailable',
  'access_issue',
  'host_unavailable',
  'driver_issue',
  'connector_or_vehicle_issue',
  'safety_issue',
  'other',
] as const;
export const REPORTER_ROLES = ['driver', 'host'] as const;

export type IncidentType = (typeof INCIDENT_TYPES)[number];
export type ReporterRole = (typeof REPORTER_ROLES)[number];

export interface AdminIncidentListItem {
  id: number;
  type: IncidentType;
  reportedByRole: ReporterRole;
  hasDescription: boolean;
  chargingPoint: AdminChargingPointReference;
  bookingStatus: string;
  sessionStatus: string;
  reportedAt: string;
}

export interface AdminIncidentDetail {
  id: number;
  type: IncidentType;
  description: string | null;
  reportedByRole: ReporterRole;
  reportedAt: string;
  reporter: AdminUserReference | null;
  chargingPoint: AdminChargingPointTerritoryReference & { isActive: boolean };
  booking: { id: number; status: string };
  session: {
    id: number;
    status: string;
    scheduledStartsAt: string;
    scheduledEndsAt: string;
  };
}

export interface IncidentFilters {
  type: IncidentType | '';
  reportedByRole: ReporterRole | '';
}
