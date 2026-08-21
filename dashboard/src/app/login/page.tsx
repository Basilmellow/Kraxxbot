'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Shield, Lock, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Terminal, ExternalLink } from 'lucide-react';

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
          title: 'Discord Authentication Failed',
          detail: 'Unable to complete Discord OAuth flow. Please ensure you authorized the application and retry.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied — Membership Required',
          detail: 'You must be a member of the official KRAXX HQ Discord server to sign in to this portal.',
        };
      case 'Configuration':
        return {
          title: 'Server Configuration Error',
          detail: 'The authentication server encountered a configuration issue. Please contact system management.',
        };
      default:
        return {
          title: 'Authentication Error',
          detail: `Sign-in could not be completed (${error}). Please try again.`,
        };
    }
  };

  const authError = getErrorMessage(errorParam);

  const handleLogin = async () => {
    try {
      setIsLoading(true);
      await signIn('discord', { callbackUrl: '/dashboard' });
    } catch (err) {
      console.error('[Auth] Sign-in error:', err);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a0f] text-[#e2e8f0] flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#00f0ff]/20 selection:text-[#00f0ff]">
      {/* Dynamic Background Lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-[#00f0ff]/10 via-[#6366f1]/5 to-transparent rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-[#10b981]/5 rounded-full blur-[120px] pointer-events-none" />
      
      {/* Subtle Grid Pattern Overlay */}
      <div 
        className="absolute inset-0 opacity-[0.18] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(rgba(148, 163, 184, 0.25) 1px, transparent 1px)`,
          backgroundSize: '28px 28px'
        }}
      />

      {/* Top Navbar / Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00f0ff] to-[#6366f1] p-[1px] shadow-[0_0_12px_rgba(0,240,255,0.3)]">
            <div className="w-full h-full bg-[#0a0e17] rounded-[7px] flex items-center justify-center font-black text-[#00f0ff] text-sm">
              K
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-wider text-white">KRAXX</span>
            <span className="text-xs text-[#64748b] font-mono">/ OPERATIONS</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#0f141f] border border-[#1e293b] text-xs font-mono text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span>HQ Systems Active</span>
          </div>
        </div>
      </header>

      {/* Center Main Card Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[440px]">
          
          {/* Main Login Card */}
          <div className="rounded-2xl bg-[#0c1018]/95 border border-[#1e293b] p-8 sm:p-10 shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
            
            {/* Card Brand Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#111726] border border-[#1e293b] mb-4 shadow-[0_0_24px_rgba(0,240,255,0.15)]">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f0ff] to-[#6366f1] flex items-center justify-center font-black text-white text-xl shadow-inner">
                  K
                </div>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-white">
                KRAXX Operations
              </h1>
              <p className="text-sm text-[#94a3b8] mt-1.5 leading-relaxed">
                Internal Command & Infrastructure Portal
              </p>
            </div>

            {/* Error Message Alert Banner */}
            {authError && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-red-200">{authError.title}</h4>
                  <p className="text-xs text-red-300/80 mt-1 leading-relaxed">{authError.detail}</p>
                </div>
              </div>
            )}

            {/* Access Notice Badge */}
            <div className="mb-6 p-3.5 rounded-xl bg-[#111724] border border-[#1e293b] flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#00f0ff]/10 text-[#00f0ff]">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div className="text-xs text-[#94a3b8] leading-tight">
                <span className="text-white font-medium">Restricted Access.</span> Guild member verification & role-based clearance enforced.
              </div>
            </div>

            {/* Discord OAuth Action Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-12 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] active:scale-[0.99] text-white font-medium text-sm flex items-center justify-center gap-3 transition-all shadow-[0_4px_20px_rgba(88,101,242,0.35)] hover:shadow-[0_6px_25px_rgba(88,101,242,0.5)] disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>Connecting to Discord...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                  </svg>
                  <span>Continue with Discord</span>
                  <ArrowRight className="w-4 h-4 opacity-70 ml-0.5" />
                </>
              )}
            </button>

            {/* Division Indicators */}
            <div className="mt-8 pt-6 border-t border-[#1e293b] flex items-center justify-center gap-3 text-xs text-[#64748b]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
                KRAXXSEC
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1]" />
                KRAXX STUDIO
              </span>
            </div>

          </div>

          {/* Domain Verification Caption */}
          <div className="mt-4 text-center">
            <p className="text-xs font-mono text-[#475569]">
              https://kraxxbot.kraxxsec.com
            </p>
          </div>

        </div>
      </main>

      {/* Clean Bottom Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between text-xs text-[#475569]">
        <span>© {new Date().getFullYear()} KRAXX HQ. All rights reserved.</span>
        <span className="font-mono">v2.4-PROD</span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#070a0f] flex items-center justify-center text-[#00f0ff]">
        <div className="flex items-center gap-3 font-mono text-sm tracking-wider">
          <span className="w-2 h-2 rounded-full bg-[#00f0ff] animate-ping" />
          <span>INITIALIZING GATEWAY...</span>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
