import { InventoryItem, UserProfile, AuditLog, Technician } from '../types';
import { NotificationItem } from '../components/layout/NotificationsDropdown';

const READ_NOTIFS_KEY = 'fiberx_read_notifications_v1';

export function getReadNotificationIds(): string[] {
  try {
    const raw = localStorage.getItem(READ_NOTIFS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReadNotificationIds(ids: string[]): void {
  try {
    localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Failed to save read notifications', err);
  }
}

export function generateLiveNotifications(
  currentUser?: UserProfile | null,
  inventory: InventoryItem[] = [],
  technicians: Technician[] = [],
  auditLogs: AuditLog[] = [],
  readIds: string[] = []
): NotificationItem[] {
  const notifs: NotificationItem[] = [];
  const readSet = new Set(readIds || []);
  const safeInventory = Array.isArray(inventory) ? inventory : [];
  const safeLogs = Array.isArray(auditLogs) ? auditLogs : [];

  if (!currentUser) return notifs;

  if (currentUser.role === 'ADMIN') {
    // 1. Pending Account Tag Submissions from Technicians
    const pendingSubmissions = safeInventory.filter(
      (item) =>
        (item.verificationStatus === 'AWAITING_VERIFICATION' ||
          item.adminVerificationStatus === 'PENDING') &&
        !item.isReturnPending &&
        Boolean(item.customerAccountNumber)
    );

    if (pendingSubmissions.length > 0) {
      notifs.push({
        id: `admin-pending-submissions-${pendingSubmissions.length}`,
        title: `${pendingSubmissions.length} Account Tag(s) Awaiting Verification`,
        description: `Field technicians submitted ${pendingSubmissions.length} customer tag(s) requiring admin verification before subscriber binding.`,
        timestamp: 'Active Queue',
        type: 'warning',
        read: readSet.has(`admin-pending-submissions-${pendingSubmissions.length}`),
        actionTab: 'closures',
      });
    }

    // 2. Pending Hardware Returns from Technicians
    const pendingReturns = safeInventory.filter((item) => item.isReturnPending);
    if (pendingReturns.length > 0) {
      notifs.push({
        id: `admin-pending-returns-${pendingReturns.length}`,
        title: `${pendingReturns.length} Hardware Return(s) from Technicians`,
        description: `Field technicians sent equipment returns (${pendingReturns[0]?.name || 'Modems'} / ${pendingReturns[0]?.returnReason || 'Defective'}) awaiting warehouse check-in.`,
        timestamp: 'Inspection Required',
        type: 'alert',
        read: readSet.has(`admin-pending-returns-${pendingReturns.length}`),
        actionTab: 'closures',
      });
    }

    // 3. Suspected Duplicates
    const duplicates = safeInventory.filter(
      (item) => item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' && item.duplicateConflictSerial
    );
    if (duplicates.length > 0) {
      notifs.push({
        id: `admin-duplicates-${duplicates.length}`,
        title: `Duplicate Conflict Detected`,
        description: `Account tag conflict detected for serial ${duplicates[0]?.serialNumber}. Admin override authorization required.`,
        timestamp: 'Attention',
        type: 'alert',
        read: readSet.has(`admin-duplicates-${duplicates.length}`),
        actionTab: 'closures',
      });
    }

    // 4. Recent relevant audit activities (last 5)
    safeLogs
      .filter(
        (log) =>
          log.action === 'SUBMIT_VERIFICATION' ||
          log.action === 'TECH_RETURN_DISPATCH' ||
          log.action === 'ASSIGN' ||
          log.action === 'TECH_CONFIRM_RECEIPT'
      )
      .slice(0, 4)
      .forEach((log) => {
        let notifType: 'info' | 'warning' | 'success' | 'alert' = 'info';
        if (log.action === 'SUBMIT_VERIFICATION') notifType = 'warning';
        if (log.action === 'TECH_CONFIRM_RECEIPT') notifType = 'success';
        if (log.action === 'TECH_RETURN_DISPATCH') notifType = 'alert';

        notifs.push({
          id: `audit-${log.id}`,
          title:
            log.action === 'SUBMIT_VERIFICATION'
              ? 'New Technician Submission'
              : log.action === 'TECH_CONFIRM_RECEIPT'
              ? 'Technician Confirmed Receipt'
              : log.action === 'TECH_RETURN_DISPATCH'
              ? 'Technician Returned Hardware'
              : 'Equipment Dispatched to Tech',
          description: log.details,
          timestamp: log.timestamp.split(' ')[1] || 'Today',
          type: notifType,
          read: readSet.has(`audit-${log.id}`),
          actionTab:
            log.action === 'SUBMIT_VERIFICATION' || log.action === 'TECH_RETURN_DISPATCH'
              ? 'closures'
              : 'technicians',
        });
      });
  } else {
    // TECHNICIAN NOTIFICATIONS
    const techId = currentUser.technicianId;
    const techName = (currentUser.name || '').toLowerCase().trim();

    // 1. Newly assigned items from Admin not yet acknowledged
    const unacknowledgedDispatches = safeInventory.filter((item) => {
      const isMyItem =
        (techId && item.assignedTechnicianId === techId) ||
        (item.assignedTechnicianName &&
          techName &&
          item.assignedTechnicianName.toLowerCase().trim() === techName);
      return (
        isMyItem &&
        item.lifecycleStatus === 'ASSIGNED_RESERVED' &&
        !item.technicianAcknowledgedAt &&
        !item.customerAccountNumber
      );
    });

    if (unacknowledgedDispatches.length > 0) {
      const firstItem = unacknowledgedDispatches[0];
      notifs.push({
        id: `tech-incoming-dispatch-${unacknowledgedDispatches.length}`,
        title: `Admin Dispatched ${unacknowledgedDispatches.length} Item(s) to Your Van`,
        description: `Admin ${firstItem.assignedByUserName || 'Administrator'} assigned equipment (${firstItem.name}) to your van custody. Please review and acknowledge receipt.`,
        timestamp: 'New Dispatch',
        type: 'info',
        read: readSet.has(`tech-incoming-dispatch-${unacknowledgedDispatches.length}`),
      });
    }

    // 2. Approved submissions by Admin
    const approvedSubmissions = safeInventory.filter((item) => {
      const isMyItem =
        (techId && item.assignedTechnicianId === techId) ||
        (techId && item.submittedByTechnicianId === techId) ||
        (item.submittedByTechnicianName &&
          techName &&
          item.submittedByTechnicianName.toLowerCase().trim() === techName);
      return (
        isMyItem &&
        (item.verificationStatus === 'VERIFIED_CONNECTED' ||
          item.adminVerificationStatus === 'APPROVED')
      );
    });

    if (approvedSubmissions.length > 0) {
      const latestApproved = approvedSubmissions[0];
      notifs.push({
        id: `tech-approved-${latestApproved.id}`,
        title: `Account #${latestApproved.customerAccountNumber} Approved!`,
        description: `Admin ${latestApproved.verifiedByAdminName || 'Administrator'} verified and approved your customer installation for ${latestApproved.name} (${latestApproved.serialNumber}).`,
        timestamp: latestApproved.verifiedAt || 'Verified',
        type: 'success',
        read: readSet.has(`tech-approved-${latestApproved.id}`),
      });
    }

    // 3. Rejected or Flagged Submissions from Admin
    const rejectedSubmissions = safeInventory.filter((item) => {
      const isMyItem =
        (techId && item.assignedTechnicianId === techId) ||
        (techId && item.submittedByTechnicianId === techId) ||
        (item.submittedByTechnicianName &&
          techName &&
          item.submittedByTechnicianName.toLowerCase().trim() === techName);
      return (
        isMyItem &&
        (item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
          item.adminVerificationStatus === 'REJECTED')
      );
    });

    if (rejectedSubmissions.length > 0) {
      const latestRejected = rejectedSubmissions[0];
      notifs.push({
        id: `tech-rejected-${latestRejected.id}`,
        title: `Action Required: Tag #${latestRejected.customerAccountNumber} Rejected`,
        description: `Admin feedback: "${latestRejected.adminRejectionReason || 'Please inspect and resubmit photo proof or optical Rx.'}"`,
        timestamp: 'Revision Needed',
        type: 'alert',
        read: readSet.has(`tech-rejected-${latestRejected.id}`),
      });
    }

    // 4. Return hardware status
    const pendingReturns = safeInventory.filter((item) => {
      const isMyItem =
        (techId && item.assignedTechnicianId === techId) ||
        (techId && item.submittedByTechnicianId === techId);
      return isMyItem && item.isReturnPending;
    });

    if (pendingReturns.length > 0) {
      notifs.push({
        id: `tech-pending-return-${pendingReturns.length}`,
        title: `Hardware Return in Transit to Admin`,
        description: `${pendingReturns.length} item(s) sent for warehouse inspection: ${pendingReturns[0].name} (${pendingReturns[0].serialNumber}).`,
        timestamp: 'In Transit',
        type: 'info',
        read: readSet.has(`tech-pending-return-${pendingReturns.length}`),
      });
    }
  }

  return notifs;
}
