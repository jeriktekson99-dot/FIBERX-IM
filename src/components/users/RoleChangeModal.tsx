import React from 'react';
import { UserProfile, UserRole } from '../../types';
import { X, Shield, Truck, AlertTriangle, ArrowRight, CheckCircle2, UserCheck } from 'lucide-react';

interface RoleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  targetRole: UserRole | null;
  onConfirm: (userId: string, newRole: UserRole) => void;
  adminCount: number;
}

const ROLE_RANKS: Record<UserRole, number> = {
  OPERATOR: 1,
  TECHNICIAN: 1,
  ADMIN: 2,
};

const ROLE_METADATA: Record<
  UserRole,
  {
    label: string;
    icon: React.ElementType;
    color: string;
    bg: string;
    textColor: string;
    badgeBorder: string;
    description: string;
    capabilities: string[];
  }
> = {
  ADMIN: {
    label: 'Administrator',
    icon: Shield,
    color: 'indigo',
    bg: 'bg-indigo-50',
    textColor: 'text-indigo-700',
    badgeBorder: 'border-indigo-200',
    description: 'Full organizational authority across all warehouse nodes and verification workflows.',
    capabilities: [
      'Grant, promote, and demote user roles across the platform',
      'Approve or reject installation proof and unblock suspected duplicate serials',
      'Perform batch and permanent hard deletions with audit tracking',
      'View global warehouse analytics, technician rosters, and system audit logs',
    ],
  },
  TECHNICIAN: {
    label: 'Field Technician',
    icon: Truck,
    color: 'teal',
    bg: 'bg-teal-50',
    textColor: 'text-teal-700',
    badgeBorder: 'border-teal-200',
    description: 'Field provisioning specialist focused on van inventory and subscriber installs.',
    capabilities: [
      'Restricted view scoped exclusively to assigned van stock',
      'Scan barcodes to submit subscriber installation proof and fiber closure tags',
      'Flag defective drop cables or hardware for warehouse RMA exchange',
      'Cannot assign stock to others or perform administrative deletions',
    ],
  },
  OPERATOR: {
    label: 'Inventory Operator',
    icon: UserCheck,
    color: 'sky',
    bg: 'bg-sky-50',
    textColor: 'text-sky-700',
    badgeBorder: 'border-sky-200',
    description: 'Warehouse clerk focused on receiving incoming logistics shipments and tagging bins.',
    capabilities: [
      'Receive and catalog new shipments into warehouse inventory',
      'Scan hardware barcodes to verify serial numbers and bins',
      'View assigned technician logs and dispatch tickets',
      'Assists admin team with stock intake and bin maintenance',
    ],
  },
};

export const RoleChangeModal: React.FC<RoleChangeModalProps> = ({
  isOpen,
  onClose,
  user,
  targetRole,
  onConfirm,
  adminCount,
}) => {
  if (!isOpen || !user || !targetRole || user.role === targetRole) return null;

  const currentMeta = ROLE_METADATA[user.role];
  const targetMeta = ROLE_METADATA[targetRole];

  const currentRank = ROLE_RANKS[user.role];
  const targetRank = ROLE_RANKS[targetRole];
  const isPromotion = targetRank > currentRank;

  const cleanUserName = (user.name || '')
    .replace(/\s*\((?:Admin|ADMIN|Warehouse Staff|Field Tech|OPERATOR|TECHNICIAN|Field Technician|Staff)\)/gi, '')
    .trim();

  // Block demoting the last admin
  const isLastAdminDemotion = user.role === 'ADMIN' && adminCount <= 1;

  const CurrentIcon = currentMeta.icon;
  const TargetIcon = targetMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-xs ${
                isPromotion ? 'bg-indigo-600 text-white' : 'bg-amber-600 text-white'
              }`}
            >
              {isPromotion ? <Shield className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isPromotion ? 'Promote User Role' : 'Demote User Role'}
              </h2>
              <p className="text-xs text-slate-500">
                Adjust organizational access level for {cleanUserName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          {/* Last Admin Warning Guard */}
          {isLastAdminDemotion ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-800">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-red-900">Cannot Demote the Only Administrator</h4>
                <p className="mt-1 text-xs leading-relaxed text-red-700">
                  {cleanUserName} is currently the sole Administrator in the organization. The system requires at least one active Administrator to maintain operational governance.
                </p>
                <p className="mt-2 text-xs font-semibold text-red-800">
                  Please promote another user to Administrator first before demoting this account.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* User Overview & Transition Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{cleanUserName}</h3>
                    <p className="text-slate-500 font-mono text-[11px]">{user.email} • {user.badgeId}</p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                      isPromotion
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {isPromotion ? 'Role Promotion' : 'Role Demotion'}
                  </span>
                </div>

                {/* Transition Flow Visualizer */}
                <div className="grid grid-cols-5 items-center gap-2 bg-white p-3 rounded-lg border border-slate-200">
                  {/* Current Role */}
                  <div className="col-span-2 flex flex-col items-center text-center p-2 rounded-lg bg-slate-50 border border-slate-200">
                    <CurrentIcon className={`w-5 h-5 mb-1 ${currentMeta.textColor}`} />
                    <span className="font-bold text-slate-800">{currentMeta.label}</span>
                    <span className="text-[10px] text-slate-400 font-medium">Current Role</span>
                  </div>

                  {/* Arrow */}
                  <div className="col-span-1 flex flex-col items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-slate-400" />
                  </div>

                  {/* Target Role */}
                  <div
                    className={`col-span-2 flex flex-col items-center text-center p-2 rounded-lg border ${targetMeta.bg} ${targetMeta.badgeBorder}`}
                  >
                    <TargetIcon className={`w-5 h-5 mb-1 ${targetMeta.textColor}`} />
                    <span className="font-bold text-slate-900">{targetMeta.label}</span>
                    <span className={`text-[10px] font-bold ${targetMeta.textColor}`}>New Target Role</span>
                  </div>
                </div>
              </div>

              {/* Capabilities Impact */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  <span>Scope of {targetMeta.label} Authority:</span>
                </h4>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                  {targetMeta.capabilities.map((cap, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-slate-700">
                      <span className="text-teal-600 font-bold text-xs mt-0.5">•</span>
                      <span className="leading-snug">{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              <p className="text-slate-500 text-[11px] leading-relaxed">
                This change takes effect immediately. The user will be able to sign in and immediately access features permitted by the <strong>{targetMeta.label}</strong> role.
              </p>
            </>
          )}

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
            >
              {isLastAdminDemotion ? 'Close' : 'Cancel'}
            </button>
            {!isLastAdminDemotion && (
              <button
                type="button"
                onClick={() => {
                  onConfirm(user.id, targetRole);
                  onClose();
                }}
                className={`px-4 py-2 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5 ${
                  isPromotion
                    ? 'bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800'
                    : 'bg-amber-600 hover:bg-amber-700 active:bg-amber-800'
                }`}
              >
                <span>
                  Confirm {isPromotion ? 'Promotion' : 'Demotion'} to {targetMeta.label}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
