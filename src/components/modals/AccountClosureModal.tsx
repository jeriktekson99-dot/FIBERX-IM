import React, { useState, useRef } from 'react';
import { InventoryItem, UserProfile, ProofPhoto } from '../../types';
import {
  X,
  Send,
  ShieldAlert,
  FileCheck,
  MapPin,
  User,
  Hash,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
  AlertTriangle,
  Info,
  Trash2,
  Plus,
  Images,
} from 'lucide-react';
import { DualStatusBadge } from '../common/DualStatusBadge';

interface AccountClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  existingInventory?: InventoryItem[];
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
  currentUser: UserProfile;
}

const SAMPLE_PHOTO_PRESETS = [
  {
    id: 'INSTALLATION_PHOTO',
    label: 'ONT Installed on Wall (Active Green PON)',
    url: 'https://images.unsplash.com/photo-1544197150-b99a580bb7a8?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'BARCODE_TAG',
    label: 'Modem Serial & MAC Tag Photo',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'NAP_PORT',
    label: 'NAP Box Connection & Drop Splice',
    url: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'ONT_STATUS',
    label: 'Wi-Fi 6 Router LED Status Test',
    url: 'https://images.unsplash.com/photo-1587560699334-cc4ff634909a?auto=format&fit=crop&w=400&q=80',
  },
];

export const AccountClosureModal: React.FC<AccountClosureModalProps> = ({
  isOpen,
  onClose,
  item,
  existingInventory = [],
  onSubmitVerification,
  currentUser,
}) => {
  const [accountNumber, setAccountNumber] = useState<string>(item?.customerAccountNumber || '');
  const [customerName, setCustomerName] = useState<string>(item?.customerName || '');
  const [customerAddress, setCustomerAddress] = useState<string>(item?.customerAddress || '');
  const [opticalRx, setOpticalRx] = useState<string>(item?.opticalRx || '-18.5 dBm');
  const [notes, setNotes] = useState<string>(item?.notes || '');
  const [photoType, setPhotoType] = useState<'INSTALLATION_PHOTO' | 'BARCODE_TAG' | 'NAP_PORT' | 'ONT_STATUS'>(
    item?.photoProofType || 'INSTALLATION_PHOTO'
  );
  const [photos, setPhotos] = useState<ProofPhoto[]>(() => {
    if (item?.proofPhotos && item.proofPhotos.length > 0) {
      return item.proofPhotos;
    }
    if (item?.photoProofUrls && item.photoProofUrls.length > 0) {
      return item.photoProofUrls.map((url, idx) => ({
        id: `proof-${idx}`,
        name: idx === 0 ? 'Primary Installation Proof' : `Field Proof #${idx + 1}`,
        url,
        type: (idx === 0 ? item.photoProofType : undefined) || 'INSTALLATION_PHOTO',
      }));
    }
    if (item?.photoProofUrl) {
      return [
        {
          id: 'proof-0',
          name: 'Installation Photo Proof',
          url: item.photoProofUrl,
          type: item.photoProofType || 'INSTALLATION_PHOTO',
        },
      ];
    }
    return [
      {
        id: 'preset-0',
        name: 'ONT Wall Mount Installation',
        url: SAMPLE_PHOTO_PRESETS[0].url,
        type: 'INSTALLATION_PHOTO',
      },
    ];
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !item) return null;

  const cleanAcct = accountNumber.trim().toUpperCase();
  const formattedAcct = cleanAcct.startsWith('FX-') ? cleanAcct : cleanAcct ? `FX-${cleanAcct}` : '';

  // Duplicate Check against other active items (not this item itself)
  const duplicateConflict = formattedAcct
    ? existingInventory.find(
        (other) =>
          other.id !== item.id &&
          other.customerAccountNumber &&
          other.customerAccountNumber.toUpperCase() === formattedAcct.toUpperCase() &&
          (other.status === 'INSTALLED_VERIFIED' ||
            other.status === 'INSTALLED_CLOSED' ||
            other.status === 'AWAITING_ADMIN_VERIFICATION')
      )
    : undefined;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file, idx) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
          const newPhoto: ProofPhoto = {
            id: `upload-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
            name: file.name || `Field Photo ${photos.length + idx + 1}`,
            url: reader.result,
            size: `${fileSizeMB} MB`,
            timestamp: 'Just now',
            type: photoType,
          };
          setPhotos((prev) => [...prev, newPhoto]);
        }
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAddPreset = (preset: typeof SAMPLE_PHOTO_PRESETS[0]) => {
    const alreadyExists = photos.some((p) => p.url === preset.url);
    if (alreadyExists) return;

    const newPhoto: ProofPhoto = {
      id: `preset-${Date.now()}-${preset.id}`,
      name: preset.label,
      url: preset.url,
      type: preset.id as any,
      timestamp: 'Sample preset',
    };
    setPhotos((prev) => [...prev, newPhoto]);
  };

  const handleRemovePhoto = (photoId: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Mandatory customer account number check
    if (!formattedAcct) {
      setValidationError('Customer Account Number tag is mandatory to submit modem for verification.');
      return;
    }

    if (cleanAcct.length < 4) {
      setValidationError('Customer Account Number must be at least 4 digits (e.g. FX-88920194).');
      return;
    }

    if (!customerName.trim()) {
      setValidationError('Customer / Subscriber Name is required.');
      return;
    }

    const photosToSubmit =
      photos.length > 0
        ? photos
        : [
            {
              id: `fallback-${Date.now()}`,
              name: 'ONT Wall Mount Installation',
              url: SAMPLE_PHOTO_PRESETS[0].url,
              type: photoType,
            },
          ];

    onSubmitVerification(item.id, {
      customerAccountNumber: formattedAcct,
      customerName: customerName.trim(),
      customerAddress: customerAddress.trim() || 'Customer Premises',
      opticalRx: opticalRx.trim() || undefined,
      notes: notes.trim() || undefined,
      photoProofUrl: photosToSubmit[0].url,
      photoProofType: (photosToSubmit[0].type as any) || photoType,
      photoProofUrls: photosToSubmit.map((p) => p.url),
      proofPhotos: photosToSubmit,
      isDuplicateDetected: !!duplicateConflict,
      duplicateConflictSerial: duplicateConflict?.serialNumber,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Technician Account Tag Submission
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
                  Section 4.4 Workflow
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Submit modem/ONT installation proof and customer account tag for Admin Verification Queue
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800 text-xs">
          {/* Info Banner */}
          <div className="p-3 bg-cyan-50/80 border border-cyan-200 rounded-xl flex items-start gap-2.5 text-cyan-900 text-xs">
            <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Fraud Prevention & Two-Step Verification</p>
              <p className="text-[11px] text-cyan-800 mt-0.5">
                Submissions do <strong>not</strong> automatically mark the modem as closed or installed. It moves to{' '}
                <span className="font-bold font-mono text-cyan-950">[AWAITING ADMIN VERIFICATION]</span> until verified by an Administrator.
              </p>
            </div>
          </div>

          {validationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-bold text-red-900">Validation Error</p>
                <p className="text-red-700">{validationError}</p>
              </div>
            </div>
          )}

          {/* Item Being Submitted */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
              Modem / Equipment Under Custody:
            </span>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {item.serialNumber || '[Non-Barcoded Asset]'}
                </p>
                <p className="text-xs text-slate-600">
                  <span className="font-semibold text-teal-700">{item.sku}</span> • {item.name}
                </p>
              </div>
              <DualStatusBadge
                lifecycleStatus={item.lifecycleStatus}
                verificationStatus={item.verificationStatus}
                legacyStatus={item.status}
                layout="column"
                size="sm"
                showCategoryHeaders={false}
              />
            </div>
            {item.assignedTechnicianName && (
              <p className="text-[11px] text-slate-500 mt-1.5 pt-1.5 border-t border-slate-200">
                Assigned Van: <strong>{item.assignedTechnicianName}</strong> ({item.storageBin})
              </p>
            )}
          </div>

          {/* Account Number Tag Field - MANDATORY */}
          <div className="p-4 bg-teal-50/60 border-2 border-teal-200 rounded-xl space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-teal-950 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-teal-700" />
                  Customer Account Number (Mandatory) *
                </span>
                <span className="text-[10px] text-teal-800 font-bold bg-teal-200/80 px-2 py-0.5 rounded">
                  REQUIRED TAG
                </span>
              </label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="e.g. FX-88920194 or 88920194"
                className="w-full px-3.5 py-2.5 bg-white border-2 border-teal-500 rounded-xl text-base font-mono font-bold text-teal-950 tracking-wide focus:outline-none focus:ring-2 focus:ring-teal-600"
                required
                autoFocus
              />
            </div>

            {/* Real-Time Duplicate Account Detection Warning */}
            {duplicateConflict && (
              <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start gap-2.5 text-amber-900">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-xs flex items-center gap-1.5">
                    <span>SUSPECTED DUPLICATE ACCOUNT TAG DETECTED</span>
                    <span className="px-1.5 py-0.2 bg-amber-200 text-amber-900 rounded text-[10px] font-mono">
                      Rule Violation
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Account tag <strong>{formattedAcct}</strong> is already linked to active modem SN:{' '}
                    <strong className="font-mono">{duplicateConflict.serialNumber}</strong> ({duplicateConflict.customerName}).
                    Submitting this will flag it as <span className="font-bold text-red-700">[SUSPECTED DUPLICATE / INVALID TAG]</span> for Admin review.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-500" /> Subscriber Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Maria Cristina Cruz"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-slate-500" /> Optical Rx Power Level (dBm)
                </label>
                <input
                  type="text"
                  value={opticalRx}
                  onChange={(e) => setOpticalRx(e.target.value)}
                  placeholder="e.g. -18.4 dBm (Pass: -15 to -22 dBm)"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" /> Subscriber Premises Address
              </label>
              <input
                type="text"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="e.g. Unit 1204 Tower B, Emerald Mansion, Ortigas Center"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Photo Proof of Installation or Barcode Tag */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-teal-700" />
                Installation & Hardware Photo Evidence
              </label>
              <span className="text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1">
                <Images className="w-3 h-3 text-teal-700" />
                {photos.length === 1 ? '1 Photo Attached' : `${photos.length} Photos Attached`}
              </span>
            </div>

            {/* Quick-add presets */}
            <div>
              <p className="text-[11px] font-semibold text-slate-600 mb-1.5 flex items-center justify-between">
                <span>Quick-Add Sample Presets:</span>
                <span className="text-[10px] text-slate-400">Click to add preset photo</span>
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SAMPLE_PHOTO_PRESETS.map((preset) => {
                  const isAdded = photos.some((p) => p.url === preset.url);
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleAddPreset(preset)}
                      className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold transition-all border text-left flex items-center justify-between gap-1 cursor-pointer ${
                        isAdded
                          ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="truncate">{preset.label.split(' ')[0]} {preset.label.split(' ')[1]}</span>
                      {isAdded ? (
                        <span className="text-[10px] text-teal-700 font-bold shrink-0">✓ Added</span>
                      ) : (
                        <Plus className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Attached Photos Gallery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700">
                  Photos Received by Admin Queue ({photos.length}):
                </span>
                <div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Upload className="w-3 h-3" />
                    <span>+ Upload Photo(s)</span>
                  </button>
                </div>
              </div>

              {photos.length === 0 ? (
                <div className="p-4 bg-white border border-dashed border-slate-300 rounded-xl text-center">
                  <p className="text-xs text-slate-500">No photos attached yet.</p>
                  <button
                    type="button"
                    onClick={() => handleAddPreset(SAMPLE_PHOTO_PRESETS[0])}
                    className="mt-1.5 text-xs text-teal-700 font-bold hover:underline cursor-pointer"
                  >
                    Add Default ONT Wall Mount Photo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {photos.map((photo, index) => (
                    <div
                      key={photo.id || index}
                      className="flex items-center gap-2.5 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs"
                    >
                      <img
                        src={photo.url}
                        alt={photo.name}
                        className="w-12 h-12 rounded-lg object-cover border border-slate-300 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono font-bold text-teal-800 bg-teal-50 px-1 py-0.2 rounded border border-teal-200">
                            #{index + 1}
                          </span>
                          <span className="text-[11px] font-bold text-slate-900 truncate block">
                            {photo.name || `Photo Proof ${index + 1}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] text-slate-500 uppercase font-semibold">
                            {photo.type ? photo.type.replace(/_/g, ' ') : 'Installation'}
                          </span>
                          {photo.size && <span className="text-[10px] text-slate-400">• {photo.size}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Field Installation Notes & Subscriber Verification Note
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. NAP Port #4 connection tested. Optical Rx verified within -18dBm spec."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Submitter Credentials */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Field Submitter: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.badgeId})
            </span>
            <span className="text-teal-700 font-semibold">Routes to Admin Queue</span>
          </div>

          {/* Footer */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
              Submit for Verification
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
