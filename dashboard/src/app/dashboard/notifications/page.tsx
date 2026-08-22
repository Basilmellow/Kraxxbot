'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  ExternalLink,
  Shield,
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

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'SECURITY':
      case 'WARNING':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case 'SUCCESS':
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#22D3EE]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="OPERATIONAL NOTIFICATIONS & ALERTS"
        subtitle="Gateway Event Notifications, Critical Alerts & Subsystem Telemetry"
      />

      <div className="p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-5">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#64748B] uppercase">NOTIFICATION STREAM</span>
            {unreadCount > 0 && <Badge variant="brand">{unreadCount} UNREAD</Badge>}
          </div>

          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarkAllRead}
              className="font-mono text-xs gap-1.5"
            >
              <CheckCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>MARK ALL AS READ</span>
            </Button>
          )}
        </div>

        {/* Notification Stream Card */}
        <Card className="bg-[#0A0F16]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>INCOMING DISPATCHES ({notifications.length})</span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Bell}
                title="ALL CLEAR // NO ACTIVE NOTIFICATIONS"
                description="There are no active alerts or operational notices in your queue."
              />
            </div>
          ) : (
            <div className="divide-y divide-[#16202E] font-mono text-xs">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`p-3.5 flex items-start gap-3 transition-colors ${
                    !n.read ? 'bg-[#0D131C] border-l-2 border-[#22D3EE]' : 'hover:bg-[#070B10]'
                  }`}
                >
                  <div className="p-1 rounded bg-[#070B10] border border-[#16202E] mt-0.5">
                    {getTypeIcon(n.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-[#F1F5F9] truncate">{n.title}</div>
                      <span className="text-[10px] text-[#64748B]">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center gap-3 pt-1 text-[10px]">
                      {n.link && (
                        <Link
                          href={n.link}
                          className="text-[#22D3EE] hover:underline flex items-center gap-1"
                        >
                          <span>VIEW CONTEXT</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}

                      {!n.read && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="text-[#64748B] hover:text-[#F1F5F9] transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
