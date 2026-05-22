// ─── User & Auth ────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'accountant' | 'viewer';
  companyId: string;
  createdAt: string;
  lastLogin?: string;
  photoURL?: string;
  isActive: boolean;
}

// ─── Company ─────────────────────────────────────────────────────────────────
export interface Company {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  currency: string;
  fiscalYearStart: string; // MM-DD
  createdAt: string;
  logo?: string;
}

// ─── Chart of Accounts ───────────────────────────────────────────────────────
export type AccountType = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
export type AccountCategory =
  | 'current_asset' | 'fixed_asset' | 'other_asset'
  | 'current_liability' | 'long_term_liability'
  | 'equity'
  | 'revenue' | 'other_revenue'
  | 'cogs' | 'operating_expense' | 'other_expense';

export interface Account {
  id: string;
  companyId: string;
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  description?: string;
  parentId?: string;
  isActive: boolean;
  balance: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ─── Journal Entry ───────────────────────────────────────────────────────────
export type TransactionStatus = 'draft' | 'posted' | 'voided';

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  description: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  companyId: string;
  entryNumber: string;
  date: string;
  description: string;
  reference?: string;
  type: 'general' | 'invoice' | 'payment' | 'receipt' | 'adjustment' | 'opening';
  status: TransactionStatus;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  attachments?: string[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  postedAt?: string;
  postedBy?: string;
  voidedAt?: string;
  voidedBy?: string;
  voidReason?: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────────────
export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid' | 'overdue' | 'voided';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  amount: number;
  accountId: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  invoiceNumber: string;
  type: 'sales' | 'purchase';
  contactId: string;
  contactName: string;
  date: string;
  dueDate: string;
  status: InvoiceStatus;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  total: number;
  amountPaid: number;
  balance: number;
  notes?: string;
  terms?: string;
  journalEntryId?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

// ─── Contact ─────────────────────────────────────────────────────────────────
export interface Contact {
  id: string;
  companyId: string;
  type: 'customer' | 'vendor' | 'both';
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  taxId?: string;
  accountId?: string;
  balance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ─── Payment ─────────────────────────────────────────────────────────────────
export interface Payment {
  id: string;
  companyId: string;
  paymentNumber: string;
  type: 'received' | 'made';
  contactId: string;
  contactName: string;
  invoiceId?: string;
  invoiceNumber?: string;
  date: string;
  amount: number;
  method: 'cash' | 'bank_transfer' | 'check' | 'card' | 'other';
  reference?: string;
  accountId: string;
  accountName: string;
  journalEntryId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ─── Audit Log ───────────────────────────────────────────────────────────────
export type AuditAction =
  | 'login' | 'logout' | 'login_failed'
  | 'create' | 'update' | 'delete' | 'view'
  | 'post' | 'void' | 'approve'
  | 'export' | 'import' | 'print'
  | 'settings_change' | 'password_change' | 'role_change';

export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userEmail: string;
  userName: string;
  action: AuditAction;
  module: string;
  entityId?: string;
  entityType?: string;
  description: string;
  changes?: FieldChange[];
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface FieldChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

// ─── Dashboard / Reports ─────────────────────────────────────────────────────
export interface DashboardStats {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
  revenueChange: number;
  expensesChange: number;
  netIncomeChange: number;
  cashChange: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  value2?: number;
}

export interface TrialBalanceRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  debitBalance: number;
  creditBalance: number;
}

export interface PnLRow {
  accountId: string;
  accountCode: string;
  accountName: string;
  amount: number;
  period: string;
}

// ─── Pagination & Filters ────────────────────────────────────────────────────
export interface PaginationParams {
  page: number;
  limit: number;
  total: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface TransactionFilter {
  dateRange?: DateRange;
  status?: TransactionStatus;
  type?: string;
  accountId?: string;
  search?: string;
}
