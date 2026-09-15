import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'outline' | 'secondary';
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
    sm: 'px-2.5 py-1.5 text-xs',
    md: 'px-3.5 py-2 text-xs',
    lg: 'px-5 py-2.5 text-sm',
  };

  const variantClasses = {
    primary: 'kraxx-btn-primary',
    ghost: 'kraxx-btn-ghost',
    danger: 'kraxx-btn-danger',
    secondary: 'bg-[#F3F4F6] text-[#374151] hover:bg-[#E5E7EB] border border-[#E5E7EB]',
    outline: 'border border-[#D1D5DB] hover:border-[#4F46E5] text-[#374151] bg-white hover:bg-[#F9FAFB] shadow-xs',
  };

  return (
    <button
      className={`kraxx-btn ${sizeClasses[size]} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-1.5 font-medium text-[11px]">
          <svg className="animate-spin h-3.5 w-3.5 text-current" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span>Processing...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}
