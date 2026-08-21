import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  glass?: boolean;
  children: React.ReactNode;
}

export function Card({ glow = false, glass = false, className = '', children, ...props }: CardProps) {
  const baseClass = glass ? 'kraxx-glass rounded-xl p-5' : glow ? 'kraxx-card kraxx-card-glow' : 'kraxx-card';
  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`flex items-center justify-between border-b border-[#1e2a38] pb-3 mb-4 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={`text-base font-semibold text-[#e2e8f0] flex items-center gap-2 ${className}`} {...props}>
      {children}
    </h3>
  );
}
