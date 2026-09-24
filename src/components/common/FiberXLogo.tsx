import React from 'react';

interface FiberXLogoProps {
  className?: string;
  showSubtitle?: boolean;
}

export const FiberXLogo: React.FC<FiberXLogoProps> = ({
  className = '',
  showSubtitle = true,
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Brand Icon: Fiber optic pulse loops in vibrant FiberX Teal / Cyan */}
      <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-teal-600 via-cyan-600 to-teal-800 flex items-center justify-center shadow-sm text-white shrink-0 border border-teal-500/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5"
        >
          {/* Fiber optical wave path */}
          <path d="M4 12c0-4.4 3.6-8 8-8s8 3.6 8 8-3.6 8-8 8" />
          <path d="M12 8a4 4 0 1 0 4 4" />
          <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        </svg>
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping opacity-75" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-cyan-300 rounded-full border-2 border-white" />
      </div>

      <div className="flex flex-col leading-tight">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold tracking-tight text-slate-900 text-lg">
            FIBER<span className="text-teal-600 font-black">X</span>
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-teal-50 text-teal-700 border border-teal-200 rounded tracking-wider uppercase">
            IMS
          </span>
        </div>
        {showSubtitle && (
          <span className="text-[11px] font-medium text-slate-500 tracking-tight">
            Warehouse Web Operations
          </span>
        )}
      </div>
    </div>
  );
};
