'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';

function LoginContent() {
  const [isLoading, setIsLoading] = useState(false);
  const searchParams = useSearchParams();
  const errorParam = searchParams.get('error');

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    switch (error) {
      case 'OAuthSignin':
      case 'OAuthCallback':
        return 'Unable to complete Discord authentication. Please try again.';
      case 'AccessDenied':
        return 'Access denied. Please try signing in again.';
      case 'Configuration':
        return 'Authentication is misconfigured. Contact support.';
      default:
        return `Sign-in failed (${error}). Please try again.`;
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
    <div className="login-root">
      {/* Background glow */}
      <div className="login-glow" />

      {/* Header */}
      <header className="login-header">
        <a href="/" className="login-brand">
          <div className="login-brand-icon">K</div>
          <span className="login-brand-name">KRAXXBot</span>
        </a>
      </header>

      {/* Main Card */}
      <main className="login-main">
        <div className="login-card">
          {/* Logo */}
          <div className="login-logo">
            <div className="login-logo-icon">K</div>
          </div>

          <h1 className="login-title">Welcome back</h1>
          <p className="login-sub">Sign in to manage your Discord servers.</p>

          {/* Error */}
          {authError && (
            <div className="login-error" role="alert">
              <span className="login-error-icon">⚠</span>
              <span>{authError}</span>
            </div>
          )}

          {/* Sign in Button */}
          <button
            id="discord-signin-btn"
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="login-btn"
          >
            {isLoading ? (
              <>
                <svg className="login-spinner" fill="none" viewBox="0 0 24 24">
                  <circle className="login-spinner-track" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="login-spinner-fill" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                <span>Connecting to Discord...</span>
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="login-discord-icon" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.001.022.015.043.032.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
                <span>Continue with Discord</span>
              </>
            )}
          </button>

          <p className="login-terms">
            By signing in you agree to our{' '}
            <a href="/terms" className="login-terms-link">Terms of Service</a>
            {' '}and{' '}
            <a href="/privacy" className="login-terms-link">Privacy Policy</a>.
          </p>

          <div className="login-divider" />

          <a href="/" className="login-back">← Back to kraxxbot.kraxxsec.com</a>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <span>© {new Date().getFullYear()} KRAXX</span>
        <span>·</span>
        <a href="/privacy" className="footer-link">Privacy</a>
        <span>·</span>
        <a href="/terms" className="footer-link">Terms</a>
      </footer>

      <style>{`
        .login-root {
          min-height: 100vh;
          background: #090908;
          color: #F3F0E9;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          overflow: hidden;
        }

        .login-glow {
          position: fixed;
          top: -200px;
          left: 50%;
          transform: translateX(-50%);
          width: 700px;
          height: 700px;
          background: radial-gradient(ellipse, rgba(201, 166, 107, 0.06) 0%, transparent 65%);
          pointer-events: none;
          z-index: 0;
        }

        .login-header {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 480px;
          padding: 1.5rem 1.5rem 0;
        }

        .login-brand {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          text-decoration: none;
          color: inherit;
        }

        .login-brand-icon {
          width: 30px;
          height: 30px;
          border-radius: 7px;
          background: linear-gradient(135deg, #C9A66B, #D8B77D);
          color: #090908;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 0.875rem;
          flex-shrink: 0;
        }

        .login-brand-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #F3F0E9;
        }

        .login-main {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          padding: 2rem 1.5rem;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #161614;
          border: 1px solid #2A2925;
          border-radius: 16px;
          padding: 2.25rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .login-logo {
          margin-bottom: 1.5rem;
        }

        .login-logo-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, #C9A66B, #D8B77D);
          color: #090908;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
          font-size: 1.5rem;
          margin: 0 auto;
          box-shadow: 0 0 40px rgba(201, 166, 107, 0.15);
        }

        .login-title {
          font-size: 1.375rem;
          font-weight: 800;
          color: #F3F0E9;
          letter-spacing: -0.02em;
          margin-bottom: 0.375rem;
        }

        .login-sub {
          font-size: 0.875rem;
          color: #716D65;
          margin-bottom: 1.75rem;
          line-height: 1.5;
        }

        .login-error {
          width: 100%;
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.08);
          border: 1px solid rgba(239, 68, 68, 0.2);
          font-size: 0.8125rem;
          color: #FCA5A5;
          text-align: left;
          margin-bottom: 1.25rem;
        }

        .login-error-icon {
          flex-shrink: 0;
          margin-top: 0.0625rem;
          font-size: 0.875rem;
        }

        .login-btn {
          width: 100%;
          height: 48px;
          border-radius: 10px;
          background: #5865F2;
          color: #FFFFFF;
          font-size: 0.9375rem;
          font-weight: 700;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          transition: background 0.15s, transform 0.1s;
          margin-bottom: 1rem;
          letter-spacing: 0.01em;
        }

        .login-btn:hover:not(:disabled) {
          background: #4752c4;
          transform: translateY(-1px);
        }

        .login-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .login-discord-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
        }

        .login-spinner {
          width: 18px;
          height: 18px;
          animation: spin 0.75s linear infinite;
        }

        .login-spinner-track { opacity: 0.25; }
        .login-spinner-fill { opacity: 0.75; }

        @keyframes spin { to { transform: rotate(360deg); } }

        .login-terms {
          font-size: 0.75rem;
          color: #716D65;
          line-height: 1.55;
          margin-bottom: 1.5rem;
        }

        .login-terms-link {
          color: #A8A49B;
          text-decoration: none;
          transition: color 0.15s;
        }

        .login-terms-link:hover { color: #C9A66B; }

        .login-divider {
          width: 100%;
          height: 1px;
          background: #2A2925;
          margin-bottom: 1.25rem;
        }

        .login-back {
          font-size: 0.8125rem;
          color: #716D65;
          text-decoration: none;
          transition: color 0.15s;
        }

        .login-back:hover { color: #A8A49B; }

        .login-footer {
          position: relative;
          z-index: 1;
          padding: 1.25rem 1.5rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          font-size: 0.75rem;
          color: #716D65;
        }

        .footer-link {
          color: #716D65;
          text-decoration: none;
          transition: color 0.15s;
        }

        .footer-link:hover { color: #A8A49B; }
      `}</style>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div style={{
          minHeight: '100vh',
          background: '#090908',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#A8A49B',
          fontSize: '0.875rem',
          fontFamily: 'Inter, sans-serif',
        }}>
          Loading...
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
