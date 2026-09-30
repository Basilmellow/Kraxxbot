import React from 'react';

export function Input({ className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`kraxx-input ${className}`} />;
}

export function Textarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`kraxx-input kraxx-textarea ${className}`} />;
}

export function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`kraxx-select ${className}`} />;
}

export function Checkbox({ className = '', ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return <input {...props} type="checkbox" className={`kraxx-checkbox ${className}`} />;
}

export function Switch({ checked, label, className = '', ...props }: Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'role'> & { checked: boolean; label: string }) {
  return <button {...props} type="button" role="switch" aria-checked={checked} aria-label={label} className={`kraxx-switch ${className}`}><span /></button>;
}

export function SearchField({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <Input {...props} type="search" aria-label={label} />;
}

export function FilterBar({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={`kraxx-filter-bar ${className}`} />;
}
