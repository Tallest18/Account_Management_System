'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { createPayment, getPayments, getContacts, getAccounts } from '@/lib/db';
import { Payment, Contact, Account } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, X, ArrowUpRight, ArrowDownRight } from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   CSS — complete, self-contained
═══════════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;1,400&family=Syne:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

/* ── Reset & Root ──────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.pr {
  --ink: #f4f0eb;
  --ink-2: rgba(244,240,235,0.5);
  --ink-3: rgba(244,240,235,0.25);
  --ink-4: rgba(244,240,235,0.1);
  --bg: #080810;
  --bg-1: #0e0e1a;
  --bg-2: #131320;
  --bg-3: #191928;
  --gold: #c8a84b;
  --gold-b: #e2c06e;
  --gold-dim: rgba(200,168,75,0.12);
  --gold-glow: rgba(200,168,75,0.3);
  --emerald: #2dd4a0;
  --emerald-dim: rgba(45,212,160,0.1);
  --rose: #f06070;
  --rose-dim: rgba(240,96,112,0.1);
  --border: rgba(255,255,255,0.065);
  --border-up: rgba(255,255,255,0.12);
  --radius: 18px;
  --radius-sm: 11px;
  --radius-xs: 7px;
  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Syne', sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* ── Ambient Background ─────────────────────────────────────── */
.pr-ambient {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  overflow: hidden;
}
.pr-ambient-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(90px);
}
.pr-ambient-blob-1 {
  width: 600px; height: 600px;
  top: -200px; right: -150px;
  background: radial-gradient(circle, rgba(200,168,75,0.13) 0%, transparent 70%);
  animation: blobDrift1 18s ease-in-out infinite;
}
.pr-ambient-blob-2 {
  width: 500px; height: 500px;
  bottom: -150px; left: -100px;
  background: radial-gradient(circle, rgba(45,212,160,0.07) 0%, transparent 70%);
  animation: blobDrift2 22s ease-in-out infinite;
}
.pr-ambient-blob-3 {
  width: 300px; height: 300px;
  top: 40%; left: 40%;
  background: radial-gradient(circle, rgba(200,168,75,0.05) 0%, transparent 70%);
  animation: blobDrift3 15s ease-in-out infinite;
}
@keyframes blobDrift1 {
  0%,100% { transform: translate(0,0) scale(1); }
  33% { transform: translate(-30px,20px) scale(1.05); }
  66% { transform: translate(20px,-15px) scale(0.95); }
}
@keyframes blobDrift2 {
  0%,100% { transform: translate(0,0); }
  50% { transform: translate(25px,-20px); }
}
@keyframes blobDrift3 {
  0%,100% { transform: translate(0,0) scale(1); }
  50% { transform: translate(-20px,15px) scale(1.1); }
}

/* Grain overlay */
.pr-grain {
  position: fixed; inset: 0; pointer-events: none; z-index: 1; opacity: 0.35;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)' opacity='0.06'/%3E%3C/svg%3E");
}

/* ── Layout ─────────────────────────────────────────────────── */
.pr-wrap { position: relative; z-index: 2; max-width: 1200px; margin: 0 auto; padding: 52px 36px 100px; }

/* ── Page Header ────────────────────────────────────────────── */
.pr-head {
  display: flex; align-items: flex-end; justify-content: space-between;
  gap: 24px; flex-wrap: wrap; margin-bottom: 48px;
  opacity: 0; transform: translateY(16px);
  animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s forwards;
}
.pr-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--gold); margin-bottom: 10px;
  display: inline-flex; align-items: center; gap: 10px;
}
.pr-eyebrow-line { width: 28px; height: 1px; background: linear-gradient(90deg, var(--gold), transparent); }
.pr-h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(36px, 5vw, 58px); font-weight: 400;
  line-height: 1.05; letter-spacing: -0.02em;
  color: var(--ink);
}
.pr-h1 em { font-style: italic; color: var(--gold); }
.pr-sub { font-size: 13px; color: var(--ink-3); margin-top: 8px; font-weight: 400; letter-spacing: 0.01em; }

/* ── CTA Button ─────────────────────────────────────────────── */
.pr-cta {
  position: relative;
  display: inline-flex; align-items: center; gap: 9px;
  padding: 14px 26px;
  background: var(--gold);
  color: #080810; font-family: 'Syne', sans-serif;
  font-size: 13px; font-weight: 700; letter-spacing: 0.03em;
  border: none; border-radius: var(--radius-sm);
  cursor: pointer; white-space: nowrap; overflow: hidden;
  box-shadow: 0 0 0 1px rgba(200,168,75,0.4), 0 8px 32px rgba(200,168,75,0.25), 0 2px 8px rgba(0,0,0,0.4);
  transition: all 0.2s cubic-bezier(0.22,1,0.36,1);
}
.pr-cta::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%);
  background-size: 200% auto;
  animation: shimmer 3s linear infinite;
}
.pr-cta:hover {
  background: var(--gold-b);
  transform: translateY(-2px);
  box-shadow: 0 0 0 1px rgba(200,168,75,0.5), 0 16px 48px rgba(200,168,75,0.35), 0 4px 12px rgba(0,0,0,0.4);
}
.pr-cta:active { transform: translateY(0); }
.pr-cta span { position: relative; }

@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}

/* ── Stat Cards ─────────────────────────────────────────────── */
.pr-stats {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 16px;
  margin-bottom: 32px;
}
@media(max-width:700px) { .pr-stats { grid-template-columns: 1fr; } }

.stat {
  position: relative; overflow: hidden;
  background: linear-gradient(145deg, var(--bg-2) 0%, var(--bg-1) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 28px 24px 22px;
  opacity: 0; transform: translateY(24px);
  animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) forwards;
}
.stat:nth-child(1) { animation-delay: 0.12s; }
.stat:nth-child(2) { animation-delay: 0.2s; }
.stat:nth-child(3) { animation-delay: 0.28s; }
.stat::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, transparent 60%);
  pointer-events: none;
}
.stat-corner-glow {
  position: absolute; top: -60px; right: -60px;
  width: 180px; height: 180px; border-radius: 50%;
  filter: blur(70px); pointer-events: none;
}
.stat-top {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 18px;
}
.stat-label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-3); font-weight: 500;
}
.stat-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 20px;
}
.stat-badge.em { background: var(--emerald-dim); color: var(--emerald); border: 1px solid rgba(45,212,160,0.2); }
.stat-badge.ro { background: var(--rose-dim); color: var(--rose); border: 1px solid rgba(240,96,112,0.2); }
.stat-badge.go { background: var(--gold-dim); color: var(--gold); border: 1px solid rgba(200,168,75,0.2); }

.stat-value {
  font-family: 'Playfair Display', serif;
  font-size: 34px; font-weight: 400; line-height: 1;
  letter-spacing: -0.01em;
}
.stat-value.em { color: var(--emerald); }
.stat-value.ro { color: var(--rose); }
.stat-value.go {
  background: linear-gradient(135deg, var(--gold) 0%, var(--gold-b) 100%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.stat-meta {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; color: var(--ink-3); margin-top: 10px;
}
.stat-bar {
  position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  border-radius: 0 0 var(--radius) var(--radius); overflow: hidden;
}
.stat-bar-fill {
  height: 100%; border-radius: inherit;
  animation: barGrow 1s cubic-bezier(0.22,1,0.36,1) forwards;
  transform-origin: left;
}
@keyframes barGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }

/* ── Table Card ─────────────────────────────────────────────── */
.pr-table-card {
  background: var(--bg-1);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  opacity: 0; transform: translateY(24px);
  animation: slideUp 0.6s cubic-bezier(0.22,1,0.36,1) 0.36s forwards;
}
.pr-table-top {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px;
  background: linear-gradient(90deg, rgba(200,168,75,0.05) 0%, transparent 60%);
  border-bottom: 1px solid var(--border);
}
.pr-table-title {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--ink-2);
}
.pr-table-pill {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--gold);
  background: var(--gold-dim); border: 1px solid rgba(200,168,75,0.18);
  padding: 3px 10px; border-radius: 20px;
}

/* Table itself */
.pay-table { width: 100%; border-collapse: collapse; }
.pay-table thead tr { border-bottom: 1px solid var(--border); }
.pay-table thead th {
  padding: 11px 16px; text-align: left;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink-3); font-weight: 500; white-space: nowrap;
}
.pay-table thead th:last-child { text-align: right; }
.pay-table tbody tr {
  border-bottom: 1px solid var(--border);
  transition: background 0.15s ease;
  opacity: 0; animation: rowIn 0.3s ease forwards;
  cursor: default;
}
.pay-table tbody tr:last-child { border-bottom: none; }
.pay-table tbody tr:hover { background: rgba(200,168,75,0.04); }
.pay-table tbody td {
  padding: 14px 16px; font-size: 13px; vertical-align: middle;
}
@keyframes rowIn { to { opacity: 1; } }

/* Cell types */
.cell-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px; color: var(--gold); letter-spacing: 0.05em;
}
.cell-date { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--ink-3); }
.cell-name { font-size: 13px; font-weight: 600; }
.cell-method {
  font-family: 'JetBrains Mono', monospace; font-size: 10px;
  color: var(--ink-3); background: var(--bg-3);
  padding: 3px 9px; border-radius: var(--radius-xs);
  border: 1px solid var(--border); display: inline-block;
}
.cell-account { font-size: 11px; color: var(--ink-3); max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cell-amount { text-align: right; font-family: 'Playfair Display', serif; font-size: 16px; white-space: nowrap; }
.cell-amount.pos { color: var(--emerald); }
.cell-amount.neg { color: var(--rose); }

/* Type badge */
.type-badge {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 4px 9px; border-radius: 20px;
}
.type-badge.in { background: var(--emerald-dim); color: var(--emerald); border: 1px solid rgba(45,212,160,0.2); }
.type-badge.out { background: var(--rose-dim); color: var(--rose); border: 1px solid rgba(240,96,112,0.2); }

/* ── Empty State ─────────────────────────────────────────────── */
.empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center; padding: 80px 40px; gap: 14px;
}
.empty-icon {
  width: 64px; height: 64px; border-radius: 18px;
  background: var(--bg-3); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  color: var(--ink-3); margin-bottom: 6px;
}
.empty-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 400; }
.empty-desc { font-size: 13px; color: var(--ink-3); max-width: 280px; line-height: 1.7; }

/* ── Loader ──────────────────────────────────────────────────── */
.loader-wrap { display: flex; align-items: center; justify-content: center; padding: 80px; }
.loader {
  width: 30px; height: 30px; border-radius: 50%;
  border: 2px solid var(--border-up); border-top-color: var(--gold);
  animation: spin 0.75s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── MODAL ───────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(4,4,10,0.82);
  backdrop-filter: blur(16px) saturate(0.8);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  opacity: 0; animation: fadeIn 0.22s ease forwards;
}
.modal-overlay.closing { animation: fadeOut 0.18s ease forwards; }
@keyframes fadeIn { to { opacity: 1; } }
@keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

.modal {
  background: var(--bg-2);
  border: 1px solid var(--border-up);
  border-radius: 22px;
  width: 100%; max-width: 540px;
  max-height: 92vh; overflow-y: auto;
  box-shadow:
    0 0 0 1px rgba(200,168,75,0.08),
    0 48px 100px rgba(0,0,0,0.75),
    inset 0 1px 0 rgba(255,255,255,0.06);
  transform: translateY(20px) scale(0.975);
  animation: modalIn 0.28s cubic-bezier(0.34,1.4,0.64,1) forwards;
}
@keyframes modalIn { to { transform: translateY(0) scale(1); } }

.modal::-webkit-scrollbar { width: 3px; }
.modal::-webkit-scrollbar-track { background: transparent; }
.modal::-webkit-scrollbar-thumb { background: var(--border-up); border-radius: 3px; }

.modal-head {
  position: sticky; top: 0; z-index: 10;
  display: flex; align-items: center; justify-content: space-between;
  padding: 24px 28px 20px;
  background: var(--bg-2);
  border-bottom: 1px solid var(--border);
}
.modal-head-left {}
.modal-head-eyebrow {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--gold); margin-bottom: 4px;
}
.modal-title { font-family: 'Playfair Display', serif; font-size: 22px; font-weight: 400; }
.modal-close {
  width: 34px; height: 34px; border-radius: 9px;
  background: var(--bg-3); border: 1px solid var(--border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--ink-2);
  transition: all 0.15s ease;
}
.modal-close:hover { background: rgba(255,255,255,0.06); color: var(--ink); border-color: var(--border-up); }

.modal-body { padding: 24px 28px 28px; display: flex; flex-direction: column; gap: 20px; }

/* Type Selector */
.type-selector { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.type-opt {
  padding: 14px 16px; border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-3);
  cursor: pointer; transition: all 0.18s ease;
  display: flex; flex-direction: column; gap: 5px;
}
.type-opt:hover { border-color: var(--border-up); background: rgba(255,255,255,0.03); }
.type-opt.sel-in  { background: var(--emerald-dim); border-color: rgba(45,212,160,0.28); }
.type-opt.sel-out { background: var(--rose-dim);    border-color: rgba(240,96,112,0.28); }
.type-opt-icon { display: flex; align-items: center; gap: 8px; }
.type-opt-icon svg { width: 16px; height: 16px; }
.type-opt.sel-in  .type-opt-icon { color: var(--emerald); }
.type-opt.sel-out .type-opt-icon { color: var(--rose); }
.type-opt-label { font-size: 13px; font-weight: 600; }
.type-opt.sel-in  .type-opt-label { color: var(--emerald); }
.type-opt.sel-out .type-opt-label { color: var(--rose); }
.type-opt-sub { font-size: 11px; color: var(--ink-3); }

/* Section divider */
.modal-sep {
  display: flex; align-items: center; gap: 12px;
  font-family: 'JetBrains Mono', monospace; font-size: 9px;
  letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink-3);
}
.modal-sep::before, .modal-sep::after {
  content: ''; flex: 1; height: 1px; background: var(--border);
}

/* Fields */
.f-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.f { display: flex; flex-direction: column; gap: 7px; }
.f label {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.15em; text-transform: uppercase;
  color: var(--ink-3); font-weight: 500;
}
.f input, .f select {
  width: 100%; background: var(--bg-3);
  border: 1px solid var(--border); border-radius: var(--radius-sm);
  padding: 11px 14px;
  font-family: 'Syne', sans-serif; font-size: 13px; color: var(--ink);
  outline: none; transition: all 0.18s ease;
  -webkit-appearance: none; appearance: none;
}
.f input::placeholder { color: var(--ink-3); }
.f input:focus, .f select:focus {
  border-color: rgba(200,168,75,0.5);
  box-shadow: 0 0 0 3px rgba(200,168,75,0.1);
  background: rgba(200,168,75,0.04);
}
.f select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234a4460' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
  padding-right: 36px; cursor: pointer;
}
.f select option { background: #191928; }

/* Amount field special */
.amount-wrap { position: relative; }
.amount-prefix {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  font-family: 'JetBrains Mono', monospace; font-size: 12px; color: var(--ink-3);
  pointer-events: none;
}
.amount-input { padding-left: 30px !important; font-family: 'Playfair Display', serif !important; font-size: 18px !important; }

/* Modal footer */
.modal-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 10px;
  padding-top: 6px;
}
.btn-cancel {
  padding: 11px 20px; border-radius: var(--radius-sm);
  background: var(--bg-3); border: 1px solid var(--border-up);
  color: var(--ink-2); font-family: 'Syne', sans-serif;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: all 0.15s ease;
}
.btn-cancel:hover { background: rgba(255,255,255,0.05); color: var(--ink); }

.btn-save {
  position: relative; overflow: hidden;
  padding: 11px 26px; border-radius: var(--radius-sm);
  background: var(--gold); color: #080810;
  font-family: 'Syne', sans-serif; font-size: 13px; font-weight: 700;
  border: none; cursor: pointer; min-width: 140px;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  box-shadow: 0 4px 20px rgba(200,168,75,0.28);
  transition: all 0.2s ease;
}
.btn-save::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%);
  background-size: 200% auto;
  animation: shimmer 2.5s linear infinite;
}
.btn-save:hover:not(:disabled) { background: var(--gold-b); box-shadow: 0 8px 32px rgba(200,168,75,0.4); transform: translateY(-1px); }
.btn-save:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }
.btn-save span { position: relative; }
.mini-spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(8,8,16,0.2); border-top-color: #080810;
  animation: spin 0.7s linear infinite;
}

/* ── Toast ───────────────────────────────────────────────────── */
.toast {
  position: fixed; bottom: 28px; right: 28px; z-index: 300;
  display: flex; align-items: center; gap: 12px;
  background: var(--bg-2); border: 1px solid rgba(45,212,160,0.3);
  border-radius: 13px; padding: 14px 18px;
  font-size: 13px; color: var(--ink); font-weight: 500;
  box-shadow: 0 20px 60px rgba(0,0,0,0.6);
  animation: toastPop 0.35s cubic-bezier(0.34,1.56,0.64,1) forwards;
}
.toast-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--emerald); flex-shrink: 0;
  box-shadow: 0 0 10px var(--emerald);
  animation: pulseDot 1.5s ease-in-out infinite;
}
@keyframes toastPop { from { opacity:0; transform:translateY(14px) scale(0.94); } to { opacity:1; transform:none; } }
@keyframes pulseDot { 0%,100%{opacity:1} 50%{opacity:0.4} }

/* ── Shared Keyframes ────────────────────────────────────────── */
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}

/* ── Responsive ──────────────────────────────────────────────── */
@media(max-width:600px) {
  .pr-wrap { padding: 28px 16px 60px; }
  .f-row { grid-template-columns: 1fr; }
  .pr-head { flex-direction: column; align-items: flex-start; }
}
`;

/* ════════════════════════════════════════════════════════════════
   Helpers
════════════════════════════════════════════════════════════════ */
const METHOD_LABELS: Record<string, string> = {
  cash: 'Cash', bank_transfer: 'Bank Transfer',
  check: 'Check', card: 'Card', other: 'Other',
};

function useSummary(payments: Payment[]) {
  const received = payments.filter(p => p.type === 'received').reduce((s, p) => s + p.amount, 0);
  const made     = payments.filter(p => p.type === 'made').reduce((s, p) => s + p.amount, 0);
  return { received, made, net: received - made };
}

/* Field wrapper */
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="f"><label>{label}</label>{children}</div>;
}

/* ════════════════════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════════════════════ */
export default function PaymentsPage() {
  const { user, company } = useAuth();
  const [payments, setPayments]   = useState<Payment[]>([]);
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [accounts, setAccounts]   = useState<Account[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState('');

  const [form, setForm] = useState({
    type: 'received' as 'received' | 'made',
    contactId: '',
    date: new Date().toISOString().slice(0, 10),
    amount: '',
    method: 'bank_transfer' as Payment['method'],
    accountId: '',
    reference: '',
    notes: '',
  });

  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  if (!user) return null;

  const cur = company?.currency;
  const actor = { uid: user.uid, email: user.email, name: user.displayName };
  const { received, made, net } = useSummary(payments);

  const load = useCallback(async () => {
    const [pmts, ctcs, accs] = await Promise.all([
      getPayments(user.companyId),
      getContacts(user.companyId),
      getAccounts(user.companyId),
    ]);
    setPayments(pmts);
    setContacts(ctcs);
    setAccounts(accs.filter(a => a.type === 'asset'));
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleSave = async () => {
    if (!form.contactId || !form.amount || !form.accountId) return;
    setSaving(true);
    const contact = contacts.find(c => c.id === form.contactId);
    const account = accounts.find(a => a.id === form.accountId);
    try {
      await createPayment({
        companyId: user!.companyId,
        type: form.type,
        contactId: form.contactId,
        contactName: contact?.name ?? '',
        date: form.date,
        amount: parseFloat(form.amount),
        method: form.method,
        reference: form.reference,
        accountId: form.accountId,
        accountName: account?.name ?? '',
        notes: form.notes,
        createdBy: user!.uid,
      }, actor);
      setShowForm(false);
      setForm({
        type: 'received', contactId: '',
        date: new Date().toISOString().slice(0, 10),
        amount: '', method: 'bank_transfer',
        accountId: '', reference: '', notes: '',
      });
      load();
      showToast('Payment recorded successfully');
    } finally { setSaving(false); }
  };

  const recCount  = payments.filter(p => p.type === 'received').length;
  const madeCount = payments.filter(p => p.type === 'made').length;

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="pr">
        {/* Ambient background */}
        <div className="pr-ambient">
          <div className="pr-ambient-blob pr-ambient-blob-1" />
          <div className="pr-ambient-blob pr-ambient-blob-2" />
          <div className="pr-ambient-blob pr-ambient-blob-3" />
        </div>
        <div className="pr-grain" />

        <div className="pr-wrap">

          {/* ── Header ── */}
          <div className="pr-head">
            <div>
              <div className="pr-eyebrow">
                <span className="pr-eyebrow-line" />
                Finance
              </div>
              <h1 className="pr-h1">Pay<em>ments</em></h1>
              <p className="pr-sub">Track money in and money out across all accounts</p>
            </div>
            <button className="pr-cta" onClick={() => setShowForm(true)}>
              <span><Plus size={14} strokeWidth={2.5} /></span>
              <span>Record Payment</span>
            </button>
          </div>

          {/* ── Stats ── */}
          <div className="pr-stats">
            {/* Received */}
            <div className="stat">
              <div className="stat-corner-glow" style={{ background: 'var(--emerald)' }} />
              <div className="stat-top">
                <span className="stat-label">Received</span>
                <span className="stat-badge em">
                  <ArrowDownRight size={8} />
                  {recCount} in
                </span>
              </div>
              <div className="stat-value em">{formatCurrency(received, cur)}</div>
              <div className="stat-meta">{recCount} payment{recCount !== 1 ? 's' : ''} received</div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ background: 'var(--emerald)', width: '100%' }} />
              </div>
            </div>

            {/* Paid */}
            <div className="stat">
              <div className="stat-corner-glow" style={{ background: 'var(--rose)' }} />
              <div className="stat-top">
                <span className="stat-label">Paid Out</span>
                <span className="stat-badge ro">
                  <ArrowUpRight size={8} />
                  {madeCount} out
                </span>
              </div>
              <div className="stat-value ro">{formatCurrency(made, cur)}</div>
              <div className="stat-meta">{madeCount} payment{madeCount !== 1 ? 's' : ''} made</div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{ background: 'var(--rose)', width: `${received > 0 ? Math.min((made/received)*100,100) : 0}%` }} />
              </div>
            </div>

            {/* Net */}
            <div className="stat">
              <div className="stat-corner-glow" style={{ background: net >= 0 ? 'var(--gold)' : 'var(--rose)' }} />
              <div className="stat-top">
                <span className="stat-label">Net Flow</span>
                <span className={`stat-badge ${net >= 0 ? 'go' : 'ro'}`}>
                  {net >= 0 ? '↑' : '↓'} net
                </span>
              </div>
              <div className={`stat-value ${net >= 0 ? 'go' : 'ro'}`}>
                {net < 0 ? '−' : ''}{formatCurrency(Math.abs(net), cur)}
              </div>
              <div className="stat-meta">{payments.length} total transactions</div>
              <div className="stat-bar">
                <div className="stat-bar-fill" style={{
                  background: net >= 0 ? 'linear-gradient(90deg,var(--gold),var(--gold-b))' : 'var(--rose)',
                  width: '100%',
                }} />
              </div>
            </div>
          </div>

          {/* ── Table ── */}
          {loading ? (
            <div className="loader-wrap"><div className="loader" /></div>
          ) : (
            <div className="pr-table-card">
              <div className="pr-table-top">
                <span className="pr-table-title">Transaction Ledger</span>
                {payments.length > 0 && (
                  <span className="pr-table-pill">{payments.length} records</span>
                )}
              </div>

              {payments.length === 0 ? (
                <div className="empty">
                  <div className="empty-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="5" width="20" height="14" rx="2"/>
                      <line x1="2" y1="10" x2="22" y2="10"/>
                    </svg>
                  </div>
                  <div className="empty-title">No payments yet</div>
                  <p className="empty-desc">Record your first payment to begin tracking your cash flow and transaction history.</p>
                  <button className="pr-cta" style={{ marginTop: 12 }} onClick={() => setShowForm(true)}>
                    <span><Plus size={13} /></span>
                    <span>Record Payment</span>
                  </button>
                </div>
              ) : (
                <table className="pay-table">
                  <thead>
                    <tr>
                      <th>Ref #</th>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Contact</th>
                      <th>Method</th>
                      <th>Account</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => (
                      <tr key={p.id} style={{ animationDelay: `${i * 0.04}s` }}>
                        <td><span className="cell-num">{p.paymentNumber}</span></td>
                        <td><span className="cell-date">{formatDate(p.date)}</span></td>
                        <td>
                          <span className={`type-badge ${p.type === 'received' ? 'in' : 'out'}`}>
                            {p.type === 'received'
                              ? <ArrowDownRight size={8} />
                              : <ArrowUpRight size={8} />}
                            {p.type}
                          </span>
                        </td>
                        <td><span className="cell-name">{p.contactName}</span></td>
                        <td><span className="cell-method">{METHOD_LABELS[p.method]}</span></td>
                        <td><span className="cell-account" title={p.accountName}>{p.accountName}</span></td>
                        <td>
                          <span className={`cell-amount ${p.type === 'received' ? 'pos' : 'neg'}`}>
                            {p.type === 'received' ? '+' : '−'}{formatCurrency(p.amount, cur)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ════ MODAL ════ */}
      {showForm && (
        <div
          className="modal-overlay"
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="modal">
            {/* Head */}
            <div className="modal-head">
              <div className="modal-head-left">
                <div className="modal-head-eyebrow">New Transaction</div>
                <div className="modal-title">Record Payment</div>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)}>
                <X size={13} />
              </button>
            </div>

            <div className="modal-body">

              {/* Type selector */}
              <F label="Payment Direction">
                <div className="type-selector">
                  <button
                    className={`type-opt ${form.type === 'received' ? 'sel-in' : ''}`}
                    onClick={() => setForm(f => ({ ...f, type: 'received' }))}
                  >
                    <div className="type-opt-icon">
                      <ArrowDownRight />
                      <span className="type-opt-label">Money In</span>
                    </div>
                    <div className="type-opt-sub">Customer payment received</div>
                  </button>
                  <button
                    className={`type-opt ${form.type === 'made' ? 'sel-out' : ''}`}
                    onClick={() => setForm(f => ({ ...f, type: 'made' }))}
                  >
                    <div className="type-opt-icon">
                      <ArrowUpRight />
                      <span className="type-opt-label">Money Out</span>
                    </div>
                    <div className="type-opt-sub">Vendor or expense paid</div>
                  </button>
                </div>
              </F>

              <div className="modal-sep">Details</div>

              {/* Contact + Date */}
              <div className="f-row">
                <F label={form.type === 'received' ? 'Customer *' : 'Vendor *'}>
                  <select value={form.contactId} onChange={set('contactId')}>
                    <option value="">— Select contact —</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </F>
                <F label="Date">
                  <input type="date" value={form.date} onChange={set('date')} />
                </F>
              </div>

              {/* Amount + Method */}
              <div className="f-row">
                <F label="Amount *">
                  <div className="amount-wrap">
                    <span className="amount-prefix">{cur || '$'}</span>
                    <input
                      className="amount-input"
                      type="number" min="0" step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={set('amount')}
                    />
                  </div>
                </F>
                <F label="Payment Method">
                  <select value={form.method} onChange={set('method')}>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cash">Cash</option>
                    <option value="check">Check</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </F>
              </div>

              {/* Account */}
              <F label="Deposit / Payment Account *">
                <select value={form.accountId} onChange={set('accountId')}>
                  <option value="">— Select account —</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                </select>
              </F>

              <div className="modal-sep">Optional</div>

              {/* Reference + Notes */}
              <div className="f-row">
                <F label="Reference">
                  <input placeholder="Check #, Txn ID…" value={form.reference} onChange={set('reference')} />
                </F>
                <F label="Notes">
                  <input placeholder="Internal notes" value={form.notes} onChange={set('notes')} />
                </F>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                <button
                  className="btn-save"
                  disabled={!form.contactId || !form.amount || !form.accountId || saving}
                  onClick={handleSave}
                >
                  {saving ? (
                    <><div className="mini-spin" /><span>Saving…</span></>
                  ) : (
                    <span>Record Payment</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="toast">
          <div className="toast-dot" />
          {toast}
        </div>
      )}
    </AuthGuard>
  );
}