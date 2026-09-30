import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'We could not load this information. Please try again.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`p-6 rounded-xl bg-[var(--surface-1)] border border-[var(--danger-border)] text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-[#EF4444]/15 text-[#EF4444] flex items-center justify-center mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-[#F3F0E9] mb-1">{title}</h4>
      <p className="text-xs text-[#A8A49B] max-w-md leading-relaxed mb-4">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          className="border-[#EF4444]/40 text-[#F3F0E9] hover:bg-[#EF4444]/10"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>Try again</span>
        </Button>
      )}
    </div>
  );
}
