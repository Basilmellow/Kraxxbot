import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral' | 'studio';
  children: React.ReactNode;
}

export function Badge({ variant = 'brand', className = '', children, ...props }: BadgeProps) {
  const variantClass = {
    brand: 'badge-brand',
    success: 'badge-success',
    warning: 'badge-warning',
    danger: 'badge-danger',
    neutral: 'badge-neutral',
    studio: 'badge-studio',
  }[variant];

  return (
    <span className={`badge ${variantClass} ${className}`} {...props}>
      {children}
    </span>
  );
}
