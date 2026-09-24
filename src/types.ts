export type ItemCategory =
  | 'MODEM_ONT'
  | 'FIBER_CABLE'
  | 'SPLITTER'
  | 'PATCH_CORD'
  | 'ACCESSORY';

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  MODEM_ONT: 'Modems & ONTs',
  FIBER_CABLE: 'Fiber Drop Cables',
  SPLITTER: 'Optical Splitters',
  PATCH_CORD: 'Patch Cords & Mechanical Connectors',
  ACCESSORY: 'Accessories, Brackets & Clamps',
};

export const HARDWARE_CATEGORY_CATALOG = [
  {
    id: 'MODEM_ONT' as ItemCategory,
    order: 1,
    label: 'Modems & ONTs',
    subItems: ['Modems & ONTs'],
  },
  {
    id: 'FIBER_CABLE' as ItemCategory,
    order: 2,
    label: 'Fiber Drop Cables',
    subItems: ['Fiber Drop Cables', 'Drop FOC, 1 Core'],
  },
  {
    id: 'SPLITTER' as ItemCategory,
    order: 3,
    label: 'Optical Splitters',
    subItems: ['Optical Splitters'],
  },
  {
    id: 'PATCH_CORD' as ItemCategory,
    order: 4,
    label: 'Patch Cords & Mechanical Connectors',
    subItems: ['Patch Cords & Fast-Con', 'Connector, Mechanical'],
  },
  {
    id: 'ACCESSORY' as ItemCategory,
    order: 5,
    label: 'Accessories & Clamps',
    subItems: [
      'Terminal Box',
      'House Bracket',
      'Clamp, Mid-Span',
      'Tie, Cable',
      'Clamp Anchor',
      'Tape, Double Side',
    ],
  },
];

export const ITEM_CATEGORIES: {
  id: ItemCategory;
  label: string;
  defaultBin: string;
  defaultUnit: 'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes';
}[] = [
  { id: 'MODEM_ONT', label: 'Modems & ONTs', defaultBin: 'Rack A-01', defaultUnit: 'pcs' },
  { id: 'FIBER_CABLE', label: 'Fiber Drop Cables', defaultBin: 'Spool Bay 1', defaultUnit: 'spools' },
  { id: 'SPLITTER', label: 'Optical Splitters', defaultBin: 'Bin C-04', defaultUnit: 'pcs' },
  { id: 'PATCH_CORD', label: 'Patch Cords & Mechanical Connectors', defaultBin: 'Bin D-08', defaultUnit: 'boxes' },
  { id: 'ACCESSORY', label: 'Accessories, Brackets & Clamps', defaultBin: 'Bin E-02', defaultUnit: 'boxes' },
];

// Category 1: Inventory / Lifecycle Status (Physical State)
export type LifecycleStatus =
  | 'IN_STOCK'
  | 'ASSIGNED_RESERVED'
  | 'INSTALLED_DEPLOYED'
  | 'OUT_OF_STOCK_REMOVED';

// Category 2: Link / Verification Status (Account & System Binding)
export type VerificationStatus =
  | 'UNLINKED_READY'
  | 'AWAITING_VERIFICATION'
  | 'VERIFIED_CONNECTED'
  | 'FLAGGED_ACTION_REQUIRED';

export const LIFECYCLE_STATUS_OPTIONS: { id: LifecycleStatus; label: string; description: string }[] = [
  { id: 'IN_STOCK', label: 'In Stock', description: 'Available in warehouse / shelf storage' },
  { id: 'ASSIGNED_RESERVED', label: 'Assigned / Reserved', description: 'Dispatched to technician or reserved for work order' },
  { id: 'INSTALLED_DEPLOYED', label: 'Installed / Deployed', description: 'Physically placed at customer premises or active plant' },
  { id: 'OUT_OF_STOCK_REMOVED', label: 'Out of Stock / Removed', description: 'Quarantined RMA, defective, or decommissioned' },
];

export const VERIFICATION_STATUS_OPTIONS: { id: VerificationStatus; label: string; description: string }[] = [
  { id: 'UNLINKED_READY', label: 'Unlinked / Ready', description: 'No subscriber account bound, ready for assignment' },
  { id: 'AWAITING_VERIFICATION', label: 'Awaiting Verification', description: 'Field technician submitted tag, awaiting Admin review' },
  { id: 'VERIFIED_CONNECTED', label: 'Verified / Connected', description: 'Admin verified and bound to subscriber' },
  { id: 'FLAGGED_ACTION_REQUIRED', label: 'Flagged / Action Required', description: 'Suspected duplicate, rejected, or optical fault' },
];

export const LIFECYCLE_STATUS_LABELS: Record<LifecycleStatus, string> = {
  IN_STOCK: 'In Stock',
  ASSIGNED_RESERVED: 'Assigned / Reserved',
  INSTALLED_DEPLOYED: 'Installed / Deployed',
  OUT_OF_STOCK_REMOVED: 'Out of Stock / Removed',
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  UNLINKED_READY: 'Unlinked / Ready',
  AWAITING_VERIFICATION: 'Awaiting Verification',
  VERIFIED_CONNECTED: 'Verified / Connected',
  FLAGGED_ACTION_REQUIRED: 'Flagged / Action Required',
};

export type ItemStatus =
  | 'IN_STOCK'
  | 'ASSIGNED'
  | 'AWAITING_ADMIN_VERIFICATION'
  | 'INSTALLED_VERIFIED'
  | 'INSTALLED_CLOSED' // alias for legacy/verified
  | 'REJECTED_INVALID_TAG'
  | 'SUSPECTED_DUPLICATE'
  | 'DEFECTIVE'
  | 'ARCHIVED';

export type UserRole = 'ADMIN' | 'TECHNICIAN' | 'OPERATOR';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  technicianId?: string; // Links to technician entity if role is TECHNICIAN
  badgeId: string;
  department: string;
  phone?: string;
  status?: 'ACTIVE' | 'SUSPENDED';
  createdAt?: string;
  assignedVan?: string;
  assignedArea?: string;
  avatarUrl?: string;
  username?: string;
  password?: string;
}

export interface Technician {
  id: string;
  name: string;
  employeeId: string;
  phone: string;
  assignedVan: string;
  area: string;
  activeJobCount: number;
  completedCount: number;
  isFlagged?: boolean;
  flagReason?: string;
  flaggedAt?: string;
  flaggedBy?: string;
  contactPerson?: string;
  hubAddress?: string;
  avatarUrl?: string;
}

export interface ProofPhoto {
  id: string;
  name?: string;
  url: string;
  size?: string;
  timestamp?: string;
  type: 'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS';
}

export interface InventoryItem {
  id: string;
  serialNumber: string; // Unique barcode or serial
  sku: string;
  name: string;
  description: string;
  category: ItemCategory;

  // Dual Status: 1. Inventory/Lifecycle (Physical) & 2. Link/Verification (Account)
  lifecycleStatus: LifecycleStatus; // Category 1: Inventory / Lifecycle Status (Physical State)
  verificationStatus: VerificationStatus; // Category 2: Link / Verification Status (Account & System Binding)
  status?: ItemStatus; // Backwards-compatible legacy status

  bypassBarcode: boolean;
  quantity: number;
  unit: 'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes';
  lengthMeters?: number; // Cable / Patch Cord length in meters
  storageBin: string; // e.g. "Rack A-04", "Bin C-12", "Spool Bay 1"
  
  // Technician & Customer Assignment Data
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  assignedAt?: string;
  assignedByUserId?: string;
  assignedByUserName?: string;
  assignedByUserRole?: string;
  dispatchHubAddress?: string;
  contactPersonName?: string;
  contactPersonPhone?: string;
  technicianAcknowledgedAt?: string; // Timestamp when technician confirms receipt of equipment in Van Kit

  // Hardware Return to Admin / Warehouse Queue
  isReturnPending?: boolean; // When technician dispatches item back to warehouse/admin
  returnReason?: string; // Reason for technician return (e.g. Defective RMA, Surplus, Job Cancelled)
  returnSubmittedAt?: string;
  returnVerifiedAt?: string;
  returnVerifiedBy?: string;

  // Slot Tracking & Pairing (Excel & System Integration)
  slotNumber?: string; // e.g., "SLOT-01", "SLOT-02"
  pairingStatus?: 'PAIRED' | 'UNPAIRED';
  pairedItemId?: string;
  pairedItemSerial?: string;
  pairedItemName?: string;

  // Warehouse Utilization Tracking
  utilizedQuantity?: number; // How many units were used/installed
  isUtilized?: boolean; // Whether the item or portion was utilized
  utilizedAt?: string;
  utilizedNotes?: string;
  
  // Account Tag Submission Data (Technician inputs)
  customerAccountNumber?: string; // e.g., "FX-9082341"
  customerName?: string;
  customerAddress?: string;
  installationDate?: string;
  opticalRx?: string;
  photoProofUrl?: string; // Photo proof of installation or barcode tag (primary/preview)
  photoProofType?: 'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS';
  photoUrl?: string; // Supabase potobucket direct storage URL
  photoStoragePath?: string; // Supabase potobucket internal object path
  photoProofUrls?: string[]; // All photo URLs submitted by the technician
  proofPhotos?: ProofPhoto[]; // Full structured photo records received from technician
  submittedAt?: string;
  submittedByTechnicianId?: string;
  submittedByTechnicianName?: string;
  
  // Admin Verification & Fraud Prevention Queue Data
  adminVerificationStatus?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DUPLICATE_FLAGGED';
  verifiedAt?: string;
  verifiedByAdminId?: string;
  verifiedByAdminName?: string;
  adminRejectionReason?: string; // Admin note if rejected
  duplicateConflictSerial?: string; // Conflicting serial if duplicate account number
  adminDuplicateOverridden?: boolean; // True if admin explicitly approved duplicate override
  closedByTechnicianId?: string;
  
  // Hardware Specifications
  macAddress?: string;
  modelName: string;
  brand: string;
  
  // Receiving & Archiving
  receivedDate: string;
  receivedBy: string;
  archived: boolean;
  archivedAt?: string;
  notes?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action:
    | 'RECEIVE'
    | 'BULK_IMPORT'
    | 'ASSIGN'
    | 'TECH_CONFIRM_RECEIPT'
    | 'TECH_RETURN_DISPATCH'
    | 'ADMIN_ACCEPT_RETURN'
    | 'TECH_REQUEST_EQUIPMENT'
    | 'FLAG_TECHNICIAN'
    | 'UNFLAG_TECHNICIAN'
    | 'REGISTER_TECHNICIAN'
    | 'OVERRIDE_FLAGGED_ASSIGNMENT'
    | 'UPDATE_UTILIZATION'
    | 'SUBMIT_VERIFICATION'
    | 'ADMIN_APPROVE'
    | 'ADMIN_REJECT'
    | 'OVERRIDE_DUPLICATE'
    | 'ACCOUNT_CLOSE'
    | 'EDIT'
    | 'ARCHIVE'
    | 'RESTORE'
    | 'HARD_DELETE'
    | 'SCAN_LOOKUP'
    | 'STATUS_CHANGE'
    | 'USER_CREATE'
    | 'USER_UPDATE'
    | 'USER_ROLE_CHANGE'
    | 'USER_STATUS_CHANGE'
    | 'USER_DELETE';
  itemId?: string;
  itemSerial?: string;
  itemSku?: string;
  technicianId?: string;
  customerAccountNumber?: string;
  approvalStatus?: 'APPROVED' | 'REJECTED' | 'PENDING' | 'DUPLICATE_FLAGGED';
  performedBy: string;
  role: UserRole;
  details: string;
}

export interface FilterState {
  category: string;
  subCategory?: string; // Subcategory filter for the active hardware category
  lifecycleStatus: string; // 'ALL' | LifecycleStatus
  verificationStatus: string; // 'ALL' | VerificationStatus
  status: string; // 'ALL' | ItemStatus (legacy)
  technicianId: string;
  storageBin: string;
  search: string;
  onlyUnclosed: boolean;
  viewMode: 'active' | 'archived' | 'all';
}

export interface BulkImportRow {
  serialNumber: string;
  sku: string;
  name: string;
  category: ItemCategory;
  storageBin: string;
  macAddress?: string;
  bypassBarcode?: boolean;
  quantity?: number;
  unit?: 'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes';
  modelName?: string;
  brand?: string;
  isValid: boolean;
  validationError?: string;
}
