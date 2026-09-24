import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InventoryItem, ItemCategory, UserProfile, CATEGORY_LABELS } from '../../types';
import {
  X,
  Plus,
  Minus,
  Barcode,
  ShieldAlert,
  Layers,
  Edit3,
  Camera,
  Trash2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Sparkles,
  PackageCheck,
  RotateCcw,
  Router,
  Cable,
  GitFork,
  Link2,
  Wrench,
  CheckCircle2,
} from 'lucide-react';
import { BarcodeSvg } from '../common/BarcodeSvg';

export interface SKUHardwarePreset {
  sku: string;
  name: string;
  category: ItemCategory;
  brand: string;
  modelName: string;
  description: string;
  defaultUnit: 'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes';
  defaultBin: string;
}

export interface CategoryDefinition {
  id: ItemCategory;
  label: string;
  shortDesc: string;
  defaultBin: string;
  defaultUnit: 'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes';
  presets: SKUHardwarePreset[];
}

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [
  {
    id: 'MODEM_ONT',
    label: 'Modems & ONTs',
    shortDesc: 'Customer optical network terminals, modems & ONTs',
    defaultBin: 'Rack A-01',
    defaultUnit: 'pcs',
    presets: [
      {
        sku: 'ONT-MODEM-GEN',
        name: 'Modems & ONTs',
        category: 'MODEM_ONT',
        brand: 'FiberX / ZTE / Huawei',
        modelName: 'Modems & ONTs',
        description: 'Customer optical network terminal / GPON Wi-Fi gateway',
        defaultUnit: 'pcs',
        defaultBin: 'Rack A-01',
      },
    ],
  },
  {
    id: 'FIBER_CABLE',
    label: 'Fiber Drop Cables',
    shortDesc: 'Aerial bow-type & 1-core outdoor drop cable spools',
    defaultBin: 'Spool Bay 1',
    defaultUnit: 'spools',
    presets: [
      {
        sku: 'CBL-FIBER-DROP',
        name: 'Fiber Drop Cables',
        category: 'FIBER_CABLE',
        brand: 'FiberX Cable',
        modelName: 'Fiber Drop Cables',
        description: 'Outdoor aerial self-supporting fiber drop cable spool',
        defaultUnit: 'spools',
        defaultBin: 'Spool Bay 1',
      },
      {
        sku: 'CBL-DROP-FOC-1C',
        name: 'Drop FOC, 1 Core',
        category: 'FIBER_CABLE',
        brand: 'FiberX Cable',
        modelName: 'Drop FOC, 1 Core',
        description: '1-Core G.657A optical drop cable with FRP messenger wire',
        defaultUnit: 'spools',
        defaultBin: 'Spool Bay 2',
      },
    ],
  },
  {
    id: 'SPLITTER',
    label: 'Optical Splitters',
    shortDesc: 'Planar lightwave circuit (PLC) optical splitters',
    defaultBin: 'Bin C-04',
    defaultUnit: 'pcs',
    presets: [
      {
        sku: 'SPLT-OPTICAL-PLC',
        name: 'Optical Splitters',
        category: 'SPLITTER',
        brand: 'FiberX Optical',
        modelName: 'Optical Splitters',
        description: 'PLC planar lightwave circuit optical splitter module SC/APC',
        defaultUnit: 'pcs',
        defaultBin: 'Bin C-04',
      },
    ],
  },
  {
    id: 'PATCH_CORD',
    label: 'Patch Cords & Mechanical Connectors',
    shortDesc: 'SC/APC patch leads, fast connectors & mechanical splices',
    defaultBin: 'Bin D-08',
    defaultUnit: 'boxes',
    presets: [
      {
        sku: 'PATCH-FAST-CON',
        name: 'Patch Cords & Fast-Con',
        category: 'PATCH_CORD',
        brand: 'FiberX Spec',
        modelName: 'Patch Cords & Fast-Con',
        description: 'SC/APC single mode fiber patch lead & fast connector',
        defaultUnit: 'boxes',
        defaultBin: 'Bin D-08',
      },
      {
        sku: 'CON-MECHANICAL',
        name: 'Connector, Mechanical',
        category: 'PATCH_CORD',
        brand: 'FiberX Spec',
        modelName: 'Connector, Mechanical',
        description: 'Cold-splice field assembly mechanical fast connector',
        defaultUnit: 'boxes',
        defaultBin: 'Bin D-02',
      },
    ],
  },
  {
    id: 'ACCESSORY',
    label: 'Accessories, Brackets & Clamps',
    shortDesc: 'Brackets, clamps, terminal boxes, cable ties & mounting hardware',
    defaultBin: 'Bin E-01',
    defaultUnit: 'boxes',
    presets: [
      {
        sku: 'ACC-ACCESSORIES-CLAMPS',
        name: 'Accessories & Clamps',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'Accessories & Clamps',
        description: 'General aerial & surface mounting hardware accessories and clamps',
        defaultUnit: 'boxes',
        defaultBin: 'Bin E-01',
      },
      {
        sku: 'ACC-TERMINAL-BOX',
        name: 'Terminal Box',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'Terminal Box',
        description: 'Wall-mounted optical termination & rosette distribution box',
        defaultUnit: 'pcs',
        defaultBin: 'Bin E-02',
      },
      {
        sku: 'ACC-HOUSE-BRACKET',
        name: 'House Bracket',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'House Bracket',
        description: 'Outdoor exterior wall & facade drop wire house bracket',
        defaultUnit: 'pcs',
        defaultBin: 'Bin E-03',
      },
      {
        sku: 'ACC-CLAMP-MIDSPAN',
        name: 'Clamp, Mid-Span',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'Clamp, Mid-Span',
        description: 'Aerial drop messenger wire mid-span support clamp',
        defaultUnit: 'pcs',
        defaultBin: 'Bin E-04',
      },
      {
        sku: 'ACC-TIE-CABLE',
        name: 'Tie, Cable',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'Tie, Cable',
        description: 'Heavy-duty nylon UV-resistant cable ties for outdoor routing',
        defaultUnit: 'boxes',
        defaultBin: 'Bin E-05',
      },
      {
        sku: 'ACC-CLAMP-ANCHOR',
        name: 'Clamp Anchor',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'Clamp Anchor',
        description: 'Dead-end wedge anchor clamp for aerial fiber drop',
        defaultUnit: 'pcs',
        defaultBin: 'Bin E-06',
      },
      {
        sku: 'ACC-TAPE-DOUBLE-SIDE',
        name: 'Tape, Double Side',
        category: 'ACCESSORY',
        brand: 'FiberX Hardware',
        modelName: 'Tape, Double Side',
        description: 'High-adhesion heavy duty double-sided mounting foam tape',
        defaultUnit: 'rolls',
        defaultBin: 'Bin E-07',
      },
    ],
  },
];

interface ScannedBatchItem {
  id: string;
  serialNumber: string;
  macAddress?: string;
  category: ItemCategory;
  modelName: string;
  quantity: number;
  lengthMeters?: number;
  isMac: boolean;
  isDuplicateInDB: boolean;
  duplicateInfo?: string;
  isDuplicateInBatch?: boolean;
  timestamp: string;
}

interface ReceiveStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReceive: (item: Omit<InventoryItem, 'id'>) => void;
  onBatchReceive?: (items: Omit<InventoryItem, 'id'>[]) => void;
  currentUser: UserProfile;
  initialSerial?: string;
  existingInventory?: InventoryItem[];
  externalScan?: { code: string; timestamp: number } | null;
  isFullPage?: boolean;
}

export const ReceiveStockModal: React.FC<ReceiveStockModalProps> = ({
  isOpen,
  onClose,
  onReceive,
  onBatchReceive,
  currentUser,
  initialSerial = '',
  existingInventory = [],
  externalScan = null,
  isFullPage = false,
}) => {
  // Primary intake mode: 'bulk_scan' | 'manual_add'
  const [activeMode, setActiveMode] = useState<'bulk_scan' | 'manual_add'>('bulk_scan');

  // Selected Category (Modems & ONTs, Fiber Drop Cables, Optical Splitters, Patch Cords & Fast-Con, Accessories & Clamps)
  const [category, setCategory] = useState<ItemCategory>('MODEM_ONT');

  // Common Hardware Specification (Title & Preset)
  const [selectedPresetSku, setSelectedPresetSku] = useState<string>(
    CATEGORY_DEFINITIONS[0].presets[0].sku
  );
  const [itemTitle, setItemTitle] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].name);
  const [sku, setSku] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].sku);
  const [storageBin, setStorageBin] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].defaultBin);
  const [brand, setBrand] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].brand);
  const [modelName, setModelName] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].modelName);
  const [unit, setUnit] = useState<'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes'>('pcs');
  const [description, setDescription] = useState<string>(
    CATEGORY_DEFINITIONS[0].presets[0].description
  );
  const [notes, setNotes] = useState<string>('');

  // Bulk Scan State
  const [bulkScanInput, setBulkScanInput] = useState<string>('');
  const [scannedBatch, setScannedBatch] = useState<ScannedBatchItem[]>([]);
  const [isPastingMultiple, setIsPastingMultiple] = useState<boolean>(false);
  const [bulkPasteText, setBulkPasteText] = useState<string>('');
  const [lastScannedFlash, setLastScannedFlash] = useState<string | null>(null);

  // Manual Add State (Title + Barcode or MAC Address)
  const [manualCodeInput, setManualCodeInput] = useState<string>(initialSerial || '');
  const [manualQuantity, setManualQuantity] = useState<number>(1);
  const [isNonBarcodedMaterial, setIsNonBarcodedMaterial] = useState<boolean>(false);
  const [showOptionalDetails, setShowOptionalDetails] = useState<boolean>(false);
  const [showCategoryDirectory, setShowCategoryDirectory] = useState<boolean>(false);

  // Camera Viewfinder State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Focus ref for continuous scanner capture
  const bulkScannerInputRef = useRef<HTMLInputElement>(null);

  // Validation
  const [validationError, setValidationError] = useState<string | null>(null);

  // Audio Beep
  const playBeep = useCallback((freq = 1300, duration = 0.1) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // Audio context restricted before user interaction
    }
  }, []);

  // Format and detect MAC address helper
  const detectAndFormatMac = (raw: string): { isMac: boolean; formatted: string; cleanSerial: string } => {
    const trimmed = raw.trim().toUpperCase();
    const hexOnly = trimmed.replace(/[^0-9A-F]/g, '');
    const isStandardMac = hexOnly.length === 12 && /^[0-9A-F]{12}$/.test(hexOnly);
    if (isStandardMac) {
      const formatted = hexOnly.match(/.{1,2}/g)?.join(':') || trimmed;
      return { isMac: true, formatted, cleanSerial: hexOnly };
    }
    return { isMac: false, formatted: trimmed, cleanSerial: trimmed };
  };

  // Check duplicate against existing inventory
  const checkDuplicateInDB = (code: string): { isDuplicate: boolean; info?: string } => {
    const clean = code.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!clean) return { isDuplicate: false };

    const match = existingInventory.find((item) => {
      const itemSerial = item.serialNumber.toUpperCase().replace(/[^0-9A-Z]/g, '');
      const itemMac = (item.macAddress || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
      return itemSerial === clean || (itemMac && itemMac === clean);
    });

    if (match) {
      return {
        isDuplicate: true,
        info: `Already in DB: [${match.name}] (${match.status}) in ${match.storageBin}`,
      };
    }
    return { isDuplicate: false };
  };

  // Switch Active Category
  const handleSelectCategory = (catId: ItemCategory) => {
    setCategory(catId);
    const catDef = CATEGORY_DEFINITIONS.find((c) => c.id === catId);
    if (catDef && catDef.presets.length > 0) {
      const firstPreset = catDef.presets[0];
      setSelectedPresetSku(firstPreset.sku);
      setItemTitle(firstPreset.name);
      setSku(firstPreset.sku);
      setStorageBin(firstPreset.defaultBin);
      setBrand(firstPreset.brand);
      setModelName(firstPreset.modelName);
      setUnit(firstPreset.defaultUnit);
      setDescription(firstPreset.description);
      setIsNonBarcodedMaterial(catId === 'ACCESSORY' || catId === 'PATCH_CORD');
    }
  };

  // Select Preset inside current category
  const handleSelectPreset = (preset: SKUHardwarePreset) => {
    setSelectedPresetSku(preset.sku);
    setItemTitle(preset.name);
    setSku(preset.sku);
    setStorageBin(preset.defaultBin);
    setBrand(preset.brand);
    setModelName(preset.modelName);
    setUnit(preset.defaultUnit);
    setDescription(preset.description);
    if (preset.category === 'ACCESSORY' || preset.sku.includes('FAST-CON')) {
      setIsNonBarcodedMaterial(false);
    }
  };

  const prevIsOpenRef = useRef(false);
  const lastHandledExternalScanRef = useRef<number>(0);
  const lastAddedRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });
  const batchListEndRef = useRef<HTMLDivElement>(null);

  // Preload initial serial ONLY when modal first transitions from closed to open
  useEffect(() => {
    if (isOpen && !prevIsOpenRef.current) {
      if (initialSerial) {
        setManualCodeInput(initialSerial);
        setActiveMode('manual_add');
      } else {
        setActiveMode('bulk_scan');
      }
    }
    prevIsOpenRef.current = isOpen;
  }, [initialSerial, isOpen]);

  // Clean up camera on unmount or close
  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      handleStopCamera();
    };
  }, []);

  const handleStartCamera = async () => {
    setCameraError(null);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      setCameraError(
        errorObj.message || 'Camera permission denied or camera not found on this device.'
      );
      setIsCameraActive(false);
    }
  };

  // Auto-focus scanner field on mode switch
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      if (activeMode === 'bulk_scan' && bulkScannerInputRef.current) {
        bulkScannerInputRef.current.focus();
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [activeMode, isOpen]);

  // Add a scanned code to the Bulk Batch
  const addCodeToBulkBatch = useCallback(
    (rawCode: string) => {
      const trimmed = rawCode.trim();
      if (!trimmed) return;

      const cleanUpper = trimmed.toUpperCase();
      const now = Date.now();
      // Deduplication guard against rapid double-fire bounces (< 250ms)
      if (lastAddedRef.current.code === cleanUpper && now - lastAddedRef.current.time < 250) {
        return;
      }
      lastAddedRef.current = { code: cleanUpper, time: now };

      const { isMac, formatted, cleanSerial } = detectAndFormatMac(trimmed);
      const dbCheck = checkDuplicateInDB(cleanSerial);

      // Check if this item/model is already present in the batch
      const existingIndex = scannedBatch.findIndex(
        (item) =>
          item.serialNumber.toUpperCase() === cleanSerial.toUpperCase() ||
          (isMac && item.macAddress && item.macAddress.toUpperCase() === formatted.toUpperCase())
      );

      if (existingIndex !== -1) {
        // Repeat scan detected: instead of adding as duplicate in batch, increment the quantity on this model!
        setScannedBatch((prev) =>
          prev.map((item, idx) =>
            idx === existingIndex
              ? {
                  ...item,
                  quantity: (item.quantity || 1) + 1,
                  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                }
              : item
          )
        );
        setLastScannedFlash(cleanSerial);
        setTimeout(() => setLastScannedFlash(null), 1500);
        playBeep(1500, 0.08);

        // Keep scanner input field cleared and focused
        setBulkScanInput('');
        setTimeout(() => {
          bulkScannerInputRef.current?.focus();
        }, 50);
        return;
      }

      // New entry in batch
      const isMeterBasedItem = category === 'PATCH_CORD' || category === 'FIBER_CABLE';
      const newItem: ScannedBatchItem = {
        id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        serialNumber: cleanSerial,
        macAddress: isMac ? formatted : undefined,
        category,
        modelName: itemTitle,
        quantity: 1,
        lengthMeters: isMeterBasedItem ? 1 : undefined,
        isMac,
        isDuplicateInDB: dbCheck.isDuplicate,
        duplicateInfo: dbCheck.info,
        isDuplicateInBatch: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };

      // Append to list so scans accumulate in chronological order
      setScannedBatch((prev) => [...prev, newItem]);
      setLastScannedFlash(cleanSerial);
      setTimeout(() => setLastScannedFlash(null), 1500);
      playBeep(dbCheck.isDuplicate ? 800 : 1400, 0.08);

      // Keep scanner input field cleared and focused for the next pull of the trigger
      setBulkScanInput('');
      setTimeout(() => {
        bulkScannerInputRef.current?.focus();
      }, 50);
    },
    [category, itemTitle, scannedBatch, detectAndFormatMac, checkDuplicateInDB, playBeep]
  );

  // Handle external hardware scans routed while modal is open
  useEffect(() => {
    if (externalScan && externalScan.timestamp > lastHandledExternalScanRef.current) {
      lastHandledExternalScanRef.current = externalScan.timestamp;
      if (activeMode === 'bulk_scan') {
        addCodeToBulkBatch(externalScan.code);
      } else {
        setManualCodeInput(externalScan.code);
      }
    }
  }, [externalScan, activeMode, addCodeToBulkBatch]);

  // Auto-scroll batch queue to bottom whenever a new item is scanned
  useEffect(() => {
    if (scannedBatch.length > 0) {
      batchListEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scannedBatch.length]);

  // Handle Enter on Bulk Scanner Input
  const handleBulkInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (bulkScanInput.trim()) {
        addCodeToBulkBatch(bulkScanInput);
        setBulkScanInput('');
      }
    }
  };

  if (!isOpen) return null;

  // Process pasted list of serials/MACs
  const handleProcessPastedBulk = () => {
    const lines = bulkPasteText
      .split(/[\r\n,;\t]+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 2);

    if (lines.length === 0) return;

    setScannedBatch((prev) => {
      const updated = [...prev];
      lines.forEach((line) => {
        const { isMac, formatted, cleanSerial } = detectAndFormatMac(line);
        const existingIdx = updated.findIndex(
          (item) =>
            item.serialNumber.toUpperCase() === cleanSerial.toUpperCase() ||
            (isMac && item.macAddress && item.macAddress.toUpperCase() === formatted.toUpperCase())
        );

        if (existingIdx !== -1) {
          updated[existingIdx] = {
            ...updated[existingIdx],
            quantity: (updated[existingIdx].quantity || 1) + 1,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
        } else {
          const dbCheck = checkDuplicateInDB(cleanSerial);
          const isMeterBasedItem = category === 'PATCH_CORD' || category === 'FIBER_CABLE';
          updated.push({
            id: `scan-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            serialNumber: cleanSerial,
            macAddress: isMac ? formatted : undefined,
            category,
            modelName: itemTitle,
            quantity: 1,
            lengthMeters: isMeterBasedItem ? 1 : undefined,
            isMac,
            isDuplicateInDB: dbCheck.isDuplicate,
            duplicateInfo: dbCheck.info,
            isDuplicateInBatch: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          });
        }
      });
      return updated;
    });

    setBulkPasteText('');
    setIsPastingMultiple(false);
  };

  // Update quantity on batch item via [- 1 +] stepper
  const handleUpdateBatchQuantity = (id: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setScannedBatch((prev) => prev.filter((item) => item.id !== id));
      return;
    }
    setScannedBatch((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: newQuantity } : item))
    );
  };

  // Update length in meters via [- 1m +] stepper
  const handleUpdateBatchLength = (id: string, newLength: number) => {
    const validLength = Math.max(1, newLength);
    setScannedBatch((prev) =>
      prev.map((item) => (item.id === id ? { ...item, lengthMeters: validLength } : item))
    );
  };

  // Remove single item from batch
  const handleRemoveBatchItem = (id: string) => {
    setScannedBatch((prev) => prev.filter((item) => item.id !== id));
  };

  // Clear entire batch
  const handleClearBatch = () => {
    setScannedBatch([]);
  };

  // Calculate total units across all models in batch
  const totalScannedUnits = scannedBatch.reduce((sum, item) => sum + (item.quantity || 1), 0);

  // Commit Bulk Batch to Inventory
  const handleCommitBulkBatch = () => {
    if (scannedBatch.length === 0) {
      setValidationError('Please scan or paste at least one barcode before committing.');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const itemsToCommit: Omit<InventoryItem, 'id'>[] = scannedBatch.map((batchItem) => {
      const isMeterCat = batchItem.category === 'PATCH_CORD' || batchItem.category === 'FIBER_CABLE';
      const mLength = batchItem.lengthMeters || 1;
      return {
        serialNumber: batchItem.serialNumber,
        macAddress: batchItem.macAddress,
        sku: sku.trim().toUpperCase(),
        name: isMeterCat && batchItem.lengthMeters
          ? `${itemTitle.trim()} (${mLength}m)`
          : itemTitle.trim(),
        description: isMeterCat && batchItem.lengthMeters
          ? `${description.trim() || itemTitle.trim()} • Length: ${mLength} meters`
          : description.trim() || `${itemTitle} - Received via Intake`,
        category: batchItem.category || category,
        lifecycleStatus: 'IN_STOCK',
        verificationStatus: 'UNLINKED_READY',
        status: 'IN_STOCK',
        bypassBarcode: false,
        quantity: batchItem.quantity || 1,
        lengthMeters: isMeterCat ? mLength : undefined,
        unit: 'pcs',
        storageBin: storageBin.trim(),
        modelName: modelName.trim() || itemTitle.trim(),
        brand: brand.trim() || 'FiberX',
        receivedDate: today,
        receivedBy: `${currentUser.name} (${currentUser.role})`,
        archived: false,
        notes: notes.trim() ? notes.trim() : undefined,
      };
    });

    if (onBatchReceive) {
      onBatchReceive(itemsToCommit);
    } else {
      itemsToCommit.forEach((item) => onReceive(item));
    }

    handleStopCamera();
    onClose();
  };

  // Commit Manual Add (Item Title + Barcode or MAC Address)
  const handleCommitManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!itemTitle.trim()) {
      setValidationError('Item Title is required. Please input what hardware you are adding.');
      return;
    }

    if (!isNonBarcodedMaterial && !manualCodeInput.trim()) {
      setValidationError('Barcode / Serial Number or MAC Address is required.');
      return;
    }

    const { isMac, formatted, cleanSerial } = detectAndFormatMac(manualCodeInput.trim());
    const today = new Date().toISOString().split('T')[0];
    const computedSku = sku.trim()
      ? sku.trim().toUpperCase()
      : `FX-${itemTitle.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'ITEM')}-${Math.floor(Math.random() * 900 + 100)}`;

    onReceive({
      serialNumber: isNonBarcodedMaterial ? '' : cleanSerial,
      macAddress: !isNonBarcodedMaterial && isMac ? formatted : undefined,
      sku: computedSku,
      name: itemTitle.trim(),
      description: description.trim() || `${itemTitle} added manually by ${currentUser.name}`,
      category,
      lifecycleStatus: 'IN_STOCK',
      verificationStatus: 'UNLINKED_READY',
      status: 'IN_STOCK',
      bypassBarcode: isNonBarcodedMaterial,
      quantity: Math.max(1, manualQuantity),
      unit: isNonBarcodedMaterial ? unit : 'pcs',
      storageBin: storageBin.trim() || 'Rack A-01',
      modelName: modelName.trim() || itemTitle.trim(),
      brand: brand.trim() || 'FiberX',
      receivedDate: today,
      receivedBy: `${currentUser.name} (${currentUser.role})`,
      archived: false,
      notes: notes.trim() || undefined,
    });

    handleStopCamera();
    onClose();
  };

  const currentCategoryDef =
    CATEGORY_DEFINITIONS.find((c) => c.id === category) || CATEGORY_DEFINITIONS[0];

  // Helper for category icon component
  const renderCategoryIcon = (catId: ItemCategory, className = 'w-4 h-4') => {
    switch (catId) {
      case 'MODEM_ONT':
        return <Router className={className} />;
      case 'FIBER_CABLE':
        return <Cable className={className} />;
      case 'SPLITTER':
        return <GitFork className={className} />;
      case 'PATCH_CORD':
        return <Link2 className={className} />;
      case 'ACCESSORY':
        return <Wrench className={className} />;
      default:
        return <Layers className={className} />;
    }
  };

  if (!isOpen) return null;

  const modalInnerContent = (
    <>
      {/* Header */}
      <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
            <Barcode className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
              Receive Stock & Hardware Intake
            </h2>
            <p className="text-xs text-slate-500">
              Categorize equipment and receive into warehouse inventory
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            handleStopCamera();
            onClose();
          }}
          className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

        {/* Mode Selector Segmented Tabs (Bulk Scan & Manual Add) */}
        <div className="px-6 pt-3 pb-2 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-200/80 rounded-xl text-xs font-bold">
            {/* Mode 1: Bulk Scan */}
            <button
              type="button"
              onClick={() => {
                setActiveMode('bulk_scan');
                setValidationError(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'bulk_scan'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Layers className="w-4 h-4 text-teal-600" />
              <span>Bulk Scan</span>
              {totalScannedUnits > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                  {totalScannedUnits}
                </span>
              )}
            </button>

            {/* Mode 2: Manual Add */}
            <button
              type="button"
              onClick={() => {
                setActiveMode('manual_add');
                setValidationError(null);
              }}
              className={`py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeMode === 'manual_add'
                  ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Edit3 className="w-4 h-4 text-teal-600" />
              <span>Manual Add</span>
            </button>
          </div>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-slate-800">
          {validationError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-red-700 text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div>
                <p className="font-semibold text-red-800">Validation Notice</p>
                <p className="text-xs text-red-700">{validationError}</p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CATEGORIZATION BAR: MODEMS & ONTS, FIBER DROP CABLES, OPTICAL SPLITTERS, */}
          {/* PATCH CORDS & FAST-CON, ACCESSORIES & CLAMPS                             */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                Equipment Category *
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryDirectory(!showCategoryDirectory)}
                  className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-semibold text-slate-700 transition-colors cursor-pointer"
                >
                  {showCategoryDirectory ? 'Hide Category Tree' : 'View Category Tree (1-5)'}
                </button>
                <span className="text-[11px] text-slate-500 font-mono">
                  Active Category:{' '}
                  <strong className="text-teal-700 font-bold">{CATEGORY_LABELS[category]}</strong>
                </span>
              </div>
            </div>

            {/* Hierarchical Category Tree (1 - 5 with sub-items) */}
            {showCategoryDirectory && (
              <div className="p-3.5 bg-slate-50 text-slate-900 rounded-xl border border-slate-200 text-xs shadow-2xs animate-in fade-in duration-150 space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="font-bold text-teal-800 uppercase tracking-wider text-[11px]">
                    Hardware Category Listing
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Click any category or item to select
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                  {CATEGORY_DEFINITIONS.map((catDef, idx) => (
                    <div
                      key={catDef.id}
                      className={`p-2.5 rounded-lg border transition-all ${
                        category === catDef.id
                          ? 'border-teal-500 bg-white ring-2 ring-teal-500/30'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectCategory(catDef.id)}
                        className="text-left w-full font-bold text-slate-900 hover:text-teal-700 transition-colors flex items-center gap-1.5 cursor-pointer mb-2"
                      >
                        <span className="text-xs">{catDef.label}</span>
                      </button>
                      <ul className="space-y-1 pl-1 text-[11px] text-slate-600">
                        {catDef.presets.map((preset) => (
                          <li
                            key={preset.sku}
                            onClick={() => {
                              handleSelectCategory(catDef.id);
                              handleSelectPreset(preset);
                            }}
                            className="cursor-pointer hover:text-teal-700 flex items-start gap-1.5 transition-colors"
                          >
                            <span className="text-slate-500 text-[10px] mt-0.5">○</span>
                            <span className="truncate">{preset.name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5 Distinct Category Selection Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {CATEGORY_DEFINITIONS.map((catDef, idx) => {
                const isSelected = category === catDef.id;
                return (
                  <button
                    key={catDef.id}
                    type="button"
                    onClick={() => handleSelectCategory(catDef.id)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-700 text-white border-teal-800 shadow-xs ring-2 ring-teal-500/40'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <div className="flex items-center gap-1.5">
                        {renderCategoryIcon(
                          catDef.id,
                          `w-4 h-4 ${isSelected ? 'text-teal-200' : 'text-teal-600'}`
                        )}
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-teal-300"></span>}
                    </div>
                    <div>
                      <div
                        className={`text-xs font-bold leading-tight ${
                          isSelected ? 'text-white' : 'text-slate-900'
                        }`}
                      >
                        {catDef.label}
                      </div>
                      <div
                        className={`text-[10px] truncate mt-0.5 ${
                          isSelected ? 'text-teal-100' : 'text-slate-400'
                        }`}
                      >
                        {catDef.presets.length} {catDef.presets.length === 1 ? 'item' : 'items'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model Selection & Storage Location */}
          <div className="p-3.5 bg-slate-50/90 border border-slate-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                Items in {CATEGORY_DEFINITIONS.findIndex((c) => c.id === category) + 1}. {CATEGORY_LABELS[category]}:
              </span>
              <span className="text-[10px] text-slate-400">
                Click an item below to load preset specifications
              </span>
            </div>

            {/* Filtered Preset Chips for the active category */}
            <div className="flex flex-wrap gap-1.5">
              {currentCategoryDef.presets.map((preset) => {
                const isSelected = selectedPresetSku === preset.sku && itemTitle === preset.name;
                return (
                  <button
                    key={preset.sku}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer text-left flex items-center gap-2 ${
                      isSelected
                        ? 'bg-teal-800 text-white font-bold shadow-xs'
                        : 'bg-white hover:bg-slate-200/80 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className={`text-[11px] font-bold ${isSelected ? 'text-teal-200' : 'text-teal-600'}`}>
                      ○
                    </span>
                    <span>{preset.name}</span>
                    <span
                      className={`text-[10px] font-mono px-1 rounded ${
                        isSelected ? 'bg-teal-900/70 text-teal-100' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {preset.defaultUnit}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Title & Storage Bin Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Item Title / Equipment Name *
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => {
                    setItemTitle(e.target.value);
                    setSelectedPresetSku('');
                  }}
                  placeholder="e.g. ZTE ZXHN F670L or custom cable drum"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Storage Bin / Shelf *
                </label>
                <input
                  type="text"
                  value={storageBin}
                  onChange={(e) => setStorageBin(e.target.value)}
                  placeholder="e.g. Rack A-01, Spool Bay 1"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MODE 1: BULK SCAN (CONTINUOUS BARCODE SCANNING)                           */}
          {/* ========================================================================= */}
          {activeMode === 'bulk_scan' && (
            <div className="space-y-4 animate-in fade-in duration-100">
              {/* Active Scanner Zone */}
              <div className="p-4 bg-teal-50/70 border-2 border-teal-500/60 rounded-xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-teal-600"></span>
                    </span>
                    <span className="text-xs font-extrabold uppercase tracking-wider text-teal-950">
                      Scanner Ready for [{CATEGORY_LABELS[category]}]
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isCameraActive ? (
                      <button
                        type="button"
                        onClick={handleStartCamera}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-teal-300 rounded-lg text-xs font-semibold text-teal-800 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-teal-600" />
                        <span>Use Camera</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopCamera}
                        className="px-2.5 py-1 bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg text-xs font-bold text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Stop Camera</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsPastingMultiple(!isPastingMultiple)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-teal-300 rounded-lg text-xs font-semibold text-teal-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-teal-600" />
                      <span>{isPastingMultiple ? 'Hide Paste' : 'Paste Serials'}</span>
                    </button>
                  </div>
                </div>

                {/* Camera Viewfinder if Active */}
                {isCameraActive && (
                  <div className="relative rounded-xl overflow-hidden border-2 border-teal-500 bg-black aspect-video flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 border-2 border-teal-400/70 m-6 rounded-lg pointer-events-none flex items-center justify-center">
                      <div className="w-full h-0.5 bg-red-500/80 animate-pulse" />
                      <span className="absolute bottom-2 text-[10px] text-white/90 font-mono bg-black/60 px-2 py-0.5 rounded">
                        Aim camera at equipment barcode or serial
                      </span>
                    </div>
                  </div>
                )}
                {cameraError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                    {cameraError}
                  </div>
                )}

                {/* Paste multiple serials box */}
                {isPastingMultiple && (
                  <div className="p-3 bg-white border border-teal-300 rounded-xl space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Paste multiple barcodes or MAC addresses (one per line or comma-separated):
                    </label>
                    <textarea
                      rows={3}
                      value={bulkPasteText}
                      onChange={(e) => setBulkPasteText(e.target.value)}
                      placeholder={`ZTEGC9A2148B\nHWTC4A998811\n78:D6:F0:9A:21:48\nZTEW6AX3002Y`}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleProcessPastedBulk}
                        className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                      >
                        + Add Pasted Serials to Batch
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Continuous Barcode Input */}
                <div className="relative">
                  <input
                    ref={bulkScannerInputRef}
                    type="text"
                    data-scanner-field="true"
                    value={bulkScanInput}
                    onChange={(e) => setBulkScanInput(e.target.value)}
                    onKeyDown={handleBulkInputKeyDown}
                    placeholder="Pull scanner trigger or type barcode / MAC and press Enter..."
                    className="w-full pl-10 pr-24 py-3 bg-white border-2 border-teal-500 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-4 focus:ring-teal-400/30"
                    autoFocus
                  />
                  <Barcode className="w-5 h-5 text-teal-600 absolute left-3 top-3.5" />
                  <button
                    type="button"
                    onClick={() => {
                      if (bulkScanInput.trim()) {
                        addCodeToBulkBatch(bulkScanInput);
                        setBulkScanInput('');
                        bulkScannerInputRef.current?.focus();
                      }
                    }}
                    className="absolute right-2 top-2 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                  >
                    + Add Scan
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-teal-800">
                  <span>
                    ⚡ <strong>Hardware Auto-Capture:</strong> Scanning appends directly to{' '}
                    <strong>{CATEGORY_LABELS[category]}</strong> queue below.
                  </span>
                  {lastScannedFlash && (
                    <span className="font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 animate-pulse">
                      Scanned: {lastScannedFlash}
                    </span>
                  )}
                </div>
              </div>

              {/* Scanned Batch Queue Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Scanned Hardware Queue
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-teal-600 text-white">
                      {totalScannedUnits} {totalScannedUnits === 1 ? 'Unit' : 'Units'} Scanned
                    </span>
                    {scannedBatch.length > 0 && totalScannedUnits !== scannedBatch.length && (
                      <span className="text-[11px] text-slate-500 font-medium">
                        ({scannedBatch.length} unique {scannedBatch.length === 1 ? 'code' : 'codes'})
                      </span>
                    )}
                  </div>

                  {scannedBatch.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearBatch}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" /> Clear List
                    </button>
                  )}
                </div>

                {scannedBatch.length > 0 ? (
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white">
                    {scannedBatch.map((item, idx) => (
                      <div
                        key={item.id}
                        className={`px-4 py-2 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors ${
                          item.isDuplicateInDB ? 'bg-amber-50/70' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-teal-100 text-teal-900 font-mono text-xs font-bold flex items-center justify-center shrink-0 border border-teal-200">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {item.serialNumber}
                              </span>
                              {item.isMac && (
                                <span className="px-1.5 py-0.2 rounded bg-cyan-100 text-cyan-800 text-[10px] font-mono">
                                  MAC: {item.macAddress}
                                </span>
                              )}
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                                {CATEGORY_LABELS[item.category] || item.category}
                              </span>
                              {item.quantity > 1 && (
                                <span className="px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 text-[10px] font-bold font-mono">
                                  Qty: {String(item.quantity).padStart(2, '0')} pcs
                                </span>
                              )}
                              {(item.category === 'PATCH_CORD' || item.category === 'FIBER_CABLE') && (
                                <span className="px-1.5 py-0.2 rounded bg-sky-100 text-sky-800 text-[10px] font-bold font-mono">
                                  {item.lengthMeters || 1}m
                                </span>
                              )}
                              {item.isDuplicateInDB && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold flex items-center gap-1" title={item.duplicateInfo}>
                                  <AlertTriangle className="w-3 h-3 text-amber-700" /> Already in DB
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-500">
                              Model: <strong>{item.modelName}</strong> • {item.timestamp}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Quantity Stepper (pieces) */}
                          <div className="flex items-center" title="Quantity in pieces">
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => handleUpdateBatchQuantity(item.id, (item.quantity || 1) - 1)}
                                className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                title="Decrease quantity by 1 pc"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={String(item.quantity || 1).padStart(2, '0')}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(/\D/g, '');
                                  const val = raw ? Math.max(1, parseInt(raw, 10)) : 1;
                                  handleUpdateBatchQuantity(item.id, val);
                                }}
                                className="w-9 h-7 text-center font-mono font-bold text-xs text-slate-900 border-x border-slate-200 focus:outline-none focus:bg-teal-50"
                                title="Quantity (pcs)"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateBatchQuantity(item.id, (item.quantity || 1) + 1)}
                                className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                title="Increase quantity by 1 pc"
                                aria-label="Increase quantity"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Measurement Stepper (Length in Meters) for Patch Cords & Mechanical Connectors */}
                          {(item.category === 'PATCH_CORD' || item.category === 'FIBER_CABLE') && (
                            <div className="flex items-center" title="Measurement (length in meters)">
                              <div className="flex items-center border border-sky-300 rounded-lg overflow-hidden bg-sky-50/50 shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBatchLength(item.id, (item.lengthMeters || 1) - 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs transition-colors cursor-pointer"
                                  title="Decrease length by 1 meter"
                                  aria-label="Decrease length"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <div className="flex items-center bg-white border-x border-sky-200 px-1">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    value={String(item.lengthMeters || 1).padStart(2, '0')}
                                    onChange={(e) => {
                                      const raw = e.target.value.replace(/\D/g, '');
                                      const val = raw ? Math.max(1, parseInt(raw, 10)) : 1;
                                      handleUpdateBatchLength(item.id, val);
                                    }}
                                    className="w-7 h-7 text-center font-mono font-bold text-xs text-slate-900 focus:outline-none focus:bg-sky-50"
                                    title="Directly enter length in meters"
                                  />
                                  <span className="text-[11px] font-bold text-sky-700 select-none pr-0.5">m</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateBatchLength(item.id, (item.lengthMeters || 1) + 1)}
                                  className="w-7 h-7 flex items-center justify-center bg-sky-50 hover:bg-sky-100 text-sky-800 font-bold text-xs transition-colors cursor-pointer"
                                  title="Increase length by 1 meter"
                                  aria-label="Increase length"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRemoveBatchItem(item.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Remove this scanned item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <div ref={batchListEndRef} />
                  </div>
                ) : (
                  <div className="p-8 text-center bg-white space-y-2">
                    <Barcode className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-700">No barcodes scanned yet</p>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                      Scan equipment one after another with your hardware laser scanner or camera. They will accumulate under{' '}
                      <strong>{CATEGORY_LABELS[category]}</strong> for 1-click receiving.
                    </p>
                  </div>
                )}
              </div>

              {/* Bulk Commit Action Bar */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="text-xs text-slate-600">
                  Total to commit:{' '}
                  <strong className="text-slate-900 font-bold">
                    {totalScannedUnits} {totalScannedUnits === 1 ? 'unit' : 'units'}
                  </strong>{' '}
                  ({scannedBatch.length} unique {scannedBatch.length === 1 ? 'code' : 'codes'}) into{' '}
                  <strong className="text-teal-700 font-semibold">{storageBin}</strong> (
                  <span className="text-slate-800 font-semibold">{CATEGORY_LABELS[category]}</span>)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleStopCamera();
                      onClose();
                    }}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCommitBulkBatch}
                    disabled={scannedBatch.length === 0}
                    className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer ${
                      scannedBatch.length > 0
                        ? 'bg-teal-600 hover:bg-teal-700 active:bg-teal-800'
                        : 'bg-slate-300 cursor-not-allowed text-slate-500'
                    }`}
                  >
                    <PackageCheck className="w-4 h-4" />
                    Commit All ({totalScannedUnits}) to Stock
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* MODE 2: MANUAL ADD (ITEM TITLE + BARCODE OR MAC ADDRESS)                   */}
          {/* ========================================================================= */}
          {activeMode === 'manual_add' && (
            <form onSubmit={handleCommitManualAdd} className="space-y-4 animate-in fade-in duration-100">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-teal-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Manual Equipment Entry: {CATEGORY_LABELS[category]}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Provide <strong>Barcode / Serial</strong> or <strong>MAC Address</strong>
                  </span>
                </div>

                {/* Primary Input 1: Barcode or MAC Address */}
                <div>
                  {initialSerial && (
                    <div className="mb-2 p-2.5 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-950 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-teal-700 shrink-0" />
                        <span>
                          Captured via Hand-held Scanner: <strong className="font-mono">{initialSerial}</strong>
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-200 text-teal-900">
                        Ready to Confirm
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Barcode (Serial Number) or MAC Address *
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-600">
                      <input
                        type="checkbox"
                        checked={isNonBarcodedMaterial}
                        onChange={(e) => setIsNonBarcodedMaterial(e.target.checked)}
                        className="w-3.5 h-3.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500"
                      />
                      <span>Non-barcoded material (loose cable, clamp, connector box)</span>
                    </label>
                  </div>

                  {!isNonBarcodedMaterial ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={manualCodeInput}
                        onChange={(e) => setManualCodeInput(e.target.value)}
                        placeholder="Enter barcode e.g. ZTEGC9A2148B or MAC e.g. 78:D6:F0:9A:21:48"
                        className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        required={!isNonBarcodedMaterial}
                        autoFocus
                      />
                      <Barcode className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                    </div>
                  ) : (
                    <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-xs text-teal-900">
                      <strong>Non-Barcoded Material Mode:</strong> Item will be registered under category{' '}
                      <strong>{CATEGORY_LABELS[category]}</strong> with SKU {sku || 'batch SKU'}.
                    </div>
                  )}

                  {/* MAC detected or Duplicate Warning */}
                  {!isNonBarcodedMaterial && manualCodeInput.trim() && (
                    <div className="mt-2 space-y-1.5">
                      {detectAndFormatMac(manualCodeInput).isMac && (
                        <div className="px-2.5 py-1 bg-cyan-50 border border-cyan-200 rounded text-[11px] font-mono text-cyan-900 flex items-center justify-between">
                          <span>
                            Detected Valid MAC Address: <strong>{detectAndFormatMac(manualCodeInput).formatted}</strong>
                          </span>
                          <span className="text-[10px] text-cyan-700">Auto-configured</span>
                        </div>
                      )}

                      {checkDuplicateInDB(manualCodeInput).isDuplicate && (
                        <div className="p-2 bg-amber-50 border border-amber-300 rounded text-xs text-amber-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span>{checkDuplicateInDB(manualCodeInput).info}</span>
                        </div>
                      )}

                      {/* Barcode visual preview */}
                      <div className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between">
                        <span className="text-[10px] font-mono text-slate-500">
                          Live Barcode Tag: [{manualCodeInput.trim().toUpperCase()}]
                        </span>
                        <BarcodeSvg value={manualCodeInput.trim().toUpperCase()} width={150} height={36} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Collapsible Additional Details (Optional) */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowOptionalDetails(!showOptionalDetails)}
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    <span>Additional Details (SKU, Quantity, Unit, Notes)</span>
                    {showOptionalDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  {showOptionalDetails && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 animate-in fade-in duration-100">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Product SKU Code
                        </label>
                        <input
                          type="text"
                          value={sku}
                          onChange={(e) => setSku(e.target.value)}
                          placeholder="e.g. ONT-ZTE-F670L"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Quantity & Unit
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="number"
                            min="1"
                            value={manualQuantity}
                            onChange={(e) => setManualQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            className="w-20 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                          <select
                            value={unit}
                            onChange={(e) => setUnit(e.target.value as typeof unit)}
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                          >
                            <option value="pcs">Pieces (pcs)</option>
                            <option value="meters">Meters (m)</option>
                            <option value="spools">Spools</option>
                            <option value="boxes">Boxes</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Brand / Manufacturer
                        </label>
                        <input
                          type="text"
                          value={brand}
                          onChange={(e) => setBrand(e.target.value)}
                          placeholder="e.g. ZTE, Huawei, FiberX"
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Notes / Specifications
                        </label>
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="Optional batch note..."
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Manual Add Actions */}
              <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    handleStopCamera();
                    onClose();
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-xs flex items-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Add to Stock Inventory
                </button>
              </div>
            </form>
          )}

          {/* Receiving Operator Footer */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-[11px] text-slate-600 shrink-0">
            <span>
              Intake Operator: <strong className="text-slate-900">{currentUser.name}</strong> ({currentUser.badgeId} • {currentUser.role})
            </span>
            <span className="text-slate-500 font-mono">Date: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
    </>
  );

  if (isFullPage) {
    return (
      <div className="flex-1 min-w-0 h-full w-full bg-white overflow-hidden flex flex-col">
        {modalInnerContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {modalInnerContent}
      </div>
    </div>
  );
};
