import { auth, getFreshAuthBearerToken } from './firebase';
import type {
  UserRole,
  RolePermissions,
  AuditLogEntry,
  ModerationReport,
  SystemDiscrepancy,
  PlatformConfig,
  ManagedUserAccount,
} from '../types';

/**
 * Obtain a valid JWT or signed identity token from Firebase Auth
 */
async function getAuthBearerToken(): Promise<string> {
  return getFreshAuthBearerToken();
}

/**
 * Fetch Current User's Verified RBAC Profile & Role
 */
export async function fetchUserRoleAndPermissions(): Promise<{
  user: {
    uid: string;
    email: string | null;
    displayName: string | null;
    role: UserRole;
    signatureVerified: boolean;
    tokenIssuer?: string;
  };
  permissions: RolePermissions;
}> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/me', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch RBAC role (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Fetch Managed Users List (Owner & Admin only)
 */
export async function fetchManagedUsers(): Promise<{ users: ManagedUserAccount[]; totalCount: number }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/roles', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch users list (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Assign or Update User Role (Owner only)
 */
export async function setUserRole(email: string, role: UserRole): Promise<{ success: boolean; message: string; auditLogId: string }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/set-role', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, role }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update user role (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Fetch Append-Only Audit Trail Logs (Owner & Admin only)
 */
export async function fetchAuditLogs(): Promise<{ logs: AuditLogEntry[]; count: number; tamperEvidentPolicy: string }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/audit-logs', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch audit logs (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Record a tamper-evident audit log
 */
export async function submitAuditLog(action: string, targetResource: string, details?: Record<string, unknown>): Promise<{ success: boolean; logId: string }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/audit-logs', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, targetResource, details }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to append audit log (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Fetch Flagged Moderation Reports (Owner & Admin only)
 */
export async function fetchModerationReports(): Promise<{ reports: ModerationReport[]; pendingCount: number }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/moderation-reports', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch moderation reports (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Submit a Flagged Content Report
 */
export async function createModerationReport(reason: string, severity: 'low' | 'medium' | 'high' = 'medium', snippetHash?: string): Promise<{ success: boolean; report: ModerationReport }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/moderation-reports/create', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reason, severity, snippetHash }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to create moderation report (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Resolve or Dismiss Moderation Report (Owner & Admin only)
 */
export async function resolveModerationReport(reportId: string, resolution: 'resolved' | 'dismissed', actionTaken?: string): Promise<{ success: boolean; report: ModerationReport }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/moderation-reports/resolve', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ reportId, resolution, actionTaken }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to resolve moderation report (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Fetch System Discrepancies (Owner & Admin only)
 */
export async function fetchDiscrepancies(): Promise<{ discrepancies: SystemDiscrepancy[]; openCount: number }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/discrepancies', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch discrepancies (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Run Automated System Discrepancy & Zero-Trust Integrity Scan (Owner & Admin only)
 */
export async function triggerDiscrepancyScan(): Promise<{ success: boolean; scannedItems: SystemDiscrepancy[]; message: string }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/discrepancies/scan', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to trigger discrepancy scan (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Resolve Discrepancy (Owner & Admin only)
 */
export async function resolveDiscrepancy(id: string, note?: string): Promise<{ success: boolean; discrepancy: SystemDiscrepancy }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/discrepancies/resolve', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, note }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to resolve discrepancy (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Deactivate / Delete User Account (Owner & Admin only)
 */
export async function deleteUserAccount(email: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/users/delete', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, reason }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to delete user account (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Fetch Platform Configuration (Owner & Admin)
 */
export async function fetchPlatformConfig(): Promise<{ config: PlatformConfig }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/platform-config', {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch platform config (HTTP ${response.status})`);
  }

  return response.json();
}

/**
 * Update Platform Configuration (Owner only)
 */
export async function updatePlatformConfig(config: Partial<PlatformConfig>): Promise<{ success: boolean; config: PlatformConfig; message: string }> {
  const token = await getAuthBearerToken();
  const response = await fetch('/api/rbac/platform-config', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Failed to update platform config (HTTP ${response.status})`);
  }

  return response.json();
}
