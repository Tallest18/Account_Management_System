'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { createUser } from '@/lib/db';
import { getInviteByToken, acceptInvite } from '@/lib/invites';
import { createAuditLog } from '@/lib/audit';
import { User } from '@/types';
import { Invite } from '@/lib/invites';

type Step = 'loading' | 'invalid' | 'expired' | 'already_used' | 'form' | 'success';

/* ─────────────────────────────────────────────────────────────────
   CSS — self-contained design system for the invite page
───────────────────────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg:        #06060e;
  --bg1:       #0a0a18;
  --bg2:       #0d0d1f;
  --bg3:       #111128;
  --bg4:       #16162e;
  --border:    rgba(255,255,255,0.06);
  --border2:   rgba(255,255,255,0.11);
  --border3:   rgba(255,255,255,0.18);
  --ink:       #f0ecf8;
  --ink2:      rgba(240,236,248,0.60);
  --ink3:      rgba(240,236,248,0.32);
  --ink4:      rgba(240,236,248,0.14);

  --indigo:    #6366f1;
  --indigo-b:  #818cf8;
  --indigo-dim:rgba(99,102,241,0.14);
  --indigo-glow:rgba(99,102,241,0.22);
  --violet:    #8b5cf6;
  --violet-dim:rgba(139,92,246,0.12);

  --gold:      #f0c060;
  --gold-dim:  rgba(240,192,96,0.12);

  --green:     #34d399;
  --green-dim: rgba(52,211,153,0.12);
  --rose:      #fb7185;
  --rose-dim:  rgba(251,113,133,0.12);
  --amber:     #fbbf24;
  --amber-dim: rgba(251,191,36,0.12);

  --r:  16px;
  --rsm: 10px;

  font-family: 'DM Sans', sans-serif;
  background: var(--bg);
  color: var(--ink);
}

/* ── Page shell ───────────────────────────────────────────── */
.iv-shell {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 32px 20px 48px;
  position: relative; overflow: hidden;
}

/* ── Canvas background ────────────────────────────────────── */
.iv-canvas {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
}

/* ── Orbs ─────────────────────────────────────────────────── */
.iv-orb {
  position: absolute; border-radius: 50%;
  filter: blur(90px); animation: orbDrift linear infinite;
  transform-origin: center;
}
.iv-orb-1 {
  width: 600px; height: 500px;
  top: -180px; right: -160px;
  background: radial-gradient(ellipse, rgba(79,70,229,0.16) 0%, transparent 65%);
  animation-duration: 22s;
}
.iv-orb-2 {
  width: 500px; height: 420px;
  bottom: -160px; left: -140px;
  background: radial-gradient(ellipse, rgba(139,92,246,0.11) 0%, transparent 65%);
  animation-duration: 30s; animation-direction: reverse;
}
.iv-orb-3 {
  width: 300px; height: 280px;
  top: 40%; left: 35%;
  background: radial-gradient(ellipse, rgba(99,102,241,0.07) 0%, transparent 65%);
  animation-duration: 18s;
}
@keyframes orbDrift {
  0%   { transform: translate(0, 0) scale(1); }
  25%  { transform: translate(20px, -15px) scale(1.04); }
  50%  { transform: translate(-10px, 20px) scale(0.97); }
  75%  { transform: translate(15px, 10px) scale(1.02); }
  100% { transform: translate(0, 0) scale(1); }
}

/* ── Grid ─────────────────────────────────────────────────── */
.iv-grid {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background-image:
    linear-gradient(rgba(99,102,241,0.028) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.028) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 60% 55% at 50% 45%, black 5%, transparent 100%);
}

/* ── Particles ────────────────────────────────────────────── */
.iv-particle {
  position: absolute; border-radius: 50%; pointer-events: none;
  animation: particleFloat linear infinite;
}
@keyframes particleFloat {
  0%   { transform: translateY(0) translateX(0); opacity: 0; }
  10%  { opacity: 1; }
  90%  { opacity: 0.4; }
  100% { transform: translateY(-120px) translateX(var(--dx, 20px)); opacity: 0; }
}

/* ── Content wrapper ──────────────────────────────────────── */
.iv-wrap {
  position: relative; z-index: 1;
  width: 100%; max-width: 460px;
}

/* ── Logo ─────────────────────────────────────────────────── */
.iv-logo {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  margin-bottom: 36px;
  opacity: 0; transform: translateY(-12px);
  animation: fadeUp 0.6s cubic-bezier(.22,1,.36,1) 0.05s forwards;
}
.iv-logo-mark {
  width: 44px; height: 44px; border-radius: 13px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 28px rgba(99,102,241,0.5), 0 0 0 1px rgba(129,140,248,0.3);
  position: relative; overflow: hidden;
}
.iv-logo-mark::after {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.14) 0%, transparent 60%);
}
.iv-logo-name {
  font-family: 'Cormorant Garamond', serif;
  font-size: 24px; font-weight: 400; letter-spacing: -0.01em;
  color: var(--ink);
}
.iv-logo-name span { font-style: italic; color: var(--indigo-b); }

/* ── Card ─────────────────────────────────────────────────── */
.iv-card {
  background: var(--bg1);
  border: 1px solid rgba(99,102,241,0.15);
  border-radius: 22px;
  box-shadow:
    0 40px 100px rgba(0,0,0,0.55),
    0 0 0 1px rgba(255,255,255,0.03),
    inset 0 1px 0 rgba(129,140,248,0.07);
  overflow: hidden;
  opacity: 0; transform: translateY(20px) scale(0.98);
  animation: cardIn 0.65s cubic-bezier(.22,1,.36,1) 0.15s forwards;
}
@keyframes cardIn {
  to { opacity: 1; transform: none; }
}

/* ── Card header band ─────────────────────────────────────── */
.iv-card-band {
  height: 3px;
  background: linear-gradient(90deg, #4f46e5, #7c3aed, #4f46e5);
  background-size: 200% auto;
  animation: bandFlow 3s linear infinite;
}
@keyframes bandFlow {
  to { background-position: 200% center; }
}

/* ── Card body ────────────────────────────────────────────── */
.iv-body { padding: 36px 36px 40px; }

/* ── Status states ────────────────────────────────────────── */
.iv-state {
  display: flex; flex-direction: column; align-items: center;
  text-align: center; padding: 12px 0 8px;
}
.iv-state-icon {
  width: 72px; height: 72px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 24px; position: relative;
}
.iv-state-icon::before {
  content: ''; position: absolute; inset: -4px;
  border-radius: 50%; opacity: 0.4;
  animation: iconPulse 2.5s ease-in-out infinite;
}
@keyframes iconPulse {
  0%,100% { transform: scale(1); opacity: 0.3; }
  50%      { transform: scale(1.08); opacity: 0.6; }
}

.iv-state-icon.loading {
  background: var(--indigo-dim);
  border: 1px solid rgba(99,102,241,0.2);
}
.iv-state-icon.loading::before { border: 1px solid rgba(99,102,241,0.3); }

.iv-state-icon.error-red {
  background: var(--rose-dim);
  border: 1px solid rgba(251,113,133,0.25);
}
.iv-state-icon.error-red::before { border: 1px solid rgba(251,113,133,0.3); }

.iv-state-icon.error-amber {
  background: var(--amber-dim);
  border: 1px solid rgba(251,191,36,0.25);
}
.iv-state-icon.error-amber::before { border: 1px solid rgba(251,191,36,0.3); }

.iv-state-icon.success-green {
  background: var(--green-dim);
  border: 1px solid rgba(52,211,153,0.25);
}
.iv-state-icon.success-green::before { border: 1px solid rgba(52,211,153,0.3); }

.iv-state-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 26px; font-weight: 400; line-height: 1.2;
  margin-bottom: 10px;
}
.iv-state-desc {
  font-size: 13px; line-height: 1.65; color: var(--ink2);
  max-width: 300px; margin-bottom: 24px;
}
.iv-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 500;
  color: var(--indigo-b); text-decoration: none;
  padding: 9px 18px; border-radius: 8px;
  border: 1px solid rgba(99,102,241,0.25);
  background: var(--indigo-dim);
  transition: all 0.18s ease;
}
.iv-back-link:hover {
  background: rgba(99,102,241,0.22);
  border-color: rgba(99,102,241,0.4);
  transform: translateY(-1px);
}

/* ── Spinner ──────────────────────────────────────────────── */
.iv-spinner {
  width: 28px; height: 28px; border-radius: 50%;
  border: 2.5px solid rgba(99,102,241,0.2);
  border-top-color: var(--indigo-b);
  animation: spin 0.75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Invite seal ──────────────────────────────────────────── */
.iv-seal {
  display: flex; align-items: center; gap: 14px;
  padding: 14px 18px; margin-bottom: 28px;
  background: linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(139,92,246,0.06) 100%);
  border: 1px solid rgba(99,102,241,0.22);
  border-radius: 14px; position: relative; overflow: hidden;
}
.iv-seal::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 40%, rgba(129,140,248,0.06) 50%, transparent 60%);
  background-size: 200% auto;
  animation: sealShimmer 4s linear infinite;
}
@keyframes sealShimmer {
  to { background-position: -200% center; }
}
.iv-seal-badge {
  width: 40px; height: 40px; flex-shrink: 0;
  border-radius: 10px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 16px rgba(99,102,241,0.4);
}
.iv-seal-label {
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--indigo-b); margin-bottom: 3px;
}
.iv-seal-company {
  font-family: 'Cormorant Garamond', serif;
  font-size: 17px; font-weight: 400; line-height: 1.2; color: var(--ink);
}
.iv-seal-meta {
  font-size: 11px; color: var(--ink3); margin-top: 2px;
}
.iv-seal-meta strong { color: var(--ink2); }

/* ── Welcome heading ──────────────────────────────────────── */
.iv-welcome {
  margin-bottom: 24px;
}
.iv-welcome-tag {
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--ink3); margin-bottom: 6px;
}
.iv-welcome-h {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(26px, 5vw, 32px);
  font-weight: 400; line-height: 1.1;
  letter-spacing: -0.02em;
}
.iv-welcome-h em { font-style: italic; color: var(--indigo-b); }
.iv-welcome-sub {
  font-size: 13px; color: var(--ink2); margin-top: 6px; font-weight: 300;
  line-height: 1.55;
}
.iv-welcome-sub strong { color: var(--ink); font-weight: 500; }

/* ── Divider ──────────────────────────────────────────────── */
.iv-divider {
  display: flex; align-items: center; gap: 12px; margin: 20px 0;
  font-family: 'DM Mono', monospace;
  font-size: 8.5px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink4);
}
.iv-divider::before, .iv-divider::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

/* ── Form ─────────────────────────────────────────────────── */
.iv-form { display: flex; flex-direction: column; gap: 18px; }

.iv-field { display: flex; flex-direction: column; gap: 7px; }
.iv-field label {
  font-family: 'DM Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink3); font-weight: 500;
}

.iv-input-wrap { position: relative; }
.iv-input {
  width: 100%;
  background: var(--bg3);
  border: 1px solid var(--border2);
  border-radius: 11px;
  padding: 12px 16px;
  font-family: 'DM Sans', sans-serif; font-size: 13.5px;
  color: var(--ink); outline: none;
  transition: border-color 0.18s, box-shadow 0.18s, background 0.18s;
  -webkit-appearance: none;
}
.iv-input::placeholder { color: var(--ink4); }
.iv-input:focus {
  border-color: rgba(99,102,241,0.55);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
  background: rgba(99,102,241,0.04);
}
.iv-input:disabled {
  opacity: 0.45; cursor: not-allowed;
}
.iv-input.has-btn { padding-right: 46px; }

.iv-eye-btn {
  position: absolute; right: 13px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--ink3); padding: 3px;
  transition: color 0.15s;
  display: flex; align-items: center;
}
.iv-eye-btn:hover { color: var(--ink2); }

/* ── Password strength ────────────────────────────────────── */
.iv-strength { display: flex; gap: 4px; margin-top: 2px; }
.iv-strength-bar {
  height: 2px; flex: 1; border-radius: 2px;
  background: var(--border2); transition: background 0.3s ease;
}
.iv-strength-bar.s1 { background: var(--rose); }
.iv-strength-bar.s2 { background: var(--amber); }
.iv-strength-bar.s3 { background: var(--green); }

/* ── Error banner ─────────────────────────────────────────── */
.iv-err {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 12px 14px; border-radius: 10px;
  background: var(--rose-dim);
  border: 1px solid rgba(251,113,133,0.25);
  font-size: 12.5px; color: var(--rose); line-height: 1.5;
  animation: errIn 0.25s ease both;
}
.iv-err svg { flex-shrink: 0; margin-top: 1px; }
@keyframes errIn { from { opacity:0; transform: translateY(-4px); } }

/* ── Submit button ────────────────────────────────────────── */
.iv-submit {
  position: relative; overflow: hidden;
  width: 100%; padding: 14px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff; border: none; border-radius: 11px; cursor: pointer;
  font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 600;
  letter-spacing: 0.01em;
  box-shadow: 0 4px 24px rgba(99,102,241,0.35), 0 0 0 1px rgba(99,102,241,0.4);
  transition: transform 0.2s cubic-bezier(.22,1,.36,1), box-shadow 0.2s, opacity 0.2s;
  margin-top: 4px;
}
.iv-submit::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.15) 50%, transparent 65%);
  background-size: 200% auto;
  animation: shimmer 2.8s linear infinite;
}
.iv-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 32px rgba(99,102,241,0.45), 0 0 0 1px rgba(129,140,248,0.5);
}
.iv-submit:active:not(:disabled) { transform: translateY(0); }
.iv-submit:disabled { opacity: 0.35; cursor: not-allowed; }
.iv-submit span { position: relative; display: flex; align-items: center; justify-content: center; gap: 8px; }

.iv-submit-spinner {
  width: 15px; height: 15px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25); border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

@keyframes shimmer { to { background-position: -200% center; } }

/* ── Success ──────────────────────────────────────────────── */
.iv-success-ring {
  position: relative; width: 80px; height: 80px;
  margin: 0 auto 28px;
}
.iv-success-ring-outer {
  position: absolute; inset: 0; border-radius: 50%;
  border: 1.5px solid rgba(52,211,153,0.3);
  animation: ringExpand 1.5s ease-out both;
}
.iv-success-ring-outer2 {
  position: absolute; inset: -10px; border-radius: 50%;
  border: 1px solid rgba(52,211,153,0.15);
  animation: ringExpand 1.5s ease-out 0.2s both;
}
@keyframes ringExpand {
  from { transform: scale(0.6); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.iv-success-core {
  position: absolute; inset: 0; border-radius: 50%;
  background: var(--green-dim);
  border: 1px solid rgba(52,211,153,0.3);
  display: flex; align-items: center; justify-content: center;
  animation: coreIn 0.5s cubic-bezier(.34,1.56,.64,1) 0.1s both;
}
@keyframes coreIn {
  from { transform: scale(0); opacity: 0; }
  to   { transform: scale(1); opacity: 1; }
}
.iv-success-check {
  animation: checkIn 0.4s cubic-bezier(.34,1.56,.64,1) 0.4s both;
}
@keyframes checkIn {
  from { transform: scale(0) rotate(-15deg); opacity: 0; }
  to   { transform: scale(1) rotate(0deg); opacity: 1; }
}
.iv-success-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 30px; font-weight: 400;
  margin-bottom: 8px; text-align: center;
  animation: fadeUp 0.5s ease 0.5s both;
}
.iv-success-sub {
  font-size: 13px; color: var(--ink2); text-align: center;
  animation: fadeUp 0.5s ease 0.65s both;
}
.iv-success-bar {
  width: 100%; height: 2px;
  background: var(--border);
  border-radius: 2px; margin-top: 24px; overflow: hidden;
  animation: fadeUp 0.5s ease 0.75s both;
}
.iv-success-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--indigo), var(--green));
  border-radius: 2px;
  animation: barFill 2.5s cubic-bezier(.4,0,.2,1) 0.8s both;
}
@keyframes barFill {
  from { width: 0%; }
  to   { width: 100%; }
}

/* ── Role pill ────────────────────────────────────────────── */
.iv-role-pill {
  display: inline-flex; align-items: center;
  font-family: 'DM Mono', monospace;
  font-size: 9.5px; font-weight: 500; letter-spacing: 0.07em; text-transform: uppercase;
  padding: 3px 10px; border-radius: 20px;
  background: rgba(99,102,241,0.14); color: var(--indigo-b);
  border: 1px solid rgba(99,102,241,0.28);
}

/* ── Animations ───────────────────────────────────────────── */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: none; }
}

/* ── Responsive ───────────────────────────────────────────── */
@media (max-width: 500px) {
  .iv-body { padding: 26px 22px 30px; }
  .iv-logo { margin-bottom: 24px; }
}
`;

/* ─────────────────────────────────────────────────────────────────
   Particle data type
───────────────────────────────────────────────────────────────── */
interface ParticleData {
  size: number;
  left: number;
  top: number;
  delay: number;
  dur: number;
  dx: number;
  opacity: number;
}

/* ─────────────────────────────────────────────────────────────────
   FIX: Particle data generated at MODULE LEVEL (outside any
   component or hook). Math.random() is called exactly once when
   the module is first imported — never during render — which fully
   satisfies the react-hooks/purity rule without needing useMemo.
───────────────────────────────────────────────────────────────── */
const PARTICLE_COUNT = 18;
const PARTICLE_DATA: ParticleData[] = Array.from({ length: PARTICLE_COUNT }, () => ({
  size:    1 + Math.random() * 2,
  left:    5 + Math.random() * 90,
  top:    20 + Math.random() * 70,
  delay:       Math.random() * 12,
  dur:     8 + Math.random() * 10,
  dx:    -20 + Math.random() * 40,
  opacity: 0.15 + Math.random() * 0.35,
}));

/* ─────────────────────────────────────────────────────────────────
   Particle canvas component — now reads from the stable module
   constant; no hooks, no purity issues.
───────────────────────────────────────────────────────────────── */
function Particles() {
  return (
    <>
      {PARTICLE_DATA.map((p, i) => (
        <div
          key={i}
          className="iv-particle"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.top}%`,
            background: i % 3 === 0 ? '#818cf8' : i % 3 === 1 ? '#a78bfa' : '#6ee7b7',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
            opacity: p.opacity,
            ['--dx' as string]: `${p.dx}px`,
          }}
        />
      ))}
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Static helpers (outside page component to avoid lint errors)
───────────────────────────────────────────────────────────────── */
function EyeIcon({ show }: { show: boolean }) {
  return show ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function AppLogo() {
  return (
    <div className="iv-logo">
      <div className="iv-logo-mark">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
      </div>
      <div className="iv-logo-name">Ledger<span>Flow</span></div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Password strength util
───────────────────────────────────────────────────────────────── */
function getStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++;
  return s as 0 | 1 | 2 | 3;
}

/* ─────────────────────────────────────────────────────────────────
   Main page
───────────────────────────────────────────────────────────────── */
export default function InvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') ?? '';

  // FIX: Derive the initial step synchronously from `token` using the
  // useState initializer function — this runs once before the first render,
  // so we never need to call setStep() synchronously inside an effect.
  const [step, setStep]         = useState<Step>(() => token ? 'loading' : 'invalid');
  const [invite, setInvite]     = useState<Invite | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Effect only runs when token is present; all setState calls here are
  // inside async .then() callbacks, which the lint rule permits.
  useEffect(() => {
    if (!token) return;
    getInviteByToken(token).then((inv) => {
      if (!inv) { setStep('invalid'); return; }
      if (inv.status === 'accepted') { setStep('already_used'); return; }
      if (inv.status === 'expired' || new Date() > new Date(inv.expiresAt)) {
        setStep('expired'); return;
      }
      setInvite(inv);
      setStep('form');
    });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return; }
    setError(''); setLoading(true);

    try {
      const { companyId, email, name, role } = await acceptInvite(token, password);
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      const now = new Date().toISOString();
      const newUser: User = {
        uid: cred.user.uid, email, displayName: name, role,
        companyId, createdAt: now, lastLogin: now, isActive: true,
      };
      await createUser(newUser);
      await createAuditLog({
        userId: cred.user.uid, userEmail: email, userName: name, companyId,
        action: 'create', module: 'Auth',
        description: `${name} joined via invite as ${role}`,
        severity: 'info',
      });

      setStep('success');
      setTimeout(() => router.push('/dashboard'), 2800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      setError(
        msg.includes('email-already-in-use')
          ? 'An account with this email already exists. Try signing in instead.'
          : msg || 'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const strength = getStrength(password);

  return (
    <>
      <style>{css}</style>
      <div className="iv-shell">
        {/* Background */}
        <div className="iv-canvas">
          <div className="iv-orb iv-orb-1" />
          <div className="iv-orb iv-orb-2" />
          <div className="iv-orb iv-orb-3" />
          <Particles />
        </div>
        <div className="iv-grid" />

        <div className="iv-wrap">
          <AppLogo />

          <div className="iv-card">
            <div className="iv-card-band" />
            <div className="iv-body">

              {/* ── Loading ── */}
              {step === 'loading' && (
                <div className="iv-state">
                  <div className="iv-state-icon loading">
                    <div className="iv-spinner" />
                  </div>
                  <div className="iv-state-title">Validating invite</div>
                  <p className="iv-state-desc">Checking your invite link — just a moment.</p>
                </div>
              )}

              {/* ── Invalid ── */}
              {step === 'invalid' && (
                <div className="iv-state">
                  <div className="iv-state-icon error-red">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--rose)" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <div className="iv-state-title">Invalid Link</div>
                  <p className="iv-state-desc">This invite link doesn&apos;t exist or was removed. Ask your administrator for a new one.</p>
                  <Link href="/login" className="iv-back-link">← Back to Sign In</Link>
                </div>
              )}

              {/* ── Expired ── */}
              {step === 'expired' && (
                <div className="iv-state">
                  <div className="iv-state-icon error-amber">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2" strokeLinecap="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="12" y1="8" x2="12" y2="12"/>
                      <line x1="12" y1="16" x2="12.01" y2="16"/>
                    </svg>
                  </div>
                  <div className="iv-state-title">Link Expired</div>
                  <p className="iv-state-desc">This invite expired after 7 days. Ask your administrator to send a fresh invite link.</p>
                  <Link href="/login" className="iv-back-link">← Back to Sign In</Link>
                </div>
              )}

              {/* ── Already used ── */}
              {step === 'already_used' && (
                <div className="iv-state">
                  <div className="iv-state-icon success-green">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <div className="iv-state-title">Already Accepted</div>
                  <p className="iv-state-desc">This invite has already been used. Sign in to access your account.</p>
                  <Link href="/login" className="iv-back-link">Sign In →</Link>
                </div>
              )}

              {/* ── Form ── */}
              {step === 'form' && invite && (
                <>
                  {/* Invite seal */}
                  <div className="iv-seal">
                    <div className="iv-seal-badge">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                        <circle cx="12" cy="7" r="4"/>
                      </svg>
                    </div>
                    <div>
                      <div className="iv-seal-label">You&apos;ve been invited</div>
                      <div className="iv-seal-company">{invite.companyName}</div>
                      <div className="iv-seal-meta">
                        By <strong>{invite.createdByName}</strong> ·&nbsp;
                        <span className="iv-role-pill">{invite.role}</span>
                      </div>
                    </div>
                  </div>

                  {/* Welcome heading */}
                  <div className="iv-welcome">
                    <div className="iv-welcome-tag">Account Setup</div>
                    <h1 className="iv-welcome-h">
                      Welcome,&nbsp;<em>{invite.name.split(' ')[0]}</em>
                    </h1>
                    <p className="iv-welcome-sub">
                      Set a password to activate your account at&nbsp;
                      <strong>{invite.email}</strong>
                    </p>
                  </div>

                  <div className="iv-divider">Secure your account</div>

                  {/* Error */}
                  {error && (
                    <div className="iv-err" style={{ marginBottom: 16 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                      <span>{error}</span>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="iv-form">
                    {/* Email read-only */}
                    <div className="iv-field">
                      <label>Email address</label>
                      <input className="iv-input" value={invite.email} disabled readOnly />
                    </div>

                    {/* Password */}
                    <div className="iv-field">
                      <label>Choose a password</label>
                      <div className="iv-input-wrap">
                        <input
                          className="iv-input has-btn"
                          type={showPw ? 'text' : 'password'}
                          placeholder="Minimum 8 characters"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required autoFocus
                        />
                        <button type="button" className="iv-eye-btn" onClick={() => setShowPw(s => !s)}>
                          <EyeIcon show={showPw} />
                        </button>
                      </div>
                      {password && (
                        <div className="iv-strength">
                          {[1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`iv-strength-bar ${strength >= i ? `s${strength}` : ''}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Confirm */}
                    <div className="iv-field">
                      <label>Confirm password</label>
                      <input
                        className="iv-input"
                        type="password"
                        placeholder="Repeat your password"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="iv-submit"
                      disabled={loading || !password || !confirm}
                    >
                      <span>
                        {loading
                          ? <><div className="iv-submit-spinner" />Activating account…</>
                          : 'Activate Account →'}
                      </span>
                    </button>
                  </form>
                </>
              )}

              {/* ── Success ── */}
              {step === 'success' && (
                <div className="iv-state" style={{ paddingTop: 8, paddingBottom: 4 }}>
                  <div className="iv-success-ring">
                    <div className="iv-success-ring-outer2" />
                    <div className="iv-success-ring-outer" />
                    <div className="iv-success-core">
                      <div className="iv-success-check">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="iv-success-title">Account Activated</div>
                  <p className="iv-success-sub">Welcome aboard — redirecting you to the dashboard.</p>
                  <div className="iv-success-bar">
                    <div className="iv-success-bar-fill" />
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </>
  );
}