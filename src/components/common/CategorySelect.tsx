import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useActiveCategories, DEFAULT_CATEGORIES } from '../../hooks/useActiveCategories';

export const CATEGORIES = DEFAULT_CATEGORIES;

// Backward-compatible alias if needed
export const CATEGORY_CONFIG = CATEGORIES.map((name) => ({ name }));

interface CategorySelectProps {
  value: string;
  onChange: (category: string) => void;
  label?: string;
  required?: boolean;
  className?: string;
  categories?: string[];
}

export function CategorySelect({
  value,
  onChange,
  label = 'Select category',
  required = false,
  className = '',
  categories: customCategories,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { categories: dynamicCategories } = useActiveCategories();

  const availableCategories =
    customCategories && customCategories.length > 0
      ? customCategories
      : dynamicCategories.length > 0
      ? dynamicCategories
      : CATEGORIES;

  const selectedCategory = value || availableCategories[0] || 'General';

  // Handle clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent | TouchEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-sm font-semibold text-gray-800">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Main Dropdown Trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={`w-full bg-white rounded-2xl py-3.5 px-4 flex items-center justify-between border transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md ${
            isOpen
              ? 'border-blue-600 ring-4 ring-blue-500/15 shadow-md'
              : 'border-gray-200/90 hover:border-blue-400'
          }`}
        >
          <div className="text-left min-w-0">
            <span className="text-sm font-semibold text-gray-900 tracking-tight">
              {selectedCategory}
            </span>
          </div>

          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center text-gray-500 transition-all duration-300 shrink-0 ${
              isOpen ? 'rotate-180 bg-blue-50 text-blue-600' : 'hover:bg-gray-100'
            }`}
          >
            <ChevronDown size={18} />
          </div>
        </button>

        {/* Animated Dropdown Menu with individual box-shadow for every category */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl border border-gray-100 shadow-2xl p-2.5 space-y-2 max-h-[340px] overflow-y-auto transition-all duration-200 ease-out origin-top"
          >
            {availableCategories.map((catName) => {
              const isSelected = catName === selectedCategory;

              return (
                <button
                  key={catName}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(catName);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left py-3 px-4 rounded-xl flex items-center justify-between transition-all duration-200 cursor-pointer ${
                    isSelected
                      ? 'bg-blue-50/80 border-2 border-blue-600 shadow-md ring-2 ring-blue-500/10'
                      : 'bg-white border border-gray-200/80 shadow-xs hover:shadow-md hover:border-blue-300 hover:bg-gray-50/70 hover:-translate-y-0.5 active:scale-[0.99]'
                  }`}
                >
                  <span
                    className={`text-sm font-semibold transition-colors duration-150 ${
                      isSelected ? 'text-blue-700' : 'text-gray-800'
                    }`}
                  >
                    {catName}
                  </span>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Check size={13} strokeWidth={2.5} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Select Chips with smooth transitions and box-shadow */}
      <div className="pt-1">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
          {availableCategories.map((catName) => {
            const isSelected = catName === selectedCategory;

            return (
              <button
                key={`chip-${catName}`}
                type="button"
                onClick={() => onChange(catName)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-2 ring-blue-500/20 scale-[1.02]'
                    : 'bg-white text-gray-700 border border-gray-200/90 shadow-2xs hover:shadow-sm hover:border-gray-300 hover:text-gray-900 hover:-translate-y-0.5 active:scale-95'
                }`}
              >
                {catName}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
