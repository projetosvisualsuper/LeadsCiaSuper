'use client';

export const runtime = 'edge';

import { useParams } from 'next/navigation';
import { Suspense } from 'react';
import UnifiedClientPage from '../view/UnifiedClientPage';

function SlugContent() {
  const params = useParams();
  const slug = (params?.slug as string) || '';

  return <UnifiedClientPage slug={slug} initialData={null} />;
}

export default function SlugPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            background: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontFamily: 'sans-serif',
          }}
        >
          Carregando...
        </div>
      }
    >
      <SlugContent />
    </Suspense>
  );
}
