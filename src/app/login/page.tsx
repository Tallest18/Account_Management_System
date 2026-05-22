'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button, Input } from '@/components/ui';
import { Building2, Lock, Mail, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('invalid-credential') || msg.includes('wrong-password')) {
        setError('Invalid email or password');
      } else if (msg.includes('too-many-requests')) {
        setError('Too many failed attempts. Try again later.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg] p-4" style={{
      background: 'radial-gradient(ellipse at 60% 20%, rgba(79,142,247,0.08) 0%, transparent 60%), var(--bg)',
    }}>
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[--accent] flex items-center justify-center mb-4 shadow-lg" style={{ boxShadow: '0 0 40px rgba(79,142,247,0.3)' }}>
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[--text]">LedgerFlow</h1>
          <p className="text-sm text-[--text-3] mt-1">Professional Accounting System</p>
        </div>

        {/* Card */}
        <div className="card p-8">
          <h2 className="text-lg font-bold text-[--text] mb-1">Welcome back</h2>
          <p className="text-sm text-[--text-3] mb-6">Sign in to your account</p>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-[--red-bg] border border-[--red]/20 mb-5">
              <AlertCircle className="w-4 h-4 text-[--red] shrink-0" />
              <p className="text-sm text-[--red]">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<Mail className="w-4 h-4" />}
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="w-4 h-4" />}
              required
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-[--accent-2] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" loading={loading} size="lg" className="w-full mt-1">
              Sign In
            </Button>
          </form>
        </div>

        <p className="text-center text-sm text-[--text-3] mt-5">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[--accent-2] hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
