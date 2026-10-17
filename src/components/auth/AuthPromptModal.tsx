import React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, X } from 'lucide-react';
import { Button } from '../common/Button';

export interface AuthPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  nextPath?: string;
}

export function AuthPromptModal({
  isOpen,
  onClose,
  reason = 'connect with this neighbor',
  nextPath = '/',
}: AuthPromptModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center relative animate-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 p-1.5 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer transition-colors"
        >
          <X size={18} />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3 border border-blue-100 shadow-2xs">
          <LogIn size={22} />
        </div>

        <h3 id="auth-modal-title" className="font-extrabold text-gray-900 text-lg mb-1 tracking-tight">
          Sign In to Connect
        </h3>
        <p className="text-xs text-gray-500 mb-6 leading-relaxed px-2">
          Please log in or create an account to {reason}.
        </p>

        <div className="space-y-2.5">
          <Link to={`/auth?next=${encodeURIComponent(nextPath)}`} className="block">
            <Button
              fullWidth
              size="lg"
              variant="primary"
              className="rounded-xl font-bold bg-blue-600 hover:bg-blue-700 shadow-sm cursor-pointer py-3"
            >
              Sign In / Sign Up
            </Button>
          </Link>

          <Button
            fullWidth
            size="md"
            variant="outline"
            onClick={onClose}
            className="rounded-xl font-medium text-gray-600 hover:text-gray-800 border-gray-200 cursor-pointer"
          >
            Browse as Guest
          </Button>
        </div>
      </div>
    </div>
  );
}
