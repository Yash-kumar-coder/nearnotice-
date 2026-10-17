import React from 'react';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({
  variant = 'info',
  title,
  children,
  className = '',
}: AlertProps) {
  const styles = {
    info: 'bg-blue-50/80 border-blue-200 text-blue-900',
    success: 'bg-emerald-50/80 border-emerald-200 text-emerald-900',
    warning: 'bg-amber-50/80 border-amber-200 text-amber-900',
    error: 'bg-red-50/80 border-red-200 text-red-900',
  }[variant];

  const icons = {
    info: <Info className="w-5 h-5 text-blue-600 shrink-0" aria-hidden="true" />,
    success: (
      <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" aria-hidden="true" />
    ),
    warning: (
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" aria-hidden="true" />
    ),
    error: (
      <AlertCircle className="w-5 h-5 text-red-600 shrink-0" aria-hidden="true" />
    ),
  }[variant];

  const role = variant === 'error' ? 'alert' : 'status';

  return (
    <div
      role={role}
      aria-live="polite"
      className={`flex items-start gap-3 p-4 rounded-xl border text-sm ${styles} ${className}`}
    >
      <div className="mt-0.5">{icons}</div>
      <div className="flex-1">
        {title && <h4 className="font-semibold text-sm mb-1">{title}</h4>}
        <div className="text-xs sm:text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
