import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export interface AuthLayoutProps {
  heading: string;
  subheading?: string;
  children: React.ReactNode;
  showBackToFeed?: boolean;
}

export function AuthLayout({
  heading,
  subheading,
  children,
  showBackToFeed = true,
}: AuthLayoutProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    // WCAG 2.2: Focus moves to page heading on route navigation
    headingRef.current?.focus();
  }, [heading]);

  return (
    <div className="w-full min-h-screen bg-white flex flex-col justify-between selection:bg-blue-100">
      <div className="w-full max-w-md mx-auto min-h-screen flex flex-col justify-between px-5 sm:px-8 py-5">
        <div>
          {/* Top Header Bar */}
          <div className="flex items-center justify-between mb-4">
            {showBackToFeed ? (
              <Link
                to="/"
                className="inline-flex items-center gap-2 py-2 px-2.5 -ml-2 rounded-xl text-sm font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-100 active:bg-gray-200 transition-colors min-h-[44px]"
                aria-label="Back to feed"
              >
                <ArrowLeft size={20} className="shrink-0" />
                <span>Back to noticeboard</span>
              </Link>
            ) : (
              <div />
            )}
          </div>

          {/* Real Brand Logo in Top Center */}
          <div className="mb-4 flex justify-center">
            <Link to="/" className="inline-flex items-center justify-center group">
              <img
                src="/logo.png"
                alt="NearNotice"
                className="h-14 sm:h-16 w-auto object-contain group-hover:scale-105 transition-transform"
              />
            </Link>
          </div>

          {/* Title & Subtitle */}
          <div className="text-left mb-5">
            <h1
              ref={headingRef}
              tabIndex={-1}
              className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 focus:outline-none"
            >
              {heading}
            </h1>
            {subheading && (
              <p className="mt-1.5 text-xs sm:text-sm text-gray-500 leading-relaxed">
                {subheading}
              </p>
            )}
          </div>

          {/* Form Body */}
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
