'use client';

import { useSearchParams } from 'next/navigation';
import UnifiedClientPage from './UnifiedClientPage';
import { Suspense } from 'react';

function ViewContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') || '';
  
  return <UnifiedClientPage slug={slug} initialData={null} />;
}

export default function ViewPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Carregando...</div>}>
      <ViewContent />
    </Suspense>
  );
}
