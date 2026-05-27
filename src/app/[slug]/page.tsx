export const dynamic = 'force-static';

import { Metadata } from 'next';
import { api } from '@/services/api';
import UnifiedClientPage from './UnifiedClientPage';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return []; // Habilita o fallback estático em tempo de build para qualquer slug
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  try {
    const settings = await api.getSettings().catch(() => ({} as any));
    const host = settings?.appUrl || 'leads-cia-super.pages.dev';
    const protocol = host.startsWith('http') ? '' : 'https://';
    const siteUrl = host.startsWith('http') ? host : `${protocol}${host}`;
    const globalOgImageUrl = `${siteUrl}/api/img/og-logo`;

    // Tentar carregar Landing Page primeiro
    const lp = await api.getLandingPageBySlug(slug).catch(() => null);
    if (lp) {
      let ogImage = lp.config.logoUrl && lp.config.logoUrl !== 'none' ? lp.config.logoUrl : globalOgImageUrl;
      
      if (lp.config.logoUrl?.startsWith('data:image')) {
        ogImage = globalOgImageUrl;
      }

      if (ogImage.startsWith('/')) {
        ogImage = `${siteUrl}${ogImage}`;
      }

      return {
        title: lp.config.titulo || 'Leads Cia Super',
        description: lp.config.descricao || 'Página de captura profissional.',
        openGraph: {
          title: lp.config.titulo || 'Leads Cia Super',
          description: lp.config.descricao || 'Página de captura profissional.',
          images: [{ url: ogImage }],
        },
      };
    }

    // Se não for LP, tentar Bio Link
    const bio = await api.getBioLinkBySlug(slug).catch(() => null);
    if (bio) {
      let imageUrl = '';
      if (bio.avatarUrl?.startsWith('data:image')) {
        imageUrl = `${siteUrl}/api/bio-image/${bio.id}`;
      } else {
        imageUrl = bio.avatarUrl || globalOgImageUrl || `${siteUrl}/images/minimalist-bg.png`;
      }

      if (imageUrl.startsWith('/')) {
        imageUrl = `${siteUrl}${imageUrl}`;
      }

      return {
        title: `${bio.profileName} | Bio Link`,
        description: bio.bio || 'Confira meus links e redes sociais.',
        openGraph: {
          title: bio.profileName,
          description: bio.bio || 'Confira meus links e redes sociais.',
          images: [
            {
              url: imageUrl,
              width: 400,
              height: 400,
              alt: bio.profileName,
            }
          ],
          type: 'website',
        },
        twitter: {
          card: 'summary',
          title: bio.profileName,
          description: bio.bio,
          images: [imageUrl],
        }
      };
    }
  } catch (e) {
    console.error("Erro ao gerar metadados estáticos:", e);
  }

  return {
    title: 'Página de Captura | Leads Cia Super',
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  
  // Como agora compilamos a rota de forma estática para otimizar o bundle da Edge do Cloudflare,
  // os dados reais serão carregados de forma dinâmica no client-side a partir do slug.
  return <UnifiedClientPage slug={slug} initialData={null} />;
}
