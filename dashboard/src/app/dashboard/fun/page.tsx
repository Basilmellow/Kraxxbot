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
  Terminal,
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
    <div className="flex-1 flex flex-col min-w-0">
      <Topbar
        title="GAMIFICATION & CTF CHALLENGES"
        subtitle="Lightweight Experience Calculations, CTF Challenges & Operational Lottery"
      />

      <div className="p-4 sm:p-6 max-w-7xl w-full mx-auto space-y-5 font-mono text-xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module 1: XP & Activity Leveling */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>OPERATOR XP & ACTIVITY ENGINE</span>
                </CardTitle>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#94A3B8]">
                  <input
                    type="checkbox"
                    checked={xpEnabled}
                    onChange={(e) => setXpEnabled(e.target.checked)}
                    className="accent-[#22D3EE]"
                  />
                  <span>Active</span>
                </label>
              </div>
            </CardHeader>

            <div className="space-y-3 pt-2">
              <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                Calculates operator operational participation in Discord channels to compute ranks and achievement tiers.
              </p>

              <div className="p-3 rounded bg-[#070B10] border border-[#16202E] space-y-2">
                <div className="flex items-center justify-between text-[#F1F5F9]">
                  <span className="text-[#64748B]">GAIN RATE:</span>
                  <span className="text-[#22D3EE] font-bold">15-25 XP / msg</span>
                </div>
                <div className="flex items-center justify-between text-[#F1F5F9]">
                  <span className="text-[#64748B]">COOLDOWN INTERVAL:</span>
                  <span>60 seconds</span>
                </div>
                <div className="flex items-center justify-between text-[#F1F5F9]">
                  <span className="text-[#64748B]">TIER REWARDS:</span>
                  <span className="text-[#10B981]">Level 5, 10, 25, 50</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Module 2: CTF & Technical Trivia */}
          <Card className="bg-[#0A0F16]">
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>CTF & SECURITY TRIVIA DISPATCH</span>
                </CardTitle>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#94A3B8]">
                  <input
                    type="checkbox"
                    checked={triviaEnabled}
                    onChange={(e) => setTriviaEnabled(e.target.checked)}
                    className="accent-[#22D3EE]"
                  />
                  <span>Active</span>
                </label>
              </div>
            </CardHeader>

            <div className="space-y-3 pt-2">
              <p className="text-[11px] text-[#94A3B8] font-sans leading-relaxed">
                Automated cyber defense, cryptography, and reverse engineering challenge prompts dispatched to community channels.
              </p>

              <div className="p-3 rounded bg-[#070B10] border border-[#16202E] space-y-2">
                <div className="flex items-center justify-between text-[#F1F5F9]">
                  <span className="text-[#64748B]">SCHEDULE CADENCE:</span>
                  <span className="text-[#22D3EE]">Daily at 14:00 UTC</span>
                </div>
                <div className="flex items-center justify-between text-[#F1F5F9]">
                  <span className="text-[#64748B]">CATEGORIES:</span>
                  <span>Cryptography, Forensics, Networking</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Module 3: Operational Decision Randomizer */}
          <Card className="bg-[#0A0F16] lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dices className="w-3.5 h-3.5 text-[#22D3EE]" />
                <span>OPERATIONAL DECISION RANDOMIZER</span>
              </CardTitle>
            </CardHeader>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[10px] text-[#94A3B8] uppercase mb-1">
                  COMMA-SEPARATED CHOICES
                </label>
                <input
                  type="text"
                  value={pickerInput}
                  onChange={(e) => setPickerInput(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#070B10] border border-[#16202E] text-xs text-[#F1F5F9] focus:outline-none focus:border-[#22D3EE]/50"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="primary" size="sm" onClick={handlePick} className="font-mono text-xs">
                  EXECUTE PSEUDO-RANDOM PICK
                </Button>

                {pickerResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-[#64748B]">SELECTED:</span>
                    <Badge variant="brand">{pickerResult}</Badge>
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
