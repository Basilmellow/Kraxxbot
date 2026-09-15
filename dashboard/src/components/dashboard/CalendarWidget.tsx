'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { ChevronLeft, ChevronRight, Calendar, Video, Clock } from 'lucide-react';
import Link from 'next/link';

interface MeetingItem {
  id: string;
  title: string;
  time: string;
  location: string;
  color: string;
}

const DEFAULT_MEETINGS: MeetingItem[] = [
  {
    id: '1',
    title: 'UI/UX Review Meeting',
    time: '10:00 AM',
    location: 'HQ Voice',
    color: 'bg-indigo-500',
  },
  {
    id: '2',
    title: 'KRAXXSEC Weekly Sync',
    time: '3:00 PM',
    location: 'Security Channel',
    color: 'bg-emerald-500',
  },
];

export function CalendarWidget() {
  const [currentDate, setCurrentDate] = useState(new Date(2026, 2, 26)); // March 2026

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  // Days in month calculation for March 2026 (starts on Sunday, 31 days)
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const selectedDay = 26;
  const eventDays = [4, 12, 19, 26];

  return (
    <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between h-full">
      {/* Calendar Header */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[#F1F3F9]">
          <h3 className="text-sm font-semibold text-[#101828]">
            Calendar Overview
          </h3>
          <div className="flex items-center gap-1">
            <button
              className="p-1 rounded-md text-[#667085] hover:text-[#101828] hover:bg-[#F3F5FA] transition-colors"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-[#101828] px-1">
              March 2026
            </span>
            <button
              className="p-1 rounded-md text-[#667085] hover:text-[#101828] hover:bg-[#F3F5FA] transition-colors"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Days of week header */}
        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-[#98A2B3] mb-1.5">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {daysInMonth.map((day) => {
            const isSelected = day === selectedDay;
            const hasEvent = eventDays.includes(day);

            return (
              <div
                key={day}
                className={`py-1.5 rounded-lg font-medium cursor-pointer transition-all relative flex flex-col items-center justify-center ${
                  isSelected
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : hasEvent
                    ? 'text-[#101828] font-semibold hover:bg-indigo-50'
                    : 'text-[#475467] hover:bg-[#F3F5FA]'
                }`}
              >
                <span>{day}</span>
                {hasEvent && !isSelected && (
                  <span className="w-1 h-1 rounded-full bg-indigo-600 mt-0.5" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming Meetings List */}
      <div className="mt-4 pt-3.5 border-t border-[#F1F3F9] space-y-2.5">
        <div className="text-[11px] font-semibold text-[#667085] flex items-center justify-between">
          <span>Today • Mar 26, 2026</span>
          <Link
            href="/dashboard/meetings"
            className="text-indigo-600 hover:text-indigo-700 font-medium hover:underline text-[10px]"
          >
            All Meetings
          </Link>
        </div>

        {DEFAULT_MEETINGS.map((meeting) => (
          <div
            key={meeting.id}
            className="flex items-center justify-between p-2.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`w-2 h-2 rounded-full ${meeting.color} flex-shrink-0`} />
              <div className="min-w-0">
                <div className="font-semibold text-[#101828] truncate">
                  {meeting.title}
                </div>
                <div className="text-[10px] text-[#667085] truncate">
                  {meeting.location}
                </div>
              </div>
            </div>

            <div className="text-[11px] font-mono text-[#475467] flex-shrink-0">
              {meeting.time}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
