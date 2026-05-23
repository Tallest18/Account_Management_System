'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { subscribeToInvoices, createInvoice, getContacts, getAccounts } from '@/lib/db';
import { Invoice, InvoiceItem, Contact, Account } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import { Plus, FileText, Trash2, Eye, X, ChevronRight, Receipt, TrendingUp, Clock, AlertCircle, Send, Save } from 'lucide-react';

/* ─── styles ─────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500;1,600&family=DM+Mono:ital,wght@0,400;0,500;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');

  .inv-root {
    --ink:        #1A1612;
    --ink2:       #3D342A;
    --ink3:       #7A6E65;
    --ink4:       #B5A99E;
    --cream:      #FAF7F2;
    --cream2:     #F3EDE3;
    --cream3:     #EAE0D3;
    --cream4:     #DDD1C2;
    --gold:       #B8913A;
    --gold-light: #D4AA58;
    --gold-dim:   rgba(184,145,58,.14);
    --green:      #2D6A4F;
    --green-bg:   rgba(45,106,79,.10);
    --amber:      #9A6B00;
    --amber-bg:   rgba(154,107,0,.10);
    --red:        #8B2020;
    --red-bg:     rgba(139,32,32,.10);
    --blue:       #1D4E89;
    --blue-bg:    rgba(29,78,137,.10);
    --border:     rgba(26,22,18,.08);
    --border2:    rgba(26,22,18,.14);
    --border3:    rgba(26,22,18,.22);
    --shadow-sm:  0 1px 3px rgba(26,22,18,.06), 0 1px 2px rgba(26,22,18,.04);
    --shadow-md:  0 4px 12px rgba(26,22,18,.08), 0 2px 4px rgba(26,22,18,.04);
    --shadow-lg:  0 12px 40px rgba(26,22,18,.14), 0 4px 12px rgba(26,22,18,.06);
    font-family: 'DM Sans', sans-serif;
    background: var(--cream);
    color: var(--ink);
    min-height: 100vh;
  }

  /* ── page layout ── */
  .inv-page { padding: 36px 40px; max-width: 1200px; margin: 0 auto; }

  /* ── header ── */
  .inv-header {
    display: flex; align-items: flex-end; justify-content: space-between;
    margin-bottom: 32px;
    padding-bottom: 28px;
    border-bottom: 1px solid var(--border2);
    position: relative;
  }
  .inv-header::after {
    content: '';
    position: absolute;
    bottom: -1px; left: 0;
    width: 80px; height: 2px;
    background: var(--gold);
  }
  .inv-title-block { display: flex; flex-direction: column; gap: 6px; }
  .inv-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 2px;
    color: var(--gold);
  }
  .inv-title {
    font-family: 'Playfair Display', serif;
    font-size: 30px; font-weight: 600;
    color: var(--ink); margin: 0; line-height: 1.1;
  }
  .inv-subtitle { font-size: 13px; color: var(--ink3); font-weight: 400; }

  /* ── new invoice button ── */
  .new-inv-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--ink);
    color: var(--cream);
    border: none; border-radius: 10px;
    padding: 11px 20px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; font-weight: 600;
    cursor: pointer;
    transition: all .2s;
    box-shadow: var(--shadow-md);
    letter-spacing: .1px;
  }
  .new-inv-btn:hover { background: var(--ink2); transform: translateY(-1px); box-shadow: var(--shadow-lg); }
  .new-inv-btn:active { transform: translateY(0); }

  /* ── stat cards ── */
  .stat-row {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 14px; margin-bottom: 28px;
  }
  .stat-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 14px;
    padding: 18px 20px;
    box-shadow: var(--shadow-sm);
    position: relative;
    overflow: hidden;
    animation: slideUp .4s ease both;
  }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 2px;
    background: var(--accent-line, transparent);
    opacity: .8;
  }
  .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-1px); transition: all .2s; }
  .stat-icon {
    width: 32px; height: 32px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 14px;
  }
  .stat-label { font-size: 11px; font-weight: 500; color: var(--ink3); text-transform: uppercase; letter-spacing: .7px; margin-bottom: 5px; }
  .stat-value {
    font-family: 'DM Mono', monospace;
    font-size: 22px; font-weight: 500; color: var(--ink);
    line-height: 1;
  }
  .stat-sub { font-size: 11px; color: var(--ink4); margin-top: 4px; }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .stat-card:nth-child(1) { animation-delay: 0ms; }
  .stat-card:nth-child(2) { animation-delay: 60ms; }
  .stat-card:nth-child(3) { animation-delay: 120ms; }
  .stat-card:nth-child(4) { animation-delay: 180ms; }

  /* ── table card ── */
  .table-card {
    background: white;
    border: 1px solid var(--border);
    border-radius: 18px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    animation: slideUp .45s ease .2s both;
  }
  .table-card-header {
    padding: 18px 24px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .table-card-title {
    font-family: 'Playfair Display', serif;
    font-size: 16px; font-weight: 600; color: var(--ink);
  }
  .table-card-count {
    font-family: 'DM Mono', monospace;
    font-size: 11px; color: var(--ink3);
    background: var(--cream2);
    padding: 3px 9px; border-radius: 20px;
    border: 1px solid var(--border);
  }

  /* ── invoice table ── */
  .inv-table { width: 100%; border-collapse: collapse; }
  .inv-table thead tr { background: var(--cream); border-bottom: 1px solid var(--border2); }
  .inv-table thead th {
    padding: 11px 16px;
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1px;
    color: var(--ink3);
    text-align: left;
    white-space: nowrap;
  }
  .inv-table thead th.right { text-align: right; }
  .inv-table tbody tr {
    border-bottom: 1px solid var(--border);
    transition: background .15s;
    animation: rowFade .3s ease both;
    cursor: default;
  }
  .inv-table tbody tr:last-child { border-bottom: none; }
  .inv-table tbody tr:hover { background: var(--cream); }
  @keyframes rowFade { from { opacity:0; } to { opacity:1; } }
  .inv-table td { padding: 14px 16px; vertical-align: middle; }

  /* ── invoice number ── */
  .inv-num {
    font-family: 'DM Mono', monospace;
    font-size: 12px; font-weight: 500;
    color: var(--gold);
    letter-spacing: .3px;
  }

  /* ── contact cell ── */
  .contact-cell { display: flex; align-items: center; gap: 10px; }
  .contact-monogram {
    width: 32px; height: 32px; border-radius: 50%;
    background: var(--cream2);
    border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Playfair Display', serif;
    font-size: 12px; font-weight: 600; color: var(--ink2);
    flex-shrink: 0;
  }
  .contact-name { font-size: 13px; font-weight: 500; color: var(--ink); }

  /* ── date ── */
  .date-mono { font-family: 'DM Mono', monospace; font-size: 11.5px; color: var(--ink3); }

  /* ── amounts ── */
  .amount-mono { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--ink2); text-align: right; }
  .amount-mono.bold { font-weight: 500; color: var(--ink); }
  .amount-mono.zero { color: var(--ink4); }

  /* ── status badge ── */
  .status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 20px;
    font-size: 10.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .6px;
    border: 1px solid transparent;
  }
  .status-dot { width: 5px; height: 5px; border-radius: 50%; }
  .status-badge.paid    { background: var(--green-bg); color: var(--green);  border-color: rgba(45,106,79,.18); }
  .status-badge.paid .status-dot    { background: var(--green); }
  .status-badge.partial { background: var(--amber-bg); color: var(--amber); border-color: rgba(154,107,0,.18); }
  .status-badge.partial .status-dot { background: var(--amber); }
  .status-badge.overdue { background: var(--red-bg);   color: var(--red);   border-color: rgba(139,32,32,.18); }
  .status-badge.overdue .status-dot { background: var(--red); animation: blink .9s ease infinite; }
  .status-badge.voided  { background: var(--red-bg);   color: var(--red);   border-color: rgba(139,32,32,.12); opacity:.7; }
  .status-badge.sent    { background: var(--blue-bg);  color: var(--blue);  border-color: rgba(29,78,137,.18); }
  .status-badge.sent .status-dot    { background: var(--blue); }
  .status-badge.draft   { background: var(--cream2);   color: var(--ink3);  border-color: var(--border2); }
  .status-badge.draft .status-dot   { background: var(--ink4); }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }

  /* ── action btn ── */
  .row-action {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: transparent;
    border: 1px solid transparent;
    color: var(--ink4); cursor: pointer;
    transition: all .15s;
  }
  .row-action:hover { background: var(--cream2); border-color: var(--border2); color: var(--ink); }

  /* ── empty ── */
  .empty-state {
    display: flex; flex-direction: column; align-items: center;
    padding: 72px 32px; gap: 16px; text-align: center;
  }
  .empty-icon {
    width: 64px; height: 64px; border-radius: 20px;
    background: var(--cream2); border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    color: var(--ink4);
  }
  .empty-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 600; color: var(--ink); margin: 0; }
  .empty-sub { font-size: 13px; color: var(--ink3); margin: 0; }
  .empty-btn {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--ink); color: var(--cream);
    border: none; border-radius: 9px; padding: 10px 18px;
    font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600;
    cursor: pointer; margin-top: 4px;
    transition: all .2s;
  }
  .empty-btn:hover { background: var(--ink2); }

  /* ── spinner ── */
  .spinner-wrap { display:flex; align-items:center; justify-content:center; padding: 72px; }
  .spinner {
    width: 28px; height: 28px;
    border: 2px solid var(--border3);
    border-top-color: var(--gold);
    border-radius: 50%;
    animation: spin .75s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ══════════════════════════════════════
     MODAL OVERLAY
  ══════════════════════════════════════ */
  .modal-overlay {
    position: fixed; inset: 0; z-index: 9999;
    background: rgba(26,22,18,.55);
    backdrop-filter: blur(6px);
    display: flex; align-items: center; justify-content: center;
    padding: 24px;
    animation: fadeOverlay .2s ease;
  }
  @keyframes fadeOverlay { from{opacity:0} to{opacity:1} }

  .modal-sheet {
    background: white;
    border-radius: 22px;
    width: 100%; max-width: 780px;
    max-height: 88vh;
    overflow-y: auto;
    box-shadow: var(--shadow-lg);
    animation: sheetIn .25s cubic-bezier(.22,.68,0,1.2);
    position: relative;
  }
  .modal-sheet.lg { max-width: 680px; }
  @keyframes sheetIn {
    from { opacity:0; transform: scale(.95) translateY(16px); }
    to   { opacity:1; transform: scale(1) translateY(0); }
  }
  .modal-sheet::-webkit-scrollbar { width: 4px; }
  .modal-sheet::-webkit-scrollbar-track { background: transparent; }
  .modal-sheet::-webkit-scrollbar-thumb { background: var(--cream3); border-radius: 4px; }

  .modal-head {
    padding: 24px 28px 20px;
    border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
    position: sticky; top: 0; background: white; z-index: 2;
    border-radius: 22px 22px 0 0;
  }
  .modal-head-left { display: flex; flex-direction: column; gap: 3px; }
  .modal-head-eyebrow {
    font-family: 'DM Mono', monospace;
    font-size: 10px; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--gold);
  }
  .modal-head-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px; font-weight: 600; color: var(--ink); margin: 0;
  }
  .modal-close {
    width: 32px; height: 32px; border-radius: 9px;
    background: var(--cream2); border: 1px solid var(--border2);
    display: flex; align-items: center; justify-content: center;
    color: var(--ink3); cursor: pointer; transition: all .15s;
  }
  .modal-close:hover { background: var(--cream3); color: var(--ink); }

  .modal-body { padding: 24px 28px; display: flex; flex-direction: column; gap: 22px; }

  /* ── form fields ── */
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .field-group { display: flex; flex-direction: column; gap: 5px; }
  .field-label {
    font-size: 11px; font-weight: 600; text-transform: uppercase;
    letter-spacing: .7px; color: var(--ink3);
  }
  .field-input, .field-select {
    background: var(--cream);
    border: 1px solid var(--border2);
    border-radius: 9px;
    padding: 9px 12px;
    font-family: 'DM Sans', sans-serif;
    font-size: 13px; color: var(--ink);
    outline: none;
    transition: border-color .15s, box-shadow .15s;
    width: 100%; box-sizing: border-box;
  }
  .field-input:focus, .field-select:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px var(--gold-dim);
  }
  .field-select { appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%237A6E65' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 10px center;
    padding-right: 30px; cursor: pointer;
  }

  /* ── items section ── */
  .items-section { display: flex; flex-direction: column; gap: 10px; }
  .items-header {
    display: flex; align-items: center; justify-content: space-between;
  }
  .items-label {
    font-size: 10px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 1px; color: var(--ink3);
    display: flex; align-items: center; gap: 6px;
  }
  .add-item-btn {
    font-size: 12px; font-weight: 600; color: var(--gold);
    background: none; border: none; cursor: pointer;
    display: flex; align-items: center; gap: 4px;
    padding: 4px 8px; border-radius: 6px;
    transition: background .15s;
  }
  .add-item-btn:hover { background: var(--gold-dim); }

  .items-table-wrap {
    border: 1px solid var(--border2);
    border-radius: 12px;
    overflow: hidden;
  }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table thead tr { background: var(--cream2); border-bottom: 1px solid var(--border2); }
  .items-table thead th {
    padding: 9px 12px;
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .8px;
    color: var(--ink3); text-align: left;
  }
  .items-table thead th.r { text-align: right; }
  .items-table tbody tr { border-top: 1px solid var(--border); background: white; }
  .items-table tbody tr:hover { background: var(--cream); }
  .items-table td { padding: 8px 10px; vertical-align: middle; }

  .item-input {
    background: var(--cream);
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 6px 9px;
    font-family: 'DM Sans', sans-serif;
    font-size: 12px; color: var(--ink);
    outline: none;
    transition: border-color .15s, background .15s;
    width: 100%; box-sizing: border-box;
  }
  .item-input:focus { border-color: var(--gold); background: white; box-shadow: 0 0 0 2px var(--gold-dim); }
  .item-input.mono { font-family: 'DM Mono', monospace; text-align: right; }
  .item-select {
    background: var(--cream);
    border: 1px solid transparent;
    border-radius: 7px;
    padding: 6px 9px;
    font-size: 11px; color: var(--ink);
    outline: none; cursor: pointer;
    width: 100%;
  }
  .item-select:focus { border-color: var(--gold); }

  .item-amount { font-family: 'DM Mono', monospace; font-size: 12px; font-weight: 500; color: var(--ink); text-align: right; }
  .item-del-btn {
    width: 26px; height: 26px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid transparent;
    color: var(--ink4); cursor: pointer; transition: all .15s;
  }
  .item-del-btn:hover { background: var(--red-bg); border-color: rgba(139,32,32,.18); color: var(--red); }

  /* ── totals ── */
  .totals-section {
    display: flex; justify-content: flex-end;
  }
  .totals-box {
    background: var(--cream);
    border: 1px solid var(--border2);
    border-radius: 12px;
    padding: 16px 20px;
    min-width: 260px;
    display: flex; flex-direction: column; gap: 8px;
  }
  .totals-row { display: flex; justify-content: space-between; align-items: center; }
  .totals-row-label { font-size: 12px; color: var(--ink3); }
  .totals-row-val { font-family: 'DM Mono', monospace; font-size: 13px; color: var(--ink); }
  .totals-divider { height: 1px; background: var(--border2); margin: 4px 0; }
  .totals-total-label { font-size: 13px; font-weight: 600; color: var(--ink); }
  .totals-total-val {
    font-family: 'DM Mono', monospace;
    font-size: 18px; font-weight: 500; color: var(--gold);
  }

  /* ── form actions ── */
  .form-actions {
    display: flex; align-items: center; justify-content: flex-end; gap: 10px;
    padding-top: 6px; border-top: 1px solid var(--border);
  }
  .btn-cancel {
    background: none; border: 1px solid var(--border2); border-radius: 9px;
    padding: 9px 16px; font-family:'DM Sans',sans-serif; font-size:13px;
    font-weight:600; color:var(--ink3); cursor:pointer; transition:all .15s;
  }
  .btn-cancel:hover { background:var(--cream2); color:var(--ink); }
  .btn-draft {
    display:inline-flex; align-items:center; gap:6px;
    background: var(--cream2); border: 1px solid var(--border2); border-radius: 9px;
    padding: 9px 16px; font-family:'DM Sans',sans-serif; font-size:13px;
    font-weight:600; color:var(--ink2); cursor:pointer; transition:all .15s;
  }
  .btn-draft:hover { background:var(--cream3); }
  .btn-draft:disabled { opacity:.45; cursor:not-allowed; }
  .btn-send {
    display:inline-flex; align-items:center; gap:7px;
    background: var(--ink); border:none; border-radius:9px;
    padding:9px 20px; font-family:'DM Sans',sans-serif; font-size:13px;
    font-weight:600; color:var(--cream); cursor:pointer;
    box-shadow:var(--shadow-md); transition:all .2s;
  }
  .btn-send:hover { background:var(--ink2); transform:translateY(-1px); box-shadow:var(--shadow-lg); }
  .btn-send:disabled { opacity:.45; cursor:not-allowed; transform:none; }

  /* ── view invoice modal ── */
  .view-header-strip {
    background: var(--cream);
    border-bottom: 1px solid var(--border);
    padding: 20px 28px;
  }
  .view-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .view-meta-item { display: flex; flex-direction: column; gap: 3px; }
  .view-meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .7px; color: var(--ink3); }
  .view-meta-val { font-size: 13px; color: var(--ink); font-weight: 500; }
  .view-meta-val.mono { font-family: 'DM Mono', monospace; }

  .view-items-table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  .view-items-table thead tr { background: var(--cream); border-bottom: 1px solid var(--border2); }
  .view-items-table thead th {
    padding: 9px 14px; font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .8px; color: var(--ink3); text-align: left;
  }
  .view-items-table thead th.r { text-align: right; }
  .view-items-table tbody tr { border-bottom: 1px solid var(--border); }
  .view-items-table tbody tr:last-child { border-bottom: none; }
  .view-items-table td { padding: 11px 14px; font-size: 13px; }
  .view-items-table td.mono { font-family: 'DM Mono', monospace; }
  .view-items-table td.r { text-align: right; }

  .view-totals { background: var(--cream); border-top: 1px solid var(--border2); }
  .view-totals-inner { max-width: 280px; margin-left: auto; padding: 16px 14px; display: flex; flex-direction: column; gap: 8px; }
  .vt-row { display: flex; justify-content: space-between; font-size: 12px; }
  .vt-label { color: var(--ink3); }
  .vt-val { font-family: 'DM Mono', monospace; color: var(--ink); }
  .vt-hr { height: 1px; background: var(--border2); }
  .vt-total .vt-label { font-size: 14px; font-weight: 600; color: var(--ink); }
  .vt-total .vt-val { font-size: 17px; font-weight: 500; color: var(--gold); }
  .vt-paid .vt-val { color: var(--green); }
  .vt-bal .vt-label { font-weight: 600; color: var(--red); }
  .vt-bal .vt-val { color: var(--red); font-weight: 500; }

  .view-notes {
    padding: 16px 28px;
    font-size: 13px; color: var(--ink2);
    border-top: 1px solid var(--border);
  }
  .view-notes-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .7px; color: var(--ink3); margin-bottom: 5px; }
`;

/* ─── helpers ─────────────────────────────────────────────── */
function newItem(): InvoiceItem {
  return { id: generateId(), description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, amount: 0, accountId: '' };
}

function monogram(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function statusClass(status: string) {
  return ['paid','partial','overdue','voided','sent','draft'].includes(status) ? status : 'draft';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge ${statusClass(status)}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

/* ─── main ────────────────────────────────────────────────── */
export default function SalesInvoicesPage() {
  const { user, company } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    contactId: '', date: new Date().toISOString().slice(0, 10),
    dueDate: '', notes: '', terms: 'Net 30',
  });
  const [items, setItems] = useState<InvoiceItem[]>([newItem()]);

  if (!user) return null;
  const actor = { uid: user.uid, email: user.email, name: user.displayName };

  useEffect(() => {
    if (!user) return;
    getContacts(user.companyId).then(setContacts);
    getAccounts(user.companyId).then(setAccounts);
    const unsub = subscribeToInvoices(user.companyId, 'sales', (data) => {
      setInvoices(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  /* close on ESC */
  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowForm(false); setViewInvoice(null); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const updateItem = (id: string, key: keyof InvoiceItem, val: string | number) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const updated = { ...item, [key]: val };
      updated.amount = updated.quantity * updated.unitPrice * (1 - updated.discount / 100);
      return updated;
    }));
  };

  const subtotal = items.reduce((s, i) => s + i.amount, 0);
  const taxAmount = items.reduce((s, i) => s + i.amount * (i.taxRate / 100), 0);
  const total = subtotal + taxAmount;

  const handleSave = async (status: Invoice['status']) => {
    if (!form.contactId) return;
    setSaving(true);
    const contact = contacts.find((c) => c.id === form.contactId);
    try {
      await createInvoice({
        companyId: user!.companyId, type: 'sales',
        contactId: form.contactId, contactName: contact?.name ?? '',
        date: form.date, dueDate: form.dueDate, status, items,
        subtotal, taxAmount, discountAmount: 0, total,
        amountPaid: 0, balance: total,
        notes: form.notes, terms: form.terms,
        createdBy: user!.uid, updatedBy: user!.uid,
      }, actor);
      setShowForm(false);
      setForm({ contactId: '', date: new Date().toISOString().slice(0, 10), dueDate: '', notes: '', terms: 'Net 30' });
      setItems([newItem()]);
    } finally { setSaving(false); }
  };

  const revenueAccounts = accounts.filter((a) => a.type === 'revenue');
  const cur = company?.currency;

  /* derived stats */
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const outstanding = invoices.filter(i => ['sent','partial'].includes(i.status)).reduce((s, i) => s + i.balance, 0);
  const overdueCount = invoices.filter(i => i.status === 'overdue').length;
  const draftCount = invoices.filter(i => i.status === 'draft').length;

  const customerContacts = contacts.filter((c) => c.type !== 'vendor');

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="inv-root">
        <div className="inv-page">

          {/* Header */}
          <div className="inv-header">
            <div className="inv-title-block">
              <span className="inv-eyebrow">Finance · Sales</span>
              <h1 className="inv-title">Sales Invoices</h1>
              <p className="inv-subtitle">Manage customer invoices, track payments &amp; balances</p>
            </div>
            <button className="new-inv-btn" onClick={() => setShowForm(true)}>
              <Plus size={15} />
              New Invoice
            </button>
          </div>

          {/* Stats */}
          <div className="stat-row">
            <div className="stat-card" style={{ '--accent-line': '#2D6A4F' } as React.CSSProperties}>
              <div className="stat-icon" style={{ background: 'rgba(45,106,79,.10)', color: '#2D6A4F' }}><TrendingUp size={15} /></div>
              <div className="stat-label">Revenue Collected</div>
              <div className="stat-value" style={{ color: '#2D6A4F' }}>{formatCurrency(totalRevenue, cur)}</div>
              <div className="stat-sub">from paid invoices</div>
            </div>
            <div className="stat-card" style={{ '--accent-line': '#B8913A' } as React.CSSProperties}>
              <div className="stat-icon" style={{ background: 'rgba(184,145,58,.12)', color: '#B8913A' }}><Clock size={15} /></div>
              <div className="stat-label">Outstanding</div>
              <div className="stat-value" style={{ color: '#B8913A' }}>{formatCurrency(outstanding, cur)}</div>
              <div className="stat-sub">awaiting payment</div>
            </div>
            <div className="stat-card" style={{ '--accent-line': '#8B2020' } as React.CSSProperties}>
              <div className="stat-icon" style={{ background: 'rgba(139,32,32,.10)', color: '#8B2020' }}><AlertCircle size={15} /></div>
              <div className="stat-label">Overdue</div>
              <div className="stat-value" style={{ color: '#8B2020' }}>{overdueCount}</div>
              <div className="stat-sub">{overdueCount === 1 ? 'invoice' : 'invoices'} past due</div>
            </div>
            <div className="stat-card" style={{ '--accent-line': '#7A6E65' } as React.CSSProperties}>
              <div className="stat-icon" style={{ background: 'rgba(122,110,101,.10)', color: '#7A6E65' }}><FileText size={15} /></div>
              <div className="stat-label">Drafts</div>
              <div className="stat-value" style={{ color: '#7A6E65' }}>{draftCount}</div>
              <div className="stat-sub">not yet sent</div>
            </div>
          </div>

          {/* Table */}
          <div className="table-card">
            <div className="table-card-header">
              <span className="table-card-title">All Invoices</span>
              <span className="table-card-count">{invoices.length} total</span>
            </div>

            {loading ? (
              <div className="spinner-wrap"><div className="spinner" /></div>
            ) : invoices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon"><FileText size={26} /></div>
                <p className="empty-title">No invoices yet</p>
                <p className="empty-sub">Create your first invoice to start tracking sales.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>
                  <Plus size={14} /> Create Invoice
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Due Date</th>
                      <th className="right">Total</th>
                      <th className="right">Balance</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((inv, idx) => (
                      <tr key={inv.id} style={{ animationDelay: `${idx * 25}ms` }}>
                        <td><span className="inv-num">{inv.invoiceNumber}</span></td>
                        <td>
                          <div className="contact-cell">
                            <div className="contact-monogram">{monogram(inv.contactName)}</div>
                            <span className="contact-name">{inv.contactName}</span>
                          </div>
                        </td>
                        <td><span className="date-mono">{formatDate(inv.date)}</span></td>
                        <td><span className="date-mono">{formatDate(inv.dueDate)}</span></td>
                        <td><div className="amount-mono">{formatCurrency(inv.total, cur)}</div></td>
                        <td>
                          <div className={`amount-mono bold${inv.balance === 0 ? ' zero' : ''}`}>
                            {formatCurrency(inv.balance, cur)}
                          </div>
                        </td>
                        <td><StatusBadge status={inv.status} /></td>
                        <td>
                          <button className="row-action" onClick={() => setViewInvoice(inv)} title="View invoice">
                            <Eye size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          CREATE INVOICE MODAL
      ══════════════════════════════════════ */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal-sheet">
            <div className="modal-head">
              <div className="modal-head-left">
                <span className="modal-head-eyebrow">New Invoice</span>
                <h2 className="modal-head-title">Create Sales Invoice</h2>
              </div>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={14} /></button>
            </div>

            <div className="modal-body">
              {/* header fields */}
              <div className="form-grid">
                <div className="field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="field-label">Customer *</label>
                  <select
                    className="field-select"
                    value={form.contactId}
                    onChange={(e) => setForm((f) => ({ ...f, contactId: e.target.value }))}
                  >
                    <option value="">— Select customer —</option>
                    {customerContacts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field-group">
                  <label className="field-label">Invoice Date</label>
                  <input type="date" className="field-input" value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Due Date</label>
                  <input type="date" className="field-input" value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Payment Terms</label>
                  <input className="field-input" value={form.terms}
                    onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))} />
                </div>
                <div className="field-group">
                  <label className="field-label">Notes</label>
                  <input className="field-input" placeholder="Thank you for your business"
                    value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>

              {/* line items */}
              <div className="items-section">
                <div className="items-header">
                  <span className="items-label"><Receipt size={11} /> Line Items</span>
                  <button className="add-item-btn" onClick={() => setItems([...items, newItem()])}>
                    <Plus size={11} /> Add item
                  </button>
                </div>
                <div className="items-table-wrap">
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Description</th>
                        <th style={{ width: '14%' }}>Revenue Acct</th>
                        <th className="r" style={{ width: '8%' }}>Qty</th>
                        <th className="r" style={{ width: '14%' }}>Unit Price</th>
                        <th className="r" style={{ width: '8%' }}>Tax %</th>
                        <th className="r" style={{ width: '14%' }}>Amount</th>
                        <th style={{ width: '7%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input className="item-input" placeholder="Description"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                          </td>
                          <td>
                            <select className="item-select" value={item.accountId}
                              onChange={(e) => updateItem(item.id, 'accountId', e.target.value)}>
                              <option value="">—</option>
                              {revenueAccounts.map((a) => (
                                <option key={a.id} value={a.id}>{a.code}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <input type="number" min="1" className="item-input mono"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)} />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" className="item-input mono"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td>
                            <input type="number" min="0" max="100" className="item-input mono"
                              value={item.taxRate}
                              onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td>
                            <span className="item-amount">{formatCurrency(item.amount)}</span>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            {items.length > 1 && (
                              <button className="item-del-btn"
                                onClick={() => setItems(items.filter((i) => i.id !== item.id))}>
                                <Trash2 size={12} />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* totals */}
              <div className="totals-section">
                <div className="totals-box">
                  <div className="totals-row">
                    <span className="totals-row-label">Subtotal</span>
                    <span className="totals-row-val">{formatCurrency(subtotal, cur)}</span>
                  </div>
                  <div className="totals-row">
                    <span className="totals-row-label">Tax</span>
                    <span className="totals-row-val">{formatCurrency(taxAmount, cur)}</span>
                  </div>
                  <div className="totals-divider" />
                  <div className="totals-row">
                    <span className="totals-total-label">Total</span>
                    <span className="totals-total-val">{formatCurrency(total, cur)}</span>
                  </div>
                </div>
              </div>

              {/* actions */}
              <div className="form-actions">
                <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                <button
                  className="btn-draft"
                  disabled={!form.contactId || saving}
                  onClick={() => handleSave('draft')}
                >
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button
                  className="btn-send"
                  disabled={!form.contactId || items[0].amount === 0 || saving}
                  onClick={() => handleSave('sent')}
                >
                  <Send size={13} />
                  {saving ? 'Sending…' : 'Create & Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          VIEW INVOICE MODAL
      ══════════════════════════════════════ */}
      {viewInvoice && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewInvoice(null); }}>
          <div className="modal-sheet lg">
            <div className="modal-head">
              <div className="modal-head-left">
                <span className="modal-head-eyebrow">Invoice</span>
                <h2 className="modal-head-title">{viewInvoice.invoiceNumber}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusBadge status={viewInvoice.status} />
                <button className="modal-close" onClick={() => setViewInvoice(null)}><X size={14} /></button>
              </div>
            </div>

            {/* meta strip */}
            <div className="view-header-strip">
              <div className="view-meta">
                <div className="view-meta-item">
                  <span className="view-meta-label">Customer</span>
                  <span className="view-meta-val">{viewInvoice.contactName}</span>
                </div>
                <div className="view-meta-item">
                  <span className="view-meta-label">Terms</span>
                  <span className="view-meta-val">{viewInvoice.terms || '—'}</span>
                </div>
                <div className="view-meta-item">
                  <span className="view-meta-label">Invoice Date</span>
                  <span className="view-meta-val mono">{formatDate(viewInvoice.date)}</span>
                </div>
                <div className="view-meta-item">
                  <span className="view-meta-label">Due Date</span>
                  <span className="view-meta-val mono">{formatDate(viewInvoice.dueDate)}</span>
                </div>
              </div>
            </div>

            {/* items */}
            <table className="view-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="r">Qty</th>
                  <th className="r">Unit Price</th>
                  <th className="r">Tax %</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewInvoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="mono r">{item.quantity}</td>
                    <td className="mono r">{formatCurrency(item.unitPrice, cur)}</td>
                    <td className="r">{item.taxRate}%</td>
                    <td className="mono r">{formatCurrency(item.amount, cur)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* totals */}
            <div className="view-totals">
              <div className="view-totals-inner">
                <div className="vt-row"><span className="vt-label">Subtotal</span><span className="vt-val">{formatCurrency(viewInvoice.subtotal, cur)}</span></div>
                <div className="vt-row"><span className="vt-label">Tax</span><span className="vt-val">{formatCurrency(viewInvoice.taxAmount, cur)}</span></div>
                <div className="vt-hr" />
                <div className="vt-row vt-total"><span className="vt-label">Total</span><span className="vt-val">{formatCurrency(viewInvoice.total, cur)}</span></div>
                <div className="vt-row vt-paid"><span className="vt-label">Amount Paid</span><span className="vt-val">{formatCurrency(viewInvoice.amountPaid, cur)}</span></div>
                <div className="vt-hr" />
                <div className="vt-row vt-bal"><span className="vt-label">Balance Due</span><span className="vt-val">{formatCurrency(viewInvoice.balance, cur)}</span></div>
              </div>
            </div>

            {/* notes */}
            {viewInvoice.notes && (
              <div className="view-notes">
                <div className="view-notes-label">Notes</div>
                {viewInvoice.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}