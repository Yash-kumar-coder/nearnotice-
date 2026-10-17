import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export function Skeleton({ className = '', variant = 'rectangular' }: SkeletonProps) {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'text'
      ? 'rounded h-4 my-1'
      : 'rounded-xl';

  return (
    <div
      aria-hidden="true"
      className={`animate-pulse bg-gray-200/80 ${variantClass} ${className}`}
    />
  );
}

export function PageSkeleton() {
  return (
    <div className="max-w-md mx-auto p-6 space-y-6 min-h-[60vh] flex flex-col justify-center" aria-busy="true" aria-live="polite">
      <div className="flex items-center gap-4">
        <Skeleton variant="circular" className="w-12 h-12" />
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" className="w-3/4 h-5" />
          <Skeleton variant="text" className="w-1/2 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-40" />
      <div className="space-y-3">
        <Skeleton variant="text" className="w-full h-4" />
        <Skeleton variant="text" className="w-5/6 h-4" />
        <Skeleton variant="text" className="w-4/6 h-4" />
      </div>
    </div>
  );
}
