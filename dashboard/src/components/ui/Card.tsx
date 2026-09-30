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
  // Keep legacy call sites compatible without reintroducing visual effects.
  void glow;
  void glass;
  const baseClass = interactive
    ? 'kraxx-card-interactive'
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
      className={`flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-base)] pb-4 mb-4 ${className}`}
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
      className={`text-sm font-semibold text-[#F3F0E9] flex items-center gap-2 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-[#A8A49B] mt-0.5 ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className = '',
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`border-t border-[var(--border-base)] pt-4 mt-4 flex flex-wrap items-center justify-between gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
