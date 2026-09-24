import React, { useState, useEffect } from 'react';
import { UserProfile, UserRole } from '../../types';
import {
  X,
  Pencil,
  Shield,
  Truck,
  AlertCircle,
  Check,
  Building,
  Mail,
  Phone,
  CreditCard,
  ChevronDown,
} from 'lucide-react';

interface EditUserModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    userId: string,
    updatedData: Partial<UserProfile>,
    technicianDetails?: { assignedVan: string; area: string; phone: string }
  ) => void;
  existingProfiles: UserProfile[];
  currentUser: UserProfile;
  totalAdmins: number;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  user,
  isOpen,
  onClose,
  onSave,
  existingProfiles,
  currentUser,
  totalAdmins,
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [badgeId, setBadgeId] = useState('');
  const [department, setDepartment] = useState('');
  const [role, setRole] = useState<UserRole>('ADMIN');
  const [assignedVan, setAssignedVan] = useState('');
  const [assignedArea, setAssignedArea] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [error, setError] = useState<string | null>(null);

  // Sync state whenever the selected user changes
  useEffect(() => {
    if (user) {
      const cleanName = (user.name || '')
        .replace(/\s*\((?:Admin|ADMIN|Warehouse Staff|Field Tech|OPERATOR|TECHNICIAN|Field Technician|Staff)\)/gi, '')
        .trim();
      setName(cleanName);
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setBadgeId(user.badgeId || '');
      setDepartment(user.department || '');
      setRole(user.role === 'OPERATOR' ? 'ADMIN' : (user.role || 'ADMIN'));
      setAssignedVan(user.assignedVan || 'FX-VAN-08 (Toyota HiAce)');
      setAssignedArea(user.assignedArea || 'Metro Manila Central Hub');
      setStatus(user.status || 'ACTIVE');
      setError(null);
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const isCurrentUser = user.id === currentUser.id;
  const isSoleAdmin = user.role === 'ADMIN' && totalAdmins <= 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide the full name of the team member.');
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setError('Please provide a valid email address.');
      return;
    }

    // Check email uniqueness excluding current editing user
    const emailConflict = existingProfiles.some(
      (p) => p.id !== user.id && p.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (emailConflict) {
      setError(`Another team member is already registered with email "${email.trim()}".`);
      return;
    }

    // Prevent sole admin from demoting themselves
    if (isSoleAdmin && role !== 'ADMIN') {
      setError('Cannot change role: this user is the sole remaining Administrator in the system.');
      return;
    }

    // Prevent current user from suspending themselves
    if (isCurrentUser && status === 'SUSPENDED') {
      setError('You cannot suspend your own active session.');
      return;
    }

    const updatedData: Partial<UserProfile> = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      badgeId: badgeId.trim() || user.badgeId,
      department: department.trim() || user.department,
      role,
      status,
      assignedVan: role === 'TECHNICIAN' ? assignedVan.trim() : undefined,
      assignedArea: role === 'TECHNICIAN' ? assignedArea.trim() : undefined,
    };

    const techDetails =
      role === 'TECHNICIAN'
        ? {
            assignedVan: assignedVan.trim() || 'FX-VAN-08 (Toyota HiAce)',
            area: assignedArea.trim() || 'Metro Manila North / Quezon City',
            phone: phone.trim() || '+63 917 000 0000',
          }
        : undefined;

    onSave(user.id, updatedData, techDetails);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center shadow-xs">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Edit Team Member Profile</h2>
              <p className="text-xs text-slate-500">
                Modify account credentials, role level, contact details, and department
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-2 font-medium animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Role Selection Dropdown */}
          <div>
            <label htmlFor="edit-system-role-select" className="block font-bold text-slate-700 mb-1.5">
              Assigned System Role <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                id="edit-system-role-select"
                disabled={isSoleAdmin}
                value={role}
                onChange={(e) => {
                  const newRole = e.target.value as UserRole;
                  setRole(newRole);
                  if (newRole === 'ADMIN' && (!department || department.includes('Field'))) {
                    setDepartment('Central Warehouse Operations & Network Logistics');
                  } else if (newRole === 'TECHNICIAN' && (!department || department.includes('Central'))) {
                    setDepartment('Field Engineering & Provisioning');
                  }
                }}
                className={`w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer shadow-2xs appearance-none pr-10 ${
                  isSoleAdmin ? 'opacity-60 cursor-not-allowed bg-slate-50' : ''
                }`}
              >
                <option value="ADMIN">Administrator</option>
                <option value="TECHNICIAN">Field Technician</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
            {isSoleAdmin && (
              <p className="text-[11px] text-amber-700 mt-1.5 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                This user is currently the sole Administrator. Role cannot be changed.
              </p>
            )}
          </div>

          {/* Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Full Name"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Work Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex.tan@convergeict.com"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono text-slate-900 text-[11px]"
                  required
                />
              </div>
            </div>
          </div>

          {/* Phone & Badge ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Contact Phone Number
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+63 917 555 0101"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono text-slate-900 text-[11px]"
                />
              </div>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Employee Badge ID
              </label>
              <div className="relative">
                <CreditCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={badgeId}
                  onChange={(e) => setBadgeId(e.target.value)}
                  placeholder="FX-ADM-001"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 font-mono text-slate-900 text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Department / Operational Division
            </label>
            <div className="relative">
              <Building className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="e.g. Central Warehouse Operations & Network Logistics"
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-600 text-slate-900"
              />
            </div>
          </div>

          {/* Technician Specific Fields */}
          {role === 'TECHNICIAN' && (
            <div className="p-3.5 bg-teal-50/60 border border-teal-200 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-teal-700" />
                <span className="font-bold text-teal-900">Field Deployment Configuration</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-teal-900 mb-1">
                    Assigned Fleet Van
                  </label>
                  <input
                    type="text"
                    value={assignedVan}
                    onChange={(e) => setAssignedVan(e.target.value)}
                    placeholder="FX-VAN-08 (Toyota HiAce)"
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-bold text-teal-900 mb-1">
                    Assigned Dispatch Cluster
                  </label>
                  <input
                    type="text"
                    value={assignedArea}
                    onChange={(e) => setAssignedArea(e.target.value)}
                    placeholder="Metro Manila North / Quezon City"
                    className="w-full px-3 py-2 bg-white border border-teal-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-900 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:text-slate-800 font-bold hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
