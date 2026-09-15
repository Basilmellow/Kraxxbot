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
  message = 'We encountered an issue loading this subsystem telemetry.',
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 sm:p-8 rounded-2xl bg-[#FEF2F2]/60 border border-[#FCA5A5]/40 text-center flex flex-col items-center justify-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-[#FEE2E2] text-[#DC2626] flex items-center justify-center mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h4 className="text-sm font-semibold text-[#991B1B] mb-1">{title}</h4>
      <p className="text-xs text-[#B91C1C] max-w-md leading-relaxed mb-4">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-[#FCA5A5] text-[#991B1B] hover:bg-[#FEE2E2]"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          <span>Retry Operation</span>
        </Button>
      )}
    </div>
  );
}
