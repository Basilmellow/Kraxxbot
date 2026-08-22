import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  errorCode?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'SYSTEM TELEMETRY ERROR',
  message = 'Unable to synchronize operational telemetry from subsystem nodes.',
  errorCode,
  onRetry,
  className = '',
}: ErrorStateProps) {
  return (
    <div
      className={`p-6 rounded-md bg-[#0A0F16] border border-[#EF4444]/30 text-center flex flex-col items-center justify-center my-4 ${className}`}
    >
      <div className="w-10 h-10 rounded-md bg-[#EF4444]/10 border border-[#EF4444]/20 flex items-center justify-center text-[#EF4444] mb-3">
        <AlertTriangle className="w-5 h-5" />
      </div>
      <h3 className="text-xs font-mono font-bold text-[#F1F5F9] tracking-wider mb-1 uppercase">
        {title}
      </h3>
      <p className="text-xs text-[#94A3B8] max-w-md leading-relaxed mb-3">{message}</p>
      {errorCode && (
        <span className="text-[10px] font-mono text-[#EF4444] bg-[#EF4444]/10 px-2 py-0.5 rounded border border-[#EF4444]/20 mb-4">
          ERR_CODE: {errorCode}
        </span>
      )}
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="gap-2 text-xs">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>RETRY TELEMETRY</span>
        </Button>
      )}
    </div>
  );
}
