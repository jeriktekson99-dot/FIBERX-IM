import React, { useState } from 'react';
import { UserProfile, UserRole } from '../../types';
import { getUserInitials } from '../../utils/userInitials';
import {
  X,
  User,
  Shield,
  Briefcase,
  Mail,
  Phone,
  Truck,
  MapPin,
  IdCard,
  Check,
  Building,
  RefreshCw,
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onNavigateTab?: (tab: 'dashboard' | 'inventory' | 'technicians' | 'closures' | 'users') => void;
  onUpdatePhone?: (newPhone: string) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onNavigateTab,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="user-profile-modal-title"
    >
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 id="user-profile-modal-title" className="text-sm font-bold text-slate-900">
                User Account Profile & Persona
              </h2>
              <p className="text-[11px] text-slate-500">
                Manage operational permissions, fleet dispatch persona, and contact credentials
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

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Profile Card */}
          <div className="bg-gradient-to-br from-slate-50 to-teal-50/40 p-4 rounded-xl border border-teal-100/80 flex items-start gap-4">
            <div className="relative shrink-0">
              <div className="w-16 h-16 rounded-full overflow-hidden border border-teal-200 shadow-xs bg-teal-600 flex items-center justify-center text-white font-extrabold text-xl tracking-wider select-none">
                {getUserInitials(currentUser.name)}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {currentUser.name}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full ${
                    currentUser.role === 'ADMIN'
                      ? 'bg-slate-900 text-white'
                      : currentUser.role === 'OPERATOR'
                      ? 'bg-teal-700 text-white'
                      : 'bg-cyan-700 text-white'
                  }`}
                >
                  {currentUser.role}
                </span>
              </div>

              <p className="text-xs text-slate-600 mt-1 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{currentUser.department}</span>
              </p>

              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-slate-200/60 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-600">
                  <IdCard className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono font-bold text-slate-800">{currentUser.badgeId}</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 truncate">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{currentUser.email}</span>
                </div>
                {currentUser.phone && (
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{currentUser.phone}</span>
                  </div>
                )}
                {currentUser.assignedVan && (
                  <div className="flex items-center gap-1.5 text-slate-600 truncate">
                    <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{currentUser.assignedVan}</span>
                  </div>
                )}
              </div>
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
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
