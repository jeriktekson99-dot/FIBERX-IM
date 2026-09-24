import { useEffect, useRef, useState, useCallback } from 'react';

export interface ScanDiagnosticEvent {
  rawString: string;
  characterSpeedMs: number;
  endingKey: string;
  endingKeyCode: string;
  strokeCount: number;
  minIntervalMs: number;
  maxIntervalMs: number;
  timestamp: number;
  isDebouncedFallback: boolean;
}

interface UseHardwareBarcodeScannerOptions {
  onScan: (barcode: string, diagnostics?: ScanDiagnosticEvent) => void;
  minChars?: number;
  maxIntervalMs?: number; // threshold between keystrokes for hardware scanner (burst is 10-40ms)
  debounceDelayMs?: number; // fallback debounce if scanner sends no Enter suffix (200ms)
  disabled?: boolean;
}

export function useHardwareBarcodeScanner({
  onScan,
  minChars = 4,
  maxIntervalMs = 65,
  debounceDelayMs = 220,
  disabled = false,
}: UseHardwareBarcodeScannerOptions) {
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [isScannerListening, setIsScannerListening] = useState<boolean>(true);
  const [scanPulse, setScanPulse] = useState<boolean>(false);
  const [lastDiagnostic, setLastDiagnostic] = useState<ScanDiagnosticEvent | null>(null);

  const bufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);
  const keyTimestampsRef = useRef<number[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Soft audio confirmation beep using Web Audio API
  const playBeep = useCallback((frequency = 1200, duration = 0.12) => {
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioCtx = new AudioCtx();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + duration);
    } catch {
      // Audio context might be restricted before user gesture
    }
  }, []);

  const triggerScan = useCallback(
    (code: string, customDiagnostics?: Partial<ScanDiagnosticEvent>) => {
      const trimmed = code.trim().toUpperCase();
      if (!trimmed || trimmed.length < minChars) return;

      // Calculate speed diagnostics
      const timestamps = keyTimestampsRef.current;
      let avgSpeed = 0;
      let minInterval = 0;
      let maxInterval = 0;

      if (timestamps.length > 1) {
        const intervals: number[] = [];
        for (let i = 1; i < timestamps.length; i++) {
          intervals.push(timestamps[i] - timestamps[i - 1]);
        }
        minInterval = Math.min(...intervals);
        maxInterval = Math.max(...intervals);
        const sum = intervals.reduce((a, b) => a + b, 0);
        avgSpeed = Math.round((sum / intervals.length) * 10) / 10;
      }

      const diagnostics: ScanDiagnosticEvent = {
        rawString: trimmed,
        characterSpeedMs: customDiagnostics?.characterSpeedMs ?? (avgSpeed || 15),
        endingKey: customDiagnostics?.endingKey ?? 'Enter (CR / LF)',
        endingKeyCode: customDiagnostics?.endingKeyCode ?? 'Key: Enter (Code: 13)',
        strokeCount: timestamps.length || trimmed.length,
        minIntervalMs: minInterval,
        maxIntervalMs: maxInterval,
        timestamp: Date.now(),
        isDebouncedFallback: customDiagnostics?.isDebouncedFallback ?? false,
      };

      setLastScanned(trimmed);
      setLastDiagnostic(diagnostics);
      setScanPulse(true);
      setTimeout(() => setScanPulse(false), 1200);

      playBeep(1250, 0.1);
      onScan(trimmed, diagnostics);
    },
    [minChars, onScan, playBeep]
  );

  useEffect(() => {
    if (disabled) {
      setIsScannerListening(false);
      bufferRef.current = '';
      keyTimestampsRef.current = [];
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }
    setIsScannerListening(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      const activeElement = document.activeElement as HTMLElement | null;
      const target = (e.target || activeElement) as HTMLElement | null;

      // CRITICAL FIX: Detect if the user is focused on or typing inside ANY input, textarea,
      // select, or editable element across the entire application (e.g. Add User modal,
      // search fields, edit profile, login form, filter inputs, notes, etc.).
      const isInput =
        (target &&
          (target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.tagName === 'SELECT' ||
            target.isContentEditable ||
            Boolean(target.closest('input, textarea, select, [contenteditable="true"]')))) ||
        (activeElement &&
          (activeElement.tagName === 'INPUT' ||
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.tagName === 'SELECT' ||
            activeElement.isContentEditable ||
            Boolean(activeElement.closest('input, textarea, select, [contenteditable="true"]'))));

      // If active focus is in ANY text input or form field:
      // The global barcode listener MUST completely ignore the event and reset buffers.
      // Under no circumstances should user typing in a form trigger a barcode scan or modal!
      if (isInput) {
        bufferRef.current = '';
        keyTimestampsRef.current = [];
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        return;
      }

      const timeSinceLastKey = lastKeyTimeRef.current > 0 ? now - lastKeyTimeRef.current : 0;
      lastKeyTimeRef.current = now;

      // Clear any pending debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      // Check if Enter key was hit -> standard Hardware Scanner Ending Suffix
      if (e.key === 'Enter') {
        if (bufferRef.current.length >= minChars) {
          const timestamps = keyTimestampsRef.current;
          let avgSpeed = 0;
          if (timestamps.length > 1) {
            const intervals: number[] = [];
            for (let i = 1; i < timestamps.length; i++) {
              intervals.push(timestamps[i] - timestamps[i - 1]);
            }
            const sum = intervals.reduce((a, b) => a + b, 0);
            avgSpeed = sum / intervals.length;
          }

          // A real hardware barcode scanner sends burst strokes (average interval under 75ms)
          if (avgSpeed <= 75 || timestamps.length <= 1) {
            e.preventDefault();
            e.stopPropagation();
            const scannedCode = bufferRef.current;
            bufferRef.current = '';
            const endingCode = `Key: Enter (Code: ${e.keyCode || 13} / CR)`;

            triggerScan(scannedCode, {
              endingKey: 'Enter (CR / LF Suffix)',
              endingKeyCode: endingCode,
              isDebouncedFallback: false,
              characterSpeedMs: Math.round(avgSpeed || 15),
            });
            keyTimestampsRef.current = [];
            return;
          }
        }
        bufferRef.current = '';
        keyTimestampsRef.current = [];
        return;
      }

      // Printable single characters (typical barcode scanner keystroke sequence)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // If time between keystrokes is too slow for a hardware scanner burst, reset buffer
        if (timeSinceLastKey > maxIntervalMs && bufferRef.current.length > 0) {
          bufferRef.current = '';
          keyTimestampsRef.current = [];
        }

        // Capture keystroke into buffer
        bufferRef.current += e.key;
        keyTimestampsRef.current.push(now);

        // Hardware scanner debounce fallback (for scanners configured without Enter suffix)
        debounceTimerRef.current = setTimeout(() => {
          if (bufferRef.current.length >= minChars) {
            const timestamps = keyTimestampsRef.current;
            let avgSpeed = 999;
            if (timestamps.length > 1) {
              const intervals: number[] = [];
              for (let i = 1; i < timestamps.length; i++) {
                intervals.push(timestamps[i] - timestamps[i - 1]);
              }
              const sum = intervals.reduce((a, b) => a + b, 0);
              avgSpeed = sum / intervals.length;
            }

            // Only trigger if typing speed was an actual scanner burst (< 70ms per char)
            if (avgSpeed <= 70) {
              const scannedCode = bufferRef.current;
              bufferRef.current = '';
              triggerScan(scannedCode, {
                endingKey: 'None (Debounce Timeout)',
                endingKeyCode: 'Auto-Triggered (Fast Scanner Burst)',
                isDebouncedFallback: true,
                characterSpeedMs: Math.round(avgSpeed),
              });
            } else {
              bufferRef.current = '';
            }
            keyTimestampsRef.current = [];
          } else {
            bufferRef.current = '';
            keyTimestampsRef.current = [];
          }
        }, debounceDelayMs);
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [debounceDelayMs, disabled, maxIntervalMs, minChars, triggerScan]);

  return {
    isScannerListening,
    lastScanned,
    lastDiagnostic,
    scanPulse,
    triggerScan,
  };
}
