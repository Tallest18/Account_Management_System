'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/* ── Floating particle canvas ── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const resize = () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; };
    window.addEventListener('resize', resize);

    const dots = Array.from({ length: 55 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      o: Math.random() * 0.45 + 0.08,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      for (const d of dots) {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = W; if (d.x > W) d.x = 0;
        if (d.y < 0) d.y = H; if (d.y > H) d.y = 0;
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(148,163,255,${d.o})`;
        ctx.fill();
      }
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x, dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(148,163,255,${0.07 * (1 - dist / 110)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, []);
  return <canvas ref={canvasRef} style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }} />;
}

/* ── Animated counter for stat numbers ── */
function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = to / 50;
    const id = setInterval(() => {
      start += step;
      if (start >= to) { setVal(to); clearInterval(id); } else setVal(Math.floor(start));
    }, 22);
    return () => clearInterval(id);
  }, [to]);
  return <>{val.toLocaleString()}{suffix}</>;
}

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password') || msg.includes('user-not-found')) {
        setError('Invalid email or password. Please try again.');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many failed attempts. Please wait a few minutes.');
      } else if (msg.includes('deactivated')) {
        setError('Your account has been deactivated. Contact your administrator.');
      } else {
        setError('Sign in failed. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: <IconZap />, label: 'Real-time sync', desc: 'Live Firestore updates across every session instantly' },
    { icon: <IconAudit />, label: 'Immutable audit log', desc: 'Every action stamped — who, what, and exactly when' },
    { icon: <IconChart />, label: 'GAAP-standard reports', desc: 'Trial balance, P&L, and balance sheet on demand' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body { background: #07070f; }

        .lf-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          background: #07070f;
          color: #e8e8f0;
          position: relative;
          overflow: hidden;
        }

        /* ── ambient orbs ── */
        .orb {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .orb-1 { width: 520px; height: 520px; background: rgba(79,70,229,0.18); top: -140px; left: -100px; }
        .orb-2 { width: 420px; height: 420px; background: rgba(139,92,246,0.12); bottom: -120px; right: 60px; }
        .orb-3 { width: 280px; height: 280px; background: rgba(59,130,246,0.10); top: 40%; left: 38%; }

        /* ── left panel ── */
        .lf-left {
          display: none;
          flex-direction: column;
          justify-content: space-between;
          width: 480px;
          flex-shrink: 0;
          padding: 52px 48px;
          border-right: 1px solid rgba(255,255,255,0.06);
          background: rgba(255,255,255,0.02);
          position: relative;
          z-index: 1;
          backdrop-filter: blur(2px);
        }
        @media (min-width: 1024px) { .lf-left { display: flex; } }

        .lf-logo { display: flex; align-items: center; gap: 12px; }
        .lf-logo-icon {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 28px rgba(99,102,241,0.5);
          flex-shrink: 0;
        }
        .lf-logo-name {
          font-family: 'DM Serif Display', serif;
          font-size: 22px;
          color: #f0f0ff;
          letter-spacing: -0.3px;
        }

        .lf-headline {
          margin-top: 56px;
        }
        .lf-headline h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 42px;
          line-height: 1.12;
          letter-spacing: -1px;
          color: #f0f0ff;
          margin-bottom: 16px;
        }
        .lf-headline h1 em {
          font-style: italic;
          background: linear-gradient(135deg, #818cf8, #a78bfa, #60a5fa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .lf-headline p {
          font-size: 15px;
          line-height: 1.7;
          color: rgba(220,220,240,0.55);
          font-weight: 300;
        }

        /* ── stats row ── */
        .lf-stats {
          display: flex;
          gap: 0;
          margin-top: 44px;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px;
          overflow: hidden;
          background: rgba(255,255,255,0.025);
        }
        .lf-stat {
          flex: 1;
          padding: 18px 16px;
          text-align: center;
          border-right: 1px solid rgba(255,255,255,0.06);
        }
        .lf-stat:last-child { border-right: none; }
        .lf-stat-num {
          font-family: 'DM Serif Display', serif;
          font-size: 26px;
          color: #c4b5fd;
          line-height: 1;
          margin-bottom: 4px;
        }
        .lf-stat-label { font-size: 11px; color: rgba(200,200,220,0.4); text-transform: uppercase; letter-spacing: 0.08em; }

        /* ── feature list ── */
        .lf-features { display: flex; flex-direction: column; gap: 10px; margin-top: 32px; }
        .lf-feature {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 16px;
          border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.055);
          background: rgba(255,255,255,0.02);
          transition: border-color 0.25s, background 0.25s;
          cursor: default;
        }
        .lf-feature:hover {
          border-color: rgba(129,140,248,0.28);
          background: rgba(99,102,241,0.07);
        }
        .lf-feature-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: rgba(99,102,241,0.18);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .lf-feature-label { font-size: 13px; font-weight: 600; color: #d8d8f0; margin-bottom: 2px; }
        .lf-feature-desc { font-size: 12px; color: rgba(180,180,210,0.45); line-height: 1.5; font-weight: 300; }

        .lf-copy { font-size: 11px; color: rgba(200,200,220,0.25); letter-spacing: 0.02em; }

        /* ── right panel ── */
        .lf-right {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
          position: relative;
          z-index: 1;
        }

        .lf-form-wrap {
          width: 100%;
          max-width: 420px;
          opacity: 0;
          transform: translateY(24px);
          transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1);
        }
        .lf-form-wrap.visible { opacity: 1; transform: translateY(0); }

        /* mobile logo */
        .lf-mobile-logo { display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 40px; }
        @media (min-width: 1024px) { .lf-mobile-logo { display: none; } }

        .lf-welcome { margin-bottom: 32px; }
        .lf-welcome h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 30px;
          letter-spacing: -0.5px;
          color: #f0f0ff;
          margin-bottom: 6px;
        }
        .lf-welcome p { font-size: 14px; color: rgba(200,200,225,0.5); font-weight: 300; }

        /* ── error banner ── */
        .lf-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 14px 16px;
          border-radius: 12px;
          margin-bottom: 24px;
          background: rgba(239,68,68,0.10);
          border: 1px solid rgba(239,68,68,0.22);
          animation: shake 0.4s ease;
        }
        .lf-error p { font-size: 13px; color: #fca5a5; line-height: 1.45; }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
          60%{transform:translateX(-3px)} 80%{transform:translateX(3px)}
        }

        /* ── form layout ── */
        .lf-form { display: flex; flex-direction: column; gap: 20px; }

        .lf-field { display: flex; flex-direction: column; gap: 7px; }

        .lf-label-row { display: flex; align-items: center; justify-content: space-between; }
        .lf-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(200,200,230,0.5); }
        .lf-forgot { font-size: 12px; color: #818cf8; text-decoration: none; font-weight: 500; transition: color 0.2s; }
        .lf-forgot:hover { color: #a5b4fc; }

        /* ── input wrapper ── */
        .lf-input-wrap {
          position: relative;
          border-radius: 13px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          overflow: hidden;
        }
        .lf-input-wrap.focused {
          border-color: rgba(129,140,248,0.6);
          background: rgba(99,102,241,0.06);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
        }
        .lf-input-wrap input {
          width: 100%;
          padding: 14px 14px 14px 44px;
          background: transparent;
          border: none;
          outline: none;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #e8e8f4;
          font-weight: 400;
        }
        .lf-input-wrap input::placeholder { color: rgba(200,200,230,0.22); }
        .lf-input-wrap input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #0d0d1a inset;
          -webkit-text-fill-color: #e8e8f4;
        }
        .lf-icon-left {
          position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
          pointer-events: none;
          transition: color 0.25s;
        }
        .lf-icon-right {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; padding: 4px;
          color: rgba(200,200,230,0.3); transition: color 0.2s;
          display: flex; align-items: center;
        }
        .lf-icon-right:hover { color: rgba(200,200,230,0.7); }

        /* ── submit button ── */
        .lf-btn {
          position: relative;
          width: 100%;
          padding: 15px;
          border-radius: 13px;
          border: none;
          font-size: 14px;
          font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.03em;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 6px 28px rgba(99,102,241,0.38), inset 0 1px 0 rgba(255,255,255,0.15);
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
          overflow: hidden;
          margin-top: 4px;
        }
        .lf-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0;
          transition: opacity 0.25s;
        }
        .lf-btn:hover:not(:disabled)::before { opacity: 1; }
        .lf-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 36px rgba(99,102,241,0.46), inset 0 1px 0 rgba(255,255,255,0.15); }
        .lf-btn:active:not(:disabled) { transform: translateY(0); box-shadow: 0 4px 16px rgba(99,102,241,0.30); }
        .lf-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .lf-btn-inner { display: flex; align-items: center; justify-content: center; gap: 8px; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── divider ── */
        .lf-divider { display: flex; align-items: center; gap: 12px; margin: 20px 0; }
        .lf-divider-line { flex: 1; height: 1px; background: rgba(255,255,255,0.07); }
        .lf-divider span { font-size: 11px; color: rgba(200,200,230,0.25); }

        /* ── register link ── */
        .lf-register { text-align: center; font-size: 13px; color: rgba(200,200,230,0.45); }
        .lf-register a { color: #818cf8; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .lf-register a:hover { color: #a5b4fc; }

        /* ── security badge ── */
        .lf-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 28px;
          padding: 11px 16px;
          border-radius: 12px;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
        }
        .lf-badge span { font-size: 11px; color: rgba(200,200,230,0.35); letter-spacing: 0.02em; }

        /* ── stagger for features ── */
        .lf-feature:nth-child(1) { animation: fadeUp 0.5s 0.15s both; }
        .lf-feature:nth-child(2) { animation: fadeUp 0.5s 0.25s both; }
        .lf-feature:nth-child(3) { animation: fadeUp 0.5s 0.35s both; }
        @keyframes fadeUp { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: none; } }

        /* ── progress shimmer on loading ── */
        .lf-shimmer {
          position: absolute;
          top: 0; left: -100%;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          animation: shimmer 1.2s infinite;
        }
        @keyframes shimmer { to { left: 200%; } }
      `}</style>

      <div className="lf-root">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <ParticleCanvas />

        {/* ── LEFT PANEL ── */}
        <aside className="lf-left">
          <div>
            {/* Logo */}
            <div className="lf-logo">
              <div className="lf-logo-icon"><IconHome /></div>
              <span className="lf-logo-name">LedgerFlow</span>
            </div>

            {/* Headline */}
            <div className="lf-headline">
              <h1>Your finances,<br /><em>fully in control.</em></h1>
              <p>Professional double-entry accounting with real-time reporting, immutable audit trails, and role-based access for your entire team.</p>
            </div>

            {/* Stats */}
            <div className="lf-stats">
              {[
                { num: 12400, suffix: '+', label: 'Transactions' },
                { num: 99.9, suffix: '%', label: 'Uptime' },
                { num: 3, suffix: 's', label: 'Avg. sync' },
              ].map((s) => (
                <div key={s.label} className="lf-stat">
                  <div className="lf-stat-num"><Counter to={s.num} suffix={s.suffix} /></div>
                  <div className="lf-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Features */}
            <div className="lf-features">
              {features.map((f) => (
                <div key={f.label} className="lf-feature">
                  <div className="lf-feature-icon">{f.icon}</div>
                  <div>
                    <p className="lf-feature-label">{f.label}</p>
                    <p className="lf-feature-desc">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="lf-copy">© 2026 LedgerFlow · Secured by Firebase Auth</p>
        </aside>

        {/* ── RIGHT PANEL ── */}
        <main className="lf-right">
          <div className={`lf-form-wrap ${mounted ? 'visible' : ''}`}>

            {/* Mobile logo */}
            <div className="lf-mobile-logo">
              <div className="lf-logo-icon"><IconHome /></div>
              <span className="lf-logo-name">LedgerFlow</span>
            </div>

            <div className="lf-welcome">
              <h2>Welcome back</h2>
              <p>Sign in to your accounting workspace</p>
            </div>

            {/* Error */}
            {error && (
              <div className="lf-error">
                <IconError />
                <p>{error}</p>
              </div>
            )}

            <form className="lf-form" onSubmit={handleSubmit}>
              {/* Email */}
              <div className="lf-field">
                <label className="lf-label">Email address</label>
                <div className={`lf-input-wrap ${emailFocused ? 'focused' : ''}`}>
                  <span className="lf-icon-left">
                    <IconMail focused={emailFocused} />
                  </span>
                  <input
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    autoComplete="email"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="lf-field">
                <div className="lf-label-row">
                  <label className="lf-label">Password</label>
                  <Link href="/forgot-password" className="lf-forgot">Forgot password?</Link>
                </div>
                <div className={`lf-input-wrap ${pwFocused ? 'focused' : ''}`}>
                  <span className="lf-icon-left">
                    <IconLock focused={pwFocused} />
                  </span>
                  <input
                    type={showPw ? 'text' : 'password'}
                    placeholder="••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                    required
                    autoComplete="current-password"
                    style={{ paddingRight: '44px' }}
                  />
                  <button type="button" className="lf-icon-right" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                    {showPw ? <IconEyeOff /> : <IconEye />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button type="submit" className="lf-btn" disabled={loading}>
                {loading && <span className="lf-shimmer" />}
                <span className="lf-btn-inner">
                  {loading ? (
                    <>
                      <svg className="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                      </svg>
                      Signing in…
                    </>
                  ) : (
                    <>Sign In <IconArrow /></>
                  )}
                </span>
              </button>
            </form>

            {/* Divider */}
            <div className="lf-divider">
              <div className="lf-divider-line" />
              <span>or</span>
              <div className="lf-divider-line" />
            </div>

            <p className="lf-register">
              Don&apos;t have an account?{' '}
              <Link href="/register">Create one free</Link>
            </p>

            {/* Security badge */}
            <div className="lf-badge">
              <IconShield />
              <span>256-bit encrypted · All logins audited · Role-protected</span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

/* ── Inline SVG icons ── */
const ic = (w = 16, stroke = 'rgba(148,163,255,0.55)') => ({ width: w, height: w, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const });

function IconHome() {
  return (
    <svg {...ic(20, 'white')}>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  );
}
function IconMail({ focused }: { focused: boolean }) {
  return (
    <svg {...ic(15, focused ? 'rgba(129,140,248,0.9)' : 'rgba(200,200,230,0.25)')}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}
function IconLock({ focused }: { focused: boolean }) {
  return (
    <svg {...ic(15, focused ? 'rgba(129,140,248,0.9)' : 'rgba(200,200,230,0.25)')}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg {...ic(16, 'currentColor')}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconEyeOff() {
  return (
    <svg {...ic(16, 'currentColor')}>
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
function IconArrow() {
  return (
    <svg {...ic(15, 'white')}>
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconError() {
  return (
    <svg {...ic(16, '#f87171')} style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}
function IconShield() {
  return (
    <svg {...ic(13, '#6ee7b7')} style={{ flexShrink: 0 }}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconZap() {
  return (
    <svg {...ic(16, '#a78bfa')}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}
function IconAudit() {
  return (
    <svg {...ic(16, '#a78bfa')}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg {...ic(16, '#a78bfa')}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}