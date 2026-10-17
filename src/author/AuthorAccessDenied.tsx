import { ShieldAlert, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface AuthorAccessDeniedProps {
  onSignOut: () => void;
}

export default function AuthorAccessDenied({ onSignOut }: AuthorAccessDeniedProps) {
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    onSignOut();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 py-12 font-sans">
      <div className="max-w-md w-full bg-white border border-gray-200 rounded-xl shadow-xs p-8 text-center">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
        <p className="text-xs text-gray-600 mb-6 leading-relaxed">
          Your authenticated account is not registered in <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-800">admin_roles</code>. Only authorized operations personnel can enter this console.
        </p>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Session</span>
          </button>
          <a
            href="/"
            className="block text-xs text-gray-500 hover:text-gray-800 transition-colors"
          >
            Return to Public Noticeboard
          </a>
        </div>
      </div>
    </div>
  );
}
