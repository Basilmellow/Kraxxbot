'use client';

import { PageContainer } from '@/components/ui/Page';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import { Bell, CheckCheck, CheckCircle2, AlertTriangle, Info, ExternalLink } from 'lucide-react';
import Link from 'next/link';

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.error('Failed to load notifications:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(fetchNotifications);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_ALL_READ' }),
      });
      if (res.ok) {
        setNotifications(notifications.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (e) {
      console.error('Failed to mark all read:', e);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'MARK_READ', id }),
      });
      setNotifications(notifications.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SECURITY':
      case 'WARNING':
        return <AlertTriangle className="w-4 h-4 text-[var(--accent)]" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-4 h-4 text-[var(--success)]" />;
      default:
        return <Info className="w-4 h-4 text-[var(--accent)]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Notifications"
        subtitle="Review your notifications and updates."
      />

      <PageContainer className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[var(--text-secondary)]">Unread Dispatches:</span>
            <Badge variant={unreadCount > 0 ? 'brand' : 'neutral'}>
              {unreadCount} UNREAD
            </Badge>
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="gap-2 text-[13px]"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Mark All as Read</span>
            </Button>
          )}
        </div>

        {/* Notification List */}
        {isLoading ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : notifications.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="All notifications cleared"
            description="You have no pending notification dispatches."
          />
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <Card
                key={n.id}
                className={`p-4 rounded-xl border transition-colors ${
                  n.read
                    ? 'bg-[var(--surface-1)] border-[var(--border-base)]'
                    : 'bg-[var(--accent-dim)] border-[var(--accent-border)] '
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{getTypeIcon(n.type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-[13px] font-semibold text-[var(--text-primary)]">
                          {n.title}
                        </h4>
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
                        )}
                      </div>
                      <p className="text-[13px] text-[var(--text-secondary)] mt-1 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[13px] text-[var(--text-secondary)]">
                        <span>{new Date(n.createdAt).toLocaleString()}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            className="text-[var(--accent)] font-medium hover:underline flex items-center gap-1"
                          >
                            <span>View Resource</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-[13px] font-medium"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
