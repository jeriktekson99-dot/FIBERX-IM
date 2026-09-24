import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Maximize2, X, Copy, Check } from 'lucide-react';

interface BarcodeSvgProps {
  value: string;
  width?: number;
  height?: number;
  barWidth?: number; // Module line width (default 2.2 for easy scanner read)
  showText?: boolean;
  fontSize?: number;
  allowZoom?: boolean;
  className?: string;
}

export const BarcodeSvg: React.FC<BarcodeSvgProps> = ({
  value,
  width = 220,
  height = 54,
  barWidth = 2.2,
  showText = true,
  fontSize = 11,
  allowZoom = false,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomSvgRef = useRef<SVGSVGElement | null>(null);
  const [isEnlarged, setIsEnlarged] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width: barWidth,
          height: Math.max(35, height - (showText ? 16 : 0)),
          displayValue: showText,
          font: 'monospace',
          fontSize: fontSize,
          textMargin: 4,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('JsBarcode render error for:', value, err);
      }
    }
  }, [value, height, showText, barWidth, fontSize]);

  useEffect(() => {
    if (isEnlarged && zoomSvgRef.current && value) {
      try {
        JsBarcode(zoomSvgRef.current, value, {
          format: 'CODE128',
          width: 3.2,
          height: 100,
          displayValue: true,
          font: 'monospace',
          fontSize: 16,
          textMargin: 8,
          margin: 16,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch (err) {
        console.warn('JsBarcode zoom render error:', err);
      }
    }
  }, [isEnlarged, value]);

  const handleCopy = () => {
    if (value) {
      navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }
  };

  if (!value) {
    return (
      <div className={`flex items-center justify-center text-xs text-slate-400 italic ${className}`}>
        No Barcode
      </div>
    );
  }

  return (
    <>
      <div className={`relative group flex flex-col items-center justify-center select-none bg-white rounded p-1 border border-slate-100 shadow-2xs ${className}`}>
        <svg
          ref={svgRef}
          className="max-w-full h-auto"
          style={{ maxWidth: `${width}px` }}
        />

        {allowZoom && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsEnlarged(true);
            }}
            title="Enlarge barcode for physical scanner"
            className="absolute top-1 right-1 p-1 bg-slate-900/80 hover:bg-slate-900 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow"
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Fullscreen / Enlarged Scanner Card Modal */}
      {isEnlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsEnlarged(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 flex flex-col items-center gap-5 text-center relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsEnlarged(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <span className="px-2.5 py-1 bg-teal-50 text-teal-700 text-xs font-bold rounded-full uppercase tracking-wider border border-teal-200">
                High-Visibility Scanner Display
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-2">
                Scan with Handheld Scanner
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                Optimized with thick high-contrast bars and extended quiet zones for 1D/2D optical reading off screens.
              </p>
            </div>

            {/* Huge Barcode Frame with High Contrast White Surround */}
            <div className="w-full bg-white p-4 sm:p-6 rounded-xl border-2 border-slate-900 shadow-inner flex items-center justify-center overflow-x-auto">
              <svg ref={zoomSvgRef} className="max-w-full h-auto" />
            </div>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={handleCopy}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                {copied ? 'Copied Serial!' : 'Copy Code'}
              </button>

              <button
                type="button"
                onClick={() => setIsEnlarged(false)}
                className="flex-1 py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl font-semibold text-xs transition-colors cursor-pointer shadow-sm"
              >
                Done / Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};


