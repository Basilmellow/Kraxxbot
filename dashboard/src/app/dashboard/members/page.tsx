'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  Calendar,
  ChevronRight,
  UserCheck,
  Hash,
} from 'lucide-react';
import Link from 'next/link';

interface MemberItem {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  joinedAt: string;
  roles: { id: string; name: string; color: number }[];
  isVerified: boolean;
  department: string | null;
  roleTier: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedRole) params.set('role', selectedRole);

      const res = await fetch(`/api/members?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error('Failed to load members:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMembers();
    }, 250);
    return () => clearTimeout(handler);
  }, [searchQuery, selectedRole]);

  return (
    <div>
      <Topbar
        title="Member Management"
        subtitle="Guild Operator Directory, Role Assignments & Verification"
        onRefresh={fetchMembers}
        isRefreshing={isLoading}
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input
              type="text"
              placeholder="Search by username, display name, or user ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#64748b]" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff]/50"
            >
              <option value="">All Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Table Card */}
        <Card className="overflow-hidden p-0">
          <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
            <CardTitle>
              <Users className="w-4 h-4 text-[#00f0ff]" />
              <span>Guild Members ({members.length})</span>
            </CardTitle>
            <span className="text-[11px] text-[#64748b] font-mono">
              Live Discord Directory Sync
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="kraxx-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Discord ID</th>
                  <th>Joined Date</th>
                  <th>Verification</th>
                  <th>Assigned Roles</th>
                  <th className="text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                      Loading member roster...
                    </td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-xs text-[#64748b]">
                      No guild members matching search criteria.
                    </td>
                  </tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img
                              src={`https://cdn.discordapp.com/avatars/${m.id}/${m.avatar}.png?size=64`}
                              alt={m.username}
                              className="w-8 h-8 rounded-full border border-[#1e2a38] flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-[#141a22] border border-[#1e2a38] flex items-center justify-center font-bold text-xs text-[#00f0ff] flex-shrink-0">
                              {m.username[0]?.toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-[#e2e8f0] truncate flex items-center gap-1.5">
                              <span>{m.displayName}</span>
                              {m.department && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#00f0ff]/10 text-[#00f0ff] font-mono">
                                  {m.department}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#64748b] font-mono truncate">
                              @{m.username}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="font-mono text-xs text-[#94a3b8]">
                        <div className="flex items-center gap-1">
                          <Hash className="w-3 h-3 text-[#64748b]" />
                          <span>{m.id}</span>
                        </div>
                      </td>

                      <td className="whitespace-nowrap font-mono text-xs text-[#94a3b8]">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#64748b]" />
                          <span>{new Date(m.joinedAt).toLocaleDateString()}</span>
                        </div>
                      </td>

                      <td>
                        {m.isVerified ? (
                          <Badge variant="success">Verified</Badge>
                        ) : (
                          <Badge variant="neutral">Unverified</Badge>
                        )}
                      </td>

                      <td>
                        <div className="flex items-center gap-1 flex-wrap max-w-xs">
                          {m.roles.slice(0, 3).map((r) => (
                            <span
                              key={r.id}
                              className="text-[10px] px-1.5 py-0.5 rounded font-mono border"
                              style={{
                                borderColor: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#1e2a38',
                                color: r.color ? `#${r.color.toString(16).padStart(6, '0')}` : '#94a3b8',
                                backgroundColor: '#0f1318',
                              }}
                            >
                              {r.name}
                            </span>
                          ))}
                          {m.roles.length > 3 && (
                            <span className="text-[10px] text-[#64748b] font-mono">
                              +{m.roles.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="text-right">
                        <Link href={`/dashboard/members/${m.id}`}>
                          <Button variant="ghost" size="sm">
                            <span>Inspect</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
