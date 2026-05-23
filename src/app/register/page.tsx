'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

/* ── Particle canvas (same as login for consistency) ── */
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    let W = (canvas.width = window.innerWidth);
    let H = (canvas.height = window.innerHeight);
    const resize = () => {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    const dots = Array.from({ length: 50 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.3 + 0.3,
      vx: (Math.random() - 0.5) * 0.16,
      vy: (Math.random() - 0.5) * 0.16,
      o: Math.random() * 0.4 + 0.07,
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
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(148,163,255,${0.065 * (1 - dist / 100)})`;
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

/* ── Password strength meter ── */
function StrengthMeter({ password }: { password: string }) {
  const score = (() => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (password.length >= 12) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Excellent'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
  if (!password) return null;
  return (
    <div style={{ marginTop: 6 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= score ? colors[score] : 'rgba(255,255,255,0.08)',
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: colors[score], fontWeight: 600 }}>{labels[score]}</p>
    </div>
  );
}

type FormData = {
  name: string; email: string; password: string; confirmPassword: string;
  companyName: string; companyAddress: string; companyPhone: string; currency: string;
};

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [animDir, setAnimDir] = useState<'forward' | 'back'>('forward');
  const [animating, setAnimating] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: '', email: '', password: '', confirmPassword: '',
    companyName: '', companyAddress: '', companyPhone: '', currency: 'USD',
  });
  const set = (k: keyof FormData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => { setTimeout(() => setMounted(true), 60); }, []);

  const goStep = (dir: 'forward' | 'back') => {
    setAnimDir(dir);
    setAnimating(true);
    setTimeout(() => {
      setStep((s) => (dir === 'forward' ? s + 1 : s - 1));
      setAnimating(false);
    }, 220);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { goStep('forward'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await signUp(form.email, form.password, form.name, {
        name: form.companyName, address: form.companyAddress,
        phone: form.companyPhone, currency: form.currency,
        email: form.email, taxId: '', fiscalYearStart: '01-01',
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('email-already-in-use')) setError('An account with this email already exists.');
      else setError('Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const currencies = [
    { v: 'USD', l: 'USD — US Dollar' }, { v: 'EUR', l: 'EUR — Euro' },
    { v: 'GBP', l: 'GBP — British Pound' }, { v: 'NGN', l: 'NGN — Nigerian Naira' },
    { v: 'CAD', l: 'CAD — Canadian Dollar' }, { v: 'AUD', l: 'AUD — Australian Dollar' },
    { v: 'ZAR', l: 'ZAR — South African Rand' }, { v: 'KES', l: 'KES — Kenyan Shilling' },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070f; }

        .rg-root {
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #07070f;
          color: #e8e8f0;
          position: relative;
          overflow: hidden;
          padding: 32px 16px;
        }

        /* ambient orbs */
        .orb { position: fixed; border-radius: 50%; filter: blur(90px); pointer-events: none; z-index: 0; }
        .orb-1 { width: 500px; height: 500px; background: rgba(79,70,229,0.16); top: -160px; right: -80px; }
        .orb-2 { width: 380px; height: 380px; background: rgba(139,92,246,0.11); bottom: -100px; left: 40px; }
        .orb-3 { width: 260px; height: 260px; background: rgba(59,130,246,0.09); top: 45%; left: 50%; transform: translate(-50%,-50%); }

        /* ── wrap ── */
        .rg-wrap {
          width: 100%;
          max-width: 520px;
          position: relative;
          z-index: 1;
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.65s cubic-bezier(.22,1,.36,1), transform 0.65s cubic-bezier(.22,1,.36,1);
        }
        .rg-wrap.visible { opacity: 1; transform: translateY(0); }

        /* ── header ── */
        .rg-header { text-align: center; margin-bottom: 32px; }
        .rg-logo-icon {
          width: 52px; height: 52px; border-radius: 16px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          margin: 0 auto 16px;
          box-shadow: 0 0 36px rgba(99,102,241,0.45);
        }
        .rg-header h1 {
          font-family: 'DM Serif Display', serif;
          font-size: 28px;
          letter-spacing: -0.5px;
          color: #f0f0ff;
          margin-bottom: 6px;
        }
        .rg-header h1 em {
          font-style: italic;
          background: linear-gradient(135deg, #818cf8, #a78bfa);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .rg-header p { font-size: 14px; color: rgba(200,200,230,0.45); font-weight: 300; }

        /* ── step indicator ── */
        .rg-steps { display: flex; align-items: center; margin-bottom: 28px; }
        .rg-step {
          display: flex; align-items: center; gap: 10px;
          flex: 1;
        }
        .rg-step-bubble {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          flex-shrink: 0;
          transition: all 0.35s cubic-bezier(.22,1,.36,1);
          position: relative;
        }
        .rg-step-bubble.done {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 0 16px rgba(99,102,241,0.45);
          color: white;
        }
        .rg-step-bubble.active {
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 0 20px rgba(99,102,241,0.5);
          color: white;
        }
        .rg-step-bubble.active::after {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 1.5px solid rgba(129,140,248,0.35);
          animation: pulse-ring 1.8s ease-in-out infinite;
        }
        @keyframes pulse-ring {
          0%,100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 0; transform: scale(1.25); }
        }
        .rg-step-bubble.idle {
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.1);
          color: rgba(200,200,230,0.35);
        }
        .rg-step-label {
          font-size: 12px; font-weight: 500;
          transition: color 0.3s;
        }
        .rg-step-label.active { color: #c4b5fd; }
        .rg-step-label.done { color: rgba(200,200,230,0.55); }
        .rg-step-label.idle { color: rgba(200,200,230,0.25); }
        .rg-step-connector {
          flex: 1; height: 1px; margin: 0 8px;
          background: rgba(255,255,255,0.07);
          position: relative; overflow: hidden;
        }
        .rg-step-connector::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(90deg, #4f46e5, #7c3aed);
          transform-origin: left;
          transform: scaleX(0);
          transition: transform 0.5s cubic-bezier(.22,1,.36,1);
        }
        .rg-step-connector.filled::after { transform: scaleX(1); }

        /* ── card ── */
        .rg-card {
          background: rgba(255,255,255,0.025);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          padding: 32px;
          backdrop-filter: blur(3px);
          position: relative;
          overflow: hidden;
        }
        .rg-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(129,140,248,0.4), transparent);
        }

        /* step content animation */
        .rg-step-content {
          transition: opacity 0.22s ease, transform 0.22s ease;
        }
        .rg-step-content.exit-forward { opacity: 0; transform: translateX(-20px); }
        .rg-step-content.exit-back { opacity: 0; transform: translateX(20px); }

        /* ── section heading ── */
        .rg-section-head {
          display: flex; align-items: center; gap: 10px;
          margin-bottom: 22px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }
        .rg-section-icon {
          width: 34px; height: 34px; border-radius: 10px;
          background: rgba(99,102,241,0.16);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .rg-section-head h2 {
          font-family: 'DM Serif Display', serif;
          font-size: 18px; color: #f0f0ff;
          letter-spacing: -0.3px;
        }
        .rg-section-head p { font-size: 12px; color: rgba(200,200,230,0.4); margin-top: 2px; font-weight: 300; }

        /* ── form grid ── */
        .rg-form { display: flex; flex-direction: column; gap: 16px; }
        .rg-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        @media (max-width: 480px) { .rg-grid-2 { grid-template-columns: 1fr; } }

        /* ── field ── */
        .rg-field { display: flex; flex-direction: column; gap: 7px; }
        .rg-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.1em;
          color: rgba(200,200,230,0.45);
        }
        .rg-input-wrap {
          border-radius: 12px;
          background: rgba(255,255,255,0.04);
          border: 1.5px solid rgba(255,255,255,0.08);
          transition: border-color 0.25s, background 0.25s, box-shadow 0.25s;
          display: flex; align-items: center;
          position: relative; overflow: hidden;
        }
        .rg-input-wrap:focus-within {
          border-color: rgba(129,140,248,0.55);
          background: rgba(99,102,241,0.055);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.11);
        }
        .rg-input-wrap input,
        .rg-input-wrap select {
          width: 100%; padding: 13px 14px; background: transparent;
          border: none; outline: none;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          color: #e8e8f4; font-weight: 400;
        }
        .rg-input-wrap select option { background: #12121f; color: #e8e8f4; }
        .rg-input-wrap input::placeholder { color: rgba(200,200,230,0.2); }
        .rg-input-wrap input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0 1000px #0e0e1c inset;
          -webkit-text-fill-color: #e8e8f4;
        }
        .rg-pw-toggle {
          background: none; border: none; cursor: pointer;
          color: rgba(200,200,230,0.28); padding: 0 12px;
          display: flex; align-items: center; flex-shrink: 0;
          transition: color 0.2s;
        }
        .rg-pw-toggle:hover { color: rgba(200,200,230,0.65); }

        /* ── error ── */
        .rg-error {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 13px 15px; border-radius: 12px; margin-bottom: 18px;
          background: rgba(239,68,68,0.09);
          border: 1px solid rgba(239,68,68,0.2);
          animation: shake 0.38s ease;
        }
        .rg-error p { font-size: 13px; color: #fca5a5; line-height: 1.45; }
        @keyframes shake {
          0%,100%{transform:translateX(0)} 20%{transform:translateX(-5px)} 40%{transform:translateX(5px)}
          60%{transform:translateX(-3px)} 80%{transform:translateX(3px)}
        }

        /* ── buttons ── */
        .rg-btn-row { display: flex; gap: 12px; margin-top: 8px; }
        .rg-btn-back {
          flex: 0 0 auto;
          padding: 14px 20px;
          border-radius: 12px;
          border: 1.5px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.04);
          color: rgba(200,200,230,0.6);
          font-size: 14px; font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          display: flex; align-items: center; gap: 6px;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .rg-btn-back:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.17); color: rgba(200,200,230,0.85); }
        .rg-btn-primary {
          flex: 1;
          padding: 14px;
          border-radius: 12px;
          border: none;
          font-size: 14px; font-weight: 700;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.03em;
          color: #fff;
          cursor: pointer;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          box-shadow: 0 6px 28px rgba(99,102,241,0.36), inset 0 1px 0 rgba(255,255,255,0.15);
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: transform 0.18s, box-shadow 0.18s, opacity 0.18s;
          position: relative; overflow: hidden;
        }
        .rg-btn-primary::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0; transition: opacity 0.25s;
        }
        .rg-btn-primary:hover:not(:disabled)::before { opacity: 1; }
        .rg-btn-primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 36px rgba(99,102,241,0.44), inset 0 1px 0 rgba(255,255,255,0.15); }
        .rg-btn-primary:active:not(:disabled) { transform: translateY(0); }
        .rg-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* ── footer ── */
        .rg-footer { text-align: center; margin-top: 22px; font-size: 13px; color: rgba(200,200,230,0.4); }
        .rg-footer a { color: #818cf8; font-weight: 600; text-decoration: none; transition: color 0.2s; }
        .rg-footer a:hover { color: #a5b4fc; }

        /* ── terms note ── */
        .rg-terms {
          margin-top: 18px; text-align: center;
          font-size: 11px; color: rgba(200,200,230,0.22);
          line-height: 1.6;
        }
        .rg-terms a { color: rgba(129,140,248,0.5); text-decoration: none; }
        .rg-terms a:hover { color: rgba(129,140,248,0.8); }

        /* ── field stagger ── */
        .rg-field { animation: fieldIn 0.4s both; }
        .rg-field:nth-child(1) { animation-delay: 0.03s; }
        .rg-field:nth-child(2) { animation-delay: 0.07s; }
        .rg-field:nth-child(3) { animation-delay: 0.11s; }
        .rg-field:nth-child(4) { animation-delay: 0.15s; }
        @keyframes fieldIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }

        /* hide default select arrow on some browsers */
        .rg-input-wrap select { appearance: none; -webkit-appearance: none; cursor: pointer; }
        .rg-select-wrap { position: relative; }
        .rg-select-wrap::after {
          content: '';
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          width: 0; height: 0;
          border-left: 4px solid transparent;
          border-right: 4px solid transparent;
          border-top: 5px solid rgba(200,200,230,0.3);
          pointer-events: none;
        }
      `}</style>

      <div className="rg-root">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <ParticleCanvas />

        <div className={`rg-wrap ${mounted ? 'visible' : ''}`}>

          {/* Header */}
          <div className="rg-header">
            <div className="rg-logo-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                <polyline points="9,22 9,12 15,12 15,22"/>
              </svg>
            </div>
            <h1>Create your <em>workspace</em></h1>
            <p>Set up LedgerFlow for your organisation in two quick steps</p>
          </div>

          {/* Step indicator */}
          <div className="rg-steps">
            {[
              { n: 1, label: 'Company Info' },
              { n: 2, label: 'Your Account' },
            ].map((s, i) => {
              const state = s.n < step ? 'done' : s.n === step ? 'active' : 'idle';
              return (
                <div key={s.n} className="rg-step" style={{ flex: i < 1 ? '0 0 auto' : 1 }}>
                  <div className={`rg-step-bubble ${state}`}>
                    {state === 'done' ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : s.n}
                  </div>
                  <span className={`rg-step-label ${state}`}>{s.label}</span>
                  {i < 1 && (
                    <div className={`rg-step-connector ${step > 1 ? 'filled' : ''}`} style={{ flex: 1 }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Card */}
          <div className="rg-card">
            {/* error */}
            {error && (
              <div className="rg-error">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div
                className={`rg-step-content ${animating ? (animDir === 'forward' ? 'exit-forward' : 'exit-back') : ''}`}
              >
                {step === 1 ? (
                  <>
                    <div className="rg-section-head">
                      <div className="rg-section-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
                        </svg>
                      </div>
                      <div>
                        <h2>Company Information</h2>
                        <p>Tell us about the organisation this workspace belongs to</p>
                      </div>
                    </div>

                    <div className="rg-form">
                      <div className="rg-field">
                        <label className="rg-label">Company name <Req /></label>
                        <div className="rg-input-wrap">
                          <input type="text" placeholder="Acme Corporation" value={form.companyName} onChange={set('companyName')} required autoFocus />
                        </div>
                      </div>

                      <div className="rg-grid-2">
                        <div className="rg-field">
                          <label className="rg-label">Phone</label>
                          <div className="rg-input-wrap">
                            <input type="tel" placeholder="+1 555 000 0000" value={form.companyPhone} onChange={set('companyPhone')} />
                          </div>
                        </div>
                        <div className="rg-field">
                          <label className="rg-label">Currency</label>
                          <div className="rg-input-wrap rg-select-wrap">
                            <select value={form.currency} onChange={set('currency')}>
                              {currencies.map((c) => (
                                <option key={c.v} value={c.v}>{c.l}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="rg-field">
                        <label className="rg-label">Business address</label>
                        <div className="rg-input-wrap">
                          <input type="text" placeholder="123 Main Street, Lagos, Nigeria" value={form.companyAddress} onChange={set('companyAddress')} />
                        </div>
                      </div>

                      <div className="rg-btn-row">
                        <button type="submit" className="rg-btn-primary">
                          Continue
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rg-section-head">
                      <div className="rg-section-icon">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div>
                        <h2>Admin Account</h2>
                        <p>Your credentials — you&apos;ll be the workspace owner</p>
                      </div>
                    </div>

                    <div className="rg-form">
                      <div className="rg-field">
                        <label className="rg-label">Full name <Req /></label>
                        <div className="rg-input-wrap">
                          <input type="text" placeholder="John Doe" value={form.name} onChange={set('name')} required autoFocus />
                        </div>
                      </div>

                      <div className="rg-field">
                        <label className="rg-label">Email address <Req /></label>
                        <div className="rg-input-wrap">
                          <input type="email" placeholder="john@acme.com" value={form.email} onChange={set('email')} required />
                        </div>
                      </div>

                      <div className="rg-grid-2">
                        <div className="rg-field">
                          <label className="rg-label">Password <Req /></label>
                          <div className="rg-input-wrap">
                            <input
                              type={showPw ? 'text' : 'password'}
                              placeholder="Min 8 characters"
                              value={form.password}
                              onChange={set('password')}
                              required
                              style={{ paddingRight: 0 }}
                            />
                            <button type="button" className="rg-pw-toggle" onClick={() => setShowPw(!showPw)} aria-label="Toggle password">
                              {showPw ? <EyeOff /> : <EyeOn />}
                            </button>
                          </div>
                          <StrengthMeter password={form.password} />
                        </div>
                        <div className="rg-field">
                          <label className="rg-label">Confirm <Req /></label>
                          <div className="rg-input-wrap">
                            <input
                              type={showCpw ? 'text' : 'password'}
                              placeholder="Repeat password"
                              value={form.confirmPassword}
                              onChange={set('confirmPassword')}
                              required
                              style={{ paddingRight: 0 }}
                            />
                            <button type="button" className="rg-pw-toggle" onClick={() => setShowCpw(!showCpw)} aria-label="Toggle confirm password">
                              {showCpw ? <EyeOff /> : <EyeOn />}
                            </button>
                          </div>
                          {form.confirmPassword && form.password !== form.confirmPassword && (
                            <p style={{ fontSize: 11, color: '#f87171', marginTop: 4, fontWeight: 500 }}>Passwords don&apos;t match</p>
                          )}
                          {form.confirmPassword && form.password === form.confirmPassword && form.confirmPassword.length > 0 && (
                            <p style={{ fontSize: 11, color: '#34d399', marginTop: 4, fontWeight: 500 }}>✓ Passwords match</p>
                          )}
                        </div>
                      </div>

                      <div className="rg-btn-row">
                        <button type="button" className="rg-btn-back" onClick={() => goStep('back')}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
                          </svg>
                          Back
                        </button>
                        <button type="submit" className="rg-btn-primary" disabled={loading}>
                          {loading ? (
                            <>
                              <svg className="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 12a9 9 0 11-6.219-8.56"/>
                              </svg>
                              Creating workspace…
                            </>
                          ) : (
                            <>
                              Create Workspace
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"/>
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>

          <p className="rg-footer">
            Already have an account?{' '}
            <Link href="/login">Sign in instead</Link>
          </p>

          <p className="rg-terms">
            By creating an account you agree to our{' '}
            <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            <br />Your data is encrypted at rest and in transit.
          </p>
        </div>
      </div>
    </>
  );
}

/* ── Inline helpers ── */
function Req() {
  return <span style={{ color: 'rgba(167,139,250,0.7)', marginLeft: 2 }}>*</span>;
}
function EyeOn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}
function EyeOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}