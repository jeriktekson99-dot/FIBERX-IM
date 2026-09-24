import React, { useState } from 'react';
import { Technician, InventoryItem, UserProfile, CATEGORY_LABELS } from '../../types';
import { X, CheckCircle2, Package, Search, Filter, ArrowUpRight, BarChart3, Clock, AlertCircle } from 'lucide-react';

export interface WarehouseUtilizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  technician: Technician;
  inventory: InventoryItem[];
  currentUser: UserProfile;
  onUpdateUtilization: (itemId: string, utilizedQuantity: number, notes?: string) => void;
}

export const WarehouseUtilizationModal: React.FC<WarehouseUtilizationModalProps> = ({
  isOpen,
  onClose,
  technician,
  inventory,
  currentUser,
  onUpdateUtilization,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'UTILIZED' | 'ON_HAND' | 'PARTIAL'>('ALL');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [inputUtilizedQty, setInputUtilizedQty] = useState<number>(0);
  const [utilizationNotes, setUtilizationNotes] = useState<string>('');

  if (!isOpen) return null;

  // Filter items assigned or dispatched to this technician from the warehouse
  const techItems = inventory.filter(
    (item) =>
      !item.archived &&
      (item.assignedTechnicianId === technician.id ||
        item.submittedByTechnicianId === technician.id ||
        item.closedByTechnicianId === technician.id)
  );

  // Compute statistics
  const totalAllocatedUnits = techItems.reduce((sum, item) => sum + (item.quantity || 1), 0);

  const totalUtilizedUnits = techItems.reduce((sum, item) => {
    if (item.utilizedQuantity !== undefined) return sum + item.utilizedQuantity;
    if (
      item.verificationStatus === 'VERIFIED_CONNECTED' ||
      item.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
      item.status === 'INSTALLED_VERIFIED' ||
      item.status === 'INSTALLED_CLOSED'
    ) {
      return sum + (item.quantity || 1);
    }
    return sum;
  }, 0);

  const totalOnHandUnits = Math.max(0, totalAllocatedUnits - totalUtilizedUnits);
  const utilizationPercentage =
    totalAllocatedUnits > 0 ? Math.round((totalUtilizedUnits / totalAllocatedUnits) * 100) : 0;

  // Filter items based on user selection and search query
  const filteredItems = techItems.filter((item) => {
    const utilized =
      item.utilizedQuantity !== undefined
        ? item.utilizedQuantity
        : item.verificationStatus === 'VERIFIED_CONNECTED' ||
          item.lifecycleStatus === 'INSTALLED_DEPLOYED'
        ? item.quantity
        : 0;

    const remaining = Math.max(0, item.quantity - utilized);

    if (filterType === 'UTILIZED' && (utilized === 0 || remaining > 0)) return false;
    if (filterType === 'ON_HAND' && utilized > 0) return false;
    if (filterType === 'PARTIAL' && (utilized === 0 || remaining === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchSerial = item.serialNumber?.toLowerCase().includes(q);
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchAccount = item.customerAccountNumber?.toLowerCase().includes(q);
      return matchName || matchSerial || matchSku || matchAccount;
    }

    return true;
  });

  const handleStartEdit = (item: InventoryItem) => {
    const currentUtilized =
      item.utilizedQuantity !== undefined
        ? item.utilizedQuantity
        : item.verificationStatus === 'VERIFIED_CONNECTED' ||
          item.lifecycleStatus === 'INSTALLED_DEPLOYED'
        ? item.quantity
        : 0;
    setEditingItemId(item.id);
    setInputUtilizedQty(currentUtilized);
    setUtilizationNotes(item.utilizedNotes || '');
  };

  const handleSaveUtilization = (itemId: string, maxQty: number) => {
    const validQty = Math.max(0, Math.min(inputUtilizedQty, maxQty));
    onUpdateUtilization(itemId, validQty, utilizationNotes);
    setEditingItemId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Warehouse Stock Utilization Tracker
              </h2>
              <p className="text-xs text-slate-500">
                Technician: <strong className="text-slate-800">{technician.name}</strong> ({technician.employeeId}) •{' '}
                {technician.assignedVan}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Metric Cards */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 shrink-0">
          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Total Dispatched from Warehouse
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 font-mono">{totalAllocatedUnits}</span>
              <span className="text-xs text-slate-500">units</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">{techItems.length} line items total</span>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 shadow-2xs">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
              Utilized / Installed in Field
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-800 font-mono">{totalUtilizedUnits}</span>
              <span className="text-xs text-emerald-600 font-semibold">units used</span>
            </div>
            <span className="text-[10px] text-emerald-700 mt-0.5 block font-medium">
              Deployed & connected to accounts
            </span>
          </div>

          <div className="p-3.5 bg-teal-50/70 rounded-xl border border-teal-200 shadow-2xs">
            <span className="text-[11px] font-bold text-teal-800 uppercase tracking-wider block">
              Remaining On-Hand in Van
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-teal-900 font-mono">{totalOnHandUnits}</span>
              <span className="text-xs text-teal-700 font-semibold">units unutilized</span>
            </div>
            <span className="text-[10px] text-teal-700 mt-0.5 block font-medium">
              Ready for subscriber dispatch
            </span>
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Overall Utilization Rate
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900 font-mono">{utilizationPercentage}%</span>
              <span className="text-xs text-slate-500">used</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all"
                style={{ width: `${utilizationPercentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, serial, SKU or account..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(
              [
                { id: 'ALL', label: 'All Items' },
                { id: 'UTILIZED', label: 'Utilized (Used)' },
                { id: 'ON_HAND', label: 'On-Hand (Unused)' },
                { id: 'PARTIAL', label: 'Partial Usage' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${
                  filterType === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table List of Warehouse Stock Utilization */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              No warehouse equipment matched the selected filter.
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-3.5 py-2.5">Warehouse Equipment / SKU</th>
                    <th className="px-3 py-2.5">Serial / Barcode</th>
                    <th className="px-3 py-2.5 text-center">Allocated</th>
                    <th className="px-3 py-2.5 text-center">Utilized (Used)</th>
                    <th className="px-3 py-2.5 text-center">On-Hand Remaining</th>
                    <th className="px-3 py-2.5 text-center">Slot / Pairing</th>
                    <th className="px-3 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredItems.map((item, idx) => {
                    const isEditing = editingItemId === item.id;
                    const utilized =
                      item.utilizedQuantity !== undefined
                        ? item.utilizedQuantity
                        : item.verificationStatus === 'VERIFIED_CONNECTED' ||
                          item.lifecycleStatus === 'INSTALLED_DEPLOYED'
                        ? item.quantity
                        : 0;
                    const remaining = Math.max(0, item.quantity - utilized);
                    const isFullyUsed = utilized >= item.quantity;
                    const slotNum = item.slotNumber || `SLOT-${String((idx % 24) + 1).padStart(2, '0')}`;
                    const isPaired =
                      item.pairingStatus === 'PAIRED' ||
                      Boolean(item.pairedItemSerial) ||
                      Boolean(item.pairedItemId);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-3.5 py-2.5">
                          <p className="font-bold text-slate-900">{item.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                            <span className="font-mono">{item.sku}</span>
                            <span>•</span>
                            <span>{CATEGORY_LABELS[item.category] || item.category}</span>
                          </div>
                          {item.customerAccountNumber && (
                            <p className="text-[10px] text-teal-700 font-semibold mt-0.5">
                              Installed to: {item.customerAccountNumber} ({item.customerName || 'Customer'})
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {item.serialNumber || 'N/A'}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-700">
                          {item.quantity} {item.unit}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                max={item.quantity}
                                value={inputUtilizedQty}
                                onChange={(e) => setInputUtilizedQty(parseInt(e.target.value) || 0)}
                                className="w-16 px-1.5 py-1 text-xs border border-teal-500 rounded font-mono font-bold text-center focus:outline-none"
                              />
                              <span className="text-[10px] text-slate-500">/ {item.quantity}</span>
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                isFullyUsed
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : utilized > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {isFullyUsed && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                              {utilized} {item.unit} ({Math.round((utilized / item.quantity) * 100)}%)
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-2.5 text-center font-mono font-bold text-teal-800">
                          {remaining} {item.unit}
                        </td>

                        <td className="px-3 py-2.5 text-center">
                          <div className="inline-flex flex-col items-center gap-0.5">
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {slotNum}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-1 rounded ${
                                isPaired ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-50'
                              }`}
                            >
                              {isPaired ? 'PAIRED' : 'UNPAIRED'}
                            </span>
                            {isPaired && item.pairedItemName && (
                              <span className="text-[8px] font-medium text-emerald-800 truncate max-w-[90px]">
                                ↔ {item.pairedItemName}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-2.5 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleSaveUtilization(item.id, item.quantity)}
                                className="px-2.5 py-1 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded text-[11px] cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              className="px-2.5 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded transition-colors cursor-pointer"
                            >
                              Update Used Qty
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Utilization counts update in real-time and are reflected in Excel exports and warehouse audits.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
