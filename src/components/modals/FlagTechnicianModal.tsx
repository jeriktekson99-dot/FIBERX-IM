import React, { useState, useEffect } from 'react';
import { Technician, UserProfile } from '../../types';
import { X, AlertTriangle, ShieldCheck, Flag, ShieldAlert } from 'lucide-react';

export interface FlagTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician | null;
  currentUser: UserProfile;
  onToggleFlag: (technicianId: string, isFlagged: boolean, reason?: string) => void;
}

const COMMON_REASONS = [
  'Audit Hold: 3 unreturned hardware units & pending monthly physical count reconciliation.',
  'Unverified Stock: High ratio of pending account tags without optical Rx verification.',
  'Van Stock Discrepancy: Serial number mismatch during transit handover inspection.',
  'Administrative Hold: Technician clearance under supervisor review.',
];

export const FlagTechnicianModal: React.FC<FlagTechnicianModalProps> = ({
  isOpen,
  onClose,
  technician,
  currentUser,
  onToggleFlag,
}) => {
  const [flagReason, setFlagReason] = useState('');
  const [actionType, setActionType] = useState<'FLAG' | 'UNFLAG'>('FLAG');

  useEffect(() => {
    if (technician) {
      if (technician.isFlagged) {
        setActionType('UNFLAG');
        setFlagReason(technician.flagReason || '');
      } else {
        setActionType('FLAG');
        setFlagReason(COMMON_REASONS[0]);
      }
    }
  }, [technician]);

  if (!isOpen || !technician) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType === 'FLAG') {
      onToggleFlag(technician.id, true, flagReason.trim() || 'Administrative flag applied by warehouse staff.');
    } else {
      onToggleFlag(technician.id, false, undefined);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div
          className={`px-6 py-4 flex items-center justify-between text-white ${
            actionType === 'FLAG' ? 'bg-amber-800' : 'bg-teal-900'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center">
              {actionType === 'FLAG' ? (
                <ShieldAlert className="w-5 h-5 text-amber-200" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-teal-200" />
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold">
                {actionType === 'FLAG' ? 'Flag Technician for Review' : 'Remove Technician Flag'}
              </h2>
              <p className="text-xs text-white/80">
                {technician.name} ({technician.employeeId}) • {technician.assignedVan}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Status Alert Banner */}
          {technician.isFlagged ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900">
                <p className="font-bold">Technician Currently Flagged</p>
                <p className="mt-0.5 text-amber-800">{technician.flagReason}</p>
                {technician.flaggedAt && (
                  <p className="text-[10px] text-amber-700 mt-1">
                    Flagged by {technician.flaggedBy || 'Admin'} on {technician.flaggedAt}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
              <p className="font-bold text-slate-900">Flagging Restricts Equipment Assignment</p>
              <p className="mt-0.5">
                Flagging a technician flags their account in the system and requires an explicit Admin/Supervisor Override to dispatch further equipment.
              </p>
            </div>
          )}

          {/* Toggle Action Switch */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActionType('FLAG')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                actionType === 'FLAG'
                  ? 'bg-amber-100 border-amber-400 text-amber-950'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Flag className="w-3.5 h-3.5 text-amber-700" />
              <span>{technician.isFlagged ? 'Update Flag Reason' : 'Apply Flag'}</span>
            </button>

            {technician.isFlagged && (
              <button
                type="button"
                onClick={() => setActionType('UNFLAG')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  actionType === 'UNFLAG'
                    ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
                <span>Remove Flag / Clear Account</span>
              </button>
            )}
          </div>

          {actionType === 'FLAG' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Reason for Flagging <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="Enter the justification for restricting this technician's assignments..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div>
                <span className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Or select a standard operational issue:
                </span>
                <div className="space-y-1">
                  {COMMON_REASONS.map((reason, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setFlagReason(reason)}
                      className="w-full text-left text-[11px] p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900">
              <p className="font-bold">Confirm Flag Removal</p>
              <p className="mt-0.5">
                Clearing this flag restores standard assignment authorization for {technician.name}. No admin override will be required for subsequent dispatches.
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs transition-all cursor-pointer ${
                actionType === 'FLAG'
                  ? 'bg-amber-800 hover:bg-amber-900 active:bg-amber-950'
                  : 'bg-emerald-700 hover:bg-emerald-800 active:bg-emerald-900'
              }`}
            >
              {actionType === 'FLAG' ? 'Confirm Flag Status' : 'Clear Flag & Restore Account'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
