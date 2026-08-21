'use client';

import React, { useEffect, useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  ScrollText,
  Search,
  Filter,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
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
      log.executorId.toLowerCase().includes(q) ||
      (log.details && log.details.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      <Topbar
        title="Audit Logs"
        subtitle="Security & Operations Audit Trail"
        onRefresh={() => fetchLogs(pagination.page, actionFilter)}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6">
        {/* Filter & Search Bar */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#64748b] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search executor ID, action, or details..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] placeholder-[#64748b] focus:outline-none focus:border-[#00f0ff]/50"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-[#64748b]" />
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50 cursor-pointer"
              >
                <option value="">All Actions</option>
                <option value="ROLE_ASSIGN">Role Assign</option>
                <option value="ROLE_REMOVE">Role Remove</option>
                <option value="TICKET_CREATE">Ticket Create</option>
                <option value="TICKET_CLOSE">Ticket Close</option>
                <option value="MEMBER_VERIFIED">Member Verified</option>
                <option value="MEMBER_JOIN">Member Join</option>
                <option value="TASK_CREATE">Task Create</option>
                <option value="MEETING_CREATE">Meeting Create</option>
                <option value="ANNOUNCE_SEND">Announcement Send</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Audit Log Table */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <Shield className="w-4 h-4 text-[#00f0ff]" />
              <span>Audit Records</span>
            </CardTitle>
            <span className="text-xs text-[#64748b] font-mono">
              Total: {pagination.total} entries
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action Type</th>
                  <th>Executor</th>
                  <th>Target ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-[#64748b]">
                      Loading audit records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-xs text-[#64748b]">
                      No audit records found matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="whitespace-nowrap font-mono text-xs text-[#64748b]">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={getActionBadgeVariant(log.action)}>
                          {log.action}
                        </Badge>
                      </td>
                      <td className="font-mono text-xs text-[#e2e8f0]">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-[#64748b]" />
                          <span>{log.executorId}</span>
                        </div>
                      </td>
                      <td className="font-mono text-xs text-[#94a3b8]">
                        {log.targetId || '—'}
                      </td>
                      <td className="text-xs text-[#e2e8f0] max-w-md truncate">
                        {log.details || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-[#1e2a38] flex items-center justify-between bg-[#0f1318]/50">
            <span className="text-xs text-[#64748b]">
              Page <span className="text-[#e2e8f0] font-semibold">{pagination.page}</span> of{' '}
              <span className="text-[#e2e8f0] font-semibold">{pagination.totalPages}</span>
            </span>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page <= 1 || isLoading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page - 1 }))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                <span>Previous</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={pagination.page >= pagination.totalPages || isLoading}
                onClick={() => setPagination((p) => ({ ...p, page: p.page + 1 }))}
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
