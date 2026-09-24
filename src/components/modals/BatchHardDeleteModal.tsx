import React from 'react';
import { InventoryItem, UserProfile } from '../../types';
import { AlertOctagon, Trash2, X, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface BatchHardDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  currentUser: UserProfile;
  onConfirmDelete: (itemIds: string[]) => void;
  onSwitchToAdmin?: () => void;
}

export const BatchHardDeleteModal: React.FC<BatchHardDeleteModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  onConfirmDelete,
  onSwitchToAdmin,
}) => {
  if (!isOpen || items.length === 0) return null;

  const isAdmin = currentUser.role === 'ADMIN';

  const handleDelete = () => {
    if (!isAdmin && onSwitchToAdmin) {
      onSwitchToAdmin();
    }
    onConfirmDelete(items.map((i) => i.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-red-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-red-950 text-white flex items-center justify-between border-b border-red-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-400/40 flex items-center justify-center text-red-300">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Permanently Hard Delete ({items.length}) Records?
              </h2>
              <p className="text-xs text-red-300">
                Exclusive Administrator Operation • Irreversible Database Purge
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-red-400 hover:text-white rounded-lg hover:bg-red-900/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-red-900">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>Permanent Database Wipe Warning</span>
            </div>
            <p className="text-xs text-red-800 leading-relaxed">
              You are about to permanently purge <strong className="font-bold text-red-950">{items.length} equipment record(s)</strong> from the central FiberX warehouse database. This action is <strong>completely irreversible</strong> and will wipe all serial tags, customer linkages, and transaction audit trails for these items.
            </p>
          </div>

          {/* User Role Status */}
          {!isAdmin ? (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>Active Persona:</span>
                <span className="font-mono bg-amber-200/70 px-2 py-0.5 rounded text-[11px]">
                  {currentUser.name} ({currentUser.role})
                </span>
              </p>
              <p className="text-[11px] text-amber-800">
                Hard delete is restricted to Main Administrators. Clicking confirm below will automatically switch you to the Administrator persona to authorize this database purge.
              </p>
            </div>
          ) : (
            <div className="px-3.5 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Authorized as <strong>{currentUser.name}</strong> (Administrator Privilege Verified)
              </span>
            </div>
          )}

          {/* List of Items to be deleted */}
          <div>
            <span className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              Selected Equipment to be Purged ({items.length})
            </span>
            <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50 text-xs">
              {items.map((item, idx) => (
                <div key={item.id} className="p-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <div>
                      <span className="font-mono font-bold text-slate-900">
                        {item.serialNumber || item.sku}
                      </span>
                      <p className="text-[11px] text-slate-500 line-clamp-1">{item.name}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {item.storageBin}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Cancel & Keep Records
          </button>

          <button
            type="button"
            onClick={handleDelete}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-lg shadow-sm flex items-center gap-2 transition-all cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {isAdmin
                ? `Yes, Permanently Hard Delete (${items.length}) Records`
                : `Authorize as Admin & Hard Delete (${items.length})`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
