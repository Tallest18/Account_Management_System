'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/* ─────────────────────────────────────────────
   Inline styles — no external CSS needed.
   Paste this file as-is; it owns every style.
───────────────────────────────────────────── */

const css = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500&display=swap');

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(24px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position:  200% center; }
  }
  @keyframes orbFloat {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(-18px) scale(1.04); }
  }
  @keyframes orbFloat2 {
    0%, 100% { transform: translateY(0px) scale(1); }
    50%       { transform: translateY(14px) scale(0.97); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  @keyframes checkDraw {
    from { stroke-dashoffset: 60; }
    to   { stroke-dashoffset: 0; }
  }
  @keyframes successPop {
    0%   { transform: scale(0.6); opacity: 0; }
    70%  { transform: scale(1.1); }
    100% { transform: scale(1);   opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }

  .fp-root * { box-sizing: border-box; margin: 0; padding: 0; }

  .fp-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background: #0a0a0f;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    position: relative;
    overflow: hidden;
  }

  /* ── Atmospheric orbs ── */
  .fp-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    pointer-events: none;
    z-index: 0;
  }
  .fp-orb-1 {
    width: 480px; height: 480px;
    top: -160px; right: -140px;
    background: radial-gradient(circle, rgba(212,164,60,0.18) 0%, transparent 70%);
    animation: orbFloat 9s ease-in-out infinite;
  }
  .fp-orb-2 {
    width: 360px; height: 360px;
    bottom: -120px; left: -100px;
    background: radial-gradient(circle, rgba(130,90,200,0.14) 0%, transparent 70%);
    animation: orbFloat2 12s ease-in-out infinite;
  }
  .fp-orb-3 {
    width: 240px; height: 240px;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(212,164,60,0.06) 0%, transparent 70%);
    animation: orbFloat 7s ease-in-out infinite reverse;
  }

  /* ── Grid texture ── */
  .fp-grid {
    position: absolute; inset: 0; z-index: 0; pointer-events: none;
    background-image:
      linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
    background-size: 48px 48px;
    mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 20%, transparent 100%);
  }

  /* ── Card ── */
  .fp-card-wrap {
    position: relative; z-index: 1;
    width: 100%; max-width: 440px;
    animation: fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both;
  }

  .fp-card {
    background: linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 24px;
    padding: 2.5rem 2.5rem 2rem;
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    box-shadow:
      0 0 0 1px rgba(212,164,60,0.08),
      0 40px 80px rgba(0,0,0,0.6),
      inset 0 1px 0 rgba(255,255,255,0.08);
  }

  /* ── Logo ── */
  .fp-logo-wrap {
    display: flex; flex-direction: column; align-items: center;
    margin-bottom: 2rem;
    animation: fadeUp 0.7s 0.1s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fp-logo-ring {
    position: relative;
    width: 68px; height: 68px;
    margin-bottom: 1rem;
  }
  .fp-logo-ring svg.ring-svg {
    position: absolute; inset: 0;
    animation: spin 8s linear infinite;
  }
  .fp-logo-icon {
    position: absolute; inset: 10px;
    background: linear-gradient(135deg, #d4a43c 0%, #f0c870 50%, #b8882e 100%);
    border-radius: 14px;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 0 24px rgba(212,164,60,0.4);
  }
  .fp-logo-icon svg { width: 26px; height: 26px; color: #0a0a0f; }

  .fp-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.75rem;
    color: #f5f0e8;
    letter-spacing: -0.01em;
    text-align: center;
    line-height: 1.2;
  }
  .fp-subtitle {
    font-size: 0.875rem;
    color: rgba(245,240,232,0.45);
    text-align: center;
    margin-top: 0.4rem;
    font-weight: 300;
    letter-spacing: 0.01em;
  }

  /* ── Divider ── */
  .fp-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    margin: 1.5rem 0;
  }

  /* ── Form ── */
  .fp-form { display: flex; flex-direction: column; gap: 1rem; }

  .fp-hint {
    font-size: 0.8125rem;
    color: rgba(245,240,232,0.4);
    line-height: 1.6;
    font-weight: 300;
    animation: fadeIn 0.5s 0.3s both;
  }

  /* ── Input ── */
  .fp-field {
    display: flex; flex-direction: column; gap: 0.4rem;
    animation: fadeUp 0.5s 0.35s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fp-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(212,164,60,0.8);
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .fp-input-wrap {
    position: relative;
  }
  .fp-input-icon {
    position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
    color: rgba(245,240,232,0.25);
    display: flex; align-items: center;
    pointer-events: none;
    transition: color 0.2s;
  }
  .fp-input-wrap:focus-within .fp-input-icon {
    color: rgba(212,164,60,0.6);
  }
  .fp-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 0.75rem 1rem 0.75rem 2.75rem;
    font-size: 0.9375rem;
    font-family: 'DM Sans', sans-serif;
    font-weight: 400;
    color: #f5f0e8;
    outline: none;
    transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
  }
  .fp-input::placeholder { color: rgba(245,240,232,0.2); }
  .fp-input:focus {
    border-color: rgba(212,164,60,0.5);
    background: rgba(212,164,60,0.04);
    box-shadow: 0 0 0 3px rgba(212,164,60,0.1);
  }

  /* ── Button ── */
  .fp-btn-wrap {
    animation: fadeUp 0.5s 0.45s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fp-btn {
    position: relative;
    width: 100%;
    padding: 0.875rem 1.5rem;
    border: none; outline: none; cursor: pointer;
    border-radius: 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9375rem;
    font-weight: 500;
    color: #0a0a0f;
    background: linear-gradient(135deg, #e0b04a 0%, #f5d07a 40%, #c89430 100%);
    background-size: 200% auto;
    transition: transform 0.15s, box-shadow 0.15s, background-position 0.5s;
    box-shadow: 0 4px 20px rgba(212,164,60,0.35);
    overflow: hidden;
    letter-spacing: 0.01em;
  }
  .fp-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 8px 28px rgba(212,164,60,0.45);
    background-position: right center;
  }
  .fp-btn:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: 0 2px 12px rgba(212,164,60,0.3);
  }
  .fp-btn:disabled { opacity: 0.7; cursor: not-allowed; }

  .fp-btn-shimmer {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.3) 50%, transparent 70%);
    background-size: 200% auto;
    animation: shimmer 2.5s linear infinite;
  }
  .fp-btn-content { position: relative; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }

  .fp-spinner {
    width: 18px; height: 18px;
    border: 2px solid rgba(10,10,15,0.2);
    border-top-color: #0a0a0f;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  /* ── Success state ── */
  .fp-success {
    display: flex; flex-direction: column; align-items: center;
    text-align: center;
    gap: 0; /* controlled by children margins */
    animation: fadeUp 0.6s cubic-bezier(0.22,1,0.36,1) both;
  }
  .fp-success-icon {
    width: 72px; height: 72px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(212,164,60,0.15), rgba(212,164,60,0.05));
    border: 1px solid rgba(212,164,60,0.3);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 1.25rem;
    animation: successPop 0.5s cubic-bezier(0.34,1.56,0.64,1) both;
    box-shadow: 0 0 32px rgba(212,164,60,0.2);
  }
  .fp-success-icon svg .check-path {
    stroke-dasharray: 60;
    stroke-dashoffset: 60;
    animation: checkDraw 0.5s 0.3s cubic-bezier(0.22,1,0.36,1) forwards;
  }
  .fp-success-title {
    font-family: 'DM Serif Display', serif;
    font-size: 1.4rem;
    color: #f5f0e8;
    margin-bottom: 0.5rem;
  }
  .fp-success-body {
    font-size: 0.875rem;
    color: rgba(245,240,232,0.45);
    font-weight: 300;
    line-height: 1.7;
    max-width: 280px;
    margin-bottom: 1.75rem;
  }
  .fp-success-email {
    color: rgba(212,164,60,0.8);
    font-weight: 500;
  }
  .fp-open-btn {
    display: inline-flex; align-items: center; gap: 0.4rem;
    padding: 0.6rem 1.25rem;
    background: rgba(212,164,60,0.12);
    border: 1px solid rgba(212,164,60,0.25);
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.875rem; font-weight: 500;
    color: rgba(212,164,60,0.9);
    cursor: pointer; outline: none;
    transition: background 0.2s, border-color 0.2s, transform 0.15s;
    text-decoration: none;
    margin-bottom: 0.25rem;
  }
  .fp-open-btn:hover {
    background: rgba(212,164,60,0.18);
    border-color: rgba(212,164,60,0.4);
    transform: translateY(-1px);
  }

  /* ── Footer link ── */
  .fp-footer {
    margin-top: 1.5rem;
    text-align: center;
    animation: fadeIn 0.5s 0.6s both;
  }
  .fp-footer a {
    font-size: 0.8125rem;
    color: rgba(245,240,232,0.35);
    text-decoration: none;
    font-weight: 300;
    transition: color 0.2s;
    display: inline-flex; align-items: center; gap: 0.3rem;
  }
  .fp-footer a:hover { color: rgba(212,164,60,0.8); }

  /* ── Back link inside card ── */
  .fp-back-inline {
    text-align: center;
    margin-top: 0.25rem;
    animation: fadeIn 0.5s 0.55s both;
  }
  .fp-back-inline a {
    font-size: 0.8125rem;
    color: rgba(245,240,232,0.3);
    text-decoration: none;
    transition: color 0.2s;
  }
  .fp-back-inline a:hover { color: rgba(212,164,60,0.7); }

  /* ── Dots decoration ── */
  .fp-dots {
    position: absolute; bottom: -28px; left: 50%; transform: translateX(-50%);
    display: flex; gap: 6px;
    z-index: 2;
  }
  .fp-dot {
    width: 4px; height: 4px; border-radius: 50%;
    background: rgba(212,164,60,0.4);
  }
  .fp-dot:nth-child(2) { animation: pulse 1.5s 0.3s ease-in-out infinite; background: rgba(212,164,60,0.7); }
  .fp-dot:nth-child(3) { animation: pulse 1.5s 0.6s ease-in-out infinite; }
`;

/* ── Lock icon ── */
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);

/* ── Mail icon ── */
const MailIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

/* ── Arrow left icon ── */
const ArrowLeft = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12"/>
    <polyline points="12 19 5 12 12 5"/>
  </svg>
);

/* ── Send icon ── */
const SendIcon = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/>
    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);

/* ════════════════════════════════════════════
   Main Page Component
════════════════════════════════════════════ */
export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!sent) setTimeout(() => inputRef.current?.focus(), 800);
  }, [sent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{css}</style>
      <div className="fp-root">
        {/* Atmospheric background */}
        <div className="fp-orb fp-orb-1" />
        <div className="fp-orb fp-orb-2" />
        <div className="fp-orb fp-orb-3" />
        <div className="fp-grid" />

        <div className="fp-card-wrap">
          <div className="fp-card">
            {/* Logo */}
            <div className="fp-logo-wrap">
              <div className="fp-logo-ring">
                {/* Spinning dashed ring */}
                <svg className="ring-svg" viewBox="0 0 68 68" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="34" cy="34" r="31"
                    stroke="url(#ringGrad)" strokeWidth="1.5"
                    strokeDasharray="6 4" strokeLinecap="round" />
                  <defs>
                    <linearGradient id="ringGrad" x1="0" y1="0" x2="68" y2="68" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#d4a43c" stopOpacity="0.8"/>
                      <stop offset="0.5" stopColor="#f0c870" stopOpacity="0.2"/>
                      <stop offset="1" stopColor="#d4a43c" stopOpacity="0.8"/>
                    </linearGradient>
                  </defs>
                </svg>
                <div className="fp-logo-icon">
                  <LockIcon />
                </div>
              </div>
              <h1 className="fp-title">Reset Password</h1>
              <p className="fp-subtitle">We'll send a secure link to your inbox</p>
            </div>

            <div className="fp-divider" />

            {/* Content */}
            {sent ? (
              <div className="fp-success">
                <div className="fp-success-icon">
                  <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
                    <path
                      className="check-path"
                      d="M7 17l7 7 13-13"
                      stroke="#d4a43c" strokeWidth="2.5"
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h2 className="fp-success-title">Check your inbox</h2>
                <p className="fp-success-body">
                  We've sent a reset link to{' '}
                  <span className="fp-success-email">{email}</span>.
                  It expires in 15 minutes.
                </p>
                <a href="mailto:" className="fp-open-btn">
                  <MailIcon size={15} /> Open email app
                </a>
                <div className="fp-back-inline" style={{ marginTop: '0.75rem' }}>
                  <Link href="/login">← Back to Sign In</Link>
                </div>
              </div>
            ) : (
              <form className="fp-form" onSubmit={handleSubmit}>
                <p className="fp-hint">
                  Enter the email address linked to your account and we'll send you a password reset link.
                </p>

                <div className="fp-field">
                  <label className="fp-label" htmlFor="email">Email address</label>
                  <div className="fp-input-wrap">
                    <span className="fp-input-icon">
                      <MailIcon size={16} />
                    </span>
                    <input
                      ref={inputRef}
                      id="email"
                      className="fp-input"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="fp-btn-wrap">
                  <button
                    type="submit"
                    className="fp-btn"
                    disabled={loading || !email}
                    aria-label="Send reset link"
                  >
                    {!loading && <span className="fp-btn-shimmer" />}
                    <span className="fp-btn-content">
                      {loading ? (
                        <>
                          <span className="fp-spinner" />
                          Sending…
                        </>
                      ) : (
                        <>
                          <SendIcon />
                          Send Reset Link
                        </>
                      )}
                    </span>
                  </button>
                </div>

                <div className="fp-back-inline">
                  <Link href="/login">← Back to Sign In</Link>
                </div>
              </form>
            )}
          </div>

          {/* Decorative dots */}
          <div className="fp-dots">
            <div className="fp-dot" />
            <div className="fp-dot" />
            <div className="fp-dot" />
          </div>
        </div>
      </div>
    </>
  );
}