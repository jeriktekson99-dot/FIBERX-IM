import React, { useState, useMemo } from 'react';
import { InventoryItem, UserProfile, AuditLog, CATEGORY_LABELS, ProofPhoto } from '../../types';
import {
  X,
  Barcode,
  MapPin,
  Calendar,
  User,
  Truck,
  FileCheck,
  Archive,
  Trash2,
  ShieldCheck,
  Clock,
  Layers,
  Edit,
  Check,
  AlertOctagon,
  Bookmark,
  Camera,
  ZoomIn,
  ExternalLink,
  Images,
} from 'lucide-react';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { DualStatusBadge } from '../common/DualStatusBadge';
import { CATEGORY_DEFINITIONS, SKUHardwarePreset } from './ReceiveStockModal';

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentUser: UserProfile;
  auditLogs: AuditLog[];
  onOpenAssign: (item: InventoryItem) => void;
  onOpenClosure: (item: InventoryItem) => void;
  onOpenVerification?: (item: InventoryItem) => void;
  onArchive: (itemId: string) => void;
  onRestore: (itemId: string) => void;
  onHardDelete: (itemId: string) => void;
  onUpdateStatus: (itemId: string, status: InventoryItem['status'], notes?: string) => void;
  onUpdateItem: (itemId: string, updates: Partial<InventoryItem>) => void;
  isBookmarked?: boolean;
  onToggleBookmark?: (id: string) => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  auditLogs,
  onOpenAssign,
  onOpenClosure,
  onOpenVerification,
  onArchive,
  onRestore,
  onHardDelete,
  onUpdateStatus,
  onUpdateItem,
  isBookmarked = false,
  onToggleBookmark,
}) => {
  const [isEditingBin, setIsEditingBin] = useState<boolean>(false);
  const [binValue, setBinValue] = useState<string>('');
  const [isEditingSubCategory, setIsEditingSubCategory] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  const allPhotos: ProofPhoto[] = useMemo(() => {
    if (!item) return [];
    if (item.proofPhotos && item.proofPhotos.length > 0) {
      return item.proofPhotos;
    }
    if (item.photoProofUrls && item.photoProofUrls.length > 0) {
      return item.photoProofUrls.map((url, idx) => ({
        id: `proof-${idx}`,
        name: idx === 0 ? 'Primary Installation Proof' : `Field Proof #${idx + 1}`,
        url,
        type: (idx === 0 ? item.photoProofType : undefined) || 'INSTALLATION_PHOTO',
      }));
    }
    if (item.photoProofUrl) {
      return [
        {
          id: 'proof-single',
          name: 'Installation Photo',
          url: item.photoProofUrl,
          type: item.photoProofType || 'INSTALLATION_PHOTO',
        },
      ];
    }
    return [];
  }, [item]);

  if (!isOpen || !item) return null;

  const validPhotoIdx = Math.min(activePhotoIdx, Math.max(0, allPhotos.length - 1));
  const currentPhoto = allPhotos[validPhotoIdx];

  const itemLogs = auditLogs.filter(
    (log) =>
      log.itemId === item.id ||
      (log.itemSerial && log.itemSerial.toUpperCase() === item.serialNumber.toUpperCase())
  );

  const canHardDelete = currentUser.role === 'ADMIN';
  const canArchive = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR' || currentUser.role === 'TECHNICIAN';
  const canAssign = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR';

  const handleSaveBin = () => {
    if (binValue.trim()) {
      onUpdateItem(item.id, { storageBin: binValue.trim() });
    }
    setIsEditingBin(false);
  };

  const handleSelectPreset = (preset: SKUHardwarePreset) => {
    onUpdateItem(item.id, {
      name: preset.name,
      sku: preset.sku,
      modelName: preset.modelName,
      brand: preset.brand,
      description: preset.description,
      category: preset.category,
      unit: preset.defaultUnit,
    });
    setIsEditingSubCategory(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900 font-mono">
                  {item.serialNumber || '[Non-Barcoded Item]'}
                </h2>
                {item.archived && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    [ARCHIVED]
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">{item.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onToggleBookmark && (
              <button
                type="button"
                onClick={() => onToggleBookmark(item.id)}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                  isBookmarked
                    ? 'text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Item'}
                aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark this Item'}
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-teal-700' : ''}`} />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {/* Dual Category Status Overview Panel */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Equipment Status (Dual Category 1x1 System)
            </span>
            <DualStatusBadge
              lifecycleStatus={item.lifecycleStatus}
              verificationStatus={item.verificationStatus}
              legacyStatus={item.status}
              layout="row"
              size="md"
              showCategoryHeaders={true}
            />
          </div>
          {/* Barcode Graphic & Specs Banner */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-slate-700 w-full sm:w-auto">
              <p className="text-sm font-bold text-slate-900">{item.name}</p>
              <p className="font-mono text-xs text-teal-800 font-semibold">SKU: {item.sku}</p>
              <p className="text-slate-500">{item.description}</p>
              {item.macAddress && (
                <p className="font-mono text-slate-600">
                  MAC: <strong>{item.macAddress}</strong>
                </p>
              )}
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col items-center shrink-0 w-full sm:w-auto">
              <BarcodeSvg
                value={item.serialNumber || item.sku}
                width={250}
                height={62}
                barWidth={2.4}
                fontSize={12}
                allowZoom={true}
              />
            </div>
          </div>

          {/* Quick Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg relative">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Category / Sub-type</span>
                {canArchive && (
                  <button
                    type="button"
                    onClick={() => setIsEditingSubCategory(!isEditingSubCategory)}
                    className="text-teal-700 hover:text-teal-900 transition-colors"
                    title="Change Subcategory / Model"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
              <span className="font-bold text-slate-900 block truncate">{CATEGORY_LABELS[item.category] || item.category}</span>
              <span className="text-[11px] font-semibold text-teal-800 block truncate">{item.name}</span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] font-semibold uppercase">Quantity / Unit</span>
              <span className="font-bold text-slate-900">
                {item.quantity} {item.unit}
                {item.lengthMeters ? ` • ${item.lengthMeters}m` : ''}
              </span>
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg relative">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 block text-[10px] font-semibold uppercase">Storage Bin</span>
                {!isEditingBin && canArchive && (
                  <button
                    onClick={() => {
                      setBinValue(item.storageBin);
                      setIsEditingBin(true);
                    }}
                    className="text-teal-700 hover:text-teal-900"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                )}
              </div>
              {!isEditingBin ? (
                <span className="font-bold text-teal-800">{item.storageBin}</span>
              ) : (
                <div className="flex gap-1 mt-1">
                  <input
                    type="text"
                    value={binValue}
                    onChange={(e) => setBinValue(e.target.value)}
                    className="w-full px-1.5 py-0.5 bg-white border border-teal-500 rounded text-xs"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveBin}
                    className="p-1 bg-teal-600 text-white rounded hover:bg-teal-700"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500 block text-[10px] font-semibold uppercase">Received Date</span>
              <span className="font-bold text-slate-900">{item.receivedDate}</span>
            </div>
          </div>

          {/* Subcategory / Model Preset Quick-Switch Selector */}
          {isEditingSubCategory && (
            <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-700" />
                  Select Subcategory / Hardware Model for this Item:
                </span>
                <button
                  type="button"
                  onClick={() => setIsEditingSubCategory(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  CATEGORY_DEFINITIONS.find((c) => c.id === item.category)?.presets || []
                ).map((preset) => {
                  const isCurrent = item.sku === preset.sku || item.name === preset.name;
                  return (
                    <button
                      key={preset.sku}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-teal-700 text-white border-teal-800 shadow-2xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-teal-400 hover:bg-teal-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`text-[10px] font-mono font-bold ${isCurrent ? 'text-teal-100' : 'text-teal-700'}`}>
                          {preset.sku}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] bg-teal-800 text-teal-200 px-1.5 py-0.5 rounded font-bold">
                            Current Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-bold truncate">{preset.name}</p>
                      <p className={`text-[10px] line-clamp-1 mt-0.5 ${isCurrent ? 'text-teal-100/90' : 'text-slate-500'}`}>
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custody / Technician Assignment Panel */}
          <div className="p-3.5 bg-cyan-50/50 border border-cyan-200 rounded-xl space-y-2">
            <span className="font-bold text-cyan-950 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-cyan-700" />
              Field Custody & Assignment Status
            </span>
            {item.assignedTechnicianName ? (
              <div className="space-y-1 text-slate-700">
                <div className="flex items-center justify-between">
                  <p>
                    Assigned Technician:{' '}
                    <strong className="text-slate-900">{item.assignedTechnicianName}</strong>
                  </p>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Assigned: {item.assignedAt || 'Recorded'}
                  </span>
                </div>
                <p className="text-slate-500">Location in Transit: {item.storageBin}</p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 italic">No technician assigned. (Currently In-Stock in Warehouse).</span>
                {canAssign && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAssign(item);
                    }}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded font-semibold text-xs transition-colors cursor-pointer"
                  >
                    + Assign to Technician
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Account Closure Information & Verification (Section 4.4 Gatekeeper) */}
          <div
            className={`p-3.5 rounded-xl space-y-2 border ${
              item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED'
                ? 'bg-emerald-50/70 border-emerald-300'
                : item.status === 'AWAITING_ADMIN_VERIFICATION'
                ? 'bg-amber-50/70 border-amber-300'
                : item.status === 'SUSPECTED_DUPLICATE'
                ? 'bg-red-50/70 border-red-300'
                : item.status === 'REJECTED_INVALID_TAG'
                ? 'bg-red-50/70 border-red-300'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <FileCheck className="w-4 h-4 text-teal-700" />
                Technician Account Tag & Verification Status
              </span>
              {item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED' ? (
                <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-mono font-bold text-[10px]">
                  ✓ INSTALLED & VERIFIED: {item.customerAccountNumber}
                </span>
              ) : item.status === 'AWAITING_ADMIN_VERIFICATION' ? (
                <span className="px-2 py-0.5 rounded bg-amber-400 text-amber-950 font-bold text-[10px] animate-pulse">
                  ⏳ Awaiting Admin Verification
                </span>
              ) : item.status === 'SUSPECTED_DUPLICATE' ? (
                <span className="px-2 py-0.5 rounded bg-red-600 text-white font-bold text-[10px]">
                  ⚠ Suspected Duplicate Tag
                </span>
              ) : item.status === 'REJECTED_INVALID_TAG' ? (
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[10px]">
                  ✕ Rejected - Invalid Tag
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 font-bold text-[10px]">
                  [Pending Technician Submission]
                </span>
              )}
            </div>

            {item.customerAccountNumber ? (
              <div className="space-y-2 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Account Number</span>
                    <strong className="text-slate-900 font-mono text-xs">{item.customerAccountNumber}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Customer Name</span>
                    <strong className="text-slate-900">{item.customerName || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Optical Rx Power</span>
                    <strong className="text-slate-900 font-mono">{item.opticalRx || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Submitted Timestamp</span>
                    <strong className="text-slate-900">{item.submittedAt || item.installationDate || 'Recorded'}</strong>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block text-[10px]">Subscriber Address</span>
                    <p className="text-slate-800">{item.customerAddress || 'Customer Premises'}</p>
                  </div>
                </div>

                {/* Field photo proofs sent by technician */}
                {allPhotos.length > 0 && currentPhoto && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Camera className="w-4 h-4 text-teal-700" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                          Field Photo Proofs ({allPhotos.length})
                        </span>
                      </div>
                      {allPhotos.length > 1 && (
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                          {validPhotoIdx + 1} of {allPhotos.length}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={currentPhoto.url}
                          alt="Proof"
                          className="w-14 h-14 object-cover rounded-lg border border-slate-300 shadow-2xs shrink-0"
                        />
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold uppercase text-teal-700 block truncate">
                            {currentPhoto.type ? currentPhoto.type.replace(/_/g, ' ') : 'Field Proof'}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 block truncate">
                            {currentPhoto.name || `Photo #${validPhotoIdx + 1}`}
                          </span>
                          {currentPhoto.size && (
                            <span className="text-[10px] text-slate-400 block">{currentPhoto.size}</span>
                          )}
                        </div>
                      </div>
                      <a
                        href={currentPhoto.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shrink-0 flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>View</span>
                      </a>
                    </div>

                    {/* Thumbnail Selector if multiple photos */}
                    {allPhotos.length > 1 && (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 pt-1">
                        {allPhotos.map((p, idx) => (
                          <button
                            key={p.id || idx}
                            type="button"
                            onClick={() => setActivePhotoIdx(idx)}
                            className={`relative rounded-md overflow-hidden border-2 aspect-square cursor-pointer transition-all ${
                              idx === validPhotoIdx
                                ? 'border-teal-600 ring-1 ring-teal-500 shadow-2xs'
                                : 'border-slate-200 opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={p.url} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                            <span className="absolute bottom-0 inset-x-0 bg-black/70 text-white text-[8px] font-bold text-center">
                              #{idx + 1}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Rejection reason if any */}
                {item.adminRejectionReason && (
                  <div className="p-2 bg-red-100 text-red-900 rounded-lg text-xs">
                    <strong>Admin Rejection Note:</strong> {item.adminRejectionReason}
                  </div>
                )}

                {/* Admin Gatekeeper Action in Detail Modal */}
                {(item.status === 'AWAITING_ADMIN_VERIFICATION' || item.status === 'SUSPECTED_DUPLICATE') &&
                  currentUser.role === 'ADMIN' &&
                  onOpenVerification && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenVerification(item);
                        }}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Review & Verify Submission (Admin Queue)
                      </button>
                    </div>
                  )}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1">
                <p className="text-slate-600 text-[11px]">
                  Modem is assigned to field technician van. Technician must submit customer account tag and photo proof for Admin Verification.
                </p>
                {item.status === 'ASSIGNED' && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenClosure(item);
                    }}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded font-bold text-xs transition-colors cursor-pointer shrink-0"
                  >
                    Submit for Verification
                  </button>
                )}
              </div>
            )}
          </div>


          {/* Hard Delete Confirmation Area (Admin Only) */}
          {showDeleteConfirm && (
            <div className="p-3.5 bg-red-50 border-2 border-red-300 rounded-xl space-y-2 text-red-900">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                Confirm Irreversible Hard Delete?
              </div>
              <p className="text-xs text-red-700">
                This will completely purge record <strong className="font-mono">{item.serialNumber || item.sku}</strong> from the database. This action is reserved strictly for Main Administrators.
              </p>
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onHardDelete(item.id);
                    onClose();
                  }}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-bold shadow-xs cursor-pointer"
                >
                  Yes, Hard Delete Record
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canArchive && !item.archived && (
              <button
                type="button"
                onClick={() => {
                  onArchive(item.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Soft Delete (Preserves Historical Logs)"
              >
                <Archive className="w-3.5 h-3.5 text-slate-500" /> Archive (Soft Delete)
              </button>
            )}

            {item.archived && (
              <button
                type="button"
                onClick={() => {
                  onRestore(item.id);
                  onClose();
                }}
                className="px-3 py-1.5 bg-teal-50 border border-teal-300 hover:bg-teal-100 text-teal-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5 text-teal-600" /> Restore from Archive
              </button>
            )}

            {canHardDelete && !showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Admin Hard Delete"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-600" /> Hard Delete (Admin)
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
