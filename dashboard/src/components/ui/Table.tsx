import React from 'react';

/** Use inside a table-scroll region so wide datasets never widen the page. */
export function Table({ className = '', ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={`kraxx-table ${className}`} />;
}
