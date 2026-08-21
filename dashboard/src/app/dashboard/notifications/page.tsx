'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
} from 'lucide-react';
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
      setIsLoading(true);
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
    fetchNotifications();
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

  return (
    <div>
      <Topbar
        title="Notifications & Alerts"
        subtitle="Operations Alerts, Automated Triggers & Direct Action Notifications"
        onRefresh={fetchNotifications}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-[#e2e8f0]">Notification Stream</h3>
            {unreadCount > 0 && (
              <Badge variant="brand">{unreadCount} Unread</Badge>
            )}
          </div>

          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              <CheckCheck className="w-4 h-4 mr-1 text-[#10b981]" />
              <span>Mark All as Read</span>
            </Button>
          )}
        </div>

        <Card className="overflow-hidden p-0">
          <div className="divide-y divide-[#1e2a38]">
            {isLoading ? (
              <div className="p-12 text-center text-xs text-[#64748b]">Loading notification feed...</div>
            ) : notifications.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#64748b]">
                No notifications logged. Your operations stream is clear.
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-4 flex items-start justify-between gap-4 transition-all ${
                    !n.read ? 'bg-[#00f0ff]/5 border-l-2 border-[#00f0ff]' : 'hover:bg-[#141a22]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#e2e8f0]">{n.title}</span>
                      {!n.read && <span className="w-2 h-2 rounded-full bg-[#00f0ff]" />}
                    </div>
                    <p className="text-xs text-[#94a3b8] leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-mono text-[#64748b]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(n.createdAt).toLocaleString()}
                      </span>
                      {n.link && (
                        <Link href={n.link} className="text-[#00f0ff] hover:underline flex items-center gap-1">
                          <span>View target</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(n.id)}
                      className="text-[11px] text-[#64748b] hover:text-[#00f0ff] font-semibold whitespace-nowrap"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
