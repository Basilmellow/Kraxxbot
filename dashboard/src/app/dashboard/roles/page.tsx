'use client';

import React, { useState, useEffect } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonTable } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ShieldAlert, Hash, Users, Shield, Layers } from 'lucide-react';

interface RoleItem {
  id: string;
  name: string;
  color: string | null;
  position: number;
  permissions: string;
  memberCount: number;
  isManaged: boolean;
}

export default function RolesHierarchyPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/roles');
      if (res.ok) {
        const data = await res.json();
        setRoles(data.roles || []);
      }
    } catch (e) {
      console.error('Failed to load roles:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="ROLE HIERARCHY & PERMISSIONS"
        subtitle="Guild Security Structure, Precedence Ranks & Bitfield Permissions"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5">
        <Card className="bg-[#0A0F16] overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>SERVER ROLE HIERARCHY ({roles.length})</span>
              </CardTitle>
              <span className="text-[10px] text-[#64748B] font-mono">
                PRECEDENCE: HIGHEST TO LOWEST
              </span>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="p-4">
              <SkeletonTable rows={8} />
            </div>
          ) : roles.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={Shield}
                title="NO ROLES RESOLVED"
                description="Unable to acquire guild role hierarchy from Discord gateway."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#16202E] bg-[#070B10] text-[#64748B]">
                    <th className="py-2.5 px-4 font-semibold">PRECEDENCE</th>
                    <th className="py-2.5 px-4 font-semibold">ROLE IDENTITY</th>
                    <th className="py-2.5 px-4 font-semibold">DISCORD ROLE ID</th>
                    <th className="py-2.5 px-4 font-semibold">MEMBERS</th>
                    <th className="py-2.5 px-4 font-semibold">SYSTEM INTEGRATION</th>
                    <th className="py-2.5 px-4 font-semibold text-right">BITFIELD</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#16202E]">
                  {roles.map((r) => (
                    <tr key={r.id} className="hover:bg-[#0D131C] transition-colors">
                      <td className="py-3 px-4 font-bold text-[#22D3EE]">
                        #{r.position}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: r.color || '#94A3B8' }}
                          />
                          <span className="font-bold text-[#F1F5F9]">{r.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{r.id}</td>
                      <td className="py-3 px-4">
                        <span className="bg-[#070B10] px-2 py-0.5 rounded border border-[#16202E] text-[#94A3B8]">
                          {r.memberCount} operators
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {r.isManaged ? (
                          <Badge variant="brand">MANAGED BOT ROLE</Badge>
                        ) : (
                          <Badge variant="neutral">STANDARD GUILD ROLE</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right text-[#64748B] font-mono text-[11px]">
                        0x{r.permissions}
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
