'use client';

import React from 'react';
import { Session } from 'next-auth';
import { Sidebar } from './Sidebar';

interface DashboardShellProps {
  session: Session;
  children: React.ReactNode;
}

/**
 * DashboardShell — Client wrapper for the authenticated dashboard layout.
 * Receives the server-side session and renders the sidebar + main content area.
 */
export function DashboardShell({ session, children }: DashboardShellProps) {
  return (
    <div className="dashboard-shell" style={{
      minHeight: '100vh',
      background: '#090908',
      color: '#F3F0E9',
      display: 'flex',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    }}>
      {/* Sidebar */}
      <Sidebar session={session} />

      {/* Main content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}>
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
