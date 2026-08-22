import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`bg-[#111823] border border-[#16202E] animate-pulse-subtle rounded ${className}`}
      {...props}
    />
  );
}

export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`p-4 rounded-md bg-[#0A0F16] border border-[#16202E] space-y-3 ${className}`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full space-y-2">
      <div className="flex gap-4 p-3 bg-[#070B10] border-b border-[#16202E]">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 p-3 bg-[#0A0F16] border-b border-[#121A24]">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}
