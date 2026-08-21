import React from 'react';

interface StatusDotProps {
  status: 'online' | 'offline' | 'degraded' | 'unknown';
  label?: string;
  showPulse?: boolean;
}

export function StatusDot({ status, label, showPulse = false }: StatusDotProps) {
  const dotClass = {
    online: 'status-dot-online',
    offline: 'status-dot-offline',
    degraded: 'status-dot-degraded',
    unknown: 'bg-[#64748b]',
  }[status] || 'bg-[#64748b]';

  return (
    <div className="flex items-center gap-2">
      <span className={`status-dot ${dotClass} ${showPulse && status === 'online' ? 'animate-pulse-glow' : ''}`} />
      {label && <span className="text-xs capitalize font-medium text-[#94a3b8]">{label}</span>}
    </div>
  );
}
