'use client';
import { useState, useEffect } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { updateCompany, updateUser, getCompanyUsers } from '@/lib/db';
import { createInvite, getCompanyInvites, revokeInvite, Invite } from '@/lib/invites';
import { User } from '@/types';
import { formatDateTime, formatDate } from '@/lib/utils';
import {
  Building2, Lock, Users, Shield, ChevronRight, Check,
  Eye, EyeOff, AlertCircle, Plus, Copy, Trash2, Mail, X,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════
   CSS — fully self-contained, no external classes used
═══════════════════════════════════════════════════════════ */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Outfit:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

/* ── Tokens ───────────────────────────────────────────────── */
.sg {
  --bg:      #07070f;
  --bg1:     #0c0c18;
  --bg2:     #0e0e1c;
  --bg3:     #121224;
  --bg4:     #181830;
  --border:  rgba(255,255,255,0.07);
  --border2: rgba(255,255,255,0.13);
  --border3: rgba(255,255,255,0.2);
  --ink:     #eeeaf4;
  --ink2:    rgba(238,234,244,0.55);
  --ink3:    rgba(238,234,244,0.28);
  --ink4:    rgba(238,234,244,0.12);

  --gold:       #818cf8;
  --goldb:      #a5b4fc;
  --gold-glow:  rgba(99,102,241,0.18);
  --gold-dim:   rgba(99,102,241,0.10);

  --teal:     #38c9b4;
  --teal-dim: rgba(56,201,180,0.1);
  --rose:     #e8607a;
  --rose-dim: rgba(232,96,122,0.1);
  --green:    #44d498;
  --green-dim:rgba(68,212,152,0.1);
  --amber:    #f0b429;
  --amber-dim:rgba(240,180,41,0.1);

  --r:    14px;
  --rsm:  9px;
  --rxs:  6px;

  min-height: 100vh;
  background: var(--bg);
  color: var(--ink);
  font-family: 'Outfit', sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* ── Atmospheric BG ───────────────────────────────────────── */
.sg-atmo {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
}
.sg-atmo-glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
}
.sg-atmo-glow-1 {
  width: 700px; height: 500px;
  top: -200px; right: -200px;
  background: radial-gradient(ellipse, rgba(79,70,229,0.12) 0%, transparent 70%);
  animation: atmoFloat1 20s ease-in-out infinite;
}
.sg-atmo-glow-2 {
  width: 500px; height: 400px;
  bottom: -150px; left: -150px;
  background: radial-gradient(ellipse, rgba(124,58,237,0.08) 0%, transparent 70%);
  animation: atmoFloat2 25s ease-in-out infinite;
}
@keyframes atmoFloat1 {
  0%,100%{transform:translate(0,0);}
  40%{transform:translate(-30px,20px);}
  70%{transform:translate(20px,-15px);}
}
@keyframes atmoFloat2 {
  0%,100%{transform:translate(0,0);}
  50%{transform:translate(25px,-20px);}
}

.sg-grid {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(99,102,241,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99,102,241,0.025) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 30%, black 10%, transparent 100%);
}

/* ── Layout ───────────────────────────────────────────────── */
.sg-wrap {
  position: relative; z-index: 1;
  max-width: 1100px; margin: 0 auto;
  padding: 52px 36px 100px;
}

/* ── Page Head ────────────────────────────────────────────── */
.sg-head {
  margin-bottom: 44px;
  opacity: 0; transform: translateY(14px);
  animation: rise 0.55s cubic-bezier(.22,1,.36,1) 0.05s forwards;
}
.sg-head-tag {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--gold); display: flex; align-items: center; gap: 10px;
  margin-bottom: 10px;
}
.sg-head-tag::before { content:''; width:22px; height:1px; background:linear-gradient(90deg,var(--gold),transparent); }
.sg-h1 {
  font-family: 'Cormorant Garamond', serif;
  font-size: clamp(34px,4.5vw,52px); font-weight: 400;
  line-height: 1.05; letter-spacing: -0.02em;
}
.sg-h1 em { font-style: italic; color: var(--gold); }
.sg-sub { font-size: 13px; color: var(--ink3); margin-top: 6px; font-weight: 300; }

/* ── Two-col body ─────────────────────────────────────────── */
.sg-body { display: flex; gap: 28px; align-items: flex-start; }

/* ── Sidebar ──────────────────────────────────────────────── */
.sg-sidebar {
  width: 200px; flex-shrink: 0;
  opacity: 0; transform: translateX(-12px);
  animation: rise 0.55s cubic-bezier(.22,1,.36,1) 0.12s forwards;
}
.sg-sidebar-inner {
  background: var(--bg1);
  border: 1px solid var(--border);
  border-radius: var(--r);
  padding: 6px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04);
}

.sg-nav {
  display: flex; flex-direction: column; gap: 2px;
}
.sg-nav-item {
  position: relative;
  display: flex; align-items: center; gap: 10px;
  padding: 11px 14px;
  border-radius: 9px;
  border: none; background: transparent;
  color: var(--ink3); font-family: 'Outfit', sans-serif;
  font-size: 13px; font-weight: 400;
  cursor: pointer; text-align: left;
  transition: color 0.18s ease, background 0.18s ease;
  outline: none;
}
.sg-nav-item svg { width: 15px; height: 15px; flex-shrink: 0; transition: color 0.18s; }
.sg-nav-item .nav-arrow {
  margin-left: auto; opacity: 0;
  transition: opacity 0.18s, transform 0.18s;
}
.sg-nav-item:hover { color: var(--ink2); background: rgba(99,102,241,0.07); }
.sg-nav-item:hover .nav-arrow { opacity: 1; }
.sg-nav-item.active {
  color: var(--ink);
  background: linear-gradient(135deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.07) 100%);
  font-weight: 500;
}
.sg-nav-item.active svg { color: var(--gold); }
.sg-nav-item.active .nav-arrow { opacity: 1; transform: translateX(2px); color: var(--gold); }
.sg-nav-item.active::before {
  content: '';
  position: absolute; left: 0; top: 20%; bottom: 20%;
  width: 2px; border-radius: 2px;
  background: linear-gradient(180deg, #4f46e5, #7c3aed);
  box-shadow: 0 0 8px rgba(99,102,241,0.7);
}

.sg-nav-sep {
  height: 1px; background: var(--border);
  margin: 4px 8px;
}

/* ── Main Panel ───────────────────────────────────────────── */
.sg-main {
  flex: 1; min-width: 0;
  opacity: 0; transform: translateY(16px);
  animation: rise 0.55s cubic-bezier(.22,1,.36,1) 0.18s forwards;
  display: flex; flex-direction: column; gap: 16px;
}

/* ── Panel Card ───────────────────────────────────────────── */
.sg-panel {
  background: var(--bg1);
  border: 1px solid rgba(99,102,241,0.12);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 32px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(129,140,248,0.06);
}

.sg-panel-head {
  padding: 26px 30px 22px;
  border-bottom: 1px solid rgba(99,102,241,0.1);
  background: linear-gradient(to right, rgba(99,102,241,0.06) 0%, transparent 50%);
  display: flex; align-items: flex-start; gap: 14px;
}
.sg-panel-head-row {
  display: flex; align-items: flex-start; justify-content: space-between; width: 100%;
}
.sg-panel-icon {
  width: 38px; height: 38px; flex-shrink: 0;
  border-radius: 10px;
  background: var(--gold-dim);
  border: 1px solid rgba(99,102,241,0.22);
  display: flex; align-items: center; justify-content: center;
  color: var(--gold);
}
.sg-panel-icon svg { width: 17px; height: 17px; }
.sg-panel-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 22px; font-weight: 400; line-height: 1.2;
}
.sg-panel-sub { font-size: 12.5px; color: var(--ink3); margin-top: 3px; font-weight: 300; }

.sg-panel-body { padding: 28px 30px 32px; }

/* ── Toast ────────────────────────────────────────────────── */
.sg-toast {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px;
  background: var(--green-dim);
  border: 1px solid rgba(68,212,152,0.25);
  font-size: 12.5px; color: var(--green); font-weight: 500;
  animation: toastIn 0.3s cubic-bezier(.34,1.56,.64,1) both;
}
.sg-toast-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--green); flex-shrink: 0; box-shadow: 0 0 8px var(--green); }
@keyframes toastIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }

/* ── Error banner ─────────────────────────────────────────── */
.sg-error {
  display: flex; align-items: center; gap: 10px;
  padding: 12px 16px; border-radius: 10px;
  background: var(--rose-dim);
  border: 1px solid rgba(232,96,122,0.25);
  font-size: 12.5px; color: var(--rose); font-weight: 500;
  animation: toastIn 0.3s both;
}

/* ── Form ─────────────────────────────────────────────────── */
.sg-form { display: flex; flex-direction: column; gap: 20px; }
.sg-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media(max-width:640px){ .sg-form-grid{grid-template-columns:1fr;} }

.sg-field { display: flex; flex-direction: column; gap: 7px; }
.sg-field label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink3); font-weight: 500;
}
.sg-input-wrap { position: relative; }
.sg-input {
  width: 100%; background: var(--bg3);
  border: 1px solid var(--border2); border-radius: 10px;
  padding: 11px 14px;
  font-family: 'Outfit', sans-serif; font-size: 13px;
  color: var(--ink); outline: none;
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
  -webkit-appearance: none; appearance: none;
  box-sizing: border-box;
}
.sg-input::placeholder { color: var(--ink4); }
.sg-input:focus {
  border-color: rgba(99,102,241,0.55);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
  background: rgba(99,102,241,0.05);
}
.sg-input.has-icon { padding-right: 42px; }
.sg-input-action {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer;
  color: var(--ink3); transition: color 0.15s; padding: 2px;
}
.sg-input-action:hover { color: var(--ink2); }

.sg-select {
  width: 100%; background: var(--bg3);
  border: 1px solid var(--border2); border-radius: 10px;
  padding: 11px 36px 11px 14px;
  font-family: 'Outfit', sans-serif; font-size: 13px; color: var(--ink);
  outline: none; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 14px center;
  transition: border-color 0.18s, box-shadow 0.18s, background-color 0.18s;
  box-sizing: border-box;
}
.sg-select:focus {
  border-color: rgba(99,102,241,0.55);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.12);
}
.sg-select option { background: #121224; }

.sg-static {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 10px; padding: 11px 14px;
  font-size: 13px; color: var(--ink3); font-family: 'IBM Plex Mono', monospace;
}
.sg-static-note { font-size: 11px; color: var(--ink4); margin-top: 5px; }

.sg-pw-strength { display: flex; gap: 4px; margin-top: 5px; }
.sg-pw-bar { height: 2px; flex: 1; border-radius: 2px; background: var(--border2); transition: background 0.3s; }
.sg-pw-bar.weak { background: var(--rose); }
.sg-pw-bar.medium { background: #818cf8; }
.sg-pw-bar.strong { background: var(--green); }

.sg-reqs {
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 10px; padding: 14px 16px;
  display: flex; flex-direction: column; gap: 6px;
}
.sg-req {
  display: flex; align-items: center; gap: 8px;
  font-size: 12px; color: var(--ink3); transition: color 0.2s;
}
.sg-req.met { color: var(--green); }
.sg-req-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--border2); flex-shrink: 0; transition: background 0.2s;
}
.sg-req.met .sg-req-dot { background: var(--green); box-shadow: 0 0 6px var(--green); }

/* ── Submit Button ────────────────────────────────────────── */
.sg-btn {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 9px;
  padding: 12px 26px;
  background: linear-gradient(135deg, #4f46e5, #7c3aed);
  color: #fff;
  font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 600;
  border: none; border-radius: 9px; cursor: pointer;
  box-shadow: 0 4px 20px rgba(99,102,241,0.30), 0 0 0 1px rgba(99,102,241,0.4);
  transition: all 0.2s cubic-bezier(.22,1,.36,1);
}
.sg-btn::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(105deg,transparent 30%,rgba(255,255,255,.18) 50%,transparent 70%);
  background-size: 200% auto;
  animation: btnShimmer 3s linear infinite;
}
.sg-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #4338ca, #6d28d9);
  transform: translateY(-1px);
  box-shadow: 0 8px 28px rgba(99,102,241,0.42), 0 0 0 1px rgba(129,140,248,0.5);
}
.sg-btn:active:not(:disabled) { transform: translateY(0); }
.sg-btn:disabled { opacity: 0.38; cursor: not-allowed; transform: none; box-shadow: none; }
.sg-btn span { position: relative; }
.sg-btn-spin {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.2); border-top-color: #fff;
  animation: spin 0.7s linear infinite;
}

.sg-btn-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 10px 18px;
  background: transparent;
  color: var(--ink2);
  font-family: 'Outfit', sans-serif; font-size: 13px; font-weight: 500;
  border: 1px solid var(--border2); border-radius: 9px; cursor: pointer;
  transition: all 0.18s ease;
}
.sg-btn-ghost:hover { background: rgba(255,255,255,0.04); border-color: var(--border3); color: var(--ink); }
.sg-btn-ghost:active { background: rgba(255,255,255,0.07); }

.sg-btn-sm {
  padding: 8px 16px; font-size: 12px; border-radius: 8px; gap: 7px;
}

@keyframes btnShimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
@keyframes spin { to{transform:rotate(360deg);} }

/* ── Role badge ───────────────────────────────────────────── */
.sg-role-badge {
  display: inline-flex; align-items: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9.5px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 10px; border-radius: 20px;
}
.sg-role-badge.admin      { background:rgba(99,102,241,0.14); color:#818cf8; border:1px solid rgba(99,102,241,0.28); }
.sg-role-badge.accountant { background:var(--teal-dim); color:var(--teal); border:1px solid rgba(56,201,180,0.22); }
.sg-role-badge.viewer     { background:var(--ink4); color:var(--ink3); border:1px solid var(--border2); }

/* ── Status badge ─────────────────────────────────────────── */
.sg-status-badge {
  display: inline-flex; align-items: center;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 20px;
}
.sg-status-badge.pending  { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(240,180,41,0.25); }
.sg-status-badge.accepted { background: var(--green-dim); color: var(--green); border: 1px solid rgba(68,212,152,0.25); }
.sg-status-badge.expired  { background: var(--ink4); color: var(--ink3); border: 1px solid var(--border2); }

/* ── User row ─────────────────────────────────────────────── */
.sg-user-row {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.15s, background 0.15s;
}
.sg-user-row:hover { background: var(--bg3); border-color: rgba(99,102,241,0.2); }
.sg-user-avatar {
  width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
  background: linear-gradient(135deg, #1a1a3d, #121224);
  border: 1px solid rgba(99,102,241,0.2);
  display: flex; align-items: center; justify-content: center;
  font-family: 'Cormorant Garamond', serif;
  font-size: 16px; font-weight: 500; color: #818cf8;
}
.sg-user-avatar.mail-avatar {
  background: linear-gradient(135deg, #0e1a2e, #0a0a1a);
  border-color: rgba(255,255,255,0.07);
  color: var(--ink3);
}
.sg-user-name { font-size: 13px; font-weight: 500; }
.sg-user-email { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--ink3); margin-top: 1px; }
.sg-user-last { font-family: 'IBM Plex Mono', monospace; font-size: 9px; color: var(--ink4); margin-top: 2px; }
.sg-role-select {
  background: var(--bg3); border: 1px solid var(--border2);
  border-radius: 7px; padding: 6px 30px 6px 10px;
  font-family: 'IBM Plex Mono', monospace; font-size: 10.5px; color: var(--ink2);
  outline: none; cursor: pointer;
  -webkit-appearance: none; appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23555' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat; background-position: right 10px center;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.sg-role-select:focus { border-color: rgba(99,102,241,0.5); box-shadow: 0 0 0 2px rgba(99,102,241,0.12); }
.sg-role-select option { background: #121224; }

/* ── Invite action buttons ────────────────────────────────── */
.sg-icon-btn {
  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;
  background: var(--bg3); border: 1px solid var(--border); border-radius: 7px;
  color: var(--ink3); cursor: pointer; transition: all 0.15s;
}
.sg-icon-btn:hover { border-color: rgba(99,102,241,0.35); color: var(--ink2); }
.sg-icon-btn.copied { color: var(--green); border-color: rgba(68,212,152,0.3); background: var(--green-dim); }
.sg-icon-btn.danger:hover { color: var(--rose); border-color: rgba(232,96,122,0.3); background: var(--rose-dim); }

/* ── Permissions box ──────────────────────────────────────── */
.sg-perms {
  background: linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(99,102,241,0.03) 100%);
  border: 1px solid rgba(99,102,241,0.18); border-radius: 12px;
  padding: 16px 18px;
}
.sg-perms-head {
  display: flex; align-items: center; gap: 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9.5px; letter-spacing: 0.15em; text-transform: uppercase;
  color: #818cf8; font-weight: 500; margin-bottom: 12px;
}
.sg-perms-head svg { width: 13px; height: 13px; }
.sg-perm-row { display: flex; gap: 8px; font-size: 12px; color: var(--ink2); margin-bottom: 6px; line-height: 1.5; }
.sg-perm-row:last-child { margin-bottom: 0; }
.sg-perm-key {
  font-family: 'IBM Plex Mono', monospace; font-size: 10px;
  color: #818cf8; font-weight: 500;
  white-space: nowrap; min-width: 80px; padding-top: 1px;
}

/* ── Section divider ──────────────────────────────────────── */
.sg-sep {
  display: flex; align-items: center; gap: 12px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ink4);
}
.sg-sep::before, .sg-sep::after { content:''; flex:1; height:1px; background:var(--border); }

/* ── Current user chip ────────────────────────────────────── */
.sg-you-chip {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--ink4); background: var(--bg4);
  border: 1px solid var(--border); border-radius: 4px;
  padding: 2px 6px; margin-left: 6px;
}

/* ── Section label ────────────────────────────────────────── */
.sg-section-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--ink4); margin-bottom: 10px; margin-top: 4px;
}

/* ── Modal overlay ────────────────────────────────────────── */
.sg-modal-backdrop {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(7,7,15,0.78);
  backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; padding: 24px;
  animation: fadeIn 0.2s ease both;
}
@keyframes fadeIn { from{opacity:0} to{opacity:1} }

.sg-modal {
  width: 100%; max-width: 440px;
  background: var(--bg1);
  border: 1px solid rgba(99,102,241,0.2);
  border-radius: 20px;
  box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(129,140,248,0.06), inset 0 1px 0 rgba(255,255,255,0.04);
  animation: modalRise 0.3s cubic-bezier(.22,1,.36,1) both;
  overflow: hidden;
}
@keyframes modalRise { from{opacity:0;transform:translateY(16px) scale(0.97)} to{opacity:1;transform:none} }

.sg-modal-head {
  padding: 22px 26px 18px;
  border-bottom: 1px solid rgba(99,102,241,0.1);
  background: linear-gradient(to right, rgba(99,102,241,0.07) 0%, transparent 60%);
  display: flex; align-items: flex-start; justify-content: space-between;
}
.sg-modal-title {
  font-family: 'Cormorant Garamond', serif;
  font-size: 21px; font-weight: 400; line-height: 1.2;
}
.sg-modal-sub { font-size: 12px; color: var(--ink3); margin-top: 3px; font-weight: 300; }
.sg-modal-close {
  width: 28px; height: 28px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  background: var(--bg3); border: 1px solid var(--border);
  border-radius: 7px; color: var(--ink3); cursor: pointer;
  transition: all 0.15s; margin-top: 2px;
}
.sg-modal-close:hover { color: var(--ink); border-color: var(--border2); }

.sg-modal-body { padding: 22px 26px 26px; display: flex; flex-direction: column; gap: 18px; }

.sg-modal-info {
  padding: 11px 14px; border-radius: 9px;
  background: var(--gold-dim); border: 1px solid rgba(99,102,241,0.2);
  font-size: 12px; color: var(--ink2); line-height: 1.55;
  display: flex; gap: 10px; align-items: flex-start;
}
.sg-modal-info svg { flex-shrink: 0; margin-top: 1px; color: var(--gold); }

.sg-modal-actions {
  display: flex; gap: 10px; padding-top: 4px;
}
.sg-modal-actions .sg-btn-ghost { flex: 1; justify-content: center; }
.sg-modal-actions .sg-btn { flex: 1; justify-content: center; }

@keyframes rise {
  to { opacity: 1; transform: none; }
}

/* ── Responsive ───────────────────────────────────────────── */
@media(max-width: 680px) {
  .sg-wrap { padding: 28px 16px 60px; }
  .sg-body { flex-direction: column; }
  .sg-sidebar { width: 100%; }
  .sg-sidebar-inner { display: flex; gap: 4px; padding: 6px; overflow-x: auto; }
  .sg-nav { flex-direction: row; gap: 2px; }
  .sg-nav-item .nav-arrow { display: none; }
  .sg-nav-sep { display: none; }
  .sg-panel-head { padding: 20px 20px 16px; }
  .sg-panel-body { padding: 20px 20px 24px; }
}
`;

/* ════════════════════════════════════════════════════════════
   Password strength helper
════════════════════════════════════════════════════════════ */
function pwStrength(pw: string): 0 | 1 | 2 | 3 {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return s as 0 | 1 | 2 | 3;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="sg-field"><label>{label}</label>{children}</div>;
}

function StaticField({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="sg-field">
      <label>{label}</label>
      <div className="sg-static">{value}</div>
      {note && <span className="sg-static-note">{note}</span>}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Invite Modal
════════════════════════════════════════════════════════════ */
interface InviteModalProps {
  onClose: () => void;
  onInvite: (form: { name: string; email: string; role: Invite['role'] }) => Promise<void>;
  inviting: boolean;
  error: string;
}

function InviteModal({ onClose, onInvite, inviting, error }: InviteModalProps) {
  const [form, setForm] = useState({ name: '', email: '', role: 'accountant' as Invite['role'] });

  return (
    <div className="sg-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sg-modal">
        <div className="sg-modal-head">
          <div>
            <div className="sg-modal-title">Invite a Team Member</div>
            <div className="sg-modal-sub">An invite link will be generated</div>
          </div>
          <button className="sg-modal-close" onClick={onClose}><X size={13} /></button>
        </div>
        <div className="sg-modal-body">
          <div className="sg-modal-info">
            <Mail size={13} />
            <span>An invite link will be generated. Share it with the person you want to add — it expires in 7 days.</span>
          </div>

          {error && (
            <div className="sg-error">
              <AlertCircle size={13} />
              {error}
            </div>
          )}

          <Field label="Full Name *">
            <input
              className="sg-input"
              placeholder="Jane Smith"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>

          <Field label="Email Address *">
            <input
              className="sg-input"
              type="email"
              placeholder="jane@company.com"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            />
          </Field>

          <Field label="Role *">
            <select
              className="sg-select"
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Invite['role'] }))}
            >
              <option value="accountant">Accountant — Can create &amp; manage transactions</option>
              <option value="viewer">Viewer — Read-only access</option>
              <option value="admin">Admin — Full access (use carefully)</option>
            </select>
          </Field>

          <div className="sg-modal-actions">
            <button className="sg-btn-ghost" onClick={onClose}>Cancel</button>
            <button
              className="sg-btn"
              disabled={inviting || !form.name || !form.email}
              onClick={() => onInvite(form)}
            >
              {inviting
                ? <><div className="sg-btn-spin" /><span>Generating…</span></>
                : <><Mail size={13} /><span>Generate Invite</span></>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Main Page
════════════════════════════════════════════════════════════ */
type Tab = 'company' | 'profile' | 'security' | 'users';

export default function SettingsPage() {
  const { user, company, refreshUser, changePassword } = useAuth();
  const [tab, setTab] = useState<Tab>('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [copiedToken, setCopiedToken] = useState('');

  const [companyForm, setCompanyForm] = useState({
    name:     company?.name     ?? '',
    address:  company?.address  ?? '',
    phone:    company?.phone    ?? '',
    email:    company?.email    ?? '',
    taxId:    company?.taxId    ?? '',
    currency: company?.currency ?? 'USD',
  });

  const [profileForm, setProfileForm] = useState({ displayName: user?.displayName ?? '' });
  const [pwForm, setPwForm]   = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [showPw, setShowPw]   = useState({ current: false, next: false, confirm: false });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (tab !== 'users' || !user) return;
    let cancelled = false;
    getCompanyUsers(user.companyId).then((u) => {
      if (!cancelled) setUsers(u);
    });
    getCompanyInvites(user.companyId).then((i) => {
      if (!cancelled) setInvites(i.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => { cancelled = true; };
  }, [tab, user]);

  // Early return AFTER all hooks
  if (!user) return null;

  const actor = { uid: user.uid, email: user.email, name: user.displayName };

  const flash = (msg: string) => { setSaved(msg); setTimeout(() => setSaved(''), 3500); };

  const saveCompany = async () => {
    setSaving(true);
    try { await updateCompany(user.companyId, companyForm, actor); await refreshUser(); flash('Company settings saved.'); }
    finally { setSaving(false); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try { await updateUser(user.uid, { displayName: profileForm.displayName }, actor, user.companyId); await refreshUser(); flash('Profile updated.'); }
    finally { setSaving(false); }
  };

  const savePassword = async () => {
    setPwError('');
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match.'); return; }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      flash('Password changed successfully.');
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password.');
    } finally { setSaving(false); }
  };

  const changeRole = async (uid: string, role: User['role']) => {
    await updateUser(uid, { role }, actor, user.companyId);
    setUsers(u => u.map(x => x.uid === uid ? { ...x, role } : x));
  };

  const handleInvite = async (form: { name: string; email: string; role: Invite['role'] }) => {
    setInviteError('');
    setInviting(true);
    try {
      const invite = await createInvite(
        { ...form, companyId: user.companyId, companyName: company?.name ?? '' },
        actor,
      );
      setInvites((prev) => [invite, ...prev]);
      setShowInviteModal(false);
      flash(`Invite created for ${invite.email}`);
    } catch (e: unknown) {
      setInviteError(e instanceof Error ? e.message : 'Failed to create invite.');
    } finally { setInviting(false); }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(''), 2500);
  };

  const handleRevoke = async (inviteId: string) => {
    await revokeInvite(inviteId, actor, user.companyId);
    setInvites((prev) => prev.map((i) => i.id === inviteId ? { ...i, status: 'expired' } : i));
  };

  const strength = pwStrength(pwForm.next);
  const strengthLabels = ['', 'Weak', 'Fair', 'Strong'];
  const strengthColors = ['', 'weak', 'medium', 'strong'];

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'company',  label: 'Company',      icon: <Building2 /> },
    { id: 'profile',  label: 'Profile',       icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
    { id: 'security', label: 'Security',      icon: <Lock /> },
    { id: 'users',    label: 'Users & Roles', icon: <Users /> },
  ];

  const panelIcons: Record<Tab, React.ReactNode> = {
    company:  <Building2 />,
    profile:  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>,
    security: <Lock />,
    users:    <Users />,
  };
  const panelTitles: Record<Tab, string> = { company: 'Company Information', profile: 'Your Profile', security: 'Change Password', users: 'Users & Roles' };
  const panelSubs: Record<Tab, string>   = {
    company:  'Displayed on invoices, reports, and statements',
    profile:  'Your personal account details',
    security: 'Use a strong, unique password for your account',
    users:    'Control who can access your accounting system',
  };

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="sg">
        <div className="sg-atmo">
          <div className="sg-atmo-glow sg-atmo-glow-1" />
          <div className="sg-atmo-glow sg-atmo-glow-2" />
        </div>
        <div className="sg-grid" />

        <div className="sg-wrap">
          <div className="sg-head">
            <div className="sg-head-tag">Configuration</div>
            <h1 className="sg-h1">Set<em>tings</em></h1>
            <p className="sg-sub">Manage your company and account preferences</p>
          </div>

          <div className="sg-body">
            {/* ── Sidebar ── */}
            <aside className="sg-sidebar">
              <div className="sg-sidebar-inner">
                <nav className="sg-nav">
                  {tabs.map((t, i) => (
                    <>
                      {i === 2 && <div className="sg-nav-sep" key="sep" />}
                      <button
                        key={t.id}
                        className={`sg-nav-item ${tab === t.id ? 'active' : ''}`}
                        onClick={() => setTab(t.id)}
                      >
                        {t.icon}
                        {t.label}
                        <ChevronRight size={11} className="nav-arrow" />
                      </button>
                    </>
                  ))}
                </nav>
              </div>
            </aside>

            {/* ── Main ── */}
            <div className="sg-main">
              {saved && (
                <div className="sg-toast">
                  <div className="sg-toast-dot" />
                  <Check size={13} />
                  {saved}
                </div>
              )}

              {/* ── Company Tab ── */}
              {tab === 'company' && (
                <div className="sg-panel">
                  <div className="sg-panel-head">
                    <div className="sg-panel-icon">{panelIcons.company}</div>
                    <div>
                      <div className="sg-panel-title">{panelTitles.company}</div>
                      <div className="sg-panel-sub">{panelSubs.company}</div>
                    </div>
                  </div>
                  <div className="sg-panel-body">
                    <div className="sg-form">
                      <Field label="Company Name">
                        <input className="sg-input" value={companyForm.name} placeholder="Acme Ltd."
                          onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))} />
                      </Field>
                      <div className="sg-form-grid">
                        <Field label="Business Email">
                          <input className="sg-input" type="email" value={companyForm.email} placeholder="hello@company.com"
                            onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))} />
                        </Field>
                        <Field label="Phone">
                          <input className="sg-input" value={companyForm.phone} placeholder="+1 555 000 0000"
                            onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))} />
                        </Field>
                      </div>
                      <Field label="Address">
                        <input className="sg-input" value={companyForm.address} placeholder="123 Main St, City, Country"
                          onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))} />
                      </Field>
                      <div className="sg-form-grid">
                        <Field label="Tax ID / VAT Number">
                          <input className="sg-input" value={companyForm.taxId} placeholder="XX-XXXXXXX"
                            onChange={e => setCompanyForm(f => ({ ...f, taxId: e.target.value }))} />
                        </Field>
                        <Field label="Default Currency">
                          <select className="sg-select" value={companyForm.currency}
                            onChange={e => setCompanyForm(f => ({ ...f, currency: e.target.value }))}>
                            <option value="USD">USD — US Dollar</option>
                            <option value="EUR">EUR — Euro</option>
                            <option value="GBP">GBP — British Pound</option>
                            <option value="NGN">NGN — Nigerian Naira</option>
                            <option value="CAD">CAD — Canadian Dollar</option>
                            <option value="AUD">AUD — Australian Dollar</option>
                            <option value="JPY">JPY — Japanese Yen</option>
                          </select>
                        </Field>
                      </div>
                      <div>
                        <button className="sg-btn" disabled={saving} onClick={saveCompany}>
                          {saving ? <><div className="sg-btn-spin" /><span>Saving…</span></> : <span>Save Company Settings</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Profile Tab ── */}
              {tab === 'profile' && (
                <div className="sg-panel">
                  <div className="sg-panel-head">
                    <div className="sg-panel-icon">{panelIcons.profile}</div>
                    <div>
                      <div className="sg-panel-title">{panelTitles.profile}</div>
                      <div className="sg-panel-sub">{panelSubs.profile}</div>
                    </div>
                  </div>
                  <div className="sg-panel-body">
                    <div className="sg-form">
                      <Field label="Full Name">
                        <input className="sg-input" value={profileForm.displayName} placeholder="Your full name"
                          onChange={e => setProfileForm({ displayName: e.target.value })} />
                      </Field>
                      <StaticField label="Email Address" value={user.email ?? ''} note="Email address cannot be changed here." />
                      <div className="sg-field">
                        <label>Role</label>
                        <div style={{ marginTop: 2 }}>
                          <span className={`sg-role-badge ${user.role}`}>{user.role}</span>
                        </div>
                      </div>
                      <div>
                        <button className="sg-btn" disabled={saving} onClick={saveProfile}>
                          {saving ? <><div className="sg-btn-spin" /><span>Saving…</span></> : <span>Update Profile</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Security Tab ── */}
              {tab === 'security' && (
                <div className="sg-panel">
                  <div className="sg-panel-head">
                    <div className="sg-panel-icon">{panelIcons.security}</div>
                    <div>
                      <div className="sg-panel-title">{panelTitles.security}</div>
                      <div className="sg-panel-sub">{panelSubs.security}</div>
                    </div>
                  </div>
                  <div className="sg-panel-body">
                    <div className="sg-form">
                      {pwError && (
                        <div className="sg-error">
                          <AlertCircle size={13} />
                          {pwError}
                        </div>
                      )}
                      <Field label="Current Password">
                        <div className="sg-input-wrap">
                          <input
                            className="sg-input has-icon"
                            type={showPw.current ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={pwForm.current}
                            onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                          />
                          <button className="sg-input-action" onClick={() => setShowPw(s => ({ ...s, current: !s.current }))}>
                            {showPw.current ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </Field>
                      <div className="sg-sep">New Password</div>
                      <Field label="New Password">
                        <div className="sg-input-wrap">
                          <input
                            className="sg-input has-icon"
                            type={showPw.next ? 'text' : 'password'}
                            placeholder="Min. 8 characters"
                            value={pwForm.next}
                            onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))}
                          />
                          <button className="sg-input-action" onClick={() => setShowPw(s => ({ ...s, next: !s.next }))}>
                            {showPw.next ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                        {pwForm.next && (
                          <div className="sg-pw-strength">
                            {[1,2,3].map(i => (
                              <div key={i} className={`sg-pw-bar ${strength >= i ? strengthColors[strength] : ''}`} />
                            ))}
                            <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono',monospace", color: 'var(--ink3)', marginLeft: 4, alignSelf: 'center' }}>
                              {strengthLabels[strength]}
                            </span>
                          </div>
                        )}
                      </Field>
                      <Field label="Confirm New Password">
                        <div className="sg-input-wrap">
                          <input
                            className="sg-input has-icon"
                            type={showPw.confirm ? 'text' : 'password'}
                            placeholder="Repeat new password"
                            value={pwForm.confirm}
                            onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                          />
                          <button className="sg-input-action" onClick={() => setShowPw(s => ({ ...s, confirm: !s.confirm }))}>
                            {showPw.confirm ? <EyeOff size={14} /> : <Eye size={14} />}
                          </button>
                        </div>
                      </Field>
                      <div className="sg-reqs">
                        {[
                          { label: 'At least 8 characters',        met: pwForm.next.length >= 8 },
                          { label: 'Mix of uppercase & lowercase',  met: /[A-Z]/.test(pwForm.next) && /[a-z]/.test(pwForm.next) },
                          { label: 'Contains a number',             met: /\d/.test(pwForm.next) },
                          { label: 'Passwords match',               met: !!pwForm.confirm && pwForm.next === pwForm.confirm },
                        ].map(r => (
                          <div key={r.label} className={`sg-req ${r.met ? 'met' : ''}`}>
                            <div className="sg-req-dot" />
                            {r.label}
                          </div>
                        ))}
                      </div>
                      <div>
                        <button className="sg-btn" disabled={saving || !pwForm.current || !pwForm.next} onClick={savePassword}>
                          {saving ? <><div className="sg-btn-spin" /><span>Changing…</span></> : <span>Change Password</span>}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Users Tab ── */}
              {tab === 'users' && (
                <>
                  {/* Team Members Panel */}
                  <div className="sg-panel">
                    <div className="sg-panel-head">
                      <div className="sg-panel-icon">{panelIcons.users}</div>
                      <div className="sg-panel-head-row">
                        <div>
                          <div className="sg-panel-title">{panelTitles.users}</div>
                          <div className="sg-panel-sub">{panelSubs.users}</div>
                        </div>
                        {isAdmin && (
                          <button
                            className="sg-btn sg-btn-sm"
                            style={{ alignSelf: 'center', flexShrink: 0, marginLeft: 12 }}
                            onClick={() => { setInviteError(''); setShowInviteModal(true); }}
                          >
                            <Plus size={13} />
                            <span>Invite User</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="sg-panel-body">
                      <div className="sg-form">
                        {/* Active Members */}
                        {users.length === 0 ? (
                          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--ink3)', fontSize: 13 }}>
                            Loading users…
                          </div>
                        ) : (
                          users.map(u => (
                            <div className="sg-user-row" key={u.uid}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="sg-user-avatar">
                                  {u.displayName?.[0]?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <div className="sg-user-name">
                                    {u.displayName}
                                    {u.uid === user.uid && <span className="sg-you-chip">you</span>}
                                  </div>
                                  <div className="sg-user-email">{u.email}</div>
                                  {u.lastLogin && (
                                    <div className="sg-user-last">Last login {formatDateTime(u.lastLogin)}</div>
                                  )}
                                </div>
                              </div>
                              {u.uid === user.uid || !isAdmin ? (
                                <span className={`sg-role-badge ${u.role}`}>{u.role}</span>
                              ) : (
                                <select className="sg-role-select" value={u.role}
                                  onChange={e => changeRole(u.uid, e.target.value as User['role'])}>
                                  <option value="admin">Admin</option>
                                  <option value="accountant">Accountant</option>
                                  <option value="viewer">Viewer</option>
                                </select>
                              )}
                            </div>
                          ))
                        )}

                        {/* Pending Invites */}
                        {invites.length > 0 && (
                          <>
                            <div className="sg-sep" style={{ margin: '8px 0 4px' }}>Invitations</div>
                            {invites.map((inv) => (
                              <div className="sg-user-row" key={inv.id}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  <div className="sg-user-avatar mail-avatar">
                                    <Mail size={15} />
                                  </div>
                                  <div>
                                    <div className="sg-user-name">{inv.name}</div>
                                    <div className="sg-user-email">
                                      {inv.email} · <span style={{ textTransform: 'capitalize' }}>{inv.role}</span>
                                    </div>
                                    <div className="sg-user-last">
                                      {inv.status === 'pending'
                                        ? `Expires ${formatDate(inv.expiresAt)}`
                                        : `Accepted ${inv.acceptedAt ? formatDate(inv.acceptedAt) : ''}`}
                                    </div>
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span className={`sg-status-badge ${inv.status}`}>{inv.status}</span>
                                  {inv.status === 'pending' && isAdmin && (
                                    <>
                                      <button
                                        className={`sg-icon-btn ${copiedToken === inv.token ? 'copied' : ''}`}
                                        onClick={() => copyInviteLink(inv.token)}
                                        title="Copy invite link"
                                      >
                                        {copiedToken === inv.token ? <Check size={13} /> : <Copy size={13} />}
                                      </button>
                                      <button
                                        className="sg-icon-btn danger"
                                        onClick={() => handleRevoke(inv.id)}
                                        title="Revoke invite"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            ))}
                          </>
                        )}

                        {/* Role Permissions */}
                        <div className="sg-perms" style={{ marginTop: 4 }}>
                          <div className="sg-perms-head"><Shield />Role Permissions</div>
                          {[
                            { role: 'Admin',      desc: 'Full access — all modules, settings, and user management' },
                            { role: 'Accountant', desc: 'Create, edit, and post transactions — no settings access' },
                            { role: 'Viewer',     desc: 'Read-only access to all reports and data' },
                          ].map(r => (
                            <div key={r.role} className="sg-perm-row">
                              <span className="sg-perm-key">{r.role}</span>
                              {r.desc}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          key="invite-modal"
          onClose={() => setShowInviteModal(false)}
          onInvite={handleInvite}
          inviting={inviting}
          error={inviteError}
        />
      )}
    </AuthGuard>
  );
}