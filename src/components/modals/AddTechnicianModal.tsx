import React, { useState, useEffect } from 'react';
import { Technician, UserProfile } from '../../types';
import { X, UserPlus, Truck, MapPin, Phone, Building2, UserCheck, Shield } from 'lucide-react';

interface AddTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingTechnicians: Technician[];
  onAddTechnician: (newTech: Technician, newProfile: UserProfile) => void;
}

export const AddTechnicianModal: React.FC<AddTechnicianModalProps> = ({
  isOpen,
  onClose,
  existingTechnicians,
  onAddTechnician,
}) => {
  // Generate next default employee ID
  const nextNum = existingTechnicians.length + 101;
  const suggestedEmployeeId = `FX-TECH-${nextNum}`;

  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState(suggestedEmployeeId);
  const [phone, setPhone] = useState('');
  const [assignedVan, setAssignedVan] = useState('');
  const [area, setArea] = useState('Metro Manila North / Quezon City');
  const [contactPerson, setContactPerson] = useState('');
  const [hubAddress, setHubAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form with updated defaults whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const freshNum = existingTechnicians.length + 101;
      setName('');
      setEmployeeId(`FX-TECH-${freshNum}`);
      setPhone('');
      setAssignedVan('');
      setArea('Metro Manila North / Quezon City');
      setContactPerson('');
      setHubAddress('');
      setError(null);
    }
  }, [isOpen, existingTechnicians.length]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanId = employeeId.trim().toUpperCase();

    if (!cleanName) {
      setError('Please provide the technician full name.');
      return;
    }
    if (!cleanId) {
      setError('Please provide a valid Employee ID.');
      return;
    }

    if (existingTechnicians.some((t) => t.employeeId.toUpperCase() === cleanId)) {
      setError(`Employee ID "${cleanId}" is already assigned to another technician.`);
      return;
    }

    const techId = `tech-${Date.now().toString().slice(-4)}`;
    const newTech: Technician = {
      id: techId,
      name: cleanName,
      employeeId: cleanId,
      phone: phone.trim() || '+63 917 000 0000',
      assignedVan: assignedVan.trim() || 'FX-VAN-01 (Utility Van)',
      area: area.trim() || 'Central Metro Manila',
      activeJobCount: 0,
      completedCount: 0,
      contactPerson: contactPerson.trim(),
      hubAddress: hubAddress.trim(),
      isFlagged: false,
    };

    const newProfile: UserProfile = {
      id: `user-${techId}`,
      name: cleanName,
      email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '.')}@convergeict.com`,
      role: 'TECHNICIAN',
      technicianId: techId,
      badgeId: cleanId,
      department: 'Field Engineering & Provisioning',
      phone: phone.trim() || '+63 917 000 0000',
      status: 'ACTIVE',
      assignedVan: assignedVan.trim() || 'FX-VAN-01 (Utility Van)',
      assignedArea: area.trim() || 'Central Metro Manila',
      createdAt: new Date().toISOString(),
    };

    onAddTechnician(newTech, newProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 shadow-2xs">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Field Technician Account</h2>
              <p className="text-xs text-slate-500">
                Instantly registered in Fleet Stock Roster & Equipment Assignment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Technician Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. Carlos Dizon"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  setError(null);
                }}
                placeholder="e.g. FX-TECH-105"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                <span>Assigned Fleet Vehicle / Van</span>
              </label>
              <input
                type="text"
                value={assignedVan}
                onChange={(e) => setAssignedVan(e.target.value)}
                placeholder="e.g. FX-VAN-25 (Toyota HiAce)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                <span>Mobile Contact Phone</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+63 917 000 0000"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>Service Area & Cluster</span>
            </label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-medium cursor-pointer"
            >
              <option value="Metro Manila North / Quezon City">Metro Manila North / Quezon City</option>
              <option value="Metro Manila South / Taguig & Pasig">Metro Manila South / Taguig & Pasig</option>
              <option value="Cavite / Bacoor & Imus">Cavite / Bacoor & Imus</option>
              <option value="Pampanga / San Fernando Cluster">Pampanga / San Fernando Cluster</option>
              <option value="Bulacan / Malolos & Meycauayan">Bulacan / Malolos & Meycauayan</option>
              <option value="Rizal / Antipolo & Cainta">Rizal / Antipolo & Cainta</option>
              <option value="Laguna / Calamba & Santa Rosa">Laguna / Calamba & Santa Rosa</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                <span>Supervisor / Contact Person</span>
              </label>
              <input
                type="text"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                placeholder="e.g. Area Supervisor (+63 917 ...)"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Hub Fulfillment Center</span>
              </label>
              <input
                type="text"
                value={hubAddress}
                onChange={(e) => setHubAddress(e.target.value)}
                placeholder="e.g. Central Warehouse Fulfillment Hub"
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl flex items-center gap-2 text-xs text-teal-800">
            <Shield className="w-4 h-4 text-teal-600 shrink-0" />
            <span>
              Account will automatically be synchronized across the <strong>Fleet Stock Roster</strong>, the <strong>Assign Technician workspace</strong>, and the <strong>Persona Switcher</strong>.
            </span>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Technician</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
