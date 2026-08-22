'use client';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonCard } from '@/components/ui/Skeleton';
import {
  Search,
  ArrowRight,
  Ticket,
  CheckSquare,
  Calendar,
  Clock,
  Activity,
  User,
  ExternalLink,
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
        return <Ticket className="w-3.5 h-3.5 text-[#22D3EE]" />;
      case 'TASK':
        return <CheckSquare className="w-3.5 h-3.5 text-[#10B981]" />;
      case 'MEETING':
        return <Calendar className="w-3.5 h-3.5 text-[#818CF8]" />;
      case 'REMINDER':
        return <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />;
      case 'AUDIT':
        return <Activity className="w-3.5 h-3.5 text-[#EF4444]" />;
      default:
        return <User className="w-3.5 h-3.5 text-[#64748B]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="OMNI-TELEMETRY SEARCH"
        subtitle="Global Query Across Platform Records, Tickets, Tasks, Logs & Schedules"
      />

      <div className="p-4 sm:p-6 max-w-4xl w-full mx-auto space-y-5">
        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#22D3EE]" />
          <input
            type="text"
            placeholder="Search ticket #, task name, meeting title, user ID, audit event..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-28 py-3 rounded-md bg-[#0A0F16] border border-[#16202E] text-xs font-mono text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-[#22D3EE]/50 shadow-inner"
            autoFocus
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded bg-[#22D3EE] text-[#05070B] font-mono font-bold text-xs hover:bg-[#22D3EE]/90 transition-all uppercase tracking-wider"
          >
            {isSearching ? 'SEARCHING' : 'EXECUTE'}
          </button>
        </form>

        {/* Results Container */}
        {hasSearched && (
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <CardTitle className="flex items-center justify-between w-full">
                <span className="flex items-center gap-2">
                  <Search className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>SEARCH RESULTS ({results.length})</span>
                </span>
                <span className="text-[10px] font-mono text-[#64748B]">QUERY: &quot;{query}&quot;</span>
              </CardTitle>
            </CardHeader>

            {isSearching ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : results.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Search}
                  title="NO MATCHING RECORDS FOUND"
                  description="Your query did not match any active platform records."
                />
              </div>
            ) : (
              <div className="divide-y divide-[#16202E] font-mono text-xs">
                {results.map((r, idx) => (
                  <Link
                    key={`${r.id}-${idx}`}
                    href={r.url}
                    className="p-3.5 flex items-center justify-between hover:bg-[#0D131C] transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-[#070B10] border border-[#16202E]">
                        {getIcon(r.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#F1F5F9] group-hover:text-[#22D3EE] transition-colors">
                            {r.title}
                          </span>
                          <Badge variant="neutral">{r.type}</Badge>
                        </div>
                        <div className="text-[11px] text-[#64748B] mt-0.5">{r.subtitle}</div>
                      </div>
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#64748B] group-hover:text-[#22D3EE] group-hover:translate-x-1 transition-all" />
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
