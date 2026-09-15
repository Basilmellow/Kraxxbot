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
        return <Ticket className="w-4 h-4 text-indigo-600" />;
      case 'TASK':
        return <CheckSquare className="w-4 h-4 text-emerald-600" />;
      case 'MEETING':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'REMINDER':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'AUDIT':
        return <Activity className="w-4 h-4 text-red-600" />;
      default:
        return <User className="w-4 h-4 text-[#667085]" />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Omni-Telemetry Search"
        subtitle="Global Query Across Platform Records, Tickets, Tasks, Logs & Schedules"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
        {/* Search Input Bar */}
        <form onSubmit={handleSearch} className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            placeholder="Search ticket #, task name, meeting title, user ID, audit event..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-28 py-3 rounded-2xl bg-white border border-[#E5E7EB] text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-xs"
            autoFocus
          />
          <button
            type="submit"
            disabled={isSearching}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 transition-all shadow-2xs"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Results Section */}
        {isSearching ? (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : hasSearched && results.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No search results found"
            description={`No operational records matching "${query}".`}
          />
        ) : (
          <div className="space-y-3">
            {results.map((r, idx) => (
              <Link key={idx} href={r.url}>
                <Card className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-indigo-300 hover:shadow-xs transition-all flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                      {getIcon(r.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-[#101828]">
                          {r.title}
                        </span>
                        <Badge variant="neutral" className="text-[10px]">
                          {r.type}
                        </Badge>
                      </div>
                      <p className="text-xs text-[#667085] mt-0.5">
                        {r.subtitle}
                      </p>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#98A2B3] group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
