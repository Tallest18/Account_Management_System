'use client';
import { useState, useEffect, useCallback } from 'react';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { PageHeader } from '@/components/layout/AppLayout';
import { Button, Input, Select, Card, Badge } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { updateCompany, updateUser, getCompanyUsers } from '@/lib/db';
import { User } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { Settings, Building2, Lock, Users, Shield } from 'lucide-react';

export default function SettingsPage() {
  const { user, company, refreshUser, changePassword } = useAuth();
  const [tab, setTab] = useState<'company' | 'profile' | 'security' | 'users'>('company');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  const [companyForm, setCompanyForm] = useState({
    name: company?.name ?? '', address: company?.address ?? '',
    phone: company?.phone ?? '', email: company?.email ?? '',
    taxId: company?.taxId ?? '', currency: company?.currency ?? 'USD',
  });

  const [profileForm, setProfileForm] = useState({ displayName: user?.displayName ?? '' });
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const actor = { uid: user!.uid, email: user!.email, name: user!.displayName };

  useEffect(() => {
    if (tab === 'users' && user) {
      getCompanyUsers(user.companyId).then(setUsers);
    }
  }, [tab, user]);

  const saveCompany = async () => {
    setSaving(true);
    try {
      await updateCompany(user!.companyId, companyForm, actor);
      setSaved('Company settings saved.');
      await refreshUser();
    } finally { setSaving(false); setTimeout(() => setSaved(''), 3000); }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await updateUser(user!.uid, { displayName: profileForm.displayName }, actor, user!.companyId);
      await refreshUser();
      setSaved('Profile updated.');
    } finally { setSaving(false); setTimeout(() => setSaved(''), 3000); }
  };

  const savePassword = async () => {
    setPwError('');
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return; }
    if (pwForm.next.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setSaving(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      setSaved('Password changed successfully.');
    } catch (e: unknown) {
      setPwError(e instanceof Error ? e.message : 'Failed to change password');
    } finally { setSaving(false); setTimeout(() => setSaved(''), 3000); }
  };

  const changeRole = async (uid: string, role: User['role']) => {
    await updateUser(uid, { role }, actor, user!.companyId);
    setUsers((u) => u.map((x) => x.uid === uid ? { ...x, role } : x));
  };

  const tabs = [
    { id: 'company', label: 'Company', icon: <Building2 className="w-4 h-4" /> },
    { id: 'profile', label: 'Profile', icon: <Settings className="w-4 h-4" /> },
    { id: 'security', label: 'Security', icon: <Lock className="w-4 h-4" /> },
    { id: 'users', label: 'Users & Roles', icon: <Users className="w-4 h-4" /> },
  ] as const;

  return (
    <AuthGuard>
      <div className="p-6">
        <PageHeader title="Settings" subtitle="Manage your company and account preferences" />

        <div className="flex gap-6">
          {/* Sidebar tabs */}
          <aside className="w-48 shrink-0">
            <div className="card p-2 flex flex-col gap-0.5">
              {tabs.map((t) => (
                <button key={t.id} onClick={() => setTab(t.id as typeof tab)}
                  className={`nav-item ${tab === t.id ? 'active' : ''}`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <div className="flex-1 max-w-xl">
            {saved && (
              <div className="mb-4 p-3 rounded-xl bg-[--green-bg] border border-[--green]/20 text-sm text-[--green]">
                ✓ {saved}
              </div>
            )}

            {tab === 'company' && (
              <Card title="Company Information" subtitle="Displayed on invoices and reports">
                <div className="flex flex-col gap-4">
                  <Input label="Company Name" value={companyForm.name} onChange={(e) => setCompanyForm((f) => ({ ...f, name: e.target.value }))} />
                  <Input label="Business Email" type="email" value={companyForm.email} onChange={(e) => setCompanyForm((f) => ({ ...f, email: e.target.value }))} />
                  <Input label="Phone" value={companyForm.phone} onChange={(e) => setCompanyForm((f) => ({ ...f, phone: e.target.value }))} />
                  <Input label="Address" value={companyForm.address} onChange={(e) => setCompanyForm((f) => ({ ...f, address: e.target.value }))} />
                  <Input label="Tax ID / VAT Number" value={companyForm.taxId} onChange={(e) => setCompanyForm((f) => ({ ...f, taxId: e.target.value }))} />
                  <Select label="Default Currency" value={companyForm.currency}
                    onChange={(e) => setCompanyForm((f) => ({ ...f, currency: e.target.value }))}
                    options={[
                      { value: 'USD', label: 'USD — US Dollar' },
                      { value: 'EUR', label: 'EUR — Euro' },
                      { value: 'GBP', label: 'GBP — British Pound' },
                      { value: 'NGN', label: 'NGN — Nigerian Naira' },
                      { value: 'CAD', label: 'CAD — Canadian Dollar' },
                      { value: 'AUD', label: 'AUD — Australian Dollar' },
                      { value: 'JPY', label: 'JPY — Japanese Yen' },
                    ]} />
                  <Button loading={saving} onClick={saveCompany} className="self-start">Save Company Settings</Button>
                </div>
              </Card>
            )}

            {tab === 'profile' && (
              <Card title="Profile" subtitle="Your personal account information">
                <div className="flex flex-col gap-4">
                  <Input label="Full Name" value={profileForm.displayName} onChange={(e) => setProfileForm({ displayName: e.target.value })} />
                  <div>
                    <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wide">Email</label>
                    <p className="mt-1.5 text-sm text-[--text-3] p-3 bg-[--bg] rounded-lg border border-[--border]">{user?.email}</p>
                    <p className="text-xs text-[--text-3] mt-1">Email cannot be changed here.</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wide">Role</label>
                    <div className="mt-1.5"><Badge variant="purple" className="capitalize">{user?.role}</Badge></div>
                  </div>
                  <Button loading={saving} onClick={saveProfile} className="self-start">Update Profile</Button>
                </div>
              </Card>
            )}

            {tab === 'security' && (
              <Card title="Change Password" subtitle="Use a strong, unique password">
                <div className="flex flex-col gap-4">
                  {pwError && <p className="text-sm text-[--red] bg-[--red-bg] border border-[--red]/20 rounded-lg p-3">{pwError}</p>}
                  <Input label="Current Password" type="password" placeholder="••••••••" value={pwForm.current} onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))} />
                  <Input label="New Password" type="password" placeholder="Min 8 characters" value={pwForm.next} onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))} />
                  <Input label="Confirm New Password" type="password" placeholder="Repeat new password" value={pwForm.confirm} onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))} />
                  <div className="p-3 rounded-lg bg-[--bg] border border-[--border] text-xs text-[--text-3]">
                    <p className="font-semibold text-[--text-2] mb-1">Password requirements:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      <li>At least 8 characters</li>
                      <li>Mix of letters and numbers recommended</li>
                      <li>Avoid common passwords</li>
                    </ul>
                  </div>
                  <Button loading={saving} onClick={savePassword} disabled={!pwForm.current || !pwForm.next} className="self-start">
                    Change Password
                  </Button>
                </div>
              </Card>
            )}

            {tab === 'users' && (
              <Card title="Users & Roles" subtitle="Manage who can access your accounting system">
                <div className="flex flex-col gap-3">
                  {users.map((u) => (
                    <div key={u.uid} className="flex items-center justify-between p-3 rounded-xl bg-[--bg] border border-[--border]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[--accent-glow] border border-[--accent]/20 flex items-center justify-center">
                          <span className="text-xs font-bold text-[--accent-2]">{u.displayName?.[0]?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.displayName}</p>
                          <p className="text-xs text-[--text-3]">{u.email}</p>
                          {u.lastLogin && <p className="text-[10px] text-[--text-3]">Last login: {formatDateTime(u.lastLogin)}</p>}
                        </div>
                      </div>
                      {u.uid === user!.uid ? (
                        <Badge variant="purple" className="capitalize">{u.role}</Badge>
                      ) : (
                        <select className="input-field text-xs py-1.5 w-28" value={u.role}
                          onChange={(e) => changeRole(u.uid, e.target.value as User['role'])}>
                          <option value="admin" style={{ background: '#161b27' }}>Admin</option>
                          <option value="accountant" style={{ background: '#161b27' }}>Accountant</option>
                          <option value="viewer" style={{ background: '#161b27' }}>Viewer</option>
                        </select>
                      )}
                    </div>
                  ))}
                  <div className="p-3 rounded-xl bg-[--accent-glow] border border-[--accent]/20 text-xs text-[--text-2]">
                    <div className="flex items-center gap-2 mb-2 font-semibold text-[--accent-2]"><Shield className="w-3.5 h-3.5" />Role Permissions</div>
                    <p><strong>Admin:</strong> Full access — all modules, settings, user management</p>
                    <p><strong>Accountant:</strong> Create, edit, post transactions — no settings access</p>
                    <p><strong>Viewer:</strong> Read-only access to all data</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
