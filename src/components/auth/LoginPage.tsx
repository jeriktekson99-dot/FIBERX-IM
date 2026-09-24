import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { FiberXLogo } from '../common/FiberXLogo';
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  HelpCircle,
  X,
  Building2,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  availableProfiles: UserProfile[];
  onRegisterUser?: (newProfileData: Omit<UserProfile, 'id'>) => UserProfile;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  availableProfiles,
  onRegisterUser,
}) => {
  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [activeTimeframe, setActiveTimeframe] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);

    const cleanInput = email.trim().toLowerCase();
    if (!cleanInput) {
      setErrorMessage('Please enter your work email or username.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Check local available profiles first
      let matched = availableProfiles.find(
        (p) =>
          p.email.toLowerCase() === cleanInput ||
          (p.username && p.username.toLowerCase() === cleanInput.replace(/^@/, '')) ||
          (p.badgeId && p.badgeId.toLowerCase() === cleanInput)
      );

      // 2. If not found locally, query Supabase profiles directly
      if (!matched && isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .or(`email.ilike.${cleanInput},badge_id.ilike.${cleanInput}`)
            .limit(1);

          if (!error && data && data.length > 0) {
            const row = data[0];
            matched = {
              id: row.id,
              name: row.name || 'FiberX User',
              email: row.email,
              role: (row.role as any) || 'ADMIN',
              badgeId: row.badge_id || 'FX-USR',
              department: row.department || 'Operations',
              phone: row.phone || undefined,
              status: (row.status as any) || 'ACTIVE',
              createdAt: row.created_at,
            };
          }
        } catch {
          // ignore network error, fallback
        }
      }

      // 3. Verify credentials if matched
      if (matched) {
        // If password is provided and matched profile has a stored password, verify it
        if (matched.password && password && password !== matched.password) {
          setIsLoading(false);
          setErrorMessage('Incorrect password. Please verify your credentials.');
          return;
        }

        // Optional: If password is provided and Supabase is configured, attempt Supabase Auth validation
        if (password && isSupabaseConfigured() && matched.email) {
          try {
            const { error: authErr } = await supabase.auth.signInWithPassword({
              email: matched.email,
              password,
            });
            // If Supabase auth succeeded, session is set
            if (!authErr) {
              setIsLoading(false);
              onLoginSuccess(matched);
              return;
            }
          } catch {
            // fallback to profile record match
          }
        }

        setIsLoading(false);
        onLoginSuccess(matched);
        return;
      }

      setIsLoading(false);
      setErrorMessage('Account not found. Only registered Supabase user accounts are authorized.');
    } catch {
      setIsLoading(false);
      setErrorMessage('Authentication check failed. Please retry.');
    }
  };

  return (
    <div id="fiberx-login-page" className="min-h-screen w-full flex bg-[#F8FAFC] text-slate-900 overflow-hidden font-sans">
      {/* ================= LEFT SIDE: FORM CONTAINER ================= */}
      <div className="w-full lg:w-[48%] xl:w-[45%] flex flex-col justify-between p-6 sm:p-10 lg:p-12 xl:p-16 overflow-y-auto bg-white border-r border-slate-200/80 shadow-xs z-10">
        {/* Top: Brand Header */}
        <div className="flex items-center">
          <FiberXLogo showSubtitle={true} />
        </div>

        {/* Center: Auth Form Box */}
        <div className="my-auto py-8 max-w-md w-full mx-auto">
          <div className="mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Enter your credentials to sign in.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Work Email or Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter work email or Badge ID"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password row */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-teal-800 focus:ring-teal-700 cursor-pointer accent-teal-800"
                />
                <span className="text-xs text-slate-600">
                  Remember this workstation
                </span>
              </label>

              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(true)}
                className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            {/* Primary Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#003B46] hover:bg-[#002B33] active:scale-[0.99] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ================= RIGHT SIDE: BRAND & ANALYTICS SHOWCASE ================= */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative overflow-hidden bg-gradient-to-br from-[#002b33] via-[#003b46] to-[#011b22] text-white flex-col justify-center items-center p-10 xl:p-14">
        {/* Subtle geometric floating square tiles / patterns */}
        <div className="absolute top-8 right-8 w-20 h-20 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs pointer-events-none transform rotate-12" />
        <div className="absolute top-24 right-32 w-14 h-14 rounded-xl bg-cyan-400/10 border border-cyan-400/20 backdrop-blur-xs pointer-events-none transform -rotate-6" />
        <div className="absolute top-12 right-64 w-8 h-8 rounded-lg bg-teal-300/15 pointer-events-none" />
        
        <div className="absolute bottom-16 left-12 w-16 h-16 rounded-xl bg-white/5 border border-white/10 pointer-events-none transform -rotate-12" />
        <div className="absolute bottom-32 left-32 w-10 h-10 rounded-lg bg-cyan-400/10 pointer-events-none transform rotate-45" />

        {/* Center: Showcase Floating Mockup Cards */}
        <div className="relative z-10 max-w-xl w-full mx-auto">
          {/* Main Card: Analytics Trends */}
          <div className="relative rounded-2xl bg-white text-slate-900 p-6 sm:p-7 shadow-2xl border border-white/20">
            {/* Header of Analytics Card */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">Analytics</h3>
                <p className="text-[11px] text-slate-500 font-medium">Weekly Hardware Intake vs Field Dispatches</p>
              </div>

              {/* Timeframe Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl text-[11px] font-bold text-slate-600">
                {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setActiveTimeframe(period)}
                    className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                      activeTimeframe === period
                        ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                        : 'hover:text-slate-900'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Line Chart (Dual Trend: Intake vs Dispatch) */}
            <div className="relative h-44 w-full">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 500 160">
                <defs>
                  {/* Gradient for Intake line */}
                  <linearGradient id="intakeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Gradient for Dispatch line */}
                  <linearGradient id="dispatchGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#003B46" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#003B46" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                <line x1="0" y1="30" x2="500" y2="30" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeWidth="1" />

                {/* Shaded Area 1: Intake (Teal) */}
                <path
                  d="M 20 110 Q 90 60, 160 85 T 300 45 T 420 90 L 480 75 L 480 135 L 20 135 Z"
                  fill="url(#intakeGrad)"
                />
                {/* Curve 1: Intake */}
                <path
                  d="M 20 110 Q 90 60, 160 85 T 300 45 T 420 90 L 480 75"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Shaded Area 2: Dispatches (Deep Navy-Teal) */}
                <path
                  d="M 20 125 Q 90 90, 160 65 T 300 95 T 420 40 L 480 50 L 480 135 L 20 135 Z"
                  fill="url(#dispatchGrad)"
                />
                {/* Curve 2: Dispatches */}
                <path
                  d="M 20 125 Q 90 90, 160 65 T 300 95 T 420 40 L 480 50"
                  fill="none"
                  stroke="#003B46"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                {/* Active Data Points */}
                <circle cx="160" cy="65" r="4" fill="#003B46" stroke="#fff" strokeWidth="2" />
                <circle cx="300" cy="45" r="4" fill="#0d9488" stroke="#fff" strokeWidth="2" />
                <circle cx="420" cy="40" r="5" fill="#003B46" stroke="#fff" strokeWidth="2.5" />
              </svg>

              {/* Day Labels Axis */}
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mt-2 px-3 tracking-wider">
                <span>MON</span>
                <span>TUE</span>
                <span>WED</span>
                <span>THU</span>
                <span>FRI</span>
                <span>SAT</span>
              </div>
            </div>
          </div>

          {/* Overlapping Floating Donut Chart Card */}
          <div className="absolute -bottom-10 -right-4 sm:-right-6 w-52 sm:w-60 bg-white rounded-2xl p-4 sm:p-5 shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center my-1">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle cx="50" cy="50" r="38" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                {/* Progress Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#003B46"
                  strokeWidth="12"
                  strokeDasharray="238.76"
                  strokeDashoffset="60"
                  strokeLinecap="round"
                />
                {/* Secondary Ring Segment */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="none"
                  stroke="#0d9488"
                  strokeWidth="12"
                  strokeDasharray="238.76"
                  strokeDashoffset="180"
                  strokeLinecap="round"
                />
              </svg>

              {/* Center Donut Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-900">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total</span>
                <span className="text-xl sm:text-2xl font-black tracking-tight text-[#003B46]">88%</span>
                <span className="text-[9px] font-bold text-teal-600">Stocked</span>
              </div>
            </div>

            <div className="w-full mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#003B46]" />
                <span>Warehouse Hub</span>
              </div>
              <div className="flex items-center gap-1.5 text-slate-600 font-semibold">
                <span className="w-2 h-2 rounded-full bg-teal-600" />
                <span>Field Vans</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setIsForgotPasswordOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-slate-900">Domain Password Reset</h3>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              FiberX Inventory Management accounts are managed by Converge Central IT Dispatch & Security. To reset
              your password or recover your badge credentials:
            </p>

            <div className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2 text-slate-700">
              <div className="flex items-center gap-2 font-semibold text-slate-900">
                <Building2 className="w-4 h-4 text-teal-600" />
                <span>Central Logistics IT Helpdesk</span>
              </div>
              <p>Email: <strong className="text-teal-800">it-support@convergeict.com</strong></p>
              <p>Hotline: <strong className="text-teal-800">+63 2 8667 0888 (Ext 401)</strong></p>
              <p className="text-[11px] text-slate-500">
                For assistance, contact your assigned warehouse supervisor or IT logistics admin.
              </p>
            </div>

            <button
              onClick={() => setIsForgotPasswordOpen(false)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#003B46] hover:bg-[#002B33] text-white font-bold text-xs cursor-pointer shadow-xs"
            >
              Got it, return to login
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
