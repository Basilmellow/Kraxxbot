import React from 'react';

/** Supplementary description only; the trigger must already have an accessible name. */
export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return <span className="kraxx-tooltip">{children}<span className="kraxx-tooltip-text" aria-hidden="true">{text}</span></span>;
}
