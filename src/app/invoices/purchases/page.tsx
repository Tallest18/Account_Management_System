'use client';
import { useEffect, useState, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { useAuth } from '@/context/AuthContext';
import { subscribeToInvoices, createInvoice, getContacts, getAccounts } from '@/lib/db';
import { Invoice, InvoiceItem, Contact, Account } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/utils';
import {
  Plus, FileText, Trash2, Eye, X, Receipt, TrendingDown,
  Clock, AlertCircle, CheckCircle2, Save, Building2, Tag,
  ChevronDown, Layers, Package,
} from 'lucide-react';

/* ─── styles ─────────────────────────────────────────────── */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Cabinet+Grotesk:wght@400;500;700;800&family=Fira+Code:wght@400;500&family=Geist:wght@300;400;500;600&display=swap');

  .pb-root {
    --bg:         #F0F2F5;
    --bg2:        #E8EBF0;
    --bg3:        #DDE1E8;
    --surface:    #FFFFFF;
    --surface2:   #F7F8FA;
    --steel:      #1E3A5F;
    --steel2:     #2E5080;
    --steel3:     #3D6AA0;
    --steel-dim:  rgba(30,58,95,.08);
    --steel-dim2: rgba(30,58,95,.14);
    --slate:      #3D4A5C;
    --slate2:     #5C6A7E;
    --slate3:     #8A96A8;
    --slate4:     #B8C0CC;
    --line:       rgba(30,58,95,.08);
    --line2:      rgba(30,58,95,.14);
    --line3:      rgba(30,58,95,.22);
    --green:      #1A6B3C;
    --green-bg:   rgba(26,107,60,.09);
    --amber:      #8A5C00;
    --amber-bg:   rgba(138,92,0,.09);
    --red:        #8B1A1A;
    --red-bg:     rgba(139,26,26,.09);
    --violet:     #4A3A8A;
    --violet-bg:  rgba(74,58,138,.09);
    --shadow-xs:  0 1px 2px rgba(30,58,95,.06);
    --shadow-sm:  0 2px 6px rgba(30,58,95,.08), 0 1px 2px rgba(30,58,95,.04);
    --shadow-md:  0 4px 16px rgba(30,58,95,.10), 0 2px 4px rgba(30,58,95,.05);
    --shadow-lg:  0 12px 40px rgba(30,58,95,.14), 0 4px 12px rgba(30,58,95,.07);
    font-family: 'Geist', sans-serif;
    background: var(--bg);
    color: var(--slate);
    min-height: 100vh;
  }

  /* ── layout ── */
  .pb-page { padding: 36px 40px; max-width: 1240px; margin: 0 auto; }

  /* ── header ── */
  .pb-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 30px;
  }
  .pb-header-left { display: flex; align-items: center; gap: 16px; }
  .pb-logo {
    width: 48px; height: 48px; border-radius: 14px;
    background: var(--steel);
    display: flex; align-items: center; justify-content: center;
    box-shadow: var(--shadow-md);
    position: relative; overflow: hidden; flex-shrink: 0;
  }
  .pb-logo::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,.15) 0%, transparent 60%);
  }
  .pb-title-stack { display: flex; flex-direction: column; gap: 2px; }
  .pb-label {
    font-family: 'Fira Code', monospace;
    font-size: 10px; font-weight: 500;
    text-transform: uppercase; letter-spacing: 2px;
    color: var(--steel3); opacity: .8;
  }
  .pb-title {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 28px; font-weight: 800;
    color: var(--steel); margin: 0; line-height: 1;
    letter-spacing: -.5px;
  }
  .pb-subtitle { font-size: 13px; color: var(--slate3); font-weight: 400; margin-top: 1px; }

  /* ── new bill btn ── */
  .new-bill-btn {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--steel);
    color: white;
    border: none; border-radius: 12px;
    padding: 11px 22px;
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 14px; font-weight: 700;
    cursor: pointer;
    transition: all .2s;
    box-shadow: var(--shadow-md);
    letter-spacing: -.1px;
    position: relative; overflow: hidden;
  }
  .new-bill-btn::before {
    content: '';
    position: absolute; inset: 0;
    background: linear-gradient(135deg, rgba(255,255,255,.12) 0%, transparent 50%);
  }
  .new-bill-btn:hover { background: var(--steel2); transform: translateY(-1px); box-shadow: var(--shadow-lg); }
  .new-bill-btn:active { transform: translateY(0); box-shadow: var(--shadow-sm); }

  /* ── stat cards ── */
  .stat-grid {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 14px; margin-bottom: 24px;
  }
  .stat-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 16px;
    padding: 20px;
    box-shadow: var(--shadow-xs);
    position: relative;
    overflow: hidden;
    animation: cardIn .4s cubic-bezier(.22,.68,0,1.1) both;
    transition: box-shadow .2s, transform .2s;
  }
  .stat-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
  .stat-card::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0; height: 3px;
    background: var(--accent-bar, transparent);
    border-radius: 0 0 16px 16px;
  }
  /* geometric corner mark */
  .stat-card::before {
    content: '';
    position: absolute;
    top: -24px; right: -24px;
    width: 64px; height: 64px;
    border-radius: 50%;
    background: var(--accent-glow, transparent);
    opacity: .5;
  }
  .stat-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
  .stat-icon-box {
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
  }
  .stat-trend {
    font-family: 'Fira Code', monospace;
    font-size: 10px; font-weight: 500;
    padding: 3px 7px; border-radius: 20px;
    border: 1px solid transparent;
  }
  .stat-label { font-size: 11px; font-weight: 500; color: var(--slate3); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 5px; }
  .stat-val {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 26px; font-weight: 800; line-height: 1;
    letter-spacing: -.5px;
  }
  .stat-sub { font-size: 11.5px; color: var(--slate4); margin-top: 5px; font-weight: 400; }

  @keyframes cardIn {
    from { opacity:0; transform: translateY(20px) scale(.98); }
    to   { opacity:1; transform: translateY(0) scale(1); }
  }
  .stat-card:nth-child(1){ animation-delay: 0ms }
  .stat-card:nth-child(2){ animation-delay: 70ms }
  .stat-card:nth-child(3){ animation-delay: 140ms }
  .stat-card:nth-child(4){ animation-delay: 210ms }

  /* ── filter bar ── */
  .filter-bar {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 16px;
    animation: fadeIn .4s ease .2s both;
  }
  @keyframes fadeIn { from{opacity:0} to{opacity:1} }
  .filter-chip {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 6px 13px; border-radius: 20px;
    font-size: 12px; font-weight: 600;
    border: 1px solid var(--line2);
    background: var(--surface);
    color: var(--slate2);
    cursor: pointer; transition: all .15s;
    box-shadow: var(--shadow-xs);
  }
  .filter-chip:hover { background: var(--bg2); border-color: var(--line3); }
  .filter-chip.active {
    background: var(--steel); color: white;
    border-color: var(--steel);
    box-shadow: var(--shadow-sm);
  }
  .filter-chip .chip-count {
    background: rgba(255,255,255,.25);
    border-radius: 10px; padding: 1px 6px;
    font-family: 'Fira Code', monospace; font-size: 10px;
  }
  .filter-chip:not(.active) .chip-count {
    background: var(--bg2); color: var(--slate3);
  }
  .filter-spacer { flex: 1; }
  .sort-select {
    background: var(--surface);
    border: 1px solid var(--line2);
    border-radius: 9px;
    padding: 7px 28px 7px 11px;
    font-family: 'Geist', sans-serif;
    font-size: 12px; font-weight: 500; color: var(--slate2);
    outline: none; cursor: pointer;
    appearance: none; -webkit-appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%238A96A8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right 9px center;
    box-shadow: var(--shadow-xs);
  }

  /* ── table card ── */
  .table-card {
    background: var(--surface);
    border: 1px solid var(--line);
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
    overflow: hidden;
    animation: cardIn .45s ease .28s both;
  }
  .table-top {
    padding: 16px 22px;
    border-bottom: 1px solid var(--line);
    display: flex; align-items: center; justify-content: space-between;
    background: var(--surface2);
  }
  .table-top-left { display: flex; align-items: center; gap: 10px; }
  .table-heading {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 15px; font-weight: 700; color: var(--steel); letter-spacing: -.2px;
  }
  .table-count {
    font-family: 'Fira Code', monospace;
    font-size: 11px; font-weight: 500;
    background: var(--steel-dim);
    color: var(--steel3);
    padding: 3px 9px; border-radius: 20px;
  }

  /* ── bills table ── */
  .bills-table { width: 100%; border-collapse: collapse; }
  .bills-table thead tr { border-bottom: 1px solid var(--line2); }
  .bills-table thead th {
    padding: 11px 16px;
    font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.2px;
    color: var(--slate3); text-align: left; white-space: nowrap;
  }
  .bills-table thead th.r { text-align: right; }
  .bills-table tbody tr {
    border-bottom: 1px solid var(--line);
    transition: background .12s;
    animation: rowSlide .3s ease both;
  }
  .bills-table tbody tr:last-child { border-bottom: none; }
  .bills-table tbody tr:hover { background: var(--bg); }
  @keyframes rowSlide {
    from { opacity:0; transform: translateX(-8px); }
    to   { opacity:1; transform: translateX(0); }
  }
  .bills-table td { padding: 13px 16px; vertical-align: middle; }

  /* ── bill # ── */
  .bill-num {
    font-family: 'Fira Code', monospace;
    font-size: 11.5px; font-weight: 500;
    color: var(--steel3);
    background: var(--steel-dim);
    padding: 3px 8px; border-radius: 6px;
    display: inline-block;
  }

  /* ── vendor cell ── */
  .vendor-cell { display: flex; align-items: center; gap: 10px; }
  .vendor-avatar {
    width: 34px; height: 34px; border-radius: 10px;
    background: var(--steel-dim2);
    border: 1px solid var(--line2);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 12px; font-weight: 800;
    color: var(--steel2); flex-shrink: 0;
    letter-radius: -.3px;
  }
  .vendor-name { font-size: 13px; font-weight: 500; color: var(--slate); }
  .vendor-ref { font-size: 11px; color: var(--slate3); margin-top: 1px; font-family: 'Fira Code', monospace; }

  /* ── date ── */
  .date-cell { font-family: 'Fira Code', monospace; font-size: 11.5px; color: var(--slate3); }

  /* ── amount ── */
  .amount-cell { font-family: 'Fira Code', monospace; font-size: 13px; color: var(--slate); text-align: right; }
  .amount-cell.strong { font-weight: 500; color: var(--steel); }
  .amount-cell.zero { color: var(--slate4); }

  /* ── status badge ── */
  .s-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 6px;
    font-size: 10.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: .7px;
    border: 1px solid transparent;
  }
  .s-dot { width: 5px; height: 5px; border-radius: 50%; }
  .s-badge.paid     { background:var(--green-bg);  color:var(--green);  border-color:rgba(26,107,60,.18); }
  .s-badge.paid .s-dot     { background:var(--green); }
  .s-badge.partial  { background:var(--amber-bg);  color:var(--amber);  border-color:rgba(138,92,0,.18); }
  .s-badge.partial .s-dot  { background:var(--amber); }
  .s-badge.overdue  { background:var(--red-bg);    color:var(--red);    border-color:rgba(139,26,26,.18); }
  .s-badge.overdue .s-dot  { background:var(--red); animation:blink .8s ease infinite; }
  .s-badge.sent     { background:var(--violet-bg); color:var(--violet); border-color:rgba(74,58,138,.18); }
  .s-badge.sent .s-dot     { background:var(--violet); }
  .s-badge.draft    { background:var(--bg2);       color:var(--slate3); border-color:var(--line2); }
  .s-badge.draft .s-dot    { background:var(--slate4); }
  .s-badge.voided   { background:var(--red-bg);    color:var(--red);    border-color:rgba(139,26,26,.12); opacity:.6; }
  @keyframes blink { 0%,100%{opacity:1}50%{opacity:.25} }

  /* ── row action ── */
  .row-btn {
    width: 30px; height: 30px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: 1px solid transparent;
    color: var(--slate4); cursor: pointer; transition: all .15s;
  }
  .row-btn:hover { background:var(--bg2); border-color:var(--line2); color:var(--steel); }

  /* ── empty ── */
  .empty-wrap {
    display: flex; flex-direction: column; align-items: center;
    padding: 80px 32px; gap: 18px; text-align: center;
  }
  .empty-graphic {
    position: relative;
    width: 80px; height: 80px;
  }
  .empty-graphic-bg {
    width: 80px; height: 80px; border-radius: 22px;
    background: var(--steel-dim);
    border: 1px dashed var(--line3);
    display: flex; align-items: center; justify-content: center;
  }
  .empty-graphic-float {
    position: absolute; bottom: -6px; right: -6px;
    width: 30px; height: 30px; border-radius: 9px;
    background: var(--steel);
    display: flex; align-items: center; justify-content: center;
    box-shadow: var(--shadow-md);
  }
  .empty-title {
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 20px; font-weight: 800; color: var(--steel);
    letter-spacing: -.3px; margin: 0;
  }
  .empty-sub { font-size: 13px; color: var(--slate3); margin: 0; max-width: 280px; line-height: 1.5; }
  .empty-btn {
    display: inline-flex; align-items: center; gap: 7px;
    background: var(--steel); color: white;
    border: none; border-radius: 10px;
    padding: 10px 20px;
    font-family: 'Cabinet Grotesk', sans-serif;
    font-size: 13px; font-weight: 700;
    cursor: pointer; margin-top: 4px;
    transition: all .2s; box-shadow: var(--shadow-sm);
  }
  .empty-btn:hover { background:var(--steel2); box-shadow:var(--shadow-md); }

  /* ── spinner ── */
  .spin-wrap { display:flex; align-items:center; justify-content:center; padding:72px; }
  .spinner {
    width:30px; height:30px;
    border: 2.5px solid var(--line3);
    border-top-color: var(--steel3);
    border-radius:50%;
    animation: spin .7s linear infinite;
  }
  @keyframes spin { to{transform:rotate(360deg)} }

  /* ══════════════
     MODAL
  ══════════════ */
  .overlay {
    position:fixed; inset:0; z-index:9999;
    background:rgba(14,28,50,.6);
    backdrop-filter:blur(8px);
    display:flex; align-items:center; justify-content:center;
    padding:24px;
    animation: ovIn .18s ease;
  }
  @keyframes ovIn { from{opacity:0} to{opacity:1} }

  .modal {
    background: var(--surface);
    border-radius: 24px;
    width:100%; max-width:820px;
    max-height:88vh;
    overflow-y:auto;
    box-shadow:var(--shadow-lg);
    animation: modalIn .22s cubic-bezier(.22,.68,0,1.15);
    border: 1px solid var(--line2);
  }
  .modal.sm { max-width:660px; }
  @keyframes modalIn {
    from{opacity:0;transform:scale(.95) translateY(14px)}
    to  {opacity:1;transform:scale(1) translateY(0)}
  }
  .modal::-webkit-scrollbar{width:4px}
  .modal::-webkit-scrollbar-track{background:transparent}
  .modal::-webkit-scrollbar-thumb{background:var(--bg3);border-radius:4px}

  .m-head {
    padding:22px 26px 18px;
    border-bottom:1px solid var(--line);
    display:flex; align-items:center; justify-content:space-between;
    position:sticky; top:0; background:var(--surface); z-index:2;
    border-radius:24px 24px 0 0;
    background: linear-gradient(to bottom, var(--surface) 85%, transparent);
  }
  .m-head-left { display:flex; align-items:center; gap:14px; }
  .m-head-icon {
    width:40px; height:40px; border-radius:12px;
    background:var(--steel);
    display:flex; align-items:center; justify-content:center;
    box-shadow:var(--shadow-sm);
    position:relative; overflow:hidden;
  }
  .m-head-icon::before{
    content:'';position:absolute;inset:0;
    background:linear-gradient(135deg,rgba(255,255,255,.15),transparent 60%);
  }
  .m-head-text { display:flex; flex-direction:column; gap:2px; }
  .m-eyebrow {
    font-family:'Fira Code',monospace;
    font-size:10px; text-transform:uppercase; letter-spacing:1.8px;
    color:var(--steel3); font-weight:500;
  }
  .m-title {
    font-family:'Cabinet Grotesk',sans-serif;
    font-size:19px; font-weight:800; color:var(--steel);
    letter-spacing:-.3px; margin:0;
  }
  .m-close {
    width:32px;height:32px;border-radius:9px;
    background:var(--bg2);border:1px solid var(--line2);
    display:flex;align-items:center;justify-content:center;
    color:var(--slate3);cursor:pointer;transition:all .15s;
  }
  .m-close:hover{background:var(--bg3);color:var(--slate)}

  .m-body{padding:22px 26px;display:flex;flex-direction:column;gap:20px}

  /* form */
  .f-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px}
  .f-group{display:flex;flex-direction:column;gap:5px}
  .f-group.full{grid-column:1/-1}
  .f-label{font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.8px;color:var(--slate3)}
  .f-input,.f-select{
    background:var(--bg);
    border:1.5px solid var(--line2);
    border-radius:10px;
    padding:9px 12px;
    font-family:'Geist',sans-serif;
    font-size:13px;color:var(--slate);
    outline:none;
    transition:border-color .15s,box-shadow .15s,background .15s;
    width:100%;box-sizing:border-box;
  }
  .f-input:focus,.f-select:focus{
    border-color:var(--steel3);background:white;
    box-shadow:0 0 0 3px var(--steel-dim2);
  }
  .f-select{
    appearance:none;-webkit-appearance:none;cursor:pointer;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='11' height='11' viewBox='0 0 24 24' fill='none' stroke='%238A96A8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
    background-repeat:no-repeat;background-position:right 10px center;
    padding-right:30px;
  }

  /* line items */
  .li-section{display:flex;flex-direction:column;gap:10px}
  .li-head{display:flex;align-items:center;justify-content:space-between}
  .li-head-label{
    font-size:10px;font-weight:700;text-transform:uppercase;
    letter-spacing:1.2px;color:var(--slate3);
    display:flex;align-items:center;gap:6px;
  }
  .li-add-btn{
    display:flex;align-items:center;gap:4px;
    font-size:12px;font-weight:600;color:var(--steel3);
    background:none;border:none;cursor:pointer;
    padding:4px 9px;border-radius:7px;
    transition:background .15s;
  }
  .li-add-btn:hover{background:var(--steel-dim)}

  .li-table-wrap{
    border:1.5px solid var(--line2);border-radius:13px;overflow:hidden;
    box-shadow:var(--shadow-xs);
  }
  .li-table{width:100%;border-collapse:collapse}
  .li-table thead tr{background:var(--bg2);border-bottom:1.5px solid var(--line2)}
  .li-table thead th{
    padding:9px 11px;font-size:9.5px;font-weight:700;
    text-transform:uppercase;letter-spacing:1px;color:var(--slate3);text-align:left;
  }
  .li-table thead th.r{text-align:right}
  .li-table tbody tr{border-top:1px solid var(--line);background:var(--surface)}
  .li-table tbody tr:hover{background:var(--surface2)}
  .li-table td{padding:7px 9px;vertical-align:middle}

  .li-inp{
    background:var(--bg);
    border:1.5px solid transparent;border-radius:8px;
    padding:6px 9px;
    font-family:'Geist',sans-serif;font-size:12px;color:var(--slate);
    outline:none;transition:border-color .15s,background .15s;
    width:100%;box-sizing:border-box;
  }
  .li-inp:focus{border-color:var(--steel3);background:white;box-shadow:0 0 0 2px var(--steel-dim2)}
  .li-inp.mono{font-family:'Fira Code',monospace;text-align:right}
  .li-sel{
    background:var(--bg);border:1.5px solid transparent;
    border-radius:8px;padding:6px 9px;
    font-size:11px;color:var(--slate);outline:none;cursor:pointer;width:100%;
  }
  .li-sel:focus{border-color:var(--steel3)}
  .li-amount{font-family:'Fira Code',monospace;font-size:12px;font-weight:500;color:var(--steel);text-align:right}
  .li-del{
    width:26px;height:26px;border-radius:7px;
    display:flex;align-items:center;justify-content:center;
    background:transparent;border:1px solid transparent;
    color:var(--slate4);cursor:pointer;transition:all .15s;
  }
  .li-del:hover{background:var(--red-bg);border-color:rgba(139,26,26,.2);color:var(--red)}

  /* totals */
  .totals-row-wrap{display:flex;justify-content:flex-end}
  .totals-box{
    background:var(--bg);
    border:1.5px solid var(--line2);
    border-radius:14px;padding:16px 20px;
    min-width:270px;display:flex;flex-direction:column;gap:9px;
  }
  .t-row{display:flex;justify-content:space-between;align-items:center}
  .t-label{font-size:12px;color:var(--slate3)}
  .t-val{font-family:'Fira Code',monospace;font-size:12.5px;color:var(--slate)}
  .t-hr{height:1px;background:var(--line2)}
  .t-total .t-label{font-size:14px;font-weight:600;color:var(--steel)}
  .t-total .t-val{
    font-family:'Cabinet Grotesk',sans-serif;
    font-size:20px;font-weight:800;color:var(--steel);letter-spacing:-.3px;
  }

  /* actions */
  .f-actions{
    display:flex;align-items:center;justify-content:flex-end;gap:10px;
    border-top:1px solid var(--line);padding-top:8px;
  }
  .btn-cancel{
    background:none;border:1.5px solid var(--line2);border-radius:10px;
    padding:9px 16px;font-family:'Geist',sans-serif;font-size:13px;
    font-weight:500;color:var(--slate3);cursor:pointer;transition:all .15s;
  }
  .btn-cancel:hover{background:var(--bg2);border-color:var(--line3);color:var(--slate)}
  .btn-draft{
    display:inline-flex;align-items:center;gap:6px;
    background:var(--bg2);border:1.5px solid var(--line2);border-radius:10px;
    padding:9px 16px;font-family:'Geist',sans-serif;font-size:13px;
    font-weight:600;color:var(--slate2);cursor:pointer;transition:all .15s;
  }
  .btn-draft:hover{background:var(--bg3)}
  .btn-draft:disabled{opacity:.4;cursor:not-allowed}
  .btn-save{
    display:inline-flex;align-items:center;gap:7px;
    background:var(--steel);border:none;border-radius:10px;
    padding:9px 22px;font-family:'Cabinet Grotesk',sans-serif;
    font-size:13px;font-weight:700;color:white;
    cursor:pointer;box-shadow:var(--shadow-md);transition:all .2s;
    position:relative;overflow:hidden;
  }
  .btn-save::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,.1),transparent 55%)}
  .btn-save:hover{background:var(--steel2);transform:translateY(-1px);box-shadow:var(--shadow-lg)}
  .btn-save:disabled{opacity:.4;cursor:not-allowed;transform:none}

  /* view modal */
  .v-strip{
    background:var(--bg);
    border-bottom:1px solid var(--line2);
    padding:20px 26px;
  }
  .v-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}
  .v-meta-item{display:flex;flex-direction:column;gap:3px}
  .v-meta-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--slate3)}
  .v-meta-val{font-size:13px;font-weight:500;color:var(--slate)}
  .v-meta-val.mono{font-family:'Fira Code',monospace;font-size:12px}

  .v-items-table{width:100%;border-collapse:collapse}
  .v-items-table thead tr{background:var(--bg);border-bottom:1px solid var(--line2)}
  .v-items-table thead th{
    padding:9px 16px;font-size:9.5px;font-weight:700;
    text-transform:uppercase;letter-spacing:1px;color:var(--slate3);text-align:left;
  }
  .v-items-table thead th.r{text-align:right}
  .v-items-table tbody tr{border-bottom:1px solid var(--line)}
  .v-items-table tbody tr:last-child{border-bottom:none}
  .v-items-table td{padding:12px 16px;font-size:13px}
  .v-items-table td.mono{font-family:'Fira Code',monospace;font-size:12px}
  .v-items-table td.r{text-align:right}

  .v-totals{background:var(--bg);border-top:1.5px solid var(--line2)}
  .v-totals-inner{max-width:290px;margin-left:auto;padding:16px;display:flex;flex-direction:column;gap:9px}
  .vt-row{display:flex;justify-content:space-between;font-size:12px}
  .vt-lbl{color:var(--slate3)}
  .vt-val{font-family:'Fira Code',monospace;color:var(--slate)}
  .vt-hr{height:1px;background:var(--line2)}
  .vt-total .vt-lbl{font-size:14px;font-weight:700;color:var(--steel);font-family:'Cabinet Grotesk',sans-serif}
  .vt-total .vt-val{font-family:'Cabinet Grotesk',sans-serif;font-size:18px;font-weight:800;color:var(--steel)}
  .vt-paid .vt-val{color:var(--green)}
  .vt-bal .vt-lbl,.vt-bal .vt-val{color:var(--red);font-weight:600}
  .v-notes{padding:16px 26px;font-size:13px;color:var(--slate2);border-top:1px solid var(--line)}
  .v-notes-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--slate3);margin-bottom:5px}
`;

/* ─── helpers ─────────────────────────────────────────────── */
function newItem(): InvoiceItem {
  return { id: generateId(), description: '', quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, amount: 0, accountId: '' };
}

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

type BillStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'voided';

function StatusBadge({ status }: { status: string }) {
  const s = (status || 'draft') as BillStatus;
  return (
    <span className={`s-badge ${s}`}>
      <span className="s-dot" />
      {s}
    </span>
  );
}

const ALL_STATUSES: BillStatus[] = ['draft','sent','partial','paid','overdue','voided'];

/* ─── main ────────────────────────────────────────────────── */
export default function PurchasesPage() {
  const { user, company } = useAuth();
  const [bills, setBills] = useState<Invoice[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [viewBill, setViewBill] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const [form, setForm] = useState({
    contactId: '', date: new Date().toISOString().slice(0, 10),
    dueDate: '', notes: '', terms: 'Net 30', reference: '',
  });
  const [items, setItems] = useState<InvoiceItem[]>([newItem()]);

  if (!user) return null;
  const actor = { uid: user.uid, email: user.email, name: user.displayName };
  const cur = company?.currency;

  useEffect(() => {
    if (!user) return;
    getContacts(user.companyId).then(setContacts);
    getAccounts(user.companyId).then(setAccounts);
    const unsub = subscribeToInvoices(user.companyId, 'purchase', (data) => {
      setBills(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  useEffect(() => {
    const fn = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setShowForm(false); setViewBill(null); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, []);

  const updateItem = (id: string, key: keyof InvoiceItem, val: string | number) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const u = { ...item, [key]: val };
      u.amount = u.quantity * u.unitPrice * (1 - u.discount / 100);
      return u;
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
        companyId: user!.companyId, type: 'purchase',
        contactId: form.contactId, contactName: contact?.name ?? '',
        date: form.date, dueDate: form.dueDate, status, items,
        subtotal, taxAmount, discountAmount: 0, total,
        amountPaid: 0, balance: total,
        notes: form.notes, terms: form.terms,
        createdBy: user!.uid, updatedBy: user!.uid,
      }, actor);
      setShowForm(false);
      setForm({ contactId: '', date: new Date().toISOString().slice(0, 10), dueDate: '', notes: '', terms: 'Net 30', reference: '' });
      setItems([newItem()]);
    } finally { setSaving(false); }
  };

  const expenseAccounts = accounts.filter((a) => a.type === 'expense');
  const vendorContacts = contacts.filter((c) => c.type === 'vendor' || c.type !== 'customer');

  /* stats */
  const totalSpend    = bills.reduce((s, b) => s + b.total, 0);
  const outstanding   = bills.filter(b => ['sent','partial'].includes(b.status)).reduce((s, b) => s + b.balance, 0);
  const overdueCount  = bills.filter(b => b.status === 'overdue').length;
  const paidThisMonth = bills.filter(b => b.status === 'paid').reduce((s, b) => s + b.total, 0);

  /* filtered bills */
  const displayed = activeFilter === 'all' ? bills : bills.filter(b => b.status === activeFilter);

  /* filter counts */
  const counts: Record<string, number> = { all: bills.length };
  ALL_STATUSES.forEach(s => { counts[s] = bills.filter(b => b.status === s).length; });

  return (
    <AuthGuard>
      <style>{css}</style>
      <div className="pb-root">
        <div className="pb-page">

          {/* Header */}
          <div className="pb-header">
            <div className="pb-header-left">
              <div className="pb-logo">
                <Building2 size={22} color="white" />
              </div>
              <div className="pb-title-stack">
                <span className="pb-label">Finance · Purchases</span>
                <h1 className="pb-title">Purchase Bills</h1>
                <p className="pb-subtitle">Track and manage vendor bills &amp; payables</p>
              </div>
            </div>
            <button className="new-bill-btn" onClick={() => setShowForm(true)}>
              <Plus size={15} />
              New Bill
            </button>
          </div>

          {/* Stats */}
          <div className="stat-grid">
            <div className="stat-card"
              style={{ '--accent-bar': 'linear-gradient(90deg,#1E3A5F,#3D6AA0)', '--accent-glow': 'rgba(30,58,95,.15)' } as React.CSSProperties}>
              <div className="stat-top">
                <div className="stat-icon-box" style={{ background:'rgba(30,58,95,.10)', color:'var(--steel)' }}>
                  <TrendingDown size={16} />
                </div>
                <span className="stat-trend" style={{ background:'rgba(30,58,95,.08)', color:'var(--steel3)', borderColor:'rgba(30,58,95,.14)' }}>
                  total
                </span>
              </div>
              <div className="stat-label">Total Spend</div>
              <div className="stat-val" style={{ color:'var(--steel)' }}>{formatCurrency(totalSpend, cur)}</div>
              <div className="stat-sub">all time</div>
            </div>

            <div className="stat-card"
              style={{ '--accent-bar': 'linear-gradient(90deg,#8A5C00,#C48E1A)', '--accent-glow': 'rgba(138,92,0,.12)' } as React.CSSProperties}>
              <div className="stat-top">
                <div className="stat-icon-box" style={{ background:'var(--amber-bg)', color:'var(--amber)' }}>
                  <Clock size={16} />
                </div>
                <span className="stat-trend" style={{ background:'var(--amber-bg)', color:'var(--amber)', borderColor:'rgba(138,92,0,.2)' }}>
                  pending
                </span>
              </div>
              <div className="stat-label">Outstanding</div>
              <div className="stat-val" style={{ color:'var(--amber)' }}>{formatCurrency(outstanding, cur)}</div>
              <div className="stat-sub">awaiting payment</div>
            </div>

            <div className="stat-card"
              style={{ '--accent-bar': 'linear-gradient(90deg,#8B1A1A,#C43030)', '--accent-glow': 'rgba(139,26,26,.12)' } as React.CSSProperties}>
              <div className="stat-top">
                <div className="stat-icon-box" style={{ background:'var(--red-bg)', color:'var(--red)' }}>
                  <AlertCircle size={16} />
                </div>
                <span className="stat-trend" style={{ background:'var(--red-bg)', color:'var(--red)', borderColor:'rgba(139,26,26,.2)' }}>
                  urgent
                </span>
              </div>
              <div className="stat-label">Overdue</div>
              <div className="stat-val" style={{ color:'var(--red)' }}>{overdueCount}</div>
              <div className="stat-sub">{overdueCount === 1 ? 'bill' : 'bills'} past due</div>
            </div>

            <div className="stat-card"
              style={{ '--accent-bar': 'linear-gradient(90deg,#1A6B3C,#2E9E5C)', '--accent-glow': 'rgba(26,107,60,.10)' } as React.CSSProperties}>
              <div className="stat-top">
                <div className="stat-icon-box" style={{ background:'var(--green-bg)', color:'var(--green)' }}>
                  <CheckCircle2 size={16} />
                </div>
                <span className="stat-trend" style={{ background:'var(--green-bg)', color:'var(--green)', borderColor:'rgba(26,107,60,.2)' }}>
                  paid
                </span>
              </div>
              <div className="stat-label">Paid</div>
              <div className="stat-val" style={{ color:'var(--green)' }}>{formatCurrency(paidThisMonth, cur)}</div>
              <div className="stat-sub">settled bills</div>
            </div>
          </div>

          {/* Filter bar */}
          <div className="filter-bar">
            {(['all', ...ALL_STATUSES] as const).map((f) => (
              counts[f] > 0 || f === 'all' ? (
                <button
                  key={f}
                  className={`filter-chip${activeFilter === f ? ' active' : ''}`}
                  onClick={() => setActiveFilter(f)}
                >
                  {f === 'all' ? 'All bills' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="chip-count">{counts[f]}</span>
                </button>
              ) : null
            ))}
            <div className="filter-spacer" />
            <select className="sort-select">
              <option>Newest first</option>
              <option>Oldest first</option>
              <option>Highest amount</option>
              <option>Lowest amount</option>
            </select>
          </div>

          {/* Table */}
          <div className="table-card">
            <div className="table-top">
              <div className="table-top-left">
                <span className="table-heading">Bills</span>
                <span className="table-count">{displayed.length} {activeFilter !== 'all' ? activeFilter : ''}</span>
              </div>
            </div>

            {loading ? (
              <div className="spin-wrap"><div className="spinner" /></div>
            ) : displayed.length === 0 ? (
              <div className="empty-wrap">
                <div className="empty-graphic">
                  <div className="empty-graphic-bg">
                    <FileText size={30} color="var(--slate4)" />
                  </div>
                  <div className="empty-graphic-float">
                    <Plus size={14} color="white" />
                  </div>
                </div>
                <p className="empty-title">No bills yet</p>
                <p className="empty-sub">Record purchase bills from your vendors to track what you owe.</p>
                <button className="empty-btn" onClick={() => setShowForm(true)}>
                  <Plus size={14} /> Create your first bill
                </button>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="bills-table">
                  <thead>
                    <tr>
                      <th>Bill #</th>
                      <th>Vendor</th>
                      <th>Date</th>
                      <th>Due Date</th>
                      <th className="r">Total</th>
                      <th className="r">Balance</th>
                      <th>Status</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayed.map((bill, idx) => (
                      <tr key={bill.id} style={{ animationDelay: `${idx * 22}ms` }}>
                        <td><span className="bill-num">{bill.invoiceNumber}</span></td>
                        <td>
                          <div className="vendor-cell">
                            <div className="vendor-avatar">{initials(bill.contactName)}</div>
                            <div>
                              <div className="vendor-name">{bill.contactName}</div>
                              {bill.terms && <div className="vendor-ref">{bill.terms}</div>}
                            </div>
                          </div>
                        </td>
                        <td><span className="date-cell">{formatDate(bill.date)}</span></td>
                        <td><span className="date-cell">{formatDate(bill.dueDate)}</span></td>
                        <td><div className="amount-cell">{formatCurrency(bill.total, cur)}</div></td>
                        <td>
                          <div className={`amount-cell strong${bill.balance === 0 ? ' zero' : ''}`}>
                            {formatCurrency(bill.balance, cur)}
                          </div>
                        </td>
                        <td><StatusBadge status={bill.status} /></td>
                        <td>
                          <button className="row-btn" onClick={() => setViewBill(bill)} title="View bill">
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
          CREATE BILL MODAL
      ══════════════════════════════════════ */}
      {showForm && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false); }}>
          <div className="modal">
            <div className="m-head">
              <div className="m-head-left">
                <div className="m-head-icon"><Building2 size={18} color="white" /></div>
                <div className="m-head-text">
                  <span className="m-eyebrow">New purchase</span>
                  <h2 className="m-title">Create Bill</h2>
                </div>
              </div>
              <button className="m-close" onClick={() => setShowForm(false)}><X size={13} /></button>
            </div>

            <div className="m-body">
              <div className="f-grid">
                <div className="f-group full">
                  <label className="f-label">Vendor *</label>
                  <select className="f-select" value={form.contactId}
                    onChange={(e) => setForm(f => ({ ...f, contactId: e.target.value }))}>
                    <option value="">— Select vendor —</option>
                    {vendorContacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="f-group">
                  <label className="f-label">Bill Date</label>
                  <input type="date" className="f-input" value={form.date}
                    onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="f-group">
                  <label className="f-label">Due Date</label>
                  <input type="date" className="f-input" value={form.dueDate}
                    onChange={(e) => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
                <div className="f-group">
                  <label className="f-label">Vendor Reference</label>
                  <input className="f-input" placeholder="Vendor bill / PO number"
                    value={form.reference} onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))} />
                </div>
                <div className="f-group">
                  <label className="f-label">Payment Terms</label>
                  <input className="f-input" value={form.terms}
                    onChange={(e) => setForm(f => ({ ...f, terms: e.target.value }))} />
                </div>
              </div>

              {/* line items */}
              <div className="li-section">
                <div className="li-head">
                  <span className="li-head-label"><Package size={11} /> Line Items</span>
                  <button className="li-add-btn" onClick={() => setItems([...items, newItem()])}>
                    <Plus size={11} /> Add line
                  </button>
                </div>
                <div className="li-table-wrap">
                  <table className="li-table">
                    <thead>
                      <tr>
                        <th style={{ width:'34%' }}>Description</th>
                        <th style={{ width:'14%' }}>Expense Acct</th>
                        <th className="r" style={{ width:'8%' }}>Qty</th>
                        <th className="r" style={{ width:'14%' }}>Unit Cost</th>
                        <th className="r" style={{ width:'8%' }}>Tax %</th>
                        <th className="r" style={{ width:'15%' }}>Amount</th>
                        <th style={{ width:'7%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id}>
                          <td>
                            <input className="li-inp" placeholder="Item description"
                              value={item.description}
                              onChange={(e) => updateItem(item.id, 'description', e.target.value)} />
                          </td>
                          <td>
                            <select className="li-sel" value={item.accountId}
                              onChange={(e) => updateItem(item.id, 'accountId', e.target.value)}>
                              <option value="">—</option>
                              {expenseAccounts.map((a) => <option key={a.id} value={a.id}>{a.code}</option>)}
                            </select>
                          </td>
                          <td>
                            <input type="number" min="1" className="li-inp mono"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 1)} />
                          </td>
                          <td>
                            <input type="number" min="0" step="0.01" className="li-inp mono"
                              value={item.unitPrice}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td>
                            <input type="number" min="0" max="100" className="li-inp mono"
                              value={item.taxRate}
                              onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value) || 0)} />
                          </td>
                          <td><span className="li-amount">{formatCurrency(item.amount)}</span></td>
                          <td style={{ textAlign:'center' }}>
                            {items.length > 1 && (
                              <button className="li-del" onClick={() => setItems(items.filter(i => i.id !== item.id))}>
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
              <div className="totals-row-wrap">
                <div className="totals-box">
                  <div className="t-row"><span className="t-label">Subtotal</span><span className="t-val">{formatCurrency(subtotal, cur)}</span></div>
                  <div className="t-row"><span className="t-label">Tax</span><span className="t-val">{formatCurrency(taxAmount, cur)}</span></div>
                  <div className="t-hr" />
                  <div className="t-row t-total"><span className="t-label">Total</span><span className="t-val">{formatCurrency(total, cur)}</span></div>
                </div>
              </div>

              {/* notes */}
              <div className="f-group">
                <label className="f-label">Notes</label>
                <input className="f-input" placeholder="Internal notes or memo"
                  value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {/* actions */}
              <div className="f-actions">
                <button className="btn-cancel" onClick={() => setShowForm(false)}>Cancel</button>
                <button className="btn-draft" disabled={!form.contactId || saving}
                  onClick={() => handleSave('draft')}>
                  <Save size={13} />
                  {saving ? 'Saving…' : 'Save Draft'}
                </button>
                <button className="btn-save"
                  disabled={!form.contactId || items[0].amount === 0 || saving}
                  onClick={() => handleSave('sent')}>
                  <CheckCircle2 size={14} />
                  {saving ? 'Recording…' : 'Record Bill'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
          VIEW BILL MODAL
      ══════════════════════════════════════ */}
      {viewBill && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setViewBill(null); }}>
          <div className="modal sm">
            <div className="m-head">
              <div className="m-head-left">
                <div className="m-head-icon"><Receipt size={17} color="white" /></div>
                <div className="m-head-text">
                  <span className="m-eyebrow">Purchase Bill</span>
                  <h2 className="m-title">{viewBill.invoiceNumber}</h2>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <StatusBadge status={viewBill.status} />
                <button className="m-close" onClick={() => setViewBill(null)}><X size={13} /></button>
              </div>
            </div>

            <div className="v-strip">
              <div className="v-meta">
                <div className="v-meta-item">
                  <span className="v-meta-lbl">Vendor</span>
                  <span className="v-meta-val">{viewBill.contactName}</span>
                </div>
                <div className="v-meta-item">
                  <span className="v-meta-lbl">Bill Date</span>
                  <span className="v-meta-val mono">{formatDate(viewBill.date)}</span>
                </div>
                <div className="v-meta-item">
                  <span className="v-meta-lbl">Due Date</span>
                  <span className="v-meta-val mono">{formatDate(viewBill.dueDate)}</span>
                </div>
              </div>
            </div>

            <table className="v-items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th className="r">Qty</th>
                  <th className="r">Unit Cost</th>
                  <th className="r">Tax %</th>
                  <th className="r">Amount</th>
                </tr>
              </thead>
              <tbody>
                {viewBill.items.map((item) => (
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

            <div className="v-totals">
              <div className="v-totals-inner">
                <div className="vt-row"><span className="vt-lbl">Subtotal</span><span className="vt-val">{formatCurrency(viewBill.subtotal, cur)}</span></div>
                <div className="vt-row"><span className="vt-lbl">Tax</span><span className="vt-val">{formatCurrency(viewBill.taxAmount, cur)}</span></div>
                <div className="vt-hr" />
                <div className="vt-row vt-total"><span className="vt-lbl">Total</span><span className="vt-val">{formatCurrency(viewBill.total, cur)}</span></div>
                <div className="vt-row vt-paid"><span className="vt-lbl">Amount Paid</span><span className="vt-val">{formatCurrency(viewBill.amountPaid, cur)}</span></div>
                <div className="vt-hr" />
                <div className="vt-row vt-bal"><span className="vt-lbl">Balance Due</span><span className="vt-val">{formatCurrency(viewBill.balance, cur)}</span></div>
              </div>
            </div>

            {viewBill.notes && (
              <div className="v-notes">
                <div className="v-notes-lbl">Notes</div>
                {viewBill.notes}
              </div>
            )}
          </div>
        </div>
      )}
    </AuthGuard>
  );
}