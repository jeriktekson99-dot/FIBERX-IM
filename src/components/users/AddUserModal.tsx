import React, { useState } from 'react';
import { UserProfile, UserRole, Technician } from '../../types';
import { X, UserPlus, AlertCircle, Sparkles, ChevronDown } from 'lucide-react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddUser: (
    userData: Omit<UserProfile, 'id'>,
    technicianDetails?: { assignedVan: string; area: string; phone: string }
  ) => void;
  existingProfiles: UserProfile[];
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onAddUser,
  existingProfiles,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [department, setDepartment] = useState('Central Warehouse Operations & Network Logistics');
  const [phone, setPhone] = useState('+63 9');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [assignedVan, setAssignedVan] = useState('FX-VAN-30 (Toyota HiAce)');
  const [assignedArea, setAssignedArea] = useState('Metro Manila East / Pasig & Marikina');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateBadgeId = () => {
    const prefix = role === 'ADMIN' ? 'FX-ADM' : 'FX-TECH';
    const rand = Math.floor(100 + Math.random() * 900);
    setBadgeId(`${prefix}-${rand}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide the full name of the user.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address (e.g. user@gmail.com).');
      return;
    }

    const emailExists = existingProfiles.some(
      (p) => p.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailExists) {
      setError(`A user with email "${email.trim()}" already exists in the system.`);
      return;
    }

    const finalBadgeId = badgeId.trim() || `${role === 'ADMIN' ? 'FX-ADM' : 'FX-TECH'}-${Math.floor(100 + Math.random() * 900)}`;

    const newUserData: Omit<UserProfile, 'id'> = {
      name: name.trim(),
      email: email.trim(),
      password: password.trim() || undefined,
      role,
      badgeId: finalBadgeId,
      department: department.trim(),
      phone: phone.trim() || undefined,
      status,
      createdAt: new Date().toISOString().split('T')[0],
      assignedVan: role === 'TECHNICIAN' ? assignedVan : undefined,
      assignedArea: role === 'TECHNICIAN' ? assignedArea : undefined,
    };

    const techDetails =
      role === 'TECHNICIAN'
        ? {
            assignedVan: assignedVan.trim() || 'FX-VAN-30 (Toyota HiAce)',
            area: assignedArea.trim() || 'Metro Manila Central Hub',
            phone: phone.trim() || '+63 900 000 0000',
          }
        : undefined;

    onAddUser(newUserData, techDetails);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shadow-xs">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Create New Team Member</h2>
              <p className="text-xs text-slate-500">
                Provision a new internal account with designated role & operational scope
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selector Dropdown */}
          <div>
            <label htmlFor="system-role-select" className="block font-bold text-slate-700 mb-1.5">
              Select Initial System Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="system-role-select"
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setRole(newRole);
                  if (newRole === 'ADMIN') {
                    setDepartment('Central Warehouse Operations & Network Logistics');
                  } else if (newRole === 'TECHNICIAN') {
                    setDepartment('Field Engineering & Provisioning');
                  }
                }}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer shadow-2xs appearance-none pr-10"
              >
                <option value="ADMIN">Administrator</option>
                <option value="TECHNICIAN">Field Technician</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Basic User Information */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Carlos Dela Cruz"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-sans"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. carlos.cruz@gmail.com"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-sans"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Accepts any email address (Gmail, personal, or corporate)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Badge ID / Employee ID <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleGenerateBadgeId}
                  className="text-[10px] text-teal-700 hover:text-teal-900 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" /> Auto-Generate
                </button>
              </div>
              <input
                type="text"
                required
                value={badgeId}
                onChange={(e) => setBadgeId(e.target.value)}
                placeholder={role === 'ADMIN' ? 'FX-ADM-005' : 'FX-TECH-105'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 917 123 4567"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Department / Fulfillment Hub
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Central Warehouse Operations & Network Logistics"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-sans"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="font-bold text-slate-700">
                Password (Supabase Authentication)
              </label>
              <span className="text-[10px] text-teal-700 font-medium">
                Auto-generates if left blank
              </span>
            </div>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="e.g. FiberX@2026! (leave blank to default to badge ID)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 font-sans"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              User will be provisioned directly into Supabase Authentication (<span className="text-teal-700 font-mono font-semibold">auth.users</span>) and database profiles.
            </p>
          </div>

          {/* Form Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Create User Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
