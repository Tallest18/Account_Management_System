'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button, Input } from '@/components/ui';
import { Building2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try { await resetPassword(email); setSent(true); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[--bg] p-4">
      <div className="w-full max-w-md animate-slide-up">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[--accent] flex items-center justify-center mb-4"><Building2 className="w-7 h-7 text-white" /></div>
          <h1 className="text-2xl font-bold text-[--text]">Reset Password</h1>
        </div>
        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <p className="text-[--green] font-semibold mb-2">Email sent!</p>
              <p className="text-sm text-[--text-3] mb-5">Check your inbox for password reset instructions.</p>
              <Link href="/login" className="text-[--accent-2] hover:underline text-sm">Back to Sign In</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <p className="text-sm text-[--text-3]">Enter your email and we will send you a reset link.</p>
              <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" loading={loading} size="lg" className="w-full">Send Reset Link</Button>
            </form>
          )}
        </div>
        <p className="text-center text-sm text-[--text-3] mt-5">
          <Link href="/login" className="text-[--accent-2] hover:underline">← Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}
