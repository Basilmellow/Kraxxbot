'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle, ArrowRight, Lock, Terminal } from 'lucide-react';

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
          title: 'Discord OAuth Verification Failed',
          detail: 'Unable to complete Discord authentication handshake. Please ensure you authorize the application.',
        };
      case 'AccessDenied':
        return {
          title: 'Access Denied — Membership & Clearance Required',
          detail: 'Only verified members with Founder, Co-Founder, or Management Head clearance may sign in.',
        };
      case 'Configuration':
        return {
          title: 'Authentication Gateway Misconfigured',
          detail: 'The OAuth server configuration encountered a parameter error. Contact system management.',
        };
      default:
        return {
          title: 'Gateway Authentication Error',
          detail: `Sign-in session could not be established (${error}). Please try again.`,
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
    <div className="min-h-screen bg-[#05070B] text-[#F1F5F9] flex flex-col justify-between relative overflow-hidden font-sans selection:bg-[#22D3EE]/25 selection:text-white kraxx-grid-bg">
      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#0A0F16] border border-[#1E2C3F] flex items-center justify-center font-bold text-[#22D3EE] text-sm font-mono shadow-[0_0_12px_rgba(34,211,238,0.15)]">
            K
          </div>
          <div className="flex items-center gap-2 font-mono">
            <span className="font-bold text-xs tracking-wider text-white">KRAXX HQ</span>
            <span className="text-[10px] text-[#64748B]">/ OPERATIONS</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0A0F16] border border-[#16202E] text-[11px] font-mono text-[#94A3B8]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse-subtle" />
          <span>GATEWAY ONLINE</span>
        </div>
      </header>

      {/* Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-[420px]">
          <div className="rounded-md bg-[#0A0F16] border border-[#16202E] p-8 shadow-[0_16px_50px_rgba(0,0,0,0.8)] backdrop-blur-md">
            
            {/* Header Brand */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded bg-[#070B10] border border-[#1E2C3F] mb-3 text-[#22D3EE] font-mono font-bold text-lg shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                K
              </div>
              <h1 className="text-base font-bold font-mono tracking-wide text-white uppercase">
                KRAXX HQ // PRIVATE ACCESS
              </h1>
              <p className="text-xs text-[#94A3B8] mt-1 font-sans">
                Digital Operations & Infrastructure Control
              </p>
            </div>

            {/* Error Message Alert */}
            {authError && (
              <div className="mb-5 p-3 rounded bg-red-950/30 border border-red-500/30 flex items-start gap-2.5 text-left">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-red-200 font-mono">{authError.title}</h4>
                  <p className="text-[11px] text-red-300/80 mt-0.5 leading-relaxed">{authError.detail}</p>
                </div>
              </div>
            )}

            {/* Security Clearance Specs */}
            <div className="mb-5 p-3 rounded bg-[#070B10] border border-[#16202E] space-y-1.5 font-mono text-[11px]">
              <div className="flex items-center justify-between text-[#64748B]">
                <span>AUTHENTICATION:</span>
                <span className="text-[#22D3EE]">DISCORD OAUTH2</span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>GUILD VERIFIED:</span>
                <span className="text-[#10B981]">KRAXX HQ REQUIRED</span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>CLEARANCE LEVEL:</span>
                <span className="text-[#F1F5F9]">MANAGEMENT HEAD+</span>
              </div>
            </div>

            {/* Login Action Button */}
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="w-full h-11 rounded bg-[#22D3EE] hover:bg-[#38BDF8] active:scale-[0.99] text-[#05070B] font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(34,211,238,0.25)] hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  <span>CONNECTING TO DISCORD GATEWAY...</span>
                </>
              ) : (
                <>
                  <span>CONTINUE WITH DISCORD</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>

            {/* Ecosystem Badges */}
            <div className="mt-6 pt-5 border-t border-[#16202E] flex items-center justify-center gap-3 text-[11px] font-mono text-[#64748B]">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                KRAXXSEC
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#818CF8]" />
                KRAXX STUDIO
              </span>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 flex items-center justify-between text-[11px] font-mono text-[#64748B]">
        <span>© {new Date().getFullYear()} KRAXX HQ. ALL RIGHTS RESERVED.</span>
        <span>SECURITY LEVEL // CONFIDENTIAL</span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#05070B] flex items-center justify-center text-[#22D3EE] font-mono text-xs">
          INITIALIZING GATEWAY...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
