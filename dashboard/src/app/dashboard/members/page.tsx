'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonTable } from '@/components/ui/Skeleton';
import {
  Users,
  Search,
  ShieldCheck,
  Calendar,
  ChevronRight,
  UserCheck,
  Hash,
  ShieldAlert,
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
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="OPERATOR & GUILD DIRECTORY"
        subtitle="Active Guild Personnel, Role Clearances & Personnel Dossiers"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 font-mono text-xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search by username, display name, or Discord ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
            >
              <option value="">All Guild Roles</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Member Table Card */}
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-[#22D3EE]" />
              <span>PERSONNEL DIRECTORY ({members.length})</span>
            </CardTitle>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : members.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Users}
                title="NO OPERATORS FOUND"
                description="No guild members match your current filter parameters."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">OPERATOR</th>
                    <th className="py-2.5 px-4 font-semibold">CLEARANCE TIER</th>
                    <th className="py-2.5 px-4 font-semibold">ASSIGNED ROLES</th>
                    <th className="py-2.5 px-4 font-semibold">JOINED DISCORD</th>
                    <th className="py-2.5 px-4 font-semibold text-right">DOSSIER</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {members.map((m) => (
                    <tr key={m.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-[#16202E]"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[#111823] flex items-center justify-center font-bold text-[#22D3EE] text-[10px] border border-[#16202E]">
                              {m.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[#F1F5F9]">{m.displayName || m.username}</div>
                            <div className="text-[10px] text-[#64748B]">@{m.username} • {m.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            m.roleTier === 'FOUNDER' || m.roleTier === 'COFOUNDER'
                              ? 'brand'
                              : m.roleTier === 'MANAGEMENT_HEAD'
                              ? 'studio'
                              : 'neutral'
                          }
                        >
                          {m.roleTier}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {m.roles.slice(0, 3).map((r) => (
                            <span
                              key={r.id}
                              className="text-[10px] bg-[#070B10] px-1.5 py-0.5 rounded border border-[#16202E] text-[#94A3B8]"
                            >
                              {r.name}
                            </span>
                          ))}
                          {m.roles.length > 3 && (
                            <span className="text-[10px] text-[#64748B]">
                              +{m.roles.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {new Date(m.joinedAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/dashboard/members/${m.id}`}>
                          <Button variant="outline" size="sm" className="font-mono text-xs gap-1 py-1">
                            <span>VIEW DOSSIER</span>
                            <ChevronRight className="w-3 h-3 text-[#22D3EE]" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
