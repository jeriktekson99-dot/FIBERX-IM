import React, { useState, useEffect, useCallback } from 'react';
import {
  InventoryItem,
  Technician,
  UserProfile,
  AuditLog,
  FilterState,
  UserRole,
  ProofPhoto,
} from './types';
import {
  getStoredInventory,
  saveStoredInventory,
  getStoredTechnicians,
  saveStoredTechnicians,
  getStoredProfiles,
  saveStoredProfiles,
  getCurrentUserProfile,
  setCurrentUserProfile,
  getStoredAuditLogs,
  logAuditEvent,
  recalculateTechnicianCounts,
  clearDatabase,
  getStoredAuthStatus,
  setStoredAuthStatus,
  registerNewProfile,
  getStoredBookmarks,
  saveStoredBookmarks,
} from './utils/storage';
import { useHardwareBarcodeScanner } from './utils/barcodeListener';

// Auth
import { LoginPage } from './components/auth/LoginPage';

// Layout
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { TechnicianPortal } from './components/technician/TechnicianPortal';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// Views
import { DashboardView } from './components/views/DashboardView';
import { DataGrid } from './components/inventory/DataGrid';
import { TechnicianHubView } from './components/views/TechnicianHubView';
import { AccountClosuresView } from './components/views/AccountClosuresView';
import { UserManagementView } from './components/users/UserManagementView';
import { ArchiveView } from './components/views/ArchiveView';

// Modals
import { ReceiveStockModal } from './components/modals/ReceiveStockModal';
import { AssignTechnicianModal } from './components/modals/AssignTechnicianModal';
import { AccountClosureModal } from './components/modals/AccountClosureModal';
import { AdminVerificationModal } from './components/modals/AdminVerificationModal';
import { BarcodeScannerModal } from './components/modals/BarcodeScannerModal';
import { ItemDetailView } from './components/views/ItemDetailView';
import { SupabaseManagerModal } from './components/modals/SupabaseManagerModal';
import {
  syncInventoryItemToSupabase,
  syncTechnicianToSupabase,
  recordAuditLogInSupabase,
  fetchInventoryFromSupabase,
  fetchTechniciansFromSupabase,
  registerUserInSupabaseAuthAndDb,
  syncUserProfileToSupabase,
  deleteUserFromSupabase,
} from './services/supabaseService';
import { isSupabaseConfigured } from './lib/supabase';

export default function App() {
  // Primary State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfile>(getCurrentUserProfile());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>(() => getStoredBookmarks());

  const handleToggleBookmark = useCallback((id: string) => {
    setBookmarkedIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      saveStoredBookmarks(next);
      return next;
    });
  }, []);

  // Navigation & Filtering
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users' | 'archive'>('inventory');
  const [filterState, setFilterState] = useState<FilterState>({
    category: 'ALL',
    subCategory: 'ALL',
    lifecycleStatus: 'ALL',
    verificationStatus: 'ALL',
    status: 'ALL',
    technicianId: 'ALL',
    storageBin: '',
    search: '',
    onlyUnclosed: false,
    viewMode: 'active',
  });

  // Modal Visibility States
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState<boolean>(false);
  const [initialReceiveSerial, setInitialReceiveSerial] = useState<string>('');
  const [receiveModalExternalScan, setReceiveModalExternalScan] = useState<{ code: string; timestamp: number } | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState<boolean>(false);
  const [itemsToAssign, setItemsToAssign] = useState<InventoryItem[]>([]);
  const [assignModalTechId, setAssignModalTechId] = useState<string>('');
  const [assignModalExternalScan, setAssignModalExternalScan] = useState<{ code: string; timestamp: number } | null>(null);

  const [isClosureModalOpen, setIsClosureModalOpen] = useState<boolean>(false);
  const [itemToClose, setItemToClose] = useState<InventoryItem | null>(null);

  const [isAdminVerificationModalOpen, setIsAdminVerificationModalOpen] = useState<boolean>(false);
  const [itemToVerify, setItemToVerify] = useState<InventoryItem | null>(null);

  const [isScannerHubOpen, setIsScannerHubOpen] = useState<boolean>(false);
  const [initialScanQuery, setInitialScanQuery] = useState<string>('');
  const [scannerHubExternalScan, setScannerHubExternalScan] = useState<{ code: string; timestamp: number } | null>(null);

  const [isDetailModalOpen, setIsDetailModalOpen] = useState<boolean>(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);

  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState<boolean>(false);

  // Toast notifications disabled per user request
  const showToast = useCallback((_text: string, _type: 'teal' | 'emerald' | 'red' | 'amber' = 'teal') => {
    // Intentionally no-op to remove floating notification banners
  }, []);

  // Auth State & Handlers
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return getStoredAuthStatus();
  });

  const handleLoginSuccess = (user: UserProfile) => {
    setCurrentUser(user);
    setCurrentUserProfile(user.id);
    setIsAuthenticated(true);
    setStoredAuthStatus(true);
    const updatedProfiles = getStoredProfiles();
    setProfiles(updatedProfiles);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setStoredAuthStatus(false);
  };

  const handleRegisterUser = (newProfileData: Omit<UserProfile, 'id'>) => {
    const created = registerNewProfile(newProfileData);
    const updated = getStoredProfiles();
    setProfiles(updated);
    return created;
  };

  // Hydrate Data on Mount
  useEffect(() => {
    const rawInv = getStoredInventory();
    const rawTech = getStoredTechnicians();
    const rawProfiles = getStoredProfiles();
    const rawUser = getCurrentUserProfile();
    const rawLogs = getStoredAuditLogs();

    const syncedTechs = recalculateTechnicianCounts(rawInv, rawTech);

    setInventory(rawInv);
    setTechnicians(syncedTechs);
    setProfiles(rawProfiles);
    setCurrentUser(rawUser);
    setAuditLogs(rawLogs);

    if (isSupabaseConfigured()) {
      fetchInventoryFromSupabase().then((remoteItems) => {
        if (remoteItems && remoteItems.length > 0) {
          setInventory(remoteItems);
          saveStoredInventory(remoteItems);
        }
      });
      fetchTechniciansFromSupabase().then((remoteTechs) => {
        if (remoteTechs && remoteTechs.length > 0) {
          setTechnicians(remoteTechs);
          saveStoredTechnicians(remoteTechs);
        }
      });
    }
  }, []);

  // Update Technician Counts when inventory changes
  const updateInventoryAndSync = (newInventory: InventoryItem[]) => {
    setInventory(newInventory);
    saveStoredInventory(newInventory);

    const updatedTechs = recalculateTechnicianCounts(newInventory, technicians);
    setTechnicians(updatedTechs);
    saveStoredTechnicians(updatedTechs);

    if (isSupabaseConfigured()) {
      newInventory.forEach((item) => {
        syncInventoryItemToSupabase(item);
      });
      updatedTechs.forEach((t) => {
        syncTechnicianToSupabase(t);
      });
    }
  };

  // Hardware Barcode Scanner Global Callback
  const handleHardwareScan = useCallback(
    (scannedBarcode: string) => {
      const clean = scannedBarcode.trim().toUpperCase();
      if (!clean) return;

      // 1. If Receive Stock Modal is open, forward the scan to it and DO NOT switch mode or open detail modal
      if (isReceiveModalOpen) {
        setReceiveModalExternalScan({ code: clean, timestamp: Date.now() });
        return;
      }

      // 2. If Assign Technician Modal is open, forward the scan to it to add to assignment list
      if (isAssignModalOpen) {
        setAssignModalExternalScan({ code: clean, timestamp: Date.now() });
        return;
      }

      // 3. If Scanner Hub is open, forward the scan to it
      if (isScannerHubOpen) {
        setScannerHubExternalScan({ code: clean, timestamp: Date.now() });
        return;
      }

      // 4. Otherwise: standard global inventory lookup / intake prompt
      const found = inventory.find(
        (i) =>
          i.serialNumber.toUpperCase() === clean ||
          i.sku.toUpperCase() === clean ||
          (i.macAddress && i.macAddress.replace(/[^A-Za-z0-9]/g, '').toUpperCase() === clean.replace(/[^A-Za-z0-9]/g, ''))
      );

      logAuditEvent(
        'SCAN_LOOKUP',
        `Hardware barcode scanner captured: [${clean}] - ${found ? `Matched ${found.name} (${found.status})` : 'Unregistered Serial'}`,
        currentUser,
        found
      );
      setAuditLogs(getStoredAuditLogs());

      if (found) {
        showToast(`Barcode Scanned: Matched [${found.serialNumber}] (${found.status})`, 'teal');
        setSelectedDetailItem(found);
        setIsDetailModalOpen(true);
      } else {
        // Only trigger global receive intake prompt if not currently on user management
        if (currentTab !== 'users') {
          showToast(`Hardware Barcode Scanned: [${clean}] (Ready to Add)`, 'teal');
          setInitialReceiveSerial(clean);
          setIsReceiveModalOpen(true);
        }
      }
    },
    [inventory, currentUser, showToast, isReceiveModalOpen, isAssignModalOpen, isScannerHubOpen, currentTab]
  );

  // Disable global background scanner when logged out, in User Management, or during blocking modal workflows
  const isScannerDisabled =
    !currentUser ||
    currentTab === 'users' ||
    isClosureModalOpen ||
    isAdminVerificationModalOpen ||
    isDetailModalOpen;

  const { isScannerListening, scanPulse } = useHardwareBarcodeScanner({
    onScan: handleHardwareScan,
    disabled: isScannerDisabled,
  });

  // Switch User Profile / Persona
  const handleSwitchProfile = (profileId: string) => {
    const updated = setCurrentUserProfile(profileId);
    setCurrentUser(updated);

    // If switched to Field Tech, switch view mode appropriately
    if (updated.role === 'TECHNICIAN' && updated.technicianId) {
      setFilterState((prev) => ({
        ...prev,
        technicianId: updated.technicianId || 'ALL',
        viewMode: 'active',
      }));
    } else {
      setFilterState((prev) => ({
        ...prev,
        technicianId: 'ALL',
      }));
    }
  };

  // 1. Receive Single Stock
  const handleReceiveStock = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      lifecycleStatus: itemData.lifecycleStatus || 'IN_STOCK',
      verificationStatus: itemData.verificationStatus || 'UNLINKED_READY',
      status: 'IN_STOCK',
    };

    const updated = [newItem, ...inventory];
    updateInventoryAndSync(updated);

    logAuditEvent(
      'RECEIVE',
      `Stock received: ${newItem.serialNumber || '[Non-barcoded]'} (${newItem.name}) into ${newItem.storageBin}`,
      currentUser,
      newItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Stock Received: ${newItem.name} added to ${newItem.storageBin}`, 'emerald');
    // Ensure the stock inventory view is immediately active and reflecting the new product
    setCurrentTab('inventory');
    setFilterState((prev) => ({ ...prev, viewMode: 'active' }));
  };

  // 1b. Batch Receive Stock (from Bulk Scan)
  const handleBatchReceiveStock = (itemsData: Omit<InventoryItem, 'id'>[]) => {
    if (itemsData.length === 0) return;
    const now = Date.now();
    const newItems: InventoryItem[] = itemsData.map((itemData, index) => ({
      ...itemData,
      id: `item-${now}-${index}-${Math.floor(Math.random() * 1000)}`,
      lifecycleStatus: itemData.lifecycleStatus || 'IN_STOCK',
      verificationStatus: itemData.verificationStatus || 'UNLINKED_READY',
      status: 'IN_STOCK',
    }));

    const totalUnits = newItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const updated = [...newItems, ...inventory];
    updateInventoryAndSync(updated);

    logAuditEvent(
      'BULK_IMPORT',
      `Bulk received ${totalUnits} unit(s) across ${newItems.length} entries (${newItems[0]?.name}) via barcode scanner batch`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Batch Received: Successfully added ${totalUnits} unit(s) to Stock Inventory`, 'emerald');
    // Ensure the stock inventory view is immediately active and reflecting the new products
    setCurrentTab('inventory');
    setFilterState((prev) => ({ ...prev, viewMode: 'active' }));
  };

  // 1c. Update Item (for live quantity adjustments or metadata)
  const handleUpdateItem = (id: string, updates: Partial<InventoryItem>) => {
    const targetItem = inventory.find((i) => i.id === id);
    const updated = inventory.map((item) => (item.id === id ? { ...item, ...updates } : item));
    updateInventoryAndSync(updated);

    if (updates.quantity !== undefined && targetItem) {
      logAuditEvent(
        'EDIT',
        `Adjusted stock quantity for ${targetItem.serialNumber || targetItem.sku} (${targetItem.name}) from ${targetItem.quantity} to ${updates.quantity} ${targetItem.unit}`,
        currentUser,
        { ...targetItem, ...updates }
      );
      setAuditLogs(getStoredAuditLogs());
      showToast(`Quantity updated to ${updates.quantity} for ${targetItem.name}`, 'emerald');
    }
  };

  // 2. Assign Equipment to Technician (Overhauled with validity check, address, contact person, slots & pairing)
  const handleAssignToTechnician = (
    itemsOrAssignments:
      | {
          itemId: string;
          quantity: number;
          pairedItemId?: string;
          pairedItemSerial?: string;
          pairedItemName?: string;
          pairingStatus?: 'PAIRED' | 'UNPAIRED';
          slotNumber?: string;
        }[]
      | string[],
    technician: Technician,
    dispatchNotes?: string,
    overrideInfo?: { isOverride: boolean; overrideReason?: string }
  ) => {
    const now = new Date();
    const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    // Map of itemId -> assignment metadata
    const assignmentMap = new Map<string, number>();
    const assignmentDetailsMap = new Map<
      string,
      {
        quantity: number;
        pairedItemId?: string;
        pairedItemSerial?: string;
        pairedItemName?: string;
        pairingStatus?: 'PAIRED' | 'UNPAIRED';
        slotNumber?: string;
      }
    >();

    if (Array.isArray(itemsOrAssignments)) {
      itemsOrAssignments.forEach((entry) => {
        if (typeof entry === 'string') {
          assignmentMap.set(entry, -1); // -1 means all available
        } else if (entry && entry.itemId) {
          assignmentMap.set(entry.itemId, entry.quantity);
          assignmentDetailsMap.set(entry.itemId, entry);
        }
      });
    }

    let totalUnitsAssigned = 0;
    const newInventoryList: InventoryItem[] = [];
    let slotCounter = 1;

    inventory.forEach((item) => {
      if (assignmentMap.has(item.id)) {
        const requestedQty = assignmentMap.get(item.id)!;
        const assignQty = requestedQty > 0 ? Math.min(requestedQty, item.quantity) : item.quantity;
        totalUnitsAssigned += assignQty;

        const detail = assignmentDetailsMap.get(item.id);
        const assignedSlot =
          detail?.slotNumber || item.slotNumber || `SLOT-${String(slotCounter).padStart(2, '0')}`;
        
        const isExplicitlyPaired =
          detail?.pairingStatus === 'PAIRED' ||
          Boolean(detail?.pairedItemId) ||
          Boolean(detail?.pairedItemSerial);
        const isPaired =
          isExplicitlyPaired ||
          item.pairingStatus === 'PAIRED' ||
          Boolean(item.pairedItemSerial);
        slotCounter++;

        const assignmentMetadata = {
          slotNumber: assignedSlot,
          pairingStatus: (isPaired ? 'PAIRED' : 'UNPAIRED') as 'PAIRED' | 'UNPAIRED',
          pairedItemId: detail?.pairedItemId || item.pairedItemId,
          pairedItemSerial: detail?.pairedItemSerial || item.pairedItemSerial,
          pairedItemName: detail?.pairedItemName || item.pairedItemName,
          assignedByUserId: currentUser.id,
          assignedByUserName: currentUser.name,
          assignedByUserRole: currentUser.role,
          dispatchHubAddress:
            technician.hubAddress ||
            'Central Logistics Warehouse',
          contactPersonName: currentUser.name,
          contactPersonPhone: technician.contactPerson || technician.phone,
          isFlaggedOverride: overrideInfo?.isOverride,
          flagOverrideReason: overrideInfo?.overrideReason,
        };

        if (assignQty >= item.quantity) {
          // Entire item stock transferred to technician
          newInventoryList.push({
            ...item,
            ...assignmentMetadata,
            quantity: assignQty,
            lifecycleStatus: 'ASSIGNED_RESERVED' as const,
            verificationStatus: item.verificationStatus || ('UNLINKED_READY' as const),
            status: 'ASSIGNED' as const,
            assignedTechnicianId: technician.id,
            assignedTechnicianName: technician.name,
            assignedAt: timestamp,
            storageBin: `${technician.assignedVan} / Transit`,
            notes: dispatchNotes
              ? `${item.notes ? item.notes + ' | ' : ''}${dispatchNotes}`
              : item.notes,
          });
        } else {
          // Partial quantity assigned: remaining units remain in stock
          newInventoryList.push({
            ...item,
            quantity: item.quantity - assignQty,
          });

          // Dispatched portion becomes assigned to technician
          newInventoryList.push({
            ...item,
            ...assignmentMetadata,
            id: `item-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
            quantity: assignQty,
            lifecycleStatus: 'ASSIGNED_RESERVED' as const,
            verificationStatus: 'UNLINKED_READY' as const,
            status: 'ASSIGNED' as const,
            assignedTechnicianId: technician.id,
            assignedTechnicianName: technician.name,
            assignedAt: timestamp,
            storageBin: `${technician.assignedVan} / Transit`,
            notes: dispatchNotes
              ? `${item.notes ? item.notes + ' | ' : ''}${dispatchNotes}`
              : item.notes,
          });
        }
      } else {
        newInventoryList.push(item);
      }
    });

    updateInventoryAndSync(newInventoryList);

    if (overrideInfo?.isOverride) {
      logAuditEvent(
        'OVERRIDE_FLAGGED_ASSIGNMENT',
        `Operational Validity Override authorized by ${currentUser.name} (${currentUser.role}, ${currentUser.badgeId}) for flagged technician ${technician.name}. Reason: ${overrideInfo.overrideReason}`,
        currentUser
      );
    }

    logAuditEvent(
      'ASSIGN',
      `Dispatched ${assignmentMap.size} stock items (${totalUnitsAssigned} units) to Technician ${technician.name} (${technician.employeeId}, ${technician.assignedVan})${overrideInfo?.isOverride ? ` [VALIDITY OVERRIDE: ${overrideInfo.overrideReason}]` : ''} | Assigned by ${currentUser.name} at ${technician.hubAddress || 'Hub'}`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(
      overrideInfo?.isOverride
        ? `Authorized & Assigned ${totalUnitsAssigned} units to ${technician.name} with validity override.`
        : `Assigned ${totalUnitsAssigned} units to ${technician.name} (Status: [ASSIGNED / RESERVED])`,
      overrideInfo?.isOverride ? 'amber' : 'teal'
    );
  };

  // 3. Flagging / Unflagging Technician for validity check
  const handleToggleFlagTechnician = (technicianId: string, isFlagged: boolean, reason?: string) => {
    const updated = technicians.map((t) => {
      if (t.id === technicianId) {
        return {
          ...t,
          isFlagged,
          flagReason: isFlagged ? reason || 'Operational Flag / Pending Clearance' : undefined,
          flaggedAt: isFlagged ? new Date().toISOString() : undefined,
          flaggedBy: isFlagged ? `${currentUser.name} (${currentUser.badgeId})` : undefined,
        };
      }
      return t;
    });
    setTechnicians(updated);
    saveStoredTechnicians(updated);

    const tech = technicians.find((t) => t.id === technicianId);
    const techName = tech?.name || technicianId;

    logAuditEvent(
      isFlagged ? 'FLAG_TECHNICIAN' : 'UNFLAG_TECHNICIAN',
      isFlagged
        ? `Technician ${techName} flagged by ${currentUser.name}: ${reason || 'Flagged for operational review'}`
        : `Technician ${techName} cleared from flag hold by ${currentUser.name}`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(
      isFlagged
        ? `Flagged ${techName}: Equipment assignment restricted without validity override.`
        : `Cleared ${techName}: Full operational status restored.`,
      isFlagged ? 'amber' : 'emerald'
    );
  };

  // 3b. Update Warehouse Stock Utilization
  const handleUpdateUtilization = (itemId: string, utilizedQuantity: number, notes?: string) => {
    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          utilizedQuantity,
          isUtilized: utilizedQuantity > 0,
          utilizedNotes: notes || item.utilizedNotes,
          utilizedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    const target = inventory.find((i) => i.id === itemId);
    logAuditEvent(
      'UPDATE_UTILIZATION',
      `Updated warehouse item utilization for ${target?.name} (${target?.serialNumber || target?.sku}): ${utilizedQuantity} units used. Notes: ${notes || 'None'}`,
      currentUser,
      target
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Updated utilization: ${utilizedQuantity} units recorded as used.`, 'teal');
  };

  // Register new field technician account
  const handleAddTechnician = (newTech: Technician, newProfile: UserProfile) => {
    const updatedTechs = recalculateTechnicianCounts(inventory, [...technicians, newTech]);
    setTechnicians(updatedTechs);
    saveStoredTechnicians(updatedTechs);

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    saveStoredProfiles(updatedProfiles);

    // Sync account to Supabase Authentication (auth.users) & database tables
    registerUserInSupabaseAuthAndDb(newProfile);
    syncTechnicianToSupabase(newTech);

    logAuditEvent(
      'REGISTER_TECHNICIAN',
      `Registered Field Technician Account: ${newTech.name} (${newTech.employeeId}) assigned to van ${newTech.assignedVan} in ${newTech.area}`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Technician account for ${newTech.name} successfully registered across fleet systems!`, 'teal');
  };

  // 4. Technician Submission for Admin Verification (Section 4.4 Gatekeeper)
  const handleSubmitVerification = (
    itemId: string,
    submissionData: {
      customerAccountNumber: string;
      customerName: string;
      customerAddress: string;
      opticalRx?: string;
      notes?: string;
      photoProofUrl?: string;
      photoProofType?: 'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS';
      photoProofUrls?: string[];
      proofPhotos?: ProofPhoto[];
      isDuplicateDetected: boolean;
      duplicateConflictSerial?: string;
    }
  ) => {
    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const targetItem = inventory.find((i) => i.id === itemId);
    const newStatus = submissionData.isDuplicateDetected
      ? ('SUSPECTED_DUPLICATE' as const)
      : ('AWAITING_ADMIN_VERIFICATION' as const);

    const photosList = submissionData.photoProofUrls && submissionData.photoProofUrls.length > 0
      ? submissionData.photoProofUrls
      : submissionData.photoProofUrl ? [submissionData.photoProofUrl] : [];

    const structuredPhotos: ProofPhoto[] = submissionData.proofPhotos && submissionData.proofPhotos.length > 0
      ? submissionData.proofPhotos
      : photosList.map((url, idx) => ({
          id: `proof-${Date.now()}-${idx}`,
          name: idx === 0 ? 'Primary Installation Proof' : `Field Proof #${idx + 1}`,
          url,
          type: (idx === 0 ? submissionData.photoProofType : undefined) || 'INSTALLATION_PHOTO',
          timestamp: formattedTimestamp,
        }));

    const primaryPhotoUrl = submissionData.photoProofUrl || photosList[0] || '';
    const primaryPhotoType = submissionData.photoProofType || structuredPhotos[0]?.type || 'INSTALLATION_PHOTO';

    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          lifecycleStatus: 'ASSIGNED_RESERVED' as const,
          verificationStatus: submissionData.isDuplicateDetected
            ? ('FLAGGED_ACTION_REQUIRED' as const)
            : ('AWAITING_VERIFICATION' as const),
          status: newStatus,
          customerAccountNumber: submissionData.customerAccountNumber,
          customerName: submissionData.customerName,
          customerAddress: submissionData.customerAddress,
          opticalRx: submissionData.opticalRx,
          photoProofUrl: primaryPhotoUrl,
          photoProofType: primaryPhotoType,
          photoProofUrls: photosList,
          proofPhotos: structuredPhotos,
          duplicateConflictSerial: submissionData.duplicateConflictSerial,
          submittedByTechnicianId: currentUser.technicianId || item.assignedTechnicianId || currentUser.id,
          submittedByTechnicianName: currentUser.name,
          submittedAt: formattedTimestamp,
          adminVerificationStatus: 'PENDING' as const,
          adminRejectionReason: undefined,
          notes: submissionData.notes
            ? `${item.notes ? item.notes + ' | ' : ''}Tech Submission: Rx ${submissionData.opticalRx || 'N/A'}. ${submissionData.notes}`
            : item.notes,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    const totalPhotosSent = structuredPhotos.length || photosList.length;
    logAuditEvent(
      'SUBMIT_VERIFICATION',
      `Technician ${currentUser.name} submitted customer account #${submissionData.customerAccountNumber} (${submissionData.customerName}) with ${totalPhotosSent} photo proof(s). Routed to Admin Verification Queue. Status: [${newStatus}]`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    if (submissionData.isDuplicateDetected) {
      showToast(
        `Warning: Suspected duplicate account #${submissionData.customerAccountNumber} detected. Sent to Admin Queue for verification.`,
        'teal'
      );
    } else {
      showToast(
        `Account #${submissionData.customerAccountNumber} submitted! Awaiting Admin Verification.`,
        'teal'
      );
    }
  };

  // 4b. Admin Approval Handler (Gatekeeper Rule)
  const handleApproveVerification = (itemId: string, overrideDuplicate = false) => {
    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const targetItem = inventory.find((i) => i.id === itemId);

    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          lifecycleStatus: 'INSTALLED_DEPLOYED' as const,
          verificationStatus: 'VERIFIED_CONNECTED' as const,
          status: 'INSTALLED_VERIFIED' as const,
          adminVerificationStatus: 'APPROVED' as const,
          verifiedByAdminId: currentUser.id,
          verifiedByAdminName: currentUser.name,
          verifiedAt: formattedTimestamp,
          installationDate: formattedTimestamp,
          storageBin: 'Customer Premises',
          adminRejectionReason: undefined,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent(
      overrideDuplicate ? 'OVERRIDE_DUPLICATE' : 'ADMIN_APPROVE',
      `Admin ${currentUser.name} verified and approved Account Tag #${targetItem?.customerAccountNumber || 'N/A'} for Serial ${targetItem?.serialNumber || targetItem?.sku}. Status shifted to [INSTALLED / DEPLOYED & VERIFIED / CONNECTED].`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(
      `Approved: Modem ${targetItem?.serialNumber || targetItem?.sku} status updated to [INSTALLED / DEPLOYED & VERIFIED / CONNECTED]!`,
      'emerald'
    );
  };

  // 4c. Admin Rejection Handler (Gatekeeper Rule)
  const handleRejectVerification = (itemId: string, reason: string) => {
    const targetItem = inventory.find((i) => i.id === itemId);

    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          lifecycleStatus: 'ASSIGNED_RESERVED' as const,
          verificationStatus: 'FLAGGED_ACTION_REQUIRED' as const,
          status: 'REJECTED_INVALID_TAG' as const,
          adminVerificationStatus: 'REJECTED' as const,
          adminRejectionReason: reason,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent(
      'ADMIN_REJECT',
      `Admin ${currentUser.name} rejected Account Tag #${targetItem?.customerAccountNumber || 'N/A'} (Reason: "${reason}"). Reverted to Field Technician custody for correction.`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Submission Rejected: Invalid Account Tag. Reverted to field technician custody.`, 'red');
  };

  // 4d. Technician Acknowledge Equipment Receipt from Admin
  const handleTechnicianAcknowledgeReceipt = (itemIds: string[]) => {
    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const idSet = new Set(itemIds);
    const updated = inventory.map((item) => {
      if (idSet.has(item.id)) {
        return {
          ...item,
          technicianAcknowledgedAt: formattedTimestamp,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    const targetItems = inventory.filter((i) => idSet.has(i.id));
    logAuditEvent(
      'TECH_CONFIRM_RECEIPT',
      `Technician ${currentUser.name} acknowledged & confirmed receipt of ${itemIds.length} item(s) (${targetItems.map((i) => i.serialNumber || i.name).join(', ')}) into Van Kit. Dispatched by ${targetItems[0]?.assignedByUserName || 'Admin'}.`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Receipt Confirmed: ${itemIds.length} item(s) acknowledged into your Van Kit!`, 'emerald');
  };

  // 4e. Technician Return Equipment to Admin / Warehouse
  const handleTechnicianReturnToAdmin = (itemId: string, reason: string, notes?: string) => {
    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const targetItem = inventory.find((i) => i.id === itemId);
    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          isReturnPending: true,
          returnReason: reason,
          returnSubmittedAt: formattedTimestamp,
          verificationStatus: 'AWAITING_VERIFICATION' as const,
          adminVerificationStatus: 'PENDING' as const,
          notes: notes
            ? `${item.notes ? item.notes + ' | ' : ''}Tech Return: ${reason}. ${notes}`
            : item.notes ? `${item.notes} | Tech Return: ${reason}` : `Tech Return: ${reason}`,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent(
      'TECH_RETURN_DISPATCH',
      `Technician ${currentUser.name} sent hardware return for ${targetItem?.name} (${targetItem?.serialNumber || targetItem?.sku}). Reason: "${reason}". Sent to Admin Verification Queue.`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Hardware return dispatched to Admin! Awaiting Central Warehouse inspection.`, 'teal');
  };

  // 4f. Admin Inspect & Accept Hardware Return into Warehouse
  const handleAdminAcceptReturn = (itemId: string, destinationBin: string = 'Bin A-01') => {
    const now = new Date();
    const formattedTimestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const targetItem = inventory.find((i) => i.id === itemId);
    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          lifecycleStatus: 'IN_STOCK' as const,
          verificationStatus: 'UNLINKED_READY' as const,
          status: 'IN_STOCK' as const,
          isReturnPending: false,
          adminVerificationStatus: 'APPROVED' as const,
          returnVerifiedAt: formattedTimestamp,
          returnVerifiedBy: currentUser.name,
          assignedTechnicianId: undefined,
          assignedTechnicianName: undefined,
          assignedAt: undefined,
          technicianAcknowledgedAt: undefined,
          customerAccountNumber: undefined,
          customerName: undefined,
          customerAddress: undefined,
          storageBin: destinationBin,
          notes: item.notes ? `${item.notes} | Returned to warehouse by ${currentUser.name}` : `Returned to warehouse by ${currentUser.name}`,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent(
      'ADMIN_ACCEPT_RETURN',
      `Admin ${currentUser.name} inspected and accepted hardware return for ${targetItem?.name} (${targetItem?.serialNumber || targetItem?.sku}). Restocked into ${destinationBin}.`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Return Accepted: Restocked ${targetItem?.serialNumber || targetItem?.name} into ${destinationBin}!`, 'emerald');
  };

  // 5. Archive (Soft Delete)
  const handleArchiveItem = (itemId: string, reason?: string) => {
    const targetItem = inventory.find((i) => i.id === itemId);
    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          lifecycleStatus: 'OUT_OF_STOCK_REMOVED' as const,
          archived: true,
          archivedAt: new Date().toISOString(),
          notes: reason || item.notes || 'Archived from active inventory',
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent(
      'ARCHIVE',
      `Archived record ${targetItem?.serialNumber || targetItem?.sku} (${reason || 'Soft Delete - Preserved in Archive Vault'})`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Archived item ${targetItem?.serialNumber || targetItem?.sku}`, 'teal');
  };

  // 6. Restore from Archive
  const handleRestoreItem = (itemId: string) => {
    const targetItem = inventory.find((i) => i.id === itemId);
    const updated = inventory.map((item) => {
      if (item.id === itemId) {
        return {
          ...item,
          archived: false,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent(
      'RESTORE',
      `Restored record ${targetItem?.serialNumber || targetItem?.sku} from archive to active inventory`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Restored item ${targetItem?.serialNumber || targetItem?.sku}`, 'emerald');
  };

  // 7. Hard Delete (Admin Only)
  const handleHardDeleteItem = (itemId: string) => {
    if (currentUser.role !== 'ADMIN') {
      showToast('Permission Denied: Hard Delete is an exclusive Admin privilege.', 'red');
      return;
    }

    const targetItem = inventory.find((i) => i.id === itemId);
    const updated = inventory.filter((item) => item.id !== itemId);
    updateInventoryAndSync(updated);

    logAuditEvent(
      'HARD_DELETE',
      `Permanently PURGED record ${targetItem?.serialNumber || targetItem?.sku} from database`,
      currentUser,
      targetItem
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Permanently deleted record ${targetItem?.serialNumber || targetItem?.sku}`, 'red');
  };

  // Batch Archive
  const handleBatchArchive = (itemIds: string[]) => {
    const updated = inventory.map((item) => {
      if (itemIds.includes(item.id)) {
        return {
          ...item,
          archived: true,
          archivedAt: new Date().toISOString(),
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent('ARCHIVE', `Batch archived ${itemIds.length} inventory records`, currentUser);
    setAuditLogs(getStoredAuditLogs());

    showToast(`Batch archived ${itemIds.length} items`, 'teal');
  };

  // Batch Restore from Archive
  const handleBatchRestore = (itemIds: string[]) => {
    const updated = inventory.map((item) => {
      if (itemIds.includes(item.id)) {
        return {
          ...item,
          archived: false,
          archivedAt: undefined,
        };
      }
      return item;
    });

    updateInventoryAndSync(updated);

    logAuditEvent('RESTORE', `Batch restored ${itemIds.length} inventory records to active inventory`, currentUser);
    setAuditLogs(getStoredAuditLogs());

    showToast(`Restored ${itemIds.length} items to active inventory`, 'emerald');
  };

  // Batch Hard Delete (Admin)
  const handleBatchHardDelete = (itemIds: string[]) => {
    if (currentUser.role !== 'ADMIN') {
      showToast('Permission Denied: Hard Delete is an exclusive Admin privilege.', 'red');
      return;
    }

    const idSet = new Set(itemIds);
    const updated = inventory.filter((item) => !idSet.has(item.id));
    updateInventoryAndSync(updated);

    logAuditEvent(
      'HARD_DELETE',
      `Admin permanently PURGED ${itemIds.length} records from central database`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Permanently deleted ${itemIds.length} records from database`, 'red');
  };

  // User Management Actions (Method 1)
  const handleAddUser = (
    userData: Omit<UserProfile, 'id'>,
    technicianDetails?: { assignedVan: string; area: string; phone: string }
  ) => {
    const newId = `usr_${Date.now()}`;
    let newTechId: string | undefined = undefined;

    // If role is TECHNICIAN, register technician entity in roster
    if (userData.role === 'TECHNICIAN' && technicianDetails) {
      newTechId = `tech_${Date.now()}`;
      const newTech: Technician = {
        id: newTechId,
        name: userData.name,
        employeeId: userData.badgeId,
        phone: technicianDetails.phone,
        assignedVan: technicianDetails.assignedVan,
        area: technicianDetails.area,
        activeJobCount: 0,
        completedCount: 0,
      };
      const updatedTechs = [...technicians, newTech];
      setTechnicians(updatedTechs);
      saveStoredTechnicians(updatedTechs);
    }

    const newProfile: UserProfile = {
      ...userData,
      id: newId,
      technicianId: newTechId,
    };

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    saveStoredProfiles(updatedProfiles);

    // Sync user account directly to Supabase Authentication (auth.users) and public.profiles
    registerUserInSupabaseAuthAndDb(newProfile, newProfile.password);

    logAuditEvent(
      'USER_CREATE',
      `Provisioned user account for ${newProfile.name} (${newProfile.role}, ${newProfile.badgeId})`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Successfully created ${newProfile.name} (${newProfile.role})`, 'emerald');
  };

  const handleEditUser = (
    userId: string,
    updatedData: Partial<UserProfile>,
    techDetails?: { assignedVan: string; area: string; phone: string }
  ) => {
    const targetUser = profiles.find((p) => p.id === userId);
    if (!targetUser) return;

    // Last admin guard
    if (targetUser.role === 'ADMIN' && updatedData.role && updatedData.role !== 'ADMIN') {
      const adminCount = profiles.filter((p) => p.role === 'ADMIN').length;
      if (adminCount <= 1) {
        showToast('Cannot change role: user is the only remaining Administrator.', 'red');
        return;
      }
    }

    const updatedProfiles = profiles.map((p) => {
      if (p.id === userId) {
        return {
          ...p,
          ...updatedData,
        };
      }
      return p;
    });

    setProfiles(updatedProfiles);
    saveStoredProfiles(updatedProfiles);

    const editedUser = updatedProfiles.find((p) => p.id === userId);
    if (editedUser) {
      syncUserProfileToSupabase(editedUser);
    }

    // If updating a technician, sync with technicians state as well
    if (targetUser.role === 'TECHNICIAN' || updatedData.role === 'TECHNICIAN') {
      const existingTechIndex = technicians.findIndex(
        (t) => t.id === targetUser.technicianId || t.employeeId === targetUser.badgeId
      );
      if (existingTechIndex >= 0) {
        const updatedTechs = [...technicians];
        updatedTechs[existingTechIndex] = {
          ...updatedTechs[existingTechIndex],
          name: updatedData.name || updatedTechs[existingTechIndex].name,
          employeeId: updatedData.badgeId || updatedTechs[existingTechIndex].employeeId,
          phone: updatedData.phone || updatedTechs[existingTechIndex].phone,
          assignedVan:
            techDetails?.assignedVan ||
            updatedData.assignedVan ||
            updatedTechs[existingTechIndex].assignedVan,
          area:
            techDetails?.area ||
            updatedData.assignedArea ||
            updatedTechs[existingTechIndex].area,
        };
        setTechnicians(updatedTechs);
        saveStoredTechnicians(updatedTechs);
      }
    }

    // If current user edited their own profile
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({
        ...prev,
        ...updatedData,
      }));
    }

    logAuditEvent(
      'USER_UPDATE',
      `Updated user profile for ${updatedData.name || targetUser.name} (${updatedData.role || targetUser.role})`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Successfully updated ${updatedData.name || targetUser.name}`, 'emerald');
  };

  const handleUpdateUserRole = (userId: string, newRole: UserRole) => {
    const targetUser = profiles.find((p) => p.id === userId);
    if (!targetUser) return;

    const oldRole = targetUser.role;
    if (oldRole === newRole) return;

    // Last admin guard
    if (oldRole === 'ADMIN') {
      const adminCount = profiles.filter((p) => p.role === 'ADMIN').length;
      if (adminCount <= 1) {
        showToast('Cannot demote the only remaining Administrator.', 'red');
        return;
      }
    }

    const updatedProfiles = profiles.map((p) => {
      if (p.id === userId) {
        return {
          ...p,
          role: newRole,
        };
      }
      return p;
    });

    setProfiles(updatedProfiles);
    saveStoredProfiles(updatedProfiles);

    const updatedUser = updatedProfiles.find((p) => p.id === userId);
    if (updatedUser) {
      syncUserProfileToSupabase(updatedUser);
    }

    // If current logged-in user changed their own role, update currentUser
    if (currentUser.id === userId) {
      const updatedCurrent = { ...currentUser, role: newRole };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('fiberx_current_user_id_v1', userId);
    }

    const isPromotion = oldRole === 'TECHNICIAN' && newRole === 'ADMIN';

    logAuditEvent(
      'USER_ROLE_CHANGE',
      `${isPromotion ? 'Promoted' : 'Demoted'} ${targetUser.name} from ${oldRole} to ${newRole}`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(
      `${isPromotion ? 'Promoted' : 'Demoted'} ${targetUser.name} to ${newRole}`,
      isPromotion ? 'teal' : 'emerald'
    );
  };

  const handleToggleUserStatus = (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED') => {
    const targetUser = profiles.find((p) => p.id === userId);
    if (!targetUser) return;

    if (userId === currentUser.id) {
      showToast('Cannot suspend your own active session.', 'red');
      return;
    }

    const updatedProfiles = profiles.map((p) =>
      p.id === userId ? { ...p, status: newStatus } : p
    );
    setProfiles(updatedProfiles);
    saveStoredProfiles(updatedProfiles);

    const updatedStatusUser = updatedProfiles.find((p) => p.id === userId);
    if (updatedStatusUser) {
      syncUserProfileToSupabase(updatedStatusUser);
    }

    logAuditEvent(
      'USER_STATUS_CHANGE',
      `Changed account status for ${targetUser.name} to ${newStatus}`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(
      `Account for ${targetUser.name} is now ${newStatus === 'ACTIVE' ? 'Active' : 'Suspended'}`,
      newStatus === 'ACTIVE' ? 'emerald' : 'red'
    );
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = profiles.find((p) => p.id === userId);
    if (!targetUser) return;

    if (userId === currentUser.id) {
      showToast('Cannot delete your own active session.', 'red');
      return;
    }

    if (targetUser.role === 'ADMIN') {
      const adminCount = profiles.filter((p) => p.role === 'ADMIN').length;
      if (adminCount <= 1) {
        showToast('Cannot delete the only remaining Administrator.', 'red');
        return;
      }
    }

    const updatedProfiles = profiles.filter((p) => p.id !== userId);
    setProfiles(updatedProfiles);
    saveStoredProfiles(updatedProfiles);

    // Delete user from Supabase profiles
    deleteUserFromSupabase(targetUser.email || userId);

    logAuditEvent(
      'USER_DELETE',
      `Deleted user account ${targetUser.name} (${targetUser.badgeId})`,
      currentUser
    );
    setAuditLogs(getStoredAuditLogs());

    showToast(`Removed ${targetUser.name} from system`, 'teal');
  };

  // Reset / Clear Database
  const handleResetDatabase = () => {
    const cleared = clearDatabase();
    setInventory(cleared.inventory);
    setTechnicians(cleared.technicians);
    setProfiles(cleared.profiles);
    setCurrentUser(getCurrentUserProfile());
    setAuditLogs(cleared.logs);
    showToast('Warehouse database cleared', 'teal');
  };

  // If not authenticated, display the split-screen login page
  if (!isAuthenticated) {
    return (
      <>
        <LoginPage
          onLoginSuccess={handleLoginSuccess}
          availableProfiles={profiles.length > 0 ? profiles : getStoredProfiles()}
          onRegisterUser={handleRegisterUser}
        />
      </>
    );
  }

  // If authenticated as Technician, render dedicated Technician Portal
  if (currentUser.role === 'TECHNICIAN') {
    return (
      <ErrorBoundary
        fallbackTitle="Technician Portal Error"
        onReset={() => {
          const adminProf = profiles.find((p) => p.role === 'ADMIN') || profiles[0];
          if (adminProf) {
            handleSwitchProfile(adminProf.id);
          }
        }}
      >
        <TechnicianPortal
          currentUser={currentUser}
          inventory={inventory}
          technicians={technicians}
          auditLogs={auditLogs}
          onLogout={handleLogout}
          onSubmitVerification={handleSubmitVerification}
          showToast={showToast}
          availableProfiles={profiles}
          onSwitchProfile={handleSwitchProfile}
          onAcknowledgeReceipt={handleTechnicianAcknowledgeReceipt}
          onReturnToAdmin={handleTechnicianReturnToAdmin}
          onArchive={handleArchiveItem}
          onRestore={handleRestoreItem}
          onBatchRestore={handleBatchRestore}
          onUpdateUserProfile={handleEditUser}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        />
        <SupabaseManagerModal
          isOpen={isSupabaseModalOpen}
          onClose={() => setIsSupabaseModalOpen(false)}
          currentUserRole={currentUser.role}
          currentUserId={currentUser.id}
        />
      </ErrorBoundary>
    );
  }

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Top Header */}
      <Header
        currentUser={currentUser}
        availableProfiles={profiles}
        onSwitchProfile={handleSwitchProfile}
        onNavigateTab={(tab) => {
          setSelectedDetailItem(null);
          setIsDetailModalOpen(false);
          setCurrentTab(tab);
        }}
        onLogout={handleLogout}
        onOpenReceive={() => {
          setInitialReceiveSerial('');
          setIsReceiveModalOpen(true);
        }}
        onOpenScannerHub={() => {
          setInitialScanQuery('');
          setIsScannerHubOpen(true);
        }}
        isScannerListening={isScannerListening}
        scanPulse={scanPulse}
        inventory={inventory}
        technicians={technicians}
        auditLogs={auditLogs}
        onSelectItemDetail={(item) => {
          setSelectedDetailItem(item);
          setIsDetailModalOpen(false);
        }}
        onResetDatabase={handleResetDatabase}
        onApplyCategoryFilter={(category, status) => {
          setCurrentTab('inventory');
          setFilterState((prev) => ({
            ...prev,
            category,
            status: (status as any) || 'ALL',
            viewMode: 'active',
          }));
        }}
        bookmarkedIds={bookmarkedIds}
        onToggleBookmark={handleToggleBookmark}
        onUpdateUserProfile={handleEditUser}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
      />

      {/* Main Layout Container */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">
        {/* Left Navigation Sidebar - Static independent entity */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setIsReceiveModalOpen(false);
            setIsAssignModalOpen(false);
            setSelectedDetailItem(null);
            setIsDetailModalOpen(false);
            setCurrentTab(tab);
          }}
          currentUser={currentUser}
          inventory={inventory}
          filterState={filterState}
          onUpdateFilter={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
          userCount={profiles.length}
          onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        />

        {/* Central Workspace Router - Right main independent entity */}
        <main className="flex-1 min-w-0 h-full overflow-hidden flex flex-col relative bg-[#F8FAFC]">
          {isReceiveModalOpen ? (
            <ReceiveStockModal
              isOpen={isReceiveModalOpen}
              isFullPage={true}
              onClose={() => {
                setIsReceiveModalOpen(false);
                setInitialReceiveSerial('');
                setReceiveModalExternalScan(null);
              }}
              onReceive={handleReceiveStock}
              onBatchReceive={handleBatchReceiveStock}
              currentUser={currentUser}
              initialSerial={initialReceiveSerial}
              existingInventory={inventory}
              externalScan={receiveModalExternalScan}
            />
          ) : isAssignModalOpen ? (
            <AssignTechnicianModal
              isOpen={isAssignModalOpen}
              isFullPage={true}
              onClose={() => {
                setIsAssignModalOpen(false);
                setItemsToAssign([]);
                setAssignModalTechId('');
                setAssignModalExternalScan(null);
              }}
              initialItems={itemsToAssign}
              allInventory={inventory}
              technicians={technicians}
              initialTechnicianId={assignModalTechId}
              onAssign={handleAssignToTechnician}
              currentUser={currentUser}
              externalScan={assignModalExternalScan}
              onToggleFlagTechnician={handleToggleFlagTechnician}
              onUpdateUtilization={handleUpdateUtilization}
              onAddTechnician={handleAddTechnician}
            />
          ) : selectedDetailItem ? (
            <div className="flex-1 min-w-0 h-full overflow-y-auto bg-[#F8FAFC]">
              <ItemDetailView
                item={inventory.find((it) => it.id === selectedDetailItem.id) || selectedDetailItem}
                currentUser={currentUser}
                technicians={technicians}
                auditLogs={auditLogs}
                backTitle={
                  currentTab === 'dashboard'
                    ? 'Dashboard'
                    : currentTab === 'technicians'
                    ? 'Technicians'
                    : currentTab === 'closures'
                    ? 'Account Closures'
                    : currentTab === 'users'
                    ? 'User Management'
                    : currentTab === 'archive'
                    ? 'Archive Vault'
                    : 'Inventory'
                }
                onBack={() => {
                  setSelectedDetailItem(null);
                  setIsDetailModalOpen(false);
                }}
                onOpenAssign={(item) => {
                  setItemsToAssign([item]);
                  setIsAssignModalOpen(true);
                }}
                onOpenClosure={(item) => {
                  setItemToClose(item);
                  setIsClosureModalOpen(true);
                }}
                onOpenVerification={(item) => {
                  setItemToVerify(item);
                  setIsAdminVerificationModalOpen(true);
                }}
                onArchive={handleArchiveItem}
                onRestore={handleRestoreItem}
                onHardDelete={handleHardDeleteItem}
                onUpdateStatus={(itemId, status, notes) => {
                  const updated = inventory.map((i) => (i.id === itemId ? { ...i, status } : i));
                  updateInventoryAndSync(updated);
                  showToast(`Status updated to [${status}]`, 'teal');
                }}
                onUpdateItem={(itemId, updates) => {
                  const updated = inventory.map((i) => (i.id === itemId ? { ...i, ...updates } : i));
                  updateInventoryAndSync(updated);
                  showToast('Item attributes updated successfully', 'teal');
                }}
                showToast={showToast}
              />
            </div>
          ) : (
            <>
              {currentTab === 'dashboard' && (
                <DashboardView
                  inventory={inventory}
                  technicians={technicians}
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                  onNavigateTab={setCurrentTab}
                  onOpenReceive={() => setIsReceiveModalOpen(true)}
                  onOpenScannerHub={() => setIsScannerHubOpen(true)}
                />
              )}

              {currentTab === 'inventory' && (
                <DataGrid
                  items={inventory}
                  technicians={technicians}
                  currentUser={currentUser}
                  filterState={filterState}
                  onUpdateFilter={(updates) => setFilterState((prev) => ({ ...prev, ...updates }))}
                  onSelectItemDetail={(item) => {
                    setSelectedDetailItem(item);
                    setIsDetailModalOpen(true);
                  }}
                  onOpenAssign={(items) => {
                    setItemsToAssign(items);
                    setIsAssignModalOpen(true);
                  }}
                  onOpenClosure={(item) => {
                    setItemToClose(item);
                    setIsClosureModalOpen(true);
                  }}
                  onOpenVerification={(item) => {
                    setItemToVerify(item);
                    setIsAdminVerificationModalOpen(true);
                  }}
                  onArchive={handleArchiveItem}
                  onRestore={handleRestoreItem}
                  onHardDelete={handleHardDeleteItem}
                  onBatchArchive={handleBatchArchive}
                  onBatchRestore={handleBatchRestore}
                  onBatchHardDelete={handleBatchHardDelete}
                  onSwitchToAdmin={() => {
                    const admin = profiles.find((p) => p.role === 'ADMIN') || profiles[0];
                    setCurrentUser(admin);
                  }}
                  onOpenReceive={() => {
                    setInitialReceiveSerial('');
                    setIsReceiveModalOpen(true);
                  }}
                  onOpenScannerHub={() => {
                    setInitialScanQuery('');
                    setIsScannerHubOpen(true);
                  }}
                />
              )}

              {currentTab === 'technicians' && (
                <TechnicianHubView
                  technicians={technicians}
                  inventory={inventory}
                  currentUser={currentUser}
                  onOpenAssignToTech={(tech) => {
                    setAssignModalTechId(tech.id);
                    setItemsToAssign([]);
                    setIsAssignModalOpen(true);
                  }}
                  onOpenClosure={(item) => {
                    setItemToClose(item);
                    setIsClosureModalOpen(true);
                  }}
                  onSelectItemDetail={(item) => {
                    setSelectedDetailItem(item);
                    setIsDetailModalOpen(true);
                  }}
                  onToggleFlagTechnician={handleToggleFlagTechnician}
                  onUpdateUtilization={handleUpdateUtilization}
                  onAddTechnician={handleAddTechnician}
                />
              )}

              {currentTab === 'closures' && (
                <AccountClosuresView
                  inventory={inventory}
                  auditLogs={auditLogs}
                  currentUser={currentUser}
                  onSelectItemDetail={(item) => {
                    setSelectedDetailItem(item);
                    setIsDetailModalOpen(true);
                  }}
                  onOpenVerificationModal={(item) => {
                    setItemToVerify(item);
                    setIsAdminVerificationModalOpen(true);
                  }}
                  onAcceptReturn={handleAdminAcceptReturn}
                />
              )}

              {currentTab === 'users' && (
                <UserManagementView
                  profiles={profiles}
                  currentUser={currentUser}
                  onAddUser={handleAddUser}
                  onEditUser={handleEditUser}
                  onUpdateRole={handleUpdateUserRole}
                  onToggleStatus={handleToggleUserStatus}
                  onDeleteUser={handleDeleteUser}
                  onSwitchUser={handleSwitchProfile}
                />
              )}

              {currentTab === 'archive' && (
                <ArchiveView
                  inventory={inventory}
                  technicians={technicians}
                  currentUser={currentUser}
                  auditLogs={auditLogs}
                  onRestore={handleRestoreItem}
                  onArchive={handleArchiveItem}
                  onHardDelete={handleHardDeleteItem}
                  onBatchRestore={handleBatchRestore}
                  onBatchHardDelete={handleBatchHardDelete}
                  onSelectItemDetail={(item) => {
                    setSelectedDetailItem(item);
                    setIsDetailModalOpen(true);
                  }}
                  showToast={showToast}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals & Dialogs */}
      <AccountClosureModal
        isOpen={isClosureModalOpen}
        onClose={() => setIsClosureModalOpen(false)}
        item={itemToClose}
        existingInventory={inventory}
        onSubmitVerification={handleSubmitVerification}
        currentUser={currentUser}
      />

      <AdminVerificationModal
        isOpen={isAdminVerificationModalOpen}
        onClose={() => setIsAdminVerificationModalOpen(false)}
        item={itemToVerify}
        currentUser={currentUser}
        onApprove={handleApproveVerification}
        onReject={handleRejectVerification}
        onHardDelete={handleHardDeleteItem}
        onAcceptReturn={handleAdminAcceptReturn}
      />

      <BarcodeScannerModal
        isOpen={isScannerHubOpen}
        onClose={() => {
          setIsScannerHubOpen(false);
          setInitialScanQuery('');
          setScannerHubExternalScan(null);
        }}
        inventory={inventory}
        currentUser={currentUser}
        initialQuery={initialScanQuery}
        externalScan={scannerHubExternalScan}
        onSelectScannedItem={(item) => {
          setSelectedDetailItem(item);
          setIsDetailModalOpen(true);
        }}
        onReceiveNewSerial={(serial) => {
          setInitialReceiveSerial(serial);
          setIsReceiveModalOpen(true);
        }}
        onReceiveItem={(newItem) => {
          handleReceiveStock(newItem);
        }}
        onUpdateItem={(id, updates) => {
          handleUpdateItem(id, updates);
        }}
        onBatchReceiveItems={(newItems) => {
          handleBatchReceiveStock(newItems);
        }}
        onNavigateToInventory={() => {
          setCurrentTab('inventory');
        }}
      />

      <SupabaseManagerModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        currentUserRole={currentUser.role}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
