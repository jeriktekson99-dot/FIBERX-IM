import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  UserProfile,
  AuditLog,
  Technician,
  ProofPhoto,
  CATEGORY_LABELS,
} from '../../types';
import {
  ArrowLeft,
  Barcode,
  Truck,
  FileCheck,
  Check,
  Edit,
  Trash2,
  Archive,
  Layers,
  Clock,
  AlertOctagon,
  X,
  Copy,
  CheckCircle2,
  Calendar,
  Tag,
  Cpu,
  ExternalLink,
  ZoomIn,
  Radio,
  User,
  ShieldCheck,
  MapPin,
  Package,
  Sparkles,
  Camera,
  Images,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { DualStatusBadge } from '../common/DualStatusBadge';
import { CATEGORY_DEFINITIONS, SKUHardwarePreset } from '../modals/ReceiveStockModal';

export interface ItemDetailViewProps {
  item: InventoryItem;
  currentUser: UserProfile;
  technicians?: Technician[];
  auditLogs: AuditLog[];
  backTitle?: string;
  onBack: () => void;
  onOpenAssign?: (item: InventoryItem) => void;
  onOpenClosure?: (item: InventoryItem) => void;
  onOpenVerification?: (item: InventoryItem) => void;
  onArchive?: (itemId: string) => void;
  onRestore?: (itemId: string) => void;
  onHardDelete?: (itemId: string) => void;
  onUpdateStatus?: (itemId: string, status: InventoryItem['status'], notes?: string) => void;
  onUpdateItem?: (itemId: string, updates: Partial<InventoryItem>) => void;
  showToast?: (text: string, type?: 'teal' | 'emerald' | 'red') => void;
}

export const ItemDetailView: React.FC<ItemDetailViewProps> = ({
  item,
  currentUser,
  technicians = [],
  auditLogs,
  backTitle = 'Inventory',
  onBack,
  onOpenAssign,
  onOpenClosure,
  onOpenVerification,
  onArchive,
  onRestore,
  onHardDelete,
  onUpdateStatus,
  onUpdateItem,
  showToast,
}) => {
  const [isEditingBin, setIsEditingBin] = useState<boolean>(false);
  const [binValue, setBinValue] = useState<string>(item.storageBin || '');
  const [isEditingSubCategory, setIsEditingSubCategory] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isPhotoZoomOpen, setIsPhotoZoomOpen] = useState<boolean>(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  const allPhotos: ProofPhoto[] = useMemo(() => {
    if (!item) return [];
    const photos: ProofPhoto[] = [];
    const seenUrls = new Set<string>();

    if (item.proofPhotos && Array.isArray(item.proofPhotos)) {
      item.proofPhotos.forEach((p, idx) => {
        if (p && p.url && !seenUrls.has(p.url)) {
          seenUrls.add(p.url);
          photos.push({
            id: p.id || `proof-${idx}`,
            name: p.name || `Technician Photo #${idx + 1}`,
            url: p.url,
            size: p.size,
            timestamp: p.timestamp,
            type: p.type || item.photoProofType || 'INSTALLATION_PHOTO',
          });
        }
      });
    }

    if (item.photoProofUrls && Array.isArray(item.photoProofUrls)) {
      item.photoProofUrls.forEach((url, idx) => {
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url);
          photos.push({
            id: `proof-url-${idx}`,
            name: photos.length === 0 ? 'Primary Installation Proof' : `Field Proof #${photos.length + 1}`,
            url,
            type: item.photoProofType || 'INSTALLATION_PHOTO',
          });
        }
      });
    }

    if (item.photoProofUrl && !seenUrls.has(item.photoProofUrl)) {
      seenUrls.add(item.photoProofUrl);
      photos.push({
        id: `proof-single`,
        name: photos.length === 0 ? 'Installation Photo Proof' : `Field Proof #${photos.length + 1}`,
        url: item.photoProofUrl,
        type: item.photoProofType || 'INSTALLATION_PHOTO',
      });
    }

    return photos;
  }, [item]);

  const validPhotoIdx = Math.min(activePhotoIndex, Math.max(0, allPhotos.length - 1));
  const currentPhoto = allPhotos[validPhotoIdx];

  const formatPhotoType = (type?: string) => {
    switch (type) {
      case 'INSTALLATION_PHOTO':
        return 'ONT Wall Mount';
      case 'BARCODE_TAG':
        return 'Barcode Serial Label';
      case 'NAP_PORT':
        return 'NAP Box / Splice Port';
      case 'ONT_STATUS':
        return 'ONT Power / PON LEDs';
      default:
        return type || 'Field Evidence';
    }
  };

  const itemLogs = auditLogs.filter(
    (log) =>
      log.itemId === item.id ||
      (log.itemSerial && log.itemSerial.toUpperCase() === item.serialNumber.toUpperCase())
  );

  const canHardDelete = currentUser.role === 'ADMIN';
  const canArchive = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR' || currentUser.role === 'TECHNICIAN';
  const canAssign = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR';

  const handleCopy = (text: string, fieldName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    if (showToast) {
      showToast(`Copied ${fieldName} to clipboard`, 'teal');
    }
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleSaveBin = () => {
    if (binValue.trim() && onUpdateItem) {
      onUpdateItem(item.id, { storageBin: binValue.trim() });
      if (showToast) {
        showToast(`Storage bin updated to ${binValue.trim()}`, 'teal');
      }
    }
    setIsEditingBin(false);
  };

  const handleSelectPreset = (preset: SKUHardwarePreset) => {
    if (onUpdateItem) {
      onUpdateItem(item.id, {
        name: preset.name,
        sku: preset.sku,
        modelName: preset.modelName,
        brand: preset.brand,
        description: preset.description,
        category: preset.category,
        unit: preset.defaultUnit,
      });
      if (showToast) {
        showToast(`Hardware specifications switched to ${preset.name}`, 'teal');
      }
    }
    setIsEditingSubCategory(false);
  };

  const assignedTechObj = technicians.find(
    (t) => t.id === item.assignedTechnicianId || t.name === item.assignedTechnicianName
  );

  return (
    <div className="w-full min-h-full bg-slate-50 text-slate-800 pb-16">
      {/* Top Sticky Navigation Bar */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-4 sm:px-6 py-3 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Back Button and Breadcrumbs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="item-detail-back-button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>Back to {backTitle}</span>
            </button>

            <div className="h-4 w-px bg-slate-200 hidden sm:block" />

            <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <span>{backTitle}</span>
              <span className="text-slate-300">/</span>
              <span className="text-slate-600">{CATEGORY_LABELS[item.category] || item.category}</span>
              <span className="text-slate-300">/</span>
              <span className="font-mono text-teal-800 font-semibold truncate max-w-[200px]">
                {item.serialNumber || item.sku}
              </span>
            </nav>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {item.assignedTechnicianName && item.status === 'ASSIGNED' && onOpenClosure && (
              <button
                type="button"
                id="item-detail-submit-closure-btn"
                onClick={() => onOpenClosure(item)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs cursor-pointer"
              >
                <FileCheck className="w-3.5 h-3.5" />
                <span>Submit for Verification</span>
              </button>
            )}

            {(item.status === 'AWAITING_ADMIN_VERIFICATION' || item.status === 'SUSPECTED_DUPLICATE') &&
              currentUser.role === 'ADMIN' &&
              onOpenVerification && (
                <button
                  type="button"
                  id="item-detail-verify-queue-btn"
                  onClick={() => onOpenVerification(item)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-800 hover:bg-teal-900 transition-colors shadow-2xs cursor-pointer animate-pulse"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
                  <span>Review Submission in Queue</span>
                </button>
              )}

            {!item.assignedTechnicianName && canAssign && onOpenAssign && (
              <button
                type="button"
                id="item-detail-assign-btn"
                onClick={() => onOpenAssign(item)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 transition-colors shadow-2xs cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5" />
                <span>Assign to Technician</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Page Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Hero Section Banner */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200">
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                {item.archived && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-300">
                    [ARCHIVED INVENTORY]
                  </span>
                )}
                {item.brand && (
                  <span className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
                    {item.brand}
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {item.name}
              </h1>

              <p className="text-sm text-slate-600 max-w-3xl">
                {item.description || 'Enterprise fiber optic terminal registered in FiberX central inventory.'}
              </p>

              {/* Identifiers Cluster: Serial, SKU, MAC */}
              <div className="flex items-center gap-3 sm:gap-6 flex-wrap pt-2 text-xs">
                {/* Serial Number with Copy */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-500 font-medium">Serial:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {item.serialNumber || '[NO SERIAL TAG]'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.serialNumber, 'Serial Number')}
                    className="ml-1 text-slate-400 hover:text-teal-800 transition-colors cursor-pointer"
                    title="Copy Serial Number"
                  >
                    {copiedField === 'Serial Number' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* SKU with Copy */}
                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-500 font-medium">SKU:</span>
                  <span className="font-mono font-bold text-teal-800">{item.sku}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(item.sku, 'SKU')}
                    className="ml-1 text-slate-400 hover:text-teal-800 transition-colors cursor-pointer"
                    title="Copy SKU"
                  >
                    {copiedField === 'SKU' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                {/* MAC Address if present */}
                {item.macAddress && (
                  <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <span className="text-slate-500 font-medium">MAC:</span>
                    <span className="font-mono font-bold text-slate-800">{item.macAddress}</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(item.macAddress || '', 'MAC Address')}
                      className="ml-1 text-slate-400 hover:text-teal-800 transition-colors cursor-pointer"
                      title="Copy MAC Address"
                    >
                      {copiedField === 'MAC Address' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Dual Status Badge Cluster */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 lg:min-w-[340px] space-y-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Dual Category 1x1 System Status
              </span>
              <DualStatusBadge
                lifecycleStatus={item.lifecycleStatus}
                verificationStatus={item.verificationStatus}
                legacyStatus={item.status}
                layout="column"
                size="md"
                showCategoryHeaders={true}
              />
            </div>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Left Column (2 Cols wide on Desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Barcode Graphic & Label Preview Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                    <Barcode className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Physical Barcode Tag & Optics</h2>
                    <p className="text-xs text-slate-500">Scan-ready Code128 format encoded for handheld scanners</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center">
                <BarcodeSvg
                  value={item.serialNumber || item.sku}
                  width={340}
                  height={80}
                  barWidth={2.4}
                  fontSize={14}
                  allowZoom={true}
                />
                <div className="mt-3 flex items-center gap-3 text-xs text-slate-500">
                  <span>Standard 1D Barcode</span>
                  <span>•</span>
                  <span>Encoded: {item.serialNumber || item.sku}</span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">✓ Ready for Scanning</span>
                </div>
              </div>
            </div>

            {/* Field Custody & Assignment Status */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-800">
                    <Truck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Field Custody & Vehicle Dispatch</h2>
                    <p className="text-xs text-slate-500">Real-time technician van tracking and custody status</p>
                  </div>
                </div>

                {item.assignedTechnicianName && (
                  <span className="px-2.5 py-1 bg-cyan-50 text-cyan-800 border border-cyan-200 rounded-lg text-xs font-bold font-mono">
                    DISPATCHED
                  </span>
                )}
              </div>

              {item.assignedTechnicianName ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-sm">
                        {(item.assignedTechnicianName || 'TC').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{item.assignedTechnicianName || 'Assigned Technician'}</h3>
                        <p className="text-xs text-slate-500">
                          {assignedTechObj?.phone || 'Field Service Unit'} •{' '}
                          {assignedTechObj?.assignedVan || 'Mobile Van Stock'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-500 block">Dispatch Timestamp</span>
                      <span className="text-xs font-mono font-bold text-slate-800">
                        {item.assignedAt || 'Recorded in Logistics'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Transit Location / Van Bin:</span>
                      <strong className="font-mono text-slate-800">{item.storageBin}</strong>
                    </div>

                    {canAssign && onOpenAssign && (
                      <button
                        type="button"
                        onClick={() => onOpenAssign(item)}
                        className="text-xs font-semibold text-teal-700 hover:text-teal-900 transition-colors cursor-pointer"
                      >
                        Re-assign Technician →
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <p className="text-xs font-bold text-slate-700">Currently in Central Warehouse Stock</p>
                    <p className="text-xs text-slate-500">
                      This hardware unit has not been checked out or assigned to any technician vehicle yet.
                    </p>
                  </div>

                  {canAssign && onOpenAssign && (
                    <button
                      type="button"
                      onClick={() => onOpenAssign(item)}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-semibold text-xs transition-colors shadow-2xs cursor-pointer shrink-0"
                    >
                      + Assign to Field Technician
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Subscriber Installation & Account Verification (Gatekeeper Section 4.4) */}
            <div
              className={`rounded-xl border p-5 shadow-xs space-y-4 ${
                item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED'
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : item.status === 'AWAITING_ADMIN_VERIFICATION'
                  ? 'bg-amber-50/40 border-amber-200'
                  : item.status === 'SUSPECTED_DUPLICATE' || item.status === 'REJECTED_INVALID_TAG'
                  ? 'bg-red-50/40 border-red-200'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.status === 'AWAITING_ADMIN_VERIFICATION'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-teal-50 text-teal-800'
                    }`}
                  >
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">
                      Subscriber Installation & Verification Gatekeeper
                    </h2>
                    <p className="text-xs text-slate-500">
                      Section 4.4 Account Tagging, Optical Power & Photo Verification
                    </p>
                  </div>
                </div>

                {item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED' ? (
                  <span className="px-3 py-1 bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-2xs">
                    ✓ INSTALLED & VERIFIED
                  </span>
                ) : item.status === 'AWAITING_ADMIN_VERIFICATION' ? (
                  <span className="px-3 py-1 bg-amber-500 text-white font-bold text-xs rounded-lg shadow-2xs animate-pulse">
                    ⏳ Awaiting Admin Verification
                  </span>
                ) : item.status === 'SUSPECTED_DUPLICATE' ? (
                  <span className="px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-lg shadow-2xs">
                    ⚠ Suspected Duplicate Tag
                  </span>
                ) : item.status === 'REJECTED_INVALID_TAG' ? (
                  <span className="px-3 py-1 bg-red-100 text-red-800 font-bold text-xs rounded-lg border border-red-300">
                    ✕ Rejected - Invalid Tag
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg">
                    [Pending Installation]
                  </span>
                )}
              </div>

              {item.customerAccountNumber ? (
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Customer Account #</span>
                      <strong className="font-mono text-sm text-slate-900 block mt-0.5">
                        {item.customerAccountNumber}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Subscriber Name</span>
                      <strong className="text-sm text-slate-900 block mt-0.5">
                        {item.customerName || 'Recorded in CRM'}
                      </strong>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Optical Rx Power</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Radio className="w-3.5 h-3.5 text-teal-600" />
                        <strong className="font-mono text-sm text-teal-900">
                          {item.opticalRx || 'N/A'}
                        </strong>
                      </div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Submission Timestamp</span>
                      <span className="text-xs text-slate-800 font-medium block mt-0.5">
                        {item.submittedAt || item.installationDate || 'Recorded'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Admin Verification Time</span>
                      <span className="text-xs text-slate-800 font-medium block mt-0.5">
                        {item.verifiedAt || (item.status === 'INSTALLED_VERIFIED' ? 'Verified' : 'Pending')}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-500 block font-medium">Installer / Submitter</span>
                      <span className="text-xs text-slate-800 font-medium block mt-0.5">
                        {item.assignedTechnicianName || 'Field Technician'}
                      </span>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100">
                      <span className="text-[11px] text-slate-500 block font-medium">Customer Premise Address</span>
                      <p className="text-xs text-slate-800 mt-0.5">
                        {item.customerAddress || 'Customer premises connected and energized'}
                      </p>
                    </div>
                  </div>

                  {/* Photo Proof Display - Complete Field Photos Showcase */}
                  {allPhotos.length > 0 && currentPhoto && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                            <Camera className="w-4 h-4 text-teal-700" />
                            Technician Field Photos
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-200 flex items-center gap-1">
                            <Images className="w-3 h-3 text-teal-700" />
                            {allPhotos.length === 1 ? '1 Photo Received' : `${allPhotos.length} Photos Received`}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {allPhotos.length > 1 && (
                            <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                              {validPhotoIdx + 1} / {allPhotos.length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Main Large Photo Preview */}
                      <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center min-h-[200px] max-h-[280px]">
                        <img
                          src={currentPhoto.url}
                          alt={currentPhoto.name || `Field proof ${validPhotoIdx + 1}`}
                          className="w-full h-auto max-h-[280px] object-contain cursor-pointer transition-opacity hover:opacity-95"
                          onClick={() => setIsPhotoZoomOpen(true)}
                        />

                        {/* Top Metadata Tag */}
                        <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1.5 border border-white/10 shadow-sm">
                          <span className="font-bold text-teal-300">#{validPhotoIdx + 1}</span>
                          <span className="truncate max-w-[200px] sm:max-w-[280px]">
                            {currentPhoto.name || formatPhotoType(currentPhoto.type)}
                          </span>
                          {currentPhoto.size && <span className="text-slate-400">({currentPhoto.size})</span>}
                        </div>

                        {/* Prev / Next Controls */}
                        {allPhotos.length > 1 && (
                          <>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
                              }}
                              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md backdrop-blur-xs border border-white/20"
                              title="Previous photo"
                            >
                              <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActivePhotoIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md backdrop-blur-xs border border-white/20"
                              title="Next photo"
                            >
                              <ChevronRight className="w-5 h-5" />
                            </button>
                          </>
                        )}

                        {/* Bottom Actions */}
                        <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsPhotoZoomOpen(true)}
                            className="px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow border border-white/10"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Enlarge</span>
                          </button>
                          <a
                            href={currentPhoto.url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow border border-white/10"
                            title="Open in new browser tab"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            <span>Tab</span>
                          </a>
                        </div>
                      </div>

                      {/* Thumbnails Row */}
                      {allPhotos.length > 1 && (
                        <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                            All Attached Photos ({allPhotos.length}):
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                            {allPhotos.map((photo, index) => {
                              const isSelected = index === validPhotoIdx;
                              return (
                                <button
                                  key={photo.id || index}
                                  type="button"
                                  onClick={() => setActivePhotoIndex(index)}
                                  className={`relative group rounded-lg overflow-hidden border-2 transition-all cursor-pointer aspect-video bg-slate-900 flex flex-col ${
                                    isSelected
                                      ? 'border-teal-600 ring-2 ring-teal-500/40 shadow-xs'
                                      : 'border-slate-200 hover:border-teal-400 opacity-75 hover:opacity-100'
                                  }`}
                                >
                                  <img
                                    src={photo.url}
                                    alt={photo.name || `Photo ${index + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-0.5 text-center">
                                    <span className="text-[9px] font-bold text-white block truncate leading-tight">
                                      #{index + 1} {formatPhotoType(photo.type).split(' ')[0]}
                                    </span>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-teal-400 ring-2 ring-white" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin Rejection Reason if any */}
                  {item.adminRejectionReason && (
                    <div className="p-3.5 bg-red-100/90 border border-red-300 text-red-900 rounded-xl text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertOctagon className="w-4 h-4 text-red-700" />
                        <span>Admin Rejection Notice:</span>
                      </div>
                      <p className="pl-5 text-red-800">{item.adminRejectionReason}</p>
                    </div>
                  )}

                  {/* Admin Gatekeeper Action */}
                  {(item.status === 'AWAITING_ADMIN_VERIFICATION' || item.status === 'SUSPECTED_DUPLICATE') &&
                    currentUser.role === 'ADMIN' &&
                    onOpenVerification && (
                      <div className="pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => onOpenVerification(item)}
                          className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-2"
                        >
                          <ShieldCheck className="w-4 h-4 text-teal-300" />
                          <span>Review & Verify Submission in Admin Queue</span>
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-600">
                    Modem is registered to warehouse or field technician van. Once installed at subscriber
                    premises, technician submits the customer account tag and optical reading for review.
                  </p>
                  {item.status === 'ASSIGNED' && onOpenClosure && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onOpenClosure(item)}
                        className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
                      >
                        <FileCheck className="w-4 h-4" />
                        <span>Complete Installation Tag (Submit to Verification)</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Hardware Model & Subcategory Configurator */}
            {canArchive && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Hardware Model & Specifications</h2>
                      <p className="text-xs text-slate-500">Preset configuration and category directory mapping</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsEditingSubCategory(!isEditingSubCategory)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Edit className="w-3 h-3 text-slate-500" />
                    <span>{isEditingSubCategory ? 'Close Presets' : 'Change Model Preset'}</span>
                  </button>
                </div>

                {isEditingSubCategory ? (
                  <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl space-y-3">
                    <p className="text-xs font-semibold text-teal-950">
                      Select target equipment profile for {CATEGORY_LABELS[item.category]}:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {(
                        CATEGORY_DEFINITIONS.find((c) => c.id === item.category)?.presets || []
                      ).map((preset) => {
                        const isCurrent = item.sku === preset.sku || item.name === preset.name;
                        return (
                          <button
                            key={preset.sku}
                            type="button"
                            onClick={() => handleSelectPreset(preset)}
                            className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                              isCurrent
                                ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                                : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span
                                className={`text-[11px] font-mono font-bold ${
                                  isCurrent ? 'text-teal-100' : 'text-teal-700'
                                }`}
                              >
                                {preset.sku}
                              </span>
                              {isCurrent && (
                                <span className="text-[10px] bg-teal-800 text-teal-100 px-1.5 py-0.5 rounded font-bold">
                                  Current
                                </span>
                              )}
                            </div>
                            <p className="text-xs font-bold truncate">{preset.name}</p>
                            <p
                              className={`text-[11px] line-clamp-1 mt-0.5 ${
                                isCurrent ? 'text-teal-100/90' : 'text-slate-500'
                              }`}
                            >
                              {preset.description}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Category</span>
                      <strong className="text-slate-900 block truncate mt-0.5">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </strong>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Unit Type</span>
                      <strong className="text-slate-900 block mt-0.5">{item.unit || 'unit'}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Model Name</span>
                      <strong className="text-slate-900 block truncate mt-0.5">{item.modelName || item.name}</strong>
                    </div>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-500 block text-[10px] font-semibold uppercase">Manufacturer</span>
                      <strong className="text-slate-900 block mt-0.5">{item.brand || 'FiberX Direct'}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Sidebar Column (1 Col wide on Desktop) */}
          <div className="space-y-6">
            {/* Storage Bin & Inventory Attributes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">Warehouse Storage Location</h2>
                {canArchive && !isEditingBin && (
                  <button
                    type="button"
                    onClick={() => {
                      setBinValue(item.storageBin);
                      setIsEditingBin(true);
                    }}
                    className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
                  >
                    <Edit className="w-3 h-3" /> Edit Bin
                  </button>
                )}
              </div>

              {!isEditingBin ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[11px] text-slate-500 block font-medium">Assigned Physical Shelf / Bin</span>
                  <p className="font-mono text-base font-bold text-teal-800">{item.storageBin || 'UNASSIGNED'}</p>
                </div>
              ) : (
                <div className="p-3.5 bg-teal-50/70 border border-teal-300 rounded-xl space-y-2">
                  <label className="text-xs font-bold text-teal-950 block">Update Storage Bin:</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={binValue}
                      onChange={(e) => setBinValue(e.target.value)}
                      placeholder="e.g. BIN-A1-04"
                      className="w-full px-3 py-1.5 bg-white border border-teal-500 rounded-lg text-xs font-mono font-bold"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveBin}
                      className="px-3 py-1.5 bg-teal-700 text-white rounded-lg text-xs font-bold hover:bg-teal-800 cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditingBin(false)}
                      className="px-2 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-xs hover:bg-slate-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3 pt-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Stock Quantity</span>
                  <span className="font-bold text-slate-900">
                    {item.quantity} {item.unit || 'unit'}
                  </span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <span className="text-slate-500">Intake / Received Date</span>
                  <span className="font-bold text-slate-900">{item.receivedDate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">System Record ID</span>
                  <span className="font-mono text-slate-400 text-[11px] truncate max-w-[140px]">{item.id}</span>
                </div>
              </div>
            </div>


            {/* Archival & Administrative Actions */}
            {(canArchive || canHardDelete) && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-slate-900">Management & Record Actions</h2>

                <div className="space-y-2">
                  {canArchive && !item.archived && onArchive && (
                    <button
                      type="button"
                      onClick={() => onArchive(item.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5 text-slate-500" />
                      <span>Archive (Soft Delete - Keeps History)</span>
                    </button>
                  )}

                  {item.archived && onRestore && (
                    <button
                      type="button"
                      onClick={() => onRestore(item.id)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-teal-50 hover:bg-teal-100 border border-teal-300 text-teal-800 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>Restore to Active Inventory</span>
                    </button>
                  )}

                  {canHardDelete && !showDeleteConfirm && (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                      <span>Permanent Hard Delete (Admin)</span>
                    </button>
                  )}

                  {/* Hard Delete Confirmation dialog */}
                  {showDeleteConfirm && (
                    <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl space-y-2 text-red-900 text-xs">
                      <div className="flex items-center gap-1.5 font-bold">
                        <AlertOctagon className="w-4 h-4 text-red-600" />
                        <span>Confirm Irreversible Purge?</span>
                      </div>
                      <p className="text-red-700 text-[11px]">
                        This permanently deletes <strong className="font-mono">{item.serialNumber || item.sku}</strong> from all database tables and audit logs.
                      </p>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setShowDeleteConfirm(false)}
                          className="px-2.5 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onHardDelete) onHardDelete(item.id);
                            onBack();
                          }}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Yes, Purge Record
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Full Photo Modal Lightbox if Opened */}
      {isPhotoZoomOpen && allPhotos.length > 0 && currentPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setIsPhotoZoomOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-teal-400" />
                  Field Photo Evidence: {item.customerAccountNumber || item.serialNumber}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-900 text-teal-200 border border-teal-700">
                  {formatPhotoType(currentPhoto.type)}
                </span>
                {allPhotos.length > 1 && (
                  <span className="text-[10px] font-mono text-slate-400">
                    ({validPhotoIdx + 1} of {allPhotos.length})
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={currentPhoto.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1 border border-slate-600 transition-colors"
                  title="Open original image in new tab"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Tab</span>
                </a>
                <button
                  type="button"
                  onClick={() => setIsPhotoZoomOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Main Lightbox Image View with Prev / Next */}
            <div className="relative flex-1 p-2 overflow-hidden flex items-center justify-center min-h-[340px] max-h-[65vh]">
              <img
                src={currentPhoto.url}
                alt={currentPhoto.name || `Field proof ${validPhotoIdx + 1}`}
                className="max-h-[60vh] max-w-full object-contain rounded-lg select-none"
              />

              {allPhotos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
                    }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-teal-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg backdrop-blur-xs border border-white/20"
                    title="Previous photo"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePhotoIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 hover:bg-teal-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-lg backdrop-blur-xs border border-white/20"
                    title="Next photo"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Lightbox Footer & Thumbnail Strip */}
            <div className="pt-2 border-t border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
              <div className="flex items-center gap-2 truncate">
                <span className="font-semibold text-slate-200">{currentPhoto.name || `Photo #${validPhotoIdx + 1}`}</span>
                {currentPhoto.size && <span>• {currentPhoto.size}</span>}
                {currentPhoto.timestamp && <span>• {currentPhoto.timestamp}</span>}
              </div>

              {allPhotos.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1">
                  {allPhotos.map((photo, idx) => (
                    <button
                      key={photo.id || idx}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`w-12 h-9 rounded overflow-hidden border transition-all shrink-0 ${
                        idx === validPhotoIdx
                          ? 'border-teal-400 ring-2 ring-teal-400/40 opacity-100 scale-105'
                          : 'border-slate-700 opacity-60 hover:opacity-100'
                      }`}
                    >
                      <img src={photo.url} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
