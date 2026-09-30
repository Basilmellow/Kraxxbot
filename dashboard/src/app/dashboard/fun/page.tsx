'use client';

import { PageContainer } from '@/components/ui/Page';
import { Checkbox, Input } from '@/components/ui/Form';

import React, { useState } from 'react';
import { Topbar } from '@/components/layout/Topbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Trophy, Dices, HelpCircle } from 'lucide-react';

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
        title="Fun utilities"
        subtitle="Explore experience calculations and challenges."
      />

      <PageContainer className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Module 1: XP & Activity Leveling */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  Operator XP & Activity Engine
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text-secondary)]">
                <Checkbox

                  checked={xpEnabled}
                  onChange={(e) => setXpEnabled(e.target.checked)}
                  className=""
                />
                <span>Active</span>
              </label>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Calculates operator participation in Discord channels to compute ranks and achievement tiers automatically.
            </p>

            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Gain Rate:</span>
                <span className="text-[var(--accent)] font-bold">15-25 XP / message</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Cooldown Interval:</span>
                <span className="text-[var(--text-primary)] font-medium">60 seconds</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Tier Milestones:</span>
                <span className="text-[var(--success)] font-bold">Level 5, 10, 25, 50</span>
              </div>
            </div>
          </Card>

          {/* Module 2: CTF & Technical Trivia */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-base)]">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[var(--accent)]" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                  CTF & Security Trivia Dispatch
                </h3>
              </div>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[var(--text-secondary)]">
                <Checkbox

                  checked={triviaEnabled}
                  onChange={(e) => setTriviaEnabled(e.target.checked)}
                  className=""
                />
                <span>Active</span>
              </label>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed">
              Automated trivia drops featuring cybersecurity, operational protocols, and systems logic questions.
            </p>

            <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border-base)] space-y-3 text-[13px]">
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Categories:</span>
                <span className="text-[var(--text-primary)] font-medium">Cybersecurity, Networking, Cryptography</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Dispatch Schedule:</span>
                <span className="text-[var(--accent)] font-bold">Daily at 14:00 UTC</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--text-secondary)]">Correct Reward:</span>
                <span className="text-[var(--success)] font-bold">+100 Operator XP</span>
              </div>
            </div>
          </Card>

          {/* Module 3: Operational Random Picker */}
          <Card className="bg-[var(--surface-1)] border border-[var(--border-base)] rounded-xl p-6  space-y-4 lg:col-span-2">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--border-base)]">
              <Dices className="w-4 h-4 text-[var(--accent)]" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Randomized Decision Engine / Team Selector
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block font-semibold text-[var(--text-secondary)] mb-1">
                  Comma-Separated Candidates / Teams
                </label>
                <Input aria-label="Comma-Separated Candidates / Teams"
                  type="text"
                  value={pickerInput}
                  onChange={(e) => setPickerInput(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handlePick}
                  className="gap-2"
                >
                  <Dices className="w-4 h-4" />
                  <span>Execute Random Selection</span>
                </Button>

                {pickerResult && (
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] text-[var(--text-secondary)]">Selected:</span>
                    <Badge variant="brand" className="text-[13px] py-1 px-3">
                      {pickerResult}
                    </Badge>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </PageContainer>
    </div>
  );
}
