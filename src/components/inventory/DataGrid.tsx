import React, { useState } from 'react';
import {
  InventoryItem,
  UserProfile,
  Technician,
  FilterState,
  CATEGORY_LABELS,
  LIFECYCLE_STATUS_LABELS,
  VERIFICATION_STATUS_LABELS,
  HARDWARE_CATEGORY_CATALOG,
  ItemCategory,
} from '../../types';
import { matchItemSubCategory, detectItemSubCategory } from '../../utils/categoryMatching';
import {
  Barcode,
  Search,
  CheckCircle,
  Truck,
  FileCheck,
  Archive,
  Trash2,
  MoreHorizontal,
  Copy,
  Check,
  SlidersHorizontal,
  Download,
  Layers,
  Eye,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Plus,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { DualStatusBadge } from '../common/DualStatusBadge';
import { BatchHardDeleteModal } from '../modals/BatchHardDeleteModal';

interface DataGridProps {
  items: InventoryItem[];
  technicians: Technician[];
  currentUser: UserProfile;
  filterState: FilterState;
  onUpdateFilter: (updates: Partial<FilterState>) => void;
  onSelectItemDetail: (item: InventoryItem) => void;
  onOpenAssign: (items: InventoryItem[]) => void;
  onOpenClosure: (item: InventoryItem) => void;
  onOpenVerification?: (item: InventoryItem) => void;
  onArchive: (itemId: string) => void;
  onRestore: (itemId: string) => void;
  onHardDelete: (itemId: string) => void;
  onBatchArchive: (itemIds: string[]) => void;
  onBatchHardDelete: (itemIds: string[]) => void;
  onBatchRestore?: (itemIds: string[]) => void;
  onSwitchToAdmin?: () => void;
  onOpenReceive?: () => void;
  onOpenScannerHub?: () => void;
}

export const DataGrid: React.FC<DataGridProps> = ({
  items,
  technicians,
  currentUser,
  filterState,
  onUpdateFilter,
  onSelectItemDetail,
  onOpenAssign,
  onOpenClosure,
  onOpenVerification,
  onArchive,
  onRestore,
  onHardDelete,
  onBatchArchive,
  onBatchHardDelete,
  onBatchRestore,
  onSwitchToAdmin,
  onOpenReceive,
  onOpenScannerHub,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [copiedSerial, setCopiedSerial] = useState<string | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState<boolean>(false);
  const [archiveTargetItem, setArchiveTargetItem] = useState<InventoryItem | null>(null);
  const [restoreTargetItem, setRestoreTargetItem] = useState<InventoryItem | null>(null);
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryItem | null>(null);

  const canHardDelete = currentUser.role === 'ADMIN';
  const canArchive = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR';
  const canAssign = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR';

  // Apply filters
  const filteredItems = items.filter((item) => {
    // Archived filter
    if (filterState.viewMode === 'archived' && !item.archived) return false;
    if (filterState.viewMode === 'active' && item.archived) return false;

    // Field tech personal view filter
    if (currentUser.role === 'TECHNICIAN' && currentUser.technicianId) {
      if (item.assignedTechnicianId !== currentUser.technicianId) return false;
    }

    // Category filter
    if (filterState.category && filterState.category !== 'ALL' && item.category !== filterState.category) {
      return false;
    }

    // Subcategory filter for active category
    if (
      filterState.subCategory &&
      filterState.subCategory !== 'ALL' &&
      !matchItemSubCategory(item, filterState.subCategory)
    ) {
      return false;
    }

    // Category 1: Physical Lifecycle Status filter
    if (
      filterState.lifecycleStatus &&
      filterState.lifecycleStatus !== 'ALL' &&
      item.lifecycleStatus !== filterState.lifecycleStatus
    ) {
      return false;
    }

    // Category 2: Link / Verification Status filter
    if (
      filterState.verificationStatus &&
      filterState.verificationStatus !== 'ALL' &&
      item.verificationStatus !== filterState.verificationStatus
    ) {
      return false;
    }

    // Legacy status filter
    if (filterState.status && filterState.status !== 'ALL' && item.status !== filterState.status) {
      return false;
    }

    // Technician filter
    if (filterState.technicianId && filterState.technicianId !== 'ALL' && item.assignedTechnicianId !== filterState.technicianId) {
      return false;
    }

    // Unclosed filter
    if (
      filterState.onlyUnclosed &&
      (item.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
        item.verificationStatus === 'VERIFIED_CONNECTED' ||
        item.customerAccountNumber)
    ) {
      return false;
    }

    // Search query filter (matches serial, SKU, name, customer acct, bin, MAC, and status labels)
    if (filterState.search.trim()) {
      const q = filterState.search.trim().toLowerCase();
      const lifeLabel = LIFECYCLE_STATUS_LABELS[item.lifecycleStatus] || '';
      const verifLabel = VERIFICATION_STATUS_LABELS[item.verificationStatus] || '';
      const match =
        (item.serialNumber || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.name || '').toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q) ||
        (item.storageBin || '').toLowerCase().includes(q) ||
        lifeLabel.toLowerCase().includes(q) ||
        verifLabel.toLowerCase().includes(q) ||
        (item.customerAccountNumber && item.customerAccountNumber.toLowerCase().includes(q)) ||
        (item.assignedTechnicianName && item.assignedTechnicianName.toLowerCase().includes(q)) ||
        (item.macAddress && item.macAddress.toLowerCase().includes(q)) ||
        (CATEGORY_LABELS[item.category] && CATEGORY_LABELS[item.category].toLowerCase().includes(q));
      if (!match) return false;
    }

    return true;
  });

  const isAllSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedItemIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      const next = new Set<string>();
      filteredItems.forEach((i) => next.add(i.id));
      setSelectedItemIds(next);
    }
  };

  const handleToggleRowSelect = (id: string) => {
    const next = new Set(selectedItemIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedItemIds(next);
  };

  const handleCopySerial = (serial: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(serial);
    setCopiedSerial(serial);
    setTimeout(() => setCopiedSerial(null), 1500);
  };

  const handleExportCSV = () => {
    const headers = [
      'Serial_Number',
      'SKU',
      'Name',
      'Category',
      'Physical_Lifecycle_Status',
      'Link_Verification_Status',
      'Legacy_Status',
      'Storage_Bin',
      'Assigned_Technician',
      'Customer_Account_No',
      'MAC_Address',
      'Quantity',
      'Unit',
      'Received_Date',
    ];

    const rows = filteredItems.map((item) => [
      `"${item.serialNumber}"`,
      `"${item.sku}"`,
      `"${item.name.replace(/"/g, '""')}"`,
      `"${item.category}"`,
      `"${LIFECYCLE_STATUS_LABELS[item.lifecycleStatus] || item.lifecycleStatus}"`,
      `"${VERIFICATION_STATUS_LABELS[item.verificationStatus] || item.verificationStatus}"`,
      `"${item.status || ''}"`,
      `"${item.storageBin}"`,
      `"${item.assignedTechnicianName || ''}"`,
      `"${item.customerAccountNumber || ''}"`,
      `"${item.macAddress || ''}"`,
      item.quantity,
      `"${item.unit}"`,
      `"${item.receivedDate}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `fiberx_inventory_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedItemsList = items.filter((i) => selectedItemIds.has(i.id));

  const activeCategoryCatalog = HARDWARE_CATEGORY_CATALOG.find(
    (c) => c.id === filterState.category
  );

  const visibleSubItems = activeCategoryCatalog
    ? activeCategoryCatalog.subItems
        .map((subItemName) => {
          const count = items.filter(
            (i) =>
              !i.archived &&
              i.category === activeCategoryCatalog.id &&
              matchItemSubCategory(i, subItemName)
          ).length;
          return { name: subItemName, count };
        })
        .filter((sub) => sub.count > 0)
    : [];

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-white overflow-hidden">
      {/* Top Filter & Toolbar Bar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative min-w-[240px] max-w-md w-full">
          <input
            type="text"
            value={filterState.search}
            onChange={(e) => onUpdateFilter({ search: e.target.value })}
            placeholder="Search serials, SKUs, bins, statuses..."
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-sans"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            title="Export filtered records to CSV"
          >
            <Download className="w-3.5 h-3.5 text-teal-700" />
            <span>Export CSV</span>
          </button>

          {canAssign && (
            <button
              id="toolbar-assign-tech-button"
              onClick={() => onOpenAssign(selectedItemsList)}
              className="px-3 py-1.5 bg-white hover:bg-teal-50 border border-teal-300 text-teal-800 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Assign stock inventory to a technician"
            >
              <UserCheck className="w-3.5 h-3.5 text-teal-700" />
              <span>Assign to Tech</span>
            </button>
          )}

          {currentUser.role !== 'TECHNICIAN' && onOpenReceive && (
            <button
              onClick={onOpenReceive}
              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              title="Scan barcodes (single or bulk) or manually add stock to warehouse"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Receive Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HARDWARE CATEGORY & SUBCATEGORIES NAVIGATION (TAB BAR + PILL FILTERS)     */}
      {/* ========================================================================= */}
      <div className="bg-white border-b border-slate-200 flex flex-col">
        {/* Top Level: Underlined Horizontal Tabs */}
        <div className="flex items-center gap-6 overflow-x-auto no-scrollbar border-b border-slate-200 px-4 pt-3">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 shrink-0 pb-3">
            <Layers className="w-4 h-4 text-teal-600" />
            <span>CATEGORY:</span>
          </div>

          {/* All Categories Tab */}
          <button
            type="button"
            onClick={() => onUpdateFilter({ category: 'ALL', subCategory: 'ALL' })}
            className={`pb-3 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 ${
              filterState.category === 'ALL' || !filterState.category
                ? 'border-teal-700 text-teal-800 font-bold'
                : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300'
            }`}
          >
            <span>All Categories</span>
            <span
              className={
                filterState.category === 'ALL' || !filterState.category
                  ? 'text-teal-700 font-bold'
                  : 'text-slate-400 font-normal'
              }
            >
              ({items.filter((i) => !i.archived).length})
            </span>
          </button>

          {/* Hardware Category Tabs */}
          {HARDWARE_CATEGORY_CATALOG.map((cat) => {
            const isSelected = filterState.category === cat.id;
            const catCount = items.filter((i) => !i.archived && i.category === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onUpdateFilter({ category: cat.id, subCategory: 'ALL' })}
                className={`pb-3 text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 ${
                  isSelected
                    ? 'border-teal-700 text-teal-800 font-bold'
                    : 'border-transparent text-slate-700 hover:text-slate-900 hover:border-slate-300'
                }`}
              >
                <span>{cat.label}</span>
                <span className={isSelected ? 'text-teal-700 font-bold' : 'text-slate-400 font-normal'}>
                  ({catCount})
                </span>
              </button>
            );
          })}
        </div>

        {/* Second Level: Filter Chips below active tab */}
        {activeCategoryCatalog && visibleSubItems.length > 0 && (
          <div className="px-4 py-3 bg-white flex items-center gap-2 flex-wrap animate-in fade-in duration-150">
            {/* "All" chip for active category */}
            <button
              type="button"
              onClick={() => onUpdateFilter({ subCategory: 'ALL' })}
              className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-1.5 ${
                !filterState.subCategory || filterState.subCategory === 'ALL'
                  ? 'bg-teal-800 text-white font-bold shadow-xs'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-medium'
              }`}
            >
              <span>All</span>
              <span
                className={
                  !filterState.subCategory || filterState.subCategory === 'ALL'
                    ? 'text-teal-200'
                    : 'text-slate-400'
                }
              >
                ({items.filter((i) => !i.archived && i.category === activeCategoryCatalog.id).length})
              </span>
            </button>

            {/* Filter chips for subcategories that have > 0 items */}
            {visibleSubItems.map((sub) => {
              const isSubSelected = filterState.subCategory === sub.name;
              return (
                <button
                  key={sub.name}
                  type="button"
                  onClick={() => onUpdateFilter({ subCategory: sub.name })}
                  className={`px-3.5 py-1.5 rounded-full text-xs transition-all cursor-pointer flex items-center gap-2 ${
                    isSubSelected
                      ? 'bg-teal-800 text-white font-bold shadow-xs'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-medium'
                  }`}
                >
                  {isSubSelected ? (
                    <span className="w-3 h-3 rounded-full border border-teal-300 bg-teal-700/80 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-teal-100 stroke-[3]" />
                    </span>
                  ) : (
                    <span className="w-3 h-3 rounded-full border border-teal-500 shrink-0" />
                  )}
                  <span>{sub.name}</span>
                  <span className={isSubSelected ? 'text-teal-200' : 'text-slate-400 font-normal'}>
                    ({sub.count})
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Bulk Action Banner (when items are selected) */}
      {selectedItemIds.size > 0 && (
        <div className="px-4 py-2.5 bg-teal-800 text-white flex flex-wrap items-center justify-between gap-2 text-xs animate-in slide-in-from-top-2 duration-150 shadow-inner">
          <div className="flex items-center gap-2 font-bold">
            <span className="w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center text-[10px]">
              {selectedItemIds.size}
            </span>
            <span>Items Selected</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {canAssign && (
              <button
                type="button"
                onClick={() => onOpenAssign(selectedItemsList)}
                className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 rounded-md font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-xs whitespace-nowrap"
                title="Batch assign selected equipment to technician"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Batch Assign to Tech</span>
              </button>
            )}

            {filterState.viewMode === 'archived' ? (
              <button
                type="button"
                onClick={() => {
                  if (onBatchRestore) {
                    onBatchRestore(Array.from(selectedItemIds));
                  } else {
                    Array.from(selectedItemIds).forEach((id) => onRestore(id));
                  }
                  setSelectedItemIds(new Set());
                }}
                className="px-3 py-1.5 bg-teal-700 hover:bg-teal-600 rounded-md font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-xs whitespace-nowrap"
                title="Restore selected records back to active inventory"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Batch Restore to Active ({selectedItemIds.size})</span>
              </button>
            ) : (
              canArchive && (
                <button
                  type="button"
                  onClick={() => {
                    onBatchArchive(Array.from(selectedItemIds));
                    setSelectedItemIds(new Set());
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-md font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-xs whitespace-nowrap"
                  title="Archive selected records"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span>Batch Archive</span>
                </button>
              )
            )}

            <button
              type="button"
              onClick={() => setIsBatchDeleteModalOpen(true)}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 active:bg-red-800 rounded-md font-bold text-white flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs text-xs whitespace-nowrap"
              title="Permanently hard delete selected records from database"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hard Delete (Admin)</span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedItemIds(new Set())}
              className="px-2 py-1 text-teal-200 hover:text-white underline cursor-pointer text-xs font-semibold whitespace-nowrap ml-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Main Workspace Central Table */}
      <div className="flex-1 min-w-0 overflow-x-auto overflow-y-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead className="bg-slate-100/90 text-slate-600 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
            <tr>
              <th className="px-3 py-2 w-10 text-center">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  onChange={handleToggleSelectAll}
                  className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                />
              </th>
              <th className="px-3 py-2 min-w-[180px]">Barcode / Serial (SN)</th>
              <th className="px-3 py-2 min-w-[140px]">Product SKU</th>
              <th className="px-3 py-2 min-w-[200px] w-full">Item Description</th>
              <th className="px-3 py-2 min-w-[210px]">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-700">Status (Dual 1x1)</span>
                  <span className="text-[9px] font-normal text-slate-500 normal-case tracking-normal">
                    1. Physical | 2. Account
                  </span>
                </div>
              </th>
              <th className="px-3 py-2 min-w-[220px]">Storage Bin</th>
              <th className="px-3 py-2 min-w-[150px]">Assigned Tech</th>
              <th className="px-3 py-2 min-w-[160px] whitespace-nowrap">Customer Acct #</th>
              <th className="px-3 py-2 w-28 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-sans">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const isSelected = selectedItemIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectItemDetail(item)}
                    className={`hover:bg-teal-50/40 transition-colors cursor-pointer ${
                      isSelected ? 'bg-teal-50/80 font-medium' : ''
                    } ${item.archived ? 'bg-slate-50/80 text-slate-500' : ''}`}
                  >
                    {/* Checkbox */}
                    <td
                      className="px-3 py-2 text-center"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleRowSelect(item.id);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {}}
                        className="w-4 h-4 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                      />
                    </td>

                    {/* Serial Number & Mini Barcode */}
                    <td className="px-3 py-2 font-mono">
                      {item.serialNumber ? (
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                              <span>{item.serialNumber}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopySerial(item.serialNumber, e)}
                                className="text-slate-400 hover:text-teal-700 p-0.5 rounded transition-colors"
                                title="Copy Serial Number"
                              >
                                {copiedSerial === item.serialNumber ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                            {item.macAddress && (
                              <span className="text-[10px] text-slate-400 block font-mono">
                                MAC: {item.macAddress}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-sans text-[10px] font-semibold">
                          <Layers className="w-3 h-3" /> Non-Barcoded (Bypassed)
                        </span>
                      )}
                    </td>

                    {/* Product SKU, Category & Subcategory */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="font-mono font-bold text-teal-700 block text-xs">
                        {item.sku}
                      </span>
                      <span className="text-[10px] text-slate-500 font-sans font-medium block">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                      {(() => {
                        const subCat = detectItemSubCategory(item);
                        return subCat ? (
                          <span
                            className="inline-flex items-center gap-1 text-[10px] text-teal-800 bg-teal-50 border border-teal-200/70 px-1.5 py-0.5 rounded font-medium mt-0.5"
                            title={`Subcategory: ${subCat}`}
                          >
                            <span className="text-teal-600 font-bold">○</span>
                            <span className="truncate max-w-[120px]">{subCat}</span>
                          </span>
                        ) : null;
                      })()}
                    </td>

                    {/* Description */}
                    <td className="px-3 py-2">
                      <p className="font-bold text-slate-800 truncate max-w-xs">{item.name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">{item.description}</p>
                    </td>

                    {/* Status Tags (Dual 1x1 Category Structure) */}
                    <td className="px-3 py-2 min-w-[210px] whitespace-nowrap">
                      <DualStatusBadge
                        lifecycleStatus={item.lifecycleStatus}
                        verificationStatus={item.verificationStatus}
                        legacyStatus={item.status}
                        layout="column"
                        size="sm"
                        showCategoryHeaders={true}
                      />
                    </td>

                    {/* Storage Bin */}
                    <td className="px-3 py-2 min-w-[220px]">
                      <div
                        className="inline-block max-w-full font-mono font-semibold text-slate-700 px-2.5 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-xs"
                        title={item.storageBin}
                      >
                        <span className="line-clamp-2 leading-snug break-words">
                          {item.storageBin}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Technician */}
                    <td className="px-3 py-2">
                      {item.assignedTechnicianName ? (
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <div className="w-5 h-5 rounded-full bg-cyan-700 text-white flex items-center justify-center text-[9px] font-bold">
                            {item.assignedTechnicianName[0]}
                          </div>
                          <div>
                            <p className="font-semibold leading-tight">{item.assignedTechnicianName}</p>
                            <span className="text-[10px] text-slate-400 block">{item.assignedAt || 'Assigned'}</span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">In Warehouse</span>
                      )}
                    </td>

                    {/* Customer Account Number Tag (Enforced Rule indicator) */}
                    <td className="px-3 py-2 min-w-[160px] whitespace-nowrap">
                      {item.customerAccountNumber ? (
                        <div className="flex items-center gap-1 text-emerald-800 font-mono font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{item.customerAccountNumber}</span>
                        </div>
                      ) : item.status === 'ASSIGNED' ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-sans text-[10px] font-semibold">
                          [Pending Tag]
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono pl-1">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="px-3 py-2 w-28 text-left whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-start gap-1">
                        {/* Quick Assign (if In Stock) */}
                        {item.status === 'IN_STOCK' && canAssign && (
                          <button
                            type="button"
                            onClick={() => onOpenAssign([item])}
                            className="p-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 hover:text-teal-900 rounded border border-teal-200/80 transition-colors cursor-pointer"
                            title="Assign to Field Technician"
                            aria-label="Assign to Field Technician"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Submit for Tech (if Assigned) */}
                        {item.status === 'ASSIGNED' && (
                          <button
                            type="button"
                            onClick={() => onOpenClosure(item)}
                            className="p-1.5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded transition-colors cursor-pointer shadow-2xs"
                            title="Submit Customer Account Tag & Photo Proof"
                            aria-label="Submit Customer Account Tag & Photo Proof"
                          >
                            <FileCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Quick Admin Verification (if Awaiting or Duplicate) */}
                        {(item.status === 'AWAITING_ADMIN_VERIFICATION' || item.status === 'SUSPECTED_DUPLICATE') &&
                          currentUser.role === 'ADMIN' &&
                          onOpenVerification && (
                            <button
                              type="button"
                              onClick={() => onOpenVerification(item)}
                              className="p-1.5 bg-amber-500 hover:bg-amber-600 text-amber-950 rounded transition-colors cursor-pointer shadow-2xs"
                              title="Review and Verify Submission"
                              aria-label="Review and Verify Submission"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                            </button>
                          )}

                        {/* View Details */}
                        <button
                          type="button"
                          onClick={() => onSelectItemDetail(item)}
                          className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100 transition-colors"
                          title="View Full Item Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Archive Item */}
                        {!item.archived && canArchive && (
                          <button
                            type="button"
                            onClick={() => setArchiveTargetItem(item)}
                            className="p-1 text-slate-400 hover:text-amber-600 rounded hover:bg-amber-50 transition-colors"
                            title="Archive Hardware Equipment"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Recover Item */}
                        {item.archived && (
                          <button
                            type="button"
                            onClick={() => setRestoreTargetItem(item)}
                            className="p-1 text-slate-400 hover:text-teal-600 rounded hover:bg-teal-50 transition-colors"
                            title="Recover Item to Active Stock"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Permanent Delete Record (Admin) */}
                        {canHardDelete && (
                          <button
                            type="button"
                            onClick={() => setDeleteTargetItem(item)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 transition-colors"
                            title="Permanently Delete Hardware Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Barcode className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No hardware items match this filter criteria</p>
                    <p className="text-xs text-slate-400">
                      Try clearing filters or search query, or use "+ Receive Stock" to log new equipment.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer with Summary Stats */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing <strong className="text-slate-900">{filteredItems.length}</strong> of{' '}
          <strong className="text-slate-900">{items.length}</strong> items in database
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>
            In Stock: <strong className="text-teal-700">{items.filter((i) => !i.archived && i.status === 'IN_STOCK').length}</strong>
          </span>
          <span>
            Assigned: <strong className="text-cyan-700">{items.filter((i) => !i.archived && i.status === 'ASSIGNED').length}</strong>
          </span>
          <span>
            Installed: <strong className="text-emerald-700">{items.filter((i) => !i.archived && i.status === 'INSTALLED_CLOSED').length}</strong>
          </span>
        </div>
      </div>

      {/* Batch Hard Delete Modal */}
      <BatchHardDeleteModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        items={selectedItemsList}
        currentUser={currentUser}
        onConfirmDelete={(ids) => {
          onBatchHardDelete(ids);
          setSelectedItemIds(new Set());
        }}
        onSwitchToAdmin={onSwitchToAdmin}
      />

      {/* Confirmation Widget 1: Single Item Archive */}
      {archiveTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Archive Hardware Equipment</h3>
                <p className="text-xs text-slate-500">Move this item from active stock to Archive Vault.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Serial Number:</span>
                <span className="font-mono font-bold text-slate-900">{archiveTargetItem.serialNumber || 'Non-serialized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">SKU / Model:</span>
                <span className="font-mono text-slate-700">{archiveTargetItem.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Product Name:</span>
                <span className="text-slate-900 font-medium">{archiveTargetItem.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Soft-deleting moves the equipment to the Archive Vault. It can be inspected or recovered back into active stock at any time.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setArchiveTargetItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onArchive(archiveTargetItem.id);
                  setArchiveTargetItem(null);
                }}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Widget 2: Single Item Recover */}
      {restoreTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Recover Hardware Equipment</h3>
                <p className="text-xs text-slate-500">Restore this item back to active inventory.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Serial Number:</span>
                <span className="font-mono font-bold text-slate-900">{restoreTargetItem.serialNumber || 'Non-serialized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">SKU / Model:</span>
                <span className="font-mono text-slate-700">{restoreTargetItem.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Product Name:</span>
                <span className="text-slate-900 font-medium">{restoreTargetItem.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Recovering will reactivate this equipment and make it immediately available for warehouse allocation and field assignment.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTargetItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onRestore(restoreTargetItem.id);
                  setRestoreTargetItem(null);
                }}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Recover</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Widget 3: Single Item Permanent Deletion (Admin) */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-700">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Permanently Delete Equipment</h3>
                <p className="text-xs text-red-600 font-semibold">Irreversible Hard Delete</p>
              </div>
            </div>

            <div className="p-3 bg-red-50/50 border border-red-200 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Serial Number:</span>
                <span className="font-mono font-bold text-slate-900">{deleteTargetItem.serialNumber || 'Non-serialized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">SKU / Model:</span>
                <span className="font-mono text-slate-700">{deleteTargetItem.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 font-semibold">Product Name:</span>
                <span className="text-slate-900 font-medium">{deleteTargetItem.name}</span>
              </div>
            </div>

            <p className="text-xs text-red-700 bg-red-50 p-2.5 rounded-lg border border-red-200">
              <strong>Warning:</strong> This permanently erases this equipment record and its complete audit history from the central FiberX database. This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onHardDelete(deleteTargetItem.id);
                  setDeleteTargetItem(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Permanently Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
