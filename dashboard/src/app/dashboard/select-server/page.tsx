'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Server,
  ShieldCheck,
  Plus,
  ArrowRight,
  Search,
  ExternalLink,
  Crown,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { ManagedGuild } from '@/lib/discord';

export default function SelectServerPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [guilds, setGuilds] = useState<ManagedGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchGuilds = async () => {
    try {
      setIsRefreshing(true);
      const res = await fetch('/api/guilds');
      if (res.ok) {
        const data = await res.json();
        setGuilds(data.guilds || []);
      }
    } catch (err) {
      console.error('Error fetching guilds:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchGuilds();
    } else if (authStatus === 'unauthenticated') {
      router.push('/login');
    }
  }, [authStatus]);

  const filtered = guilds.filter((g) =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const installed = filtered.filter((g) => g.botInstalled);
  const uninstalled = filtered.filter((g) => !g.botInstalled);

  return (
    <div className="min-h-screen bg-[#FAF9F5] text-[#101828] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EADFC7] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Multi-Tenant Operations</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#101828]">
              Select Server
            </h1>
            <p className="text-sm text-[#667085] mt-1">
              Choose a Discord server to manage, or invite KRAXXBot to a new community.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchGuilds}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F3F4F6] text-xs font-medium text-[#475467] transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search servers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E7EB] focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-sm text-[#101828] placeholder-[#98A2B3] transition-all outline-none shadow-2xs"
          />
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin mb-3" />
            <p className="text-sm font-medium text-[#475467]">Loading your Discord servers...</p>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Active Installed Servers */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>KRAXXBot Enabled Servers ({installed.length})</span>
                </h2>
              </div>

              {installed.length === 0 ? (
                <div className="p-8 rounded-2xl bg-white border border-dashed border-[#D1D5DB] text-center">
                  <Server className="w-8 h-8 text-[#98A2B3] mx-auto mb-2" />
                  <p className="text-sm font-medium text-[#101828]">No active servers found</p>
                  <p className="text-xs text-[#667085] mt-1">
                    Invite KRAXXBot to any of your manageable servers below to get started.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {installed.map((guild) => (
                    <Link
                      key={guild.id}
                      href={`/dashboard/${guild.id}`}
                      className="group p-5 rounded-2xl bg-white border border-[#EADFC7]/70 hover:border-amber-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden"
                    >
                      <div className="flex items-start gap-3.5">
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`}
                            alt={guild.name}
                            className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-700 text-white font-bold text-lg flex items-center justify-center flex-shrink-0">
                            {guild.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-[#101828] truncate group-hover:text-amber-800 transition-colors">
                            {guild.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {guild.owner && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                <Crown className="w-3 h-3 text-amber-600" /> Owner
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Active
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#F1F3F9] flex items-center justify-between text-xs font-semibold text-amber-700 group-hover:text-amber-800">
                        <span>Open Dashboard</span>
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Uninstalled Servers */}
            {uninstalled.length > 0 && (
              <section className="space-y-4 pt-4 border-t border-[#EADFC7]/60">
                <div>
                  <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
                    <Plus className="w-5 h-5 text-amber-600" />
                    <span>Invite to Other Servers ({uninstalled.length})</span>
                  </h2>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Servers where you have Admin or Manage Server rights, but KRAXXBot has not been added yet.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {uninstalled.map((guild) => (
                    <div
                      key={guild.id}
                      className="p-5 rounded-2xl bg-white border border-[#E5E7EB] hover:border-[#D1D5DB] transition-all flex flex-col justify-between"
                    >
                      <div className="flex items-start gap-3.5">
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`}
                            alt={guild.name}
                            className="w-12 h-12 rounded-xl object-cover opacity-80 border border-[#E5E7EB] flex-shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-gray-200 text-gray-700 font-bold text-lg flex items-center justify-center flex-shrink-0">
                            {guild.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-semibold text-[#101828] truncate">
                            {guild.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            {guild.owner && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[#475467] bg-gray-100 px-2 py-0.5 rounded-full">
                                <Crown className="w-3 h-3 text-amber-600" /> Owner
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-[#F1F3F9]">
                        <a
                          href={guild.inviteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full inline-flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100/80 border border-amber-200 text-amber-900 text-xs font-semibold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add KRAXXBot</span>
                          <ExternalLink className="w-3 h-3 text-amber-700" />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
