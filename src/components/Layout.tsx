import React from 'react';
import { BottomNav } from './BottomNav';

export interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-md mx-auto min-h-screen bg-white shadow-2xs relative">
        <main>{children}</main>
        <BottomNav />
      </div>
    </div>
  );
}
