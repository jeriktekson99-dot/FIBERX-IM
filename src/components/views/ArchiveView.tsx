import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  InventoryItem,
  Technician,
  UserProfile,
  AuditLog,
  ItemCategory,
  CATEGORY_LABELS,
} from '../../types';
import {
  Archive,
  RotateCcw,
  Trash2,
  Search,
  Filter,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  ShieldAlert,
  Layers,
  Wifi,
  Cable,
  GitFork,
  Radio,
  Boxes,
  Calendar,
  User,
  MapPin,
  Eye,
  Plus,
  Lock,
  Check,
  X,
  RefreshCw,
  SlidersHorizontal,
  Info,
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
} from 'lucide-react';
import { DualStatusBadge } from '../common/DualStatusBadge';

interface ArchiveViewProps {
  inventory: InventoryItem[];
  technicians: Technician[];
  currentUser: UserProfile;
  auditLogs?: AuditLog[];
  onRestore: (itemId: string) => void;
  onArchive?: (itemId: string, reason?: string) => void;
  onHardDelete?: (itemId: string) => void;
  onBatchRestore: (itemIds: string[]) => void;
  onBatchHardDelete?: (itemIds: string[]) => void;
  onSelectItemDetail?: (item: InventoryItem) => void;
  showToast?: (text: string, type?: 'teal' | 'emerald' | 'red') => void;
}

export const ArchiveView: React.FC<ArchiveViewProps> = ({
  inventory,
  technicians,
  currentUser,
  auditLogs = [],
  onRestore,
  onArchive,
  onHardDelete,
  onBatchRestore,
  onBatchHardDelete,
  onSelectItemDetail,
  showToast,
}) => {
  // Role verification: Admin has full enterprise privileges; Technician is scoped to their assigned custody
  const isAdmin = currentUser.role === 'ADMIN';
  const isTechnician = currentUser.role === 'TECHNICIAN';

  // Resolved technician record for the logged-in user
  const currentTech = useMemo(() => {
    if (!isTechnician) return null;
    const curName = (currentUser?.name || '').toLowerCase().trim();
    return (
      technicians.find(
        (t) =>
          (currentUser?.technicianId && t.id === currentUser.technicianId) ||
          (currentUser?.badgeId && t.employeeId === currentUser.badgeId) ||
          (t.name && curName && t.name.toLowerCase().trim() === curName)
      ) ||
      (currentUser?.technicianId
        ? {
            id: currentUser.technicianId,
            name: currentUser.name || 'Technician',
            employeeId: currentUser.badgeId || 'FX-TECH',
            phone: currentUser.phone || '',
            assignedVan: currentUser.assignedVan || 'Assigned Field Van',
            area: currentUser.assignedArea || 'Field Operations',
            activeJobCount: 0,
            completedCount: 0,
          }
        : null)
    );
  }, [technicians, currentUser, isTechnician]);

  const techId = currentTech?.id || currentUser?.technicianId || currentUser?.id;
  const techName = currentTech?.name || currentUser?.name || 'Technician';

  // Scope verification: Admin has universal enterprise access; Technician only sees their assigned custody
  const isItemInTechScope = useCallback(
    (item: InventoryItem) => {
      if (!isTechnician) return true; // Universal enterprise view for Admins

      const curNameLower = (techName || '').toLowerCase().trim();
      const curTechId = techId;

      // 1. Matched assignedTechnicianId
      if (curTechId && item.assignedTechnicianId === curTechId) {
        return true;
      }
      // 2. Matched assignedTechnicianName
      if (
        item.assignedTechnicianName &&
        curNameLower &&
        item.assignedTechnicianName.toLowerCase().trim() === curNameLower
      ) {
        return true;
      }
      // 3. Custody or note mentioning this technician
      if (curNameLower && item.notes && item.notes.toLowerCase().includes(curNameLower)) {
        return true;
      }
      return false;
    },
    [isTechnician, techId, techName]
  );

  // State: Filter, Search, Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'serial_asc' | 'name_asc'>('date_desc');

  // State: Selection for batch operations
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());

  // State: Modals
  const [isArchiveItemModalOpen, setIsArchiveItemModalOpen] = useState(false);
  const [activeItemSearch, setActiveItemSearch] = useState('');
  const [itemToArchive, setItemToArchive] = useState<InventoryItem | null>(null);
  const [archiveReason, setArchiveReason] = useState('Decommissioned / Retired Hardware');
  const [archiveNotes, setArchiveNotes] = useState('');

  // Permanent Delete Confirmation Modal (Admin Only)
  const [deleteTargetItem, setDeleteTargetItem] = useState<InventoryItem | null>(null);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // Restore Confirmation Modal
  const [restoreTargetItem, setRestoreTargetItem] = useState<InventoryItem | null>(null);
  const [isBatchRestoreModalOpen, setIsBatchRestoreModalOpen] = useState(false);

  // Single Item Direct Archive Confirmation Modal
  const [archiveTargetItem, setArchiveTargetItem] = useState<InventoryItem | null>(null);
  const [singleArchiveReason, setSingleArchiveReason] = useState('Decommissioned / Retired Hardware');
  const [singleArchiveNotes, setSingleArchiveNotes] = useState('');

  // Archived items scoped by role (Admin: Universal enterprise vault; Technician: Assigned hardware custody)
  const allArchivedItems = useMemo(() => {
    return inventory.filter((item) => item.archived && isItemInTechScope(item));
  }, [inventory, isItemInTechScope]);

  // Non-archived active items (Admin: All warehouse equipment; Technician: Equipment assigned in their custody)
  const activeInventory = useMemo(() => {
    return inventory.filter((item) => !item.archived && isItemInTechScope(item));
  }, [inventory, isItemInTechScope]);

  // Filtered archived items based on search and category
  const filteredArchivedItems = useMemo(() => {
    return allArchivedItems.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchSerial = item.serialNumber?.toLowerCase().includes(query);
        const matchSku = item.sku?.toLowerCase().includes(query);
        const matchName = item.name?.toLowerCase().includes(query);
        const matchMac = item.macAddress?.toLowerCase().includes(query);
        const matchBin = item.storageBin?.toLowerCase().includes(query);
        const matchCust = item.customerAccountNumber?.toLowerCase().includes(query);
        const matchModel = item.modelName?.toLowerCase().includes(query);

        if (!matchSerial && !matchSku && !matchName && !matchMac && !matchBin && !matchCust && !matchModel) {
          return false;
        }
      }

      return true;
    });
  }, [allArchivedItems, selectedCategory, searchQuery]);

  // Sorted items
  const sortedArchivedItems = useMemo(() => {
    const list = [...filteredArchivedItems];
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        const timeA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
        const timeB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
        return timeB - timeA;
      }
      if (sortBy === 'date_asc') {
        const timeA = a.archivedAt ? new Date(a.archivedAt).getTime() : 0;
        const timeB = b.archivedAt ? new Date(b.archivedAt).getTime() : 0;
        return timeA - timeB;
      }
      if (sortBy === 'serial_asc') {
        return (a.serialNumber || a.sku).localeCompare(b.serialNumber || b.sku);
      }
      if (sortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });
    return list;
  }, [filteredArchivedItems, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    return {
      ALL: allArchivedItems.length,
      MODEM_ONT: allArchivedItems.filter((i) => i.category === 'MODEM_ONT').length,
      FIBER_CABLE: allArchivedItems.filter((i) => i.category === 'FIBER_CABLE').length,
      SPLITTER: allArchivedItems.filter((i) => i.category === 'SPLITTER').length,
      PATCH_CORD: allArchivedItems.filter((i) => i.category === 'PATCH_CORD').length,
      ACCESSORY: allArchivedItems.filter((i) => i.category === 'ACCESSORY').length,
    };
  }, [allArchivedItems]);

  // Selection handlers
  const isAllSelected =
    sortedArchivedItems.length > 0 &&
    sortedArchivedItems.every((item) => selectedItemIds.has(item.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedItemIds(new Set());
    } else {
      const next = new Set<string>();
      sortedArchivedItems.forEach((item) => next.add(item.id));
      setSelectedItemIds(next);
    }
  };

  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Execution: Recover Single Item
  const handleConfirmRestoreSingle = () => {
    if (!restoreTargetItem) return;
    onRestore(restoreTargetItem.id);
    if (showToast) {
      showToast(`Recovered ${restoreTargetItem.serialNumber || restoreTargetItem.sku} to active inventory`, 'emerald');
    }
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(restoreTargetItem.id);
      return next;
    });
    setRestoreTargetItem(null);
  };

  // Execution: Batch Recover
  const handleConfirmBatchRestore = () => {
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;
    onBatchRestore(ids);
    if (showToast) {
      showToast(`Recovered ${ids.length} item(s) to active inventory`, 'emerald');
    }
    setSelectedItemIds(new Set());
    setIsBatchRestoreModalOpen(false);
  };

  // Execution: Permanent Delete Single Item (Admin Only)
  const handleConfirmDeleteSingle = () => {
    if (!isAdmin) {
      if (showToast) {
        showToast('Permission Denied: Only Admins can permanently delete items.', 'red');
      }
      return;
    }
    if (!deleteTargetItem || !onHardDelete) return;

    onHardDelete(deleteTargetItem.id);
    if (showToast) {
      showToast(`Permanently deleted ${deleteTargetItem.serialNumber || deleteTargetItem.sku}`, 'red');
    }
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTargetItem.id);
      return next;
    });
    setDeleteTargetItem(null);
  };

  // Execution: Batch Permanent Delete (Admin Only)
  const handleConfirmBatchDelete = () => {
    if (!isAdmin) {
      if (showToast) {
        showToast('Permission Denied: Only Admins can permanently delete items.', 'red');
      }
      return;
    }
    const ids = Array.from(selectedItemIds);
    if (ids.length === 0) return;

    if (onBatchHardDelete) {
      onBatchHardDelete(ids);
    } else if (onHardDelete) {
      ids.forEach((id) => onHardDelete(id));
    }

    if (showToast) {
      showToast(`Permanently deleted ${ids.length} records from database`, 'red');
    }
    setSelectedItemIds(new Set());
    setIsBatchDeleteModalOpen(false);
  };

  // Execution: Archive an Active Item (Both Technician and Admin can do this)
  const handleConfirmArchiveActiveItem = () => {
    if (!itemToArchive || !onArchive) return;
    const finalReason = `${archiveReason}${archiveNotes ? ` - ${archiveNotes}` : ''}`;
    onArchive(itemToArchive.id, finalReason);
    if (showToast) {
      showToast(`Archived ${itemToArchive.serialNumber || itemToArchive.sku}`, 'teal');
    }
    setIsArchiveItemModalOpen(false);
    setItemToArchive(null);
    setArchiveNotes('');
    setActiveItemSearch('');
  };

  // Execution: Direct Archive Single Item from Row Action
  const handleConfirmSingleArchive = () => {
    if (!archiveTargetItem || !onArchive) return;
    const finalReason = `${singleArchiveReason}${singleArchiveNotes ? ` - ${singleArchiveNotes}` : ''}`;
    onArchive(archiveTargetItem.id, finalReason);
    if (showToast) {
      showToast(`Archived ${archiveTargetItem.serialNumber || archiveTargetItem.sku} to vault`, 'teal');
    }
    setArchiveTargetItem(null);
    setSingleArchiveNotes('');
  };

  // Export archived items to CSV/Excel
  const handleExportArchiveExcel = () => {
    if (allArchivedItems.length === 0) {
      if (showToast) showToast('No archived records to export', 'teal');
      return;
    }
    const headers = [
      'Serial Number / Barcode',
      'SKU',
      'Product Name',
      'Category',
      'Storage Location',
      'MAC Address',
      'Slot Number',
      'Pairing Status',
      'Archived Date',
      'Notes / Reason',
    ];
    const rows = allArchivedItems.map((item) => [
      `"${item.serialNumber || ''}"`,
      `"${item.sku || ''}"`,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${CATEGORY_LABELS[item.category] || item.category}"`,
      `"${item.storageBin || 'Vault Bay'}"`,
      `"${item.macAddress || ''}"`,
      `"${item.slotNumber || 'Unassigned'}"`,
      `"${item.pairingStatus || 'UNPAIRED'}"`,
      `"${item.archivedAt ? new Date(item.archivedAt).toLocaleDateString() : ''}"`,
      `"${(item.notes || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `FiberX_Archive_Vault_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (showToast) {
      showToast(`Exported ${allArchivedItems.length} records to Archive Excel/CSV`, 'emerald');
    }
  };

  // Helper to format category icon
  const getCategoryIcon = (category: ItemCategory) => {
    switch (category) {
      case 'MODEM_ONT':
        return <Wifi className="w-3.5 h-3.5 text-blue-600" />;
      case 'FIBER_CABLE':
        return <Cable className="w-3.5 h-3.5 text-amber-600" />;
      case 'SPLITTER':
        return <GitFork className="w-3.5 h-3.5 text-purple-600" />;
      case 'PATCH_CORD':
        return <Radio className="w-3.5 h-3.5 text-teal-600" />;
      case 'ACCESSORY':
        return <Boxes className="w-3.5 h-3.5 text-slate-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#F8FAFC] overflow-hidden">
      {/* Top Header & Overview Bar */}
      <div className="px-6 pt-5 pb-3 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-800 border border-teal-500/20">
                <Archive className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                  <span>Archive Vault</span>
                  {isTechnician ? (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800">
                      Assigned Custody: {techName}
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                      Universal Enterprise Vault
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isTechnician
                    ? `Equipment archive scoped to hardware assigned to your field custody (${techName}${currentTech?.assignedVan ? ` • ${currentTech.assignedVan}` : ''}).`
                    : 'Manage soft-deleted hardware, retired fiber drops, and warehouse recovery across the entire network.'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export Archived Hardware to Excel */}
            <button
              type="button"
              onClick={handleExportArchiveExcel}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Fleet Excel (Slots & Pairing)</span>
            </button>

            {onArchive && (
              <button
                type="button"
                onClick={() => {
                  setItemToArchive(null);
                  setActiveItemSearch('');
                  setIsArchiveItemModalOpen(true);
                }}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Archive Active Item</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick KPI Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 mt-3">
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Archived</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-slate-900">{categoryCounts.ALL}</span>
              <Archive className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Modems & ONTs</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-blue-950">{categoryCounts.MODEM_ONT}</span>
              <Wifi className="w-4 h-4 text-blue-600" />
            </div>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Fiber Drop Cables</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-amber-950">{categoryCounts.FIBER_CABLE}</span>
              <Cable className="w-4 h-4 text-amber-600" />
            </div>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">Optical Splitters</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-purple-950">{categoryCounts.SPLITTER}</span>
              <GitFork className="w-4 h-4 text-purple-600" />
            </div>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-teal-700 uppercase tracking-wider block">Patch Cords</span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-teal-950">{categoryCounts.PATCH_CORD}</span>
              <Radio className="w-4 h-4 text-teal-600" />
            </div>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
              {isTechnician ? 'Active Stock In Van Custody' : 'Active Stock In Warehouse'}
            </span>
            <div className="flex items-center justify-between mt-1">
              <span className="text-base font-black text-emerald-950">{activeInventory.length}</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table Container with Integrated Toolbar */}
      <div className="flex-1 min-h-0 overflow-y-auto p-6 flex flex-col">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col flex-1">
          {/* Table Header: Search bar and Dropdown Category Box integrated as part of the data table */}
          <div className="px-4 py-3 border-b border-slate-200 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
            {/* Search and Category Dropdown Grouped Together (Not Separated) */}
            <div className="flex items-center gap-2.5 flex-wrap flex-1">
              {/* Extended Search Bar (15% wider: 295px) */}
              <div className="relative w-full sm:w-[295px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search serial, SKU, MAC..."
                  className="w-full pl-9 pr-7 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Dropdown Box (Grouped right with the Search Bar) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="ALL">All Categories ({categoryCounts.ALL})</option>
                  <option value="MODEM_ONT">Modems & ONTs ({categoryCounts.MODEM_ONT})</option>
                  <option value="FIBER_CABLE">Fiber Cables ({categoryCounts.FIBER_CABLE})</option>
                  <option value="SPLITTER">Splitters ({categoryCounts.SPLITTER})</option>
                  <option value="PATCH_CORD">Patch Cords ({categoryCounts.PATCH_CORD})</option>
                  <option value="ACCESSORY">Accessories ({categoryCounts.ACCESSORY})</option>
                </select>
              </div>

              {/* Archive Date Sort Dropdown (Grouped together) */}
              <div className="flex items-center gap-1.5 shrink-0">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600 cursor-pointer"
                >
                  <option value="date_desc">Archived Date (Newest)</option>
                  <option value="date_asc">Archived Date (Oldest)</option>
                  <option value="serial_asc">Serial Number (A-Z)</option>
                  <option value="name_asc">Product Name (A-Z)</option>
                </select>
              </div>
            </div>

            {/* Table Item Count Indicator */}
            <div className="text-xs text-slate-500 font-medium shrink-0">
              Showing <strong className="text-slate-900">{sortedArchivedItems.length}</strong> of{' '}
              <strong className="text-slate-900">{allArchivedItems.length}</strong> items
            </div>
          </div>

          {/* Batch Selection Banner */}
          {selectedItemIds.size > 0 && (
            <div className="bg-teal-900 text-white px-5 py-2.5 shrink-0 flex items-center justify-between border-b border-teal-800 transition-all animate-fadeIn">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 rounded bg-teal-800 border border-teal-700 text-xs font-mono font-bold text-teal-200">
                  {selectedItemIds.size} Selected
                </span>
                <span className="text-xs text-teal-100 hidden sm:inline">
                  Perform batch operations on marked archived items.
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Batch Recover - Available to BOTH Technician and Admin */}
                <button
                  type="button"
                  onClick={() => setIsBatchRestoreModalOpen(true)}
                  className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-emerald-950 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Recover Selected ({selectedItemIds.size})</span>
                </button>

                {/* Batch Permanent Delete - Only Admin can trigger */}
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => setIsBatchDeleteModalOpen(true)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Permanently Delete ({selectedItemIds.size})</span>
                  </button>
                ) : (
                  <div
                    className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-not-allowed border border-slate-700"
                    title="Only Admin users can permanently delete items from the database"
                  >
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span className="text-[11px]">Delete (Admin Only)</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedItemIds(new Set())}
                  className="px-2 py-1 text-teal-200 hover:text-white text-xs underline cursor-pointer ml-1"
                >
                  Deselect All
                </button>
              </div>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-100/80 text-slate-600 font-bold uppercase tracking-wider text-[11px] sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                    title={isAllSelected ? 'Deselect all' : 'Select all'}
                  />
                </th>
                <th className="px-4 py-3">Hardware Serial / Identifier</th>
                <th className="px-4 py-3">Product Name & SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Last Known Custody / Location</th>
                <th className="px-4 py-3">Archived Timestamp & Reason</th>
                <th className="px-4 py-3 text-right">Role-Based Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {sortedArchivedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                        <Archive className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-800">No Archived Hardware Found</p>
                      <p className="text-xs text-slate-500">
                        {searchQuery || selectedCategory !== 'ALL'
                          ? 'No items match your active search and category filters. Try resetting your search.'
                          : isTechnician
                          ? `There are currently no archived items from your assigned field custody (${techName}). You can archive equipment in your custody anytime.`
                          : 'There are currently no items in the archive vault. Active hardware can be archived anytime by Technicians or Admins.'}
                      </p>
                      {searchQuery || selectedCategory !== 'ALL' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setSelectedCategory('ALL');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                        >
                          Clear Filters
                        </button>
                      ) : (
                        onArchive && (
                          <button
                            type="button"
                            onClick={() => {
                              setItemToArchive(null);
                              setActiveItemSearch('');
                              setIsArchiveItemModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Archive An Active Item</span>
                          </button>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedArchivedItems.map((item) => {
                  const isSelected = selectedItemIds.has(item.id);
                  const assignedTech = item.assignedTechnicianId
                    ? technicians.find((t) => t.id === item.assignedTechnicianId)
                    : null;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-teal-50/40' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleItem(item.id)}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>

                      {/* Serial Number & MAC */}
                      <td className="px-4 py-3 min-w-[170px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 text-xs">
                              {item.serialNumber || (
                                <span className="italic text-slate-400">Non-Serialized</span>
                              )}
                            </span>
                          </div>
                          {item.macAddress && (
                            <p className="font-mono text-[10px] text-slate-400">
                              MAC: {item.macAddress}
                            </p>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 text-[9px] font-mono uppercase font-bold">
                              ARCHIVED
                            </span>
                            {item.quantity && item.quantity > 1 && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 text-[9px] font-mono font-bold">
                                {item.quantity} {item.unit || 'pcs'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Product Name & SKU */}
                      <td className="px-4 py-3 min-w-[190px]">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 line-clamp-1">{item.name}</p>
                          <p className="font-mono text-[10px] text-slate-500 font-semibold">{item.sku}</p>
                          {item.modelName && item.modelName !== item.name && (
                            <p className="text-[10px] text-slate-400">{item.modelName}</p>
                          )}
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-[11px] font-semibold">
                          {getCategoryIcon(item.category)}
                          <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                        </div>
                      </td>

                      {/* Last Known Custody / Location */}
                      <td className="px-4 py-3 min-w-[160px]">
                        <div className="space-y-0.5 text-xs text-slate-700">
                          {assignedTech ? (
                            <div className="flex items-center gap-1 font-semibold text-slate-900">
                              <User className="w-3 h-3 text-cyan-600 shrink-0" />
                              <span className="truncate">{assignedTech.name}</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-slate-600">
                              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{item.storageBin || 'Warehouse Reserve'}</span>
                            </div>
                          )}
                          {item.customerAccountNumber && (
                            <p className="text-[10px] font-mono text-teal-700 font-bold">
                              Acct: {item.customerAccountNumber}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Archived Timestamp & Reason */}
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>
                              {item.archivedAt
                                ? new Date(item.archivedAt).toLocaleDateString() +
                                  ' ' +
                                  new Date(item.archivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : 'Archived in Vault'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 italic line-clamp-1">
                            {item.notes || 'Soft-deleted from active inventory'}
                          </p>
                        </div>
                      </td>

                      {/* Role-Based Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* 1. View Details (Both roles) */}
                          {onSelectItemDetail && (
                            <button
                              type="button"
                              onClick={() => onSelectItemDetail(item)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Inspect full equipment specification"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* 2. ARCHIVE BUTTON with confirmation widget */}
                          {onArchive && (
                            <button
                              type="button"
                              onClick={() => {
                                setArchiveTargetItem(item);
                                setSingleArchiveReason('Decommissioned / Retired Hardware');
                                setSingleArchiveNotes(item.notes || '');
                              }}
                              className="p-1.5 rounded-lg text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors cursor-pointer"
                              title="Archive hardware / Confirm archival status"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* 3. RECOVER / RESTORE (Both Technician and Admin) */}
                          <button
                            type="button"
                            onClick={() => setRestoreTargetItem(item)}
                            className="p-1.5 rounded-lg text-teal-600 hover:text-teal-700 hover:bg-teal-50 transition-colors cursor-pointer"
                            title="Recover item back to active stock"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>

                          {/* 4. PERMANENT DELETE (Admin ONLY) */}
                          {isAdmin ? (
                            <button
                              type="button"
                              onClick={() => setDeleteTargetItem(item)}
                              className="p-1.5 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-colors cursor-pointer"
                              title="Permanently Delete (Hard Delete from DB)"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            /* Technician CANNOT delete permanently - visual role badge */
                            <div
                              className="p-1.5 rounded-lg text-slate-300 cursor-not-allowed"
                              title="Permanent deletion is restricted to Admins. Technicians can only archive or recover."
                            >
                              <Lock className="w-4 h-4 text-slate-300" />
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>

      {/* MODAL 0: Archive Single Confirmation Widget */}
      {archiveTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Archive Hardware Equipment</h3>
                <p className="text-xs text-slate-500">Confirm moving this equipment to the Archive Vault.</p>
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
              <div className="flex justify-between">
                <span className="text-slate-500 font-semibold">Category:</span>
                <span className="text-slate-800 font-semibold">{CATEGORY_LABELS[archiveTargetItem.category] || archiveTargetItem.category}</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Select Archival Reason
              </label>
              <select
                value={singleArchiveReason}
                onChange={(e) => setSingleArchiveReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="Decommissioned / Retired Hardware">Decommissioned / Retired Hardware</option>
                <option value="Customer Cancellation / Optical Drop Removed">Customer Cancellation / Optical Drop Removed</option>
                <option value="Equipment Damaged in Field">Equipment Damaged in Field</option>
                <option value="Hardware Failure / Defective Port">Hardware Failure / Defective Port</option>
                <option value="Upgraded to Higher Capacity Model">Upgraded to Higher Capacity Model</option>
                <option value="Administrative Inventory Audit">Administrative Inventory Audit</option>
              </select>

              <textarea
                value={singleArchiveNotes}
                onChange={(e) => setSingleArchiveNotes(e.target.value)}
                placeholder="Optional notes or audit remarks..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

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
                onClick={handleConfirmSingleArchive}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Confirm Archive</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Recover Single Confirmation */}
      {restoreTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Recover Hardware to Active Inventory</h3>
                <p className="text-xs text-slate-500">Restore this item to available stock catalog.</p>
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
              Recovering will clear the archived flag and return the equipment to active stock inventory. Both Technicians and Admins have permission to recover records.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setRestoreTargetItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestoreSingle}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Confirm Recovery</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Batch Recover Confirmation */}
      {isBatchRestoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Batch Recover {selectedItemIds.size} Items</h3>
                <p className="text-xs text-slate-500">Restore selected equipment back to active stock.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Are you sure you want to recover all <strong>{selectedItemIds.size} selected items</strong>? They will immediately re-appear in the active stock inventory and warehouse bins.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchRestoreModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchRestore}
                className="px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Batch Recover ({selectedItemIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Permanent Hard Delete Confirmation (ADMIN ONLY) */}
      {deleteTargetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-950">Permanent Hard Delete (Purge)</h3>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Exclusive Admin Privilege
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-50/60 border border-red-200 rounded-xl space-y-1 text-xs text-red-900">
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Serial Number:</span>
                <span className="font-mono font-bold">{deleteTargetItem.serialNumber || 'Non-serialized'}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Product SKU:</span>
                <span className="font-mono">{deleteTargetItem.sku}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-red-700">Item Name:</span>
                <span className="font-medium">{deleteTargetItem.name}</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Irreversible Purge Warning</span>
              </p>
              <p className="text-[11px] text-amber-800">
                This action will completely remove the hardware record from the database. It cannot be recovered later. Field technicians cannot perform this action.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSingle}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Permanently Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Batch Permanent Delete Confirmation (ADMIN ONLY) */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-red-200 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-red-950">
                  Permanently Purge {selectedItemIds.size} Records
                </h3>
                <span className="text-[10px] font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  Exclusive Admin Privilege
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1.5">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>Permanent Database Eradication</span>
              </p>
              <p className="text-[11px] text-red-800">
                You are about to irreversibly purge <strong>{selectedItemIds.size} records</strong> from the central FiberX hardware database. These items cannot be recovered once purged.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBatchDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirm Purge ({selectedItemIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Archive Active Item (Accessible to BOTH Technicians and Admins) */}
      {isArchiveItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                  <Archive className="w-5 h-5 text-teal-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Archive Active Equipment</h3>
                  <p className="text-xs text-slate-500">
                    Both Technicians and Admins can move equipment into the Archive.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsArchiveItemModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step 1: Select Active Item */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                {isTechnician
                  ? `1. Select Equipment from Your Assigned Custody (${techName})`
                  : '1. Select Equipment from Active Inventory'}
              </label>
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={activeItemSearch}
                  onChange={(e) => setActiveItemSearch(e.target.value)}
                  placeholder="Filter by serial number, SKU, or name..."
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:bg-white"
                />
              </div>

              <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                {activeInventory.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-500 italic">
                    {isTechnician
                      ? `No active equipment currently assigned to ${techName}.`
                      : 'No active items available to archive.'}
                  </div>
                ) : (
                  activeInventory
                    .filter((item) => {
                      if (!activeItemSearch.trim()) return true;
                      const q = activeItemSearch.toLowerCase();
                      return (
                        item.serialNumber?.toLowerCase().includes(q) ||
                        item.sku?.toLowerCase().includes(q) ||
                        item.name?.toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 15)
                    .map((item) => {
                    const isSelected = itemToArchive?.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setItemToArchive(item)}
                        className={`w-full p-2.5 text-left text-xs transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 border-l-4 border-l-teal-600'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500">
                            <span>SN: {item.serialNumber || 'N/A'}</span>
                            <span>•</span>
                            <span>{item.sku}</span>
                          </div>
                        </div>
                        {isSelected ? (
                          <Check className="w-4 h-4 text-teal-700 shrink-0" />
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0">Select</span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Step 2: Archival Reason */}
            {itemToArchive && (
              <div className="space-y-3 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  2. Archival Reason & Category
                </label>
                <select
                  value={archiveReason}
                  onChange={(e) => setArchiveReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none focus:ring-1 focus:ring-teal-600"
                >
                  <option value="Decommissioned / Retired Hardware">Decommissioned / Retired Hardware</option>
                  <option value="Customer Replacement Return (Defective)">Customer Replacement Return (Defective)</option>
                  <option value="Field Van Damaged / Broken Drop Cable">Field Van Damaged / Broken Drop Cable</option>
                  <option value="Obsolete Stock / Replaced by Wi-Fi 6">Obsolete Stock / Replaced by Wi-Fi 6</option>
                  <option value="Administrative Record Consolidation">Administrative Record Consolidation</option>
                  <option value="Other / Custody Disposition">Other / Custody Disposition</option>
                </select>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Additional Notes (Optional):
                  </label>
                  <input
                    type="text"
                    value={archiveNotes}
                    onChange={(e) => setArchiveNotes(e.target.value)}
                    placeholder="e.g. Broken optical splice receiver; returned by field van"
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-600"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsArchiveItemModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!itemToArchive}
                onClick={handleConfirmArchiveActiveItem}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 ${
                  itemToArchive
                    ? 'bg-slate-900 hover:bg-slate-800 cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Archive Equipment</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
