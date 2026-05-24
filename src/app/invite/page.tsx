import { Suspense } from 'react';
import InvitePageContent from './InvitePageContent';

function LoadingFallback() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#06060e',
      color: '#f0ecf8',
      fontFamily: 'sans-serif',
      fontSize: 14,
    }}>
      Loading…
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <InvitePageContent />
    </Suspense>
  );
}