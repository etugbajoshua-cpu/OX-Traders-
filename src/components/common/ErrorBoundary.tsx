import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Logo } from './Logo.tsx';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  isQuotaError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    message: '',
    isQuotaError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    let parsedMessage = error.message || 'An unexpected application error occurred.';
    let isQuotaError = parsedMessage.toLowerCase().includes('quota exceeded');

    try {
      const json = JSON.parse(error.message);
      if (json && typeof json.error === 'string') {
        isQuotaError = json.error.toLowerCase().includes('quota exceeded');
        if (isQuotaError) {
          parsedMessage = 'Cloud database daily quota reached. Quota resets automatically at midnight UTC.';
        } else if (json.error.toLowerCase().includes('permission')) {
          parsedMessage = `Security check declined access on ${json.path || 'requested resource'}. Please ensure you are signed in with the authorized account.`;
        } else {
          parsedMessage = json.error;
        }
      }
    } catch {
      // keep original message
    }

    return {
      hasError: true,
      message: parsedMessage,
      isQuotaError,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught ErrorBoundary exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '', isQuotaError: false });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0B0E11] text-[#EAECEF] flex flex-col items-center justify-center p-6">
          <div className="mb-6">
            <Logo variant="default" size="md" />
          </div>
          <div className="w-full max-w-md bg-[#181A20] border border-[#2B313A] rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-[#F6465D]/15 text-[#F6465D] flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight">
              {this.state.isQuotaError ? 'Database Quota Limit Reached' : 'Session Recovery Required'}
            </h2>
            <p className="text-xs text-[#848E9C] leading-relaxed">
              {this.state.message}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="flex-1 py-3 rounded-xl bg-[#F0B90B] hover:bg-[#FCD535] text-[#0B0E11] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 py-3 rounded-xl bg-[#1E2329] hover:bg-[#2B313A] border border-[#2B313A] text-white font-semibold text-xs cursor-pointer"
              >
                Return Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
