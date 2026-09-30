import React from 'react';

export function PageContainer({ className = '', children }: { className?: string; children: React.ReactNode }) {
  return <div className={`dashboard-page ${className}`}>{children}</div>;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="dashboard-page-header">
      <div className="min-w-0">
        {eyebrow && <p className="dashboard-eyebrow">{eyebrow}</p>}
        <h1 className="dashboard-page-title">{title}</h1>
        {description && <p className="dashboard-page-description">{description}</p>}
      </div>
      {actions && <div className="dashboard-page-actions">{actions}</div>}
    </header>
  );
}

export function Section({ className = '', ...props }: React.HTMLAttributes<HTMLElement>) {
  return <section {...props} className={`dashboard-section ${className}`} />;
}

export function Divider() {
  return <hr className="dashboard-divider" />;
}
