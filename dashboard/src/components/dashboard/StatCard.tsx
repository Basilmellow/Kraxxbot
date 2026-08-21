import React from 'react';
import { Card } from '@/components/ui/Card';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'brand' | 'security' | 'studio' | 'warning' | 'neutral';
  trend?: string;
}

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'brand',
  trend,
}: StatCardProps) {
  const variantStyles = {
    brand: {
      border: 'hover:border-[#00f0ff]/30',
      iconBg: 'bg-[#00f0ff]/10 text-[#00f0ff]',
      glow: 'hover:shadow-[0_0_20px_rgba(0,240,255,0.08)]',
    },
    security: {
      border: 'hover:border-[#10b981]/30',
      iconBg: 'bg-[#10b981]/10 text-[#10b981]',
      glow: 'hover:shadow-[0_0_20px_rgba(16,185,129,0.08)]',
    },
    studio: {
      border: 'hover:border-[#6366f1]/30',
      iconBg: 'bg-[#6366f1]/10 text-[#6366f1]',
      glow: 'hover:shadow-[0_0_20px_rgba(99,102,241,0.08)]',
    },
    warning: {
      border: 'hover:border-[#f59e0b]/30',
      iconBg: 'bg-[#f59e0b]/10 text-[#f59e0b]',
      glow: 'hover:shadow-[0_0_20px_rgba(245,158,11,0.08)]',
    },
    neutral: {
      border: 'hover:border-[#3b82f6]/30',
      iconBg: 'bg-[#3b82f6]/10 text-[#3b82f6]',
      glow: 'hover:shadow-[0_0_20px_rgba(59,130,246,0.08)]',
    },
  }[variant];

  return (
    <Card className={`transition-all duration-300 ${variantStyles.border} ${variantStyles.glow}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-[#e2e8f0] tracking-tight">{value}</h3>
          {subValue && <p className="text-xs text-[#94a3b8] mt-1">{subValue}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${variantStyles.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {trend && (
        <div className="mt-3 pt-2.5 border-t border-[#1e2a38] text-[11px] text-[#64748b] flex items-center justify-between">
          <span>Activity Metric</span>
          <span className="font-mono text-[#00f0ff]">{trend}</span>
        </div>
      )}
    </Card>
  );
}
