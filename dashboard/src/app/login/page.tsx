'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, AlertCircle, ArrowRight, Lock, Shield, Sparkles } from 'lucide-react';

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
          detail: 'Only verified guild members with Founder, Co-Founder, or Management Head clearance may sign in.',
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
    <div className="min-h-screen bg-[#F7F8FC] text-[#101828] flex flex-col justify-between relative overflow-hidden font-sans selection:bg-indigo-500/20 selection:text-indigo-900 kraxx-grid-bg">
      {/* Top Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
            K
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-[#101828] leading-tight">KRAXX HQ</span>
            <span className="text-[11px] text-[#667085]">Operations Platform</span>
          </div>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-xs font-medium text-[#475467] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All Systems Operational</span>
        </div>
      </header>

      {/* Main Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-8 my-auto">
        <div className="w-full max-w-[480px]">
          <div className="rounded-3xl bg-white border border-[#E5E7EB] p-8 sm:p-10 shadow-xl shadow-indigo-950/5">
            
            {/* Header Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 mb-4 text-indigo-600 font-bold text-2xl shadow-xs ring-4 ring-indigo-50/50">
                K
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#101828]">
                KRAXX HQ Private Access
              </h1>
              <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
                Internal Operations & Digital Infrastructure Control
              </p>
            </div>

            {/* Error Message Alert */}
            {authError && (
              <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-left">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-xs font-semibold text-red-900">{authError.title}</h4>
                  <p className="text-[11px] text-red-700 mt-1 leading-relaxed">{authError.detail}</p>
                </div>
              </div>
            )}

            {/* Security Clearance Specs */}
            <div className="mb-6 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#667085] font-medium">Authentication</span>
                <span className="text-indigo-600 font-semibold px-2.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-100">
                  Discord OAuth2
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#667085] font-medium">Guild Verification</span>
                <span className="text-emerald-700 font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-100">
                  KRAXX HQ Required
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#667085] font-medium">Clearance Level</span>
                <span className="text-[#101828] font-semibold px-2.5 py-0.5 rounded-md bg-white border border-[#E5E7EB]">
                  Management Head+
                </span>
              </div>
            </div>

            {/* Login Action Button */}
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all shadow-md shadow-indigo-600/20 hover:shadow-lg hover:shadow-indigo-600/30 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Connecting to Discord...</span>
                  </>
                ) : (
                  <>
                    <span>Continue with Discord</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <a
                href="/dashboard"
                className="w-full h-11 rounded-xl bg-white hover:bg-[#F8FAFC] border border-[#E5E7EB] text-[#344054] font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Enter Command Center (Local Preview Mode)</span>
              </a>
            </div>

            {/* Ecosystem Badges */}
            <div className="mt-8 pt-6 border-t border-[#F1F3F9] flex items-center justify-center gap-4 text-xs text-[#667085]">
              <span className="flex items-center gap-1.5 font-semibold text-[#344054]">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                KRAXXSEC
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 font-semibold text-[#344054]">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                KRAXX STUDIO
              </span>
            </div>

          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#667085]">
        <span>© {new Date().getFullYear()} KRAXX HQ. All rights reserved.</span>
        <span>Confidential • Internal Operations Platform</span>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7F8FC] flex items-center justify-center text-indigo-600 text-xs font-semibold">
          Initializing Gateway...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
