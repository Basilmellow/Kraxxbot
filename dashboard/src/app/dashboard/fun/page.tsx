'use client';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Gamepad2,
  Trophy,
  Dices,
  HelpCircle,
  Sparkles,
  CheckCircle2,
  Flame,
  Award,
} from 'lucide-react';

export default function EntertainmentPage() {
  const [xpEnabled, setXpEnabled] = useState(true);
  const [triviaEnabled, setTriviaEnabled] = useState(true);

  // Random picker state
  const [pickerInput, setPickerInput] = useState('Option Alpha, Option Bravo, Option Charlie');
  const [pickerResult, setPickerResult] = useState<string | null>(null);

  const handlePick = () => {
    const items = pickerInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    const chosen = items[Math.floor(Math.random() * items.length)];
    setPickerResult(chosen);
  };

  return (
    <div>
      <Topbar
        title="Entertainment & Community Engagement"
        subtitle="Optional Lightweight Gamification, Daily Challenges & Leaderboards"
      />

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module 1: XP & Activity Leveling */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                <Trophy className="w-4 h-4 text-[#00f0ff]" />
                <span>Experience & Member Levels</span>
              </CardTitle>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={xpEnabled}
                  onChange={(e) => setXpEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#1e2a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00f0ff]"></div>
              </label>
            </div>

            <p className="text-xs text-[#94a3b8]">
              Tracks message activity and operational participation in Discord channels to calculate member ranks and achievements.
            </p>

            <div className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[#e2e8f0]">
                <span>XP Gain Rate:</span>
                <span className="text-[#00f0ff]">15-25 XP / msg</span>
              </div>
              <div className="flex items-center justify-between text-[#e2e8f0]">
                <span>Cooldown Window:</span>
                <span>60 seconds</span>
              </div>
              <div className="flex items-center justify-between text-[#e2e8f0]">
                <span>Role Rewards:</span>
                <span className="text-[#10b981]">Level 5, 10, 25, 50</span>
              </div>
            </div>
          </Card>

          {/* Module 2: Technical Trivia & CTF Prompts */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <CardTitle>
                <HelpCircle className="w-4 h-4 text-[#00f0ff]" />
                <span>Technical Security & CTF Trivia</span>
              </CardTitle>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={triviaEnabled}
                  onChange={(e) => setTriviaEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-[#1e2a38] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#00f0ff]"></div>
              </label>
            </div>

            <p className="text-xs text-[#94a3b8]">
              Automated cyber defense, cryptography, and systems engineering daily challenge prompts for community channels.
            </p>

            <div className="p-3 rounded-lg bg-[#0f1318] border border-[#1e2a38] space-y-2 text-xs">
              <div className="flex items-center justify-between font-mono">
                <span className="text-[#e2e8f0]">Daily Challenge Time:</span>
                <span className="text-[#00f0ff]">12:00 UTC</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span className="text-[#e2e8f0]">Question Database:</span>
                <span>Security, Cloud, Network, Linux</span>
              </div>
            </div>
          </Card>

          {/* Module 3: Random Choice & Decision Tool */}
          <Card className="space-y-4 lg:col-span-2">
            <CardHeader>
              <CardTitle>
                <Dices className="w-4 h-4 text-[#00f0ff]" />
                <span>Random Choice & Decision Engine</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-3 text-xs">
              <p className="text-[#94a3b8]">
                Fair pseudo-random selector for raffles, team assignees, and project review order.
              </p>

              <div>
                <label className="block font-semibold text-[#94a3b8] mb-1 uppercase">Comma-Separated Options</label>
                <input
                  type="text"
                  value={pickerInput}
                  onChange={(e) => setPickerInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[#0f1318] border border-[#1e2a38] text-xs text-[#e2e8f0] font-mono focus:outline-none focus:border-[#00f0ff]/50"
                />
              </div>

              <div className="flex items-center gap-3">
                <Button variant="primary" size="sm" onClick={handlePick}>
                  <Dices className="w-4 h-4 mr-1" />
                  <span>Choose Random Item</span>
                </Button>

                {pickerResult && (
                  <div className="p-2 px-3 rounded-lg bg-[#00f0ff]/10 border border-[#00f0ff]/30 text-xs font-bold text-[#00f0ff] font-mono animate-fade-in">
                    Selected: {pickerResult}
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
