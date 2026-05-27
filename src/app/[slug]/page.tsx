export const runtime = 'edge';

import { Metadata } from 'next';
import { api } from '@/services/api';
import UnifiedClientPage from './UnifiedClientPage';
import { headers } from 'next/headers';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;

  const settings = await api.getSettings();
  
  const headerList = await headers();
  const host = headerList.get('host') || 'gerency-leads.vercel.app';
  const protocol = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');

  // URL da logo global de compartilhamento via API para melhor compatibilidade
  const globalOgImageUrl = `${protocol}://${host}/api/img/og-logo`;

  // Tentar carregar Landing Page primeiro
  const lp = await api.getLandingPageBySlug(slug);
  if (lp) {
    let ogImage = lp.config.logoUrl && lp.config.logoUrl !== 'none' ? lp.config.logoUrl : globalOgImageUrl;
    
    // Se for base64 da logo da LP, preferir usar a logo global de compartilhamento (via API)
    if (lp.config.logoUrl?.startsWith('data:image')) {
      ogImage = globalOgImageUrl;
    }

    if (ogImage.startsWith('/')) {
      ogImage = `${protocol}://${host}${ogImage}`;
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
  const bio = await api.getBioLinkBySlug(slug);
  if (bio) {
    const headerList = await headers();
    const host = headerList.get('host') || 'gerency-leads.vercel.app';
    const protocol = headerList.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    
    let imageUrl = '';
    if (bio.avatarUrl?.startsWith('data:image')) {
      imageUrl = `${protocol}://${host}/api/bio-image/${bio.id}`;
    } else {
      imageUrl = bio.avatarUrl || globalOgImageUrl || `${protocol}://${host}/images/minimalist-bg.png`;
    }

    // Garantir que a URL seja absoluta para o WhatsApp
    if (imageUrl.startsWith('/')) {
      imageUrl = `${protocol}://${host}${imageUrl}`;
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

  return {
    title: 'Página não encontrada | Leads Cia Super',
  };
}

export default async function Page({ params }: Props) {
  const { slug } = await params;
  
  // Otimização: Carregar dados iniciais no servidor para evitar loading no cliente
  let initialData = null;
  const lp = await api.getLandingPageBySlug(slug);
  if (lp) {
    initialData = { type: 'lp', content: lp };
  } else {
    const bio = await api.getBioLinkBySlug(slug);
    if (bio) {
      initialData = { type: 'bio', content: bio };
    }
  }

  return <UnifiedClientPage slug={slug} initialData={initialData} />;
}
