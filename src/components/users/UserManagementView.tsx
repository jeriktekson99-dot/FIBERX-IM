import React, { useState, useMemo } from 'react';
import { UserProfile, UserRole } from '../../types';
import {
  Users,
  UserPlus,
  Shield,
  Truck,
  Search,
  AlertTriangle,
  Mail,
  Phone,
  Building2,
  Sparkles,
  RefreshCw,
  Trash2,
  Lock,
  Pencil,
} from 'lucide-react';
import { AddUserModal } from './AddUserModal';
import { EditUserModal } from './EditUserModal';

interface UserManagementViewProps {
  profiles: UserProfile[];
  currentUser: UserProfile;
  onAddUser: (
    userData: Omit<UserProfile, 'id'>,
    technicianDetails?: { assignedVan: string; area: string; phone: string }
  ) => void;
  onEditUser?: (
    userId: string,
    updatedData: Partial<UserProfile>,
    technicianDetails?: { assignedVan: string; area: string; phone: string }
  ) => void;
  onUpdateRole?: (userId: string, newRole: UserRole) => void;
  onToggleStatus?: (userId: string, newStatus: 'ACTIVE' | 'SUSPENDED') => void;
  onDeleteUser: (userId: string) => void;
  onSwitchUser?: (profileId: string) => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  profiles,
  currentUser,
  onAddUser,
  onEditUser,
  onUpdateRole,
  onToggleStatus,
  onDeleteUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Active action menu id
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Statistics calculation
  const stats = useMemo(() => {
    const total = profiles.length;
    const admins = profiles.filter((p) => p.role === 'ADMIN').length;
    const technicians = profiles.filter((p) => p.role === 'TECHNICIAN').length;
    return { total, admins, technicians };
  }, [profiles]);

  // Filtered profiles
  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      // Role filter
      if (roleFilter !== 'ALL' && p.role !== roleFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = (p.name || '').toLowerCase().includes(q);
        const matchEmail = (p.email || '').toLowerCase().includes(q);
        const matchBadge = (p.badgeId || '').toLowerCase().includes(q);
        const matchDept = (p.department || '').toLowerCase().includes(q);
        const matchPhone = (p.phone || '').toLowerCase().includes(q);
        const matchVan = (p.assignedVan || '').toLowerCase().includes(q);
        return matchName || matchEmail || matchBadge || matchDept || matchPhone || matchVan;
      }

      return true;
    });
  }, [profiles, roleFilter, searchQuery]);

  const stripRoleFromName = (name: string): string => {
    return (name || '')
      .replace(/\s*\((?:Admin|ADMIN|Warehouse Staff|Field Tech|OPERATOR|TECHNICIAN|Field Technician|Staff)\)/gi, '')
      .trim();
  };

  const getInitials = (name: string) => {
    const clean = stripRoleFromName(name);
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return (clean.slice(0, 2) || 'US').toUpperCase();
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 shadow-2xs">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Administrator</span>
          </span>
        );
      case 'TECHNICIAN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shadow-2xs">
            <Truck className="w-3.5 h-3.5 text-teal-600" />
            <span>Field Technician</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getDisplayPhone = (user: UserProfile): string => {
    if (user.phone && user.phone.trim()) return user.phone.trim();
    return '—';
  };

  return (
    <div className="flex-1 min-w-0 h-full flex flex-col bg-slate-100 overflow-y-auto">
      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">User & Role Management</h1>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Method 1 In-App Directory: Create internal user profiles, manage accounts, and promote or demote system roles.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>+ Add User</span>
            </button>
          </div>
        </div>

        {/* Statistics Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4 pt-4 border-t border-slate-100">
          {/* Total */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
            <div className="flex items-center justify-between text-slate-500 text-[11px] font-semibold">
              <span>Total Users</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-xl font-bold text-slate-900 mt-1 font-mono">{stats.total}</p>
          </div>

          {/* Admins */}
          <div className="bg-indigo-50/60 p-3 rounded-xl border border-indigo-200/60">
            <div className="flex items-center justify-between text-indigo-700 text-[11px] font-bold">
              <span>Administrators</span>
              <Shield className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-xl font-bold text-indigo-950 mt-1 font-mono">{stats.admins}</p>
          </div>

          {/* Technicians */}
          <div className="bg-teal-50/60 p-3 rounded-xl border border-teal-200/60">
            <div className="flex items-center justify-between text-teal-800 text-[11px] font-bold">
              <span>Field Technicians</span>
              <Truck className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-xl font-bold text-teal-950 mt-1 font-mono">{stats.technicians}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 mx-6 mt-4 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Field */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, email, badge ID, department, van..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-sans"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
        </div>

        {/* Role Filter Dropdown */}
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="user-role-filter-select" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
            Role:
          </label>
          <select
            id="user-role-filter-select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-white focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer min-w-[140px]"
          >
            <option value="ALL">All Roles</option>
            <option value="ADMIN">Administrators</option>
            <option value="TECHNICIAN">Field Technicians</option>
          </select>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="px-6 py-4 flex-1">
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 min-w-[900px]">
              <thead className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 min-w-[250px]">Team Member</th>
                  <th className="px-5 py-4 min-w-[230px]">Contact Email & Phone</th>
                  <th className="px-5 py-4 min-w-[210px]">Badge & Department</th>
                  <th className="px-5 py-4 min-w-[150px]">Current Role</th>
                  <th className="px-6 py-4 min-w-[100px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                      <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="font-bold text-slate-700">No users match the current search or filters.</p>
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setRoleFilter('ALL');
                        }}
                        className="mt-2 text-xs font-bold text-teal-700 hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredProfiles.map((user) => {
                    const isCurrentUser = user.id === currentUser.id;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* User Profile */}
                        <td className="px-6 py-4.5 min-w-[250px]">
                          <div className="flex items-center gap-3.5">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs ${
                                user.role === 'ADMIN'
                                  ? 'bg-indigo-100 text-indigo-700 border border-indigo-300'
                                  : 'bg-teal-100 text-teal-800 border border-teal-300'
                              }`}
                            >
                              {getInitials(user.name)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-slate-900 text-sm block whitespace-nowrap">
                                {stripRoleFromName(user.name)}
                              </span>
                              <span className="text-[11px] text-slate-400 font-mono block mt-0.5 whitespace-nowrap">
                                ID: {user.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Email & Phone */}
                        <td className="px-5 py-4.5 min-w-[230px]">
                          <div className="space-y-1.5">
                            <a
                              href={`mailto:${user.email}`}
                              className="text-teal-700 hover:underline font-mono text-[11px] flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{user.email}</span>
                            </a>
                            <a
                              href={`tel:${getDisplayPhone(user).replace(/\s+/g, '')}`}
                              className="text-slate-600 hover:text-teal-700 hover:underline font-mono text-[11px] flex items-center gap-1.5 whitespace-nowrap"
                            >
                              <Phone className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                              <span>{getDisplayPhone(user)}</span>
                            </a>
                          </div>
                        </td>

                        {/* Badge & Department */}
                        <td className="px-5 py-4.5 min-w-[210px]">
                          <span className="font-mono font-bold text-slate-800 block text-xs">
                            {user.badgeId}
                          </span>
                          <span className="text-[11px] text-slate-500 block truncate max-w-[220px] mt-0.5" title={user.department}>
                            {user.department}
                          </span>
                          {user.assignedVan && (
                            <span className="text-[10px] text-teal-700 font-medium block mt-0.5">
                              Van: {user.assignedVan}
                            </span>
                          )}
                        </td>

                        {/* Current Role */}
                        <td className="px-5 py-4.5 min-w-[150px] whitespace-nowrap">
                          {getRoleBadge(user.role)}
                        </td>

                        {/* Actions Menu */}
                        <td className="px-6 py-4.5 whitespace-nowrap text-right min-w-[100px]">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit User Account & Role */}
                            <button
                              type="button"
                              onClick={() => setEditingUser(user)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-colors cursor-pointer shadow-2xs"
                              title={`Edit ${stripRoleFromName(user.name)}'s account & switch role`}
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => onDeleteUser(user.id)}
                              disabled={isCurrentUser || (user.role === 'ADMIN' && stats.admins <= 1)}
                              className={`p-1.5 rounded-lg border border-slate-200 text-xs transition-colors cursor-pointer shadow-2xs ${
                                isCurrentUser || (user.role === 'ADMIN' && stats.admins <= 1)
                                  ? 'opacity-30 cursor-not-allowed text-slate-400'
                                  : 'text-red-600 hover:bg-red-50 hover:border-red-300'
                              }`}
                              title={
                                isCurrentUser
                                  ? 'Cannot delete your own active session'
                                  : user.role === 'ADMIN' && stats.admins <= 1
                                  ? 'Cannot delete the only administrator'
                                  : 'Remove user from system'
                              }
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAddUser={onAddUser}
        existingProfiles={profiles}
      />

      {/* Edit User & Role Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSave={(userId, updatedData, techDetails) => {
          if (onEditUser) {
            onEditUser(userId, updatedData, techDetails);
          }
          setEditingUser(null);
        }}
        existingProfiles={profiles}
        currentUser={currentUser}
        totalAdmins={stats.admins}
      />
    </div>
  );
};
