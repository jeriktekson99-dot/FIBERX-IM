import React, { useEffect, useRef, useState } from 'react';
import { Bell, Check, Clock, AlertTriangle, FileCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { AuditLog, InventoryItem } from '../../types';

export interface NotificationItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  read: boolean;
  actionTab?: 'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users';
}

interface NotificationsDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkAllAsRead: () => void;
  onSelectNotification: (notif: NotificationItem) => void;
}

export const NotificationsDropdown: React.FC<NotificationsDropdownProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAllAsRead,
  onSelectNotification,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'new' | 'all'>('new');

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

  const unreadNotifications = notifications.filter((n) => !n.read);
  const unreadCount = unreadNotifications.length;
  const displayedNotifications = activeTab === 'new' ? unreadNotifications : notifications;

  return (
    <div
      ref={dropdownRef}
      id="notifications-dropdown-menu"
      className="absolute -right-12 sm:right-0 top-full mt-2.5 w-84 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
    >
      {/* Caret pointer */}
      <div
        className="absolute -top-[6px] right-[46px] sm:right-[12px] w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45 pointer-events-none rounded-tl-[2px]"
        aria-hidden="true"
      />

      <div className="px-4 pb-2.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-teal-600" />
          <h3 className="text-xs font-bold text-slate-900">Operational Alerts & Activity</h3>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllAsRead}
            className="text-[10px] text-teal-700 hover:text-teal-900 font-bold hover:underline cursor-pointer"
          >
            Mark read
          </button>
        )}
      </div>

      {/* Tabs if there is past read activity */}
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="flex items-center px-4 pt-2 pb-1 border-b border-slate-100 gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`text-[11px] font-bold pb-1 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'new'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            New ({unreadCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`text-[11px] font-bold pb-1 px-1 border-b-2 transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'border-teal-600 text-teal-800'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            All ({notifications.length})
          </button>
        </div>
      )}

      {/* When on 'all' view with 0 unread, show a small toggle bar back to new */}
      {notifications.length > 0 && unreadCount === 0 && activeTab === 'all' && (
        <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50 border-b border-slate-100 text-[11px]">
          <span className="text-slate-500 font-medium">Viewing all activity ({notifications.length})</span>
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className="text-teal-700 font-bold hover:underline cursor-pointer"
          >
            Back to New
          </button>
        </div>
      )}

      <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
        {displayedNotifications.length > 0 ? (
          displayedNotifications.map((notif) => (
            <button
              key={notif.id}
              type="button"
              onClick={() => {
                onSelectNotification(notif);
                onClose();
              }}
              className={`w-full px-4 py-2.5 text-left flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                !notif.read ? 'bg-teal-50/40' : ''
              }`}
            >
              <div className="mt-0.5 shrink-0">
                {notif.type === 'alert' ? (
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                ) : notif.type === 'warning' ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : notif.type === 'success' ? (
                  <FileCheck className="w-4 h-4 text-emerald-500" />
                ) : (
                  <Clock className="w-4 h-4 text-teal-600" />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-xs font-bold text-slate-900 truncate">{notif.title}</p>
                  <span className="text-[9px] text-slate-400 shrink-0 font-mono">
                    {notif.timestamp}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-tight">
                  {notif.description}
                </p>
              </div>

              {!notif.read && (
                <span className="w-2 h-2 rounded-full bg-teal-600 shrink-0 mt-1" />
              )}
            </button>
          ))
        ) : (
          <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
            {/* Giant notification bell symbol */}
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-3 ring-8 ring-slate-50 shadow-inner">
              <Bell className="w-11 h-11 text-slate-300 stroke-[1.4]" />
            </div>
            <p className="text-sm font-bold text-slate-700">No new notifications</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[210px] leading-relaxed">
              You're all caught up! When new alerts, dispatches, or updates occur, they will appear here.
            </p>
            {notifications.length > 0 && activeTab === 'new' && (
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className="mt-3 text-[11px] font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
              >
                View past activity ({notifications.length})
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
