import React, { useEffect, useRef } from 'react';
import { Bookmark, ExternalLink, X, Tag, Sparkles } from 'lucide-react';
import { InventoryItem } from '../../types';

interface BookmarksDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  bookmarkedIds: string[];
  onToggleBookmark: (id: string) => void;
  onSelectItem: (item: InventoryItem) => void;
  onQuickFilter?: (status: string) => void;
}

export const BookmarksDropdown: React.FC<BookmarksDropdownProps> = ({
  isOpen,
  onClose,
  inventory,
  bookmarkedIds,
  onToggleBookmark,
  onSelectItem,
  onQuickFilter,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const bookmarkedItems = inventory.filter((item) => bookmarkedIds.includes(item.id));

  return (
    <div
      ref={dropdownRef}
      id="bookmarks-dropdown-menu"
      className="absolute -right-20 sm:right-0 top-full mt-2.5 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Caret pointer */}
      <div
        className="absolute -top-[6px] right-[78px] sm:right-[12px] w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45 pointer-events-none rounded-tl-[2px]"
        aria-hidden="true"
      />

      <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bookmark className="w-4 h-4 text-teal-600 fill-teal-600/20" />
          <h3 className="text-xs font-bold text-slate-900">Pinned & Bookmarked Stock</h3>
        </div>
        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
          {bookmarkedItems.length} items
        </span>
      </div>

      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {bookmarkedItems.length > 0 ? (
          bookmarkedItems.map((item) => (
            <div
              key={item.id}
              className="px-4 py-2.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2 group"
            >
              <button
                type="button"
                onClick={() => {
                  onSelectItem(item);
                  onClose();
                }}
                className="flex-1 text-left min-w-0 cursor-pointer"
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-slate-900 truncate">
                    {item.serialNumber || item.sku}
                  </span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">{item.name}</p>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => onToggleBookmark(item.id)}
                  title="Remove bookmark"
                  className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="px-4 py-6 text-center">
            <Bookmark className="w-8 h-8 text-slate-300 mx-auto mb-2 stroke-1" />
            <p className="text-xs font-semibold text-slate-700">No bookmarked items yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
              Click the bookmark icon on any inventory item in the table to pin it here.
            </p>
          </div>
        )}
      </div>

      {/* Quick Pinned Filters */}
      {onQuickFilter && (
        <div className="pt-2 px-3 border-t border-slate-100 space-y-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Pinned Quick Views:
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => {
                onQuickFilter('AWAITING_ADMIN_VERIFICATION');
                onClose();
              }}
              className="text-[10px] px-2 py-1 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 font-medium cursor-pointer"
            >
              Awaiting Verification
            </button>
            <button
              onClick={() => {
                onQuickFilter('IN_STOCK');
                onClose();
              }}
              className="text-[10px] px-2 py-1 rounded-md bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-medium cursor-pointer"
            >
              Warehouse In-Stock
            </button>
            <button
              onClick={() => {
                onQuickFilter('ASSIGNED');
                onClose();
              }}
              className="text-[10px] px-2 py-1 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 hover:bg-cyan-100 font-medium cursor-pointer"
            >
              Assigned to Vans
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
