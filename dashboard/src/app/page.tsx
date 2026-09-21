import type { Metadata } from 'next';
import Link from 'next/link';
import { getBotInviteUrl } from '@/lib/discord';

export const metadata: Metadata = {
  title: 'KRAXXBot — Professional Discord Bot for Communities',
  description: 'KRAXXBot brings professional moderation, support tickets, automation, and analytics to your Discord server. Used by communities worldwide.',
  openGraph: {
    title: 'KRAXXBot — Your Discord server. Under control.',
    description: 'Professional moderation, tickets, automation, and analytics for Discord communities.',
    url: 'https://kraxxbot.kraxxsec.com',
    siteName: 'KRAXXBot',
    type: 'website',
  },
};

const FEATURES = [
  {
    icon: '🛡️',
    title: 'Moderation & Safety',
    desc: 'Warn, timeout, kick, and ban with full case history and audit logging. AutoMod integration keeps your community clean automatically.',
  },
  {
    icon: '🎫',
    title: 'Support Tickets',
    desc: 'Structured ticket panels with categories, automatic transcripts, staff claiming, and priority levels — all managed from the dashboard.',
  },
  {
    icon: '⚡',
    title: 'Automation',
    desc: 'Build custom automation rules triggered by member joins, role changes, ticket events, and more — without writing a single line of code.',
  },
  {
    icon: '📋',
    title: 'Tasks & Reminders',
    desc: 'Assign tasks to server members, set recurring reminders, and schedule announcements directly from Discord slash commands.',
  },
  {
    icon: '📣',
    title: 'Embeds & Announcements',
    desc: 'Craft rich Discord embeds with the visual embed builder and schedule announcements for your community at exactly the right time.',
  },
  {
    icon: '📊',
    title: 'Analytics & Audit',
    desc: 'Track member growth, ticket volume, moderation actions, and bot activity with a clean, real-time audit log feed.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Add to Discord',
    desc: 'Click the invite button and authorize KRAXXBot in your server. Takes less than 30 seconds.',
  },
  {
    step: '02',
    title: 'Configure Your Server',
    desc: 'Use the setup wizard in the dashboard to configure channels, roles, and enable the modules you need.',
  },
  {
    step: '03',
    title: 'Manage from Anywhere',
    desc: 'Use the web dashboard or Discord slash commands to manage your community from any device.',
  },
];

const ECOSYSTEM = [
  {
    name: 'KRAXXSEC',
    tagline: 'Security Intelligence',
    desc: 'Cybersecurity research and threat intelligence platform.',
    color: '#22C55E',
    href: 'https://kraxxsec.com',
  },
  {
    name: 'KRAXX STUDIO',
    tagline: 'Creative Production',
    desc: 'Professional digital media production and design studio.',
    color: '#A78BFA',
    href: '#',
  },
  {
    name: 'KRAXXBot',
    tagline: 'Discord Communities',
    desc: 'Professional Discord bot platform for communities worldwide.',
    color: '#C9A66B',
    href: 'https://kraxxbot.kraxxsec.com',
    active: true,
  },
];

export default function HomePage() {
  const inviteUrl = getBotInviteUrl();

  return (
    <div className="landing-root">
      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="landing-nav">
        <div className="landing-container nav-inner">
          <div className="brand">
            <div className="brand-icon">K</div>
            <div>
              <div className="brand-name">KRAXXBot</div>
              <div className="brand-sub">by KRAXX</div>
            </div>
          </div>
          <div className="nav-links">
            <a href="#features" className="nav-link">Features</a>
            <a href="#how-it-works" className="nav-link">How It Works</a>
            <a href="https://discord.gg/kraxx" target="_blank" rel="noopener noreferrer" className="nav-link">Support</a>
          </div>
          <div className="nav-actions">
            <Link href="/login" className="btn-secondary">Sign In</Link>
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              Add to Discord
            </a>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="hero-section">
        <div className="hero-glow" />
        <div className="landing-container hero-inner">
          <div className="hero-badge">
            <span className="status-pulse" />
            <span>Bot Online • Global Deployment</span>
          </div>
          <h1 className="hero-headline">
            Your Discord server.<br />
            <span className="hero-accent">Under control.</span>
          </h1>
          <p className="hero-sub">
            Professional moderation, support tickets, and community automation<br className="hero-br" />
            for Discord communities — from small groups to large-scale servers.
          </p>
          <div className="hero-actions">
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-large" id="hero-add-discord">
              <span>Add to Discord</span>
              <span className="btn-arrow">→</span>
            </a>
            <Link href="/login" className="btn-ghost btn-large" id="hero-sign-in">
              Sign in with Discord
            </Link>
          </div>
          <p className="hero-disclaimer">Free to add. No credit card required.</p>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────── */}
      <section id="features" className="section">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-label">Features</div>
            <h2 className="section-title">Everything your server needs</h2>
            <p className="section-sub">Built to handle real community management at scale.</p>
          </div>
          <div className="features-grid">
            {FEATURES.map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────── */}
      <section id="how-it-works" className="section section-alt">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-label">Setup</div>
            <h2 className="section-title">Up and running in minutes</h2>
            <p className="section-sub">No developer required. No complex configuration.</p>
          </div>
          <div className="steps-grid">
            {STEPS.map(s => (
              <div key={s.step} className="step-card">
                <div className="step-number">{s.step}</div>
                <h3 className="step-title">{s.title}</h3>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="steps-cta">
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-large" id="steps-add-discord">
              Get Started Free
            </a>
          </div>
        </div>
      </section>

      {/* ── KRAXX Ecosystem ─────────────────────────────────────── */}
      <section className="section">
        <div className="landing-container">
          <div className="section-header">
            <div className="section-label">Ecosystem</div>
            <h2 className="section-title">Part of the KRAXX ecosystem</h2>
            <p className="section-sub">KRAXXBot is one of three interconnected KRAXX products.</p>
          </div>
          <div className="ecosystem-grid">
            {ECOSYSTEM.map(e => (
              <a
                key={e.name}
                href={e.href}
                target={e.href.startsWith('http') ? '_blank' : undefined}
                rel="noopener noreferrer"
                className={`ecosystem-card${e.active ? ' ecosystem-card-active' : ''}`}
              >
                <div className="ecosystem-dot" style={{ background: e.color }} />
                <div className="ecosystem-name">{e.name}</div>
                <div className="ecosystem-tagline">{e.tagline}</div>
                <div className="ecosystem-desc">{e.desc}</div>
                {e.active && <div className="ecosystem-badge">You are here</div>}
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <section className="cta-section">
        <div className="landing-container cta-inner">
          <h2 className="cta-title">Ready to upgrade your server?</h2>
          <p className="cta-sub">Join thousands of Discord communities using KRAXXBot.</p>
          <div className="hero-actions">
            <a href={inviteUrl} target="_blank" rel="noopener noreferrer" className="btn-primary btn-large" id="cta-add-discord">
              Add KRAXXBot Free
            </a>
            <Link href="/login" className="btn-ghost btn-large" id="cta-sign-in">
              Manage Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <footer className="landing-footer">
        <div className="landing-container footer-inner">
          <div className="footer-brand">
            <div className="brand-icon brand-icon-sm">K</div>
            <span className="footer-brand-name">KRAXXBot</span>
          </div>
          <div className="footer-links">
            <Link href="/privacy" className="footer-link">Privacy Policy</Link>
            <Link href="/terms" className="footer-link">Terms of Service</Link>
            <a href="https://discord.gg/kraxx" target="_blank" rel="noopener noreferrer" className="footer-link">Support Server</a>
            <a href="https://kraxxsec.com" target="_blank" rel="noopener noreferrer" className="footer-link">KRAXX</a>
          </div>
          <div className="footer-copy">
            © {new Date().getFullYear()} KRAXX. All rights reserved.
          </div>
        </div>
      </footer>

      <style>{`
        /* ── Landing Design System ─────────────────────────────── */
        .landing-root {
          min-height: 100vh;
          background: #090908;
          color: #F3F0E9;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .landing-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 1.5rem;
        }

        /* ── Navigation ────────────────────────────────────────── */
        .landing-nav {
          position: sticky;
          top: 0;
          z-index: 100;
          background: rgba(9, 9, 8, 0.85);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid #2A2925;
        }

        .nav-inner {
          display: flex;
          align-items: center;
          gap: 2rem;
          height: 64px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          text-decoration: none;
          color: inherit;
          flex-shrink: 0;
        }

        .brand-icon {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          background: linear-gradient(135deg, #C9A66B, #D8B77D);
          color: #090908;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1rem;
          flex-shrink: 0;
        }

        .brand-icon-sm {
          width: 28px;
          height: 28px;
          font-size: 0.8125rem;
          border-radius: 6px;
        }

        .brand-name {
          font-size: 0.9375rem;
          font-weight: 700;
          color: #F3F0E9;
          letter-spacing: -0.01em;
        }

        .brand-sub {
          font-size: 0.6875rem;
          color: #716D65;
          line-height: 1;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          flex: 1;
        }

        .nav-link {
          padding: 0.4rem 0.75rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          color: #A8A49B;
          text-decoration: none;
          transition: color 0.15s, background 0.15s;
        }

        .nav-link:hover {
          color: #F3F0E9;
          background: #161614;
        }

        .nav-actions {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          flex-shrink: 0;
        }

        /* ── Buttons ───────────────────────────────────────────── */
        .btn-primary {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1.125rem;
          border-radius: 8px;
          background: #C9A66B;
          color: #090908;
          font-size: 0.875rem;
          font-weight: 700;
          text-decoration: none;
          transition: background 0.15s, transform 0.1s;
          letter-spacing: 0.01em;
          white-space: nowrap;
          cursor: pointer;
          border: none;
        }

        .btn-primary:hover {
          background: #D8B77D;
          transform: translateY(-1px);
        }

        .btn-secondary {
          display: inline-flex;
          align-items: center;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          background: transparent;
          color: #A8A49B;
          font-size: 0.875rem;
          font-weight: 500;
          text-decoration: none;
          border: 1px solid #2A2925;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-secondary:hover {
          color: #F3F0E9;
          border-color: #3A3832;
          background: #161614;
        }

        .btn-ghost {
          display: inline-flex;
          align-items: center;
          padding: 0.625rem 1.25rem;
          border-radius: 8px;
          background: transparent;
          color: #A8A49B;
          font-size: 0.9375rem;
          font-weight: 600;
          text-decoration: none;
          border: 1px solid #2A2925;
          transition: all 0.15s;
          white-space: nowrap;
        }

        .btn-ghost:hover {
          color: #F3F0E9;
          border-color: #3A3832;
          background: #161614;
        }

        .btn-large {
          padding: 0.75rem 1.75rem;
          font-size: 0.9375rem;
          border-radius: 10px;
        }

        .btn-arrow {
          font-size: 1.1em;
          transition: transform 0.15s;
        }

        .btn-primary:hover .btn-arrow {
          transform: translateX(3px);
        }

        /* ── Hero ──────────────────────────────────────────────── */
        .hero-section {
          position: relative;
          padding: 7rem 0 6rem;
          text-align: center;
          overflow: hidden;
        }

        .hero-glow {
          position: absolute;
          top: -120px;
          left: 50%;
          transform: translateX(-50%);
          width: 800px;
          height: 600px;
          background: radial-gradient(ellipse, rgba(201, 166, 107, 0.08) 0%, transparent 70%);
          pointer-events: none;
        }

        .hero-inner {
          position: relative;
          z-index: 1;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 0.875rem;
          border-radius: 9999px;
          background: #161614;
          border: 1px solid #2A2925;
          font-size: 0.8125rem;
          color: #A8A49B;
          margin-bottom: 2rem;
          font-weight: 500;
        }

        .status-pulse {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #22C55E;
          box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.2);
          animation: pulse-dot 2s ease-in-out infinite;
          flex-shrink: 0;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .hero-headline {
          font-size: clamp(2.25rem, 5vw, 3.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          color: #F3F0E9;
          margin-bottom: 1.25rem;
        }

        .hero-accent {
          color: #C9A66B;
        }

        .hero-sub {
          font-size: 1.125rem;
          color: #A8A49B;
          line-height: 1.65;
          max-width: 600px;
          margin: 0 auto 2.5rem;
        }

        .hero-br { display: none; }
        @media (min-width: 640px) { .hero-br { display: inline; } }

        .hero-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
        }

        .hero-disclaimer {
          margin-top: 1.25rem;
          font-size: 0.8125rem;
          color: #716D65;
        }

        /* ── Section ───────────────────────────────────────────── */
        .section {
          padding: 5rem 0;
        }

        .section-alt {
          background: #0C0C0B;
          border-top: 1px solid #1D1C19;
          border-bottom: 1px solid #1D1C19;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3.5rem;
        }

        .section-label {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #C9A66B;
          margin-bottom: 0.75rem;
        }

        .section-title {
          font-size: clamp(1.75rem, 3.5vw, 2.25rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #F3F0E9;
          margin-bottom: 0.75rem;
        }

        .section-sub {
          font-size: 1rem;
          color: #A8A49B;
        }

        /* ── Features Grid ─────────────────────────────────────── */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 1rem;
        }

        .feature-card {
          background: #161614;
          border: 1px solid #2A2925;
          border-radius: 12px;
          padding: 1.5rem;
          transition: border-color 0.15s, transform 0.15s;
        }

        .feature-card:hover {
          border-color: #3A3832;
          transform: translateY(-2px);
        }

        .feature-icon {
          font-size: 1.75rem;
          margin-bottom: 0.875rem;
        }

        .feature-title {
          font-size: 1rem;
          font-weight: 700;
          color: #F3F0E9;
          margin-bottom: 0.5rem;
        }

        .feature-desc {
          font-size: 0.875rem;
          color: #716D65;
          line-height: 1.6;
        }

        /* ── Steps ─────────────────────────────────────────────── */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }

        .step-card {
          background: #161614;
          border: 1px solid #2A2925;
          border-radius: 12px;
          padding: 1.75rem 1.5rem;
          position: relative;
        }

        .step-number {
          font-size: 0.75rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          color: #C9A66B;
          margin-bottom: 1rem;
          font-family: monospace;
        }

        .step-title {
          font-size: 1.0625rem;
          font-weight: 700;
          color: #F3F0E9;
          margin-bottom: 0.5rem;
        }

        .step-desc {
          font-size: 0.875rem;
          color: #716D65;
          line-height: 1.65;
        }

        .steps-cta {
          text-align: center;
        }

        /* ── Ecosystem ─────────────────────────────────────────── */
        .ecosystem-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1rem;
        }

        .ecosystem-card {
          background: #161614;
          border: 1px solid #2A2925;
          border-radius: 12px;
          padding: 1.5rem;
          text-decoration: none;
          transition: border-color 0.15s, transform 0.15s;
          display: block;
          position: relative;
        }

        .ecosystem-card:hover {
          border-color: #3A3832;
          transform: translateY(-2px);
        }

        .ecosystem-card-active {
          border-color: rgba(201, 166, 107, 0.4);
        }

        .ecosystem-card-active:hover {
          border-color: rgba(201, 166, 107, 0.7);
        }

        .ecosystem-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          margin-bottom: 1rem;
        }

        .ecosystem-name {
          font-size: 0.9375rem;
          font-weight: 800;
          color: #F3F0E9;
          margin-bottom: 0.25rem;
          letter-spacing: 0.02em;
        }

        .ecosystem-tagline {
          font-size: 0.75rem;
          font-weight: 600;
          color: #716D65;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          margin-bottom: 0.625rem;
        }

        .ecosystem-desc {
          font-size: 0.875rem;
          color: #A8A49B;
          line-height: 1.55;
        }

        .ecosystem-badge {
          display: inline-block;
          margin-top: 0.875rem;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          background: rgba(201, 166, 107, 0.12);
          border: 1px solid rgba(201, 166, 107, 0.25);
          font-size: 0.6875rem;
          font-weight: 700;
          color: #C9A66B;
          letter-spacing: 0.04em;
        }

        /* ── CTA ───────────────────────────────────────────────── */
        .cta-section {
          padding: 5rem 0;
          background: #0C0C0B;
          border-top: 1px solid #1D1C19;
        }

        .cta-inner {
          text-align: center;
        }

        .cta-title {
          font-size: clamp(1.75rem, 3.5vw, 2.25rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          color: #F3F0E9;
          margin-bottom: 0.75rem;
        }

        .cta-sub {
          font-size: 1rem;
          color: #A8A49B;
          margin-bottom: 2rem;
        }

        /* ── Footer ────────────────────────────────────────────── */
        .landing-footer {
          background: #090908;
          border-top: 1px solid #1D1C19;
          padding: 2rem 0;
        }

        .footer-inner {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 1.25rem;
        }

        .footer-brand {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .footer-brand-name {
          font-size: 0.875rem;
          font-weight: 700;
          color: #F3F0E9;
        }

        .footer-links {
          display: flex;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }

        .footer-link {
          font-size: 0.8125rem;
          color: #716D65;
          text-decoration: none;
          transition: color 0.15s;
        }

        .footer-link:hover { color: #A8A49B; }

        .footer-copy {
          font-size: 0.8125rem;
          color: #716D65;
        }

        @media (max-width: 768px) {
          .nav-links { display: none; }
          .hero-section { padding: 5rem 0 4rem; }
          .features-grid, .steps-grid, .ecosystem-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
