'use client';

import { useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function RedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const slug = searchParams.get('slug') || '';

  useEffect(() => {
    if (slug) {
      router.replace(`/${slug}`);
    } else {
      router.replace('/');
    }
  }, [slug, router]);

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      background: '#f8fafc',
      fontFamily: 'sans-serif' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #e2e8f0', 
          borderTopColor: '#4f46e5', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite',
          margin: '0 auto 1rem'
        }}></div>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Redirecionando...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}

export default function RedirectPage() {
  return (
    <Suspense fallback={
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        background: '#f8fafc',
        fontFamily: 'sans-serif' 
      }}>
        <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Carregando...</p>
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}
