import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`p-8 rounded-md bg-[#0A0F16] border border-[#16202E] text-center flex flex-col items-center justify-center my-4 ${className}`}
    >
      <div className="w-10 h-10 rounded-md bg-[#0D131C] border border-[#1E2C3F] flex items-center justify-center text-[#64748B] mb-3">
        <Icon className="w-5 h-5 text-[#22D3EE]/80" />
      </div>
      <h3 className="text-sm font-semibold text-[#F1F5F9] mb-1 tracking-tight">{title}</h3>
      <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed mb-4">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
}
