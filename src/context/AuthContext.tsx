'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUser, createUser } from '@/lib/db';
import { createAuditLog } from '@/lib/audit';
import { User, Company } from '@/types';
import { getCompany } from '@/lib/db';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  company: Company | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, companyData: Partial<Company>) => Promise<void>;
  logOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (current: string, next: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback(async (fbUser: FirebaseUser) => {
    const userData = await getUser(fbUser.uid);
    if (userData) {
      setUser(userData);
      if (userData.companyId) {
        const companyData = await getCompany(userData.companyId);
        setCompany(companyData);
      }
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        await loadUserData(fbUser);
      } else {
        setUser(null);
        setCompany(null);
      }
      setLoading(false);
    });
    return unsub;
  }, [loadUserData]);

  const signIn = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const userData = await getUser(cred.user.uid);
      if (!userData) throw new Error('User profile not found');
      if (!userData.isActive) throw new Error('Account is deactivated');

      // Update last login
      const { updateDoc, doc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase');
      await updateDoc(doc(db, 'users', cred.user.uid), {
        lastLogin: new Date().toISOString(),
      });

      await createAuditLog({
        userId: cred.user.uid,
        userEmail: cred.user.email!,
        userName: userData.displayName,
        companyId: userData.companyId,
        action: 'login',
        module: 'Auth',
        description: `User ${cred.user.email} logged in`,
        severity: 'info',
      });
    } catch (err) {
      // Log failed attempt
      try {
        await createAuditLog({
          userId: 'anonymous',
          userEmail: email,
          userName: 'Unknown',
          companyId: 'unknown',
          action: 'login_failed',
          module: 'Auth',
          description: `Failed login attempt for ${email}`,
          severity: 'warning',
        });
      } catch {}
      throw err;
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    companyData: Partial<Company>
  ) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: name });

    // Create company first
    const { addDoc, collection, doc, setDoc } = await import('firebase/firestore');
    const { db } = await import('@/lib/firebase');
    const now = new Date().toISOString();

    const companyRef = await addDoc(collection(db, 'companies'), {
      ...companyData,
      createdAt: now,
    });

    const newUser: User = {
      uid: cred.user.uid,
      email,
      displayName: name,
      role: 'admin',
      companyId: companyRef.id,
      createdAt: now,
      lastLogin: now,
      isActive: true,
    };

    await createUser(newUser);

    // Seed default chart of accounts
    await seedDefaultAccounts(companyRef.id, cred.user.uid, email, name);

    await createAuditLog({
      userId: cred.user.uid,
      userEmail: email,
      userName: name,
      companyId: companyRef.id,
      action: 'create',
      module: 'Auth',
      description: `New account created for ${email}`,
      severity: 'info',
    });
  };

  const logOut = async () => {
    if (user) {
      await createAuditLog({
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        companyId: user.companyId,
        action: 'logout',
        module: 'Auth',
        description: `User ${user.email} logged out`,
        severity: 'info',
      });
    }
    await signOut(auth);
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const changePassword = async (current: string, next: string) => {
    if (!firebaseUser || !user) throw new Error('Not authenticated');
    const credential = EmailAuthProvider.credential(firebaseUser.email!, current);
    await reauthenticateWithCredential(firebaseUser, credential);
    await updatePassword(firebaseUser, next);
    await createAuditLog({
      userId: user.uid,
      userEmail: user.email,
      userName: user.displayName,
      companyId: user.companyId,
      action: 'password_change',
      module: 'Auth',
      description: `User ${user.email} changed password`,
      severity: 'warning',
    });
  };

  const refreshUser = async () => {
    if (firebaseUser) await loadUserData(firebaseUser);
  };

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, company, loading, signIn, signUp, logOut, resetPassword, changePassword, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

// ─── Seed default chart of accounts ─────────────────────────────────────────
async function seedDefaultAccounts(
  companyId: string,
  userId: string,
  email: string,
  name: string
) {
  const { addDoc, collection } = await import('firebase/firestore');
  const { db } = await import('@/lib/firebase');
  const now = new Date().toISOString();

  const defaultAccounts = [
    // Assets
    { code: '1000', name: 'Cash and Cash Equivalents', type: 'asset', category: 'current_asset' },
    { code: '1010', name: 'Checking Account', type: 'asset', category: 'current_asset' },
    { code: '1020', name: 'Savings Account', type: 'asset', category: 'current_asset' },
    { code: '1100', name: 'Accounts Receivable', type: 'asset', category: 'current_asset' },
    { code: '1200', name: 'Inventory', type: 'asset', category: 'current_asset' },
    { code: '1300', name: 'Prepaid Expenses', type: 'asset', category: 'current_asset' },
    { code: '1500', name: 'Property and Equipment', type: 'asset', category: 'fixed_asset' },
    { code: '1510', name: 'Accumulated Depreciation', type: 'asset', category: 'fixed_asset' },
    // Liabilities
    { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'current_liability' },
    { code: '2100', name: 'Accrued Liabilities', type: 'liability', category: 'current_liability' },
    { code: '2200', name: 'Short-term Loans', type: 'liability', category: 'current_liability' },
    { code: '2500', name: 'Long-term Debt', type: 'liability', category: 'long_term_liability' },
    // Equity
    { code: '3000', name: 'Owner\'s Equity', type: 'equity', category: 'equity' },
    { code: '3100', name: 'Retained Earnings', type: 'equity', category: 'equity' },
    { code: '3200', name: 'Common Stock', type: 'equity', category: 'equity' },
    // Revenue
    { code: '4000', name: 'Sales Revenue', type: 'revenue', category: 'revenue' },
    { code: '4100', name: 'Service Revenue', type: 'revenue', category: 'revenue' },
    { code: '4200', name: 'Other Income', type: 'revenue', category: 'other_revenue' },
    // COGS
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'cogs' },
    // Expenses
    { code: '6000', name: 'Salaries and Wages', type: 'expense', category: 'operating_expense' },
    { code: '6100', name: 'Rent Expense', type: 'expense', category: 'operating_expense' },
    { code: '6200', name: 'Utilities Expense', type: 'expense', category: 'operating_expense' },
    { code: '6300', name: 'Marketing and Advertising', type: 'expense', category: 'operating_expense' },
    { code: '6400', name: 'Office Supplies', type: 'expense', category: 'operating_expense' },
    { code: '6500', name: 'Depreciation Expense', type: 'expense', category: 'operating_expense' },
    { code: '6600', name: 'Insurance Expense', type: 'expense', category: 'operating_expense' },
    { code: '6700', name: 'Professional Fees', type: 'expense', category: 'operating_expense' },
    { code: '6800', name: 'Bank Charges', type: 'expense', category: 'operating_expense' },
    { code: '6900', name: 'Miscellaneous Expense', type: 'expense', category: 'other_expense' },
    { code: '7000', name: 'Interest Expense', type: 'expense', category: 'other_expense' },
    { code: '7100', name: 'Tax Expense', type: 'expense', category: 'other_expense' },
  ];

  for (const acct of defaultAccounts) {
    await addDoc(collection(db, 'accounts'), {
      ...acct,
      companyId,
      balance: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
    });
  }
}
