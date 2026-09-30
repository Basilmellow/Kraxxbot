import React from 'react';
import { LucideIcon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  icon: LucideIcon;
  variant?: 'brand' | 'security' | 'studio' | 'warning' | 'neutral' | 'cyan';
  trend?: string;
  tag?: string;
  sparklineData?: number[];
  href?: string;
  linkLabel?: string;
}

/** Displays only caller-supplied metrics. No synthetic trends or health claims. */
export function StatCard({ title, value, subValue, icon: Icon, trend, tag, sparklineData, href, linkLabel }: StatCardProps) {
  const values = sparklineData?.filter(Number.isFinite) || [];
  const min = Math.min(...values);
  const range = Math.max(...values) - min || 1;
  const points = values.length > 1 ? values.map((n, i) => `${i / (values.length - 1) * 100},${24 - (n - min) / range * 20}`).join(' ') : '';
  return <Card className="flex h-full flex-col">
    <div className="mb-4 flex items-start justify-between gap-3"><p className="text-[13px] font-medium text-[var(--text-secondary)]">{title}</p><Icon className="h-4 w-4 shrink-0 text-[var(--accent)]" aria-hidden="true" /></div>
    <p className="break-words text-3xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p>
    {subValue && <p className="mt-2 text-[13px] text-[var(--text-secondary)]">{subValue}</p>}
    {(trend || tag || points || href) && <div className="mt-auto pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-base)] pt-3">
        {(trend || tag) && <span className="text-xs text-[var(--text-secondary)]">{trend || tag}</span>}
        {points && <svg viewBox="0 0 100 28" className="h-7 w-24 text-[var(--accent)]" role="img" aria-label={`${title} trend: ${values.join(', ')}`}><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
        {href && <Link href={href} className="flex w-full items-center justify-between gap-2 text-[13px] font-medium text-[var(--accent)] hover:underline">{linkLabel || 'View details'}<ArrowRight size={14} /></Link>}
      </div>
    </div>}
  </Card>;
}
