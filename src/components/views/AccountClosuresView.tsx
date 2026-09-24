import React, { useState } from 'react';
import { InventoryItem, AuditLog, UserProfile } from '../../types';
import {
  FileCheck,
  Search,
  Download,
  Calendar,
  Clock,
  User,
  MapPin,
  Barcode,
  CheckCircle,
  Sparkles,
  Layers,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Eye,
  Camera,
  CheckCircle2,
  Clock3,
  Filter,
} from 'lucide-react';
import { DualStatusBadge } from '../common/DualStatusBadge';

interface AccountClosuresViewProps {
  inventory: InventoryItem[];
  auditLogs: AuditLog[];
  currentUser: UserProfile;
  onSelectItemDetail: (item: InventoryItem) => void;
  onOpenVerificationModal?: (item: InventoryItem) => void;
  onAcceptReturn?: (itemId: string, destinationBin?: string) => void;
}

export const AccountClosuresView: React.FC<AccountClosuresViewProps> = ({
  inventory,
  auditLogs,
  currentUser,
  onSelectItemDetail,
  onOpenVerificationModal,
  onAcceptReturn,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'queue' | 'closures' | 'audit_logs'>('queue');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  // Verification Queue items: Awaiting verification, Suspected Duplicates, Rejected / Flagged, or Hardware Returns
  const queueItems = inventory.filter(
    (item) =>
      item.verificationStatus === 'AWAITING_VERIFICATION' ||
      item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
      item.status === 'AWAITING_ADMIN_VERIFICATION' ||
      item.status === 'SUSPECTED_DUPLICATE' ||
      item.status === 'REJECTED_INVALID_TAG' ||
      Boolean(item.isReturnPending)
  );

  const pendingCount = inventory.filter(
    (item) =>
      item.verificationStatus === 'AWAITING_VERIFICATION' ||
      (item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' && item.adminVerificationStatus === 'PENDING') ||
      item.status === 'AWAITING_ADMIN_VERIFICATION' ||
      item.status === 'SUSPECTED_DUPLICATE' ||
      Boolean(item.isReturnPending)
  ).length;

  const closedItems = inventory.filter(
    (item) =>
      (item.verificationStatus === 'VERIFIED_CONNECTED' ||
        item.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
        item.status === 'INSTALLED_VERIFIED' ||
        item.status === 'INSTALLED_CLOSED') &&
      Boolean(item.customerAccountNumber)
  );

  const filteredQueueItems = queueItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.customerAccountNumber?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.serialNumber.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.assignedTechnicianName?.toLowerCase().includes(q) ||
      item.submittedByTechnicianName?.toLowerCase().includes(q) ||
      item.customerAddress?.toLowerCase().includes(q)
    );
  });

  const filteredClosedItems = closedItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.customerAccountNumber?.toLowerCase().includes(q) ||
      item.customerName?.toLowerCase().includes(q) ||
      item.serialNumber.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      item.assignedTechnicianName?.toLowerCase().includes(q) ||
      item.customerAddress?.toLowerCase().includes(q)
    );
  });

  const filteredAuditLogs = auditLogs.filter((log) => {
    if (actionFilter !== 'ALL' && log.action !== actionFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.details.toLowerCase().includes(q) ||
      log.performedBy.toLowerCase().includes(q) ||
      (log.itemSerial && log.itemSerial.toLowerCase().includes(q)) ||
      (log.customerAccountNumber && log.customerAccountNumber.toLowerCase().includes(q))
    );
  });

  const handleExportClosures = () => {
    const headers = [
      'Customer_Account_No',
      'Subscriber_Name',
      'Service_Address',
      'Hardware_Serial',
      'SKU',
      'Model_Name',
      'Technician',
      'Verification_Status',
      'Verified_By',
      'Verification_Date',
    ];

    const rows = filteredClosedItems.map((item) => [
      `"${item.customerAccountNumber}"`,
      `"${item.customerName || ''}"`,
      `"${item.customerAddress || ''}"`,
      `"${item.serialNumber}"`,
      `"${item.sku}"`,
      `"${item.name}"`,
      `"${item.assignedTechnicianName || item.submittedByTechnicianName || ''}"`,
      `"${item.adminVerificationStatus || 'APPROVED'}"`,
      `"${item.verifiedByAdminName || 'Admin'}"`,
      `"${item.verifiedAt || item.installationDate || ''}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fiberx_verified_accounts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 min-w-0 h-full p-6 overflow-y-auto space-y-6 bg-slate-50/50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-600" />
            Admin Verification Queue & Account Tag Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Two-step technician verification, duplicate account fraud prevention, and binding records
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Search & Subfilters */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[280px] max-w-md flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSubTab === 'queue'
                  ? 'Search queue by Account #, Tech name, Serial...'
                  : activeSubTab === 'closures'
                  ? 'Search verified subscriber accounts...'
                  : 'Search verification audit records...'
              }
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 font-sans"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          {activeSubTab === 'audit_logs' && (
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-700"
            >
              <option value="ALL">All Audit Actions</option>
              <option value="SUBMIT_VERIFICATION">Submissions for Verification</option>
              <option value="ADMIN_APPROVE">Admin Approvals</option>
              <option value="ADMIN_REJECT">Admin Rejections</option>
              <option value="OVERRIDE_DUPLICATE">Duplicate Overrides</option>
              <option value="ASSIGN">Technician Assignments</option>
              <option value="RECEIVE">Stock Receives</option>
              <option value="HARD_DELETE">Hard Deletions</option>
            </select>
          )}
        </div>

        {/* Tab 1: Admin Verification Queue */}
        {activeSubTab === 'queue' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 min-w-[200px]">Queue Status</th>
                  <th className="px-4 py-3 min-w-[170px]">Submitted Account Tag</th>
                  <th className="px-4 py-3 min-w-[180px]">Subscriber & Address</th>
                  <th className="px-4 py-3 min-w-[140px]">Modem Serial & SKU</th>
                  <th className="px-4 py-3 min-w-[130px]">Field Technician</th>
                  <th className="px-4 py-3 w-44 min-w-[150px] whitespace-nowrap">Proof / Optical Rx</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap w-40 min-w-[140px]">Admin Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQueueItems.length > 0 ? (
                  filteredQueueItems.map((item) => {
                    const isDup = item.status === 'SUSPECTED_DUPLICATE';
                    const isRej = item.status === 'REJECTED_INVALID_TAG';
                    return (
                      <tr
                        key={item.id}
                        onClick={() =>
                          onOpenVerificationModal ? onOpenVerificationModal(item) : onSelectItemDetail(item)
                        }
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${
                          isDup ? 'bg-amber-50/40' : isRej ? 'bg-red-50/30' : ''
                        }`}
                      >
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

                        <td className="px-4 py-3 min-w-[170px]">
                          {item.isReturnPending ? (
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-black bg-teal-100 text-teal-900 uppercase tracking-wider">
                                Hardware Return
                              </span>
                              <p className="text-xs font-semibold text-slate-800 mt-0.5">
                                {item.returnReason || 'Equipment return'}
                              </p>
                              {item.returnSubmittedAt && (
                                <span className="block text-[10px] text-slate-400">
                                  {item.returnSubmittedAt}
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="font-mono font-bold text-teal-950 text-sm">
                              {item.customerAccountNumber || '[Pending Input]'}
                              {isDup && (
                                <span className="block text-[10px] font-normal text-amber-700">
                                  Duplicate conflict with active record
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="px-4 py-3 min-w-[180px]">
                          <p className="font-bold text-slate-900">
                            {item.isReturnPending
                              ? item.name
                              : item.customerName || 'Subscriber'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-xs">
                            {item.isReturnPending
                              ? `Assigned to: ${item.assignedTechnicianName || 'Field Tech'}`
                              : item.customerAddress || 'Premises'}
                          </p>
                        </td>

                        <td className="px-4 py-3 font-mono min-w-[140px]">
                          <span className="font-bold text-slate-800">{item.serialNumber}</span>
                          <span className="block text-[11px] text-teal-700">{item.sku}</span>
                        </td>

                        <td className="px-4 py-3 text-slate-700 min-w-[130px]">
                          <p className="font-semibold text-slate-900">
                            {item.submittedByTechnicianName || item.assignedTechnicianName || 'Field Tech'}
                          </p>
                          <p className="text-[10px] text-slate-500">{item.storageBin}</p>
                        </td>

                        <td className="px-4 py-3 w-44 min-w-[150px] whitespace-nowrap">
                          {item.isReturnPending ? (
                            <span className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-semibold border border-teal-200">
                              Return to Warehouse
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-nowrap">
                              {(() => {
                                const photoCount =
                                  (item.proofPhotos && item.proofPhotos.length > 0)
                                    ? item.proofPhotos.length
                                    : (item.photoProofUrls && item.photoProofUrls.length > 0)
                                    ? item.photoProofUrls.length
                                    : item.photoProofUrl
                                    ? 1
                                    : 0;

                                return photoCount > 0 ? (
                                  <span
                                    className="px-2 py-0.5 rounded bg-teal-50 text-teal-800 text-[10px] font-bold flex items-center gap-1 border border-teal-200 shrink-0"
                                    title={`${photoCount} photo(s) received from field technician`}
                                  >
                                    <Camera className="w-3 h-3 text-teal-700" />
                                    {photoCount === 1 ? '1 Photo' : `${photoCount} Photos`}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 shrink-0">No Photo</span>
                                );
                              })()}
                              {item.opticalRx && (
                                <span className="font-mono text-[10px] text-teal-800 font-bold shrink-0">
                                  {item.opticalRx}
                                </span>
                              )}
                            </div>
                          )}
                          {isRej && item.adminRejectionReason && (
                            <p className="text-[10px] text-red-700 truncate max-w-[200px] mt-0.5">
                              Note: {item.adminRejectionReason}
                            </p>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap w-40 min-w-[140px]">
                          {item.isReturnPending && onAcceptReturn ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAcceptReturn(item.id);
                                }}
                                className="px-3 py-1.5 rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer bg-teal-700 hover:bg-teal-800 text-white"
                                title="Accept return into Central Warehouse"
                              >
                                Accept Return
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onOpenVerificationModal) onOpenVerificationModal(item);
                                  else onSelectItemDetail(item);
                                }}
                                className="px-2 py-1.5 rounded-lg font-semibold text-xs border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                              >
                                Inspect
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenVerificationModal) onOpenVerificationModal(item);
                                else onSelectItemDetail(item);
                              }}
                              className="inline-flex items-center justify-center whitespace-nowrap px-4 py-2 rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer bg-teal-700 hover:bg-teal-800 text-white"
                            >
                              Review & Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                      <ShieldCheck className="w-8 h-8 text-teal-600 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-slate-700">Verification Queue is Clear</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        No technician submissions are currently pending Admin verification.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Verified Account Tags Directory */}
        {activeSubTab === 'closures' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Customer Account #</th>
                  <th className="px-4 py-3">Subscriber Full Name</th>
                  <th className="px-4 py-3">Hardware Serial (SN)</th>
                  <th className="px-4 py-3">Product SKU / Model</th>
                  <th className="px-4 py-3">Field Technician</th>
                  <th className="px-4 py-3">Field Proofs</th>
                  <th className="px-4 py-3">Verified By & Date</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap w-28">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClosedItems.length > 0 ? (
                  filteredClosedItems.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => onSelectItemDetail(item)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-bold text-emerald-800 flex items-center gap-1.5 min-w-[150px]">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{item.customerAccountNumber}</span>
                      </td>

                      <td className="px-4 py-3 font-bold text-slate-900 min-w-[170px]">
                        {item.customerName || 'Subscriber'}
                        {item.customerAddress && (
                          <span className="block font-normal text-[11px] text-slate-500 truncate max-w-xs">
                            {item.customerAddress}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 font-mono font-semibold text-slate-800 min-w-[130px]">
                        {item.serialNumber}
                      </td>

                      <td className="px-4 py-3 min-w-[140px]">
                        <span className="font-mono text-teal-800 font-semibold">{item.sku}</span>
                        <span className="block text-[11px] text-slate-500">{item.name}</span>
                      </td>

                      <td className="px-4 py-3 text-slate-700 min-w-[130px]">
                        {item.assignedTechnicianName || item.submittedByTechnicianName || 'Field Team'}
                      </td>

                      <td className="px-4 py-3 min-w-[130px] whitespace-nowrap">
                        {(() => {
                          const photoCount =
                            (item.proofPhotos && item.proofPhotos.length > 0)
                              ? item.proofPhotos.length
                              : (item.photoProofUrls && item.photoProofUrls.length > 0)
                              ? item.photoProofUrls.length
                              : item.photoProofUrl
                              ? 1
                              : 0;

                          return photoCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-bold inline-flex items-center gap-1 border border-emerald-200">
                              <Camera className="w-3 h-3 text-emerald-700" />
                              {photoCount === 1 ? '1 Photo' : `${photoCount} Photos`}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">None</span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-3 text-slate-600 min-w-[150px]">
                        <p className="font-semibold text-slate-900">
                          {item.verifiedByAdminName || 'Administrator'}
                        </p>
                        <p className="font-mono text-[10px] text-slate-400">
                          {item.verifiedAt || item.installationDate || 'Recorded'}
                        </p>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap w-28">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectItemDetail(item);
                          }}
                          className="inline-flex items-center justify-center whitespace-nowrap px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-slate-500">
                      No verified customer account tags match the query.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Verification & Server Audit Logs */}
        {activeSubTab === 'audit_logs' && (
          <div className="divide-y divide-slate-100 text-xs">
            {filteredAuditLogs.length > 0 ? (
              filteredAuditLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase mt-0.5 ${
                        log.action === 'ADMIN_APPROVE' || log.action === 'ACCOUNT_CLOSE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'ADMIN_REJECT'
                          ? 'bg-red-100 text-red-800'
                          : log.action === 'OVERRIDE_DUPLICATE'
                          ? 'bg-amber-100 text-amber-900'
                          : log.action === 'SUBMIT_VERIFICATION'
                          ? 'bg-cyan-100 text-cyan-800'
                          : log.action === 'ASSIGN'
                          ? 'bg-sky-100 text-sky-800'
                          : log.action === 'HARD_DELETE'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-800'
                      }`}
                    >
                      [{log.action}]
                    </span>
                    <div>
                      <p className="font-semibold text-slate-900">{log.details}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px]">
                        {log.itemSerial && (
                          <span className="font-mono text-teal-800 font-semibold">
                            SN: {log.itemSerial}
                          </span>
                        )}
                        {log.customerAccountNumber && (
                          <span className="font-mono text-emerald-800 font-bold">
                            Acct: {log.customerAccountNumber}
                          </span>
                        )}
                        <span className="text-slate-500">By: {log.performedBy}</span>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono text-slate-400 text-[11px] shrink-0">
                    {log.timestamp}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-500">No logs found for this filter.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
