import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6 text-slate-100">
          <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl p-8 text-center space-y-6">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-white">
                {this.props.fallbackTitle || 'Portal View Temporarily Unavailable'}
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                An unexpected state issue occurred while rendering this interface. Your inventory data is safe in storage.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-red-300 break-words max-h-32 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry Portal</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem('fiberx_current_user_id');
                  } catch {
                    // ignore
                  }
                  window.location.reload();
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Reset to Admin</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
