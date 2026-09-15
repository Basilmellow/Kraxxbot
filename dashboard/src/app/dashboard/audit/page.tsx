'use client';

import React, { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  ScrollText,
  Search,
  Filter,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
} from 'lucide-react';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 1 });
  const [actionFilter, setActionFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async (page = 1, action = '') => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '25',
      });
      if (action) params.append('action', action);

      const res = await fetch(`/api/audit?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
        setPagination(data.pagination || { page: 1, limit: 25, total: 0, totalPages: 1 });
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(pagination.page, actionFilter);
  }, [pagination.page, actionFilter]);

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('ASSIGN') || action.includes('SUCCESS') || action.includes('VERIFIED')) return 'success';
    if (action.includes('REMOVE') || action.includes('DELETE') || action.includes('KICK') || action.includes('BAN')) return 'danger';
    if (action.includes('CONFIG') || action.includes('UPDATE')) return 'warning';
    return 'brand';
  };

  const filteredLogs = logs.filter((log) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.executorId?.toLowerCase().includes(q) ||
      (typeof log.details === 'string' && log.details.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Security Audit Trail"
        subtitle="Cryptographic Log of Operator Transactions, Gateway Actions & Mod Dispatches"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="w-4 h-4 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search executor ID, action, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-2xs"
            >
              <option value="">All Audit Actions</option>
              <option value="ROLE_ASSIGN">ROLE_ASSIGN</option>
              <option value="ROLE_REMOVE">ROLE_REMOVE</option>
              <option value="TICKET_CREATE">TICKET_CREATE</option>
              <option value="TICKET_RESOLVE">TICKET_RESOLVE</option>
              <option value="MOD_BAN">MOD_BAN</option>
              <option value="MOD_KICK">MOD_KICK</option>
              <option value="MOD_TIMEOUT">MOD_TIMEOUT</option>
              <option value="ANNOUNCEMENT_SEND">ANNOUNCEMENT_SEND</option>
            </select>
          </div>
        </div>

        {/* Audit Table Card */}
        <Card className="bg-white border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-[#F1F3F9] flex items-center justify-between">
            <h3 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
              <ScrollText className="w-4 h-4 text-indigo-600" />
              <span>Immutable Ledger ({pagination.total} events)</span>
            </h3>
            <span className="text-xs text-[#667085]">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
          </div>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={10} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ScrollText}
                title="No audit events found"
                description="No matching audit events recorded in this criteria."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="kraxx-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Executor</th>
                    <th>Target / Details</th>
                    <th className="text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="text-xs text-[#475467]">
                        {log.executorId ? `@${log.executorId}` : 'SYSTEM BOT'}
                      </td>
                      <td className="max-w-md truncate text-xs text-[#101828]">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || 'N/A'}
                      </td>
                      <td className="text-right text-xs text-[#667085]">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="p-4 border-t border-[#F1F3F9] flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1 || isLoading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Previous</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.totalPages || isLoading}
              onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              className="gap-1 text-xs"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
