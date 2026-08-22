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
  tag?: string;
}

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'brand',
  trend,
  tag,
}: StatCardProps) {
  const variantStyles = {
    brand: {
      accent: 'text-[#22D3EE]',
      border: 'hover:border-[#22D3EE]/30',
      iconBg: 'bg-[#22D3EE]/10 text-[#22D3EE]',
    },
    security: {
      accent: 'text-[#10B981]',
      border: 'hover:border-[#10B981]/30',
      iconBg: 'bg-[#10B981]/10 text-[#10B981]',
    },
    studio: {
      accent: 'text-[#818CF8]',
      border: 'hover:border-[#818CF8]/30',
      iconBg: 'bg-[#818CF8]/10 text-[#818CF8]',
    },
    warning: {
      accent: 'text-[#F59E0B]',
      border: 'hover:border-[#F59E0B]/30',
      iconBg: 'bg-[#F59E0B]/10 text-[#F59E0B]',
    },
    neutral: {
      accent: 'text-[#38BDF8]',
      border: 'hover:border-[#38BDF8]/30',
      iconBg: 'bg-[#38BDF8]/10 text-[#38BDF8]',
    },
  }[variant];

  return (
    <Card className={`transition-all duration-200 ${variantStyles.border} p-4 bg-[#0A0F16]`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-[#64748B] tracking-wider">
          <span>{title}</span>
          {tag && (
            <span className="px-1 py-0.2 rounded bg-[#070B10] text-[#475569] border border-[#16202E]">
              {tag}
            </span>
          )}
        </div>
        <div className={`p-1.5 rounded ${variantStyles.iconBg}`}>
          <Icon className="w-3.5 h-3.5" />
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <div className="text-2xl font-bold font-mono text-[#F1F5F9] tracking-tight">{value}</div>
        {trend && (
          <span className="text-[10px] font-mono text-[#10B981] flex items-center">
            {trend}
          </span>
        )}
      </div>

      {subValue && (
        <p className="text-[11px] text-[#94A3B8] font-sans mt-1 leading-snug">{subValue}</p>
      )}
    </Card>
  );
}
