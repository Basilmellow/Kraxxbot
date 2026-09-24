'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useParams, useSearchParams } from 'next/navigation';
import {
  ChevronDown,
  Check,
  Plus,
  Server,
  ExternalLink,
  Layers,
  Loader2,
} from 'lucide-react';
import { ManagedGuild } from '@/lib/discord';

export function ServerSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const searchParams = useSearchParams();
  const pathMatch = pathname.match(/^\/dashboard\/(\d+)/);
  const currentGuildId = (params?.guildId as string) || pathMatch?.[1] || searchParams.get('guildId') || '';

  const [guilds, setGuilds] = useState<ManagedGuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    async function loadGuilds() {
      try {
        const res = await fetch('/api/guilds');
        if (res.ok) {
          const data = await res.json();
          if (mounted) {
            setGuilds(data.guilds || []);
            setLoadError(null);
          }
        } else if (mounted) {
          if (res.status === 401) {
            setLoadError('Your Discord session needs to be refreshed.');
          } else if (res.status === 403) {
            setLoadError('You are not authorized to view these servers.');
          } else {
            setLoadError('Unable to load servers. Please try again.');
          }
        }
      } catch (err) {
        console.error('Failed to load user guilds:', err);
        if (mounted) setLoadError('Unable to load servers. Please try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadGuilds();
    return () => {
      mounted = false;
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentGuild = guilds.find((g) => g.id === currentGuildId);
  const installedGuilds = guilds.filter((g) => g.botInstalled);
  const uninstalledGuilds = guilds.filter((g) => !g.botInstalled);

  const handleSelectGuild = (guildId: string) => {
    setIsOpen(false);
    if (pathMatch) {
      const subRoute = pathname.replace(/^\/dashboard\/\d+/, '');
      router.push(`/dashboard/${guildId}${subRoute}`);
      return;
    }
    if (pathname.startsWith('/dashboard/') && pathname !== '/dashboard/select-server') {
      router.push(`${pathname}?guildId=${guildId}`);
      return;
    }
    router.push(`/dashboard/${guildId}`);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#161614] border border-[#2A2925] hover:border-[#C9A66B] hover:bg-[#1D1C19] text-xs text-[#F3F0E9] font-medium transition-all group cursor-pointer"
        aria-label="Select Server"
        aria-expanded={isOpen}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
        ) : currentGuild ? (
          <>
            {currentGuild.icon ? (
              <img
                src={`https://cdn.discordapp.com/icons/${currentGuild.id}/${currentGuild.icon}.png?size=64`}
                alt={currentGuild.name}
                className="w-5 h-5 rounded-md object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-md bg-[#C9A66B] text-[#090908] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {currentGuild.name.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="max-w-[120px] sm:max-w-[160px] truncate font-semibold">
              {currentGuild.name}
            </span>
          </>
        ) : (
          <>
            <Server className="w-4 h-4 text-amber-600" />
            <span className="font-semibold text-[#A8A49B]">Select Server</span>
          </>
        )}
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#716D65] transition-transform duration-200 group-hover:text-[#F3F0E9] ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-[#161614] border border-[#2A2925] shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-[#2A2925] bg-[#10100F] flex items-center justify-between">
            <span className="text-[10px] font-bold tracking-wider text-[#C9A66B] uppercase px-2">
              Connected Servers
            </span>
            <Link
              href="/dashboard/select-server"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-[#C9A66B] hover:text-[#D8B77D] hover:underline px-2"
            >
              All Servers
            </Link>
          </div>

          <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
            {loadError ? (
              <div className="p-3 text-center text-xs text-[#EF4444]">
                {loadError}
              </div>
            ) : installedGuilds.length > 0 ? (
              installedGuilds.map((g) => {
                const isSelected = g.id === currentGuildId;
                return (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGuild(g.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#C9A66B]/10 text-[#D8B77D] font-semibold border border-[#C9A66B]/30'
                        : 'text-[#A8A49B] hover:bg-[#1D1C19] hover:text-[#F3F0E9]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {g.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`}
                          alt={g.name}
                          className="w-6 h-6 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-[#C9A66B] text-[#090908] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{g.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#C9A66B] flex-shrink-0" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-xs text-[#667085]">
                No servers currently have KRAXXBot installed.
              </div>
            )}

            {uninstalledGuilds.length > 0 && (
              <>
                <div className="pt-2 pb-1 px-2.5 text-[10px] font-bold tracking-wider text-[#716D65] uppercase border-t border-[#2A2925] mt-1.5">
                  Invite KRAXXBot
                </div>
                {uninstalledGuilds.slice(0, 5).map((g) => (
                  <a
                    key={g.id}
                    href={g.inviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs text-[#A8A49B] hover:bg-[#1D1C19] hover:text-[#F3F0E9] transition-colors group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {g.icon ? (
                        <img
                          src={`https://cdn.discordapp.com/icons/${g.id}/${g.icon}.png?size=64`}
                          alt={g.name}
                          className="w-6 h-6 rounded-lg object-cover opacity-70 group-hover:opacity-100 flex-shrink-0"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-lg bg-[#1D1C19] text-[#A8A49B] text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="truncate">{g.name}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#C9A66B] bg-[#C9A66B]/10 px-2 py-0.5 rounded-full border border-[#C9A66B]/25">
                      <Plus className="w-3 h-3" /> Add
                    </span>
                  </a>
                ))}
              </>
            )}
          </div>

          <div className="p-2 border-t border-[#2A2925] bg-[#10100F]">
            <Link
              href="/dashboard/select-server"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg text-xs font-semibold text-[#A8A49B] hover:text-[#F3F0E9] hover:bg-[#1D1C19] transition-colors border border-transparent hover:border-[#2A2925]"
            >
              <Layers className="w-3.5 h-3.5 text-[#C9A66B]" />
              <span>Manage All Servers Hub</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
