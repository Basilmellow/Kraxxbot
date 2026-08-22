import React from 'react';

interface StatusDotProps {
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  label?: string;
  showPulse?: boolean;
  className?: string;
}

export function StatusDot({ status, label, showPulse = false, className = '' }: StatusDotProps) {
  const dotClass = {
    online: 'status-dot-online',
    offline: 'status-dot-offline',
    degraded: 'status-dot-degraded',
    unknown: 'status-dot-neutral',
  }[status] || 'status-dot-neutral';

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <span
        className={`status-dot ${dotClass} ${
          showPulse && status === 'online' ? 'animate-pulse-subtle' : ''
        }`}
      />
      {label && (
        <span className="text-[11px] font-mono uppercase tracking-wider text-[#94A3B8]">
          {label}
        </span>
      )}
    </div>
  );
}
