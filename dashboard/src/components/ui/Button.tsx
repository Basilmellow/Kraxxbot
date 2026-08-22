import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-3.5 py-1.5 text-xs',
    lg: 'px-5 py-2.5 text-sm',
  };

  const variantClasses = {
    primary: 'kraxx-btn-primary',
    ghost: 'kraxx-btn-ghost',
    danger: 'kraxx-btn-danger',
    outline: 'border border-[#1E2C3F] hover:border-[#22D3EE]/50 text-[#F1F5F9] bg-[#0A0F16] hover:bg-[#0D131C]',
  };

  return (
    <button
      className={`kraxx-btn ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5 font-mono text-[11px]">
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span>PROCESSING</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
