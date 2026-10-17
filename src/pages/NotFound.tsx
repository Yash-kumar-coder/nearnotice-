import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home } from 'lucide-react';
import { Button } from '../components/common/Button';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center px-4 py-12 text-center">
      <div className="w-16 h-16 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-blue-100 shadow-xs">
        <Compass size={32} />
      </div>

      <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
        Page Not Found
      </h1>

      <p className="text-sm text-gray-600 max-w-sm mb-6 leading-relaxed">
        The notice or page you are looking for doesn't exist or may have been moved.
      </p>

      <Link to="/">
        <Button variant="primary" size="md" className="gap-2">
          <Home size={16} /> Return to Home Noticeboard
        </Button>
      </Link>
    </div>
  );
}
