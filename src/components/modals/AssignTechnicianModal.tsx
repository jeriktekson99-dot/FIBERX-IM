import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  InventoryItem,
  Technician,
  UserProfile,
  ItemCategory,
  CATEGORY_LABELS,
  HARDWARE_CATEGORY_CATALOG,
} from '../../types';
import { getUserInitials } from '../../utils/userInitials';
import {
  X,
  UserCheck,
  Truck,
  ShieldAlert,
  CheckCircle,
  Package,
  Search,
  Check,
  Trash2,
  MapPin,
  AlertTriangle,
  ArrowRight,
  Barcode,
  Plus,
  Minus,
  CheckCircle2,
  FileSpreadsheet,
  Flag,
  ShieldCheck,
  Layers,
  ChevronDown,
  ChevronUp,
  Building2,
  Phone,
  Link,
  Link2,
  Unlink,
  Info,
  Table,
  LayoutGrid,
  UserPlus,
  Filter,
  ArrowLeftRight,
  Wifi,
  Cable,
  GitFork,
  Radio,
  Boxes,
  Tag,
  Users,
  Sparkles,
} from 'lucide-react';
import { downloadTechnicianExcelFile } from '../../utils/excelExport';
import {
  checkEquipmentCompatibility,
  COMPATIBILITY_RULES,
  findAvailableModemAssociatedMaterials,
  isModemItem,
  MODEM_ASSOCIATED_MATERIALS_SPECS,
} from '../../utils/equipmentPairing';
import { FlagTechnicianModal } from './FlagTechnicianModal';
import { WarehouseUtilizationModal } from './WarehouseUtilizationModal';
import { AddTechnicianModal } from './AddTechnicianModal';

export interface CompanionPairInfo {
  pairedItemId: string;
  pairedItemName: string;
  pairedItemSerial: string;
}

export interface AssignTechnicianModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: InventoryItem[];
  allInventory: InventoryItem[];
  technicians: Technician[];
  initialTechnicianId?: string;
  onAssign: (
    assignments:
      | {
          itemId: string;
          quantity: number;
          pairedItemId?: string;
          pairedItemSerial?: string;
          pairedItemName?: string;
          pairingStatus?: 'PAIRED' | 'UNPAIRED';
          slotNumber?: string;
          assignmentScope?: 'INDIVIDUAL' | 'TEAM';
        }[]
      | string[],
    technician: Technician,
    notes?: string,
    overrideInfo?: { isOverride: boolean; overrideReason?: string }
  ) => void;
  currentUser: UserProfile;
  availableProfiles?: UserProfile[];
  externalScan?: { code: string; timestamp: number } | null;
  isFullPage?: boolean;
  onToggleFlagTechnician?: (technicianId: string, isFlagged: boolean, reason?: string) => void;
  onUpdateUtilization?: (itemId: string, utilizedQuantity: number, notes?: string) => void;
  onAddTechnician?: (newTech: Technician, newProfile: UserProfile) => void;
}

const getHardwareCategoryIcon = (catId: ItemCategory) => {
  switch (catId) {
    case 'MODEM_ONT':
      return Wifi;
    case 'FIBER_CABLE':
      return Cable;
    case 'SPLITTER':
      return GitFork;
    case 'PATCH_CORD':
      return Radio;
    case 'ACCESSORY':
      return Boxes;
    default:
      return Package;
  }
};

export const AssignTechnicianModal: React.FC<AssignTechnicianModalProps> = ({
  isOpen,
  onClose,
  initialItems = [],
  allInventory,
  technicians,
  initialTechnicianId = '',
  onAssign,
  currentUser,
  availableProfiles = [],
  externalScan = null,
  isFullPage = false,
  onToggleFlagTechnician,
  onUpdateUtilization,
  onAddTechnician,
}) => {
  const [selectedTechId, setSelectedTechId] = useState<string>('');
  // Team vs Individual assignment scope (Item 1)
  const [assignmentScope, setAssignmentScope] = useState<'TEAM' | 'INDIVIDUAL'>('TEAM');
  // Auto-include commonly associated materials for modems (Item 2)
  const [autoIncludeMaterials, setAutoIncludeMaterials] = useState<boolean>(true);

  // Map of itemId -> assigned quantity
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<Map<string, number>>(new Map());
  // Custom slot mappings for newly assigned items
  const [customSlots, setCustomSlots] = useState<Map<string, string>>(new Map());
  // Companion equipment pairings for newly assigned items: itemId -> paired equipment metadata
  const [customPairings, setCustomPairings] = useState<Map<string, CompanionPairInfo>>(
    () => new Map<string, CompanionPairInfo>()
  );

  const [techSearch, setTechSearch] = useState<string>('');
  const [techViewMode, setTechViewMode] = useState<'TABLE' | 'CARDS'>('TABLE');
  const [techAreaFilter, setTechAreaFilter] = useState<string>('ALL');
  const [techCustodyFilter, setTechCustodyFilter] = useState<'ALL' | 'WITH_CUSTODY' | 'WITH_PENDING' | 'FLAGGED'>('ALL');
  const [isAddTechModalOpen, setIsAddTechModalOpen] = useState<boolean>(false);
  const [inventorySearch, setInventorySearch] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ItemCategory>('ALL');
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [workOrderRef, setWorkOrderRef] = useState<string>('');
  const [dispatchNotes, setDispatchNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Overhaul states:
  const [showHandledProducts, setShowHandledProducts] = useState(false);
  const [custodyFilter, setCustodyFilter] = useState<'ALL' | 'VAN_CUSTODY' | 'UTILIZED' | 'AFTER_DISPATCH'>('VAN_CUSTODY');
  const [isOverrideAuthorized, setIsOverrideAuthorized] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');

  // Sub-modal states
  const [isFlagModalOpen, setIsFlagModalOpen] = useState(false);
  const [isUtilizationModalOpen, setIsUtilizationModalOpen] = useState(false);
  // Equipment Pairing by Hardware Categories modal state
  const [pairingTargetItem, setPairingTargetItem] = useState<InventoryItem | null>(null);
  const [pairingCategoryFilter, setPairingCategoryFilter] = useState<'ALL' | ItemCategory>('ALL');
  const [pairingSearch, setPairingSearch] = useState<string>('');

  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const lastHandledScanRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Web Audio chime generator
  const playAudioChime = useCallback((type: 'scan' | 'warn') => {
    try {
      if (!audioCtxRef.current) {
        const AudioContextClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const now = ctx.currentTime;

      if (type === 'scan') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1760, now + 0.12);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
      } else {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
      }
    } catch {
      // Audio playback failsafe
    }
  }, []);

  // Build complete list of assignable users/technicians (Item 3: Missing Users in the Assignment List)
  const allAssignableTechnicians = useMemo(() => {
    const list: Technician[] = [...technicians];

    const isGenericBadge = (id?: string) => {
      if (!id) return true;
      const clean = id.trim().toUpperCase();
      return (
        clean === 'N/A' ||
        clean === 'FIELD TECHNICIAN' ||
        clean === 'TECHNICIAN' ||
        clean === 'ADMIN' ||
        clean === 'FX-TECH' ||
        clean === 'FX-ADM' ||
        clean === 'FX-USR'
      );
    };

    // Merge active user accounts from availableProfiles that do not already have an entry in technicians
    availableProfiles.forEach((profile) => {
      if (profile.status === 'SUSPENDED') return;
      const alreadyPresent = list.some(
        (t) =>
          t.id === profile.id ||
          t.id === profile.technicianId ||
          (t.name && profile.name && t.name.toLowerCase().trim() === profile.name.toLowerCase().trim()) ||
          (!isGenericBadge(t.employeeId) && !isGenericBadge(profile.badgeId) && t.employeeId.toUpperCase() === profile.badgeId.toUpperCase())
      );

      if (!alreadyPresent) {
        list.push({
          id: profile.technicianId || profile.id,
          name: profile.name,
          employeeId: !isGenericBadge(profile.badgeId) ? profile.badgeId : `FX-${profile.role.slice(0, 3)}-${profile.id.slice(-4)}`,
          phone: profile.phone || '',
          assignedVan: profile.assignedVan || (profile.department?.includes('SLI') ? 'FX-VAN-30 (Toyota HiAce)' : 'Van 04 (Fleet Alpha)'),
          area: profile.assignedArea || profile.department || 'Metro Manila Logistics',
          activeJobCount: 0,
          completedCount: 0,
        });
      }
    });

    return list;
  }, [technicians, availableProfiles]);

  // Initialize modal state when opened
  useEffect(() => {
    if (isOpen) {
      if (initialTechnicianId && allAssignableTechnicians.some((t) => t.id === initialTechnicianId)) {
        setSelectedTechId(initialTechnicianId);
      } else if (allAssignableTechnicians.length > 0) {
        setSelectedTechId(allAssignableTechnicians[0].id);
      }

      if (initialItems && initialItems.length > 0) {
        const initialMap = new Map<string, number>();
        let hasModem = false;
        initialItems.forEach((i) => {
          initialMap.set(i.id, Math.max(1, Math.min(1, i.quantity)));
          if (isModemItem(i)) {
            hasModem = true;
          }
        });

        // Auto-include commonly associated materials whenever a modem is assigned (Item 2)
        if (hasModem) {
          const selectedKeys = new Set(initialMap.keys());
          const associated = findAvailableModemAssociatedMaterials(allInventory, selectedKeys);
          const autoIncludedSummary: string[] = [];
          associated.forEach(({ spec, matchedItem }) => {
            if (matchedItem) {
              const curMatQty = initialMap.get(matchedItem.id) || 0;
              if (curMatQty < matchedItem.quantity) {
                initialMap.set(matchedItem.id, curMatQty + 1);
                autoIncludedSummary.push(`${spec.label} (${matchedItem.name})`);
              }
            }
          });
          if (autoIncludedSummary.length > 0) {
            setFeedback({
              text: `Auto-included associated materials for Modem: ${autoIncludedSummary.join(', ')}.`,
              type: 'success',
            });
          }
        }

        setSelectedItemQuantities(initialMap);
      } else {
        setSelectedItemQuantities(new Map());
      }

      setFeedback(null);
      setError(null);
      setTechSearch('');
      setInventorySearch('');
      setCategoryFilter('ALL');
      setBarcodeInput('');
      setCustomPairings(new Map());
      setPairingTargetItem(null);
      setPairingCategoryFilter('ALL');
      setPairingSearch('');
      setIsOverrideAuthorized(false);
      setOverrideReason('');
      setShowHandledProducts(false);
      setCustodyFilter('VAN_CUSTODY');
      setAssignmentScope('TEAM');
      setAutoIncludeMaterials(true);

      const timer = setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen, initialTechnicianId, initialItems, allAssignableTechnicians]);

  const selectedTechnician = useMemo(() => {
    return allAssignableTechnicians.find((t) => t.id === selectedTechId) || allAssignableTechnicians[0];
  }, [allAssignableTechnicians, selectedTechId]);

  // All products currently handled by this technician in their vehicle/custody
  const productsCurrentlyHandled = useMemo(() => {
    if (!selectedTechnician) return [];
    return allInventory.filter(
      (item) =>
        !item.archived &&
        (item.assignedTechnicianId === selectedTechnician.id ||
          item.submittedByTechnicianId === selectedTechnician.id ||
          item.closedByTechnicianId === selectedTechnician.id)
    );
  }, [allInventory, selectedTechnician]);

  // Total on-hand stocks currently assigned and in van custody (uninstalled)
  const currentOnHandItems = useMemo(() => {
    if (!selectedTechnician) return [];
    return productsCurrentlyHandled.filter(
      (i) =>
        i.assignedTechnicianId === selectedTechnician.id &&
        (i.lifecycleStatus === 'ASSIGNED_RESERVED' || i.status === 'ASSIGNED') &&
        (i.verificationStatus === 'UNLINKED_READY' || !i.customerAccountNumber)
    );
  }, [productsCurrentlyHandled, selectedTechnician]);

  const totalCurrentOnHandUnits = useMemo(() => {
    return currentOnHandItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
  }, [currentOnHandItems]);

  // Warehouse items utilized or installed by this technician
  const utilizedItems = useMemo(() => {
    if (!selectedTechnician) return [];
    return productsCurrentlyHandled.filter(
      (item) =>
        (item.utilizedQuantity !== undefined && item.utilizedQuantity > 0) ||
        item.isUtilized ||
        item.verificationStatus === 'VERIFIED_CONNECTED' ||
        item.lifecycleStatus === 'INSTALLED_DEPLOYED' ||
        Boolean(item.customerAccountNumber) ||
        item.closedByTechnicianId === selectedTechnician.id
    );
  }, [productsCurrentlyHandled, selectedTechnician]);

  const warehouseUtilizedUnits = useMemo(() => {
    return utilizedItems.reduce((sum, item) => {
      if (item.utilizedQuantity !== undefined && item.utilizedQuantity > 0) {
        return sum + item.utilizedQuantity;
      }
      return sum + (item.quantity || 1);
    }, 0);
  }, [utilizedItems]);

  // Filter in-stock items available in warehouse
  const availableInStockItems = useMemo(() => {
    return allInventory.filter(
      (item) => !item.archived && (item.status === 'IN_STOCK' || selectedItemQuantities.has(item.id))
    );
  }, [allInventory, selectedItemQuantities]);

  const filteredInStockItems = useMemo(() => {
    return availableInStockItems.filter((item) => {
      if (categoryFilter !== 'ALL' && item.category !== categoryFilter) {
        return false;
      }
      if (inventorySearch.trim()) {
        const query = inventorySearch.toLowerCase();
        const matchesSerial = item.serialNumber.toLowerCase().includes(query);
        const matchesSku = item.sku.toLowerCase().includes(query);
        const matchesName = item.name.toLowerCase().includes(query);
        const matchesBin = item.storageBin?.toLowerCase().includes(query);
        const matchesMac = item.macAddress?.toLowerCase().includes(query);
        if (!matchesSerial && !matchesSku && !matchesName && !matchesBin && !matchesMac) {
          return false;
        }
      }
      return true;
    });
  }, [availableInStockItems, categoryFilter, inventorySearch]);

  // Available stock count per hardware category
  const categoryAvailableCounts = useMemo(() => {
    const map: Record<string, number> = { ALL: availableInStockItems.length };
    HARDWARE_CATEGORY_CATALOG.forEach((cat) => {
      map[cat.id] = availableInStockItems.filter((i) => i.category === cat.id).length;
    });
    return map;
  }, [availableInStockItems]);

  // Hardware categories to display in the stock browsing section
  const categoriesToRender = useMemo(() => {
    if (categoryFilter === 'ALL') {
      return HARDWARE_CATEGORY_CATALOG;
    }
    return HARDWARE_CATEGORY_CATALOG.filter((c) => c.id === categoryFilter);
  }, [categoryFilter]);

  // Distinct service areas for technician filtering
  const distinctTechAreas = useMemo(() => {
    return Array.from(new Set(allAssignableTechnicians.map((t) => t.area).filter(Boolean)));
  }, [allAssignableTechnicians]);

  // Live technician stats map matching the Fleet Stock Roster in TechnicianHubView
  const technicianStatsMap = useMemo(() => {
    const map: Record<
      string,
      {
        inCustodyCount: number;
        awaitingVerificationCount: number;
        connectedCount: number;
        utilizedCount: number;
      }
    > = {};

    allAssignableTechnicians.forEach((tech) => {
      const activeTechItems = allInventory.filter(
        (item) =>
          !item.archived &&
          (item.assignedTechnicianId === tech.id ||
            item.submittedByTechnicianId === tech.id ||
            item.closedByTechnicianId === tech.id)
      );

      const inCustody = activeTechItems
        .filter(
          (i) =>
            i.assignedTechnicianId === tech.id &&
            (i.lifecycleStatus === 'ASSIGNED_RESERVED' || i.status === 'ASSIGNED') &&
            (i.verificationStatus === 'UNLINKED_READY' || !i.customerAccountNumber)
        )
        .reduce((sum, i) => sum + (i.quantity || 1), 0);

      const awaitingVerification = activeTechItems.filter(
        (i) =>
          i.verificationStatus === 'AWAITING_VERIFICATION' ||
          i.status === 'AWAITING_ADMIN_VERIFICATION' ||
          i.status === 'SUSPECTED_DUPLICATE'
      ).length;

      const connected = activeTechItems.filter(
        (i) =>
          i.verificationStatus === 'VERIFIED_CONNECTED' ||
          i.status === 'INSTALLED_VERIFIED' ||
          i.status === 'INSTALLED_CLOSED' ||
          i.lifecycleStatus === 'INSTALLED_DEPLOYED'
      ).length;

      const utilized = activeTechItems.reduce((sum, i) => {
        if (typeof i.utilizedQuantity === 'number' && i.utilizedQuantity > 0) {
          return sum + i.utilizedQuantity;
        }
        if (
          i.verificationStatus === 'VERIFIED_CONNECTED' ||
          i.lifecycleStatus === 'INSTALLED_DEPLOYED'
        ) {
          return sum + (i.quantity || 1);
        }
        return sum;
      }, 0);

      map[tech.id] = {
        inCustodyCount: inCustody,
        awaitingVerificationCount: awaitingVerification,
        connectedCount: connected,
        utilizedCount: utilized,
      };
    });

    return map;
  }, [allAssignableTechnicians, allInventory]);

  // Filtered technicians list with Search, Area, and Custody status
  const filteredTechnicians = useMemo(() => {
    const q = techSearch.toLowerCase().trim();
    return allAssignableTechnicians.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        t.employeeId.toLowerCase().includes(q) ||
        t.assignedVan.toLowerCase().includes(q) ||
        t.area.toLowerCase().includes(q);

      const matchesArea = techAreaFilter === 'ALL' || t.area === techAreaFilter;

      let matchesCustody = true;
      const stats = technicianStatsMap[t.id];
      if (techCustodyFilter === 'WITH_CUSTODY') {
        matchesCustody = (stats?.inCustodyCount || 0) > 0;
      } else if (techCustodyFilter === 'WITH_PENDING') {
        matchesCustody = (stats?.awaitingVerificationCount || 0) > 0;
      } else if (techCustodyFilter === 'FLAGGED') {
        matchesCustody = !!t.isFlagged;
      }

      return matchesSearch && matchesArea && matchesCustody;
    });
  }, [allAssignableTechnicians, techSearch, techAreaFilter, techCustodyFilter, technicianStatsMap]);

  // Selected items objects with assigned quantities, slots, and companion pairing
  const selectedItemsWithQty = useMemo(() => {
    const list: {
      item: InventoryItem;
      quantity: number;
      slotNumber: string;
      pairingStatus: 'PAIRED' | 'UNPAIRED';
      pairedItem?: {
        id: string;
        name: string;
        serialNumber: string;
        category?: ItemCategory;
      };
      isBundledMaterial?: boolean;
    }[] = [];
    let slotIndex = 1;

    const hasAnyModem = Array.from(selectedItemQuantities.keys()).some((id) => {
      const it = allInventory.find((i) => i.id === id);
      return it ? isModemItem(it) : false;
    });

    selectedItemQuantities.forEach((qty, id) => {
      const item = allInventory.find((i) => i.id === id);
      if (item) {
        const assignedSlot =
          customSlots.get(id) || item.slotNumber || `SLOT-${String(slotIndex).padStart(2, '0')}`;

        const customPair = customPairings.get(id);
        let isPaired = false;
        let pairedItemInfo:
          | { id: string; name: string; serialNumber: string; category?: ItemCategory }
          | undefined = undefined;

        if (customPair) {
          const companion = allInventory.find((i) => i.id === customPair.pairedItemId);
          pairedItemInfo = {
            id: customPair.pairedItemId,
            name: customPair.pairedItemName,
            serialNumber: customPair.pairedItemSerial,
            category: companion?.category,
          };
          isPaired = true;
        } else if (item.pairedItemId || item.pairedItemSerial) {
          const companion = allInventory.find((i) => i.id === item.pairedItemId);
          pairedItemInfo = {
            id: item.pairedItemId || '',
            name: item.pairedItemName || 'Paired Equipment',
            serialNumber: item.pairedItemSerial || '',
            category: companion?.category,
          };
          isPaired = true;
        }

        const isBundled =
          hasAnyModem &&
          !isModemItem(item) &&
          MODEM_ASSOCIATED_MATERIALS_SPECS.some((spec) => spec.matcher(item));

        list.push({
          item,
          quantity: qty,
          slotNumber: assignedSlot,
          pairingStatus: isPaired ? 'PAIRED' : 'UNPAIRED',
          pairedItem: pairedItemInfo,
          isBundledMaterial: isBundled,
        });
        slotIndex++;
      }
    });
    return list;
  }, [allInventory, selectedItemQuantities, customSlots, customPairings]);

  const totalAssignedUnits = useMemo(() => {
    let total = 0;
    selectedItemQuantities.forEach((q) => {
      total += q;
    });
    return total;
  }, [selectedItemQuantities]);

  // Projected items in custody after current dispatch batch is finalized
  const afterDispatchItems = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      serialNumber: string;
      sku: string;
      category: string;
      slotNumber: string;
      pairingStatus: 'PAIRED' | 'UNPAIRED';
      pairedItemName?: string;
      quantity: number;
      unit: string;
      originType: 'CURRENT_VAN' | 'INCOMING_DISPATCH';
      statusLabel: string;
      customerAccountNumber?: string;
    }> = [];

    // 1. Current van stock
    currentOnHandItems.forEach((item, idx) => {
      const slot = item.slotNumber || `SLOT-${String((idx % 24) + 1).padStart(2, '0')}`;
      const isPaired =
        item.pairingStatus === 'PAIRED' ||
        Boolean(item.pairedItemSerial) ||
        Boolean(item.pairedItemName);
      list.push({
        id: item.id,
        name: item.name,
        serialNumber: item.serialNumber,
        sku: item.sku,
        category: item.category,
        slotNumber: slot,
        pairingStatus: isPaired ? 'PAIRED' : 'UNPAIRED',
        pairedItemName: item.pairedItemName,
        quantity: item.quantity,
        unit: item.unit || 'units',
        originType: 'CURRENT_VAN',
        statusLabel: 'In Van Custody',
        customerAccountNumber: item.customerAccountNumber,
      });
    });

    // 2. Incoming from current dispatch form
    selectedItemsWithQty.forEach((entry) => {
      const isPaired = entry.pairingStatus === 'PAIRED' || Boolean(entry.pairedItem);
      list.push({
        id: `incoming-${entry.item.id}`,
        name: entry.item.name,
        serialNumber: entry.item.serialNumber,
        sku: entry.item.sku,
        category: entry.item.category,
        slotNumber: entry.slotNumber,
        pairingStatus: isPaired ? 'PAIRED' : 'UNPAIRED',
        pairedItemName: entry.pairedItem?.name || entry.item.pairedItemName,
        quantity: entry.quantity,
        unit: entry.item.unit || 'units',
        originType: 'INCOMING_DISPATCH',
        statusLabel: 'Incoming in this Dispatch',
        customerAccountNumber: undefined,
      });
    });

    return list;
  }, [currentOnHandItems, selectedItemsWithQty]);

  // Click handler for the 3 custody metric cards: toggles list or switches view tab
  const handleToggleCustodyTab = (tab: 'VAN_CUSTODY' | 'UTILIZED' | 'AFTER_DISPATCH') => {
    if (showHandledProducts && custodyFilter === tab) {
      setShowHandledProducts(false);
    } else {
      setCustodyFilter(tab);
      setShowHandledProducts(true);
    }
  };

  // Handle item selection and auto-bundle associated materials for modems (Item 2)
  const handleSelectItem = useCallback(
    (found: InventoryItem) => {
      if (found.archived) {
        playAudioChime('warn');
        setFeedback({
          text: `Item [${found.serialNumber || found.sku}] is archived and cannot be assigned.`,
          type: 'warn',
        });
        return;
      }

      if (found.status !== 'IN_STOCK' && !selectedItemQuantities.has(found.id)) {
        playAudioChime('warn');
        setFeedback({
          text: `Item [${found.serialNumber || found.sku}] is currently [${found.status}] (${
            found.assignedTechnicianName ? `Assigned to ${found.assignedTechnicianName}` : 'Unavailable'
          }).`,
          type: 'warn',
        });
        return;
      }

      const currentQty = selectedItemQuantities.get(found.id) || 0;
      if (currentQty >= found.quantity) {
        playAudioChime('warn');
        setFeedback({
          text: `Maximum available stock (${found.quantity} ${found.unit}) already reached for [${found.name}].`,
          type: 'warn',
        });
        return;
      }

      const nextQty = currentQty + 1;
      playAudioChime('scan');

      // Check if item is a modem and autoIncludeMaterials is active
      const isModem = isModemItem(found);
      const autoIncludedSummary: string[] = [];

      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(found.id, nextQty);

        if (isModem && autoIncludeMaterials) {
          const selectedKeys = new Set(next.keys());
          const associated = findAvailableModemAssociatedMaterials(allInventory, selectedKeys);
          associated.forEach(({ spec, matchedItem }) => {
            if (matchedItem) {
              const curMatQty = next.get(matchedItem.id) || 0;
              if (curMatQty < matchedItem.quantity) {
                next.set(matchedItem.id, curMatQty + 1);
                autoIncludedSummary.push(`${spec.label} (${matchedItem.name})`);
              }
            }
          });
        }

        return next;
      });

      setBarcodeInput('');
      setFeedback({
        text:
          currentQty === 0
            ? `Selected: [${found.name}] — 1 of ${found.quantity} ${found.unit} available.${
                autoIncludedSummary.length > 0
                  ? ` Auto-included associated materials: ${autoIncludedSummary.join(', ')}.`
                  : ''
              }`
            : `Incremented [${found.name}] to ${nextQty} of ${found.quantity} ${found.unit}.${
                autoIncludedSummary.length > 0
                  ? ` Auto-included materials: ${autoIncludedSummary.join(', ')}.`
                  : ''
              }`,
        type: 'success',
      });
      setError(null);

      setTimeout(() => {
        if (barcodeInputRef.current) {
          barcodeInputRef.current.focus();
        }
      }, 50);
    },
    [allInventory, selectedItemQuantities, autoIncludeMaterials, playAudioChime]
  );

  // Handle barcode lookup and auto-selection
  const handleProcessBarcode = useCallback(
    (rawCode: string) => {
      const clean = rawCode.trim().toUpperCase();
      if (!clean) return;

      const found = allInventory.find(
        (it) =>
          it.id === clean ||
          it.serialNumber.toUpperCase() === clean ||
          it.serialNumber.toUpperCase().split(/\s+/).includes(clean) ||
          it.sku.toUpperCase() === clean ||
          (it.macAddress &&
            it.macAddress.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ===
              clean.replace(/[^A-Za-z0-9]/g, ''))
      );

      if (!found) {
        playAudioChime('warn');
        setFeedback({
          text: `Barcode [${clean}] is NOT registered in main warehouse inventory! Cannot be selected. Please receive it into inventory first.`,
          type: 'warn',
        });
        return;
      }

      handleSelectItem(found);
    },
    [allInventory, handleSelectItem, playAudioChime]
  );

  // Handle hardware laser scanner events
  useEffect(() => {
    if (externalScan && externalScan.timestamp > lastHandledScanRef.current) {
      lastHandledScanRef.current = externalScan.timestamp;
      handleProcessBarcode(externalScan.code);
    }
  }, [externalScan, handleProcessBarcode]);

  // Stepper handlers
  const handleDecrement = (itemId: string) => {
    const current = selectedItemQuantities.get(itemId) || 1;
    if (current > 1) {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemId, current - 1);
        return next;
      });
    }
  };

  const handleIncrement = (itemId: string) => {
    const item = allInventory.find((i) => i.id === itemId);
    if (!item) return;
    const current = selectedItemQuantities.get(itemId) || 1;
    if (current < item.quantity) {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemId, current + 1);

        // If incrementing a modem and autoIncludeMaterials is active, ensure associated materials match
        if (isModemItem(item) && autoIncludeMaterials) {
          const associated = findAvailableModemAssociatedMaterials(allInventory, new Set());
          associated.forEach(({ matchedItem }) => {
            if (matchedItem) {
              const curMat = next.get(matchedItem.id) || 0;
              if (curMat < matchedItem.quantity) {
                next.set(matchedItem.id, curMat + 1);
              }
            }
          });
        }

        return next;
      });
    } else {
      setFeedback({
        text: `Cannot exceed available stock for [${item.serialNumber}]. Max available: ${item.quantity} ${item.unit}.`,
        type: 'warn',
      });
    }
  };

  const handleManualQuantityChange = (itemId: string, rawVal: string) => {
    const item = allInventory.find((i) => i.id === itemId);
    if (!item) return;

    if (rawVal === '') {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemId, 1);
        return next;
      });
      return;
    }

    const val = parseInt(rawVal, 10);
    if (isNaN(val)) return;

    if (val > item.quantity) {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemId, item.quantity);
        return next;
      });
      setFeedback({
        text: `Quantity capped at maximum available stock (${item.quantity} ${item.unit}) for [${item.serialNumber}].`,
        type: 'warn',
      });
    } else if (val < 1) {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemId, 1);
        return next;
      });
    } else {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemId, val);
        return next;
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItemQuantities((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
    setCustomSlots((prev) => {
      const next = new Map(prev);
      next.delete(itemId);
      return next;
    });
    setCustomPairings((prev: Map<string, CompanionPairInfo>) => {
      const next = new Map(prev);
      const existing = next.get(itemId);
      if (existing) {
        next.delete(existing.pairedItemId);
      }
      next.delete(itemId);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedItemQuantities(new Map());
    setCustomSlots(new Map());
    setCustomPairings(new Map());
  };

  const handleSlotChange = (itemId: string, slot: string) => {
    setCustomSlots((prev) => {
      const next = new Map(prev);
      next.set(itemId, slot);
      return next;
    });
  };

  // Pairing Handlers
  const handlePairItems = (itemAId: string, itemBId: string) => {
    const itemA = allInventory.find((i) => i.id === itemAId);
    const itemB = allInventory.find((i) => i.id === itemBId);
    if (!itemA || !itemB || itemAId === itemBId) return;

    setCustomPairings((prev: Map<string, CompanionPairInfo>) => {
      const next = new Map(prev);
      const prevA = next.get(itemAId);
      if (prevA && prevA.pairedItemId !== itemBId) {
        next.delete(prevA.pairedItemId);
      }
      const prevB = next.get(itemBId);
      if (prevB && prevB.pairedItemId !== itemAId) {
        next.delete(prevB.pairedItemId);
      }

      next.set(itemAId, {
        pairedItemId: itemB.id,
        pairedItemName: itemB.name,
        pairedItemSerial: itemB.serialNumber || itemB.sku,
      });
      next.set(itemBId, {
        pairedItemId: itemA.id,
        pairedItemName: itemA.name,
        pairedItemSerial: itemA.serialNumber || itemA.sku,
      });
      return next;
    });

    // If itemB is not yet in current dispatch batch, add it with quantity 1
    if (!selectedItemQuantities.has(itemBId)) {
      setSelectedItemQuantities((prev) => {
        const next = new Map(prev);
        next.set(itemBId, 1);
        return next;
      });
      playAudioChime('scan');
      setFeedback({
        text: `Paired ${itemA.name} with compatible companion ${itemB.name} and added it to dispatch batch.`,
        type: 'success',
      });
    } else {
      playAudioChime('scan');
      setFeedback({
        text: `Paired ${itemA.name} with companion ${itemB.name}.`,
        type: 'success',
      });
    }
  };

  const handleUnpairItem = (itemId: string) => {
    const item = allInventory.find((i) => i.id === itemId);
    setCustomPairings((prev: Map<string, CompanionPairInfo>) => {
      const next = new Map(prev);
      const companion = next.get(itemId);
      if (companion) {
        next.delete(companion.pairedItemId);
      }
      next.delete(itemId);
      return next;
    });
    if (item) {
      setFeedback({
        text: `Unpaired ${item.name}.`,
        type: 'warn',
      });
    }
  };

  // Export to Excel handlers
  const handleExportThisTech = () => {
    if (!selectedTechnician) return;
    downloadTechnicianExcelFile({
      technicians,
      inventory: allInventory,
      selectedTechId: selectedTechnician.id,
      currentUser,
    });
  };

  const handleExportAllTechs = () => {
    downloadTechnicianExcelFile({
      technicians,
      inventory: allInventory,
      selectedTechId: 'ALL',
      currentUser,
    });
  };

  // Handle assignment dispatch submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTechnician) {
      setError('Please select an active Field Technician.');
      return;
    }

    // Flagged Technician & Validity Override Check:
    if (selectedTechnician.isFlagged) {
      if (!isOverrideAuthorized || !overrideReason.trim()) {
        setError(
          `Technician ${selectedTechnician.name} is FLAGGED (${selectedTechnician.flagReason}). You must authorize an Operational Validity Override with a mandatory justification to proceed.`
        );
        return;
      }
    }

    if (selectedItemQuantities.size === 0) {
      setError('Please scan at least one stock item to dispatch to this technician.');
      return;
    }

    const fullNotes = [
      workOrderRef.trim() ? `Work Order: ${workOrderRef.trim()}` : null,
      dispatchNotes.trim() || null,
      selectedTechnician.isFlagged
        ? `[ADMIN OVERRIDE: ${overrideReason.trim()} by ${currentUser.name} (${currentUser.badgeId})]`
        : null,
    ]
      .filter(Boolean)
      .join(' | ');

    const assignments = Array.from(selectedItemQuantities.entries()).map(([itemId, quantity]) => {
      const customPair = customPairings.get(itemId);
      const slot = customSlots.get(itemId);
      return {
        itemId,
        quantity,
        pairedItemId: customPair?.pairedItemId,
        pairedItemSerial: customPair?.pairedItemSerial,
        pairedItemName: customPair?.pairedItemName,
        pairingStatus: customPair ? ('PAIRED' as const) : ('UNPAIRED' as const),
        slotNumber: slot,
        assignmentScope,
      };
    });

    onAssign(assignments, selectedTechnician, fullNotes || undefined, {
      isOverride: selectedTechnician.isFlagged ? isOverrideAuthorized : false,
      overrideReason: overrideReason.trim(),
    });
  };

  if (!isOpen) return null;

  const content = (
    <div className="flex-1 min-w-0 h-full w-full bg-white overflow-hidden flex flex-col">
      {/* Top Header Bar */}
      <div className="px-6 py-4 bg-white text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Assign to Tech — Fleet Dispatch & Slot Tracking
            </h2>
            <p className="text-xs text-slate-500">
              Manage on-hand stocks, product pairing, slot tracking in Excel & warehouse utilization
            </p>
          </div>
        </div>

        {/* Action Buttons: Excel Export, Utilization Check, Print Slip */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Export to Excel Menu */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={handleExportThisTech}
              title="Export this technician's stock, slots & pairings to Excel"
              className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-white rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Tech Excel</span>
            </button>
            <span className="w-px h-4 bg-slate-200 mx-0.5" />
            <button
              type="button"
              onClick={handleExportAllTechs}
              title="Export all technician accounts with slots & pairings to Excel"
              className="px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-white rounded-md transition-colors cursor-pointer"
            >
              All Techs
            </button>
          </div>

          <button
            id="close-assign-modal-button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer ml-1"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Feedback & Alert Banners */}
      {error && (
        <div className="px-6 py-2.5 bg-red-50 border-b border-red-200 flex items-center gap-2 text-xs text-red-700 font-semibold shrink-0">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div
          className={`px-6 py-2 border-b flex items-center justify-between text-xs font-semibold shrink-0 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-amber-50 border-amber-200 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Content Split Form */}
      <form
        onSubmit={handleSubmit}
        className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden bg-slate-100"
      >
        {/* Left Column: Technician Selection, Handled Products & Stock Selection */}
        <div className="w-full lg:w-7/12 flex flex-col border-r border-slate-200 bg-white min-h-0 overflow-y-auto">
          {/* STEP 1: Select Field Technician & On-Hand Status */}
          <div className="p-6 border-b border-slate-200 space-y-4">
            {/* Step 1 Header & Action Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">
                    1
                  </span>
                  <span>Select Field Technician & Custody Account</span>
                </label>
              </div>
            </div>

            {/* Technician Search & Filter Bar (Matching Field Technician Accounts & Fleet Stock Roster) */}
            <div className="flex flex-col sm:flex-row items-center gap-2">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={techSearch}
                  onChange={(e) => setTechSearch(e.target.value)}
                  placeholder="Filter technician by name, ID (e.g. FX-TECH-101), van, or area..."
                  className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                />
              </div>

              {/* Area Filter */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto">
                <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <select
                  value={techAreaFilter}
                  onChange={(e) => setTechAreaFilter(e.target.value)}
                  className="w-full sm:w-auto text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-medium cursor-pointer"
                >
                  <option value="ALL">All Service Areas</option>
                  {distinctTechAreas.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custody Filter */}
              <select
                value={techCustodyFilter}
                onChange={(e) => setTechCustodyFilter(e.target.value as any)}
                className="w-full sm:w-auto text-xs px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white font-medium cursor-pointer"
              >
                <option value="ALL">All Technicians</option>
                <option value="WITH_CUSTODY">With Van Stocks</option>
                <option value="WITH_PENDING">With Pending Verifications</option>
                <option value="FLAGGED">Flagged / Restricted</option>
              </select>
            </div>

            {/* Technician List Container: ROSTER TABLE or CARDS */}
            {filteredTechnicians.length === 0 ? (
              <div className="p-6 text-center bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-bold text-slate-700">No field technicians match your search or filter</p>
                <p className="text-[11px] text-slate-500">
                  Try clearing the search query or adjusting the area/status filters.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTechSearch('');
                    setTechAreaFilter('ALL');
                    setTechCustodyFilter('ALL');
                  }}
                  className="px-3 py-1 bg-white border border-slate-300 rounded text-xs font-bold text-teal-700 hover:bg-slate-50 cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : techViewMode === 'TABLE' ? (
              /* FLEET ROSTER TABLE VIEW (Full columns with horizontal & vertical scroll) */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ArrowLeftRight className="w-3 h-3 text-teal-600 shrink-0" />
                    <span>Scroll horizontally to view on-hand stocks, utilized units & approvals</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filteredTechnicians.length} technician{filteredTechnicians.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="border border-slate-200 rounded-xl shadow-2xs max-h-64 overflow-x-auto overflow-y-auto bg-white scrollbar-thin">
                  <table className="min-w-[820px] w-full text-left border-collapse text-xs">
                    <thead className="bg-slate-50 text-slate-800 font-bold text-[11px] sticky top-0 z-10 border-b border-slate-200 shadow-2xs">
                      <tr>
                        <th className="px-3 py-2.5 whitespace-nowrap sticky left-0 z-20 bg-slate-50 border-r border-slate-200 min-w-[170px]">Technician Personnel</th>
                        <th className="px-3 py-2.5 whitespace-nowrap min-w-[115px]">Account Validity</th>
                        <th className="px-3 py-2.5 whitespace-nowrap min-w-[130px]">Vehicle & Van ID</th>
                        <th className="px-3 py-2.5 whitespace-nowrap min-w-[140px]">Service Area</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-center min-w-[105px]">On-Hand Stocks</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-center min-w-[115px]">Warehouse Utilized</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-center min-w-[110px]">Pending Approval</th>
                        <th className="px-3 py-2.5 whitespace-nowrap text-right min-w-[85px]">Selection</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredTechnicians.map((tech) => {
                        const isSelected = tech.id === selectedTechId;
                        const stats = technicianStatsMap[tech.id] || {
                          inCustodyCount: 0,
                          awaitingVerificationCount: 0,
                          connectedCount: 0,
                          utilizedCount: 0,
                        };
                        const initials = getUserInitials(tech.name);
                        const profile = availableProfiles.find(
                          (p) =>
                            p.id === tech.id ||
                            p.technicianId === tech.id ||
                            (p.name && tech.name && p.name.toLowerCase().trim() === tech.name.toLowerCase().trim())
                        );

                        return (
                          <tr
                            key={tech.id}
                            onClick={() => {
                              setSelectedTechId(tech.id);
                              setIsOverrideAuthorized(false);
                              setOverrideReason('');
                            }}
                            className={`group cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-teal-50/70 border-l-4 border-l-teal-600'
                                : 'hover:bg-slate-50'
                            }`}
                          >
                            {/* Technician Personnel (Sticky Left) */}
                            <td className={`px-3 py-2 whitespace-nowrap sticky left-0 z-10 border-r border-slate-200 ${
                              isSelected ? 'bg-teal-50/95' : 'bg-white group-hover:bg-slate-50'
                            }`}>
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                                  {initials}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-900 leading-tight">{tech.name}</p>
                                    {profile?.role && (
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${
                                          profile.role === 'ADMIN'
                                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                                            : profile.role === 'OPERATOR'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                        }`}
                                      >
                                        {profile.role}
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] font-mono text-slate-500">
                                    {tech.employeeId} {profile?.department ? `• ${profile.department}` : ''}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* Account Validity */}
                            <td className="px-3 py-2 whitespace-nowrap">
                              {tech.isFlagged ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-bold">
                                  <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0" />
                                  <span>FLAGGED HOLD</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>CLEAR</span>
                                </span>
                              )}
                            </td>

                            {/* Vehicle & Van ID */}
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1" title={tech.assignedVan}>
                                <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[130px]">{tech.assignedVan}</span>
                              </div>
                            </td>

                            {/* Service Area */}
                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                              <div className="flex items-center gap-1" title={tech.area}>
                                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[140px]">{tech.area}</span>
                              </div>
                            </td>

                            {/* On-Hand Stocks */}
                            <td className="px-3 py-2 text-center whitespace-nowrap font-mono font-bold text-slate-900">
                              <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-200 text-[11px]">
                                {stats.inCustodyCount} units
                              </span>
                            </td>

                            {/* Warehouse Utilized */}
                            <td className="px-3 py-2 text-center whitespace-nowrap font-mono text-slate-700">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[11px]">
                                {stats.utilizedCount} used
                              </span>
                            </td>

                            {/* Pending Approval */}
                            <td className="px-3 py-2 text-center whitespace-nowrap font-mono">
                              {stats.awaitingVerificationCount > 0 ? (
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold text-[11px]">
                                  {stats.awaitingVerificationCount}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Selection Action */}
                            <td className="px-3 py-2 text-right whitespace-nowrap">
                              {isSelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-600 text-white font-bold text-[10px]">
                                  <Check className="w-3 h-3" />
                                  <span>Selected</span>
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 group-hover:text-slate-600 font-medium">
                                  Select
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              /* COMPACT CARDS VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1">
                {filteredTechnicians.map((tech) => {
                  const isSelected = tech.id === selectedTechId;
                  const stats = technicianStatsMap[tech.id] || {
                    inCustodyCount: 0,
                    awaitingVerificationCount: 0,
                    connectedCount: 0,
                    utilizedCount: 0,
                  };
                  const initials = getUserInitials(tech.name);
                  const profile = availableProfiles.find(
                    (p) =>
                      p.id === tech.id ||
                      p.technicianId === tech.id ||
                      (p.name && tech.name && p.name.toLowerCase().trim() === tech.name.toLowerCase().trim())
                  );

                  return (
                    <div
                      key={tech.id}
                      onClick={() => {
                        setSelectedTechId(tech.id);
                        setIsOverrideAuthorized(false);
                        setOverrideReason('');
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        isSelected
                          ? tech.isFlagged
                            ? 'border-amber-500 bg-amber-50/50 shadow-xs ring-1 ring-amber-500'
                            : 'border-teal-600 bg-teal-50/40 shadow-xs ring-1 ring-teal-600'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-xs text-slate-900">{tech.name}</p>
                              {profile?.role && (
                                <span
                                  className={`text-[8px] font-bold px-1.5 py-0.2 rounded border ${
                                    profile.role === 'ADMIN'
                                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                                      : profile.role === 'OPERATOR'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  }`}
                                >
                                  {profile.role}
                                </span>
                              )}
                              {tech.isFlagged ? (
                                <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[9px] font-bold">
                                  HOLD
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] font-bold">
                                  CLEAR
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-mono text-slate-500">{tech.employeeId}</p>
                          </div>
                        </div>
                        {isSelected && (
                          <div
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
                              tech.isFlagged ? 'bg-amber-600' : 'bg-teal-600'
                            }`}
                          >
                            ✓
                          </div>
                        )}
                      </div>

                      <div className="mt-2 text-[10px] text-slate-600 space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-700">
                          <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{tech.assignedVan}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{tech.area}</span>
                        </div>
                      </div>

                      {/* Stock summary chips */}
                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-[9px] font-mono">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-50 text-cyan-900 border border-cyan-200 font-bold">
                          {stats.inCustodyCount} in van
                        </span>
                        {stats.awaitingVerificationCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 font-bold">
                            {stats.awaitingVerificationCount} pending
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold">
                          {stats.utilizedCount} used
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* FLAGGED TECHNICIAN ALERT & VALIDITY OVERRIDE SECTION */}
            {selectedTechnician && selectedTechnician.isFlagged && (
              <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-xl space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <div className="p-2 rounded-lg bg-amber-200/70 text-amber-900 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5 text-amber-800" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-950 flex items-center gap-1.5">
                      Flagged Technician Account — Validity Override Required
                    </h3>
                    <p className="text-xs text-amber-900 font-medium mt-0.5">
                      Reason: <strong className="text-amber-950">{selectedTechnician.flagReason}</strong>
                    </p>
                    <p className="text-[11px] text-amber-800 mt-1">
                      Equipment dispatch is locked to prevent inventory loss. To proceed, an authorized Admin or Warehouse Supervisor must approve an operational validity override.
                    </p>
                  </div>
                </div>

                {/* Validity Override Controls */}
                <div className="pt-2 border-t border-amber-200/80 space-y-2.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isOverrideAuthorized}
                      onChange={(e) => setIsOverrideAuthorized(e.target.checked)}
                      className="w-4 h-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-amber-950">
                      Authorize Operational Validity Override (Admin Authorization)
                    </span>
                  </label>

                  {isOverrideAuthorized && (
                    <div className="space-y-1 pl-6 animate-in fade-in">
                      <label className="block text-[11px] font-bold text-amber-900">
                        Override Justification / Authority Note <span className="text-red-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        required
                        placeholder="e.g. Approved emergency customer restoration by Operations Supervisor"
                        className="w-full text-xs px-3 py-1.5 bg-white border border-amber-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TOTAL ON-HAND INVENTORY STOCKS & PRODUCTS CURRENTLY HANDLED CARD */}
            {selectedTechnician && (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                      Total On-Hand Inventory Stocks Assigned
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {totalCurrentOnHandUnits} units
                      </span>
                      <span className="text-xs text-slate-500">
                        ({currentOnHandItems.length} active products in van custody)
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      id="btn-toggle-all-handled"
                      onClick={() => {
                        if (showHandledProducts && custodyFilter === 'ALL') {
                          setShowHandledProducts(false);
                        } else {
                          setCustodyFilter('ALL');
                          setShowHandledProducts(true);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-teal-800 bg-white hover:bg-teal-50 border border-teal-200 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5 text-teal-600" />
                      <span>{showHandledProducts ? 'Hide Equipment List' : 'View All Handled Products'}</span>
                      {showHandledProducts ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Warehouse Stock Utilization Quick Metrics - Clickable Cards */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 text-xs">
                  {/* Card 1: TOTAL VAN CUSTODY */}
                  <button
                    type="button"
                    id="btn-custody-van-tab"
                    onClick={() => handleToggleCustodyTab('VAN_CUSTODY')}
                    title="Click to list down equipment currently in van custody"
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                      showHandledProducts && custodyFilter === 'VAN_CUSTODY'
                        ? 'bg-slate-100 border-slate-800 ring-2 ring-slate-800 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-slate-400 hover:bg-slate-50/90 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold block tracking-wider ${
                          showHandledProducts && custodyFilter === 'VAN_CUSTODY'
                            ? 'text-slate-900 font-black'
                            : 'text-slate-500'
                        }`}
                      >
                        TOTAL VAN CUSTODY
                      </span>
                      {showHandledProducts && custodyFilter === 'VAN_CUSTODY' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-slate-800 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 shrink-0" />
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-slate-900 block mt-0.5">
                      {totalCurrentOnHandUnits} units
                    </span>
                    <span
                      className={`text-[9px] flex items-center gap-1 mt-1 font-semibold ${
                        showHandledProducts && custodyFilter === 'VAN_CUSTODY'
                          ? 'text-slate-800 underline underline-offset-2'
                          : 'text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {showHandledProducts && custodyFilter === 'VAN_CUSTODY'
                        ? 'Listing van items ↓'
                        : 'Click to list items ▾'}
                    </span>
                  </button>

                  {/* Card 2: UTILIZED (USED) */}
                  <button
                    type="button"
                    id="btn-custody-utilized-tab"
                    onClick={() => handleToggleCustodyTab('UTILIZED')}
                    title="Click to list down equipment utilized or installed in field operations"
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                      showHandledProducts && custodyFilter === 'UTILIZED'
                        ? 'bg-emerald-100 border-emerald-600 ring-2 ring-emerald-600 shadow-xs'
                        : 'bg-emerald-50/70 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-100/60 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold block tracking-wider ${
                          showHandledProducts && custodyFilter === 'UTILIZED'
                            ? 'text-emerald-950 font-black'
                            : 'text-emerald-700'
                        }`}
                      >
                        UTILIZED (USED)
                      </span>
                      {showHandledProducts && custodyFilter === 'UTILIZED' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-emerald-800 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-emerald-600 group-hover:text-emerald-800 shrink-0" />
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-emerald-950 block mt-0.5">
                      {warehouseUtilizedUnits} units
                    </span>
                    <span
                      className={`text-[9px] flex items-center gap-1 mt-1 font-semibold ${
                        showHandledProducts && custodyFilter === 'UTILIZED'
                          ? 'text-emerald-800 underline underline-offset-2'
                          : 'text-emerald-600 group-hover:text-emerald-800'
                      }`}
                    >
                      {showHandledProducts && custodyFilter === 'UTILIZED'
                        ? 'Listing utilized items ↓'
                        : 'Click to list items ▾'}
                    </span>
                  </button>

                  {/* Card 3: AFTER THIS DISPATCH */}
                  <button
                    type="button"
                    id="btn-custody-after-dispatch-tab"
                    onClick={() => handleToggleCustodyTab('AFTER_DISPATCH')}
                    title="Click to list down projected equipment after this dispatch is finalized"
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative group ${
                      showHandledProducts && custodyFilter === 'AFTER_DISPATCH'
                        ? 'bg-teal-100 border-teal-600 ring-2 ring-teal-600 shadow-xs'
                        : 'bg-teal-50/70 border-teal-200 hover:border-teal-400 hover:bg-teal-100/60 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold block tracking-wider ${
                          showHandledProducts && custodyFilter === 'AFTER_DISPATCH'
                            ? 'text-teal-950 font-black'
                            : 'text-teal-700'
                        }`}
                      >
                        AFTER THIS DISPATCH
                      </span>
                      {showHandledProducts && custodyFilter === 'AFTER_DISPATCH' ? (
                        <ChevronUp className="w-3.5 h-3.5 text-teal-800 shrink-0" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-teal-600 group-hover:text-teal-800 shrink-0" />
                      )}
                    </div>
                    <span className="font-mono font-bold text-sm text-teal-950 block mt-0.5">
                      {totalCurrentOnHandUnits + totalAssignedUnits} units
                    </span>
                    <span
                      className={`text-[9px] flex items-center gap-1 mt-1 font-semibold ${
                        showHandledProducts && custodyFilter === 'AFTER_DISPATCH'
                          ? 'text-teal-800 underline underline-offset-2'
                          : 'text-teal-600 group-hover:text-teal-800'
                      }`}
                    >
                      {showHandledProducts && custodyFilter === 'AFTER_DISPATCH'
                        ? 'Listing projected items ↓'
                        : 'Click to list items ▾'}
                    </span>
                  </button>
                </div>

                {/* Interactive Listing of Products Handled for Selected Category */}
                {showHandledProducts && (
                  <div className="pt-3 border-t border-slate-200 space-y-2.5 animate-in fade-in duration-150">
                    {/* Header with Title and Filter Tabs */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <strong className="text-slate-900 font-bold text-xs flex items-center gap-1.5">
                          {custodyFilter === 'VAN_CUSTODY' && (
                            <>Equipment in Van Custody ({currentOnHandItems.length} products, {totalCurrentOnHandUnits} units)</>
                          )}
                          {custodyFilter === 'UTILIZED' && (
                            <>Utilized / Installed Equipment ({utilizedItems.length} products, {warehouseUtilizedUnits} units)</>
                          )}
                          {custodyFilter === 'AFTER_DISPATCH' && (
                            <>Projected Total Custody After Dispatch ({afterDispatchItems.length} products, {totalCurrentOnHandUnits + totalAssignedUnits} units)</>
                          )}
                          {custodyFilter === 'ALL' && (
                            <>All Equipment Handled by {selectedTechnician.name} ({productsCurrentlyHandled.length} products)</>
                          )}
                        </strong>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {custodyFilter === 'VAN_CUSTODY' &&
                            `Physically stored in van ${selectedTechnician.assignedVan} and unassigned to customers.`}
                          {custodyFilter === 'UTILIZED' &&
                            `Stock deployed to subscriber accounts or logged as utilized in field tasks.`}
                          {custodyFilter === 'AFTER_DISPATCH' &&
                            (totalAssignedUnits > 0
                              ? `Shows ${totalCurrentOnHandUnits} units in van + ${totalAssignedUnits} newly selected units in this dispatch batch.`
                              : `Currently showing existing ${totalCurrentOnHandUnits} van units. Select items in Step 2 below to preview new additions.`)}
                          {custodyFilter === 'ALL' &&
                            `Full historical and current custody equipment ledger for ${selectedTechnician.name}.`}
                        </p>
                      </div>

                      {/* Quick Filter Switching Tabs */}
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 self-start sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => setCustodyFilter('VAN_CUSTODY')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            custodyFilter === 'VAN_CUSTODY'
                              ? 'bg-white text-slate-900 shadow-2xs font-black'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Van ({currentOnHandItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustodyFilter('UTILIZED')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            custodyFilter === 'UTILIZED'
                              ? 'bg-emerald-600 text-white shadow-2xs font-black'
                              : 'text-emerald-800 hover:text-emerald-950'
                          }`}
                        >
                          Utilized ({utilizedItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustodyFilter('AFTER_DISPATCH')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            custodyFilter === 'AFTER_DISPATCH'
                              ? 'bg-teal-600 text-white shadow-2xs font-black'
                              : 'text-teal-800 hover:text-teal-950'
                          }`}
                        >
                          After Dispatch ({afterDispatchItems.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setCustodyFilter('ALL')}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            custodyFilter === 'ALL'
                              ? 'bg-slate-700 text-white shadow-2xs font-black'
                              : 'text-slate-500 hover:text-slate-800'
                          }`}
                        >
                          All ({productsCurrentlyHandled.length})
                        </button>
                      </div>
                    </div>

                    {/* View 1: VAN CUSTODY LIST */}
                    {custodyFilter === 'VAN_CUSTODY' && (
                      currentOnHandItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-slate-200">
                          No active equipment is currently stored in this technician's van custody.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg max-h-56 overflow-x-auto overflow-y-auto bg-white scrollbar-thin">
                          <table className="w-full min-w-[560px] text-left text-[11px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                              <tr>
                                <th className="px-2.5 py-1.5">Product / Name</th>
                                <th className="px-2.5 py-1.5">Serial / SKU</th>
                                <th className="px-2.5 py-1.5 text-center">Slot #</th>
                                <th className="px-2.5 py-1.5 text-center">Pairing</th>
                                <th className="px-2.5 py-1.5 text-center">On Hand</th>
                                <th className="px-2.5 py-1.5 text-right">Van Custody</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {currentOnHandItems.map((item, idx) => {
                                const slot =
                                  item.slotNumber || `SLOT-${String((idx % 24) + 1).padStart(2, '0')}`;
                                const isPaired =
                                  item.pairingStatus === 'PAIRED' ||
                                  Boolean(item.pairedItemSerial) ||
                                  Boolean(item.pairedItemId);
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-2.5 py-1.5">
                                      <p className="font-bold text-slate-900 truncate max-w-[170px]">
                                        {item.name}
                                      </p>
                                      <span className="text-[10px] text-slate-400">
                                        {CATEGORY_LABELS[item.category] || item.category}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 font-mono text-slate-700">
                                      {item.serialNumber || item.sku}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-teal-800">
                                      {slot}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center">
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          isPaired
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        {isPaired ? 'PAIRED' : 'UNPAIRED'}
                                      </span>
                                      {item.pairedItemName && (
                                        <p className="text-[8px] text-slate-500 truncate max-w-[110px] mx-auto mt-0.5 font-medium">
                                          ↔ {item.pairedItemName}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-900">
                                      {item.quantity} {item.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-right font-medium text-slate-600">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                        <Truck className="w-3 h-3" />
                                        <span>In Van Custody</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* View 2: UTILIZED (USED) LIST */}
                    {custodyFilter === 'UTILIZED' && (
                      utilizedItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-slate-200">
                          No equipment has been recorded as utilized or installed in the field yet by {selectedTechnician.name}.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg max-h-56 overflow-x-auto overflow-y-auto bg-white scrollbar-thin">
                          <table className="w-full min-w-[560px] text-left text-[11px] border-collapse">
                            <thead className="bg-emerald-50 text-emerald-900 font-bold border-b border-emerald-200 sticky top-0">
                              <tr>
                                <th className="px-2.5 py-1.5">Product / Name</th>
                                <th className="px-2.5 py-1.5">Serial / SKU</th>
                                <th className="px-2.5 py-1.5 text-center">Slot #</th>
                                <th className="px-2.5 py-1.5 text-center">Utilized Qty</th>
                                <th className="px-2.5 py-1.5">Deployment Ref / Account</th>
                                <th className="px-2.5 py-1.5 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {utilizedItems.map((item, idx) => {
                                const slot =
                                  item.slotNumber || `SLOT-${String((idx % 24) + 1).padStart(2, '0')}`;
                                const usedQty = item.utilizedQuantity !== undefined && item.utilizedQuantity > 0
                                  ? item.utilizedQuantity
                                  : item.quantity || 1;
                                return (
                                  <tr key={item.id} className="hover:bg-emerald-50/40">
                                    <td className="px-2.5 py-1.5">
                                      <p className="font-bold text-slate-900 truncate max-w-[170px]">
                                        {item.name}
                                      </p>
                                      <span className="text-[10px] text-slate-400">
                                        {CATEGORY_LABELS[item.category] || item.category}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 font-mono text-slate-700">
                                      {item.serialNumber || item.sku}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-emerald-800">
                                      {slot}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-emerald-950">
                                      {usedQty} {item.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-slate-600">
                                      {item.customerAccountNumber ? (
                                        <span className="font-mono text-teal-800 font-bold bg-teal-50 px-1 py-0.5 rounded border border-teal-200">
                                          Acct #{item.customerAccountNumber}
                                        </span>
                                      ) : item.utilizedNotes ? (
                                        <span className="italic text-slate-600 truncate max-w-[160px] block">
                                          {item.utilizedNotes}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">Field Deployed</span>
                                      )}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-right">
                                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                        <span>UTILIZED</span>
                                      </span>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* View 3: AFTER THIS DISPATCH LIST */}
                    {custodyFilter === 'AFTER_DISPATCH' && (
                      afterDispatchItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-slate-200">
                          No items will be in custody. Scan or pick equipment below to assign items.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg max-h-56 overflow-x-auto overflow-y-auto bg-white scrollbar-thin">
                          <table className="w-full min-w-[560px] text-left text-[11px] border-collapse">
                            <thead className="bg-teal-50 text-teal-900 font-bold border-b border-teal-200 sticky top-0">
                              <tr>
                                <th className="px-2.5 py-1.5">Product / Name</th>
                                <th className="px-2.5 py-1.5">Serial / SKU</th>
                                <th className="px-2.5 py-1.5 text-center">Slot Designation</th>
                                <th className="px-2.5 py-1.5 text-center">Pairing</th>
                                <th className="px-2.5 py-1.5 text-center">Qty</th>
                                <th className="px-2.5 py-1.5 text-right">Custody Source</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {afterDispatchItems.map((entry) => {
                                const isIncoming = entry.originType === 'INCOMING_DISPATCH';
                                return (
                                  <tr
                                    key={entry.id}
                                    className={isIncoming ? 'bg-teal-50/50 hover:bg-teal-100/50' : 'hover:bg-slate-50'}
                                  >
                                    <td className="px-2.5 py-1.5">
                                      <p className="font-bold text-slate-900 truncate max-w-[170px]">
                                        {entry.name}
                                      </p>
                                      <span className="text-[10px] text-slate-400">
                                        {CATEGORY_LABELS[entry.category as ItemCategory] || entry.category}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 font-mono text-slate-700">
                                      {entry.serialNumber || entry.sku}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-teal-800">
                                      {entry.slotNumber}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center">
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          entry.pairingStatus === 'PAIRED'
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        {entry.pairingStatus}
                                      </span>
                                      {entry.pairedItemName && (
                                        <p className="text-[8px] text-slate-500 truncate max-w-[110px] mx-auto mt-0.5 font-medium">
                                          ↔ {entry.pairedItemName}
                                        </p>
                                      )}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-slate-900">
                                      {entry.quantity} {entry.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-right">
                                      {isIncoming ? (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-900 bg-teal-100 px-1.5 py-0.5 rounded border border-teal-300">
                                          <Plus className="w-3 h-3 text-teal-700" />
                                          <span>New in Dispatch</span>
                                        </span>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                          <span>Current Van Stock</span>
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}

                    {/* View 4: ALL PRODUCTS HANDLED */}
                    {custodyFilter === 'ALL' && (
                      productsCurrentlyHandled.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400 italic bg-white rounded-lg border border-slate-200">
                          No equipment currently assigned or handled by this technician.
                        </div>
                      ) : (
                        <div className="border border-slate-200 rounded-lg max-h-56 overflow-x-auto overflow-y-auto bg-white scrollbar-thin">
                          <table className="w-full min-w-[560px] text-left text-[11px] border-collapse">
                            <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                              <tr>
                                <th className="px-2.5 py-1.5">Product / Name</th>
                                <th className="px-2.5 py-1.5">Serial / SKU</th>
                                <th className="px-2.5 py-1.5 text-center">Slot #</th>
                                <th className="px-2.5 py-1.5 text-center">Pairing</th>
                                <th className="px-2.5 py-1.5 text-center">Qty</th>
                                <th className="px-2.5 py-1.5 text-right">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {productsCurrentlyHandled.map((item, idx) => {
                                const slot =
                                  item.slotNumber || `SLOT-${String((idx % 24) + 1).padStart(2, '0')}`;
                                const isPaired =
                                  item.pairingStatus === 'PAIRED' ||
                                  Boolean(item.pairedItemSerial) ||
                                  Boolean(item.pairedItemId);
                                return (
                                  <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-2.5 py-1.5">
                                      <p className="font-bold text-slate-900 truncate max-w-[170px]">
                                        {item.name}
                                      </p>
                                    </td>
                                    <td className="px-2.5 py-1.5 font-mono text-slate-700">
                                      {item.serialNumber || item.sku}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold text-teal-800">
                                      {slot}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center">
                                      <span
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                          isPaired
                                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                                        }`}
                                      >
                                        {isPaired ? 'PAIRED' : 'UNPAIRED'}
                                      </span>
                                    </td>
                                    <td className="px-2.5 py-1.5 text-center font-mono font-bold">
                                      {item.quantity} {item.unit}
                                    </td>
                                    <td className="px-2.5 py-1.5 text-right font-medium text-slate-500">
                                      {item.customerAccountNumber
                                        ? `Acct #${item.customerAccountNumber}`
                                        : item.isUtilized
                                        ? 'Utilized'
                                        : 'In Van Custody'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* STEP 2: Scan Barcode / Select Equipment from Warehouse */}
          <div className="p-6 space-y-4 flex-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[11px] flex items-center justify-center font-bold">
                  2
                </span>
                <span>Scan Barcode to Select Stock Equipment</span>
              </label>
              <span className="text-[11px] text-slate-500 font-mono">
                {availableInStockItems.length} warehouse items in stock
              </span>
            </div>

            {/* Hardware Barcode Scanner Input */}
            <div className="p-3.5 bg-teal-50/70 text-slate-900 rounded-xl border border-teal-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5">
                  <Barcode className="w-4 h-4 text-teal-600" />
                  Hardware Scanner Listening (Laser / Keystroke Emulation)
                </span>
                <span className="text-[10px] text-slate-500">Press ENTER or scan barcode</span>
              </div>
              <div className="flex gap-2">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleProcessBarcode(barcodeInput);
                    }
                  }}
                  placeholder="Scan serial / MAC / SKU barcode..."
                  className="flex-1 px-3 py-2 text-xs bg-white border border-teal-200 rounded-lg text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 placeholder:text-slate-400 shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleProcessBarcode(barcodeInput)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                >
                  Process Scan
                </button>
              </div>
            </div>

            {/* Category Filter Pills & Search */}
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    placeholder="Search in-stock equipment by name, SKU, serial, brand or bin..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Hardware Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setCategoryFilter('ALL')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    categoryFilter === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>All Categories</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                      categoryFilter === 'ALL'
                        ? 'bg-slate-700 text-slate-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {availableInStockItems.length}
                  </span>
                </button>

                {HARDWARE_CATEGORY_CATALOG.map((cat) => {
                  const Icon = getHardwareCategoryIcon(cat.id);
                  const isSelected = categoryFilter === cat.id;
                  const count = categoryAvailableCounts[cat.id] || 0;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Icon
                        className={`w-3.5 h-3.5 ${isSelected ? 'text-teal-300' : 'text-slate-500'}`}
                      />
                      <span>
                        {cat.order}. {cat.label}
                      </span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                          isSelected
                            ? 'bg-slate-700 text-slate-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Warehouse Stock Browsing List Grouped by Hardware Categories */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-slate-50/50">
              {filteredInStockItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 bg-white">
                  No warehouse items matched the search criteria.
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {categoriesToRender.map((cat) => {
                    const Icon = getHardwareCategoryIcon(cat.id);
                    const categoryItems = filteredInStockItems.filter(
                      (item) => item.category === cat.id
                    );

                    // When filtering to all and searching, if category has no matches, skip it
                    if (
                      categoryFilter === 'ALL' &&
                      categoryItems.length === 0 &&
                      inventorySearch.trim()
                    ) {
                      return null;
                    }

                    return (
                      <div key={cat.id} className="bg-white">
                        {/* Hardware Category Header Banner with Sub-items Tags */}
                        <div className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap min-w-0 pr-2">
                            <span className="w-5 h-5 rounded-md bg-teal-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {cat.order}
                            </span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <Icon className="w-3.5 h-3.5 text-teal-700" />
                              <span className="font-black text-xs text-slate-900">
                                {cat.label}
                              </span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1 flex-wrap">
                              {cat.subItems.map((sub, idx) => (
                                <span
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-white text-[10px] font-medium text-slate-600 border border-slate-200 whitespace-nowrap"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>

                          <span className="text-[11px] font-bold font-mono text-slate-600 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
                            {categoryItems.length} available
                          </span>
                        </div>

                        {/* Items within this hardware category */}
                        {categoryItems.length === 0 ? (
                          <div className="px-4 py-3 text-center text-xs text-slate-400 italic bg-slate-50/50">
                            No in-stock {cat.label} equipment currently available
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {categoryItems.map((item) => {
                              const isSelected = selectedItemQuantities.has(item.id);
                              const currentSelectedQty =
                                selectedItemQuantities.get(item.id) || 0;
                              return (
                                <div
                                  key={item.id}
                                  className={`p-2.5 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                                    isSelected ? 'bg-teal-50/50' : ''
                                  }`}
                                >
                                  <div className="min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                      <p className="font-bold text-slate-900 truncate">
                                        {item.name}
                                      </p>
                                      {item.brand && (
                                        <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded shrink-0">
                                          {item.brand}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1 flex-wrap">
                                      {item.serialNumber ? (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleProcessBarcode(item.serialNumber)
                                          }
                                          title="Click to scan serial number"
                                          className="inline-flex items-center gap-1 font-mono font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 px-1.5 py-0.5 rounded border border-teal-200 cursor-pointer"
                                        >
                                          <Barcode className="w-3 h-3" />
                                          <span>{item.serialNumber}</span>
                                        </button>
                                      ) : (
                                        <span className="inline-flex items-center gap-1 font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                          <span>No Barcode</span>
                                        </span>
                                      )}
                                      <span>•</span>
                                      <span className="font-mono text-slate-600">
                                        SKU: {item.sku}
                                      </span>
                                      {item.storageBin && (
                                        <>
                                          <span>•</span>
                                          <span className="text-slate-600">
                                            Bin: {item.storageBin}
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[11px] font-mono text-slate-700 font-semibold bg-slate-100 px-2 py-1 rounded">
                                      {item.quantity} {item.unit}
                                    </span>

                                    {isSelected ? (
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveItem(item.id)}
                                        className="px-2 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md cursor-pointer transition-colors"
                                      >
                                        Remove ({currentSelectedQty})
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleSelectItem(item)}
                                        className="px-2.5 py-1 text-[11px] font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-md cursor-pointer transition-colors"
                                      >
                                        Select
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Hardware Categories Summary Footer */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Package className="w-3.5 h-3.5 text-teal-700" />
                <span>
                  Listing all hardware categories: Modems & ONTs, Fiber Cables, Splitters, Patch Cords & Accessories.
                </span>
              </span>
              <span className="font-mono font-semibold text-slate-700">
                {filteredInStockItems.length} items available
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Listed Stocks, Slot Tracking, Pairing & Dispatch Submission */}
        <div className="w-full lg:w-5/12 flex flex-col bg-slate-50 min-h-0">
          {/* Section Header */}
          <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Package className="w-4 h-4 text-teal-700" />
                <span>Listed Equipment for Dispatch ({selectedItemsWithQty.length})</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Slot tracking and paired status will be exported to Excel and printed on the manifest.
              </p>
            </div>
            {selectedItemsWithQty.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline cursor-pointer"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Listed Equipment Items with Stepper, Slot & Pairing */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {selectedItemsWithQty.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <Barcode className="w-12 h-12 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No equipment selected yet</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Scan equipment barcodes or click &quot;Select&quot; from warehouse stock to assign them to{' '}
                  {selectedTechnician?.name || 'the technician'}.
                </p>
              </div>
            ) : (
              selectedItemsWithQty.map(({ item, quantity, slotNumber, pairingStatus, pairedItem, isBundledMaterial }) => {
                const itemCatDef = HARDWARE_CATEGORY_CATALOG.find((c) => c.id === item.category);
                const ItemCatIcon = getHardwareCategoryIcon(item.category);
                const otherBatchItems = selectedItemsWithQty
                  .filter((o) => o.item.id !== item.id)
                  .map((o) => o.item);
                const otherWarehouseStock = allInventory.filter(
                  (stock) =>
                    stock.id !== item.id &&
                    stock.quantity > 0 &&
                    !stock.archived &&
                    !selectedItemQuantities.has(stock.id)
                );

                return (
                  <div
                    key={item.id}
                    className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-xs text-slate-900">{item.name}</p>
                          {itemCatDef && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200">
                              <ItemCatIcon className="w-2.5 h-2.5" />
                              <span>{itemCatDef.order}. {itemCatDef.label}</span>
                            </span>
                          )}
                          {isBundledMaterial && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                              <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                              <span>Auto-Bundled with Modem</span>
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <span className="font-bold text-slate-700">SN: {item.serialNumber || 'N/A'}</span>
                          <span>•</span>
                          <span>{item.sku}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-red-600 p-1 transition-colors cursor-pointer"
                        title="Remove from assignment list"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Stepper Quantity Controls */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] text-slate-500 font-medium">
                        Dispatch Quantity (Max: {item.quantity} {item.unit}):
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item.id)}
                          disabled={quantity <= 1}
                          className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={item.quantity}
                          value={quantity}
                          onChange={(e) => handleManualQuantityChange(item.id, e.target.value)}
                          className="w-12 py-1 text-xs text-center font-mono font-bold border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.id)}
                          disabled={quantity >= item.quantity}
                          className="w-7 h-7 rounded border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 flex items-center justify-center text-slate-700 cursor-pointer disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Equipment Pairing & Compatibility Section */}
                    <div className="pt-2 border-t border-slate-100">
                      {pairedItem ? (
                        /* PAIRED STATE */
                        (() => {
                          const pairedCatDef = HARDWARE_CATEGORY_CATALOG.find((c) => c.id === pairedItem.category);
                          const PairedCatIcon = pairedItem.category ? getHardwareCategoryIcon(pairedItem.category) : Package;
                          const compat = checkEquipmentCompatibility(item.category, pairedItem.category || item.category);

                          return (
                            <div className="p-2.5 rounded-lg bg-emerald-50/90 border border-emerald-300 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                                  <Link2 className="w-3.5 h-3.5 text-emerald-700" />
                                  <span>Paired Equipment Companion</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPairingTargetItem(item);
                                      setPairingCategoryFilter('ALL');
                                      setPairingSearch('');
                                    }}
                                    className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-700 hover:text-teal-800 bg-white px-2 py-0.5 rounded border border-teal-200 hover:bg-teal-50 transition-colors cursor-pointer"
                                    title="Change companion pairing from hardware categories"
                                  >
                                    <ArrowLeftRight className="w-3 h-3" />
                                    <span>Change</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUnpairItem(item.id)}
                                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-red-600 bg-white px-2 py-0.5 rounded border border-slate-200 hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Disconnect companion pairing"
                                  >
                                    <Unlink className="w-3 h-3" />
                                    <span>Unpair</span>
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-2 text-xs">
                                <div className="min-w-0">
                                  <p className="font-bold text-slate-900 text-xs truncate">
                                    {pairedItem.name}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[10px] text-slate-600 font-mono">
                                    <span>SN: {pairedItem.serialNumber || 'N/A'}</span>
                                  </div>
                                </div>
                                {pairedCatDef && (
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded bg-white text-emerald-900 border border-emerald-300 shrink-0">
                                    <PairedCatIcon className="w-2.5 h-2.5 text-emerald-700" />
                                    <span>{pairedCatDef.order}. {pairedCatDef.label}</span>
                                  </span>
                                )}
                              </div>

                              <div className="text-[10px] text-emerald-800 font-medium flex items-center justify-between">
                                <span>{compat.relationTitle}</span>
                                <span className="text-[9px] font-bold text-emerald-700">✓ Linked Dispatch</span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        /* UNPAIRED / SELECT COMPANION STATE */
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-slate-700">
                              <Link2 className="w-3.5 h-3.5 text-slate-500" />
                              <span className="text-[11px] font-bold">Equipment Pairing:</span>
                              <span className="text-[10px] text-slate-500 bg-slate-200/70 px-1.5 py-0.5 rounded font-medium">
                                Standalone
                              </span>
                            </div>
                          </div>

                          {/* Primary Action: Browse Hardware Categories to Pair */}
                          <button
                            type="button"
                            onClick={() => {
                              setPairingTargetItem(item);
                              setPairingCategoryFilter('ALL');
                              setPairingSearch('');
                            }}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 bg-teal-50 hover:bg-teal-100 text-teal-800 text-[11px] font-bold rounded-lg border border-teal-200 transition-colors cursor-pointer"
                          >
                            <GitFork className="w-3.5 h-3.5 text-teal-600" />
                            <span>Browse All Hardware Categories to Pair</span>
                          </button>

                          {/* Quick Select by Hardware Category */}
                          <div>
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  handlePairItems(item.id, e.target.value);
                                }
                              }}
                              className="w-full text-[11px] py-1.5 px-2 bg-white border border-slate-300 rounded text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium cursor-pointer"
                            >
                              <option value="">
                                + Quick Pair: Select companion equipment by hardware category...
                              </option>
                              {otherBatchItems.length > 0 && (
                                <optgroup label="── In Current Dispatch Batch ──">
                                  {otherBatchItems.map((candidate) => {
                                    const catDef = HARDWARE_CATEGORY_CATALOG.find((c) => c.id === candidate.category);
                                    return (
                                      <option key={candidate.id} value={candidate.id}>
                                        [{catDef ? `${catDef.order}. ${catDef.label}` : candidate.category}] {candidate.name} (SN: {candidate.serialNumber || candidate.sku})
                                      </option>
                                    );
                                  })}
                                </optgroup>
                              )}
                              {HARDWARE_CATEGORY_CATALOG.map((catDef) => {
                                const stockInCat = otherWarehouseStock.filter((s) => s.category === catDef.id);
                                if (stockInCat.length === 0) return null;
                                return (
                                  <optgroup
                                    key={catDef.id}
                                    label={`── ${catDef.order}. ${catDef.label} (${stockInCat.length} in warehouse) ──`}
                                  >
                                    {stockInCat.map((stock) => (
                                      <option key={stock.id} value={stock.id}>
                                        {stock.name} | SN: {stock.serialNumber || stock.sku} (Qty: {stock.quantity} {stock.unit})
                                      </option>
                                    ))}
                                  </optgroup>
                                );
                              })}
                            </select>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>Pairs across all 5 hardware categories for FTTH field installations.</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Bottom Dispatch Controls & Form Inputs */}
          <div className="p-4 bg-white border-t border-slate-200 space-y-3 shrink-0">
            {/* Team vs Individual Assignment Scope (Item 1) */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-700" />
                  <span>Team vs Individual Assignment Scope</span>
                </label>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    assignmentScope === 'TEAM'
                      ? 'bg-teal-50 text-teal-800 border-teal-200'
                      : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                  }`}
                >
                  {assignmentScope === 'TEAM' ? 'Shared Across Team' : 'Selected Account Only'}
                </span>
              </div>

              {/* Segmented Options */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-200/60 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAssignmentScope('TEAM')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    assignmentScope === 'TEAM'
                      ? 'bg-white text-teal-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 text-teal-600" />
                  <span>Assign to Team (Shared)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentScope('INDIVIDUAL')}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    assignmentScope === 'INDIVIDUAL'
                      ? 'bg-white text-indigo-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Specific Account Only</span>
                </button>
              </div>

              {/* Explicit Scope Clarification */}
              <p className="text-[11px] text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200/80">
                {assignmentScope === 'TEAM' ? (
                  <>
                    <strong className="text-teal-800">✓ Shared Team Custody:</strong> Items are automatically shared across all accounts associated with <strong>{selectedTechnician?.assignedVan || 'this team'}</strong>. Any technician in this team or vehicle can view, verify, and install these materials.
                  </>
                ) : (
                  <>
                    <strong className="text-indigo-800">🔒 Specific Account Custody:</strong> Custody remains strictly locked to <strong>{selectedTechnician?.name || 'this selected account'}</strong>. Teammates in the same van will not see or access these items.
                  </>
                )}
              </p>
            </div>

            {/* Auto-Include Related Materials for Modems (Item 2) */}
            <div className="flex items-center justify-between p-3 bg-amber-50/70 rounded-xl border border-amber-200 text-xs">
              <div className="flex items-start gap-2 pr-2">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950 text-xs flex items-center gap-1.5">
                    <span>Auto-Include Related Materials</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/80 text-amber-900">
                      Modem Bundle
                    </span>
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Automatically includes <strong>Patch Cord</strong>, <strong>NIU</strong>, <strong>SC Connector</strong>, and <strong>House Bracket</strong> whenever a modem is assigned.
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={autoIncludeMaterials}
                  onChange={(e) => setAutoIncludeMaterials(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {/* Work Order & Dispatch Instructions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Work Order / Job Ticket
                </label>
                <input
                  type="text"
                  value={workOrderRef}
                  onChange={(e) => setWorkOrderRef(e.target.value)}
                  placeholder="e.g. WO-9082-QC"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-0.5">
                  Transit Notes / Handover Instructions
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g. Priority installation bundle"
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Print & Dispatch Metadata Summary Box */}
            <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600 space-y-1">
              <div className="flex items-center justify-between">
                <span>
                  <strong>Assigned By:</strong> {currentUser.name} ({currentUser.role}, {currentUser.badgeId})
                </span>
                <span className="font-mono">Date: {new Date().toLocaleDateString()}</span>
              </div>
              <div>
                <strong>Hub Address:</strong>{' '}
                {selectedTechnician?.hubAddress || 'Main Logistics Warehouse Hub'}
              </div>
              <div>
                <strong>Contact Person:</strong>{' '}
                {selectedTechnician?.contactPerson || 'Dispatch Coordinator'}
              </div>
            </div>

            {/* Dispatch Confirmation Button */}
            {selectedTechnician?.isFlagged && (!isOverrideAuthorized || !overrideReason.trim()) ? (
              <div className="space-y-1">
                <button
                  type="submit"
                  disabled={true}
                  className="w-full py-2.5 text-xs font-bold text-slate-400 bg-slate-200 rounded-xl cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Dispatch Locked: Technician Flagged (Admin Validity Override Required)</span>
                </button>
                <p className="text-[10px] text-amber-700 text-center font-medium">
                  Check &quot;Authorize Operational Validity Override&quot; and enter a reason in Step 1 to unlock.
                </p>
              </div>
            ) : selectedTechnician?.isFlagged ? (
              <button
                type="submit"
                disabled={selectedItemsWithQty.length === 0}
                className="w-full py-2.5 text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 active:bg-amber-900 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirm Dispatch with Validity Override ({totalAssignedUnits} Units)</span>
              </button>
            ) : (
              <button
                type="submit"
                disabled={selectedItemsWithQty.length === 0}
                className="w-full py-2.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 active:bg-teal-900 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Dispatch & Transfer Stock ({totalAssignedUnits} Units)</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* SUB-MODALS: Flag Management, Warehouse Stock Utilization */}
      {selectedTechnician && (
        <>
          <FlagTechnicianModal
            isOpen={isFlagModalOpen}
            onClose={() => setIsFlagModalOpen(false)}
            technician={selectedTechnician}
            currentUser={currentUser}
            onToggleFlag={(techId, isFlagged, reason) => {
              if (onToggleFlagTechnician) {
                onToggleFlagTechnician(techId, isFlagged, reason);
              }
            }}
          />

          <WarehouseUtilizationModal
            isOpen={isUtilizationModalOpen}
            onClose={() => setIsUtilizationModalOpen(false)}
            technician={selectedTechnician}
            inventory={allInventory}
            currentUser={currentUser}
            onUpdateUtilization={(itemId, qty, notes) => {
              if (onUpdateUtilization) {
                onUpdateUtilization(itemId, qty, notes);
              }
            }}
          />
        </>
      )}

      {/* Hardware Categories Equipment Pairing Modal */}
      {pairingTargetItem && (() => {
        const targetCatDef = HARDWARE_CATEGORY_CATALOG.find((c) => c.id === pairingTargetItem.category);
        const TargetCatIcon = getHardwareCategoryIcon(pairingTargetItem.category);
        const pairedInfo = customPairings.get(pairingTargetItem.id);
        const currentlyPairedItem = pairedInfo ? allInventory.find((i) => i.id === pairedInfo.pairedItemId) : null;

        // Build candidate list across warehouse stock and current batch items
        const candidateMap = new Map<string, InventoryItem>();
        selectedItemsWithQty.forEach((o) => {
          if (o.item.id !== pairingTargetItem.id) {
            candidateMap.set(o.item.id, o.item);
          }
        });
        allInventory.forEach((stock) => {
          if (stock.id !== pairingTargetItem.id && stock.quantity > 0 && !stock.archived) {
            if (!candidateMap.has(stock.id)) {
              candidateMap.set(stock.id, stock);
            }
          }
        });
        const allCandidates = Array.from(candidateMap.values());

        const filteredCandidates = allCandidates.filter((candidate) => {
          const matchesCategory = pairingCategoryFilter === 'ALL' || candidate.category === pairingCategoryFilter;
          if (!matchesCategory) return false;
          if (!pairingSearch.trim()) return true;
          const q = pairingSearch.toLowerCase();
          return (
            candidate.name.toLowerCase().includes(q) ||
            (candidate.serialNumber && candidate.serialNumber.toLowerCase().includes(q)) ||
            (candidate.sku && candidate.sku.toLowerCase().includes(q)) ||
            (candidate.storageBin && candidate.storageBin.toLowerCase().includes(q))
          );
        });

        const getCandidateCount = (catId: 'ALL' | ItemCategory) => {
          if (catId === 'ALL') return allCandidates.length;
          return allCandidates.filter((c) => c.category === catId).length;
        };

        return (
          <div className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-teal-100 text-teal-800 rounded-lg">
                      <GitFork className="w-5 h-5" />
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      Equipment Pairing by Hardware Categories
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Target Equipment:</span>
                    <span className="font-bold text-slate-900">{pairingTargetItem.name}</span>
                    {targetCatDef && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 text-[11px] font-bold">
                        <TargetCatIcon className="w-3 h-3" />
                        <span>{targetCatDef.order}. {targetCatDef.label}</span>
                      </span>
                    )}
                    <span className="font-mono text-slate-500">SN: {pairingTargetItem.serialNumber || pairingTargetItem.sku}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setPairingTargetItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                  title="Close pairing catalog"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Informative Pairing Scope Banner */}
              <div className="px-4 sm:px-5 py-2.5 bg-teal-50/70 border-b border-teal-100 flex items-center justify-between gap-3 text-xs text-teal-900">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>
                    Select companion hardware from any of the <strong>5 official hardware categories</strong>. Paired items are linked together in technician custody, slot logs, and dispatch reports.
                  </span>
                </div>
                {currentlyPairedItem && (
                  <button
                    type="button"
                    onClick={() => {
                      handleUnpairItem(pairingTargetItem.id);
                      setPairingTargetItem(null);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:text-red-700 bg-white hover:bg-red-50 rounded-lg border border-red-200 transition-colors cursor-pointer shrink-0"
                  >
                    <Unlink className="w-3 h-3" />
                    <span>Unpair Current ({currentlyPairedItem.name})</span>
                  </button>
                )}
              </div>

              {/* Search & Hardware Category Filter Tabs */}
              <div className="p-4 sm:px-5 border-b border-slate-200 bg-white space-y-3">
                {/* Search input */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={pairingSearch}
                    onChange={(e) => setPairingSearch(e.target.value)}
                    placeholder="Search equipment by name, model, serial number, SKU, or storage bin..."
                    className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
                  />
                  {pairingSearch && (
                    <button
                      type="button"
                      onClick={() => setPairingSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Hardware Categories Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setPairingCategoryFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                      pairingCategoryFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>All Categories</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
                      {getCandidateCount('ALL')}
                    </span>
                  </button>

                  {HARDWARE_CATEGORY_CATALOG.map((cat) => {
                    const CatIcon = getHardwareCategoryIcon(cat.id);
                    const isSelected = pairingCategoryFilter === cat.id;
                    const count = getCandidateCount(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setPairingCategoryFilter(cat.id)}
                        className={`px-3 py-1.5 rounded-lg font-bold text-xs whitespace-nowrap transition-colors cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-teal-700 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <CatIcon className="w-3.5 h-3.5" />
                        <span>{cat.order}. {cat.label}</span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                            isSelected ? 'bg-white/20' : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Equipment Catalog Body Grouped by Hardware Category */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-6">
                {filteredCandidates.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="font-bold text-sm text-slate-600">No compatible equipment found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Try adjusting your search query or switching hardware category filters.
                    </p>
                  </div>
                ) : (
                  HARDWARE_CATEGORY_CATALOG.map((catDef) => {
                    const itemsInCat = filteredCandidates.filter((c) => c.category === catDef.id);
                    if (itemsInCat.length === 0) return null;
                    const CatIcon = getHardwareCategoryIcon(catDef.id);

                    return (
                      <div key={catDef.id} className="space-y-3">
                        {/* Category Section Header */}
                        <div className="flex items-center justify-between gap-2 p-2.5 bg-slate-100 rounded-xl border border-slate-200">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-6 h-6 rounded-lg bg-teal-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {catDef.order}
                            </span>
                            <CatIcon className="w-4 h-4 text-teal-800 shrink-0" />
                            <h4 className="font-bold text-xs text-slate-900">{catDef.label}</h4>
                            <div className="hidden sm:flex items-center gap-1">
                              {catDef.subItems.slice(0, 3).map((sub, sIdx) => (
                                <span
                                  key={sIdx}
                                  className="text-[10px] px-1.5 py-0.2 bg-white text-slate-600 rounded border border-slate-200"
                                >
                                  {sub}
                                </span>
                              ))}
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">
                            {itemsInCat.length} {itemsInCat.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>

                        {/* Items Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {itemsInCat.map((candidate) => {
                            const isCurrentlyPaired = currentlyPairedItem?.id === candidate.id;
                            const isInBatch = selectedItemQuantities.has(candidate.id);
                            const compat = checkEquipmentCompatibility(pairingTargetItem.category, candidate.category);

                            return (
                              <div
                                key={candidate.id}
                                className={`p-3 rounded-xl border transition-all space-y-2.5 ${
                                  isCurrentlyPaired
                                    ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400'
                                    : 'bg-white border-slate-200 hover:border-teal-300 hover:shadow-xs'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0">
                                    <p className="font-bold text-xs text-slate-900 truncate">
                                      {candidate.name}
                                    </p>
                                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 font-mono">
                                      <span className="font-bold text-slate-700">
                                        SN: {candidate.serialNumber || 'N/A'}
                                      </span>
                                      <span>•</span>
                                      <span>{candidate.sku}</span>
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex flex-col items-end gap-1">
                                    {isInBatch ? (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                                        In Current Batch
                                      </span>
                                    ) : (
                                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                        Warehouse Stock
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                                  <span>
                                    Available: <strong className="text-slate-800">{candidate.quantity} {candidate.unit}</strong>
                                  </span>
                                  {candidate.storageBin && (
                                    <span className="text-[10px] text-slate-500">
                                      Bin: {candidate.storageBin}
                                    </span>
                                  )}
                                </div>

                                <div className="text-[10px] text-slate-500">
                                  <span className="font-medium text-teal-800">{compat.relationTitle}</span>
                                </div>

                                <div>
                                  {isCurrentlyPaired ? (
                                    <div className="w-full py-2 px-3 bg-emerald-600 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 shadow-2xs">
                                      <Check className="w-4 h-4" />
                                      <span>Currently Paired Companion</span>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        handlePairItems(pairingTargetItem.id, candidate.id);
                                        setPairingTargetItem(null);
                                      }}
                                      className="w-full py-2 px-3 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                    >
                                      <Link2 className="w-3.5 h-3.5" />
                                      <span>Pair with this Equipment</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-3.5 sm:px-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 font-medium">
                  Showing <strong>{filteredCandidates.length}</strong> pairing candidate equipment options
                </span>
                <button
                  type="button"
                  onClick={() => setPairingTargetItem(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-xl border border-slate-300 transition-colors cursor-pointer"
                >
                  Done / Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Global Add Technician Account Modal inside Assign Modal */}
      {isAddTechModalOpen && (
        <AddTechnicianModal
          isOpen={isAddTechModalOpen}
          onClose={() => setIsAddTechModalOpen(false)}
          existingTechnicians={technicians}
          onAddTechnician={(newTech, newProfile) => {
            if (onAddTechnician) {
              onAddTechnician(newTech, newProfile);
            }
            setSelectedTechId(newTech.id);
            setFeedback({
              text: `Technician account ${newTech.name} (${newTech.employeeId}) registered and selected!`,
              type: 'success',
            });
          }}
        />
      )}
    </div>
  );

  if (isFullPage) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-7xl h-[92vh] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {content}
      </div>
    </div>
  );
};
