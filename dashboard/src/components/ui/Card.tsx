import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  glass?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

export function Card({
  glow = false,
  glass = false,
  interactive = false,
  className = '',
  children,
  ...props
}: CardProps) {
  const baseClass = interactive
    ? 'kraxx-card-interactive'
    : glass
    ? 'bg-[#0A0F16]/90 backdrop-blur-md border border-[#16202E] rounded-md p-4'
    : 'kraxx-card';

  return (
    <div className={`${baseClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`flex items-center justify-between border-b border-[#16202E] pb-3 mb-3.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-xs font-semibold text-[#F1F5F9] uppercase tracking-wider font-mono flex items-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}
