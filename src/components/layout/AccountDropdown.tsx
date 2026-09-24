import React, { useEffect, useRef } from 'react';
import { User, Settings, LogOut, ChevronRight } from 'lucide-react';
import { UserProfile } from '../../types';
import { getUserInitials } from '../../utils/userInitials';

export type AccountMenuTab = 'profile' | 'settings' | 'privacy';

interface AccountDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  activeItem?: AccountMenuTab | null;
  onSelectOption: (option: AccountMenuTab | 'logout') => void;
  availableProfiles?: UserProfile[];
  onSwitchProfile?: (profileId: string) => void;
}

export const AccountDropdown: React.FC<AccountDropdownProps> = ({
  isOpen,
  onClose,
  currentUser,
  activeItem = 'profile',
  onSelectOption,
  availableProfiles = [],
  onSwitchProfile,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
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

  const menuItems: Array<{
    id: AccountMenuTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
  }> = [
    { id: 'profile', label: 'Profile', icon: User, badge: currentUser.role },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div
      ref={dropdownRef}
      id="account-dropdown-menu"
      className="absolute right-0 top-full mt-2.5 w-64 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="account-menu-button"
    >
      {/* Top pointer arrow / caret aligned directly with avatar center */}
      <div
        className="absolute -top-[6px] right-[12px] w-3 h-3 bg-white border-t border-l border-slate-200 rotate-45 pointer-events-none rounded-tl-[2px]"
        aria-hidden="true"
      />

      {/* User Info Header Snippet */}
      <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full overflow-hidden bg-teal-100 border border-teal-300 flex items-center justify-center shrink-0 select-none shadow-2xs">
          <span className="text-xs font-black tracking-wider text-teal-900">
            {getUserInitials(currentUser.name)}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 truncate leading-tight">
            {currentUser.name}
          </p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`inline-block px-1.5 py-0.5 text-[9px] font-mono font-bold rounded ${
                currentUser.role === 'ADMIN'
                  ? 'bg-slate-900 text-white'
                  : currentUser.role === 'OPERATOR'
                  ? 'bg-teal-700 text-white'
                  : 'bg-cyan-700 text-white'
              }`}
            >
              {currentUser.role}
            </span>
            <span className="text-[10px] font-mono text-slate-400 truncate">
              {currentUser.badgeId}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Navigation List (Profile, Tags, Privacy, Settings) */}
      <div className="py-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;

          return (
            <button
              key={item.id}
              id={`account-menu-item-${item.id}`}
              type="button"
              role="menuitem"
              onClick={() => {
                onSelectOption(item.id);
                onClose();
              }}
              className={`relative w-full px-4 py-2.5 flex items-center justify-between text-left text-xs transition-colors cursor-pointer group ${
                isActive
                  ? 'bg-teal-50/80 text-teal-950 font-semibold'
                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {/* Left active selection indicator bar - exactly matching structural placement in reference image */}
              {isActive && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-teal-600 rounded-r-md"
                  aria-hidden="true"
                />
              )}

              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 transition-colors ${
                    isActive ? 'text-teal-700' : 'text-slate-500 group-hover:text-slate-800'
                  }`}
                />
                <span className="text-sm font-medium">{item.label}</span>
              </div>

              {item.badge && !isActive && (
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                  {item.badge}
                </span>
              )}
              {isActive && (
                <ChevronRight className="w-3.5 h-3.5 text-teal-600 opacity-80" />
              )}
            </button>
          );
        })}
      </div>

      {/* Divider before Log out */}
      <div className="my-1 border-t border-slate-100" />

      {/* Log out Item (5th item in reference image) */}
      <div className="px-1 py-0.5">
        <button
          id="account-menu-item-logout"
          type="button"
          role="menuitem"
          onClick={() => {
            onSelectOption('logout');
            onClose();
          }}
          className="relative w-full px-3 py-2 flex items-center justify-between text-left text-xs rounded-lg text-slate-700 hover:bg-red-50 hover:text-red-700 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3">
            <LogOut className="w-4 h-4 text-slate-400 group-hover:text-red-600 transition-colors" />
            <span className="text-sm font-medium">Log out</span>
          </div>
          <span className="text-[10px] text-slate-400 group-hover:text-red-500 font-mono">
            Exit
          </span>
        </button>
      </div>
    </div>
  );
};
