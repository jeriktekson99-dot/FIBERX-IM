import { InventoryItem, Technician, UserProfile, AuditLog, UserRole, LifecycleStatus, VerificationStatus } from '../types';

const STORAGE_KEYS = {
  INVENTORY: 'fiberx_inventory_v1',
  TECHNICIANS: 'fiberx_technicians_v1',
  PROFILES: 'fiberx_profiles_v1',
  CURRENT_USER_ID: 'fiberx_current_user_id_v1',
  AUDIT_LOGS: 'fiberx_audit_logs_v1',
  AUTH_STATUS: 'fiberx_auth_status_v1',
};

// Filter out any legacy mock data IDs that might linger in client browser localStorage
function isLegacyMockItem(id: string): boolean {
  return /^item-(0\d{2}|arch-00[1-4])$/.test(id);
}

function isLegacyMockTech(id: string): boolean {
  return /^tech-0[1-4]$/.test(id);
}

function isLegacyMockProfile(id: string): boolean {
  return id === 'user-admin' || id === 'user-operator' || id === 'user-default' || /^user-tech-0[1-4]$/.test(id);
}

function isLegacyMockLog(id: string): boolean {
  return /^log-00[1-6]$/.test(id);
}

function migrateItemStatus(item: any): InventoryItem {
  let lifecycleStatus: LifecycleStatus = item.lifecycleStatus;
  let verificationStatus: VerificationStatus = item.verificationStatus;

  if (!lifecycleStatus) {
    if (item.status === 'IN_STOCK') lifecycleStatus = 'IN_STOCK';
    else if (
      item.status === 'ASSIGNED' ||
      item.status === 'AWAITING_ADMIN_VERIFICATION' ||
      item.status === 'SUSPECTED_DUPLICATE' ||
      item.status === 'REJECTED_INVALID_TAG'
    ) {
      lifecycleStatus = 'ASSIGNED_RESERVED';
    } else if (item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED') {
      lifecycleStatus = 'INSTALLED_DEPLOYED';
    } else if (item.status === 'DEFECTIVE' || item.archived) {
      lifecycleStatus = 'OUT_OF_STOCK_REMOVED';
    } else {
      lifecycleStatus = 'IN_STOCK';
    }
  }

  if (!verificationStatus) {
    if (item.status === 'AWAITING_ADMIN_VERIFICATION') {
      verificationStatus = 'AWAITING_VERIFICATION';
    } else if (
      item.status === 'SUSPECTED_DUPLICATE' ||
      item.status === 'REJECTED_INVALID_TAG' ||
      item.status === 'DEFECTIVE'
    ) {
      verificationStatus = 'FLAGGED_ACTION_REQUIRED';
    } else if (
      item.status === 'INSTALLED_VERIFIED' ||
      item.status === 'INSTALLED_CLOSED' ||
      item.customerAccountNumber
    ) {
      verificationStatus = 'VERIFIED_CONNECTED';
    } else {
      verificationStatus = 'UNLINKED_READY';
    }
  }

  return {
    ...item,
    lifecycleStatus,
    verificationStatus,
    proofPhotos: item.proofPhotos || [],
    photoProofUrls: item.photoProofUrls || [],
    photoProofUrl: item.photoProofUrl || '',
  };
}

export function getStoredInventory(): InventoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
    if (!raw) {
      return [];
    }
    const parsed: any[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge any legacy mock records from localStorage
    const filtered = parsed.filter((item: any) => !isLegacyMockItem(item.id));
    const migrated = filtered.map(migrateItemStatus);
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}

export function saveStoredInventory(items: InventoryItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
  } catch (err) {
    console.error('Failed to save inventory to storage', err);
  }
}

export function getStoredTechnicians(): Technician[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TECHNICIANS);
    if (!raw) {
      return [];
    }
    const parsed: Technician[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge any legacy mock technician records from localStorage
    const filtered = parsed.filter((tech) => !isLegacyMockTech(tech.id));
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export function saveStoredTechnicians(technicians: Technician[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TECHNICIANS, JSON.stringify(technicians));
  } catch (err) {
    console.error('Failed to save technicians to storage', err);
  }
}

export function getStoredProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILES);
    if (!raw) {
      return [];
    }
    const parsed: UserProfile[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Purge any legacy mock profiles from localStorage
    const filtered = parsed.filter(
      (profile) =>
        !isLegacyMockProfile(profile.id) &&
        profile.email?.toLowerCase() !== 'admin@fiberx.ph' &&
        profile.badgeId !== 'FX-ADM-001'
    );
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export const BOOKMARKS_STORAGE_KEY = 'fiberx_bookmarked_items_v1';

export function getStoredBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: string[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Filter out mock IDs
    return parsed.filter((id) => !isLegacyMockItem(id) && id !== 'item-01' && id !== 'item-03');
  } catch {
    return [];
  }
}

export function saveStoredBookmarks(ids: string[]): void {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}

export function saveStoredProfiles(profiles: UserProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save profiles to localStorage:', err);
  }
}

export function getStoredAuthStatus(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEYS.AUTH_STATUS) === 'true';
  } catch {
    return false;
  }
}

export function setStoredAuthStatus(isAuth: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, isAuth ? 'true' : 'false');
  } catch (err) {
    console.error('Failed to set auth status in localStorage', err);
  }
}

export function findProfileByEmail(email: string): UserProfile | undefined {
  const profiles = getStoredProfiles();
  const clean = email.trim().toLowerCase();
  return profiles.find((p) => p.email.toLowerCase() === clean);
}

export function registerNewProfile(profileData: Omit<UserProfile, 'id'>): UserProfile {
  const profiles = getStoredProfiles();
  const newProfile: UserProfile = {
    ...profileData,
    id: `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  };
  const updated = [...profiles, newProfile];
  saveStoredProfiles(updated);
  return newProfile;
}

export const EMPTY_USER_PROFILE: UserProfile = {
  id: '',
  name: '',
  email: '',
  role: 'ADMIN',
  badgeId: '',
  department: '',
};

export function getCurrentUserProfile(): UserProfile | null {
  const profiles = getStoredProfiles();
  const currentId = localStorage.getItem(STORAGE_KEYS.CURRENT_USER_ID);
  const found = profiles.find((p) => p.id === currentId);
  if (found) return found;
  if (profiles.length > 0) return profiles[0];
  return null;
}

export function setCurrentUserProfile(profileId: string): UserProfile | null {
  const profiles = getStoredProfiles();
  const found = profiles.find((p) => p.id === profileId);
  if (found) {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER_ID, found.id);
    return found;
  }
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  return null;
}

export function getStoredAuditLogs(): AuditLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    if (!raw) {
      return [];
    }
    const parsed: AuditLog[] = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const filtered = parsed.filter((log) => !isLegacyMockLog(log.id));
    if (filtered.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(filtered));
    }
    return filtered;
  } catch {
    return [];
  }
}

export function logAuditEvent(
  action: AuditLog['action'],
  details: string,
  user: UserProfile,
  item?: Partial<InventoryItem>,
  extra?: {
    technicianId?: string;
    customerAccountNumber?: string;
    approvalStatus?: AuditLog['approvalStatus'];
  }
): AuditLog {
  const logs = getStoredAuditLogs();
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes()
  ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

  const newLog: AuditLog = {
    id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    timestamp,
    action,
    itemId: item?.id,
    itemSerial: item?.serialNumber,
    itemSku: item?.sku,
    technicianId: extra?.technicianId || item?.assignedTechnicianId,
    customerAccountNumber: extra?.customerAccountNumber || item?.customerAccountNumber,
    approvalStatus: extra?.approvalStatus || (item?.adminVerificationStatus as any),
    performedBy: `${user.name} (${user.role})`,
    role: user.role,
    details,
  };

  const updatedLogs = [newLog, ...logs].slice(0, 500); // keep up to 500 logs
  localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updatedLogs));
  return newLog;
}

export function recalculateTechnicianCounts(items: InventoryItem[], technicians: Technician[]): Technician[] {
  return technicians.map((tech) => {
    // Active jobs in technician custody (Assigned / Reserved or pending / flagged verification)
    const activeJobs = items.filter(
      (it) =>
        it.assignedTechnicianId === tech.id &&
        !it.archived &&
        (it.lifecycleStatus === 'ASSIGNED_RESERVED' ||
          it.verificationStatus === 'AWAITING_VERIFICATION' ||
          it.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
          it.status === 'ASSIGNED' ||
          it.status === 'AWAITING_ADMIN_VERIFICATION' ||
          it.status === 'SUSPECTED_DUPLICATE' ||
          it.status === 'REJECTED_INVALID_TAG')
    ).length;

    // Completed & verified installations
    const completed = items.filter(
      (it) =>
        it.assignedTechnicianId === tech.id &&
        (it.verificationStatus === 'VERIFIED_CONNECTED' ||
          it.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
          it.status === 'INSTALLED_VERIFIED' ||
          it.status === 'INSTALLED_CLOSED')
    ).length;

    return {
      ...tech,
      activeJobCount: activeJobs,
      completedCount: tech.completedCount > completed ? tech.completedCount : completed,
    };
  });
}

export function clearDatabase(): {
  inventory: InventoryItem[];
  technicians: Technician[];
  profiles: UserProfile[];
  logs: AuditLog[];
} {
  localStorage.removeItem(STORAGE_KEYS.INVENTORY);
  localStorage.removeItem(STORAGE_KEYS.TECHNICIANS);
  localStorage.removeItem(STORAGE_KEYS.PROFILES);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER_ID);
  localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
  localStorage.removeItem(BOOKMARKS_STORAGE_KEY);

  return {
    inventory: [],
    technicians: [],
    profiles: [],
    logs: [],
  };
}
