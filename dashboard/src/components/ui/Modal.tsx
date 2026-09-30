'use client';

import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

/** Native modal provides focus containment, inert background and Escape support. */
export function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = 'lg' }: ModalProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    if (!isOpen || !dialog.current) return;
    const node = dialog.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    node.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      node.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen]);
  if (!isOpen) return null;
  const widths = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', '2xl': 'max-w-2xl', '3xl': 'max-w-3xl' };
  return <dialog ref={dialog} className={`kraxx-dialog ${widths[maxWidth]}`} aria-labelledby={titleId} aria-describedby={subtitle ? descriptionId : undefined}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onClick={(event) => { if (event.target === event.currentTarget) { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose(); } }}>
    <div className="flex items-start justify-between gap-4 border-b border-[var(--border-base)] p-5">
      <div className="min-w-0"><h2 id={titleId} className="text-base font-semibold">{title}</h2>{subtitle && <p id={descriptionId} className="mt-1 text-sm text-[var(--text-secondary)]">{subtitle}</p>}</div>
      <IconButton label="Close dialog" onClick={onClose}><X size={16} /></IconButton>
    </div>
    <div className="kraxx-dialog-content">{children}</div>
  </dialog>;
}
