import React, { useState, useMemo } from 'react';
import { Technician, InventoryItem, UserProfile } from '../../types';
import {
  Truck,
  User,
  Phone,
  MapPin,
  Package,
  Plus,
  ArrowRight,
  ArrowLeft,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  XCircle,
  Send,
  RotateCcw,
  Info,
  Search,
  Filter,
  Layers,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Radio,
  FileSpreadsheet,
  Flag,
  BarChart3,
  ShieldAlert,
  Calendar,
  Check,
} from 'lucide-react';
import { DualStatusBadge } from '../common/DualStatusBadge';
import { downloadTechnicianExcelFile } from '../../utils/excelExport';
import { FlagTechnicianModal } from '../modals/FlagTechnicianModal';
import { WarehouseUtilizationModal } from '../modals/WarehouseUtilizationModal';
import { getUserInitials } from '../../utils/userInitials';

interface TechnicianHubViewProps {
  technicians: Technician[];
  inventory: InventoryItem[];
  currentUser: UserProfile;
  onOpenAssignToTech: (tech: Technician) => void;
  onOpenClosure: (item: InventoryItem) => void;
  onSelectItemDetail: (item: InventoryItem) => void;
  onToggleFlagTechnician?: (technicianId: string, isFlagged: boolean, reason?: string) => void;
  onUpdateUtilization?: (itemId: string, utilizedQuantity: number, notes?: string) => void;
  onAddTechnician?: (newTech: Technician, newProfile: UserProfile) => void;
}

type EquipmentFilterTab = 'ALL' | 'ASSIGNED' | 'CONNECTED' | 'AWAITING' | 'REJECTED';

interface TechnicianStats {
  inCustodyCount: number;
  awaitingVerificationCount: number;
  connectedCount: number;
  rejectedCount: number;
  totalAssociated: number;
  utilizedCount: number;
}

export const TechnicianHubView: React.FC<TechnicianHubViewProps> = ({
  technicians,
  inventory,
  currentUser,
  onOpenAssignToTech,
  onOpenClosure,
  onSelectItemDetail,
  onToggleFlagTechnician,
  onUpdateUtilization,
  onAddTechnician,
}) => {
  // If currentUser is a technician, default to their detail view; otherwise show table
  const [selectedTechId, setSelectedTechId] = useState<string | null>(
    currentUser.role === 'TECHNICIAN' && currentUser.technicianId
      ? currentUser.technicianId
      : null
  );

  // Table search & filter states for fleet roster
  const [fleetSearchQuery, setFleetSearchQuery] = useState('');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState('ALL');
  const [fleetCustodyFilter, setFleetCustodyFilter] = useState<'ALL' | 'WITH_CUSTODY' | 'WITH_PENDING' | 'FLAGGED'>('ALL');

  // Detail view filters
  const [equipmentTab, setEquipmentTab] = useState<EquipmentFilterTab>('ALL');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentCategoryFilter, setEquipmentCategoryFilter] = useState('ALL');

  // Sub-modal states
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [isUtilizationModalOpen, setIsUtilizationModalOpen] = useState(false);
  const [activeTechForModal, setActiveTechForModal] = useState<Technician | null>(null);

  const canAssign = currentUser.role === 'ADMIN' || currentUser.role === 'OPERATOR';

  // Distinct areas for fleet filter
  const distinctAreas = useMemo(() => {
    return Array.from(new Set(technicians.map((t) => t.area).filter(Boolean)));
  }, [technicians]);

  // Compute live equipment metrics per technician
  const technicianStatsMap = useMemo(() => {
    const map: Record<string, TechnicianStats> = {};

    technicians.forEach((tech) => {
      const activeTechItems = inventory.filter(
        (item) =>
          !item.archived &&
          (item.assignedTechnicianId === tech.id ||
            item.submittedByTechnicianId === tech.id ||
            item.closedByTechnicianId === tech.id)
      );

      const inCustody = activeTechItems.filter(
        (i) =>
          i.assignedTechnicianId === tech.id &&
          (i.lifecycleStatus === 'ASSIGNED_RESERVED' || i.status === 'ASSIGNED') &&
          (i.verificationStatus === 'UNLINKED_READY' || !i.customerAccountNumber)
      ).reduce((sum, i) => sum + (i.quantity || 1), 0);

      const awaitingVerification = activeTechItems.filter(
        (i) =>
          i.verificationStatus === 'AWAITING_VERIFICATION' ||
          i.status === 'AWAITING_ADMIN_VERIFICATION' ||
          i.status === 'SUSPECTED_DUPLICATE'
      ).length;

      const connected = activeTechItems.filter(
        (i) =>
          i.verificationStatus === 'VERIFIED_CONNECTED' ||
          i.status === 'INSTALLED_VERIFIED' ||
          i.status === 'INSTALLED_CLOSED' ||
          i.lifecycleStatus === 'INSTALLED_DEPLOYED'
      ).length;

      const rejected = activeTechItems.filter(
        (i) =>
          (i.verificationStatus === 'FLAGGED_ACTION_REQUIRED' &&
            i.adminVerificationStatus === 'REJECTED') ||
          i.status === 'REJECTED_INVALID_TAG'
      ).length;

      const utilized = activeTechItems.reduce((sum, i) => {
        if (i.utilizedQuantity !== undefined) return sum + i.utilizedQuantity;
        if (
          i.verificationStatus === 'VERIFIED_CONNECTED' ||
          i.lifecycleStatus === 'INSTALLED_DEPLOYED'
        ) {
          return sum + (i.quantity || 1);
        }
        return sum;
      }, 0);

      map[tech.id] = {
        inCustodyCount: inCustody,
        awaitingVerificationCount: awaitingVerification,
        connectedCount: connected,
        rejectedCount: rejected,
        totalAssociated: activeTechItems.length,
        utilizedCount: utilized,
      };
    });

    return map;
  }, [technicians, inventory]);

  // Overall fleet stats
  const totalFleetInCustody = useMemo(() => {
    return (Object.values(technicianStatsMap) as TechnicianStats[]).reduce(
      (sum, s) => sum + s.inCustodyCount,
      0
    );
  }, [technicianStatsMap]);

  const totalFleetPending = useMemo(() => {
    return (Object.values(technicianStatsMap) as TechnicianStats[]).reduce(
      (sum, s) => sum + s.awaitingVerificationCount,
      0
    );
  }, [technicianStatsMap]);

  const totalFleetConnected = useMemo(() => {
    return (Object.values(technicianStatsMap) as TechnicianStats[]).reduce(
      (sum, s) => sum + s.connectedCount,
      0
    );
  }, [technicianStatsMap]);

  const totalFleetFlagged = useMemo(() => {
    return technicians.filter((t) => t.isFlagged).length;
  }, [technicians]);

  // Filter technicians based on search & area
  const filteredTechnicians = useMemo(() => {
    return technicians.filter((tech) => {
      // Search
      const query = fleetSearchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        tech.name.toLowerCase().includes(query) ||
        tech.employeeId.toLowerCase().includes(query) ||
        tech.assignedVan.toLowerCase().includes(query) ||
        tech.area.toLowerCase().includes(query);

      // Area
      const matchesArea = selectedAreaFilter === 'ALL' || tech.area === selectedAreaFilter;

      // Custody Filter
      let matchesCustody = true;
      const stats = technicianStatsMap[tech.id];
      if (fleetCustodyFilter === 'WITH_CUSTODY') {
        matchesCustody = (stats?.inCustodyCount || 0) > 0;
      } else if (fleetCustodyFilter === 'WITH_PENDING') {
        matchesCustody = (stats?.awaitingVerificationCount || 0) > 0;
      } else if (fleetCustodyFilter === 'FLAGGED') {
        matchesCustody = Boolean(tech.isFlagged);
      }

      return matchesSearch && matchesArea && matchesCustody;
    });
  }, [technicians, fleetSearchQuery, selectedAreaFilter, fleetCustodyFilter, technicianStatsMap]);

  // Currently selected technician for detail view
  const selectedTech = useMemo(() => {
    if (!selectedTechId) return null;
    return technicians.find((t) => t.id === selectedTechId) || null;
  }, [selectedTechId, technicians]);

  // Equipment items for currently selected technician
  const selectedTechItems = useMemo(() => {
    if (!selectedTech) return [];
    return inventory.filter(
      (item) =>
        !item.archived &&
        (item.assignedTechnicianId === selectedTech.id ||
          item.submittedByTechnicianId === selectedTech.id ||
          item.closedByTechnicianId === selectedTech.id)
    );
  }, [selectedTech, inventory]);

  // Breakdown of selected technician's equipment
  const techAssignedVanItems = useMemo(() => {
    return selectedTechItems.filter(
      (i) =>
        i.assignedTechnicianId === selectedTech?.id &&
        (i.lifecycleStatus === 'ASSIGNED_RESERVED' || i.status === 'ASSIGNED') &&
        (i.verificationStatus === 'UNLINKED_READY' || !i.customerAccountNumber)
    );
  }, [selectedTechItems, selectedTech]);

  const techAwaitingVerificationItems = useMemo(() => {
    return selectedTechItems.filter(
      (i) =>
        i.verificationStatus === 'AWAITING_VERIFICATION' ||
        i.status === 'AWAITING_ADMIN_VERIFICATION' ||
        i.status === 'SUSPECTED_DUPLICATE'
    );
  }, [selectedTechItems]);

  const techConnectedItems = useMemo(() => {
    return selectedTechItems.filter(
      (i) =>
        i.verificationStatus === 'VERIFIED_CONNECTED' ||
        i.status === 'INSTALLED_VERIFIED' ||
        i.status === 'INSTALLED_CLOSED' ||
        i.lifecycleStatus === 'INSTALLED_DEPLOYED'
    );
  }, [selectedTechItems]);

  const techRejectedItems = useMemo(() => {
    return selectedTechItems.filter(
      (i) =>
        (i.verificationStatus === 'FLAGGED_ACTION_REQUIRED' &&
          i.adminVerificationStatus === 'REJECTED') ||
        i.status === 'REJECTED_INVALID_TAG'
    );
  }, [selectedTechItems]);

  // Filtered equipment list for detail page
  const filteredEquipment = useMemo(() => {
    return selectedTechItems.filter((item) => {
      // Tab filter
      if (equipmentTab === 'ASSIGNED') {
        const isAssigned =
          item.assignedTechnicianId === selectedTech?.id &&
          (item.lifecycleStatus === 'ASSIGNED_RESERVED' || item.status === 'ASSIGNED') &&
          (item.verificationStatus === 'UNLINKED_READY' || !item.customerAccountNumber);
        if (!isAssigned) return false;
      } else if (equipmentTab === 'CONNECTED') {
        const isConnected =
          item.verificationStatus === 'VERIFIED_CONNECTED' ||
          item.status === 'INSTALLED_VERIFIED' ||
          item.status === 'INSTALLED_CLOSED' ||
          item.lifecycleStatus === 'INSTALLED_DEPLOYED';
        if (!isConnected) return false;
      } else if (equipmentTab === 'AWAITING') {
        const isAwaiting =
          item.verificationStatus === 'AWAITING_VERIFICATION' ||
          item.status === 'AWAITING_ADMIN_VERIFICATION' ||
          item.status === 'SUSPECTED_DUPLICATE';
        if (!isAwaiting) return false;
      } else if (equipmentTab === 'REJECTED') {
        const isRejected =
          (item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' &&
            item.adminVerificationStatus === 'REJECTED') ||
          item.status === 'REJECTED_INVALID_TAG';
        if (!isRejected) return false;
      }

      // Category filter
      if (equipmentCategoryFilter !== 'ALL' && item.category !== equipmentCategoryFilter) {
        return false;
      }

      // Search query
      if (equipmentSearch.trim()) {
        const query = equipmentSearch.toLowerCase().trim();
        const matchesQuery =
          item.serialNumber?.toLowerCase().includes(query) ||
          item.sku?.toLowerCase().includes(query) ||
          item.name?.toLowerCase().includes(query) ||
          item.customerAccountNumber?.toLowerCase().includes(query) ||
          item.customerName?.toLowerCase().includes(query) ||
          item.customerAddress?.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [selectedTechItems, equipmentTab, equipmentCategoryFilter, equipmentSearch, selectedTech]);

  // Excel export triggers
  const handleExportFleetExcel = () => {
    downloadTechnicianExcelFile({
      technicians,
      inventory,
      selectedTechId: 'ALL',
      currentUser,
    });
  };

  const handleExportSingleTechExcel = (tech: Technician) => {
    downloadTechnicianExcelFile({
      technicians,
      inventory,
      selectedTechId: tech.id,
      currentUser,
    });
  };

  // ==========================================
  // VIEW 1: TECHNICIANS FLEET DATA TABLE VIEW
  // ==========================================
  if (!selectedTech) {
    return (
      <div className="flex-1 min-w-0 h-full p-6 overflow-y-auto space-y-6 bg-slate-50/50">
        {/* Top Header & Overview Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-teal-500/10 text-teal-800 border border-teal-500/20">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Technician Roster
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage van stock, manifests, and warehouse usage.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Export All Technician Accounts to Excel */}
            <button
              type="button"
              onClick={handleExportFleetExcel}
              className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span>Export Fleet Excel (Slots & Pairing)</span>
            </button>

            {canAssign && (
              <button
                type="button"
                onClick={() => onOpenAssignToTech(technicians[0])}
                className="px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                <span>Assign to Tech</span>
              </button>
            )}
          </div>
        </div>

        {/* Fleet KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Fleet Personnel</p>
              <p className="text-xl font-black text-slate-900 font-mono">{technicians.length}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Total In Van Custody</p>
              <p className="text-xl font-black text-cyan-950 font-mono">{totalFleetInCustody} units</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-700 border border-amber-100 flex items-center justify-center shrink-0">
              <Clock3 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Pending Verification</p>
              <p className="text-xl font-black text-amber-950 font-mono">{totalFleetPending}</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 border border-red-100 flex items-center justify-center shrink-0">
              <Flag className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500">Flagged Accounts</p>
              <p className="text-xl font-black text-red-950 font-mono">{totalFleetFlagged}</p>
            </div>
          </div>
        </div>

        {/* Technicians Data Table Container */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Table Controls & Filter Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={fleetSearchQuery}
                onChange={(e) => setFleetSearchQuery(e.target.value)}
                placeholder="Search technician by name, employee ID, van, or area..."
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>

            {/* Filter Group */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold text-slate-500">Area:</span>
                <select
                  value={selectedAreaFilter}
                  onChange={(e) => setSelectedAreaFilter(e.target.value)}
                  className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="ALL">All Areas</option>
                  {distinctAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600 ml-2">
                <span className="font-semibold text-slate-500">Filter:</span>
                <select
                  value={fleetCustodyFilter}
                  onChange={(e) => setFleetCustodyFilter(e.target.value as any)}
                  className="bg-white border border-slate-200 text-xs rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                >
                  <option value="ALL">All Technicians</option>
                  <option value="WITH_CUSTODY">With Equipment in Van</option>
                  <option value="WITH_PENDING">With Pending Verifications</option>
                  <option value="FLAGGED">Flagged / Restricted Only</option>
                </select>
              </div>
            </div>
          </div>

          {/* Roster Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 text-slate-800 font-bold text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[200px]">Technician Personnel</th>
                  <th className="px-4 py-3.5 whitespace-nowrap min-w-[140px]">Account Validity</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[120px]">On-Hand Stocks</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[120px]">Warehouse Utilized</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[120px]">Pending Approval</th>
                  <th className="px-4 py-3.5 whitespace-nowrap text-right min-w-[180px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTechnicians.length > 0 ? (
                  filteredTechnicians.map((tech) => {
                    const stats = technicianStatsMap[tech.id] || {
                      inCustodyCount: 0,
                      awaitingVerificationCount: 0,
                      connectedCount: 0,
                      rejectedCount: 0,
                      totalAssociated: 0,
                      utilizedCount: 0,
                    };

                    const initials = getUserInitials(tech.name);

                    return (
                      <tr
                        key={tech.id}
                        onClick={() => setSelectedTechId(tech.id)}
                        className="hover:bg-teal-50/40 transition-colors cursor-pointer group"
                      >
                        {/* Technician Name & Avatar */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0 border border-teal-600 shadow-2xs">
                              {initials}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 group-hover:text-teal-900 transition-colors">
                                {tech.name}
                              </p>
                              <span className="font-mono text-[10px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                {tech.employeeId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Account Validity Status */}
                        <td className="px-4 py-3.5 whitespace-nowrap">
                          {tech.isFlagged ? (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300"
                              title={tech.flagReason}
                            >
                              <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                              <span>FLAGGED HOLD</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>CLEAR</span>
                            </span>
                          )}
                        </td>

                        {/* On-Hand Van Stock */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-200">
                            {stats.inCustodyCount} units
                          </span>
                        </td>

                        {/* Warehouse Stock Utilized */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono text-slate-700">
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                            {stats.utilizedCount} used
                          </span>
                        </td>

                        {/* Pending Verification */}
                        <td className="px-4 py-3.5 text-center whitespace-nowrap font-mono">
                          {stats.awaitingVerificationCount > 0 ? (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                              {stats.awaitingVerificationCount}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportSingleTechExcel(tech);
                              }}
                              title="Export Technician Excel Manifest"
                              className="p-1.5 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 transition-colors cursor-pointer"
                            >
                              <FileSpreadsheet className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTechForModal(tech);
                                setIsFlagModalOpen(true);
                              }}
                              title="Manage Flag & Validity Status"
                              className={`p-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                                tech.isFlagged
                                  ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <Flag className="w-3.5 h-3.5" />
                            </button>

                            {canAssign && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenAssignToTech(tech);
                                }}
                                title={`Assign inventory stock directly to ${tech.name}`}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-teal-700" />
                                <span>Assign</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTechId(tech.id);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg font-bold text-xs shadow-2xs transition-all cursor-pointer"
                            >
                              <span>Manage</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center bg-white text-slate-500 text-xs">
                      <div className="max-w-xs mx-auto space-y-2">
                        <User className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="font-semibold text-slate-700">No field technicians match your search</p>
                        <p className="text-slate-400 text-[11px]">
                          Try adjusting your search query or area filter.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setFleetSearchQuery('');
                            setSelectedAreaFilter('ALL');
                            setFleetCustodyFilter('ALL');
                          }}
                          className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal for Flagging from fleet table */}
        {activeTechForModal && (
          <FlagTechnicianModal
            isOpen={isFlagModalOpen}
            onClose={() => {
              setIsFlagModalOpen(false);
              setActiveTechForModal(null);
            }}
            technician={activeTechForModal}
            currentUser={currentUser}
            onToggleFlag={(techId, isFlagged, reason) => {
              if (onToggleFlagTechnician) {
                onToggleFlagTechnician(techId, isFlagged, reason);
              }
            }}
          />
        )}
      </div>
    );
  }

  // ==========================================================
  // VIEW 2: DEDICATED TECHNICIAN DETAIL PAGE (EQUIPMENT & CUSTODY)
  // ==========================================================
  const selectedStats = technicianStatsMap[selectedTech.id] || {
    inCustodyCount: techAssignedVanItems.length,
    awaitingVerificationCount: techAwaitingVerificationItems.length,
    connectedCount: techConnectedItems.length,
    rejectedCount: techRejectedItems.length,
    totalAssociated: selectedTechItems.length,
    utilizedCount: 0,
  };

  const techInitials = getUserInitials(selectedTech.name);

  return (
    <div className="flex-1 min-w-0 h-full p-6 overflow-y-auto space-y-6 bg-slate-50/50">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSelectedTechId(null)}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors border border-slate-200 flex items-center gap-1.5 text-xs font-bold cursor-pointer shrink-0"
            title="Return to technicians roster"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Roster</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                {selectedTech.name}
              </h1>
              <span className="font-mono text-xs font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                {selectedTech.employeeId}
              </span>
              {selectedTech.isFlagged ? (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                  <span>FLAGGED HOLD</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>VALIDITY CLEAR</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
              <span>
                <Truck className="w-3 h-3 inline mr-1 text-teal-700" />
                {selectedTech.assignedVan}
              </span>
              •
              <span>
                <MapPin className="w-3 h-3 inline mr-1 text-teal-700" />
                {selectedTech.area}
              </span>
              •
              <span>
                <Phone className="w-3 h-3 inline mr-1 text-slate-400" />
                {selectedTech.phone}
              </span>
              •
              <span>
                <Building2 className="w-3 h-3 inline mr-1 text-slate-400" />
                Hub: {selectedTech.hubAddress}
              </span>
            </p>
          </div>
        </div>

        {/* Top Detail Page Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export to Excel */}
          <button
            type="button"
            onClick={() => handleExportSingleTechExcel(selectedTech)}
            className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-emerald-300 transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Excel Manifest</span>
          </button>

          {/* Warehouse Stock Utilization */}
          <button
            type="button"
            onClick={() => setIsUtilizationModalOpen(true)}
            className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 rounded-lg text-xs font-bold flex items-center gap-1.5 border border-teal-300 transition-colors cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-teal-700" />
            <span>Check Utilization</span>
          </button>

          {/* Flag / Manage Technician Status */}
          <button
            type="button"
            onClick={() => setIsFlagModalOpen(true)}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 border transition-colors cursor-pointer ${
              selectedTech.isFlagged
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${selectedTech.isFlagged ? 'text-amber-700' : 'text-slate-500'}`} />
            <span>{selectedTech.isFlagged ? 'Manage Flag Status' : 'Flag Tech'}</span>
          </button>

          {canAssign && (
            <button
              type="button"
              onClick={() => onOpenAssignToTech(selectedTech)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Assign Equipment</span>
            </button>
          )}
        </div>
      </div>

      {/* Flag Warning Banner if Flagged */}
      {selectedTech.isFlagged && (
        <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-200/80 text-amber-900 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950">
                Technician Account Currently Flagged: Operational Restriction Active
              </h3>
              <p className="text-xs text-amber-900 font-semibold mt-0.5">
                Flag Reason: <strong className="text-amber-950 font-bold">{selectedTech.flagReason}</strong>
              </p>
              <p className="text-[11px] text-amber-800 mt-1">
                Flagged by: {selectedTech.flaggedBy || 'Supervisor'} • Date: {selectedTech.flaggedAt ? new Date(selectedTech.flaggedAt).toLocaleDateString() : 'Active'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsFlagModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold bg-amber-800 hover:bg-amber-900 text-white rounded-lg transition-colors cursor-pointer shrink-0"
          >
            Review Flag
          </button>
        </div>
      )}

      {/* Technician Profile Card & Custody KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total On-Hand Stocks */}
        <div
          onClick={() => setEquipmentTab('ASSIGNED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            equipmentTab === 'ASSIGNED'
              ? 'bg-cyan-50/90 border-cyan-400 ring-2 ring-cyan-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-900">
              Total On-Hand Van Stock
            </span>
            <Package className="w-4 h-4 text-cyan-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-950 font-mono">
              {techAssignedVanItems.reduce((s, i) => s + (i.quantity || 1), 0)}
            </span>
            <span className="text-xs text-cyan-800 font-medium">units</span>
          </div>
          <p className="text-[10px] text-cyan-700 mt-1">
            {techAssignedVanItems.length} products currently handled in van
          </p>
        </div>

        {/* Card 2: Warehouse Stock Utilized */}
        <div
          onClick={() => setIsUtilizationModalOpen(true)}
          className="p-4 rounded-xl border bg-white border-slate-200 hover:border-emerald-300 shadow-2xs transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              Warehouse Utilized (Used)
            </span>
            <BarChart3 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              {selectedStats.utilizedCount}
            </span>
            <span className="text-xs text-emerald-800 font-medium">units</span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1">
            Click to check warehouse items used vs on-hand
          </p>
        </div>

        {/* Card 3: Pending Verification */}
        <div
          onClick={() => setEquipmentTab('AWAITING')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            equipmentTab === 'AWAITING'
              ? 'bg-amber-50/90 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
              Pending Admin Approval
            </span>
            <Clock3 className="w-4 h-4 text-amber-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-950 font-mono">
              {techAwaitingVerificationItems.length}
            </span>
            <span className="text-xs text-amber-800 font-medium">accounts</span>
          </div>
          <p className="text-[10px] text-amber-700 mt-1">Submitted closures waiting for QA</p>
        </div>

        {/* Card 4: Connected Accounts */}
        <div
          onClick={() => setEquipmentTab('CONNECTED')}
          className={`p-4 rounded-xl border transition-all cursor-pointer ${
            equipmentTab === 'CONNECTED'
              ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900">
              Connected Subscribers
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-950 font-mono">
              {techConnectedItems.length}
            </span>
            <span className="text-xs text-emerald-800 font-medium">live lines</span>
          </div>
          <p className="text-[10px] text-emerald-700 mt-1">Verified fiber connections</p>
        </div>
      </div>

      {/* Equipment Detailed Data Table with Slot Tracking & Pairing */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Header & Segmented Tabs */}
        <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Package className="w-4 h-4 text-teal-700" />
                Equipment Inventory, Slot Tracking & Pairing Record
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Displays all products handled by this technician with Excel slot numbers, pairing status, and warehouse utilization
              </p>
            </div>

            {/* Quick Search */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={equipmentSearch}
                onChange={(e) => setEquipmentSearch(e.target.value)}
                placeholder="Search serial, SKU, slot #, account #..."
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600"
              />
            </div>
          </div>

          {/* Filter Tabs Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setEquipmentTab('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                equipmentTab === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Handled Products ({selectedTechItems.length})
            </button>

            <button
              type="button"
              onClick={() => setEquipmentTab('ASSIGNED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                equipmentTab === 'ASSIGNED'
                  ? 'bg-cyan-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              In Van Custody ({techAssignedVanItems.length})
            </button>

            <button
              type="button"
              onClick={() => setEquipmentTab('CONNECTED')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                equipmentTab === 'CONNECTED'
                  ? 'bg-emerald-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Connected to Subscriber ({techConnectedItems.length})
            </button>

            <button
              type="button"
              onClick={() => setEquipmentTab('AWAITING')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                equipmentTab === 'AWAITING'
                  ? 'bg-amber-700 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              Pending Admin Verification ({techAwaitingVerificationItems.length})
            </button>

            {techRejectedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setEquipmentTab('REJECTED')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  equipmentTab === 'REJECTED'
                    ? 'bg-red-700 text-white'
                    : 'bg-white border border-slate-200 text-red-700 hover:bg-red-50'
                }`}
              >
                Action Required ({techRejectedItems.length})
              </button>
            )}
          </div>
        </div>

        {/* Equipment Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-800 font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[170px]">Serial Number / SKU</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[200px]">Equipment Description</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[100px]">Slot #</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[110px]">Pairing Status</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-center min-w-[110px]">Stock Qty</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Status & Lifecycle</th>
                <th className="px-4 py-3.5 whitespace-nowrap min-w-[180px]">Subscriber Binding</th>
                <th className="px-4 py-3.5 whitespace-nowrap text-right min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipment.length > 0 ? (
                filteredEquipment.map((item, idx) => {
                  const isAssignedVan =
                    item.assignedTechnicianId === selectedTech.id &&
                    (item.lifecycleStatus === 'ASSIGNED_RESERVED' || item.status === 'ASSIGNED') &&
                    (item.verificationStatus === 'UNLINKED_READY' || !item.customerAccountNumber);

                  const isConnected =
                    item.verificationStatus === 'VERIFIED_CONNECTED' ||
                    item.status === 'INSTALLED_VERIFIED' ||
                    item.status === 'INSTALLED_CLOSED' ||
                    item.lifecycleStatus === 'INSTALLED_DEPLOYED';

                  const isAwaiting =
                    item.verificationStatus === 'AWAITING_VERIFICATION' ||
                    item.status === 'AWAITING_ADMIN_VERIFICATION' ||
                    item.status === 'SUSPECTED_DUPLICATE';

                  const isRejected =
                    (item.verificationStatus === 'FLAGGED_ACTION_REQUIRED' &&
                      item.adminVerificationStatus === 'REJECTED') ||
                    item.status === 'REJECTED_INVALID_TAG';

                  const slot =
                    item.slotNumber || `SLOT-${String((idx % 24) + 1).padStart(2, '0')}`;

                  const isPaired =
                    item.pairingStatus === 'PAIRED' ||
                    Boolean(item.pairedItemSerial) ||
                    Boolean(item.pairedItemId);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => onSelectItemDetail(item)}
                      className="hover:bg-teal-50/30 transition-colors cursor-pointer"
                    >
                      {/* Serial Number / SKU */}
                      <td className="px-4 py-3.5">
                        <div className="space-y-0.5">
                          <p className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                            <Barcode className="w-3.5 h-3.5 text-teal-700" />
                            {item.serialNumber || 'NON-SERIALIZED'}
                          </p>
                          <span className="font-mono text-[10px] text-slate-500">{item.sku}</span>
                        </div>
                      </td>

                      {/* Equipment Name & Model */}
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <p className="text-[10px] text-slate-500 capitalize">
                            {item.category?.toLowerCase().replace(/_/g, ' ')} • {item.storageBin}
                          </p>
                        </div>
                      </td>

                      {/* Slot # */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-teal-900">
                        <span className="px-2 py-0.5 rounded bg-teal-50 border border-teal-200">
                          {slot}
                        </span>
                      </td>

                      {/* Pairing Status */}
                      <td className="px-4 py-3.5 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            isPaired
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {isPaired ? 'PAIRED' : 'UNPAIRED'}
                        </span>
                        {isPaired && item.pairedItemName && (
                          <p className="text-[9px] text-emerald-800 font-semibold truncate max-w-[120px] mx-auto mt-0.5">
                            ↔ {item.pairedItemName}
                          </p>
                        )}
                      </td>

                      {/* Stock Quantity */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-800">
                        {item.quantity} {item.unit}
                      </td>

                      {/* Status & Lifecycle Badges */}
                      <td className="px-4 py-3.5">
                        <DualStatusBadge
                          lifecycleStatus={item.lifecycleStatus}
                          verificationStatus={item.verificationStatus}
                          legacyStatus={item.status}
                          layout="row"
                          size="sm"
                          showCategoryHeaders={false}
                        />
                      </td>

                      {/* Subscriber / Target Binding */}
                      <td className="px-4 py-3.5">
                        {item.customerAccountNumber ? (
                          <div className="space-y-0.5">
                            <p className="font-mono font-bold text-teal-950">
                              {item.customerAccountNumber}
                            </p>
                            <p className="text-slate-700 font-medium line-clamp-1">{item.customerName}</p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            In Van Custody (Unlinked)
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectItemDetail(item);
                            }}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>

                          {isAssignedVan && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenClosure(item);
                              }}
                              className="px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <Send className="w-3 h-3" />
                              <span>Submit Tag</span>
                            </button>
                          )}

                          {isRejected && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenClosure(item);
                              }}
                              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shadow-2xs transition-all cursor-pointer"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Fix Tag</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center bg-white text-slate-500 text-xs">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">No equipment found in this tab</p>
                      <p className="text-slate-400 text-[11px]">
                        Try switching tabs or clearing the search query.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SUB-MODALS FOR TECHNICIAN DETAIL VIEW */}
      {selectedTech && (
        <>
          <FlagTechnicianModal
            isOpen={isFlagModalOpen}
            onClose={() => setIsFlagModalOpen(false)}
            technician={selectedTech}
            currentUser={currentUser}
            onToggleFlag={(techId, isFlagged, reason) => {
              if (onToggleFlagTechnician) {
                onToggleFlagTechnician(techId, isFlagged, reason);
              }
            }}
          />

          <WarehouseUtilizationModal
            isOpen={isUtilizationModalOpen}
            onClose={() => setIsUtilizationModalOpen(false)}
            technician={selectedTech}
            inventory={inventory}
            currentUser={currentUser}
            onUpdateUtilization={(itemId, qty, notes) => {
              if (onUpdateUtilization) {
                onUpdateUtilization(itemId, qty, notes);
              }
            }}
          />
        </>
      )}
    </div>
  );
};
