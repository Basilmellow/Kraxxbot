import React from 'react';
import { Card } from '@/components/ui/Card';
import { LucideIcon, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'brand' | 'security' | 'studio' | 'warning' | 'neutral' | 'cyan';
  trend?: string;
  tag?: string;
  sparklineData?: number[];
}

export function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  variant = 'brand',
  trend,
  tag,
  sparklineData = [35, 42, 38, 55, 48, 62, 58, 75],
}: StatCardProps) {
  const variantStyles = {
    brand: {
      accent: 'text-indigo-600',
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      stroke: '#4F46E5',
    },
    security: {
      accent: 'text-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      stroke: '#10B981',
    },
    studio: {
      accent: 'text-violet-600',
      iconBg: 'bg-violet-50 text-violet-600 border border-violet-100',
      stroke: '#8B5CF6',
    },
    warning: {
      accent: 'text-amber-600',
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      stroke: '#F59E0B',
    },
    neutral: {
      accent: 'text-sky-600',
      iconBg: 'bg-sky-50 text-sky-600 border border-sky-100',
      stroke: '#0284C7',
    },
    cyan: {
      accent: 'text-cyan-600',
      iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
      stroke: '#06B6D4',
    },
  }[variant] || {
    accent: 'text-indigo-600',
    iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    stroke: '#4F46E5',
  };

  // Generate SVG path from sparkline numbers
  const minVal = Math.min(...sparklineData);
  const maxVal = Math.max(...sparklineData);
  const range = maxVal - minVal || 1;
  const width = 120;
  const height = 28;
  const points = sparklineData
    .map((val, idx) => {
      const x = (idx / (sparklineData.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-xs hover:shadow-sm hover:border-[#D1D5DB] transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#667085] tracking-wide">
            {title}
          </span>
          <div className={`p-2 rounded-xl ${variantStyles.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <div className="text-2xl sm:text-3xl font-bold text-[#101828] tracking-tight">
            {value}
          </div>
        </div>

        {subValue && (
          <p className="text-xs text-[#667085] leading-snug">
            {subValue}
          </p>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-[#F1F3F9] flex items-center justify-between">
        {trend ? (
          <span className="text-[11px] font-medium text-emerald-600 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>{trend}</span>
          </span>
        ) : (
          <span className="text-[11px] text-[#98A2B3]">Operational</span>
        )}

        {/* Mini Sparkline Graph */}
        <div className="w-24 h-7">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
            <polyline
              fill="none"
              stroke={variantStyles.stroke}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
