import React, { useState } from 'react';
import { UserProfile, ItemCategory, FilterState, InventoryItem } from '../../types';
import {
  LayoutDashboard,
  Boxes,
  Truck,
  FileCheck2,
  Wifi,
  Cable,
  GitFork,
  Radio,
  SlidersHorizontal,
  Archive,
  AlertCircle,
  Clock,
  Sparkles,
  Layers,
  ChevronDown,
  Activity,
  Users,
} from 'lucide-react';

interface SidebarProps {
  currentTab: 'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users' | 'archive';
  onSelectTab: (tab: 'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users' | 'archive') => void;
  currentUser: UserProfile;
  inventory: InventoryItem[];
  filterState: FilterState;
  onUpdateFilter: (updates: Partial<FilterState>) => void;
  userCount?: number;
  onOpenSupabaseModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  inventory,
  filterState,
  onUpdateFilter,
  userCount,
  onOpenSupabaseModal,
}) => {
  // Compute real-time category counts
  const totalActive = inventory.filter((i) => !i.archived).length;
  const modemsCount = inventory.filter((i) => !i.archived && i.category === 'MODEM_ONT').length;
  const cablesCount = inventory.filter((i) => !i.archived && i.category === 'FIBER_CABLE').length;
  const splittersCount = inventory.filter((i) => !i.archived && i.category === 'SPLITTER').length;
  const patchCount = inventory.filter((i) => !i.archived && i.category === 'PATCH_CORD').length;
  const accessoryCount = inventory.filter((i) => !i.archived && i.category === 'ACCESSORY').length;

  const inStockCount = inventory.filter(
    (i) => !i.archived && (i.lifecycleStatus === 'IN_STOCK' || (!i.lifecycleStatus && i.status === 'IN_STOCK'))
  ).length;
  const assignedCount = inventory.filter(
    (i) =>
      !i.archived &&
      (i.lifecycleStatus === 'ASSIGNED_RESERVED' || (!i.lifecycleStatus && i.status === 'ASSIGNED'))
  ).length;
  const awaitingCount = inventory.filter(
    (i) =>
      !i.archived &&
      (i.verificationStatus === 'AWAITING_VERIFICATION' ||
        (!i.verificationStatus &&
          (i.status === 'AWAITING_ADMIN_VERIFICATION' || i.status === 'SUSPECTED_DUPLICATE')))
  ).length;
  const closedCount = inventory.filter(
    (i) =>
      !i.archived &&
      (i.verificationStatus === 'VERIFIED_CONNECTED' ||
        i.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
        (!i.verificationStatus &&
          (i.status === 'INSTALLED_VERIFIED' || i.status === 'INSTALLED_CLOSED')))
  ).length;
  const archivedCount = inventory.filter((i) => i.archived).length;

  // Field Tech specific count if applicable
  const myAssignedCount = currentUser.technicianId
    ? inventory.filter(
        (i) =>
          !i.archived &&
          i.assignedTechnicianId === currentUser.technicianId &&
          (i.lifecycleStatus === 'ASSIGNED_RESERVED' ||
            i.verificationStatus === 'AWAITING_VERIFICATION' ||
            i.verificationStatus === 'FLAGGED_ACTION_REQUIRED' ||
            i.status === 'ASSIGNED' ||
            i.status === 'AWAITING_ADMIN_VERIFICATION' ||
            i.status === 'SUSPECTED_DUPLICATE' ||
            i.status === 'REJECTED_INVALID_TAG')
      ).length
    : 0;

  const [isCategoriesOpen, setIsCategoriesOpen] = useState(true);
  const [isStatusOpen, setIsStatusOpen] = useState(true);

  return (
    <aside className="w-64 shrink-0 h-full bg-white border-r border-slate-200 flex flex-col justify-between select-none overflow-hidden z-10">
      <div className="p-4 space-y-6 overflow-y-auto flex-1 overscroll-contain">
        {/* Main Navigation Links */}
        <div className="space-y-1">
          <div className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Operations Console
          </div>

          <button
            onClick={() => onSelectTab('dashboard')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              currentTab === 'dashboard'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard / Analytics
            </span>
          </button>

          <button
            onClick={() => {
              onSelectTab('inventory');
              onUpdateFilter({ category: 'ALL', status: 'ALL', onlyUnclosed: false, viewMode: 'active' });
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              currentTab === 'inventory'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Boxes className="w-4 h-4" />
              Stock Inventory
            </span>
          </button>

          <button
            onClick={() => onSelectTab('technicians')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              currentTab === 'technicians'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Truck className="w-4 h-4" />
              Technician Hub
            </span>
          </button>

          <button
            onClick={() => onSelectTab('closures')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              currentTab === 'closures'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <FileCheck2 className="w-4 h-4" />
              Verification & Closures
            </span>
          </button>

          <button
            onClick={() => onSelectTab('users')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              currentTab === 'users'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              Manage Users
            </span>
          </button>

          <button
            onClick={() => onSelectTab('archive')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              currentTab === 'archive'
                ? 'bg-teal-700 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Archive className="w-4 h-4" />
              Archive Vault
            </span>
          </button>

          {/* Hardware Categories Dropdown Box */}
          <button
            type="button"
            onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer group text-left"
          >
            <span className="flex items-center gap-2.5">
              <SlidersHorizontal className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
              <span>Hardware Categories</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                isCategoriesOpen ? '' : '-rotate-90'
              }`}
            />
          </button>

          {isCategoriesOpen && (
            <div className="pl-3 ml-3 border-l border-slate-200 space-y-0.5 my-1">
              {[
                { id: 'ALL', label: 'All Categories', icon: Layers, count: totalActive },
                { id: 'MODEM_ONT', label: 'Modems & ONTs', icon: Wifi, count: modemsCount },
                { id: 'FIBER_CABLE', label: 'Fiber Drop Cables', icon: Cable, count: cablesCount },
                { id: 'SPLITTER', label: 'Optical Splitters', icon: GitFork, count: splittersCount },
                { id: 'PATCH_CORD', label: 'Patch Cords & Fast-Con', icon: Radio, count: patchCount },
                { id: 'ACCESSORY', label: 'Accessories & Clamps', icon: Boxes, count: accessoryCount },
              ].map((cat) => {
                const isSelected =
                  currentTab === 'inventory' &&
                  (filterState.category === cat.id || (cat.id === 'ALL' && filterState.category === 'ALL'));
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onSelectTab('inventory');
                      onUpdateFilter({ category: cat.id, subCategory: 'ALL', viewMode: 'active' });
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-teal-50 text-teal-900 font-bold border border-teal-200'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <cat.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-700' : 'text-slate-400'}`} />
                      {cat.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{cat.count}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Operational Status Dropdown Box */}
          <button
            type="button"
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer group text-left"
          >
            <span className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-slate-700 group-hover:text-slate-900" />
              <span>Operational Status</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-transform duration-200 ${
                isStatusOpen ? '' : '-rotate-90'
              }`}
            />
          </button>

          {isStatusOpen && (
            <div className="pl-3 ml-3 border-l border-slate-200 space-y-0.5 my-1">
              {[
                { id: 'ALL', label: 'All Active Items', color: 'bg-slate-400', count: totalActive },
                { id: 'IN_STOCK', label: 'In Stock (Warehouse)', color: 'bg-teal-600', count: inStockCount },
                { id: 'ASSIGNED', label: 'Assigned to Field Vans', color: 'bg-cyan-600', count: assignedCount },
                { id: 'AWAITING_ADMIN_VERIFICATION', label: 'Awaiting Admin Review', color: 'bg-amber-500', count: awaitingCount },
                { id: 'INSTALLED_VERIFIED', label: 'Installed & Verified', color: 'bg-emerald-600', count: closedCount },
                { id: 'ARCHIVED', label: 'Archived (Soft Deleted)', color: 'bg-slate-600', count: archivedCount },
              ].map((st) => {
                const isSelected =
                  st.id === 'ARCHIVED'
                    ? currentTab === 'archive' || (currentTab === 'inventory' && filterState.viewMode === 'archived')
                    : currentTab === 'inventory' && filterState.status === st.id && filterState.viewMode === 'active';
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      if (st.id === 'ARCHIVED') {
                        onSelectTab('archive');
                      } else {
                        onSelectTab('inventory');
                        onUpdateFilter({ viewMode: 'active', status: st.id });
                      }
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 text-slate-900 font-bold border border-slate-300'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${st.color}`} />
                      {st.label}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">{st.count}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Field Technician Specific Quick Portal Banner (if current user is Field Tech) */}
        {currentUser.role === 'TECHNICIAN' && (
          <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-cyan-950">
              <span>My Assigned Van Stock</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-200 text-cyan-900 text-[10px] font-mono font-bold">
                {myAssignedCount} Pending
              </span>
            </div>
            <p className="text-[11px] text-cyan-800">
              Only showing equipment assigned to your employee ID. Tag with customer account # to complete jobs.
            </p>
            <button
              onClick={() => {
                onSelectTab('inventory');
                onUpdateFilter({
                  technicianId: currentUser.technicianId || 'ALL',
                  status: 'ASSIGNED',
                  viewMode: 'active',
                });
              }}
              className="w-full py-1.5 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            >
              View My Pending Closures
            </button>
          </div>
        )}
      </div>

      {/* Sidebar Footer / System Telemetry Info */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 text-[11px] text-slate-500 space-y-1 shrink-0">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-700">FiberX Hub V2.6</span>
          <span className="font-mono text-teal-700 font-bold">ONLINE</span>
        </div>
        <p className="text-[10px] text-slate-400 leading-tight">
          Converge ICT Central Warehouse & Field Dispatch Management Node
        </p>
      </div>
    </aside>
  );
};
