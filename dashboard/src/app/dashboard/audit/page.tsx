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
        title="SECURITY AUDIT TRAIL"
        subtitle="Cryptographic Log of Operator Transactions, Gateway Actions & Mod Dispatches"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search executor ID, action, or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((p) => ({ ...p, page: 1 }));
              }}
              className="px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
            >
              <option value="">All Audit Actions</option>
              <option value="ROLE_ASSIGN">Role Assign</option>
              <option value="ROLE_REVOKE">Role Revoke</option>
              <option value="CONFIG_UPDATE">Config Update</option>
              <option value="TICKET_ACTION">Ticket Action</option>
              <option value="ANNOUNCEMENT_SEND">Announcement Send</option>
              <option value="MODERATION">Moderation</option>
            </select>
          </div>
        </div>

        {/* Audit Log Table */}
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <ScrollText className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>CRYPTOGRAPHIC AUDIT LOGS ({pagination.total} ENTRIES)</span>
              </CardTitle>
              <span className="text-[10px] text-[#64748B] font-mono">
                PAGE {pagination.page} OF {pagination.totalPages || 1}
              </span>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={ScrollText}
                title="NO AUDIT LOGS FOUND"
                description="No recorded audit actions match your filter criteria."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">ACTION</th>
                    <th className="py-2.5 px-4 font-semibold">EXECUTING OPERATOR</th>
                    <th className="py-2.5 px-4 font-semibold">TARGET RESOURCE</th>
                    <th className="py-2.5 px-4 font-semibold">TRANSACTION DETAILS</th>
                    <th className="py-2.5 px-4 font-semibold text-right">TIMESTAMP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4">
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-[#F1F5F9] font-bold">
                        {log.executorId}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8]">
                        {log.targetId ? (
                          <span className="bg-[#070B10] px-2 py-0.5 rounded border border-[#16202E]">
                            {log.targetType || 'RESOURCE'}: {log.targetId}
                          </span>
                        ) : (
                          <span className="text-[#64748B]">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#94A3B8] max-w-sm truncate">
                        {typeof log.details === 'object'
                          ? JSON.stringify(log.details)
                          : log.details || '—'}
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B]">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="p-3 border-t border-[#16202E] flex items-center justify-between font-mono text-xs">
            <span className="text-[#64748B]">
              Showing {filteredLogs.length} of {pagination.total} entries
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
                className="font-mono text-xs gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>PREVIOUS</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
                className="font-mono text-xs gap-1"
              >
                <span>NEXT</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
