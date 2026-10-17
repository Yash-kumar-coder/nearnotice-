import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormErrorProps {
  id?: string;
  message?: string | null;
  className?: string;
}

export function FormError({ id, message, className = '' }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      id={id}
      role="alert"
      aria-live="polite"
      className={`flex items-start gap-1.5 text-xs text-red-600 font-medium mt-1.5 ${className}`}
    >
      <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
