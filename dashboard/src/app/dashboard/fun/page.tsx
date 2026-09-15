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
  Award,
} from 'lucide-react';

export default function EntertainmentPage() {
  const [xpEnabled, setXpEnabled] = useState(true);
  const [triviaEnabled, setTriviaEnabled] = useState(true);

  // Random picker state
  const [pickerInput, setPickerInput] = useState('Alpha Team, Bravo Team, Charlie Team, Delta Team');
  const [pickerResult, setPickerResult] = useState<string | null>(null);

  const handlePick = () => {
    const items = pickerInput.split(',').map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return;
    const chosen = items[Math.floor(Math.random() * items.length)];
    setPickerResult(chosen);
  };

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="Gamification & CTF Challenges"
        subtitle="Lightweight Experience Calculations, CTF Challenges & Operational Lottery"
      />

      <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] w-full mx-auto space-y-6 text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module 1: XP & Activity Leveling */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  Operator XP & Activity Engine
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#344054]">
                <input
                  type="checkbox"
                  checked={xpEnabled}
                  onChange={(e) => setXpEnabled(e.target.checked)}
                  className="accent-indigo-600 rounded"
                />
                <span>Active</span>
              </label>
            </div>

            <p className="text-xs text-[#667085] leading-relaxed">
              Calculates operator participation in Discord channels to compute ranks and achievement tiers automatically.
            </p>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Gain Rate:</span>
                <span className="text-indigo-600 font-bold">15-25 XP / message</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Cooldown Interval:</span>
                <span className="text-[#101828] font-medium">60 seconds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Tier Milestones:</span>
                <span className="text-emerald-600 font-bold">Level 5, 10, 25, 50</span>
              </div>
            </div>
          </Card>

          {/* Module 2: CTF & Technical Trivia */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F1F3F9]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-semibold text-[#101828]">
                  CTF & Security Trivia Dispatch
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#344054]">
                <input
                  type="checkbox"
                  checked={triviaEnabled}
                  onChange={(e) => setTriviaEnabled(e.target.checked)}
                  className="accent-indigo-600 rounded"
                />
                <span>Active</span>
              </label>
            </div>

            <p className="text-xs text-[#667085] leading-relaxed">
              Automated trivia drops featuring cybersecurity, operational protocols, and systems logic questions.
            </p>

            <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Categories:</span>
                <span className="text-[#101828] font-medium">Cybersecurity, Networking, Cryptography</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Dispatch Schedule:</span>
                <span className="text-indigo-600 font-bold">Daily at 14:00 UTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#667085]">Correct Reward:</span>
                <span className="text-emerald-600 font-bold">+100 Operator XP</span>
              </div>
            </div>
          </Card>

          {/* Module 3: Operational Random Picker */}
          <Card className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-xs space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-3 border-b border-[#F1F3F9]">
              <Dices className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-semibold text-[#101828]">
                Randomized Decision Engine / Team Selector
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Comma-Separated Candidates / Teams
                </label>
                <input
                  type="text"
                  value={pickerInput}
                  onChange={(e) => setPickerInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePick}
                  className="gap-1.5"
                >
                  <Dices className="w-3.5 h-3.5" />
                  <span>Execute Random Selection</span>
                </Button>

                {pickerResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#667085]">Selected:</span>
                    <Badge variant="brand" className="text-xs py-1 px-3">
                      {pickerResult}
                    </Badge>
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
