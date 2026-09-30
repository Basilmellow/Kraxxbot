'use client';

import React from 'react';
import { Session } from 'next-auth';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { ConfirmationProvider } from '@/components/ui/ConfirmDialog';

interface DashboardShellProps {
  session: Session;
  isOwner: boolean;
  children: React.ReactNode;
}

/**
 * DashboardShell — Client wrapper for the authenticated dashboard layout.
 * Receives the server-side session and renders the sidebar + main content area.
 */
export function DashboardShell({ session, isOwner, children }: DashboardShellProps) {
  return (
    <ConfirmationProvider><div className="dashboard-shell">
      <a href="#dashboard-main" className="dashboard-skip-link">Skip to content</a>
      {/* Sidebar */}
      <Sidebar session={session} isOwner={isOwner} />

      {/* Main content */}
      <div className="dashboard-main">
        <main id="dashboard-main" tabIndex={-1} className="dashboard-content">
          {children}
        </main>
      </div>
      <CommandPalette />
    </div></ConfirmationProvider>
  );
}
