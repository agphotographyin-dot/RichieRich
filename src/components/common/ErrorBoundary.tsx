import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-800">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Application Restored</h2>
              <p className="text-xs text-slate-500 mt-1">
                The application encountered an unexpected state and preserved your saved data.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-lg text-left text-[11px] font-mono text-slate-600 border border-slate-200 overflow-x-auto max-h-32">
                {this.state.error.message || 'Unknown runtime error'}
              </div>
            )}
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4" /> Reload App
              </button>
              <button
                onClick={this.handleReset}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Home className="w-4 h-4" /> Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
