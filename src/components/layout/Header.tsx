import React, { useState, useMemo } from 'react';
import { UserProfile, InventoryItem, Technician, AuditLog, ItemCategory } from '../../types';
import { FiberXLogo } from '../common/FiberXLogo';
import { Bell } from 'lucide-react';
import { AccountDropdown, AccountMenuTab } from './AccountDropdown';
import { NotificationsDropdown, NotificationItem } from './NotificationsDropdown';
import { UserProfileModal } from '../modals/UserProfileModal';
import { PrivacyModal } from '../modals/PrivacyModal';
import { SettingsModal } from '../modals/SettingsModal';
import { getUserInitials } from '../../utils/userInitials';
import {
  generateLiveNotifications,
  getReadNotificationIds,
  saveReadNotificationIds,
} from '../../utils/notifications';

interface HeaderProps {
  currentUser: UserProfile;
  availableProfiles: UserProfile[];
  onSwitchProfile: (profileId: string) => void;
  onNavigateTab?: (tab: 'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users' | 'archive') => void;
  onLogout?: () => void;
  onOpenReceive?: () => void;
  onOpenScannerHub?: () => void;
  isScannerListening?: boolean;
  scanPulse?: boolean;
  inventory?: InventoryItem[];
  technicians?: Technician[];
  auditLogs?: AuditLog[];
  onSelectItemDetail?: (item: InventoryItem) => void;
  onResetDatabase?: () => void;
  onApplyCategoryFilter?: (category: ItemCategory | 'ALL', status?: string) => void;
  bookmarkedIds?: string[];
  onToggleBookmark?: (id: string) => void;
  onUpdateUserProfile?: (userId: string, updatedData: Partial<UserProfile>) => void;
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  availableProfiles,
  onSwitchProfile,
  onNavigateTab,
  onLogout,
  onOpenReceive,
  onOpenScannerHub,
  isScannerListening = false,
  scanPulse = false,
  inventory = [],
  technicians = [],
  auditLogs = [],
  onSelectItemDetail,
  onResetDatabase,
  onApplyCategoryFilter,
  bookmarkedIds = [],
  onToggleBookmark,
  onUpdateUserProfile,
  onOpenSupabaseModal,
}) => {
  // Dropdown States
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Active Menu Item for Left Indicator Bar
  const [activeMenuTab, setActiveMenuTab] = useState<AccountMenuTab>('profile');

  // Modal Dialog States
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Dynamic Notifications derived from inventory, audit logs & technician holds
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => getReadNotificationIds());

  const notificationsState = useMemo(() => {
    return generateLiveNotifications(
      currentUser,
      inventory || [],
      technicians || [],
      auditLogs || [],
      readNotifIds
    );
  }, [currentUser, inventory, technicians, auditLogs, readNotifIds]);

  const unreadNotifCount = notificationsState.filter((n) => !n.read).length;

  const handleMarkAllNotificationsRead = () => {
    const allIds = notificationsState.map((n) => n.id);
    const updated = Array.from(new Set([...readNotifIds, ...allIds]));
    setReadNotifIds(updated);
    saveReadNotificationIds(updated);
  };

  const handleSelectNotification = (notif: NotificationItem) => {
    if (!readNotifIds.includes(notif.id)) {
      const updated = [...readNotifIds, notif.id];
      setReadNotifIds(updated);
      saveReadNotificationIds(updated);
    }
    if (notif.actionTab && onNavigateTab) {
      onNavigateTab(notif.actionTab);
    }
  };

  // Handle Account Dropdown Option Selection
  const handleSelectAccountOption = (option: AccountMenuTab | 'logout') => {
    if (option === 'logout') {
      if (onLogout) onLogout();
      return;
    }

    setActiveMenuTab(option);

    if (option === 'profile') {
      setIsProfileModalOpen(true);
    } else if (option === 'privacy') {
      setIsPrivacyModalOpen(true);
    } else if (option === 'settings') {
      setIsSettingsModalOpen(true);
    }
  };

  return (
    <>
      <header className="shrink-0 z-40 w-full bg-white border-b border-slate-200 shadow-2xs select-none">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left Brand */}
          <div className="flex items-center gap-6 shrink-0">
            <FiberXLogo />
          </div>

          {/* Right Header Cluster: [1. Notification Bell Icon] [2. Circular Account Avatar] */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 1. Notification Bell Icon (With numbered badge) */}
            <div className="relative">
              <button
                type="button"
                id="header-notifications-button"
                onClick={() => {
                  setIsNotificationsOpen(!isNotificationsOpen);
                  setIsAccountMenuOpen(false);
                }}
                className={`p-2 rounded-xl transition-all cursor-pointer relative ${
                  isNotificationsOpen
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Operational Notifications & Alerts"
                aria-label="Operational Notifications & Alerts"
                aria-expanded={isNotificationsOpen}
              >
                <Bell className="w-5 h-5 transition-transform hover:scale-105" />

                {/* Numbered badge on the notification bell */}
                {unreadNotifCount > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-mono font-bold flex items-center justify-center border-2 border-white shadow-2xs leading-none"
                    aria-label={`${unreadNotifCount} unread alerts`}
                  >
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              <NotificationsDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
                notifications={notificationsState}
                onMarkAllAsRead={handleMarkAllNotificationsRead}
                onSelectNotification={handleSelectNotification}
              />
            </div>

            {/* 2. Account Avatar Icon with Caret Dropdown Menu */}
            <div className="relative ml-0.5">
              <button
                type="button"
                id="account-menu-button"
                onClick={() => {
                  setIsAccountMenuOpen(!isAccountMenuOpen);
                  setIsNotificationsOpen(false);
                }}
                className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-teal-600/30 cursor-pointer transition-transform hover:scale-105 flex items-center justify-center group w-9 h-9"
                aria-expanded={isAccountMenuOpen}
                aria-haspopup="true"
                aria-label={`User account menu for ${currentUser.name}`}
              >
                <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200 group-hover:border-teal-600 transition-colors bg-teal-100 flex items-center justify-center select-none">
                  <span className="text-xs font-black tracking-wider text-teal-900">
                    {getUserInitials(currentUser.name)}
                  </span>
                </div>
              </button>

              {/* The Account Dropdown Menu based directly on reference image */}
              <AccountDropdown
                isOpen={isAccountMenuOpen}
                onClose={() => setIsAccountMenuOpen(false)}
                currentUser={currentUser}
                activeItem={activeMenuTab}
                onSelectOption={handleSelectAccountOption}
                availableProfiles={availableProfiles}
                onSwitchProfile={onSwitchProfile}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Modals triggered from Account Dropdown Menu */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onNavigateTab={onNavigateTab}
      />

      <PrivacyModal
        isOpen={isPrivacyModalOpen}
        onClose={() => setIsPrivacyModalOpen(false)}
        currentUser={currentUser}
        auditLogs={auditLogs}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        currentUser={currentUser}
        availableProfiles={availableProfiles}
        onUpdateAccount={(updatedData) => {
          if (onUpdateUserProfile) {
            onUpdateUserProfile(currentUser.id, updatedData);
          }
        }}
        onResetDatabase={onResetDatabase}
      />
    </>
  );
};
