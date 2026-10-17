import React, { useId } from 'react';
import { FormError } from './FormError';

export interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | null;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(
  (
    {
      label,
      error,
      hint,
      id: customId,
      className = '',
      leftIcon,
      rightElement,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = customId || generatedId;
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;

    const describedBy = [
      error ? errorId : null,
      hint ? hintId : null,
    ]
      .filter(Boolean)
      .join(' ') || undefined;

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className="block text-sm font-semibold text-gray-800 mb-1.5"
        >
          {label}
        </label>

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none flex items-center">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={describedBy}
            className={`w-full min-h-[48px] rounded-xl border bg-white hover:border-gray-300 focus:bg-white px-4 py-3 text-sm font-medium text-gray-900 placeholder:text-gray-400 transition-all focus:outline-none focus:ring-2 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-11' : ''
            } ${rightElement ? 'pr-12' : ''} ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/10'
                : 'border-gray-200 focus:border-blue-600 focus:ring-blue-600/15'
            } ${className}`}
            {...props}
          />

          {rightElement && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
              {rightElement}
            </div>
          )}
        </div>

        {hint && !error && (
          <p id={hintId} className="text-xs text-gray-500 mt-1.5">
            {hint}
          </p>
        )}

        <FormError id={errorId} message={error} />
      </div>
    );
  }
);

TextField.displayName = 'TextField';
