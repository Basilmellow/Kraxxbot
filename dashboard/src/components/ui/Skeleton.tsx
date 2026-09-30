import React from 'react';

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton rounded-md ${className}`}
    />
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" className="space-y-4"><span className="sr-only">{label}</span><Skeleton className="h-5 w-48" /><div className="grid gap-4 sm:grid-cols-2"><SkeletonCard /><SkeletonCard /></div><SkeletonTable rows={3} /></div>;
}

export function SkeletonCard() {
  return (
    <div className="kraxx-card p-5 space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-20" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="kraxx-card overflow-hidden p-0">
      <div className="p-4 border-b border-[var(--border-base)] flex justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="divide-y divide-[var(--border-subtle)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
