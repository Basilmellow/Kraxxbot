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
    ? 'bg-[#161614]/95 backdrop-blur-sm border border-[#2A2925] rounded-2xl p-5 shadow-lg'
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
      className={`flex items-center justify-between border-b border-[#2A2925] pb-3.5 mb-4 ${className}`}
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
      className={`border-t border-[#2A2925] pt-3.5 mt-4 flex items-center justify-between ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
