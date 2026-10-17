import React from 'react';
import { Check } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '../../features/auth/passwordPolicy';

interface PasswordRequirementsProps {
  password?: string;
  className?: string;
}

interface RequirementItem {
  id: string;
  label: string;
  met: boolean;
}

export function PasswordRequirements({ password = '', className = '' }: PasswordRequirementsProps) {
  const requirements: RequirementItem[] = [
    {
      id: 'length',
      label: `Min ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    {
      id: 'upper',
      label: 'Uppercase (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      id: 'lower',
      label: 'Lowercase (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      id: 'number',
      label: 'Number (0-9)',
      met: /[0-9]/.test(password),
    },
    {
      id: 'symbol',
      label: 'Symbol (!@#$...)',
      met: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/.test(password),
    },
  ];

  return (
    <div className={`space-y-1.5 pt-1.5 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          Password requirements:
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {requirements.map((req) => (
          <div
            key={req.id}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
              req.met
                ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200'
                : 'bg-gray-50/70 text-gray-500 border-gray-200/70'
            }`}
          >
            {req.met ? (
              <Check size={12} className="text-emerald-600 shrink-0 stroke-[2.5]" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
            )}
            <span className="truncate">{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
