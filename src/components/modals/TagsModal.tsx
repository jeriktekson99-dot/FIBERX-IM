import React, { useState } from 'react';
import { InventoryItem, ItemCategory, FilterState, CATEGORY_LABELS } from '../../types';
import {
  X,
  Tag,
  Boxes,
  Wifi,
  Cable,
  GitFork,
  Radio,
  Check,
  Search,
  Filter,
} from 'lucide-react';

interface TagsModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onApplyTagFilter: (category: ItemCategory | 'ALL', status?: string) => void;
}

export const TagsModal: React.FC<TagsModalProps> = ({
  isOpen,
  onClose,
  inventory,
  onApplyTagFilter,
}) => {
  const [searchTag, setSearchTag] = useState('');

  if (!isOpen) return null;

  // Category tags count
  const categoryTags: Array<{
    id: ItemCategory;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
    count: number;
    color: string;
  }> = [
    {
      id: 'MODEM_ONT',
      name: 'Modems & ONTs',
      description: 'Optical Network Terminals, Wi-Fi 6 Routers, GPON Gateways',
      icon: Wifi,
      count: inventory.filter((i) => !i.archived && i.category === 'MODEM_ONT').length,
      color: 'bg-teal-50 text-teal-800 border-teal-200',
    },
    {
      id: 'FIBER_CABLE',
      name: 'Fiber Drop Cables',
      description: '1-Core Drop FOC, Pre-connectorized spools, 50m-300m assemblies',
      icon: Cable,
      count: inventory.filter((i) => !i.archived && i.category === 'FIBER_CABLE').length,
      color: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    },
    {
      id: 'SPLITTER',
      name: 'Optical Splitters',
      description: 'PLC Splitters 1:8, 1:16 with SC/APC connectors',
      icon: GitFork,
      count: inventory.filter((i) => !i.archived && i.category === 'SPLITTER').length,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
    {
      id: 'PATCH_CORD',
      name: 'Patch Cords & Fast-Con',
      description: 'SC-SC Simplex patch cords, field mechanical connectors',
      icon: Radio,
      count: inventory.filter((i) => !i.archived && i.category === 'PATCH_CORD').length,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      id: 'ACCESSORY',
      name: 'Accessories & Clamps',
      description: 'House brackets, mid-span clamps, fiber terminal boxes, ties',
      icon: Boxes,
      count: inventory.filter((i) => !i.archived && i.category === 'ACCESSORY').length,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    },
  ];

  // Lifecycle status tags
  const statusTags = [
    {
      id: 'IN_STOCK',
      label: 'Warehouse In-Stock',
      count: inventory.filter((i) => !i.archived && (i.lifecycleStatus === 'IN_STOCK' || i.status === 'IN_STOCK')).length,
      badge: 'bg-teal-100 text-teal-800',
    },
    {
      id: 'ASSIGNED',
      label: 'Van Stock Assigned',
      count: inventory.filter((i) => !i.archived && (i.lifecycleStatus === 'ASSIGNED_RESERVED' || i.status === 'ASSIGNED')).length,
      badge: 'bg-cyan-100 text-cyan-800',
    },
    {
      id: 'AWAITING_ADMIN_VERIFICATION',
      label: 'Pending Verification',
      count: inventory.filter((i) => !i.archived && (i.verificationStatus === 'AWAITING_VERIFICATION' || i.status === 'AWAITING_ADMIN_VERIFICATION')).length,
      badge: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'INSTALLED_VERIFIED',
      label: 'Installed & Verified',
      count: inventory.filter((i) => !i.archived && (i.verificationStatus === 'VERIFIED_CONNECTED' || i.status === 'INSTALLED_VERIFIED')).length,
      badge: 'bg-emerald-100 text-emerald-800',
    },
  ];

  const filteredCategories = categoryTags.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTag.toLowerCase()) ||
      c.description.toLowerCase().includes(searchTag.toLowerCase()) ||
      c.id.toLowerCase().includes(searchTag.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tags-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 id="tags-modal-title" className="text-sm font-bold text-slate-900">
                Hardware Category & Barcode Tags
              </h2>
              <p className="text-[11px] text-slate-500">
                Explore equipment categories, filter stock, and generate barcode tags
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

        {/* Search */}
        <div className="p-4 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTag}
              onChange={(e) => setSearchTag(e.target.value)}
              placeholder="Search equipment category or tag..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Primary Hardware Tags */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Hardware Classification Tags:
            </div>

            <div className="space-y-2">
              {filteredCategories.map((cat) => {
                const Icon = cat.icon;
                const itemsInCat = inventory.filter((i) => !i.archived && i.category === cat.id);

                return (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-slate-50/70 transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{cat.name}</h4>
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                            {cat.count} units
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {cat.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyTagFilter(cat.id);
                          onClose();
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-teal-700 hover:bg-teal-50 border border-teal-200 rounded-md transition-colors cursor-pointer"
                        title="Filter DataGrid to this category"
                      >
                        Filter
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operational Status Tags */}
          <div className="space-y-2 pt-3 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Operational Status Tags:
            </div>
            <div className="grid grid-cols-2 gap-2">
              {statusTags.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => {
                    onApplyTagFilter('ALL', st.id);
                    onClose();
                  }}
                  className="p-2.5 text-left rounded-xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors flex items-center justify-between cursor-pointer"
                >
                  <span className="text-xs font-semibold text-slate-800">{st.label}</span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${st.badge}`}>
                    {st.count}
                  </span>
                </button>
              ))}
            </div>
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
