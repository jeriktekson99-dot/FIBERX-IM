import React, { useState, useMemo } from 'react';
import {
  InventoryItem,
  Technician,
  AuditLog,
  UserProfile,
  ItemCategory,
  CATEGORY_LABELS,
  LIFECYCLE_STATUS_LABELS,
} from '../../types';
import {
  Boxes,
  Package,
  Truck,
  AlertTriangle,
  Barcode,
  Clock,
  CheckCircle2,
  Download,
  Layers,
  FileSpreadsheet,
  Warehouse,
  ShieldCheck,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface DashboardViewProps {
  inventory: InventoryItem[];
  technicians: Technician[];
  auditLogs: AuditLog[];
  currentUser: UserProfile;
  onNavigateTab: (tab: 'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users') => void;
  onOpenReceive: () => void;
  onOpenScannerHub: () => void;
}

interface SkuInventorySummary {
  sku: string;
  name: string;
  category: ItemCategory;
  modelName: string;
  brand: string;
  inStock: number;
  assigned: number;
  deployed: number;
  defective: number;
  total: number;
  storageBins: string[];
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  inventory,
  technicians: _technicians,
  auditLogs,
  currentUser,
  onNavigateTab,
  onOpenReceive,
  onOpenScannerHub: _onOpenScannerHub,
}) => {
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  // Filter out archived items as the core basis of active stock inventory
  const activeItems = useMemo(() => inventory.filter((i) => !i.archived), [inventory]);

  // Aggregate active inventory by SKU
  const skuSummaries = useMemo<SkuInventorySummary[]>(() => {
    const map: Record<string, SkuInventorySummary> = {};

    activeItems.forEach((item) => {
      const key = item.sku || item.name || 'UNKNOWN-SKU';
      if (!map[key]) {
        map[key] = {
          sku: item.sku || 'N/A',
          name: item.name || 'Unnamed Product',
          category: item.category || 'ACCESSORY',
          modelName: item.modelName || item.name,
          brand: item.brand || 'Standard',
          inStock: 0,
          assigned: 0,
          deployed: 0,
          defective: 0,
          total: 0,
          storageBins: [],
        };
      }

      const entry = map[key];
      const qty = item.quantity && item.quantity > 0 ? item.quantity : 1;
      entry.total += qty;

      if (item.storageBin && !entry.storageBins.includes(item.storageBin)) {
        entry.storageBins.push(item.storageBin);
      }

      const isWarehouseStock =
        item.lifecycleStatus === 'IN_STOCK' ||
        (!item.lifecycleStatus && item.status === 'IN_STOCK');
      const isAssignedTransit =
        item.lifecycleStatus === 'ASSIGNED_RESERVED' ||
        (!item.lifecycleStatus && item.status === 'ASSIGNED');
      const isDeployedSubscriber =
        item.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
        item.verificationStatus === 'VERIFIED_CONNECTED' ||
        item.status === 'INSTALLED_VERIFIED' ||
        item.status === 'INSTALLED_CLOSED';
      const isDefectiveOrRemoved =
        item.lifecycleStatus === 'OUT_OF_STOCK_REMOVED' ||
        item.status === 'DEFECTIVE' ||
        item.status === 'REJECTED_INVALID_TAG';

      if (isWarehouseStock) {
        entry.inStock += qty;
      } else if (isAssignedTransit) {
        entry.assigned += qty;
      } else if (isDeployedSubscriber) {
        entry.deployed += qty;
      } else if (isDefectiveOrRemoved) {
        entry.defective += qty;
      } else {
        entry.inStock += qty;
      }
    });

    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [activeItems]);

  // Core Stock Inventory counts directly from activeItems
  const totalInventoryCount = activeItems.length;

  const inStockWarehouseCount = useMemo(() => {
    return activeItems.filter(
      (i) => i.lifecycleStatus === 'IN_STOCK' || (!i.lifecycleStatus && i.status === 'IN_STOCK')
    ).length;
  }, [activeItems]);

  const assignedTransitCount = useMemo(() => {
    return activeItems.filter(
      (i) =>
        i.lifecycleStatus === 'ASSIGNED_RESERVED' ||
        (!i.lifecycleStatus && i.status === 'ASSIGNED')
    ).length;
  }, [activeItems]);

  const deployedInstalledCount = useMemo(() => {
    return activeItems.filter(
      (i) =>
        i.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
        i.status === 'INSTALLED_VERIFIED' ||
        i.status === 'INSTALLED_CLOSED' ||
        i.verificationStatus === 'VERIFIED_CONNECTED'
    ).length;
  }, [activeItems]);

  // Hardware Category counts directly from activeItems
  const modemsCount = useMemo(() => {
    return activeItems.filter((i) => i.category === 'MODEM_ONT').length;
  }, [activeItems]);

  const fiberCablesCount = useMemo(() => {
    return activeItems.filter((i) => i.category === 'FIBER_CABLE').length;
  }, [activeItems]);

  const splittersAndCordsCount = useMemo(() => {
    return activeItems.filter(
      (i) => i.category === 'SPLITTER' || i.category === 'PATCH_CORD'
    ).length;
  }, [activeItems]);

  const accessoriesCount = useMemo(() => {
    return activeItems.filter((i) => i.category === 'ACCESSORY').length;
  }, [activeItems]);

  // Recent Stock Inventory Receipts based directly on receivedDate
  const recentStockReceipts = useMemo(() => {
    return [...activeItems]
      .sort((a, b) => {
        const dateA = a.receivedDate ? new Date(a.receivedDate).getTime() : 0;
        const dateB = b.receivedDate ? new Date(b.receivedDate).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 6);
  }, [activeItems]);

  // Export live Stock Inventory & SKU Breakdown Report
  const handleExportReport = () => {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Warehouse In-Stock',
      'Assigned to Vans',
      'Deployed to Subscribers',
      'Defective/Removed',
      'Total Stock Units',
      'Storage Bins',
    ];

    const rows = skuSummaries.map((s) => [
      `"${s.sku}"`,
      `"${s.name}"`,
      `"${CATEGORY_LABELS[s.category] || s.category}"`,
      s.inStock,
      s.assigned,
      s.deployed,
      s.defective,
      s.total,
      `"${s.storageBins.join(', ')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Stock_Inventory_Analytics_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setExportNotice('Live stock inventory analytics exported successfully.');
    setTimeout(() => setExportNotice(null), 4000);
  };

  return (
    <div className="flex-1 min-w-0 h-full p-6 overflow-y-auto space-y-6 bg-slate-50/50">
      {/* Welcome & Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Dashboard & Stock Inventory Analytics
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time overview of warehouse stock levels, equipment allocations, and inventory movement.
          </p>
        </div>

        {/* Action Shortcuts */}
        <div className="flex flex-wrap items-center gap-2">
          {currentUser.role !== 'TECHNICIAN' && (
            <button
              type="button"
              onClick={onOpenReceive}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <Boxes className="w-4 h-4" />
              <span>+ Receive Stock</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportReport}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 active:bg-black text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Stock Analytics</span>
          </button>
        </div>
      </div>

      {exportNotice && (
        <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-900 animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
            <span>{exportNotice}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-teal-700 font-bold hover:text-teal-900 text-xs cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Summary / KPI Cards directly derived from Stock Inventory and Hardware Categories */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TOTAL STOCK INVENTORY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                STOCK INVENTORY
              </span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-700 border border-teal-100 flex items-center justify-center">
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-teal-700 shrink-0">
                <Package className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 truncate">Total Units</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{totalInventoryCount}</p>
                </div>
                <div className="border-l border-slate-100 pl-2">
                  <p className="text-xs font-medium text-slate-500 truncate">In Warehouse</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{inStockWarehouseCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
            >
              View full inventory →
            </button>
          </div>
        </div>

        {/* Card 2: FIELD & TRANSIT */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                FIELD & TRANSIT
              </span>
              <div className="w-7 h-7 rounded-lg bg-cyan-50 text-cyan-700 border border-cyan-100 flex items-center justify-center">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-cyan-50/70 border border-cyan-200/80 flex items-center justify-center text-cyan-700 shrink-0">
                <Truck className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 truncate">In Tech Vans</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{assignedTransitCount}</p>
                </div>
                <div className="border-l border-slate-100 pl-2">
                  <p className="text-xs font-medium text-slate-500 truncate">Deployed</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{deployedInstalledCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => onNavigateTab('technicians')}
              className="text-xs font-semibold text-cyan-700 hover:text-cyan-900 flex items-center gap-1 cursor-pointer"
            >
              View technician stock →
            </button>
          </div>
        </div>

        {/* Card 3: NETWORK HARDWARE */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                NETWORK HARDWARE
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center justify-center">
                <Layers className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                <Layers className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 truncate">Modems & ONTs</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{modemsCount}</p>
                </div>
                <div className="border-l border-slate-100 pl-2">
                  <p className="text-xs font-medium text-slate-500 truncate">Fiber Cables</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{fiberCablesCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer"
            >
              View network hardware →
            </button>
          </div>
        </div>

        {/* Card 4: PASSIVE & ACCESSORIES */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs relative flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                PASSIVE & ACCESSORIES
              </span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700 shrink-0">
                <Boxes className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0 grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-500 truncate">Splitters & Cords</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{splittersAndCordsCount}</p>
                </div>
                <div className="border-l border-slate-100 pl-2">
                  <p className="text-xs font-medium text-slate-500 truncate">Accessories</p>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-0.5">{accessoriesCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2 border-t border-slate-50">
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="text-xs font-semibold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
            >
              View passive accessories →
            </button>
          </div>
        </div>
      </div>

      {/* Table 1: Recent Stock Inventory Receipts (Based directly on Stock Inventory) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Recent Inbound Stock Inventory Receipts
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
              {recentStockReceipts.length} Latest Batches
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('inventory')}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 flex items-center gap-1 cursor-pointer"
          >
            <span>Open Full Inventory Grid</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-slate-800 font-bold text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Received Date</th>
                <th className="px-4 py-3 whitespace-nowrap">Serial Number / Barcode</th>
                <th className="px-4 py-3 whitespace-nowrap">SKU & Product Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Storage Location</th>
                <th className="px-4 py-3 whitespace-nowrap">Current Status</th>
                <th className="px-4 py-3 whitespace-nowrap text-right">Received By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentStockReceipts.length > 0 ? (
                recentStockReceipts.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 text-slate-600 font-mono">
                      {item.receivedDate || 'N/A'}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-900">
                      <div className="flex items-center gap-1.5">
                        <Barcode className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.serialNumber}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <div className="font-semibold text-slate-900">{item.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{item.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold whitespace-nowrap">
                        {CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-700 font-mono">
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                        {item.storageBin}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          item.lifecycleStatus === 'IN_STOCK'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : item.lifecycleStatus === 'ASSIGNED_RESERVED'
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : item.lifecycleStatus === 'INSTALLED_DEPLOYED'
                            ? 'bg-purple-50 text-purple-800 border-purple-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}
                      >
                        {LIFECYCLE_STATUS_LABELS[item.lifecycleStatus] || item.lifecycleStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-right whitespace-nowrap">
                      {item.receivedBy || 'Warehouse Team'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No recent inventory receipts recorded.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live Activity & Audit Trail Stream */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-teal-700" />
            <h2 className="text-sm font-bold text-slate-900">
              Live Stock Operations & Warehouse Scanner Activity
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">Real-time audit records</span>
        </div>

        <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
          {auditLogs.slice(0, 6).map((log) => (
            <div
              key={log.id}
              className="p-3 bg-white hover:bg-slate-50/70 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                    log.action === 'ACCOUNT_CLOSE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : log.action === 'ASSIGN'
                      ? 'bg-cyan-100 text-cyan-800'
                      : log.action === 'RECEIVE' || log.action === 'BULK_IMPORT'
                      ? 'bg-teal-100 text-teal-800'
                      : log.action === 'HARD_DELETE'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  [{log.action}]
                </span>
                <div>
                  <p className="font-semibold text-slate-800">{log.details}</p>
                  <p className="text-[10px] text-slate-400">By: {log.performedBy}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
