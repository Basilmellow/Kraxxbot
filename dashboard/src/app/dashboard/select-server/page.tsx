'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Server, ShieldCheck, Plus, ArrowRight, Search, ExternalLink, Crown, RefreshCw } from 'lucide-react';
import { ManagedGuild, getBotInviteUrl } from '@/lib/discord';

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

  const filtered = guilds.filter(g =>
    g.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const installed = filtered.filter(g => g.botInstalled);
  const uninstalled = filtered.filter(g => !g.botInstalled);

  const S: Record<string, React.CSSProperties> = {
    root: {
      minHeight: '100vh',
      background: '#090908',
      color: '#F3F0E9',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      WebkitFontSmoothing: 'antialiased',
    },
    inner: {
      maxWidth: '900px',
      margin: '0 auto',
      padding: '3rem 1.5rem 4rem',
    },
    pageHeader: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: '1rem',
      marginBottom: '2rem',
      flexWrap: 'wrap' as const,
    },
    badge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.25rem 0.625rem',
      borderRadius: '9999px',
      background: 'rgba(201, 166, 107, 0.08)',
      border: '1px solid rgba(201, 166, 107, 0.2)',
      fontSize: '0.6875rem',
      fontWeight: 700,
      color: '#C9A66B',
      letterSpacing: '0.05em',
      textTransform: 'uppercase' as const,
      marginBottom: '0.625rem',
    },
    title: {
      fontSize: '1.5rem',
      fontWeight: 800,
      color: '#F3F0E9',
      letterSpacing: '-0.02em',
      marginBottom: '0.25rem',
    },
    subtitle: {
      fontSize: '0.875rem',
      color: '#716D65',
    },
    refreshBtn: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      padding: '0.5rem 0.875rem',
      borderRadius: '8px',
      background: '#161614',
      border: '1px solid #2A2925',
      color: '#A8A49B',
      fontSize: '0.8125rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.12s',
      fontFamily: 'inherit',
    },
    searchWrap: {
      position: 'relative' as const,
      marginBottom: '2.5rem',
    },
    searchInput: {
      width: '100%',
      padding: '0.625rem 0.875rem 0.625rem 2.375rem',
      background: '#161614',
      border: '1px solid #2A2925',
      borderRadius: '10px',
      color: '#F3F0E9',
      fontSize: '0.875rem',
      fontFamily: 'inherit',
      outline: 'none',
      transition: 'border-color 0.12s',
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '0.75rem',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#716D65',
      pointerEvents: 'none' as const,
    },
    sectionLabel: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontSize: '0.875rem',
      fontWeight: 700,
      color: '#A8A49B',
      marginBottom: '1rem',
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
      gap: '0.75rem',
    },
    guildCardInstalled: {
      display: 'flex',
      flexDirection: 'column' as const,
      background: '#161614',
      border: '1px solid #2A2925',
      borderRadius: '12px',
      padding: '1.25rem',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'all 0.12s',
      cursor: 'pointer',
    },
    guildCardUninstalled: {
      display: 'flex',
      flexDirection: 'column' as const,
      background: '#0F0F0E',
      border: '1px solid #1D1C19',
      borderRadius: '12px',
      padding: '1.25rem',
    },
    guildAvatar: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      objectFit: 'cover' as const,
      flexShrink: 0,
    },
    guildAvatarFallback: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      background: 'rgba(201, 166, 107, 0.12)',
      border: '1px solid rgba(201, 166, 107, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.125rem',
      fontWeight: 800,
      color: '#C9A66B',
      flexShrink: 0,
    },
    guildAvatarFallbackDim: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      background: '#1D1C19',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.125rem',
      fontWeight: 800,
      color: '#4A4742',
      flexShrink: 0,
    },
    guildName: {
      fontSize: '0.9375rem',
      fontWeight: 700,
      color: '#F3F0E9',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    guildNameDim: {
      fontSize: '0.9375rem',
      fontWeight: 600,
      color: '#716D65',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap' as const,
    },
    divider: {
      height: '1px',
      background: '#1D1C19',
      margin: '1rem 0 0',
    },
    cardFooterInstalled: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: '0.875rem',
      fontSize: '0.8125rem',
      fontWeight: 700,
      color: '#C9A66B',
    },
    addBtn: {
      width: '100%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.375rem',
      padding: '0.5rem',
      borderRadius: '8px',
      background: 'transparent',
      border: '1px solid #2A2925',
      color: '#716D65',
      fontSize: '0.8125rem',
      fontWeight: 600,
      textDecoration: 'none',
      marginTop: '0.875rem',
      transition: 'all 0.12s',
    },
    emptyState: {
      padding: '3rem 1rem',
      borderRadius: '12px',
      border: '1px dashed #2A2925',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center' as const,
      gap: '0.5rem',
    },
    sectionDivider: {
      height: '1px',
      background: '#1D1C19',
      margin: '2.5rem 0',
    },
    spinner: {
      width: '28px',
      height: '28px',
      border: '2px solid #2A2925',
      borderTopColor: '#C9A66B',
      borderRadius: '50%',
      animation: 'spin 0.75s linear infinite',
      margin: '0 auto 1rem',
    },
  };

  return (
    <div style={S.root}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={S.inner}>
        {/* Header */}
        <div style={S.pageHeader}>
          <div>
            <div style={S.badge}>
              <ShieldCheck style={{ width: '11px', height: '11px' }} />
              Server Selection
            </div>
            <h1 style={S.title}>Your Servers</h1>
            <p style={S.subtitle}>
              Select a server to manage, or invite KRAXXBot to a new community.
            </p>
          </div>

          <button
            onClick={fetchGuilds}
            disabled={isRefreshing}
            style={S.refreshBtn}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#1D1C19';
              e.currentTarget.style.color = '#F3F0E9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#161614';
              e.currentTarget.style.color = '#A8A49B';
            }}
          >
            <RefreshCw style={{ width: '13px', height: '13px', ...(isRefreshing ? { animation: 'spin 0.75s linear infinite' } : {}) }} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Search */}
        <div style={S.searchWrap}>
          <Search style={{ width: '15px', height: '15px', ...S.searchIcon }} />
          <input
            type="text"
            placeholder="Search servers..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={S.searchInput}
            onFocus={e => { e.currentTarget.style.borderColor = '#C9A66B'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#2A2925'; }}
          />
        </div>

        {/* Loading */}
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center' }}>
            <div style={S.spinner} />
            <p style={{ fontSize: '0.875rem', color: '#716D65' }}>Loading your servers...</p>
          </div>
        ) : (
          <>
            {/* Installed Servers */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={S.sectionLabel}>
                <ShieldCheck style={{ width: '15px', height: '15px', color: '#22C55E' }} />
                <span>KRAXXBot Installed</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.2)', color: '#22C55E' }}>
                  {installed.length}
                </span>
              </div>

              {installed.length === 0 ? (
                <div style={S.emptyState}>
                  <Server style={{ width: '28px', height: '28px', color: '#4A4742', marginBottom: '0.25rem' }} />
                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#A8A49B' }}>No active servers found</p>
                  <p style={{ fontSize: '0.8125rem', color: '#716D65' }}>
                    Add KRAXXBot to one of your servers below to get started.
                  </p>
                </div>
              ) : (
                <div style={S.grid}>
                  {installed.map(guild => (
                    <Link
                      key={guild.id}
                      href={`/dashboard/${guild.id}`}
                      style={S.guildCardInstalled}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = 'rgba(201, 166, 107, 0.4)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = '#2A2925';
                        e.currentTarget.style.transform = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {guild.icon ? (
                          <img
                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`}
                            alt={guild.name}
                            style={S.guildAvatar}
                          />
                        ) : (
                          <div style={S.guildAvatarFallback}>
                            {guild.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={S.guildName}>{guild.name}</div>
                          <div style={{ display: 'flex', gap: '0.375rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {guild.owner && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, color: '#C9A66B', background: 'rgba(201, 166, 107, 0.08)', padding: '0.125rem 0.375rem', borderRadius: '9999px', border: '1px solid rgba(201, 166, 107, 0.2)' }}>
                                <Crown style={{ width: '10px', height: '10px' }} />
                                Owner
                              </span>
                            )}
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 700, color: '#22C55E', background: 'rgba(34, 197, 94, 0.08)', padding: '0.125rem 0.375rem', borderRadius: '9999px', border: '1px solid rgba(34, 197, 94, 0.2)' }}>
                              <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                              Active
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={S.cardFooterInstalled}>
                        <span>Open Dashboard</span>
                        <ArrowRight style={{ width: '15px', height: '15px' }} />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Uninstalled Servers */}
            {uninstalled.length > 0 && (
              <>
                <div style={S.sectionDivider} />
                <div>
                  <div style={S.sectionLabel}>
                    <Plus style={{ width: '15px', height: '15px', color: '#716D65' }} />
                    <span>Add to Server</span>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.125rem 0.5rem', borderRadius: '9999px', background: '#161614', border: '1px solid #2A2925', color: '#716D65' }}>
                      {uninstalled.length}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#716D65', marginBottom: '1rem' }}>
                    Servers where you have Admin or Manage Server rights, but KRAXXBot hasn't been added yet.
                  </p>

                  <div style={S.grid}>
                    {uninstalled.map(guild => (
                      <div key={guild.id} style={S.guildCardUninstalled}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {guild.icon ? (
                            <img
                              src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=96`}
                              alt={guild.name}
                              style={{ ...S.guildAvatar, opacity: 0.5 }}
                            />
                          ) : (
                            <div style={S.guildAvatarFallbackDim}>
                              {guild.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={S.guildNameDim}>{guild.name}</div>
                            {guild.owner && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.6875rem', fontWeight: 600, color: '#716D65', marginTop: '0.25rem' }}>
                                <Crown style={{ width: '10px', height: '10px' }} />
                                Owner
                              </span>
                            )}
                          </div>
                        </div>

                        <a
                          href={getBotInviteUrl(guild.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={S.addBtn}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'rgba(201, 166, 107, 0.08)';
                            e.currentTarget.style.borderColor = 'rgba(201, 166, 107, 0.3)';
                            e.currentTarget.style.color = '#C9A66B';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = '#2A2925';
                            e.currentTarget.style.color = '#716D65';
                          }}
                        >
                          <Plus style={{ width: '13px', height: '13px' }} />
                          <span>Add KRAXXBot</span>
                          <ExternalLink style={{ width: '11px', height: '11px' }} />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
