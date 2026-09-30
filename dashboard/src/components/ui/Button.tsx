import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
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
    sm: 'kraxx-btn-sm',
    md: 'kraxx-btn-md',
    lg: 'kraxx-btn-lg',
  };

  const variantClasses = {
    primary: 'kraxx-btn-primary',
    ghost: 'kraxx-btn-ghost',
    danger: 'kraxx-btn-danger',
    secondary: 'kraxx-btn-secondary',
    outline: 'kraxx-btn-secondary',
  };

  return (
    <button
      className={`kraxx-btn ${sizeClasses[size]} ${variantClasses[variant] || variantClasses.primary} ${className}`}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center gap-2">
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

export function IconButton({ label, children, ...props }: Omit<ButtonProps, 'children'> & { label: string; children: React.ReactNode }) {
  return <Button type="button" variant="ghost" {...props} aria-label={label} title={props.title || label} className={`kraxx-icon-button ${props.className || ''}`}>{children}</Button>;
}
