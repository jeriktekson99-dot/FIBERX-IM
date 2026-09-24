import React, { useState, useMemo } from 'react';
import { InventoryItem, UserProfile, ProofPhoto } from '../../types';
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Camera,
  MapPin,
  User,
  Hash,
  Sparkles,
  Calendar,
  Layers,
  ZoomIn,
  Eye,
  Trash2,
  Info,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Images,
} from 'lucide-react';
import { DualStatusBadge } from '../common/DualStatusBadge';

interface AdminVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  currentUser: UserProfile;
  onApprove: (itemId: string, overrideDuplicate?: boolean) => void;
  onReject: (itemId: string, reason: string) => void;
  onHardDelete?: (itemId: string) => void;
  onAcceptReturn?: (itemId: string, destinationBin?: string) => void;
}

export const AdminVerificationModal: React.FC<AdminVerificationModalProps> = ({
  isOpen,
  onClose,
  item,
  currentUser,
  onApprove,
  onReject,
  onHardDelete,
  onAcceptReturn,
}) => {
  const [rejectReason, setRejectReason] = useState<string>('');
  const [showRejectForm, setShowRejectForm] = useState<boolean>(false);
  const [isPhotoZoomed, setIsPhotoZoomed] = useState<boolean>(false);
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);
  const [destinationBin, setDestinationBin] = useState<string>('Bin A-01');
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

    if (item.photoUrl && !seenUrls.has(item.photoUrl)) {
      seenUrls.add(item.photoUrl);
      photos.push({
        id: `proof-potobucket`,
        name: photos.length === 0 ? 'potobucket Proof' : `potobucket Photo #${photos.length + 1}`,
        url: item.photoUrl,
        type: item.photoProofType || 'INSTALLATION_PHOTO',
      });
    }

    return photos;
  }, [item]);

  const validIndex = Math.min(activePhotoIndex, Math.max(0, allPhotos.length - 1));
  const currentPhoto = allPhotos[validIndex];

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

  if (!isOpen || !item) return null;

  const isDuplicate = item.status === 'SUSPECTED_DUPLICATE' || !!item.duplicateConflictSerial;
  const isRejected = item.status === 'REJECTED_INVALID_TAG';
  const isVerified = item.status === 'INSTALLED_VERIFIED' || item.status === 'INSTALLED_CLOSED';

  const handleApprove = (override = false) => {
    onApprove(item.id, override);
    onClose();
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      alert('Please specify an Admin Rejection Reason so the field technician can correct the account tag.');
      return;
    }
    onReject(item.id, rejectReason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Admin Verification & Fraud Review
                </h2>
                <DualStatusBadge
                  lifecycleStatus={item.lifecycleStatus}
                  verificationStatus={item.verificationStatus}
                  legacyStatus={item.status}
                  layout="row"
                  size="sm"
                  showCategoryHeaders={false}
                />
              </div>
              <p className="text-xs text-slate-500">
                Main Administrator Controller — Section 4.4 Verification Gateway
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {/* Dual Category Status Card */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <DualStatusBadge
              lifecycleStatus={item.lifecycleStatus}
              verificationStatus={item.verificationStatus}
              legacyStatus={item.status}
              layout="row"
              size="md"
              showCategoryHeaders={true}
            />
          </div>

          {/* Hardware Return from Technician Banner */}
          {item.isReturnPending && (
            <div className="p-4 bg-teal-50 border-2 border-teal-500 rounded-xl space-y-2 text-teal-950">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-teal-900 flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-teal-600" />
                  Technician Hardware Return Dispatch
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-teal-200 text-teal-950 font-bold text-[10px]">
                  PENDING WAREHOUSE RESTOCK
                </span>
              </div>
              <p className="text-xs text-teal-800">
                Technician <strong>{item.assignedTechnicianName || item.submittedByTechnicianName || 'Field Tech'}</strong> dispatched this equipment back to Central Warehouse.
              </p>
              <div className="p-2.5 bg-white/90 border border-teal-200 rounded-lg text-xs space-y-1">
                <p><strong>Return Reason:</strong> {item.returnReason || 'Equipment return / RMA'}</p>
                {item.returnSubmittedAt && <p className="text-[11px] text-slate-500">Submitted: {item.returnSubmittedAt}</p>}
                {item.notes && <p className="text-[11px] text-slate-600">Notes: {item.notes}</p>}
              </div>
              <div className="pt-2 flex items-center gap-3">
                <label className="text-xs font-semibold text-teal-900">Restock to Bin:</label>
                <input
                  type="text"
                  value={destinationBin}
                  onChange={(e) => setDestinationBin(e.target.value)}
                  className="px-2.5 py-1 bg-white border border-teal-300 rounded text-xs font-mono text-slate-800"
                  placeholder="e.g. Bin A-01, Quarantine-RMA"
                />
              </div>
            </div>
          )}

          {/* Duplicate Conflict Alert Banner */}
          {isDuplicate && (
            <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl flex items-start gap-3 text-amber-950">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-amber-900 flex items-center gap-2">
                  <span>WARNING: Suspected Duplicate Account Tag</span>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-mono text-[10px]">
                    FRAUD CHECK
                  </span>
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Account Number <strong>{item.customerAccountNumber}</strong> is already associated with an active installed modem in the Converge database
                  {item.duplicateConflictSerial && (
                    <> (Conflicting Serial: <strong className="font-mono">{item.duplicateConflictSerial}</strong>)</>
                  )}.
                  As an Administrator, you may investigate and use <strong>"Override Duplicate & Approve"</strong> if authorized by Billing Operations.
                </p>
              </div>
            </div>
          )}

          {/* Rejection Alert Banner if previously rejected */}
          {isRejected && item.adminRejectionReason && (
            <div className="p-4 bg-red-50 border border-red-300 rounded-xl flex items-start gap-3 text-red-950">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-sm text-red-900">Current Rejection Reason</p>
                <p className="text-xs text-red-800 mt-1">{item.adminRejectionReason}</p>
                <p className="text-[11px] text-red-600 mt-1">
                  Rejected on {item.verifiedAt || 'recently'} by {item.verifiedByAdminName || 'Admin'}.
                </p>
              </div>
            </div>
          )}

          {/* Grid Layout: Hardware Info + Account Tag Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left: Hardware & Tech Details */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-teal-700" /> Equipment Hardware
                </span>
                <span className="text-[11px] font-mono text-teal-800 font-bold bg-teal-100 px-2 py-0.5 rounded">
                  {item.category}
                </span>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-medium">Serial / Barcode:</p>
                <p className="text-sm font-mono font-bold text-slate-900 select-all">
                  {item.serialNumber || '[Non-Barcoded Item]'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-slate-500">Model / SKU:</p>
                  <p className="font-semibold text-slate-800 font-mono">{item.sku}</p>
                  <p className="text-[11px] text-slate-600">{item.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">MAC Address:</p>
                  <p className="font-mono text-slate-700">{item.macAddress || 'N/A'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <p className="text-[10px] text-slate-500">Assigned Field Technician:</p>
                <p className="font-semibold text-slate-900 text-xs flex items-center gap-1.5 mt-0.5">
                  <User className="w-3.5 h-3.5 text-teal-700" />
                  {item.assignedTechnicianName || item.submittedByTechnicianName || 'Unassigned'}
                  <span className="text-[10px] text-slate-500 font-normal">
                    ({item.storageBin})
                  </span>
                </p>
              </div>
            </div>

            {/* Right: Submitted Account Data */}
            <div className="p-4 bg-teal-50/50 border border-teal-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between border-b border-teal-200/80 pb-2">
                <span className="font-bold text-teal-950 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-teal-700" /> Account Tag Data
                </span>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  FiberX Subscriber
                </span>
              </div>

              <div>
                <p className="text-[10px] text-teal-800 font-semibold">Submitted Customer Account #:</p>
                <p className="text-base font-mono font-black text-teal-950 tracking-wide mt-0.5">
                  {item.customerAccountNumber || '[NO ACCOUNT TAG SUBMITTED]'}
                </p>
              </div>

              <div className="space-y-1.5">
                <div>
                  <p className="text-[10px] text-slate-500">Subscriber Full Name:</p>
                  <p className="font-semibold text-slate-900 text-xs">{item.customerName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">Installation Address:</p>
                  <p className="text-slate-800 text-xs flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    {item.customerAddress || 'N/A'}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-teal-100">
                  <div>
                    <p className="text-[10px] text-slate-500">Optical Rx Reading:</p>
                    <p className="font-mono font-bold text-teal-800 text-xs">{item.opticalRx || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500">Submitted At:</p>
                    <p className="font-mono text-slate-600 text-[11px]">{item.submittedAt || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Photo Proof Review Section - Admin receives and views ALL pictures sent by technician */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-teal-700" /> Technician Field Photos
                </span>
                {allPhotos.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold border border-teal-200 flex items-center gap-1">
                    <Images className="w-3 h-3 text-teal-700" />
                    {allPhotos.length === 1 ? '1 Photo Received' : `${allPhotos.length} Photos Received`}
                  </span>
                )}
              </div>

              {currentPhoto && allPhotos.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-mono font-bold">
                    {validIndex + 1} / {allPhotos.length}
                  </span>
                </div>
              )}
            </div>

            {allPhotos.length > 0 && currentPhoto ? (
              <div className="space-y-3">
                {/* Main Large Image Viewer */}
                <div className="relative group rounded-xl overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center min-h-[220px] max-h-[300px]">
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.name || `Field proof ${validIndex + 1}`}
                    className={`w-full h-auto max-h-[300px] object-contain transition-transform duration-200 ${
                      isPhotoZoomed ? 'scale-125' : ''
                    }`}
                  />

                  {/* Photo Title & Metadata Overlay */}
                  <div className="absolute top-2 left-2 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[10px] font-medium backdrop-blur-xs flex items-center gap-1.5 border border-white/10 shadow-sm">
                    <span className="font-bold text-teal-300">#{validIndex + 1}</span>
                    <span className="truncate max-w-[200px] sm:max-w-[320px]">
                      {currentPhoto.name || formatPhotoType(currentPhoto.type)}
                    </span>
                    {currentPhoto.size && <span className="text-slate-400">({currentPhoto.size})</span>}
                  </div>

                  {/* Previous / Next Arrow Controls for Admin */}
                  {allPhotos.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePhotoIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
                        }}
                        className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-teal-600 text-white flex items-center justify-center transition-colors cursor-pointer shadow-md backdrop-blur-xs border border-white/20"
                        title="View previous photo sent by technician"
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
                        title="View next photo sent by technician"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}

                  {/* Bottom Action Controls */}
                  <div className="absolute bottom-2 right-2 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setIsPhotoZoomed(!isPhotoZoomed)}
                      className="px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow border border-white/10"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      {isPhotoZoomed ? 'Reset' : 'Zoom'}
                    </button>
                    <a
                      href={currentPhoto.url}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 bg-slate-900/85 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xs cursor-pointer shadow border border-white/10"
                      title="Open full resolution photo in new browser tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Tab
                    </a>
                  </div>
                </div>

                {/* Thumbnails Row - All photos from technician */}
                {allPhotos.length > 1 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      All Attached Photos ({allPhotos.length}) - Click to inspect:
                    </p>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {allPhotos.map((photo, index) => {
                        const isSelected = index === validIndex;
                        return (
                          <button
                            key={photo.id || index}
                            type="button"
                            onClick={() => {
                              setActivePhotoIndex(index);
                              setIsPhotoZoomed(false);
                            }}
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
            ) : (
              <div className="p-6 bg-slate-100 rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                <Camera className="w-8 h-8 mx-auto text-slate-400 mb-1" />
                <p className="font-semibold text-xs">No Photo Proof Attached</p>
                <p className="text-[11px]">Field technician submitted account number without photo attachment.</p>
              </div>
            )}

            {item.notes && (
              <div className="p-3 bg-white border border-slate-200 rounded-lg text-slate-700 text-xs">
                <strong className="text-slate-900">Technician Field Note: </strong>
                {item.notes}
              </div>
            )}
          </div>

          {/* Reject Reason Form Toggle */}
          {showRejectForm && (
            <div className="p-4 bg-red-50/90 border-2 border-red-300 rounded-xl space-y-2.5 animate-in slide-in-from-top duration-150">
              <label className="block text-xs font-bold text-red-950 uppercase tracking-wider">
                Specify Admin Rejection Reason (Required) *
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Account number does not match billing records for this cluster, or photo proof is unreadable. Please verify and re-submit."
                className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                autoFocus
              />
              <div className="flex items-center justify-between text-[11px]">
                <p className="text-red-700">
                  Modem status will revert to <span className="font-bold font-mono">[REJECTED - INVALID ACCOUNT TAG]</span> and remain in technician custody.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="px-3 py-1 text-slate-600 hover:text-slate-800 text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleReject}
                    className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Hard Delete Section (Exclusive Admin Right) */}
          {currentUser.role === 'ADMIN' && onHardDelete && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-700">Admin Maintenance:</span>
                <p className="text-[10px] text-slate-500">
                  Permanently purge record from database (Admin right only).
                </p>
              </div>
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-700 font-bold">Purge permanently?</span>
                  <button
                    type="button"
                    onClick={() => {
                      onHardDelete(item.id);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-red-700 text-white rounded text-[10px] font-bold hover:bg-red-800"
                  >
                    Yes, Hard Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[10px]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="px-2.5 py-1 text-red-700 hover:bg-red-50 rounded border border-red-200 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Hard Delete
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Reviewing as Admin: <strong className="text-slate-800">{currentUser.name}</strong>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Close
            </button>

            {/* If equipment is pending return from technician */}
            {item.isReturnPending && onAcceptReturn ? (
              <button
                type="button"
                onClick={() => {
                  onAcceptReturn(item.id, destinationBin);
                  onClose();
                }}
                className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Inspect & Accept Return ({destinationBin})
              </button>
            ) : !isVerified && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectForm(true)}
                  className="px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <XCircle className="w-4 h-4 text-red-600" />
                  Reject Account Tag
                </button>

                {isDuplicate ? (
                  <button
                    type="button"
                    onClick={() => handleApprove(true)}
                    className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Override Duplicate & Approve
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApprove(false)}
                    className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve & Verify Tag
                  </button>
                )}
              </>
            )}

            {isVerified && (
              <span className="px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1.5 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                Verified & Closed Record
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
