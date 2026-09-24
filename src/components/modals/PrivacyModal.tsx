import React, { useState } from 'react';
import { UserProfile, AuditLog } from '../../types';
import {
  X,
  Lock,
  ShieldCheck,
  Download,
  KeyRound,
  Eye,
  FileText,
  CheckCircle2,
  AlertCircle,
  Database,
} from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  auditLogs: AuditLog[];
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  auditLogs,
}) => {
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  if (!isOpen) return null;

  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(auditLogs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `fiberx-audit-security-trail-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 id="privacy-modal-title" className="text-sm font-bold text-slate-900">
                Privacy, Security & Role Governance
              </h2>
              <p className="text-[11px] text-slate-500">
                Audit trail compliance, barcode listener isolation, and RBAC matrix
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Security Compliance Banner */}
          <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-teal-900">Enterprise Audit Log Active & Tamper-Resistant</p>
              <p className="text-[11px] text-teal-700 mt-0.5 leading-relaxed">
                All warehouse serial scans, van stock handoffs, and account closures are bound with immutable timestamps, user badge IDs, and RBAC security signatures.
              </p>
            </div>
          </div>

          {/* RBAC Rights for current user */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Your RBAC Permissions: ({currentUser.role})
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Receive Stock & Scan Barcodes</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Assign Stock to Technicians</span>
                <span className="font-bold text-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Allowed
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Verify Customer Installation Closures</span>
                {currentUser.role === 'ADMIN' ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Full Approval
                  </span>
                ) : (
                  <span className="font-medium text-slate-500">Submission Only</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Manage Users & System Roles</span>
                {currentUser.role === 'ADMIN' ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Admin Only
                  </span>
                ) : (
                  <span className="font-medium text-red-600">Restricted</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Permanent Record Deletion</span>
                {currentUser.role === 'ADMIN' ? (
                  <span className="font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Authorized
                  </span>
                ) : (
                  <span className="font-medium text-red-600">Restricted</span>
                )}
              </div>
            </div>
          </div>

          {/* Scanner Privacy */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Data & Device Privacy:
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-xs text-slate-600">
              <p className="flex items-center gap-2">
                <KeyRound className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Client-Side Hardware Keystroke Listening — No OS clipboard tracking</span>
              </p>
              <p className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>Isolated Local Warehouse State — Zero third-party tracker telemetry</span>
              </p>
            </div>
          </div>

          {/* Audit Log Download */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-slate-900">Security Audit Trail Export</p>
              <p className="text-[11px] text-slate-500">
                {auditLogs.length} events logged in this session
              </p>
            </div>

            <button
              type="button"
              onClick={handleExportAuditLogs}
              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{downloadSuccess ? 'Downloaded!' : 'Export JSON'}</span>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
