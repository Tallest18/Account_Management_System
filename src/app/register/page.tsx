'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button, Input } from '@/components/ui';
import { Building2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    companyName: '', companyAddress: '', companyPhone: '', currency: 'USD',
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) { setStep(2); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setError(''); setLoading(true);
    try {
      await signUp(form.email, form.password, form.name, {
        name: form.companyName, address: form.companyAddress,
        phone: form.companyPhone, currency: form.currency,
        email: form.email, taxId: '', fiscalYearStart: '01-01',
      });
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg] p-4" style={{
      background: 'radial-gradient(ellipse at 40% 80%, rgba(167,139,250,0.06) 0%, transparent 60%), var(--bg)',
    }}>
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[--accent] flex items-center justify-center mb-4" style={{ boxShadow: '0 0 40px rgba(79,142,247,0.3)' }}>
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[--text]">LedgerFlow</h1>
          <p className="text-sm text-[--text-3] mt-1">Set up your accounting system</p>
        </div>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${s <= step ? 'bg-[--accent] text-white' : 'bg-[--bg-3] text-[--text-3] border border-[--border]'}`}>{s}</div>
              <span className={`text-xs ${s <= step ? 'text-[--text-2]' : 'text-[--text-3]'}`}>{s === 1 ? 'Company' : 'Account'}</span>
              {s < 2 && <div className={`flex-1 h-px ${step > s ? 'bg-[--accent]' : 'bg-[--border]'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[--red-bg] border border-[--red]/20 mb-5">
              <AlertCircle className="w-4 h-4 text-[--red] shrink-0" />
              <p className="text-sm text-[--red]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {step === 1 ? (
              <>
                <h2 className="text-base font-bold text-[--text] mb-1">Company Information</h2>
                <Input label="Company Name" placeholder="Acme Corp" value={form.companyName} onChange={set('companyName')} required />
                <Input label="Address" placeholder="123 Main St, City" value={form.companyAddress} onChange={set('companyAddress')} />
                <Input label="Phone" placeholder="+1 (555) 000-0000" value={form.companyPhone} onChange={set('companyPhone')} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-[--text-2] uppercase tracking-wide">Currency</label>
                  <select className="input-field" value={form.currency} onChange={set('currency')}>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="NGN">NGN — Nigerian Naira</option>
                    <option value="CAD">CAD — Canadian Dollar</option>
                    <option value="AUD">AUD — Australian Dollar</option>
                  </select>
                </div>
                <Button type="submit" size="lg" className="w-full mt-1">Continue →</Button>
              </>
            ) : (
              <>
                <h2 className="text-base font-bold text-[--text] mb-1">Admin Account</h2>
                <Input label="Full Name" placeholder="John Doe" value={form.name} onChange={set('name')} required />
                <Input label="Email" type="email" placeholder="john@acme.com" value={form.email} onChange={set('email')} required />
                <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
                <Input label="Confirm Password" type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} required />
                <div className="flex gap-3 mt-1">
                  <Button type="button" variant="secondary" size="lg" onClick={() => setStep(1)} className="flex-1">← Back</Button>
                  <Button type="submit" loading={loading} size="lg" className="flex-1">Create Account</Button>
                </div>
              </>
            )}
          </form>
        </div>

        <p className="text-center text-sm text-[--text-3] mt-5">
          Already have an account?{' '}
          <Link href="/login" className="text-[--accent-2] hover:underline font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
