import React, { useState, useMemo, useRef } from 'react';
import {
  InventoryItem,
  Technician,
  UserProfile,
  AuditLog,
  ProofPhoto,
} from '../../types';
import { ItemDetailView } from '../views/ItemDetailView';
import { FiberXLogo } from '../common/FiberXLogo';
import { DualStatusBadge } from '../common/DualStatusBadge';
import { AccountDropdown, AccountMenuTab } from '../layout/AccountDropdown';
import { NotificationsDropdown, NotificationItem } from '../layout/NotificationsDropdown';
import { UserProfileModal } from '../modals/UserProfileModal';
import { PrivacyModal } from '../modals/PrivacyModal';
import { SettingsModal } from '../modals/SettingsModal';
import {
  Wrench,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Camera,
  Upload,
  Search,
  Send,
  LogOut,
  MapPin,
  User,
  Hash,
  Signal,
  Wifi,
  Eye,
  RefreshCw,
  FileText,
  X,
  ExternalLink,
  PlusCircle,
  Package,
  Layers,
  ChevronRight,
  ShieldCheck,
  Check,
  Smartphone,
  ZoomIn,
  ArrowRight,
  Bell,
  LayoutDashboard,
  Boxes,
  FileCheck2,
  Menu,
  SlidersHorizontal,
  ChevronDown,
  Cable,
  GitFork,
  Radio,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  PackageMinus,
  PackageCheck,
  Archive,
} from 'lucide-react';
import { uploadPhotoToPotobucket } from '../../services/supabaseStorage';
import { getUserInitials } from '../../utils/userInitials';
import { generateLiveNotifications } from '../../utils/notifications';
import { ArchiveView } from '../views/ArchiveView';

interface TechnicianPortalProps {
  currentUser: UserProfile;
  inventory: InventoryItem[];
  technicians: Technician[];
  onLogout: () => void;
  onSubmitVerification: (
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
  ) => void;
  auditLogs?: AuditLog[];
  onSelectItemDetail?: (item: InventoryItem) => void;
  showToast: (text: string, type?: 'teal' | 'emerald' | 'red') => void;
  availableProfiles?: UserProfile[];
  onSwitchProfile?: (profileId: string) => void;
  onAcknowledgeReceipt?: (itemIds: string[]) => void;
  onReturnToAdmin?: (itemId: string, reason: string, notes?: string) => void;
  onArchive?: (itemId: string, reason?: string) => void;
  onRestore?: (itemId: string) => void;
  onBatchRestore?: (itemIds: string[]) => void;
  onUpdateUserProfile?: (userId: string, updatedData: Partial<UserProfile>) => void;
  onOpenSupabaseModal?: () => void;
}

type TechPortalTab = 'dashboard' | 'van_kit' | 'install_link' | 'submissions' | 'archive';

export interface UploadedPhoto {
  id: string;
  name: string;
  url: string;
  size?: string;
  timestamp: string;
  type: 'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS';
}

const PHOTO_CATEGORY_LABELS: Record<
  'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS',
  { label: string; badge: string }
> = {
  INSTALLATION_PHOTO: { label: 'ONT Wall Mount / Installation', badge: 'bg-emerald-100 text-emerald-800' },
  BARCODE_TAG: { label: 'Barcode & MAC Sticker', badge: 'bg-blue-100 text-blue-800' },
  NAP_PORT: { label: 'NAP Box & Drop Port', badge: 'bg-amber-100 text-amber-800' },
  ONT_STATUS: { label: 'ONT LED / Speed Test', badge: 'bg-purple-100 text-purple-800' },
};

export const TechnicianPortal: React.FC<TechnicianPortalProps> = ({
  currentUser,
  inventory,
  technicians,
  auditLogs = [],
  onLogout,
  onSubmitVerification,
  onSelectItemDetail,
  showToast,
  availableProfiles,
  onSwitchProfile,
  onAcknowledgeReceipt,
  onReturnToAdmin,
  onArchive,
  onRestore,
  onBatchRestore,
  onUpdateUserProfile,
  onOpenSupabaseModal,
}) => {
  const [activeTab, setActiveTab] = useState<TechPortalTab>('dashboard');
  const [selectedDetailItem, setSelectedDetailItem] = useState<InventoryItem | null>(null);
  
  // Van Kit state
  const [kitSearchQuery, setKitSearchQuery] = useState('');
  const [kitCategoryFilter, setKitCategoryFilter] = useState<string>('ALL');

  // Deployment / Installation Form State
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [customerAccountNumber, setCustomerAccountNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [opticalRx, setOpticalRx] = useState('');
  const [napPort, setNapPort] = useState('');
  const [notes, setNotes] = useState('');
  const [uploadedPhotos, setUploadedPhotos] = useState<UploadedPhoto[]>([]);
  const [photoProofUrl, setPhotoProofUrl] = useState<string>('');
  const [photoProofType, setPhotoProofType] = useState<'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS'>('INSTALLATION_PHOTO');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [zoomPhotoUrl, setZoomPhotoUrl] = useState<string | null>(null);

  // Submissions filter & search state
  const [submissionFilter, setSubmissionFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [submissionSearchQuery, setSubmissionSearchQuery] = useState('');

  // Mobile sidebar and category collapse states
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isVanCategoriesOpen, setIsVanCategoriesOpen] = useState(true);

  // Header Dropdown & Modals State (Structured like Admin navigation bar)
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [activeMenuTab, setActiveMenuTab] = useState<AccountMenuTab>('profile');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // Return Hardware Modal state
  const [returnModalItem, setReturnModalItem] = useState<InventoryItem | null>(null);
  const [returnReason, setReturnReason] = useState<string>('Defective Optical Port / PON Loss');
  const [returnNotes, setReturnNotes] = useState<string>('');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Read notifications stored locally
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fiberx_read_notifs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Technician-relevant Notifications (Generated live from state)
  const notificationsState = useMemo(() => {
    return generateLiveNotifications(
      currentUser,
      inventory,
      technicians,
      auditLogs,
      readNotifIds
    );
  }, [currentUser, inventory, technicians, auditLogs, readNotifIds]);

  const unreadNotifCount = notificationsState.filter((n) => !n.read).length;

  const handleMarkAllNotificationsRead = () => {
    const allIds = notificationsState.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('fiberx_read_notifs', JSON.stringify(updated));
    } catch {
      // storage error fallback
    }
  };

  const handleSelectNotification = (notif: NotificationItem) => {
    const updated = Array.from(new Set([...readNotifIds, notif.id]));
    setReadNotifIds(updated);
    try {
      localStorage.setItem('fiberx_read_notifs', JSON.stringify(updated));
    } catch {
      // fallback
    }
    const notifTitle = (notif.title || '').toLowerCase();
    if (notif.id.includes('assign') || notifTitle.includes('dispatch') || notifTitle.includes('kit')) {
      setActiveTab('van_kit');
    } else {
      setActiveTab('submissions');
    }
  };

  const handleToggleBookmark = (id: string) => {
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAccountOption = (option: AccountMenuTab | 'logout') => {
    if (option === 'logout') {
      onLogout();
      return;
    }
    setActiveMenuTab(option);
    if (option === 'profile') {
      setIsProfileModalOpen(true);
    } else if (option === 'privacy') {
      setIsPrivacyModalOpen(true);
    } else if (option === 'settings') {
      setIsSettingsModalOpen(true);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Live Camera Modal State
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState<string | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);

  // Match technician record
  const currentTech = useMemo(() => {
    const curName = (currentUser?.name || '').toLowerCase().trim();
    return (
      technicians.find(
        (t) =>
          (currentUser?.technicianId && t.id === currentUser.technicianId) ||
          (currentUser?.badgeId && t.employeeId === currentUser.badgeId) ||
          (t.name && curName && t.name.toLowerCase().trim() === curName)
      ) || {
        id: currentUser?.technicianId || currentUser?.id || 'tech-current',
        name: currentUser?.name || 'Technician',
        employeeId: currentUser?.badgeId || 'FX-TECH',
        phone: currentUser?.phone || '—',
        assignedVan: currentUser?.assignedVan || 'Unassigned Vehicle',
        area: currentUser?.assignedArea || 'Standard Service Territory',
        activeJobCount: 0,
        completedCount: 0,
      }
    );
  }, [technicians, currentUser]);

  // Inventory items assigned to this specific technician
  const assignedItems = useMemo(() => {
    const curName = (currentUser?.name || '').toLowerCase().trim();
    return inventory.filter((item) => {
      const matchId =
        (currentTech.id && item.assignedTechnicianId === currentTech.id) ||
        (currentUser?.technicianId && item.assignedTechnicianId === currentUser.technicianId) ||
        (currentUser?.id && item.assignedTechnicianId === currentUser.id);
      const matchName = Boolean(
        item.assignedTechnicianName &&
        curName &&
        item.assignedTechnicianName.toLowerCase().trim() === curName
      );
      return (matchId || matchName) && !item.archived;
    });
  }, [inventory, currentTech, currentUser]);

  // Items in Van custody (all active equipment assigned to this technician)
  const vanStockReady = useMemo(() => {
    return assignedItems;
  }, [assignedItems]);

  // Items submitted by this technician (active jobs, verified, or pending)
  const submittedItems = useMemo(() => {
    return assignedItems.filter(
      (item) =>
        item.customerAccountNumber ||
        item.verificationStatus === 'AWAITING_VERIFICATION' ||
        item.verificationStatus === 'VERIFIED_CONNECTED' ||
        item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
        item.submittedByTechnicianId === currentTech.id ||
        item.submittedByTechnicianName === currentUser.name
    );
  }, [assignedItems, currentTech, currentUser]);

  // Metrics
  const pendingCount = useMemo(() => {
    return submittedItems.filter(
      (it) => it.verificationStatus === 'AWAITING_VERIFICATION' || it.adminVerificationStatus === 'PENDING'
    ).length;
  }, [submittedItems]);

  const verifiedCount = useMemo(() => {
    return submittedItems.filter(
      (it) => it.verificationStatus === 'VERIFIED_CONNECTED' || it.adminVerificationStatus === 'APPROVED'
    ).length;
  }, [submittedItems]);

  const flaggedCount = useMemo(() => {
    return submittedItems.filter(
      (it) =>
        it.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
        it.adminVerificationStatus === 'REJECTED' ||
        it.adminVerificationStatus === 'DUPLICATE_FLAGGED'
    ).length;
  }, [submittedItems]);

  // Items dispatched by Admin to this technician that have not yet been acknowledged
  const incomingDispatches = useMemo(() => {
    return assignedItems.filter(
      (item) =>
        item.lifecycleStatus === 'ASSIGNED_RESERVED' &&
        !item.technicianAcknowledgedAt &&
        !item.customerAccountNumber &&
        !item.isReturnPending
    );
  }, [assignedItems]);

  // Handlers for connected Admin-Technician workflow
  const handleAcknowledgeAll = () => {
    if (!onAcknowledgeReceipt || incomingDispatches.length === 0) return;
    onAcknowledgeReceipt(incomingDispatches.map((i) => i.id));
    showToast(`Acknowledged receipt of ${incomingDispatches.length} item(s) into your van custody`, 'emerald');
  };

  const handleAcknowledgeSingle = (itemId: string) => {
    if (!onAcknowledgeReceipt) return;
    onAcknowledgeReceipt([itemId]);
    showToast('Equipment receipt confirmed and logged into your van custody', 'emerald');
  };

  const handleConfirmReturn = () => {
    if (!returnModalItem || !onReturnToAdmin) return;
    onReturnToAdmin(returnModalItem.id, returnReason, returnNotes);
    setIsReturnModalOpen(false);
    setReturnModalItem(null);
    setReturnNotes('');
    showToast('Equipment dispatched back to Central Warehouse Admin for verification', 'teal');
  };

  // Category breakdown for technician sidebar
  const vanModemsCount = assignedItems.filter((i) => i.category === 'MODEM_ONT').length;
  const vanCablesCount = assignedItems.filter((i) => i.category === 'FIBER_CABLE').length;
  const vanSplittersCount = assignedItems.filter((i) => i.category === 'SPLITTER').length;
  const vanPatchCount = assignedItems.filter((i) => i.category === 'PATCH_CORD').length;
  const vanAccessoryCount = assignedItems.filter((i) => i.category === 'ACCESSORY').length;

  // Filtered Van Kit
  const filteredVanKit = useMemo(() => {
    return vanStockReady.filter((item) => {
      const matchCategory =
        kitCategoryFilter === 'ALL' || item.category === kitCategoryFilter;
      const q = kitSearchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.serialNumber || '').toLowerCase().includes(q) ||
        (item.macAddress && item.macAddress.toLowerCase().includes(q)) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.modelName && item.modelName.toLowerCase().includes(q));
      return matchCategory && matchSearch;
    });
  }, [vanStockReady, kitCategoryFilter, kitSearchQuery]);

  // Filtered Submissions
  const filteredSubmissions = useMemo(() => {
    return submittedItems.filter((item) => {
      if (submissionFilter === 'PENDING') {
        const isPending = item.verificationStatus === 'AWAITING_VERIFICATION' || item.adminVerificationStatus === 'PENDING';
        if (!isPending) return false;
      } else if (submissionFilter === 'APPROVED') {
        const isApproved = item.verificationStatus === 'VERIFIED_CONNECTED' || item.adminVerificationStatus === 'APPROVED';
        if (!isApproved) return false;
      } else if (submissionFilter === 'REJECTED') {
        const isRejected =
          item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
          item.adminVerificationStatus === 'REJECTED' ||
          item.adminVerificationStatus === 'DUPLICATE_FLAGGED';
        if (!isRejected) return false;
      }

      if (submissionSearchQuery.trim()) {
        const q = submissionSearchQuery.toLowerCase().trim();
        const matchAcc = (item.customerAccountNumber || '').toLowerCase().includes(q);
        const matchName = (item.customerName || '').toLowerCase().includes(q);
        const matchSerial = (item.serialNumber || '').toLowerCase().includes(q);
        const matchSku = (item.sku || '').toLowerCase().includes(q);
        const matchEquip = (item.name || '').toLowerCase().includes(q);
        if (!matchAcc && !matchName && !matchSerial && !matchSku && !matchEquip) {
          return false;
        }
      }

      return true;
    });
  }, [submittedItems, submissionFilter, submissionSearchQuery]);

  // Currently selected item for the deployment form
  const selectedItem = useMemo(() => {
    return inventory.find((it) => it.id === selectedItemId);
  }, [inventory, selectedItemId]);

  // Quick Action to start installation on a specific item
  const handleStartInstall = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    if (!customerAccountNumber) {
      // Auto-generate realistic subscriber account format e.g. ACC-58291
      const randNum = Math.floor(10000 + Math.random() * 90000);
      setCustomerAccountNumber(`ACC-${randNum}`);
    }
    if (!customerName) {
      setCustomerName('Subic Bay Logistics Corp.');
    }
    if (!customerAddress) {
      setCustomerAddress('Unit 12B, Pacific Gateway Tower, Quezon City');
    }
    setActiveTab('install_link');
  };

  // Handle Resubmit for a rejected/flagged item
  const handleResubmit = (item: InventoryItem) => {
    setSelectedItemId(item.id);
    setCustomerAccountNumber(item.customerAccountNumber || '');
    setCustomerName(item.customerName || '');
    setCustomerAddress(item.customerAddress || '');
    setOpticalRx(item.opticalRx || '');
    setNotes(
      `Resubmission for correction: ${
        item.adminRejectionReason ? `Previous admin feedback: ${item.adminRejectionReason}` : ''
      }`
    );

    if (item.proofPhotos && item.proofPhotos.length > 0) {
      setUploadedPhotos(
        item.proofPhotos.map((p) => ({
          id: p.id,
          name: p.name || 'Prior Photo Proof',
          url: p.url,
          size: p.size || '1.0 MB',
          timestamp: p.timestamp || 'Prior submission',
          type: p.type || 'INSTALLATION_PHOTO',
        }))
      );
      setPhotoProofUrl(item.proofPhotos[0].url);
      setPhotoProofType(item.proofPhotos[0].type || 'INSTALLATION_PHOTO');
    } else if (item.photoProofUrls && item.photoProofUrls.length > 0) {
      setUploadedPhotos(
        item.photoProofUrls.map((url, idx) => ({
          id: `prior-${idx}`,
          name: `Prior Photo Proof #${idx + 1}`,
          url,
          size: '1.0 MB',
          timestamp: 'Prior submission',
          type: item.photoProofType || 'INSTALLATION_PHOTO',
        }))
      );
      setPhotoProofUrl(item.photoProofUrls[0]);
    } else if (item.photoProofUrl) {
      setUploadedPhotos([
        {
          id: 'prior-0',
          name: 'Prior Photo Proof',
          url: item.photoProofUrl,
          size: '1.0 MB',
          timestamp: 'Prior submission',
          type: item.photoProofType || 'INSTALLATION_PHOTO',
        },
      ]);
      setPhotoProofUrl(item.photoProofUrl);
    } else {
      setUploadedPhotos([]);
      setPhotoProofUrl('');
    }

    setActiveTab('install_link');
    showToast('Loaded job details for resubmission. You can keep existing photos or add new ones.', 'teal');
  };

  // Handle Photo File Processing (supports file input & drag-and-drop)
  const processFiles = (fileArray: File[]) => {
    if (!fileArray || fileArray.length === 0) return;

    const newPhotos: UploadedPhoto[] = [];
    let processed = 0;

    fileArray.forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        if (uploadEvent.target?.result) {
          const sizeInKB = Math.round(file.size / 1024);
          const sizeStr = sizeInKB > 1024 ? `${(sizeInKB / 1024).toFixed(1)} MB` : `${sizeInKB} KB`;

          const inferredType: 'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS' =
            index === 0 && uploadedPhotos.length === 0
              ? 'INSTALLATION_PHOTO'
              : index === 1
              ? 'BARCODE_TAG'
              : index === 2
              ? 'NAP_PORT'
              : 'ONT_STATUS';

          const photoId = `proof-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 6)}`;
          newPhotos.push({
            id: photoId,
            name: file.name || `Field_Proof_${Date.now()}.jpg`,
            url: uploadEvent.target.result as string,
            size: sizeStr,
            timestamp: 'Just now',
            type: inferredType,
          });

          // Upload to Supabase potobucket storage in background
          uploadPhotoToPotobucket({
            file,
            fileName: file.name,
            technicianId: currentTech.id,
            accountNumber: customerAccountNumber || 'pending-field-submission',
            photoType: inferredType,
          }).then((res) => {
            if (res.success && res.publicUrl) {
              setUploadedPhotos((current) =>
                current.map((p) => (p.id === photoId ? { ...p, url: res.publicUrl } : p))
              );
            }
          });
        }
        processed++;
        if (processed === fileArray.length) {
          setUploadedPhotos((prev) => [...prev, ...newPhotos]);
          if (newPhotos.length > 0) {
            const latest = newPhotos[newPhotos.length - 1];
            setPhotoProofUrl(latest.url);
            setPhotoProofType(latest.type);
          }
          showToast(
            fileArray.length === 1
              ? 'Photo added to field proof list!'
              : `${fileArray.length} photos added to field proof list!`,
            'emerald'
          );
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    processFiles(Array.from(files));
    e.target.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  };

  // Handle Delete Photo from Uploaded List
  const handleDeletePhoto = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUploadedPhotos((prev) => {
      const photoToDelete = prev.find((p) => p.id === photoId);
      const remaining = prev.filter((p) => p.id !== photoId);
      if (photoToDelete && photoProofUrl === photoToDelete.url) {
        if (remaining.length > 0) {
          setPhotoProofUrl(remaining[0].url);
          setPhotoProofType(remaining[0].type);
        } else {
          setPhotoProofUrl('');
        }
      }
      return remaining;
    });
    showToast('Photo removed from upload list', 'teal');
  };

  // Live Camera Handlers
  const handleOpenLiveCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    setIsCameraModalOpen(true);
    setCapturedPhotoUrl(null);
    setCameraError(null);
    setIsCameraStarting(true);

    // Stop any existing active stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera hardware API is not supported in this browser environment.');
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      setCameraStream(stream);
      setCameraFacingMode(facing);
      setIsCameraStarting(false);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
        cameraVideoRef.current.play().catch(() => {});
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setIsCameraStarting(false);
      setCameraError(
        errorObj.message || 'Camera access was blocked or no camera was detected on this device.'
      );
    }
  };

  const handleCloseLiveCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setIsCameraModalOpen(false);
    setCapturedPhotoUrl(null);
    setCameraError(null);
    setIsCameraStarting(false);
  };

  const handleToggleFacingMode = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    handleOpenLiveCamera(nextFacing);
  };

  const handleCapturePhoto = () => {
    if (!cameraVideoRef.current) return;
    const video = cameraVideoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Mirror image if using front camera
    if (cameraFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedPhotoUrl(dataUrl);

    // Stop live stream while reviewing photo
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
  };

  const handleRetakePhoto = () => {
    setCapturedPhotoUrl(null);
    handleOpenLiveCamera(cameraFacingMode);
  };

  const handleAcceptCapturedPhoto = () => {
    if (!capturedPhotoUrl) return;

    const newPhotoId = `proof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const newPhotoName = `Field_Proof_${dateStr}_${timeStr}.jpg`;

    const newPhoto: UploadedPhoto = {
      id: newPhotoId,
      name: newPhotoName,
      url: capturedPhotoUrl,
      size: `${Math.round((capturedPhotoUrl.length * 3) / 4 / 1024)} KB`,
      timestamp: 'Just now',
      type: 'INSTALLATION_PHOTO',
    };

    setUploadedPhotos((prev) => [newPhoto, ...prev]);
    setPhotoProofUrl(capturedPhotoUrl);
    setPhotoProofType('INSTALLATION_PHOTO');

    // Upload camera capture to Supabase potobucket storage in background
    uploadPhotoToPotobucket({
      file: capturedPhotoUrl,
      fileName: newPhotoName,
      technicianId: currentTech.id,
      accountNumber: customerAccountNumber || 'pending-field-submission',
      photoType: 'INSTALLATION',
    }).then((res) => {
      if (res.success && res.publicUrl) {
        setUploadedPhotos((current) =>
          current.map((p) => (p.id === newPhotoId ? { ...p, url: res.publicUrl } : p))
        );
      }
    });

    handleCloseLiveCamera();
    showToast('Installation photo captured and attached to proof gallery!', 'teal');
  };

  // Generate realistic on-site field snapshot for testing or fallback
  const handleUseSampleCapture = () => {
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 1280;
    sampleCanvas.height = 720;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#042f2e');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Border and target box
      ctx.strokeStyle = '#14b8a6';
      ctx.lineWidth = 3;
      ctx.strokeRect(60, 60, 1160, 600);

      // Watermark header
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 34px sans-serif';
      ctx.fillText('FiberX Field Installation Optical Verification', 100, 140);

      // Details
      ctx.fillStyle = '#99f6e4';
      ctx.font = '22px monospace';
      ctx.fillText(`Timestamp: ${new Date().toLocaleString()}`, 100, 200);
      ctx.fillText(`Technician: ${currentUser.name} (${currentUser.badgeId || 'FX-TECH'})`, 100, 240);
      ctx.fillText(`Location: Metro Manila Coverage Zone`, 100, 280);
      ctx.fillText(`Optical Rx Link: Active & Aligned`, 100, 320);

      // Draw simulated ONT device icon / badge
      ctx.fillStyle = '#0f766e';
      ctx.fillRect(100, 370, 420, 220);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText('ACTIVE FIBER ONT UNIT', 130, 430);
      ctx.fillStyle = '#a7f3d0';
      ctx.font = '16px monospace';
      ctx.fillText('PON: SOLID GREEN (LINK UP)', 130, 470);
      ctx.fillText('LOS: OFF (NO LOSS OF SIGNAL)', 130, 500);
      ctx.fillText('LAN1: 1000M FULL DUPLEX', 130, 530);

      const sampleUrl = sampleCanvas.toDataURL('image/jpeg', 0.9);
      setCapturedPhotoUrl(sampleUrl);

      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
        setCameraStream(null);
      }
    }
  };

  // Handle Submit Installation Form
  const handleSubmitInstallation = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedItemId) {
      showToast('Please select a modem or equipment from your van kit.', 'red');
      return;
    }

    if (!customerAccountNumber.trim()) {
      showToast('Please enter the subscriber account number.', 'red');
      return;
    }

    if (!customerName.trim()) {
      showToast('Please enter the customer full name.', 'red');
      return;
    }

    const finalPhotoUrl = photoProofUrl || (uploadedPhotos[0]?.url ?? '');
    const finalPhotoType = photoProofType || (uploadedPhotos[0]?.type ?? 'INSTALLATION_PHOTO');

    if (!finalPhotoUrl) {
      showToast('Please attach or take a photo proof of the installation.', 'red');
      return;
    }

    // Check duplicate account number against other existing verified items
    const searchAcc = (customerAccountNumber || '').trim().toLowerCase();
    const duplicateConflict = searchAcc
      ? inventory.find(
          (it) =>
            it.id !== selectedItemId &&
            it.customerAccountNumber &&
            it.customerAccountNumber.trim().toLowerCase() === searchAcc &&
            (it.verificationStatus === 'VERIFIED_CONNECTED' || it.adminVerificationStatus === 'APPROVED')
        )
      : undefined;

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);

      const photoNotes =
        uploadedPhotos.length > 1
          ? ` (${uploadedPhotos.length} field photos attached)`
          : '';

      const allPhotos =
        uploadedPhotos.length > 0
          ? uploadedPhotos
          : finalPhotoUrl
          ? [
              {
                id: `proof-${Date.now()}`,
                name: 'Field_Proof.jpg',
                url: finalPhotoUrl,
                size: '1 MB',
                timestamp: 'Just now',
                type: finalPhotoType,
              },
            ]
          : [];

      onSubmitVerification(selectedItemId, {
        customerAccountNumber: customerAccountNumber.trim().toUpperCase(),
        customerName: customerName.trim(),
        customerAddress: customerAddress.trim() || 'Customer Premises',
        opticalRx: opticalRx.trim() || undefined,
        notes: notes.trim()
          ? (napPort.trim() ? `${notes.trim()} (NAP: ${napPort.trim()})${photoNotes}` : `${notes.trim()}${photoNotes}`)
          : (napPort.trim() ? `Installed at NAP: ${napPort.trim()}${photoNotes}` : (photoNotes ? photoNotes.trim() : 'Installation completed')),
        photoProofUrl: finalPhotoUrl,
        photoProofType: finalPhotoType,
        photoProofUrls: allPhotos.map((p) => p.url),
        proofPhotos: allPhotos.map((p) => ({
          id: p.id,
          name: p.name,
          url: p.url,
          size: p.size,
          timestamp: p.timestamp,
          type: p.type,
        })),
        isDuplicateDetected: !!duplicateConflict,
        duplicateConflictSerial: duplicateConflict ? duplicateConflict.serialNumber : undefined,
      });

      // Clear form
      setSelectedItemId('');
      setCustomerAccountNumber('');
      setCustomerName('');
      setCustomerAddress('');
      setOpticalRx('');
      setNapPort('');
      setNotes('');
      setUploadedPhotos([]);
      setPhotoProofUrl('');

      // Navigate to submissions tab to view pending status
      setActiveTab('submissions');
    }, 400);
  };

  return (
    <div className="h-screen max-h-screen flex flex-col overflow-hidden bg-[#F8FAFC] text-slate-900 font-sans">
      {/* ================= TOP APP BAR (Structured like Admin Header) ================= */}
      <header className="shrink-0 z-40 w-full bg-white border-b border-slate-200 shadow-2xs select-none">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left Brand + Mobile Toggle */}
          <div className="flex items-center gap-3 sm:gap-6 shrink-0">
            <button
              type="button"
              id="tech-sidebar-toggle-btn"
              onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
              className="p-2 -ml-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden cursor-pointer"
              title="Toggle Field Operations Menu"
              aria-label="Toggle Field Operations Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <FiberXLogo />
          </div>

          {/* Right Header Cluster: [1. Notification Bell] [2. Account Avatar with Caret Dropdown Menu] */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 1. Notification Bell Icon (With badge) */}
            <div className="relative">
              <button
                type="button"
                id="tech-header-notifications-button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsAccountMenuOpen(false);
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  isNotificationsOpen
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Technician Notifications & Work Orders"
                aria-label="Technician Notifications & Work Orders"
                aria-expanded={isNotificationsOpen}
              >
                <Bell className="w-5 h-5 transition-transform hover:scale-105" />

                {unreadNotifCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-white shadow-2xs leading-none"
                    aria-label={`${unreadNotifCount} unread alerts`}
                  >
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <NotificationsDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notificationsState}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
                onSelectNotification={handleSelectNotification}
              />
            </div>

            {/* 2. Account Avatar Icon with Caret Dropdown Menu */}
            <div className="relative ml-0.5">
              <button
                type="button"
                id="tech-account-menu-button"
                onClick={() => {
                  setIsAccountMenuOpen(!isAccountMenuOpen);
                  setIsNotificationsOpen(false);
                }}
                className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-teal-600/30 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center group w-9 h-9"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="true"
                aria-label={`User account menu for ${currentUser.name}`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 group-hover:border-teal-600 transition-colors bg-teal-100 flex items-center justify-center select-none">
                  <span className="text-xs font-black tracking-wider text-teal-900">
                    {getUserInitials(currentUser.name)}
                  </span>
                </div>
              </button>

              {/* Account Dropdown Menu with identical structure */}
              <AccountDropdown
                isOpen={isAccountMenuOpen}
                onClose={() => setIsAccountMenuOpen(false)}
                currentUser={currentUser}
                activeItem={activeMenuTab}
                onSelectOption={handleSelectAccountOption}
                availableProfiles={availableProfiles}
                onSwitchProfile={onSwitchProfile}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout Container (Identical structure to Admin Layout) */}
      <div className="flex-1 flex overflow-hidden min-h-0 w-full relative">
        {/* Mobile Backdrop */}
        {isMobileNavOpen && (
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-30 md:hidden animate-in fade-in duration-200"
            onClick={() => setIsMobileNavOpen(false)}
          />
        )}

        {/* Left Navigation Sidebar - Structured EXACTLY like Admin Sidebar */}
        <aside
          className={`w-64 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col justify-between select-none overflow-hidden z-30 transition-transform duration-200 ease-in-out md:translate-x-0 ${
            isMobileNavOpen
              ? 'fixed inset-y-0 left-0 translate-x-0 shadow-2xl pt-16 md:pt-0'
              : 'fixed inset-y-0 left-0 -translate-x-full md:relative md:translate-x-0'
          }`}
        >
          <div className="p-4 space-y-6 overflow-y-auto flex-1 overscroll-contain">
            {/* Main Navigation Links */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
                Operations Console
              </div>

              {/* Dashboard Tab */}
              <button
                type="button"
                id="tech-nav-dashboard"
                onClick={() => {
                  setActiveTab('dashboard');
                  setSelectedDetailItem(null);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'dashboard' && !selectedDetailItem
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard / Overview
                </span>
              </button>

              {/* My Assigned Kit Tab */}
              <button
                type="button"
                id="tech-nav-van-kit"
                onClick={() => {
                  setActiveTab('van_kit');
                  setSelectedDetailItem(null);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'van_kit' && !selectedDetailItem
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4" />
                  My Assigned Kit
                </span>
              </button>

              {/* Install & Link Modem Tab */}
              <button
                type="button"
                id="tech-nav-install-link"
                onClick={() => {
                  setActiveTab('install_link');
                  setSelectedDetailItem(null);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'install_link' && !selectedDetailItem
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <PlusCircle className="w-4 h-4" />
                  Install & Link Modem
                </span>
              </button>

              {/* Submissions & Verifications Tab */}
              <button
                type="button"
                id="tech-nav-submissions"
                onClick={() => {
                  setActiveTab('submissions');
                  setSelectedDetailItem(null);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'submissions' && !selectedDetailItem
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <FileCheck2 className="w-4 h-4" />
                  Submissions & Closures
                </span>
              </button>

              {/* Archive & Recovery Tab */}
              <button
                type="button"
                id="tech-nav-archive"
                onClick={() => {
                  setActiveTab('archive');
                  setSelectedDetailItem(null);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  activeTab === 'archive' && !selectedDetailItem
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Archive className="w-4 h-4" />
                  Archive & Recovery
                </span>
              </button>

              {/* Hardware in Van Collapsible Section (Identical to Admin Sidebar) */}
              <button
                type="button"
                onClick={() => setIsVanCategoriesOpen(!isVanCategoriesOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer group text-left mt-3"
              >
                <span className="flex items-center gap-2.5">
                  <SlidersHorizontal className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
                  <span>Hardware in Van</span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                    isVanCategoriesOpen ? '' : '-rotate-90'
                  }`}
                />
              </button>

              {isVanCategoriesOpen && (
                <div className="pl-3 ml-3 border-l border-slate-200 space-y-0.5 my-1">
                  {[
                    { id: 'ALL', label: 'All Van Stock', icon: Layers, count: assignedItems.length },
                    { id: 'MODEM_ONT', label: 'Modems & ONTs', icon: Wifi, count: vanModemsCount },
                    { id: 'FIBER_CABLE', label: 'Fiber Drop Cables', icon: Cable, count: vanCablesCount },
                    { id: 'SPLITTER', label: 'Optical Splitters', icon: GitFork, count: vanSplittersCount },
                    { id: 'PATCH_CORD', label: 'Patch Cords & Fast-Con', icon: Radio, count: vanPatchCount },
                    { id: 'ACCESSORY', label: 'Accessories & Clamps', icon: Boxes, count: vanAccessoryCount },
                  ].map((cat) => {
                    const isSelected = activeTab === 'van_kit' && kitCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setActiveTab('van_kit');
                          setKitCategoryFilter(cat.id);
                          setIsMobileNavOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <cat.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`} />
                          <span className="truncate">{cat.label}</span>
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold">{cat.count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Telemetry Footer (identical to Admin sidebar) */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 space-y-1 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">FiberX Mobile V2.6</span>
              <span className="font-mono text-teal-700 font-bold">ONLINE</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Converge ICT Field Operations & Dispatch Node
            </p>
          </div>
        </aside>

        {/* Central Workspace Router - Right main independent scrollable entity */}
        <main className="flex-1 min-w-0 h-full overflow-y-auto bg-[#F8FAFC]">
          {selectedDetailItem ? (
            <ItemDetailView
              item={inventory.find((it) => it.id === selectedDetailItem.id) || selectedDetailItem}
              currentUser={currentUser}
              technicians={technicians}
              auditLogs={auditLogs}
              backTitle={
                activeTab === 'van_kit'
                  ? 'My Assigned Kit'
                  : activeTab === 'submissions'
                  ? 'Submissions & Closures'
                  : activeTab === 'install_link'
                  ? 'Install & Link'
                  : activeTab === 'archive'
                  ? 'Archive & Recovery'
                  : 'Dashboard'
              }
              onBack={() => setSelectedDetailItem(null)}
              onOpenClosure={(item) => {
                setSelectedDetailItem(null);
                setSelectedItemId(item.id);
                setActiveTab('install_link');
              }}
              showToast={showToast}
            />
          ) : activeTab === 'archive' ? (
            <ArchiveView
              inventory={inventory}
              technicians={technicians}
              currentUser={currentUser}
              auditLogs={auditLogs}
              onRestore={onRestore || (() => {})}
              onArchive={onArchive}
              onBatchRestore={onBatchRestore || (() => {})}
              onSelectItemDetail={(item) => {
                setSelectedDetailItem(item);
                if (onSelectItemDetail) onSelectItemDetail(item);
              }}
              showToast={showToast}
            />
          ) : (
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
              {/* ================= TAB 1: DASHBOARD OVERVIEW ================= */}
              {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Incoming Dispatches from Admin - Awaiting Technician Receipt */}
            {incomingDispatches.length > 0 && (
              <div className="p-5 rounded-2xl bg-linear-to-r from-teal-900 to-[#003B46] text-white shadow-md border border-teal-700/50 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                      <Truck className="w-5 h-5 text-teal-200" />
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-white">
                          New Equipment Dispatched from Central Admin
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[11px] font-mono font-bold">
                          {incomingDispatches.length} PENDING RECEIPT
                        </span>
                      </div>
                      <p className="text-xs text-teal-100/90 mt-0.5">
                        Central Warehouse Admin has assigned hardware to your van ({currentTech.assignedVan}). Confirm physical custody.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAcknowledgeAll}
                    className="self-start sm:self-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Check className="w-4 h-4" />
                    <span>Acknowledge All ({incomingDispatches.length}) Receipt</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                  {incomingDispatches.slice(0, 6).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl text-xs space-y-2 backdrop-blur-xs transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-white truncate max-w-[180px]">{item.name}</p>
                          <span className="font-mono text-[11px] text-teal-200">{item.serialNumber}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-teal-800 text-teal-100 text-[10px] font-bold">
                          {item.category.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-white/10">
                        <span className="text-[10px] text-teal-200/80">Bin: {item.storageBin || currentTech.assignedVan}</span>
                        <button
                          type="button"
                          onClick={() => handleAcknowledgeSingle(item.id)}
                          className="px-2 py-1 bg-white text-teal-900 hover:bg-teal-50 rounded-md font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Confirm</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => setActiveTab('van_kit')}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-teal-500 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Van Custody</span>
                </div>
                <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{vanStockReady.length}</p>
                <p className="text-xs font-bold text-slate-600 mt-1">Available to Install</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Assigned by Central Admin</p>
              </div>

              <div
                onClick={() => {
                  setSubmissionFilter('PENDING');
                  setActiveTab('submissions');
                }}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-amber-500 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black">
                    AWAITING REVIEW
                  </span>
                </div>
                <p className="text-3xl font-extrabold text-amber-600 tracking-tight">{pendingCount}</p>
                <p className="text-xs font-bold text-slate-600 mt-1">Pending Verification</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Photo proofs under review</p>
              </div>

              <div
                onClick={() => {
                  setSubmissionFilter('APPROVED');
                  setActiveTab('submissions');
                }}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-emerald-500 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Live Active</span>
                </div>
                <p className="text-3xl font-extrabold text-emerald-600 tracking-tight">{verifiedCount}</p>
                <p className="text-xs font-bold text-slate-600 mt-1">Admin Verified</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Active subscriber circuits</p>
              </div>

              <div
                onClick={() => {
                  setSubmissionFilter('REJECTED');
                  setActiveTab('submissions');
                }}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:border-red-500 hover:shadow-sm transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
                    <AlertTriangle className="w-5 h-5" />
                  </span>
                  <span className="text-xs font-semibold text-slate-400">Attention</span>
                </div>
                <p className="text-3xl font-extrabold text-red-600 tracking-tight">{flaggedCount}</p>
                <p className="text-xs font-bold text-slate-600 mt-1">Action Required</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Rejected proof / duplicate</p>
              </div>
            </div>

            {/* Two-Column Section: Ready in Van vs Recent Submissions */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 6 cols: Modems Ready to Deploy in Van */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-teal-700" />
                    <h2 className="text-base font-extrabold text-slate-900">Van Hardware Kit ({vanStockReady.length})</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('van_kit')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                  >
                    View All Kit
                  </button>
                </div>

                {vanStockReady.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                    <Package className="w-8 h-8 mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No hardware currently in van kit</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Log in as Admin to assign modems and spools to Technician {currentUser.name}.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                    {vanStockReady.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border border-slate-200 hover:border-teal-400 bg-slate-50/50 hover:bg-teal-50/30 transition-all flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-800">
                              {item.category.replace('_', ' ')}
                            </span>
                            <span className="font-mono text-xs font-extrabold text-slate-900 truncate">
                              {item.serialNumber}
                            </span>
                          </div>
                          <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                          <p className="text-[11px] text-slate-500 font-mono">MAC: {item.macAddress || 'N/A'}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleStartInstall(item)}
                          className="px-3 py-2 rounded-xl bg-[#003B46] hover:bg-[#002B33] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
                        >
                          <span>Install</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right 6 cols: Recent Work Orders & Submissions */}
              <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-700" />
                    <h2 className="text-base font-extrabold text-slate-900">Recent Installations ({submittedItems.length})</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('submissions')}
                    className="text-xs font-bold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
                  >
                    View History
                  </button>
                </div>

                {submittedItems.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center">
                    <FileText className="w-8 h-8 mb-2 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">No installations recorded yet</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Deploy your first modem to connect a subscriber account.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 flex-1 overflow-y-auto max-h-[380px] pr-1">
                    {submittedItems.slice(0, 4).map((item) => {
                      const isPending =
                        item.verificationStatus === 'AWAITING_VERIFICATION' ||
                        item.adminVerificationStatus === 'PENDING';
                      const isApproved =
                        item.verificationStatus === 'VERIFIED_CONNECTED' ||
                        item.adminVerificationStatus === 'APPROVED';

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-all flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-xs font-black text-teal-950">
                                #{item.customerAccountNumber || 'ACC-PENDING'}
                              </span>
                              {isPending ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-100 text-amber-800">
                                  Awaiting Admin
                                </span>
                              ) : isApproved ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-800">
                                  Verified Live
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-red-100 text-red-800">
                                  Action Needed
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {item.customerName || 'Subscriber'} • {item.name}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono">
                              SN: {item.serialNumber} | Rx: {item.opticalRx || '-18.5 dBm'}
                            </p>
                          </div>

                          {item.photoProofUrl && (
                            <button
                              type="button"
                              onClick={() => setZoomPhotoUrl(item.photoProofUrl || null)}
                              className="w-12 h-12 rounded-lg border border-slate-200 overflow-hidden relative group shrink-0 cursor-pointer shadow-2xs"
                              title="Click to view photo proof"
                            >
                              <img
                                src={item.photoProofUrl}
                                alt="Installation Proof"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <ZoomIn className="w-4 h-4 text-white" />
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 2: MY ASSIGNED KIT (VAN INVENTORY) ================= */}
        {activeTab === 'van_kit' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <Truck className="w-5 h-5 text-teal-600" />
                  Van Inventory & Kit
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Hardware assigned to your custody ({currentTech.assignedVan}) awaiting customer installation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('install_link')}
                  className="px-4 py-2 rounded-xl bg-[#003B46] hover:bg-[#002B33] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Install Modem</span>
                </button>
              </div>
            </div>

            {/* New Dispatches Pending Technician Confirmation Banner */}
            {incomingDispatches.length > 0 && (
              <div className="p-4 bg-teal-50 border-2 border-teal-500 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-teal-950 shadow-xs animate-in fade-in duration-150">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-teal-950 flex items-center gap-2">
                      <span>{incomingDispatches.length} New Equipment Dispatched from Central Admin</span>
                      <span className="px-2 py-0.5 rounded-full bg-teal-200 text-teal-900 font-mono text-[10px] font-bold">
                        AWAITING RECEIPT
                      </span>
                    </p>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Verify physical equipment in your van stock, then confirm receipt to update central inventory logs.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAcknowledgeAll}
                  className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer whitespace-nowrap self-start sm:self-auto"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirm Receipt for All ({incomingDispatches.length})</span>
                </button>
              </div>
            )}

            {/* Main Content Area Structured like Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Search & Category Filter Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[260px] max-w-md flex-1">
                  <input
                    type="text"
                    value={kitSearchQuery}
                    onChange={(e) => setKitSearchQuery(e.target.value)}
                    placeholder="Search van kit by Serial, MAC, Model, SKU, Name..."
                    className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  {kitSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setKitSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="van-kit-category-filter" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Category:
                  </label>
                  <div className="relative min-w-[190px]">
                    <select
                      id="van-kit-category-filter"
                      value={kitCategoryFilter}
                      onChange={(e) => setKitCategoryFilter(e.target.value)}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">All Equipment ({vanStockReady.length})</option>
                      <option value="MODEM_ONT">Modems & ONTs ({vanModemsCount})</option>
                      <option value="ROUTER">Wi-Fi Routers</option>
                      <option value="FIBER_CABLE">Cables & Drop Wire ({vanCablesCount})</option>
                      <option value="SPLITTER">Splitters ({vanSplittersCount})</option>
                      <option value="PATCH_CORD">Patch Cords ({vanPatchCount})</option>
                      <option value="ACCESSORY">Accessories ({vanAccessoryCount})</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 min-w-[200px]">Equipment & Model</th>
                      <th className="px-4 py-3 min-w-[170px]">Serial / MAC</th>
                      <th className="px-4 py-3 min-w-[140px]">Category & Storage</th>
                      <th className="px-4 py-3 min-w-[150px]">Lifecycle & Status</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap min-w-[210px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredVanKit.length > 0 ? (
                      filteredVanKit.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => {
                            setSelectedDetailItem(item);
                            if (onSelectItemDetail) onSelectItemDetail(item);
                          }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          {/* Equipment & Model */}
                          <td className="px-4 py-3 min-w-[200px]">
                            <p className="font-extrabold text-slate-900 leading-snug">{item.name}</p>
                            <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                              <span>Model: <strong className="text-slate-700 font-medium">{item.modelName || 'Standard'}</strong></span>
                              {item.sku && (
                                <span>SKU: <strong className="text-slate-700 font-medium">{item.sku}</strong></span>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-[11px] text-slate-400 truncate max-w-xs mt-0.5">{item.description}</p>
                            )}
                          </td>

                          {/* Serial / MAC */}
                          <td className="px-4 py-3 font-mono min-w-[170px]">
                            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-xs">
                              {item.serialNumber}
                            </span>
                            {item.macAddress ? (
                              <span className="block text-[11px] text-slate-500 mt-1">
                                MAC: {item.macAddress}
                              </span>
                            ) : null}
                          </td>

                          {/* Category & Storage */}
                          <td className="px-4 py-3 min-w-[140px]">
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-teal-50 text-teal-800 border border-teal-200/60 uppercase">
                              {item.category.replace('_', ' ')}
                            </span>
                            <span className="block text-[11px] text-slate-500 font-mono mt-1">
                              Bin: {item.storageBin || currentTech.assignedVan}
                            </span>
                          </td>

                          {/* Lifecycle & Status */}
                          <td className="px-4 py-3 min-w-[170px]">
                            {item.isReturnPending ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-800 font-bold bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-md">
                                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                                  Return In Review
                                </span>
                                <span className="block text-[10px] text-slate-500 font-medium">
                                  Awaiting Admin Restock
                                </span>
                              </div>
                            ) : !item.technicianAcknowledgedAt ? (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[11px] text-teal-800 font-bold bg-teal-50 border border-teal-300 px-2 py-0.5 rounded-md animate-pulse">
                                  <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                                  New Dispatch
                                </span>
                                <span className="block text-[10px] text-slate-500 font-medium">
                                  Pending Confirmation
                                </span>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  Ready to Deploy
                                </span>
                                <span className="block text-[10px] text-slate-500 font-medium">
                                  In Van Custody
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              {!item.technicianAcknowledgedAt && !item.isReturnPending && (
                                <button
                                  type="button"
                                  onClick={() => handleAcknowledgeSingle(item.id)}
                                  className="p-1.5 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                                  title="Confirm Receipt from Central Warehouse"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                              )}

                              {!item.isReturnPending && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => handleStartInstall(item)}
                                    className="p-1.5 rounded-lg text-teal-700 hover:text-teal-900 hover:bg-teal-50 transition-colors cursor-pointer"
                                    title="Install & Link"
                                  >
                                    <ArrowRight className="w-4 h-4" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReturnModalItem(item);
                                      setIsReturnModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg text-slate-500 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                                    title="Return hardware back to Central Admin warehouse"
                                  >
                                    <RotateCcw className="w-4 h-4" />
                                  </button>
                                </>
                              )}

                              {item.isReturnPending && (
                                <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                                  Return In Review
                                </span>
                              )}

                              {onSelectItemDetail && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedDetailItem(item);
                                    onSelectItemDetail(item);
                                  }}
                                  className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center justify-center transition-colors active:scale-95"
                                  title="View Details"
                                  aria-label="View Details"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                          <Package className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold text-slate-700">No Hardware Found in Van</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {kitSearchQuery || kitCategoryFilter !== 'ALL'
                              ? 'No hardware matches the selected search filters.'
                              : `Central Warehouse has not dispatched items to ${currentTech.assignedVan} yet.`}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: INSTALL & LINK MODEM (CORE FORM) ================= */}
        {activeTab === 'install_link' && (
          <form onSubmit={handleSubmitInstallation} className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-teal-600" />
                  Install & Link Modem to Account
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Connect subscriber work order with assigned modem. Upload field photo proof for admin approval.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedItemId || !customerAccountNumber.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#003B46] hover:bg-[#002B33] active:scale-[0.99] text-white text-xs font-extrabold shadow-sm hover:shadow transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Submit for Admin Verification</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Split Screen Installation Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                {/* ================= LEFT COLUMN: UNIFIED CONTAINER (STEPS 1, 2, 3) ================= */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6 flex flex-col justify-between h-full">
                  {/* STEP 1: Choose Assigned Equipment */}
                  <div className="space-y-3">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      1. Select Modem from Van Custody
                    </label>

                    {vanStockReady.length === 0 ? (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                        <p className="font-bold">No hardware currently available in your van kit.</p>
                        <p className="text-[11px] mt-0.5">
                          Ask Central Warehouse Admin to dispatch modems to Technician {currentUser.name}.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <select
                          value={selectedItemId}
                          onChange={(e) => setSelectedItemId(e.target.value)}
                          className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white transition-all cursor-pointer font-mono"
                        >
                          <option value="">-- Choose hardware to install --</option>
                          {vanStockReady.map((it) => (
                            <option key={it.id} value={it.id}>
                              {it.name} | SN: {it.serialNumber} | MAC: {it.macAddress || 'N/A'}
                            </option>
                          ))}
                        </select>

                        {selectedItem && (
                          <div className="p-3.5 rounded-xl bg-teal-50/60 border border-teal-200/80 flex items-center justify-between gap-3 text-xs">
                            <div>
                              <p className="font-black text-teal-950">{selectedItem.name}</p>
                              <p className="font-mono text-[11px] text-teal-800 mt-0.5">
                                SN: <span className="font-bold">{selectedItem.serialNumber}</span> • MAC: {selectedItem.macAddress || 'N/A'} • {selectedItem.brand}
                              </p>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-teal-200/70 text-teal-900 shrink-0">
                              Selected
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* STEP 2: Subscriber & Work Order Details */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      2. Subscriber Account Information
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Account Number *</label>
                        <div className="relative">
                          <Hash className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={customerAccountNumber}
                            onChange={(e) => setCustomerAccountNumber(e.target.value.toUpperCase())}
                            placeholder="e.g. ACC-84920"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white uppercase"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Customer / Company Name *</label>
                        <div className="relative">
                          <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={customerName}
                            onChange={(e) => setCustomerName(e.target.value)}
                            placeholder="e.g. Roberto Dela Cruz"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Installation Address</label>
                      <div className="relative">
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={customerAddress}
                          onChange={(e) => setCustomerAddress(e.target.value)}
                          placeholder="e.g. Unit 4B, Emerald Heights, Quezon City"
                          className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* STEP 3: Optical Telemetry & Port */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      3. Optical Power & Port Telemetry
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Optical Power (Rx dBm)</label>
                        <div className="relative">
                          <Signal className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={opticalRx}
                            onChange={(e) => setOpticalRx(e.target.value)}
                            placeholder="-18.5 dBm"
                            className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">NAP Box / Port Assignment</label>
                        <input
                          type="text"
                          value={napPort}
                          onChange={(e) => setNapPort(e.target.value)}
                          placeholder="e.g. NAP-QC-04, Port 02"
                          className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Field Notes / Remarks</label>
                      <textarea
                        rows={4}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Standard wall mount completed. Speed test verified 200Mbps download."
                        className="w-full min-h-[120px] p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ================= RIGHT COLUMN: STEP 4 (PHOTO PROOF) ================= */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col gap-4 h-full">
                  <div className="flex items-center justify-between flex-wrap gap-2 shrink-0">
                    <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                      4. Photo Proof of Installation
                    </label>
                    <span className="text-[10px] text-slate-500 font-medium">Attach field proof photos for central admin verification</span>
                  </div>


                  {/* Drag & Drop Upload Zone - Expands to take the remaining gaps */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all flex flex-col items-center justify-center flex-1 min-h-[220px] ${
                      isDragging
                        ? 'border-teal-600 bg-teal-50/50 ring-2 ring-teal-500/20'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-teal-50/20 hover:border-teal-400'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
                      <Upload className="w-6 h-6 text-slate-600" />
                    </div>

                    <p className="text-base font-bold text-slate-800">
                      Choose a file or drag & drop
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      JPEG, PNG, PDF, and format, up to 20MB
                    </p>

                    {/* Action Buttons: Take a Photo on left, Browse File on right */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
                      <button
                        type="button"
                        onClick={() => handleOpenLiveCamera('environment')}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow transition-all"
                      >
                        <Camera className="w-4 h-4 text-teal-700" />
                        <span>Take a Photo</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer shadow-2xs hover:shadow transition-all"
                      >
                        <Upload className="w-4 h-4 text-slate-600" />
                        <span>Browse File</span>
                      </button>
                    </div>

                    {/* Hidden Native File Inputs */}
                    <input
                      type="file"
                      ref={cameraInputRef}
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*,application/pdf"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>


                  {/* List of Uploaded Photos */}
                  <div className="space-y-2 shrink-0">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800">Uploaded Photos</p>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200/80 font-mono">
                        {uploadedPhotos.length} {uploadedPhotos.length === 1 ? 'photo' : 'photos'}
                      </span>
                    </div>

                    {uploadedPhotos.length === 0 ? (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 hover:border-teal-500 rounded-2xl p-5 text-center bg-slate-50 hover:bg-teal-50/20 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[140px]"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                          <Camera className="w-4 h-4" />
                        </div>
                        <p className="text-xs font-bold text-slate-700">No photos uploaded yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 max-w-[200px]">
                          Click here to attach installation field proofs.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[206px] overflow-y-auto pr-1">
                        {uploadedPhotos.map((photo, index) => {
                          const isSelected = photoProofUrl === photo.url;
                          return (
                            <div
                              key={photo.id}
                              onClick={() => {
                                setPhotoProofUrl(photo.url);
                                setPhotoProofType(photo.type);
                              }}
                              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex items-center gap-2 ${
                                isSelected
                                  ? 'border-teal-600 bg-teal-50/70 ring-1 ring-teal-500/30 shadow-2xs'
                                  : 'border-slate-200 bg-white hover:bg-slate-50'
                              }`}
                            >
                              {/* Thumbnail with Selection Overlay */}
                              <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-200 shrink-0 bg-slate-100">
                                <img
                                  src={photo.url}
                                  alt={photo.name}
                                  className="w-full h-full object-cover"
                                />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-teal-900/30 flex items-center justify-center">
                                    <Check className="w-3.5 h-3.5 text-white drop-shadow" />
                                  </div>
                                )}
                              </div>

                              {/* Photo Metadata */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {photo.name}
                                </p>
                                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                  <span>#{index + 1}</span>
                                  {photo.size && <span>• {photo.size}</span>}
                                </div>
                              </div>

                              {/* Action Buttons: Zoom & Delete */}
                              <div className="flex items-center gap-0.5 shrink-0 ml-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setZoomPhotoUrl(photo.url);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
                                  title="Zoom in full size"
                                >
                                  <ZoomIn className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => handleDeletePhoto(photo.id, e)}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
                                  title="Remove photo"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
          </form>
        )}

        {/* ================= TAB 4: SUBMISSIONS & VERIFICATIONS ================= */}
        {activeTab === 'submissions' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  Installation Submissions & Verification Hub
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Track verification status, subscriber account tags, optical power, and admin approvals
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('install_link')}
                className="px-4 py-2 rounded-xl bg-[#003B46] hover:bg-[#002B33] text-white text-xs font-bold shadow-xs flex items-center gap-2 cursor-pointer self-start sm:self-auto"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Installation</span>
              </button>
            </div>

            {/* Main Content Area Structured like Admin Verification Queue & Account Tag Hub */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Search & Subfilters Bar */}
              <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[260px] max-w-md flex-1">
                  <input
                    type="text"
                    value={submissionSearchQuery}
                    onChange={(e) => setSubmissionSearchQuery(e.target.value)}
                    placeholder="Search queue by Account #, Subscriber, Serial, SKU..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="submission-status-filter" className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                    Status:
                  </label>
                  <div className="relative min-w-[210px]">
                    <select
                      id="submission-status-filter"
                      value={submissionFilter}
                      onChange={(e) => setSubmissionFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED')}
                      className="w-full appearance-none pl-3 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs cursor-pointer"
                    >
                      <option value="ALL">All ({submittedItems.length})</option>
                      <option value="PENDING">Pending Review ({pendingCount})</option>
                      <option value="APPROVED">Verified & Active ({verifiedCount})</option>
                      <option value="REJECTED">Action Needed ({flaggedCount})</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Data Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 min-w-[200px]">Queue Status</th>
                      <th className="px-4 py-3 min-w-[170px]">Submitted Account Tag</th>
                      <th className="px-4 py-3 min-w-[180px]">Subscriber & Address</th>
                      <th className="px-4 py-3 min-w-[150px]">Modem Serial & SKU</th>
                      <th className="px-4 py-3 w-44 min-w-[150px] whitespace-nowrap">Proof / Optical Rx</th>
                      <th className="px-4 py-3 text-right whitespace-nowrap w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSubmissions.length > 0 ? (
                      filteredSubmissions.map((item) => {
                        const isPending =
                          item.verificationStatus === 'AWAITING_VERIFICATION' ||
                          item.adminVerificationStatus === 'PENDING';
                        const isApproved =
                          item.verificationStatus === 'VERIFIED_CONNECTED' ||
                          item.adminVerificationStatus === 'APPROVED';
                        const isRejected =
                          item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
                          item.adminVerificationStatus === 'REJECTED' ||
                          item.adminVerificationStatus === 'DUPLICATE_FLAGGED';

                        return (
                          <tr
                            key={item.id}
                            onClick={() => {
                              setSelectedDetailItem(item);
                              if (onSelectItemDetail) onSelectItemDetail(item);
                            }}
                            className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                              isRejected
                                ? 'bg-red-50/30'
                                : isApproved
                                ? 'hover:bg-emerald-50/30'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Queue Status Dual Badge */}
                            <td className="px-4 py-3 min-w-[200px]">
                              <DualStatusBadge
                                lifecycleStatus={item.lifecycleStatus}
                                verificationStatus={item.verificationStatus}
                                legacyStatus={item.status}
                                layout="column"
                                size="sm"
                                showCategoryHeaders={true}
                              />
                            </td>

                            {/* Submitted Account Tag */}
                            <td className="px-4 py-3 font-mono font-bold text-teal-950 text-sm min-w-[170px]">
                              <div className="flex items-center gap-1.5">
                                {isApproved && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                {isPending && <Clock className="w-4 h-4 text-amber-500 shrink-0" />}
                                {isRejected && <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />}
                                <span>{item.customerAccountNumber || '[Pending Input]'}</span>
                              </div>
                              {item.submittedAt && (
                                <span className="block font-sans text-[10px] font-normal text-slate-500 mt-0.5">
                                  Submitted: {item.submittedAt}
                                </span>
                              )}
                            </td>

                            {/* Subscriber & Address */}
                            <td className="px-4 py-3 min-w-[180px]">
                              <p className="font-bold text-slate-900">{item.customerName || 'Subscriber'}</p>
                              <p className="text-[11px] text-slate-500 truncate max-w-xs">
                                {item.customerAddress || 'Premises'}
                              </p>
                            </td>

                            {/* Modem Serial & SKU */}
                            <td className="px-4 py-3 font-mono min-w-[150px]">
                              <span className="font-bold text-slate-800">{item.serialNumber}</span>
                              <span className="block text-[11px] text-teal-700 font-sans">
                                {item.name} {item.sku ? `(${item.sku})` : ''}
                              </span>
                            </td>

                            {/* Proof / Optical Rx */}
                            <td className="px-4 py-3 w-44 min-w-[150px] whitespace-nowrap">
                              <div className="flex items-center gap-1.5 flex-nowrap">
                                {item.photoProofUrl ? (
                                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold flex items-center gap-1 border border-slate-200 shrink-0">
                                    <Camera className="w-3 h-3 text-teal-600" />
                                    Photo Attached
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 shrink-0">No Photo</span>
                                )}
                                {item.opticalRx && (
                                  <span className="font-mono text-[10px] text-teal-800 font-bold shrink-0">
                                    {item.opticalRx}
                                  </span>
                                )}
                              </div>
                              {isRejected && item.adminRejectionReason && (
                                <p
                                  className="text-[10px] text-red-700 truncate max-w-[200px] mt-0.5"
                                  title={item.adminRejectionReason}
                                >
                                  Feedback: "{item.adminRejectionReason}"
                                </p>
                              )}
                            </td>

                            {/* Graphic Symbols Only Actions */}
                            <td className="px-4 py-3 text-right whitespace-nowrap w-24">
                              <div
                                className="flex items-center justify-end gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {isRejected && (
                                  <button
                                    type="button"
                                    onClick={() => handleResubmit(item)}
                                    className="w-8 h-8 rounded-lg bg-red-600 hover:bg-red-700 text-white shadow-xs flex items-center justify-center cursor-pointer transition-colors active:scale-95"
                                    title="Resubmit Proof"
                                    aria-label="Resubmit Proof"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {onSelectItemDetail && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedDetailItem(item);
                                      onSelectItemDetail(item);
                                    }}
                                    className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer flex items-center justify-center transition-colors active:scale-95"
                                    title="View Details"
                                    aria-label="View Details"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <ShieldCheck className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
                          <p className="font-semibold text-slate-700">No Submissions Found</p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {submissionSearchQuery || submissionFilter !== 'ALL'
                              ? 'No verification records match your filter criteria.'
                              : 'Submit your first modem installation to see verification tracking here.'}
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
            </div>
          )}
      </main>
      </div>

      {/* Live Field Camera Modal */}
      {isCameraModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={handleCloseLiveCamera}
        >
          <div
            className="relative w-full max-w-xl bg-slate-900 text-white rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60 flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-3.5 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
                  <Camera className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Live Field Camera</h3>
                  <p className="text-[11px] text-slate-400">Capture optical installation proof</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseLiveCamera}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Viewport / Preview Area */}
            <div className="relative w-full aspect-4/3 sm:aspect-16/9 bg-black flex items-center justify-center overflow-hidden">
              {capturedPhotoUrl ? (
                // Captured Photo Review
                <div className="relative w-full h-full flex items-center justify-center bg-black">
                  <img
                    src={capturedPhotoUrl}
                    alt="Captured Installation Proof"
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-teal-500/90 text-white text-[10px] font-bold tracking-wide flex items-center gap-1 shadow">
                    <Check className="w-3 h-3" />
                    PHOTO READY
                  </div>
                </div>
              ) : cameraError ? (
                // Camera Error / Permission Fallback
                <div className="p-6 text-center max-w-md mx-auto">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3 border border-amber-500/30">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-white mb-1">Camera Stream Unavailable</h4>
                  <p className="text-xs text-slate-400 mb-5 leading-relaxed">{cameraError}</p>

                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleUseSampleCapture}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Take Sample Field Photo
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseLiveCamera();
                        fileInputRef.current?.click();
                      }}
                      className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer border border-slate-700 transition-all"
                    >
                      <Upload className="w-4 h-4" />
                      Upload from Device
                    </button>
                  </div>
                </div>
              ) : (
                // Live Stream Video Feed
                <>
                  <video
                    ref={cameraVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover ${cameraFacingMode === 'user' ? '-scale-x-100' : ''}`}
                  />

                  {/* Framing Overlay (Corner Brackets) */}
                  <div className="absolute inset-6 border border-white/20 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-teal-400 rounded-tl"></div>
                      <div className="w-6 h-6 border-t-2 border-r-2 border-teal-400 rounded-tr"></div>
                    </div>
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-teal-400 rounded-bl"></div>
                      <div className="w-6 h-6 border-b-2 border-r-2 border-teal-400 rounded-br"></div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Bottom Controls */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
              {capturedPhotoUrl ? (
                // Review Controls
                <>
                  <button
                    type="button"
                    onClick={handleRetakePhoto}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                  >
                    <RotateCcw className="w-4 h-4 text-slate-400" />
                    <span>Retake Photo</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAcceptCapturedPhoto}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-teal-900/30 transition-all ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    <span>Use This Photo</span>
                  </button>
                </>
              ) : !cameraError ? (
                // Centered Shutter Button
                <div className="w-full flex justify-center py-1">
                  <button
                    type="button"
                    onClick={handleCapturePhoto}
                    aria-label="Capture Photo"
                    className="w-16 h-16 rounded-full bg-white hover:bg-slate-100 flex items-center justify-center p-1 cursor-pointer transition-transform active:scale-95 shadow-lg shadow-white/10"
                  >
                    <div className="w-13 h-13 rounded-full border-2 border-slate-900 bg-white flex items-center justify-center text-teal-700">
                      <Camera className="w-6 h-6" />
                    </div>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Modal */}
      {zoomPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setZoomPhotoUrl(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-white/20 p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomPhotoUrl(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-black/70 text-white hover:bg-black transition-colors cursor-pointer z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomPhotoUrl}
              alt="Installation Proof High Resolution"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
            <div className="p-3 text-center text-white text-xs font-bold">
              Field Installation Photo Proof submitted to Central Warehouse Admin
            </div>
          </div>
        </div>
      )}

      {/* Account Modals (Identical to Admin Modals) */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onNavigateTab={(tab) => {
          setIsProfileModalOpen(false);
          if (tab === 'dashboard') setActiveTab('dashboard');
          else if (tab === 'inventory') setActiveTab('van_kit');
          else if (tab === 'closures') setActiveTab('submissions');
        }}
      />

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        currentUser={currentUser}
        auditLogs={auditLogs}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        availableProfiles={availableProfiles}
        onUpdateAccount={(updatedData) => {
          if (onUpdateUserProfile) {
            onUpdateUserProfile(currentUser.id, updatedData);
          }
        }}
      />

      {/* Return Hardware Modal */}
      {isReturnModalOpen && returnModalItem && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsReturnModalOpen(false)}
        >
          <div
            className="relative max-w-lg w-full bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Return Equipment to Warehouse</h3>
                  <p className="text-xs text-slate-500">Route item to Central Admin for inspection and restock</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 text-xs">
              {/* Item Card */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{returnModalItem.name}</h4>
                    <p className="font-mono text-xs text-slate-600 font-semibold mt-0.5">SN: {returnModalItem.serialNumber}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200 uppercase">
                    {returnModalItem.category.replace('_', ' ')}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                  <div>Model: <strong className="text-slate-700 font-semibold">{returnModalItem.modelName || 'Standard'}</strong></div>
                  <div>Current Custody: <strong className="text-slate-700 font-semibold">{returnModalItem.storageBin || currentTech.assignedVan}</strong></div>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Return Reason <span className="text-red-500">*</span>
                </label>
                <select
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-2xs"
                >
                  <option value="Defective Optical Port / PON Loss">Defective Optical Port / PON Loss</option>
                  <option value="Damaged / Broken Enclosure">Damaged / Broken Enclosure</option>
                  <option value="Customer Cancelled Installation">Customer Cancelled Installation</option>
                  <option value="Over-allocation / Spare Restock">Over-allocation / Spare Restock</option>
                  <option value="Wrong Model for Premises">Wrong Model for Premises</option>
                  <option value="Other / Re-test Required">Other / Re-test Required</option>
                </select>
              </div>

              {/* Remarks */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Technician Remarks / Fault Description
                </label>
                <textarea
                  rows={3}
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  placeholder="e.g. Optical port won't lock sync; red alarm LED flashing after fiber clean."
                  className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none shadow-2xs"
                />
              </div>

              {/* Informational Callout */}
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 flex items-start gap-2.5">
                <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p>
                  <strong>Admin Verification Queue:</strong> This equipment will immediately appear in the Central Admin's Account Closures & Verification Queue flagged for inspection. Once the admin accepts the return, the item is restored to central stock.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReturn}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Return to Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
