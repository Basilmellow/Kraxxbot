import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { IconButton } from './Button';

export function Pagination({ page, pageCount, onChange, children, disabled = false }: { page: number; pageCount: number; onChange: (page: number) => void; children?: React.ReactNode; disabled?: boolean }) {
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-base)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
    {children}<div className="flex items-center gap-2"><IconButton label="Previous page" disabled={disabled || page <= 1} onClick={() => onChange(Math.max(1, page - 1))}><ChevronLeft size={16} /></IconButton><span aria-live="polite">Page {page} of {pageCount}</span><IconButton label="Next page" disabled={disabled || page >= pageCount} onClick={() => onChange(Math.min(pageCount, page + 1))}><ChevronRight size={16} /></IconButton></div>
  </nav>;
}
