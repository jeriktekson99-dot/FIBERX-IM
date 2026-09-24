import React from 'react';
import { LifecycleStatus, VerificationStatus, LIFECYCLE_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from '../../types';
import {
  PackageCheck,
  Truck,
  Building2,
  PackageX,
  Link2Off,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface DualStatusBadgeProps {
  lifecycleStatus?: LifecycleStatus | string;
  verificationStatus?: VerificationStatus | string;
  legacyStatus?: string;
  layout?: 'column' | 'row' | 'card';
  size?: 'sm' | 'md' | 'lg';
  showCategoryHeaders?: boolean;
}

export const DualStatusBadge: React.FC<DualStatusBadgeProps> = ({
  lifecycleStatus,
  verificationStatus,
  legacyStatus,
  layout = 'column',
  size = 'sm',
  showCategoryHeaders = true,
}) => {
  // Resolve effective status from dual-status fields or legacy status fallback
  let effectiveLifecycle: LifecycleStatus = 'IN_STOCK';
  if (
    lifecycleStatus === 'IN_STOCK' ||
    lifecycleStatus === 'ASSIGNED_RESERVED' ||
    lifecycleStatus === 'INSTALLED_DEPLOYED' ||
    lifecycleStatus === 'OUT_OF_STOCK_REMOVED'
  ) {
    effectiveLifecycle = lifecycleStatus;
  } else if (legacyStatus) {
    if (legacyStatus === 'IN_STOCK') effectiveLifecycle = 'IN_STOCK';
    else if (legacyStatus === 'ASSIGNED') effectiveLifecycle = 'ASSIGNED_RESERVED';
    else if (legacyStatus === 'INSTALLED_VERIFIED' || legacyStatus === 'INSTALLED_CLOSED')
      effectiveLifecycle = 'INSTALLED_DEPLOYED';
    else effectiveLifecycle = 'OUT_OF_STOCK_REMOVED';
  }

  let effectiveVerification: VerificationStatus = 'UNLINKED_READY';
  if (
    verificationStatus === 'UNLINKED_READY' ||
    verificationStatus === 'AWAITING_VERIFICATION' ||
    verificationStatus === 'VERIFIED_CONNECTED' ||
    verificationStatus === 'FLAGGED_ACTION_REQUIRED'
  ) {
    effectiveVerification = verificationStatus;
  } else if (legacyStatus) {
    if (legacyStatus === 'AWAITING_ADMIN_VERIFICATION')
      effectiveVerification = 'AWAITING_VERIFICATION';
    else if (legacyStatus === 'INSTALLED_VERIFIED' || legacyStatus === 'INSTALLED_CLOSED')
      effectiveVerification = 'VERIFIED_CONNECTED';
    else if (legacyStatus === 'SUSPECTED_DUPLICATE' || legacyStatus === 'REJECTED_INVALID_TAG')
      effectiveVerification = 'FLAGGED_ACTION_REQUIRED';
    else effectiveVerification = 'UNLINKED_READY';
  }

  // Category 1: Physical State configurations
  const getLifecycleConfig = (status: LifecycleStatus) => {
    switch (status) {
      case 'IN_STOCK':
        return {
          label: LIFECYCLE_STATUS_LABELS.IN_STOCK,
          icon: <PackageCheck className={size === 'sm' ? 'w-3 h-3 text-emerald-700' : 'w-3.5 h-3.5 text-emerald-700'} />,
          bg: 'bg-emerald-50 hover:bg-emerald-100/80',
          text: 'text-emerald-900',
          border: 'border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'ASSIGNED_RESERVED':
        return {
          label: LIFECYCLE_STATUS_LABELS.ASSIGNED_RESERVED,
          icon: <Truck className={size === 'sm' ? 'w-3 h-3 text-cyan-700' : 'w-3.5 h-3.5 text-cyan-700'} />,
          bg: 'bg-cyan-50 hover:bg-cyan-100/80',
          text: 'text-cyan-900',
          border: 'border-cyan-300',
          dot: 'bg-cyan-500',
        };
      case 'INSTALLED_DEPLOYED':
        return {
          label: LIFECYCLE_STATUS_LABELS.INSTALLED_DEPLOYED,
          icon: <Building2 className={size === 'sm' ? 'w-3 h-3 text-teal-700' : 'w-3.5 h-3.5 text-teal-700'} />,
          bg: 'bg-teal-50 hover:bg-teal-100/80',
          text: 'text-teal-900',
          border: 'border-teal-300',
          dot: 'bg-teal-600',
        };
      case 'OUT_OF_STOCK_REMOVED':
      default:
        return {
          label: LIFECYCLE_STATUS_LABELS.OUT_OF_STOCK_REMOVED,
          icon: <PackageX className={size === 'sm' ? 'w-3 h-3 text-slate-600' : 'w-3.5 h-3.5 text-slate-600'} />,
          bg: 'bg-slate-100 hover:bg-slate-200/70',
          text: 'text-slate-800',
          border: 'border-slate-300',
          dot: 'bg-slate-500',
        };
    }
  };

  // Category 2: Link / Verification Status configurations
  const getVerificationConfig = (status: VerificationStatus) => {
    switch (status) {
      case 'UNLINKED_READY':
        return {
          label: VERIFICATION_STATUS_LABELS.UNLINKED_READY,
          icon: <Link2Off className={size === 'sm' ? 'w-3 h-3 text-slate-600' : 'w-3.5 h-3.5 text-slate-600'} />,
          bg: 'bg-slate-100/80 hover:bg-slate-200/70',
          text: 'text-slate-700',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
        };
      case 'AWAITING_VERIFICATION':
        return {
          label: VERIFICATION_STATUS_LABELS.AWAITING_VERIFICATION,
          icon: <Clock className={size === 'sm' ? 'w-3 h-3 text-amber-700 animate-pulse' : 'w-3.5 h-3.5 text-amber-700 animate-pulse'} />,
          bg: 'bg-amber-50 hover:bg-amber-100/80',
          text: 'text-amber-900',
          border: 'border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'VERIFIED_CONNECTED':
        return {
          label: VERIFICATION_STATUS_LABELS.VERIFIED_CONNECTED,
          icon: <CheckCircle2 className={size === 'sm' ? 'w-3 h-3 text-emerald-700' : 'w-3.5 h-3.5 text-emerald-700'} />,
          bg: 'bg-emerald-50 hover:bg-emerald-100/80',
          text: 'text-emerald-900',
          border: 'border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'FLAGGED_ACTION_REQUIRED':
      default:
        return {
          label: VERIFICATION_STATUS_LABELS.FLAGGED_ACTION_REQUIRED,
          icon: <AlertTriangle className={size === 'sm' ? 'w-3 h-3 text-red-700' : 'w-3.5 h-3.5 text-red-700'} />,
          bg: 'bg-red-50 hover:bg-red-100/80',
          text: 'text-red-900',
          border: 'border-red-300',
          dot: 'bg-red-500',
        };
    }
  };

  const lifeConfig = getLifecycleConfig(effectiveLifecycle);
  const verifConfig = getVerificationConfig(effectiveVerification);

  if (layout === 'card') {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
        {/* Category 1 Card */}
        <div className={`p-3 rounded-xl border ${lifeConfig.border} ${lifeConfig.bg} transition-colors shadow-2xs`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              1. Physical State
            </span>
            <span className="text-slate-400 text-[10px] font-medium">Inventory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-white/80 shadow-2xs border border-slate-200/60">
              {lifeConfig.icon}
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${lifeConfig.text}`}>
                {lifeConfig.label}
              </p>
              <span className="text-[10px] text-slate-500 block">
                {lifecycleStatus === 'IN_STOCK' && 'Warehouse Shelf / Ready'}
                {lifecycleStatus === 'ASSIGNED_RESERVED' && 'In Field Tech Custody'}
                {lifecycleStatus === 'INSTALLED_DEPLOYED' && 'At Customer Site'}
                {lifecycleStatus === 'OUT_OF_STOCK_REMOVED' && 'Decommissioned / Defective'}
              </span>
            </div>
          </div>
        </div>

        {/* Category 2 Card */}
        <div className={`p-3 rounded-xl border ${verifConfig.border} ${verifConfig.bg} transition-colors shadow-2xs`}>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              2. Link & Verification
            </span>
            <span className="text-slate-400 text-[10px] font-medium">System Binding</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-white/80 shadow-2xs border border-slate-200/60">
              {verifConfig.icon}
            </div>
            <div>
              <p className={`text-xs font-bold leading-tight ${verifConfig.text}`}>
                {verifConfig.label}
              </p>
              <span className="text-[10px] text-slate-500 block">
                {verificationStatus === 'UNLINKED_READY' && 'No Subscriber Assigned'}
                {verificationStatus === 'AWAITING_VERIFICATION' && 'Admin Review Pending'}
                {verificationStatus === 'VERIFIED_CONNECTED' && 'Subscriber Bound & Live'}
                {verificationStatus === 'FLAGGED_ACTION_REQUIRED' && 'Tag Conflict / Attention Needed'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Standard column layout for DataGrid rows and compact lists
  return (
    <div
      className={`flex ${
        layout === 'row' ? 'flex-row flex-wrap items-center' : 'flex-col'
      } gap-1.5 max-w-[210px]`}
    >
      {/* 1. Inventory / Lifecycle Status (Physical State) */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold leading-normal tracking-tight shadow-2xs transition-colors ${lifeConfig.bg} ${lifeConfig.border} ${lifeConfig.text}`}
        title={`Category 1 (Physical State): ${lifeConfig.label}`}
      >
        <span className="shrink-0">{lifeConfig.icon}</span>
        {showCategoryHeaders && (
          <span className="text-[9px] font-extrabold uppercase tracking-tight text-slate-500 shrink-0">
            1.
          </span>
        )}
        <span className="truncate font-bold">{lifeConfig.label}</span>
      </div>

      {/* 2. Link / Verification Status (Account & System Binding) */}
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-semibold leading-normal tracking-tight shadow-2xs transition-colors ${verifConfig.bg} ${verifConfig.border} ${verifConfig.text}`}
        title={`Category 2 (Account & System Binding): ${verifConfig.label}`}
      >
        <span className="shrink-0">{verifConfig.icon}</span>
        {showCategoryHeaders && (
          <span className="text-[9px] font-extrabold uppercase tracking-tight text-slate-500 shrink-0">
            2.
          </span>
        )}
        <span className="truncate font-bold">{verifConfig.label}</span>
      </div>
    </div>
  );
};
