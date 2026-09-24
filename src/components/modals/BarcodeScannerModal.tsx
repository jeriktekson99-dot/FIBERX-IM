import React, { useState, useEffect, useRef, useCallback } from 'react';
import { InventoryItem, UserProfile, ItemCategory, CATEGORY_LABELS } from '../../types';
import {
  X,
  Barcode,
  Camera,
  Search,
  Zap,
  CheckCircle,
  AlertCircle,
  PackagePlus,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Plus,
  Layers,
  CheckCircle2,
  Trash2,
  Package,
  Boxes,
  ArrowUpRight,
  Radio,
  ExternalLink,
  Check,
} from 'lucide-react';
import { BarcodeSvg } from '../common/BarcodeSvg';
import { DualStatusBadge } from '../common/DualStatusBadge';
import { CATEGORY_DEFINITIONS, SKUHardwarePreset } from './ReceiveStockModal';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScannedItem: (item: InventoryItem) => void;
  onReceiveNewSerial: (serial: string) => void;
  onReceiveItem?: (item: Omit<InventoryItem, 'id'>) => void;
  onBatchReceiveItems?: (items: Omit<InventoryItem, 'id'>[]) => void;
  onUpdateItem?: (itemId: string, updates: Partial<InventoryItem>) => void;
  onNavigateToInventory?: () => void;
  inventory: InventoryItem[];
  currentUser: UserProfile;
  initialQuery?: string;
  externalScan?: { code: string; timestamp: number } | null;
}

type ScannerHubMode = 'single_scan' | 'continuous_batch';

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onSelectScannedItem,
  onReceiveNewSerial,
  onReceiveItem,
  onBatchReceiveItems,
  onUpdateItem,
  onNavigateToInventory,
  inventory,
  currentUser,
  initialQuery = '',
  externalScan = null,
}) => {
  const [activeHubMode, setActiveHubMode] = useState<ScannerHubMode>('single_scan');

  // Single Scan & Confirm states
  const [inputCode, setInputCode] = useState<string>(initialQuery || '');
  const [scannedCode, setScannedCode] = useState<string>(initialQuery || '');
  const [matchedItem, setMatchedItem] = useState<InventoryItem | null>(null);
  const [isSearched, setIsSearched] = useState<boolean>(Boolean(initialQuery));
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [recentlyConfirmedItem, setRecentlyConfirmedItem] = useState<InventoryItem | null>(null);

  // New item configuration form for unregistered serials
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory>('MODEM_ONT');
  const [selectedPresetSku, setSelectedPresetSku] = useState<string>(
    CATEGORY_DEFINITIONS[0].presets[0].sku
  );
  const [itemTitle, setItemTitle] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].name);
  const [sku, setSku] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].sku);
  const [brand, setBrand] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].brand);
  const [modelName, setModelName] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].modelName);
  const [storageBin, setStorageBin] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].defaultBin);
  const [quantity, setQuantity] = useState<number>(1);
  const [unit, setUnit] = useState<'pcs' | 'meters' | 'rolls' | 'spools' | 'boxes'>('pcs');
  const [notes, setNotes] = useState<string>('');

  // Continuous Batch Intake states
  const [batchCategory, setBatchCategory] = useState<ItemCategory>('MODEM_ONT');
  const [batchPresetSku, setBatchPresetSku] = useState<string>(
    CATEGORY_DEFINITIONS[0].presets[0].sku
  );
  const [batchTitle, setBatchTitle] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].name);
  const [batchSku, setBatchSku] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].sku);
  const [batchBrand, setBatchBrand] = useState<string>(CATEGORY_DEFINITIONS[0].presets[0].brand);
  const [batchStorageBin, setBatchStorageBin] = useState<string>(
    CATEGORY_DEFINITIONS[0].presets[0].defaultBin
  );
  const [batchScanInput, setBatchScanInput] = useState<string>('');
  const [matchedItemQty, setMatchedItemQty] = useState<number>(1);
  const [quantityUpdatedToast, setQuantityUpdatedToast] = useState<boolean>(false);
  const [scannedBatch, setScannedBatch] = useState<
    Array<{ id: string; serialNumber: string; macAddress?: string; timestamp: string; quantity: number }>
  >([]);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const singleScannerInputRef = useRef<HTMLInputElement>(null);
  const batchScannerInputRef = useRef<HTMLInputElement>(null);

  // Web Audio Chime helper
  const playAudioChime = useCallback((type: 'scan' | 'confirm' | 'warn') => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      if (type === 'scan') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.08);
      } else if (type === 'confirm') {
        // Double pleasant chime (880Hz -> 1320Hz)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        osc1.type = 'sine';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(880, now);
        osc2.frequency.setValueAtTime(1320, now + 0.09);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc1.stop(now + 0.09);
        osc2.start(now + 0.09);
        osc2.stop(now + 0.25);
      } else if (type === 'warn') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      }
    } catch {
      // Audio might be blocked without initial user gesture
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      handleLookup(initialQuery);
    }
  }, [initialQuery]);

  // Clean up camera stream if open
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Auto-focus scanner input field when modal opens or mode switches
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeHubMode === 'single_scan' && singleScannerInputRef.current) {
          singleScannerInputRef.current.focus();
        } else if (activeHubMode === 'continuous_batch' && batchScannerInputRef.current) {
          batchScannerInputRef.current.focus();
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeHubMode]);

  if (!isOpen) return null;

  const handleLookup = (code: string) => {
    const clean = code.trim().toUpperCase();
    setScannedCode(clean);
    setIsSearched(true);
    setRecentlyConfirmedItem(null);

    if (!clean) {
      setMatchedItem(null);
      return;
    }

    playAudioChime('scan');

    const found = inventory.find(
      (it) =>
        it.serialNumber.toUpperCase() === clean ||
        it.sku.toUpperCase() === clean ||
        (it.macAddress &&
          it.macAddress.replace(/[^A-Za-z0-9]/g, '').toUpperCase() ===
            clean.replace(/[^A-Za-z0-9]/g, ''))
    );

    setMatchedItem(found || null);
    setMatchedItemQty(found ? found.quantity : 1);
  };

  const handleUpdateMatchedItemQty = (itemId: string, newQty: number) => {
    const clampedQty = Math.max(0, newQty);
    setMatchedItemQty(clampedQty);
    if (onUpdateItem) {
      onUpdateItem(itemId, { quantity: clampedQty });
      setQuantityUpdatedToast(true);
      setTimeout(() => setQuantityUpdatedToast(false), 2000);
    }
    setMatchedItem((prev) => (prev ? { ...prev, quantity: clampedQty } : null));
  };

  const handleApplyPreset = (preset: SKUHardwarePreset) => {
    setSelectedPresetSku(preset.sku);
    setItemTitle(preset.name);
    setSku(preset.sku);
    setBrand(preset.brand);
    setModelName(preset.modelName);
    setStorageBin(preset.defaultBin);
    setUnit(preset.defaultUnit);
  };

  const handleApplyCategory = (cat: ItemCategory) => {
    setSelectedCategory(cat);
    const def = CATEGORY_DEFINITIONS.find((c) => c.id === cat) || CATEGORY_DEFINITIONS[0];
    if (def.presets.length > 0) {
      handleApplyPreset(def.presets[0]);
    }
  };

  // Single Item: Confirm and Add to Stock Inventory
  const handleConfirmSingleProductToStock = () => {
    if (!scannedCode) return;

    const today = new Date().toISOString().split('T')[0];
    const newItem: Omit<InventoryItem, 'id'> = {
      serialNumber: scannedCode,
      sku: sku.trim().toUpperCase(),
      name: itemTitle.trim(),
      description: `${itemTitle} received via Hand-held Scanner Hub into ${storageBin}`,
      category: selectedCategory,
      lifecycleStatus: 'IN_STOCK',
      verificationStatus: 'UNLINKED_READY',
      status: 'IN_STOCK',
      bypassBarcode: false,
      quantity: Math.max(1, quantity),
      unit,
      storageBin: storageBin.trim(),
      brand: brand.trim() || 'FiberX',
      modelName: modelName.trim() || itemTitle.trim(),
      receivedDate: today,
      receivedBy: `${currentUser.name} (${currentUser.role})`,
      archived: false,
      notes: notes.trim() ? `Handheld Scanner Intake: ${notes.trim()}` : undefined,
    };

    if (onReceiveItem) {
      onReceiveItem(newItem);
    } else {
      onReceiveNewSerial(scannedCode);
    }

    playAudioChime('confirm');

    // Create item representation for instant success view
    const confirmedRepresentation: InventoryItem = {
      ...newItem,
      id: `item-${Date.now()}`,
    };
    setRecentlyConfirmedItem(confirmedRepresentation);
    setMatchedItem(confirmedRepresentation);
  };

  // Continuous Batch Intake handlers
  const addBatchCode = useCallback((rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    const existingIndex = scannedBatch.findIndex((item) => item.serialNumber === code);
    if (existingIndex !== -1) {
      playAudioChime('scan');
      setScannedBatch((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: (item.quantity || 1) + 1 } : item
        )
      );
      setBatchScanInput('');
      return;
    }

    playAudioChime('scan');
    setScannedBatch((prev) => [
      ...prev,
      {
        id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        serialNumber: code,
        timestamp: new Date().toLocaleTimeString(),
        quantity: 1,
      },
    ]);
    setBatchScanInput('');
  }, [scannedBatch, playAudioChime]);

  const handleBatchScanKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addBatchCode(batchScanInput);
    }
  };

  const lastHandledExternalScanRef = useRef<number>(0);
  useEffect(() => {
    if (externalScan && externalScan.timestamp > lastHandledExternalScanRef.current) {
      lastHandledExternalScanRef.current = externalScan.timestamp;
      if (activeHubMode === 'continuous_batch') {
        addBatchCode(externalScan.code);
      } else {
        setInputCode(externalScan.code);
        handleLookup(externalScan.code);
      }
    }
  }, [externalScan, activeHubMode, addBatchCode]);

  const handleConfirmBatchToStock = () => {
    if (scannedBatch.length === 0) return;

    const today = new Date().toISOString().split('T')[0];
    const totalUnits = scannedBatch.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const itemsToCommit: Omit<InventoryItem, 'id'>[] = scannedBatch.map((item) => ({
      serialNumber: item.serialNumber,
      sku: batchSku.trim().toUpperCase(),
      name: batchTitle.trim(),
      description: `${batchTitle} - Received via Handheld Scanner Batch`,
      category: batchCategory,
      lifecycleStatus: 'IN_STOCK',
      verificationStatus: 'UNLINKED_READY',
      status: 'IN_STOCK',
      bypassBarcode: false,
      quantity: item.quantity || 1,
      unit: 'pcs',
      storageBin: batchStorageBin.trim(),
      brand: batchBrand.trim() || 'FiberX',
      modelName: batchTitle.trim(),
      receivedDate: today,
      receivedBy: `${currentUser.name} (${currentUser.role})`,
      archived: false,
    }));

    if (onBatchReceiveItems) {
      onBatchReceiveItems(itemsToCommit);
    } else if (onReceiveItem) {
      itemsToCommit.forEach((item) => onReceiveItem(item));
    }

    playAudioChime('confirm');
    setBatchSuccessMessage(
      `Successfully confirmed and added ${totalUnits} item(s) (${scannedBatch.length} product entries) into Stock Inventory!`
    );
    setScannedBatch([]);

    setTimeout(() => {
      if (onNavigateToInventory) {
        onNavigateToInventory();
      }
      onClose();
    }, 1200);
  };

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

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white text-slate-900 flex items-center justify-between border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-2xs">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                  Hand-held Barcode Scanner Hub
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200 font-mono">
                  USB / Bluetooth Laser Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Scan barcodes with your hand-held scanner and confirm them directly into Stock Inventory.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              handleStopCamera();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="px-6 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveHubMode('single_scan')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeHubMode === 'single_scan'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Single Scan & Add to Stock</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveHubMode('continuous_batch')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeHubMode === 'continuous_batch'
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-200 border border-slate-200'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              <span>Continuous Batch Intake (Multi-Scan)</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-600"></span>
            </span>
            <span>Listener Active</span>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {/* ======================================================== */}
          {/* MODE 1: SINGLE SCAN & CONFIRM INTO STOCK INVENTORY       */}
          {/* ======================================================== */}
          {activeHubMode === 'single_scan' && (
            <div className="space-y-5">
              {/* Active Scanner Listener Banner */}
              <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-teal-950">
                      Hand-held Scanner Listener: ACTIVE & ARMED
                    </p>
                    <p className="text-[11px] text-teal-700">
                      Aim your physical USB or Bluetooth scanner at any hardware barcode and pull the trigger.
                    </p>
                  </div>
                </div>

                {!isCameraActive ? (
                  <button
                    type="button"
                    onClick={handleStartCamera}
                    className="px-3 py-1.5 bg-white hover:bg-teal-100 text-teal-800 border border-teal-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-teal-700" />
                    <span>Camera Viewfinder</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopCamera}
                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Stop Camera</span>
                  </button>
                )}
              </div>

              {/* Camera Viewfinder if toggled */}
              {isCameraActive && (
                <div className="relative rounded-xl overflow-hidden border-2 border-teal-500 bg-black aspect-video flex items-center justify-center">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 border-2 border-teal-400/70 m-8 rounded-lg pointer-events-none flex items-center justify-center">
                    <div className="w-full h-0.5 bg-red-500/80 animate-pulse shadow-sm" />
                    <span className="absolute bottom-2 text-[10px] text-white/90 font-mono bg-black/60 px-2 py-0.5 rounded">
                      Align hardware barcode inside red guide line
                    </span>
                  </div>
                </div>
              )}

              {cameraError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {cameraError}
                </div>
              )}

              {/* Barcode Scanner Input Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Scan Barcode with Hand-held Scanner (or Enter Serial)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      ref={singleScannerInputRef}
                      type="text"
                      data-scanner-field="true"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLookup(inputCode);
                        }
                      }}
                      placeholder="Pull scanner trigger or type barcode serial..."
                      className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-2 border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-600"
                      autoFocus
                    />
                    <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleLookup(inputCode)}
                    className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    <span>Lookup</span>
                  </button>
                </div>
              </div>



              {/* Query Result Card */}
              {isSearched && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Barcode className="w-4 h-4 text-teal-700" />
                      Scanner Captured: <span className="font-mono text-teal-900">{scannedCode || 'None'}</span>
                    </span>

                    {matchedItem ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-emerald-600" />
                        Already in Stock Inventory
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                        Unregistered — Ready to Add to Stock
                      </span>
                    )}
                  </div>

                  {/* Case A: Already in Stock Inventory */}
                  {matchedItem && !recentlyConfirmedItem ? (
                    <div className="p-5 space-y-4 bg-white">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-base font-bold text-slate-900">{matchedItem.name}</h3>
                            <DualStatusBadge
                              lifecycleStatus={matchedItem.lifecycleStatus}
                              verificationStatus={matchedItem.verificationStatus}
                              legacyStatus={matchedItem.status}
                              layout="row"
                              size="sm"
                              showCategoryHeaders={false}
                            />
                          </div>
                          <p className="text-xs text-slate-500 font-mono mt-1">
                            SKU: <strong className="text-teal-700">{matchedItem.sku}</strong> • Storage Bin:{' '}
                            <strong className="text-slate-900">{matchedItem.storageBin}</strong>
                          </p>
                        </div>

                        <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-2xs">
                          <BarcodeSvg
                            value={matchedItem.serialNumber}
                            width={180}
                            height={44}
                            barWidth={2.2}
                            allowZoom={true}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Category</span>
                          <strong className="text-slate-900">{matchedItem.category}</strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Assigned Custody</span>
                          <strong className="text-slate-900 truncate block">
                            {matchedItem.assignedTechnicianName || 'Warehouse Shelf'}
                          </strong>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-slate-500 block text-[10px] uppercase font-bold">Customer Account</span>
                          <strong className="text-slate-900 truncate block">
                            {matchedItem.customerAccountNumber || 'Unlinked (Available)'}
                          </strong>
                        </div>
                      </div>

                      {/* Interactive - 1 + Quantity Stepper for Existing Scanned Item */}
                      <div className="p-3.5 bg-teal-50/70 border border-teal-200 rounded-xl space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-teal-950 uppercase tracking-wider block">
                              Live Quantity in Stock
                            </span>
                            <p className="text-[11px] text-teal-700">
                              Adjust quantity with <strong className="font-mono font-bold">- 1 +</strong> without needing to rescan this item.
                            </p>
                          </div>
                          {quantityUpdatedToast ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1 border border-emerald-300">
                              <Check className="w-3.5 h-3.5" /> Stock Updated!
                            </span>
                          ) : (
                            <span className="text-xs font-mono font-bold text-teal-900 bg-white px-2.5 py-1 rounded-md border border-teal-200 shadow-2xs">
                              Live: {matchedItem.quantity} {matchedItem.unit}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <div className="flex items-center border border-teal-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => {
                                const next = Math.max(0, matchedItemQty - 1);
                                setMatchedItemQty(next);
                                handleUpdateMatchedItemQty(matchedItem.id, next);
                              }}
                              disabled={matchedItemQty <= 0}
                              className="w-9 h-8 flex items-center justify-center bg-slate-50 hover:bg-teal-50 disabled:opacity-40 text-slate-700 hover:text-teal-900 font-black text-sm transition-colors cursor-pointer"
                              title="Decrease quantity by 1"
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="0"
                              value={matchedItemQty}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                setMatchedItemQty(val);
                                handleUpdateMatchedItemQty(matchedItem.id, val);
                              }}
                              className="w-16 h-8 text-center font-mono font-bold text-xs text-slate-900 border-x border-teal-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const next = matchedItemQty + 1;
                                setMatchedItemQty(next);
                                handleUpdateMatchedItemQty(matchedItem.id, next);
                              }}
                              className="w-9 h-8 flex items-center justify-center bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-900 font-black text-sm transition-colors cursor-pointer"
                              title="Increase quantity by 1"
                            >
                              +
                            </button>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                const next = matchedItemQty + 1;
                                setMatchedItemQty(next);
                                handleUpdateMatchedItemQty(matchedItem.id, next);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Add 1 to stock"
                            >
                              +1
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = matchedItemQty + 5;
                                setMatchedItemQty(next);
                                handleUpdateMatchedItemQty(matchedItem.id, next);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Add 5 to stock"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const next = matchedItemQty + 10;
                                setMatchedItemQty(next);
                                handleUpdateMatchedItemQty(matchedItem.id, next);
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-teal-50 border border-teal-200 text-teal-800 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                              title="Add 10 to stock"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => {
                            setInputCode('');
                            setIsSearched(false);
                            singleScannerInputRef.current?.focus();
                          }}
                          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          Scan Next Product
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectScannedItem(matchedItem);
                            handleStopCamera();
                            onClose();
                          }}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <span>Inspect Full Details</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* Case B: Recently Confirmed Item Success Banner */}
                  {recentlyConfirmedItem && (
                    <div className="p-5 space-y-4 bg-white">
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-emerald-950">
                              Confirmed & Reflected in Stock Inventory!
                            </p>
                            <p className="text-xs text-emerald-800">
                              Serial: <strong className="font-mono">{recentlyConfirmedItem.serialNumber}</strong> •{' '}
                              {recentlyConfirmedItem.name} placed in{' '}
                              <strong className="font-mono">{recentlyConfirmedItem.storageBin}</strong>
                            </p>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-300">
                          [IN STOCK - LIVE]
                        </span>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInputCode('');
                            setScannedCode('');
                            setIsSearched(false);
                            setRecentlyConfirmedItem(null);
                            singleScannerInputRef.current?.focus();
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-4 h-4 text-teal-700" />
                          <span>Scan Next Product</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (onNavigateToInventory) onNavigateToInventory();
                            handleStopCamera();
                            onClose();
                          }}
                          className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <span>View in Stock Inventory</span>
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Case C: Unregistered Barcode — Inline Add Product & Confirm Form */}
                  {!matchedItem && !recentlyConfirmedItem && (
                    <div className="p-5 space-y-5 bg-white">
                      <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-amber-950">
                            Unregistered Serial Scanned: <code className="font-mono text-teal-900 font-bold">{scannedCode}</code>
                          </p>
                          <p className="text-[11px] text-amber-800">
                            Select the product specifications below and click <strong>Confirm & Add to Stock Inventory</strong>.
                          </p>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-amber-200 shadow-2xs">
                          <BarcodeSvg value={scannedCode} width={130} height={32} />
                        </div>
                      </div>

                      {/* Category Selection Tabs */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          1. Select Hardware Category
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                          {CATEGORY_DEFINITIONS.map((catDef, idx) => {
                            const isSelected = selectedCategory === catDef.id;
                            return (
                              <button
                                key={catDef.id}
                                type="button"
                                onClick={() => handleApplyCategory(catDef.id)}
                                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-50 border-teal-600 text-teal-950 font-bold shadow-2xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <p className="text-xs font-semibold truncate">
                                  {catDef.label}
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Hardware Specification Presets */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                          2. Hardware Model & Specification Presets
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {(
                            CATEGORY_DEFINITIONS.find((c) => c.id === selectedCategory) ||
                            CATEGORY_DEFINITIONS[0]
                          ).presets.map((preset) => {
                            const isSelected = selectedPresetSku === preset.sku;
                            return (
                              <div
                                key={preset.sku}
                                onClick={() => handleApplyPreset(preset)}
                                className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-teal-50/70 border-teal-600 ring-2 ring-teal-500/20 shadow-2xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono font-bold text-[11px] text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                                    {preset.sku}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{preset.defaultBin}</span>
                                </div>
                                <p className="text-xs font-bold text-slate-900 line-clamp-1 flex items-center gap-1.5">
                                  <span className="text-teal-600 font-bold">○</span>
                                  <span>{preset.name}</span>
                                </p>
                                <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                  {preset.description}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Product Attributes Form */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Product Name / Title
                          </label>
                          <input
                            type="text"
                            value={itemTitle}
                            onChange={(e) => setItemTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            SKU Code
                          </label>
                          <input
                            type="text"
                            value={sku}
                            onChange={(e) => setSku(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Storage Bin / Rack Location
                          </label>
                          <input
                            type="text"
                            value={storageBin}
                            onChange={(e) => setStorageBin(e.target.value)}
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                            <span>Quantity to Intake</span>
                            <span className="text-[10px] text-teal-700 font-semibold">({unit})</span>
                          </label>
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                                className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                title="Decrease quantity by 1"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                className="w-12 h-8 text-center font-mono font-bold text-xs text-slate-900 border-x border-slate-200 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setQuantity((prev) => prev + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                                title="Increase quantity by 1"
                              >
                                +
                              </button>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setQuantity((prev) => prev + 5)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                title="Add 5 units"
                              >
                                +5
                              </button>
                              <button
                                type="button"
                                onClick={() => setQuantity((prev) => prev + 10)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                                title="Add 10 units"
                              >
                                +10
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Confirmation Action Button */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500">
                          Will be received into <strong>[IN_STOCK]</strong> status and reflected immediately.
                        </p>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setInputCode('');
                              setScannedCode('');
                              setIsSearched(false);
                            }}
                            className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={handleConfirmSingleProductToStock}
                            className="px-5 py-2.5 bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Confirm & Add to Stock Inventory</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* MODE 2: CONTINUOUS HAND-HELD SCANNER INTAKE (BATCH)      */}
          {/* ======================================================== */}
          {activeHubMode === 'continuous_batch' && (
            <div className="space-y-5">
              <div className="p-4 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-teal-950 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-teal-700" />
                    Continuous Multi-Scan Intake
                  </p>
                  <p className="text-[11px] text-teal-800">
                    Set the target hardware model and rack bin, then pull the trigger on your hand-held scanner
                    repeatedly. Every barcode scanned is queued up and ready to confirm in one click.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-teal-800 uppercase block">Queue Count</span>
                  <span className="text-2xl font-black text-teal-950 font-mono">{scannedBatch.length}</span>
                </div>
              </div>

              {batchSuccessMessage && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-emerald-900 font-bold text-xs animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                  <span>{batchSuccessMessage}</span>
                </div>
              )}

              {/* Step 1: Select Preset for Batch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    1. Hardware Product Model
                  </label>
                  <select
                    value={batchPresetSku}
                    onChange={(e) => {
                      const selectedSku = e.target.value;
                      setBatchPresetSku(selectedSku);
                      const allPresets = CATEGORY_DEFINITIONS.flatMap((c) => c.presets);
                      const found = allPresets.find((p) => p.sku === selectedSku);
                      if (found) {
                        setBatchTitle(found.name);
                        setBatchSku(found.sku);
                        setBatchBrand(found.brand);
                        setBatchCategory(found.category);
                        setBatchStorageBin(found.defaultBin);
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    {CATEGORY_DEFINITIONS.flatMap((c) => c.presets).map((p) => (
                      <option key={p.sku} value={p.sku}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    2. Destination Storage Bin
                  </label>
                  <input
                    type="text"
                    value={batchStorageBin}
                    onChange={(e) => setBatchStorageBin(e.target.value)}
                    placeholder="e.g. Rack A-01, Shelf B-02"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              {/* Step 2: Active Handheld Scanner Target Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  3. Hand-held Scanner Trigger Target
                </label>
                <div className="relative">
                  <input
                    ref={batchScannerInputRef}
                    type="text"
                    data-scanner-field="true"
                    value={batchScanInput}
                    onChange={(e) => setBatchScanInput(e.target.value)}
                    onKeyDown={handleBatchScanKeyDown}
                    placeholder="Pull scanner trigger on barcode (or type serial and press Enter)..."
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-teal-500 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    autoFocus
                  />
                  <Barcode className="w-5 h-5 text-teal-600 absolute left-3 top-3.5" />
                  <span className="absolute right-3 top-3.5 text-[10px] font-mono text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                    Ready for Next Trigger
                  </span>
                </div>
              </div>

              {/* Scanned Batch Queue Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Scanned Queue ({scannedBatch.length} Products • {scannedBatch.reduce((sum, item) => sum + (item.quantity || 1), 0)} Total Pcs)
                  </span>
                  {scannedBatch.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setScannedBatch([])}
                      className="text-[11px] font-semibold text-red-600 hover:text-red-800 cursor-pointer"
                    >
                      Clear Queue
                    </button>
                  )}
                </div>

                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100 bg-white text-xs">
                  {scannedBatch.length > 0 ? (
                    scannedBatch.map((item, idx) => (
                      <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50">
                        <div className="flex items-center gap-3">
                          <span className="w-7 h-7 rounded-full bg-slate-100 font-mono text-[11px] font-bold text-slate-700 flex items-center justify-center">
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div>
                            <p className="font-mono font-bold text-slate-900">{item.serialNumber}</p>
                            <p className="text-[11px] text-slate-500">
                              {batchTitle} • Bin: {batchStorageBin}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5">
                          {/* Stepper with - 01 + feature */}
                          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() =>
                                setScannedBatch((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id
                                      ? { ...it, quantity: Math.max(1, (it.quantity || 1) - 1) }
                                      : it
                                  )
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                              title="Decrease quantity by 1"
                            >
                              -
                            </button>
                            <input
                              type="text"
                              inputMode="numeric"
                              value={String(item.quantity || 1).padStart(2, '0')}
                              onChange={(e) => {
                                const raw = e.target.value.replace(/\D/g, '');
                                const val = raw ? Math.max(1, parseInt(raw, 10)) : 1;
                                setScannedBatch((prev) =>
                                  prev.map((it) => (it.id === item.id ? { ...it, quantity: val } : it))
                                );
                              }}
                              className="w-10 h-7 text-center font-mono font-bold text-xs text-slate-900 border-x border-slate-200 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                setScannedBatch((prev) =>
                                  prev.map((it) =>
                                    it.id === item.id
                                      ? { ...it, quantity: (it.quantity || 1) + 1 }
                                      : it
                                  )
                                )
                              }
                              className="w-7 h-7 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                              title="Increase quantity by 1"
                            >
                              +
                            </button>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-500">pcs</span>

                          <span className="font-mono text-[10px] text-slate-400">{item.timestamp}</span>
                          <button
                            type="button"
                            onClick={() =>
                              setScannedBatch((prev) => prev.filter((it) => it.id !== item.id))
                            }
                            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                            title="Remove from batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      <Barcode className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                      <p className="font-semibold text-slate-600">No products scanned yet</p>
                      <p className="text-[11px]">
                        Scan box barcodes with your handheld scanner. They will automatically pile into this queue.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Batch Commit Footer */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  {scannedBatch.reduce((sum, item) => sum + (item.quantity || 1), 0)} total item(s) across {scannedBatch.length} product(s) will be committed into Stock Inventory.
                </p>

                <button
                  type="button"
                  disabled={scannedBatch.length === 0}
                  onClick={handleConfirmBatchToStock}
                  className={`px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
                    scannedBatch.length > 0
                      ? 'bg-teal-700 hover:bg-teal-800 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm & Add {scannedBatch.reduce((sum, item) => sum + (item.quantity || 1), 0)} Product(s) to Stock Inventory</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Outer Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-medium">
            Active Operator: <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.badgeId})
          </span>

          <button
            type="button"
            onClick={() => {
              handleStopCamera();
              onClose();
            }}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Close Scanner Hub
          </button>
        </div>
      </div>
    </div>
  );
};
