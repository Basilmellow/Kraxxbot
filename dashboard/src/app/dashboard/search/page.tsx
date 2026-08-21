'use client';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Search,
  ArrowRight,
  Ticket,
  CheckSquare,
  Calendar,
  Clock,
  Activity,
  User,
} from 'lucide-react';
import Link from 'next/link';

interface SearchResult {
  type: 'TICKET' | 'TASK' | 'MEETING' | 'REMINDER' | 'AUDIT' | 'MEMBER';
  id: string;
  title: string;
  subtitle: string;
  url: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      }
    } catch (e) {
      console.error('Search failed:', e);
    } finally {
      setIsSearching(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'TICKET':
        return <Ticket className="w-4 h-4 text-[#00f0ff]" />;
      case 'TASK':
        return <CheckSquare className="w-4 h-4 text-[#10b981]" />;
      case 'MEETING':
        return <Calendar className="w-4 h-4 text-[#6366f1]" />;
      case 'REMINDER':
        return <Clock className="w-4 h-4 text-[#f59e0b]" />;
      case 'AUDIT':
        return <Activity className="w-4 h-4 text-[#ef4444]" />;
      default:
        return <User className="w-4 h-4 text-[#64748b]" />;
    }
  };

  return (
    <div>
      <Topbar
        title="Global Operations Search"
        subtitle="Omni-Query Across All Platform Tickets, Tasks, Meetings, Reminders & Logs"
      />

      <div className="p-6 space-y-6 max-w-4xl mx-auto">
        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#00f0ff]" />
          <input
            type="text"
            placeholder="Search anything (e.g. ticket code, task name, meeting title, user ID, audit event)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-28 py-3.5 rounded-2xl bg-[#0f1318] border border-[#1e2a38] text-sm text-[#e2e8f0] focus:outline-none focus:border-[#00f0ff] focus:shadow-[0_0_20px_rgba(0,240,255,0.15)] transition-all font-sans"
            autoFocus
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-xl bg-[#00f0ff] text-[#0a0e15] font-bold text-xs hover:bg-[#00d0df] transition-all"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results Container */}
        {hasSearched && (
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-[#1e2a38] flex items-center justify-between">
              <span className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">
                Matching Results ({results.length})
              </span>
              <span className="text-[11px] text-[#64748b] font-mono">
                Realtime Indexed Query
              </span>
            </div>

            {results.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#64748b]">
                No records matched your search query &quot;{query}&quot;.
              </div>
            ) : (
              <div className="divide-y divide-[#1e2a38]">
                {results.map((r, i) => (
                  <Link
                    key={`${r.type}-${r.id}-${i}`}
                    href={r.url}
                    className="p-4 flex items-center justify-between gap-4 hover:bg-[#141a22] transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#0a0e15] border border-[#1e2a38]">
                        {getIcon(r.type)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[#e2e8f0] group-hover:text-[#00f0ff] transition-colors">
                          {r.title}
                        </div>
                        <div className="text-xs text-[#64748b] font-mono">{r.subtitle}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="neutral">{r.type}</Badge>
                      <ArrowRight className="w-4 h-4 text-[#64748b] group-hover:text-[#00f0ff] group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
