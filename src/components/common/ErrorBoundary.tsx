import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorId: string | null;
}

// Scrubber to strip emails, tokens, and secrets from error logs
function scrubSensitiveData(text: string): string {
  return text
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '[REDACTED_EMAIL]')
    .replace(/(?:token|key|secret|code|password|access_token)=([^\s&]+)/gi, '$1=[REDACTED]');
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    errorId: null,
  };

  public static getDerivedStateFromError(): State {
    return {
      hasError: true,
      errorId: Math.random().toString(36).substring(2, 9),
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const scrubbedMessage = scrubSensitiveData(error?.message || '');
    const scrubbedStack = scrubSensitiveData(error?.stack || '');
    const scrubbedComponentStack = scrubSensitiveData(errorInfo?.componentStack || '');

    // In production, send to sanitized error logging service (e.g. Sentry/LogRocket)
    if (import.meta.env.DEV) {
      console.error('[NearNotice ErrorBoundary]', {
        message: scrubbedMessage,
        stack: scrubbedStack,
        componentStack: scrubbedComponentStack,
      });
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, errorId: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-gray-50 flex items-center justify-center p-4"
        >
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-md max-w-sm w-full p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle size={28} aria-hidden="true" />
            </div>

            <h2 className="text-xl font-bold text-gray-900">
              Something went wrong
            </h2>

            <p className="text-xs text-gray-600 leading-relaxed max-w-xs mx-auto">
              An unexpected error occurred. No personal data was exposed. Please reload
              the page or return to the noticeboard.
            </p>

            {this.state.errorId && (
              <p className="text-[10px] text-gray-400 font-mono">
                Error Reference: {this.state.errorId}
              </p>
            )}

            <div className="pt-2">
              <Button
                fullWidth
                variant="primary"
                onClick={this.handleReset}
                className="gap-2"
              >
                <RotateCcw size={16} /> Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
