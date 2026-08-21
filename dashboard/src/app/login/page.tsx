'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Shield, Lock, AlertTriangle, CheckCircle2, ArrowRight, Radio, Server, Users, KeyRound, Sparkles } from 'lucide-react';

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    switch (error) {
      case 'OAuthSignin':
      case 'OAuthCallback':
        return {
          title: 'Discord OAuth2 Callback Error',
          detail: 'Failed to complete Discord authentication. Please verify the OAuth2 redirect URI in Discord Developer Portal matches https://kraxxbot.kraxxsec.com/api/auth/callback/discord',
        };
      case 'AccessDenied':
        return {
          title: 'Guild Access Restricted',
          detail: 'Access requires verified membership in the KRAXX HQ Discord server. Please join the guild and retry.',
        };
      case 'Configuration':
        return {
          title: 'Server Auth Configuration Error',
          detail: 'There is a problem with the authentication server configuration (NEXTAUTH_URL or secrets).',
        };
      case 'OAuthCreateAccount':
      case 'EmailCreateAccount':
      case 'Callback':
        return {
          title: 'Authentication Callback Error',
          detail: 'Could not finalize session. Please verify your Discord connection and try again.',
        };
      default:
        return {
          title: 'Authentication Error',
          detail: `An error occurred during authentication (${error}). Please try again.`,
        };
    }
  };

  const authError = getErrorMessage(errorParam);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn('discord', { callbackUrl: '/dashboard' });
    } catch (err) {
      console.error('[Login] OAuth sign-in trigger error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#03070d] flex items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden select-none">
      {/* Background Ambient Lighting & Gradients */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#00f0ff]/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#6366f1]/15 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#10b981]/5 rounded-full blur-[160px] pointer-events-none" />

      {/* Cyber Grid Background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e2a3820_1px,transparent_1px),linear-gradient(to_bottom,#1e2a3820_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        {/* Top Status Header */}
        <div className="flex items-center justify-between px-3 py-2 mb-3 text-[11px] font-mono tracking-wider text-[#64748b]">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10b981]"></span>
            </span>
            <span className="text-[#94a3b8]">SYSTEM STATUS:</span>
            <span className="text-[#10b981] font-semibold">ALL SYSTEMS NOMINAL</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-[#64748b]">
            <Radio className="w-3 h-3 text-[#00f0ff] animate-pulse" />
            <span>HQ GATEWAY v2.0</span>
          </div>
        </div>

        {/* Main Brand Card */}
        <div className="relative rounded-3xl p-7 sm:p-9 bg-[#0a0e17]/90 backdrop-blur-2xl border border-[#1e2a38] shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden transition-all duration-300 hover:border-[#00f0ff]/40">
          {/* Top Neon Accent Glow Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent opacity-80" />

          {/* Brand Header */}
          <div className="text-center mb-8">
            {/* Holographic Logo Shield */}
            <div className="flex justify-center mb-5">
              <div className="relative group cursor-default">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#00f0ff] via-[#6366f1] to-[#10b981] rounded-2xl blur-md opacity-70 group-hover:opacity-100 transition duration-500 group-hover:duration-200 animate-gradient" />
                <div className="relative w-16 h-16 rounded-2xl bg-[#070b12] border border-[#00f0ff]/40 flex items-center justify-center shadow-inner">
                  <span className="font-black text-3xl tracking-tighter bg-gradient-to-br from-[#00f0ff] to-[#6366f1] bg-clip-text text-transparent">
                    K
                  </span>
                </div>
              </div>
            </div>

            {/* Title & Tagline */}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#f1f5f9] tracking-tight flex items-center justify-center gap-2">
              KRAXX <span className="text-[#00f0ff] drop-shadow-[0_0_12px_rgba(0,240,255,0.4)]">OPERATIONS</span>
            </h1>
            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1.5 font-medium tracking-wide">
              INTERNAL OPERATIONAL MANAGEMENT PLATFORM
            </p>

            {/* Division Badges */}
            <div className="flex items-center justify-center gap-2 mt-3.5 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#10b981]/10 text-[#10b981] border border-[#10b981]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                KRAXXSEC
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#6366f1]/10 text-[#a5b4fc] border border-[#6366f1]/30">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                KRAXX STUDIO
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-mono font-semibold bg-[#00f0ff]/10 text-[#00f0ff] border border-[#00f0ff]/30">
                <Sparkles className="w-3 h-3 text-[#00f0ff]" />
                PROD
              </span>
            </div>
          </div>

          {/* Error Banner (if any) */}
          {authError && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-left flex items-start gap-3.5 shadow-[0_0_20px_rgba(239,68,68,0.15)] animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-semibold text-red-200">{authError.title}</h4>
                <p className="text-[11px] text-red-300/80 mt-1 leading-relaxed">{authError.detail}</p>
              </div>
            </div>
          )}

          {/* Authorization Notice */}
          <div className="mb-6 p-3.5 rounded-2xl bg-[#0f1523]/80 border border-[#1e2a38] flex items-start gap-3 text-left">
            <div className="p-1.5 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff] mt-0.5 flex-shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xs text-[#94a3b8] leading-relaxed">
              <span className="text-[#e2e8f0] font-semibold">Authorized Personnel Only.</span> Sign-in requires an active Discord account with verified membership in the official KRAXX HQ guild.
            </div>
          </div>

          {/* Discord Login CTA Button */}
          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full relative group overflow-hidden rounded-xl p-[1px] font-semibold text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#00f0ff]/50 disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#5865F2] via-[#00f0ff] to-[#6366f1] group-hover:opacity-100 transition-opacity duration-300 shadow-[0_0_25px_rgba(0,240,255,0.3)]" />
            <div className="relative px-6 py-3.5 rounded-[11px] bg-[#0c101a] group-hover:bg-[#0c101a]/80 transition-all duration-200 flex items-center justify-center gap-3">
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#00f0ff]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span className="text-[#e2e8f0] font-medium tracking-wide">Connecting to Discord...</span>
                </>
              ) : (
                <>
                  {/* Official Discord SVG Logo */}
                  <svg className="w-5 h-5 fill-[#5865F2] group-hover:fill-[#00f0ff] transition-colors" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span className="text-[#f1f5f9] tracking-wide font-semibold">Authenticate with Discord</span>
                  <ArrowRight className="w-4 h-4 text-[#00f0ff] group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </div>
          </button>

          {/* Security Features Grid */}
          <div className="mt-8 pt-6 border-t border-[#1e2a38]/80 grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-xl bg-[#080d16]/60 border border-[#1e2a38]/60">
              <Shield className="w-4 h-4 text-[#10b981] mx-auto mb-1" />
              <div className="text-[10px] text-[#94a3b8] font-medium">Role Sync</div>
            </div>
            <div className="p-2 rounded-xl bg-[#080d16]/60 border border-[#1e2a38]/60">
              <KeyRound className="w-4 h-4 text-[#00f0ff] mx-auto mb-1" />
              <div className="text-[10px] text-[#94a3b8] font-medium">OAuth2 JWT</div>
            </div>
            <div className="p-2 rounded-xl bg-[#080d16]/60 border border-[#1e2a38]/60">
              <Server className="w-4 h-4 text-[#6366f1] mx-auto mb-1" />
              <div className="text-[10px] text-[#94a3b8] font-medium">Bot Telemetry</div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-4 text-center">
          <p className="text-[11px] font-mono text-[#64748b]">
            KRAXX OPERATIONS PLATFORM • PROD DOMAIN: kraxxbot.kraxxsec.com
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#03070d] flex items-center justify-center text-[#00f0ff]">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#00f0ff] animate-ping" />
          <span className="text-sm font-mono tracking-wider">INITIALIZING KRAXX GATEWAY...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
