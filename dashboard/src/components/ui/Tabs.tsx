'use client';

import React from 'react';

/** Selection controls for filtered datasets; buttons retain their native semantics. */
export function Tabs<T extends string>({ label, items, value, onChange }: { label: string; items: readonly { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <div role="group" aria-label={label} className="kraxx-tabs">{items.map(item => <button key={item.value} type="button" aria-pressed={value === item.value} className="kraxx-tab" onClick={() => onChange(item.value)}>{item.label}</button>)}</div>;
}
