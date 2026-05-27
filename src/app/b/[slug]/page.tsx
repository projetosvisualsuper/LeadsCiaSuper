'use client';

export const runtime = 'edge';


import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function BioRedirect() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  useEffect(() => {
    if (slug) {
      router.replace(`/${slug}`);
    }
  }, [slug, router]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ width: '40px', height: '40px', border: '4px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
