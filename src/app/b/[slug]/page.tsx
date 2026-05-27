export const dynamic = 'force-static';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return []; // Habilita compilação estática com fallback de rota no Cloudflare
}

export default async function BioRedirect({ params }: Props) {
  const { slug } = await params;
  
  return (
    <html>
      <head>
        <title>Redirecionando...</title>
        <meta httpEquiv="refresh" content={`0;url=/${slug}`} />
        <script dangerouslySetInnerHTML={{ 
          __html: `window.location.replace('/' + ${JSON.stringify(slug)})` 
        }} />
      </head>
      <body style={{ 
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
      </body>
    </html>
  );
}
