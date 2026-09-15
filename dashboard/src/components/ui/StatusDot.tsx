import React from 'react';

interface StatusDotProps {
  status: 'online' | 'offline' | 'degraded' | 'neutral' | 'unknown';
  label?: string;
  showPulse?: boolean;
  className?: string;
}

export function StatusDot({
  status = 'neutral',
  label,
  showPulse = false,
  className = '',
}: StatusDotProps) {
  const dotClass = {
    online: 'status-dot-online',
    offline: 'status-dot-offline',
    degraded: 'status-dot-degraded',
    neutral: 'status-dot-neutral',
    unknown: 'status-dot-neutral',
  }[status];

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`status-dot ${dotClass} ${showPulse ? 'animate-pulse' : ''}`}
        aria-hidden="true"
      />
      {label && (
        <span className="text-[11px] font-medium text-[#475467]">
          {label}
        </span>
      )}
    </div>
  );
}
