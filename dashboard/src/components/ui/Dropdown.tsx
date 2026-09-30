'use client';

import React, { useEffect, useRef } from 'react';

/** A disclosure of ordinary buttons/links, not an ARIA listbox or menu. */
export function Dropdown({ children, onClose, label, className = '' }: { children: React.ReactNode; onClose: () => void; label: string; className?: string }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>('input,button:not(:disabled),a[href]')?.focus();
  }, []);
  function restoreTrigger() {
    const trigger = panel.current?.parentElement?.querySelector<HTMLButtonElement>('button[aria-expanded]');
    onClose();
    trigger?.focus();
  }
  return <div ref={panel} role="region" aria-label={label} className={`kraxx-dropdown ${className}`} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); restoreTrigger(); }
    if (event.target instanceof HTMLInputElement) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const items = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]') || []);
      const index = items.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      items[(index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
    }
  }} onBlur={event => { if (event.relatedTarget && !event.currentTarget.parentElement?.contains(event.relatedTarget as Node)) onClose(); }}>{children}</div>;
}
