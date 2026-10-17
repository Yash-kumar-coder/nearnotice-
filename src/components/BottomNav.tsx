import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, PlusCircle, Bookmark, User } from 'lucide-react';

export function BottomNav() {
  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/notices/new', label: 'Create', icon: PlusCircle },
    { path: '/saved', label: 'Saved', icon: Bookmark },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-gray-200/80 pb-safe pt-1.5 px-6 z-30"
    >
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-3 min-w-[60px] min-h-[48px] rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-primary font-bold'
                    : 'text-gray-500 hover:text-gray-900 font-medium'
                }`
              }
            >
              <Icon className="w-5 h-5 mb-1" aria-hidden="true" />
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
