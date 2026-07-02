'use client';

import { useState, useEffect, Suspense } from 'react';
import { api } from '@/services/api';
import { Lead, LandingPageInstance, BioLink, Settings } from '@/types/crm';
import { CheckCircle2, ChevronRight, Check, Calendar, MessageCircle, X, User, Smartphone, Globe, ShoppingCart, Share2, Link as LinkIcon, Star, ChevronLeft, Copy, Mail } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { sendEmailBrevoAction } from '@/app/actions/brevo';

// --- HELPERS ---
const DEFAULT_BGS: Record<string, string> = {
  'professional': '/images/sales-bg.png',
  'lead-magnet': '/images/catalog-bg.png',
  'minimalist': '/images/minimalist-bg.png',
  'vsl': '/images/vsl-bg.png',
  'event': 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&q=80',
  'coupon': '/images/coupon-bg.png',
  'offers': '/images/sales-bg.png'
};

const getEmbedUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let id = '';
    if (url.includes('v=')) {
      id = url.split('v=')[1]?.split('&')[0];
    } else {
      id = url.split('/').pop()?.split('?')[0] || '';
    }
    return `https://www.youtube.com/embed/${id}?autoplay=0&rel=0`;
  }
  if (url.includes('vimeo.com')) {
    const id = url.split('/').pop();
    return `https://player.vimeo.com/video/${id}`;
  }
  return url;
};

const getContrastColor = (hexColor: string) => {
  if (!hexColor || hexColor === 'transparent') return 'white';
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#1e3a8a' : 'white';
};

const renderBioSocialIcon = (platform: string, size: number = 24, color?: string) => {
  const svgPaths: Record<string, string> = {
    instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c.796 0 1.441.645 1.441 1.44s-.645 1.44-1.441 1.44c-.795 0-1.439-.645-1.439-1.44s.644-1.44 1.439-1.44z",
    facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
    whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
    youtube: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
    tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14.99.13 2.02.74 2.82.55.75 1.4 1.25 2.33 1.35.93.09 1.88-.16 2.58-.79.77-.69 1.09-1.76 1.09-2.77.01-4.13.01-8.26.01-12.39z",
    linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.208 24 24 23.227 24 22.271V1.729C24 .774 23.208 0 22.225 0z",
    twitter: "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z",
    shopee: "M12 0L2.1 4.5v15L12 24l9.9-4.5v-15L12 0zm0 2.2l7.7 3.5v12.6L12 21.8 4.3 18.3V5.7l7.7-3.5z",
    threads: "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z",
    pinterest: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.259 7.929-7.259 4.162 0 7.398 2.966 7.398 6.931 0 4.135-2.607 7.462-6.223 7.462-1.215 0-2.358-.63-2.75-1.378l-.748 2.853c-.271 1.031-1.002 2.324-1.492 3.121 1.12.332 2.299.512 3.527.512 6.621 0 11.988-5.367 11.988-11.987S18.638 0 12.017 0z"
  };

  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill={color || "currentColor"} style={{ display: 'block' }}>
      <path d={svgPaths[platform] || svgPaths.instagram} />
    </svg>
  );
};

const renderLinkIcon = (iconName: string, size: number = 24) => {
  switch (iconName) {
    case 'smartphone': return <Smartphone size={size} />;
    case 'globe': return <Globe size={size} />;
    case 'shopping-cart': return <ShoppingCart size={size} />;
    case 'link': return <LinkIcon size={size} />;
    case 'star': return <Star size={size} />;
    case 'message-circle': return renderBioSocialIcon('whatsapp', size);
    default: return <Globe size={size} />;
  }
};

const getBioYoutubeEmbed = (url: string) => {
  if (!url) return null;
  let videoId = '';
  if (url.includes('youtube.com/watch?v=')) {
    videoId = url.split('v=')[1]?.split('&')[0];
  } else if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('embed/')[1]?.split('?')[0];
  } else if (url.includes('youtube.com/shorts/')) {
    videoId = url.split('shorts/')[1]?.split('?')[0];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
};

const AutoCarousel = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!images || images.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <div style={{ position: 'relative', width: '100%', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
      <div style={{ 
        display: 'flex', 
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
        transform: `translateX(-${currentIndex * 100}%)`,
      }}>
        {images.map((img, idx) => (
          <div key={idx} style={{ width: '100%', flexShrink: 0, aspectRatio: '1/1', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={img} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} alt="Carousel" />
          </div>
        ))}
      </div>
      {images.length > 1 && (
        <div style={{ position: 'absolute', bottom: '15px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '8px' }}>
          {images.map((_, idx) => (
            <div 
              key={idx} 
              style={{ 
                width: idx === currentIndex ? '24px' : '8px', 
                height: '8px', 
                borderRadius: '4px', 
                background: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease'
              }} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

// --- RENDERIZADORES ---
function RenderBioLink({ bio }: { bio: BioLink }) {
  const handleItemClick = () => {
    if (bio && bio.id) {
      api.incrementBioClick(bio.id).catch(err => console.error("Erro ao contar clique:", err));
    }
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: bio.theme.backgroundType === 'gradient' ? bio.theme.backgroundGradient : bio.theme.background, 
      color: bio.theme.textColor,
      fontFamily: `'Inter', sans-serif`,
      padding: '3rem 1.5rem'
    }}>
      <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            width: '120px', height: '120px', borderRadius: '50%', margin: '0 auto 1.5rem', 
            overflow: 'hidden', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <img 
              src={bio.avatarUrl || 'https://via.placeholder.com/100'} 
              style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} 
              alt={bio.profileName}
            />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: bio.theme.textColor }}>{bio.profileName}</h1>
          <p style={{ fontSize: '1rem', opacity: 0.8, lineHeight: 1.5, color: bio.theme.textColor }}>{bio.bio}</p>
        </div>



        <div style={{ display: 'grid', gap: '1.25rem' }}>
          {bio.items.filter(item => item.isActive).map(item => {
            if (item.type === 'video') {
              const embed = getBioYoutubeEmbed(item.videoUrl || '');
              return (
                <div key={item.id} style={{ borderRadius: '20px', overflow: 'hidden', background: bio.theme.buttonBackground, padding: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', border: `3px solid ${bio.theme.buttonBackground}` }}>
                  <div style={{ borderRadius: '16px', overflow: 'hidden', background: '#000', position: 'relative', width: '100%', paddingBottom: '56.25%', height: 0 }}>
                    {embed ? (
                      <iframe 
                        src={embed} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: '0', borderRadius: '16px' }}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                        allowFullScreen referrerPolicy="strict-origin-when-cross-origin"
                      ></iframe>
                    ) : null}
                  </div>
                  {item.title && <div style={{ padding: '0.5rem', fontSize: '0.8rem', fontWeight: 500, color: bio.theme.cardTextColor || bio.theme.textColor, textAlign: 'center', opacity: 0.8 }}>{item.title}</div>}
                </div>
              );
            }
            if (item.type === 'image') {
              return (
                <a key={item.id} href={item.url || '#'} target={item.url ? "_blank" : "_self"} style={{ textDecoration: 'none' }} onClick={handleItemClick}>
                  <div style={{ borderRadius: '20px', overflow: 'hidden', background: bio.theme.buttonBackground, padding: '8px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', transition: 'transform 0.2s', border: `3px solid ${bio.theme.buttonBackground}` }} onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}>
                    <div style={{ borderRadius: '16px', overflow: 'hidden' }}>
                      <img src={item.imageUrl} style={{ width: '100%', display: 'block', borderRadius: '16px' }} alt={item.title} />
                    </div>
                  </div>
                </a>
              );
            }
            if (item.type === 'carousel') {
              return (
                <div key={item.id} style={{ width: '100%', marginBottom: '0.5rem' }}>
                  {item.title && <div style={{ fontSize: '0.95rem', fontWeight: 800, color: bio.theme.textColor, textAlign: 'center', marginBottom: '0.75rem', opacity: 0.8 }}>{item.title}</div>}
                  <AutoCarousel images={item.carouselImages || []} />
                </div>
              );
            }
            if (item.type === 'header') {
              return (
                <div key={item.id} style={{ padding: '1.5rem 0 0.5rem', fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7, color: bio.theme.textColor }}>{item.title}</div>
              );
            }
            const cardBg = item.type === 'product' ? bio.theme.cardBackground : (item.buttonColor || bio.theme.buttonBackground);
            const cardTextColor = item.type === 'product' ? (bio.theme.cardTextColor || bio.theme.textColor) : (item.buttonTextColor || bio.theme.buttonTextColor);
            return (
              <a 
                key={item.id} href={item.url} target="_blank" rel="noopener noreferrer" onClick={handleItemClick}
                style={{ 
                  textDecoration: 'none', color: cardTextColor, background: cardBg, borderRadius: '20px', 
                  padding: item.type === 'product' ? '1.25rem' : '1.1rem 1.5rem', display: 'flex', alignItems: 'center', 
                  justifyContent: item.type === 'product' ? 'flex-start' : 'center', fontWeight: 600, fontSize: '1rem', 
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.08)', transition: 'transform 0.2s', overflow: 'hidden'
                }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-3px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {item.type === 'product' ? (
                  <div style={{ display: 'flex', width: '100%', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ width: '110px', height: '110px', flexShrink: 0, borderRadius: '14px', overflow: 'hidden', background: '#f1f5f9' }}>
                      <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={item.title} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      <div>
                        <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>{item.title}</h3>
                        {item.subtitle && <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.2rem 0 0', fontWeight: 400 }}>{item.subtitle}</p>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '1.1rem', fontWeight: 900 }}>{item.price}</span>
                        <div style={{ background: item.buttonColor || '#000', color: item.buttonTextColor || '#fff', padding: '0.4rem 1rem', borderRadius: '30px', fontSize: '0.75rem', fontWeight: 700 }}>{item.buttonText || 'Comprar'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {renderLinkIcon(item.icon || 'link', 22)}
                    <span>{item.title}</span>
                  </div>
                )}
              </a>
            );
          })}
        </div>

        <footer style={{ marginTop: '4rem', paddingBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
            {bio.socials.map(social => (
              <a 
                key={social.platform} href={social.url} target="_blank" rel="noopener noreferrer"
                style={{ color: 'inherit', transition: 'transform 0.2s' }}
                onMouseOver={e => e.currentTarget.style.transform = 'scale(1.2)'}
                onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                onClick={handleItemClick}
              >
                {renderBioSocialIcon(social.platform, 28, bio.theme.socialIconColor || bio.theme.textColor)}
              </a>
            ))}
          </div>
          {bio.footerLogoUrl && <img src={bio.footerLogoUrl} style={{ height: '45px', objectFit: 'contain', margin: '0 auto', display: 'block' }} alt="Logo" />}
        </footer>
      </div>
    </div>
  );
}

// --- LANDING PAGE COMPONENTS ---
function CaptureForm({ config, templateId, onSubmit }: { config: any, templateId?: string, onSubmit: any }) {
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '', empresa: '', captchaInput: '', consentimento: false, catalogType: 'compacto' });
  const [captcha, setCaptcha] = useState({ a: 0, b: 0, sum: 0 });

  useEffect(() => {
    const a = Math.floor(Math.random() * 10);
    const b = Math.floor(Math.random() * 10);
    setCaptcha({ a, b, sum: a + b });
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const needsCaptcha = templateId !== 'lead-magnet' || formData.catalogType !== 'completo';
    if (needsCaptcha && parseInt(formData.captchaInput) !== captcha.sum) { alert("Soma incorreta!"); return; }
    if (!formData.consentimento) { alert("Aceite os termos!"); return; }
    onSubmit(formData);
  };

  const isLight = (hex: string) => {
    if (!hex || hex === 'transparent') return true;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 > 128;
  };

  const isLightBackground = isLight(config.formColor || '#4285F4');
  const textColor = isLightBackground ? '#1e293b' : 'white';
  const btnTextColor = getContrastColor(config.botaoColor || '#fbbf24');
  const inputBg = isLightBackground ? '#f8fafc' : 'white';

  return (
    <div className="lp-form-container" style={{ background: config.formColor || '#4285F4', color: textColor, padding: '2rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.85rem', fontWeight: 700, marginBottom: '0.4rem', color: textColor }}>{config.formTitulo}</h2>
        <p style={{ fontSize: '0.9rem', opacity: 0.9, color: textColor }}>{config.formSubtitulo}</p>
      </div>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.85rem' }}>
        <div style={{ display: 'grid', gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Nome*</label><input required style={{ width: '100%', height: '42px', borderRadius: '8px', border: isLightBackground ? '1px solid #cbd5e1' : 'none', padding: '0 1rem', fontSize: '0.95rem', background: inputBg, color: '#1e293b' }} value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} /></div>
        <div style={{ display: 'grid', gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Email*</label><input required type="email" style={{ width: '100%', height: '42px', borderRadius: '8px', border: isLightBackground ? '1px solid #cbd5e1' : 'none', padding: '0 1rem', fontSize: '0.95rem', background: inputBg, color: '#1e293b' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
        <div className="form-grid-2" style={{ gap: '0.85rem' }}>
          <div style={{ display: 'grid', gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Celular*</label><input required style={{ width: '100%', height: '42px', borderRadius: '8px', border: isLightBackground ? '1px solid #cbd5e1' : 'none', padding: '0 1rem', fontSize: '0.95rem', background: inputBg, color: '#1e293b' }} placeholder="(00) 00000-0000" value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} /></div>
          {(templateId !== 'lead-magnet' || formData.catalogType !== 'completo') && (
            <div style={{ display: 'grid', gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Empresa</label><input style={{ width: '100%', height: '42px', borderRadius: '8px', border: isLightBackground ? '1px solid #cbd5e1' : 'none', padding: '0 1rem', fontSize: '0.95rem', background: inputBg, color: '#1e293b' }} value={formData.empresa} onChange={e => setFormData({...formData, empresa: e.target.value})} /></div>
          )}
        </div>
        {(templateId !== 'lead-magnet' || formData.catalogType !== 'completo') && (
          <div style={{ display: 'grid', gap: '0.3rem' }}><label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Quanto é {captcha.a} + {captcha.b}?</label><input required={templateId !== 'lead-magnet' || formData.catalogType !== 'completo'} style={{ width: '100%', height: '42px', borderRadius: '8px', border: isLightBackground ? '1px solid #cbd5e1' : 'none', padding: '0 1rem', fontSize: '0.95rem', background: inputBg, color: '#1e293b' }} placeholder="Resultado da soma" value={formData.captchaInput} onChange={e => setFormData({...formData, captchaInput: e.target.value})} /></div>
        )}

        {templateId === 'lead-magnet' && (
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '0.5rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'block', opacity: 0.8 }}>Qual catálogo deseja receber?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div 
                onClick={() => setFormData({...formData, catalogType: 'compacto'})}
                style={{ 
                  padding: '0.75rem', 
                  borderRadius: '8px', 
                  border: formData.catalogType === 'compacto' ? `2px solid ${config.botaoColor || '#fbbf24'}` : '1px solid rgba(255,255,255,0.2)',
                  background: formData.catalogType === 'compacto' ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Catálogo Compacto</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Visualizar em PDF</div>
              </div>
              <div 
                onClick={() => setFormData({...formData, catalogType: 'completo'})}
                style={{ 
                  padding: '0.5rem', 
                  borderRadius: '8px', 
                  border: formData.catalogType === 'completo' ? `2px solid ${config.botaoColor || '#fbbf24'}` : '1px solid rgba(255,255,255,0.2)',
                  background: formData.catalogType === 'completo' ? 'rgba(251, 191, 36, 0.1)' : 'transparent',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Catálogo Completo</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Acesso Online</div>
              </div>
            </div>
          </div>
        )}
        <label style={{ display: 'flex', gap: '0.5rem', cursor: 'pointer', fontSize: '0.75rem', color: textColor }}><input type="checkbox" style={{ width: '16px', height: '16px' }} checked={formData.consentimento} onChange={e => setFormData({...formData, consentimento: e.target.checked})} /><span>Concordo com as comunicações de marketing (LGPD).</span></label>
        <button type="submit" style={{ height: '52px', marginTop: '1rem', borderRadius: '12px', background: config.botaoColor || '#fbbf24', color: btnTextColor, fontWeight: 700, fontSize: '1.1rem', width: '100%', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          {templateId === 'lead-magnet' 
            ? (formData.catalogType === 'compacto' ? 'Baixar catálogo agora' : 'Acessar catálogo') 
            : (config.botaoTexto || 'Falar com um consultor')} 
          <ChevronRight size={20} />
        </button>
      </form>
    </div>
  );
}

function WhatsappWidget({ config, pageSlug }: { config: any, pageSlug: string }) {
  const [open, setOpen] = useState(false);
  const [selectedAttendant, setSelectedAttendant] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', telefone: '' });

  if (!config?.enabled || !config?.atendentes?.length) return null;

  const handleStartChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const leadId = Math.random().toString(36).substr(2, 9);
    await api.saveLead({ id: leadId, nome: formData.nome, email: formData.email, celular: formData.telefone, origem: `WhatsApp (${pageSlug})`, consentimentoLGPD: true, status: 'novo', tags: ['whatsapp'], dataCriacao: new Date().toISOString() } as Lead);
    
    // GTM Event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'whatsapp_click',
        attendant_name: selectedAttendant.nome,
        attendant_id: selectedAttendant.id,
        page_source: pageSlug,
        lead_name: formData.nome,
        lead_email: formData.email,
        lead_phone: formData.telefone,
        email: formData.email,
        phone: formData.telefone
      });
    }

    const msg = encodeURIComponent(`Olá ${selectedAttendant.nome}, vim pelo site e gostaria de falar com você.`);
    window.open(`https://wa.me/${selectedAttendant.telefone.replace(/\D/g, '')}?text=${msg}`, '_blank');
    setOpen(false); setShowForm(false); setSelectedAttendant(null); setFormData({ nome: '', email: '', telefone: '' });
  };

  return (
    <div style={{ 
      position: 'fixed', 
      bottom: '2rem', 
      [config.posicao || 'right']: '2rem', 
      zIndex: 9999,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      alignItems: config.posicao === 'left' ? 'flex-start' : 'flex-end',
      justifyContent: 'flex-end'
    }}>
       {open && (
         <div style={{ width: '350px', background: 'white', borderRadius: '16px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', overflow: 'hidden', color: '#1e293b', pointerEvents: 'auto', marginBottom: '1rem' }}>
            <div style={{ background: '#25D366', padding: '1.5rem', color: 'white' }}><h3 style={{ fontWeight: 700 }}>Iniciar Conversa</h3><p style={{ fontSize: '0.85rem' }}>Escolha um atendente para falar agora.</p></div>
            <div style={{ padding: '1rem' }}>
               {!showForm ? config.atendentes.map((at: any) => (
                    <div key={at.id} onClick={() => { setSelectedAttendant(at); setShowForm(true); }} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderRadius: '12px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                       <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f1f5f9', overflow: 'hidden' }}>{at.avatarUrl ? <img src={at.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={24} color="#94a3b8" />}</div>
                       <div style={{ flex: 1 }}><h4 style={{ fontWeight: 700, color: '#1e293b' }}>{at.nome}</h4><p style={{ fontSize: '0.75rem', color: '#64748b' }}>{at.cargo}</p></div>
                       {renderBioSocialIcon('whatsapp', 18, "#25D366")}
                    </div>
                 )) : (
                  <form onSubmit={handleStartChat} style={{ padding: '0.5rem' }}>
                    <p style={{ fontSize: '0.85rem', textAlign: 'center', marginBottom: '1rem' }}>Falar com <strong>{selectedAttendant.nome}</strong></p>
                    <div style={{ display: 'grid', gap: '1rem' }}>
                       <input required placeholder="Seu Nome" style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 1rem' }} value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} />
                       <input required type="email" placeholder="Seu Email" style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 1rem' }} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                       <input required placeholder="Seu WhatsApp" style={{ width: '100%', height: '42px', borderRadius: '8px', border: '1px solid #e2e8f0', padding: '0 1rem' }} value={formData.telefone} onChange={e => setFormData({...formData, telefone: e.target.value})} />
                       <button type="submit" style={{ width: '100%', height: '48px', borderRadius: '8px', background: '#25D366', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>Começar Conversa</button>
                       <button type="button" onClick={() => { setShowForm(false); setSelectedAttendant(null); }} style={{ width: '100%', height: '42px', borderRadius: '8px', background: 'transparent', color: '#64748b', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                         <ChevronLeft size={16} /> Voltar para atendentes
                       </button>
                    </div>
                  </form>
               )}
            </div>
         </div>
       )}
       <button onClick={() => setOpen(!open)} style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#25D366', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', position: 'relative', zIndex: 10000, pointerEvents: 'auto' }}>
         {open ? <X size={32} /> : renderBioSocialIcon('whatsapp', 32, 'white')}
       </button>
    </div>
  );
}

function RenderLandingPage({ page }: { page: LandingPageInstance }) {
  const searchParams = useSearchParams();
  const [submitted, setSubmitted] = useState(false);
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<Settings | null>(null);
  const [copying, setCopying] = useState(false);
  const config = page?.config || {} as any;

  // Atualização forçada de subtítulo se for o antigo
  if (page.templateId === 'professional' && config.formSubtitulo === 'Preencha o formulário e um consultor entrará em contato.') {
    config.formSubtitulo = 'Preencha o formulário para falar com um consultor';
  }

  useEffect(() => {
    api.getSettings().then(setGlobalSettings);
  }, []);

  const handleCopyCoupon = () => {
    if (!config.couponCode) return;
    navigator.clipboard.writeText(config.couponCode);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const handleFinalAction = (catalogType?: string) => {
    const actionType = config.formActionType;
    const actionUrl = config.formActionUrl || config.downloadFileUrl;

    // Lógica inteligente para o Catálogo (Lead Magnet)
    if (page.templateId === 'lead-magnet' && catalogType) {
      if (catalogType === 'compacto') {
        setSubmitted(true);
        return;
      } else if (catalogType === 'completo' && config.formActionUrl) {
        window.location.href = config.formActionUrl;
        return;
      }
    }

    if (actionType === 'redirect' && actionUrl) {
      window.location.href = actionUrl;
      return;
    }

    if (actionType === 'download' && actionUrl) {
      const link = document.createElement('a');
      link.href = actionUrl;
      link.download = '';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setSubmitted(true);
    setShowCouponModal(false);
  };

  const handleFormSubmit = async (formData: any) => {
    const tags: string[] = [page.slug];
    if (page.templateId === 'lead-magnet' && formData.catalogType) {
      tags.push(formData.catalogType === 'compacto' ? 'PDF' : 'online');
    }
    if (page.templateId === 'offers') {
      tags.push('ofertas');
    }
    if (page.templateId === 'coupon' || config.couponCode) {
      tags.push('cupom captura');
    }

    let observacoes = '';
    if (page.templateId === 'lead-magnet' && formData.catalogType) {
      observacoes = `[ESCOLHA] Interessado no catálogo ${formData.catalogType}.`;
    } else if (page.templateId === 'offers') {
      observacoes = `[INTERESSE] Inscrito na lista de ofertas exclusivas.`;
    }

    const newLead: Lead = {
      id: Math.random().toString(36).substr(2, 9), nome: formData.nome, email: formData.email, celular: formData.telefone, empresa: formData.empresa,
      origem: page.slug, dataCriacao: new Date().toISOString(), status: 'novo', tags: tags, consentimentoLGPD: true, utm_source: searchParams.get('utm_source') || undefined,
      observacoes: observacoes
    };
    try {
      await api.saveLead(newLead);
    } catch (err: any) {
      alert("Erro ao salvar lead: " + err.message);
      console.error(err);
    }
    api.incrementLandingPageClick(page.id).catch(err => console.error("Erro ao contar captura LP:", err));

    // GTM Event
    if (typeof window !== 'undefined' && (window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: 'generate_lead',
        lead_source: page.slug,
        lead_type: page.templateId,
        lead_name: formData.nome,
        lead_email: formData.email,
        lead_phone: formData.telefone,
        email: formData.email,
        phone: formData.telefone
      });
    }

    // Enviar e-mail de cupom se configurado
    const shouldSendEmail = config.sendCouponEmail !== false;
    if (page.templateId === 'coupon') {
      if (!config.couponCode) {
        console.warn("Cupom não configurado na página. E-mail não enviado.");
      } else if (!shouldSendEmail) {
        console.warn("Envio de e-mail desativado nas configurações da página.");
      } else {
        try {
          const settings = globalSettings || await api.getSettings();
          if (!settings?.brevoApiKey) {
            console.warn("Chave do Brevo não configurada no painel de configurações gerais.");
            alert("Aviso: Chave de integração com Brevo não encontrada. O e-mail não foi enviado.");
          } else {
            const html = `
              <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 12px;">
                <h2 style="color: #4f46e5; text-align: center;">Seu Cupom Chegou! 🎁</h2>
                <p>Olá <strong>${formData.nome || 'Cliente'}</strong>,</p>
                <p>Parabéns! Você acaba de resgatar seu cupom de desconto exclusivo da <strong>${settings.remetenteNome || 'nossa loja'}</strong>.</p>
                <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #cbd5e1;">
                  <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e293b;">${config.couponCode}</span>
                </div>
                <p>Queremos oferecer a você um desconto especial. Use o código: <strong>${config.couponCode}</strong> e aplique o cupom para obter seu desconto exclusivo!</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p style="font-size: 12px; color: #64748b; text-align: center;">Este e-mail foi enviado automaticamente após seu cadastro em nossa página de captura.</p>
              </div>
            `;
            
            const res = await fetch('/api/brevo/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                to: [{ email: formData.email, name: formData.nome || 'Cliente' }],
                subject: `🎁 Seu Cupom de Desconto: ${config.couponCode}`,
                htmlContent: html
              })
            });
            const data = await res.json();

            if (!data.success) {
              alert("Aviso do Sistema: Erro ao disparar o e-mail pelo Brevo: " + data.message);
              console.error("Brevo Error:", data);
            }
          }
        } catch (err: any) {
          alert("Aviso do Sistema: Erro de rede ao tentar disparar e-mail: " + err.message);
          console.error("Erro ao enviar e-mail de cupom:", err);
        }
      }
    }

    if (page.templateId === 'coupon' && config.couponCode) {
      setShowCouponModal(true);
      return;
    }

    handleFinalAction(formData.catalogType);
  };

  const CouponModal = () => (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999, backdropFilter: 'blur(8px)', padding: '1.5rem' }}>
       <div className="card" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: '2.5rem 2rem', background: 'white', color: '#1e293b', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', borderRadius: '24px' }}>
          <div style={{ width: '80px', height: '80px', background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
             <CheckCircle2 size={48} />
          </div>
          <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: '#1e293b' }}>Sucesso!</h2>
          <p style={{ opacity: 1, marginBottom: '2rem', fontSize: '1.15rem', color: '#475569', lineHeight: 1.5 }}>Seu cadastro foi realizado e seu cupom de desconto foi liberado.</p>
          
          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '2px dashed #e2e8f0', marginBottom: '1.5rem', position: 'relative' }}>
             <div style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6, marginBottom: '0.5rem', letterSpacing: '0.5px', color: '#64748b' }}>Código do Cupom</div>
             <div style={{ fontSize: '2.5rem', fontWeight: 900, letterSpacing: '2px', color: '#1e3a8a' }}>{config.couponCode}</div>
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <button onClick={handleCopyCoupon} style={{ width: '100%', height: '58px', borderRadius: '12px', background: '#1e293b', color: 'white', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', fontSize: '1.15rem' }}>
               {copying ? <><Check size={22} /> Copiado!</> : <><Copy size={22} /> Copiar Código</>}
            </button>
            <button onClick={() => handleFinalAction()} style={{ width: '100%', height: '64px', borderRadius: '12px', background: config.botaoColor || '#fbbf24', color: '#0f172a', fontWeight: 900, fontSize: '1.35rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Quero aproveitar!</button>
          </div>

          {config.sendCouponEmail && (
            <div style={{ marginTop: '1.5rem', fontSize: '0.95rem', fontWeight: 600, color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
               <Mail size={18} /> Enviamos uma cópia para seu e-mail
            </div>
          )}
       </div>
    </div>
  );

  let currentBg = config.backgroundUrl === 'none' ? '' : (config.backgroundUrl || DEFAULT_BGS[page.templateId] || DEFAULT_BGS.professional);
  if (currentBg && typeof currentBg === 'string' && (currentBg.includes('1456513080510') || currentBg.includes('default-catalog-bg.png'))) {
    currentBg = page.templateId === 'lead-magnet' ? '/images/catalog-bg.png' : '/images/sales-bg.png';
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', color: 'white', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '500px' }}>
          <CheckCircle2 size={64} style={{ color: '#10b981', margin: '0 auto' }} />
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '1.5rem' }}>Sucesso!</h2>
          <p style={{ opacity: 0.8, fontSize: '1.1rem' }}>{page.templateId === 'lead-magnet' ? 'Seu material já está disponível para download abaixo.' : 'Recebemos seus dados e entraremos em contato em breve.'}</p>
          {page.templateId === 'lead-magnet' && config.downloadFileUrl && (
            <a href={config.downloadFileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ marginTop: '2rem', display: 'inline-flex', padding: '1rem 2rem' }}>Baixar Material Agora</a>
          )}
        </div>
      </div>
    );
  }

  if (page.templateId === 'vsl') {
    return (
      <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ position: 'fixed', inset: 0, background: currentBg ? `url("${currentBg}") center/cover no-repeat fixed` : 'none', zIndex: -2 }} />
        <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(rgba(15, 23, 42, 0.9), rgba(15, 23, 42, 0.95))', zIndex: -1 }} />
        
        <div style={{ width: '100%', maxWidth: '900px', margin: '0 auto', padding: '4rem 1.5rem', textAlign: 'center' }}>
          <div style={{ marginBottom: '2.5rem' }}>
            {config.logoUrl && config.logoUrl !== 'none' ? <img src={config.logoUrl} style={{ maxHeight: '50px', margin: '0 auto' }} /> : <h1 style={{ fontSize: '1.5rem' }}>{config.titulo}</h1>}
          </div>

          <h2 style={{ fontSize: '2.75rem', fontWeight: 800, marginBottom: '1.5rem', lineHeight: 1.2 }}>
            {config.subtitulo} <span style={{ color: config.botaoColor || '#fbbf24' }}>{config.destaque}</span>
          </h2>
          
          <p style={{ fontSize: '1.1rem', opacity: 0.9, marginBottom: '2.5rem', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
            {config.descricao}
          </p>

          <div style={{ width: '100%', background: '#000', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: '4rem', border: '4px solid rgba(255,255,255,0.1)' }}>
            <iframe 
              src={getEmbedUrl(config.videoUrl || '')} 
              style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            />
          </div>

          <div id="vsl-form" style={{ maxWidth: '500px', margin: '0 auto' }}>
            <CaptureForm config={config} templateId={page.templateId} onSubmit={handleFormSubmit} />
          </div>
        </div>
        <div style={{ width: '100%', maxWidth: '900px', margin: '2rem auto 4rem', padding: '0 1.5rem', textAlign: 'center', opacity: 0.7 }}>
          <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: '2rem' }} />
          <p style={{ fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
            {config.footerText || 'Nós respeitamos sua privacidade e utilizamos seus dados apenas para as finalidades informadas.'}
          </p>
          {config.privacyPolicyUrl && (
            <a href={config.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontSize: '0.85rem', textDecoration: 'underline' }}>
              Política de Privacidade
            </a>
          )}
        </div>
        <WhatsappWidget config={config.whatsapp} pageSlug={page.slug} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', zIndex: 1, color: 'white' }}>
      <div style={{ position: 'fixed', inset: 0, background: currentBg ? `url("${currentBg}") center/cover no-repeat fixed` : 'none', zIndex: -2 }} />
      <div style={{ position: 'fixed', inset: 0, background: 'linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.85))', zIndex: -1 }} />
      <div className="lp-container">
        <div className="lp-grid">
          <div className="lp-content">
            <div className="lp-header-logo">{config.logoUrl && config.logoUrl !== 'none' ? <img src={config.logoUrl} style={{ maxHeight: '60px' }} /> : <h1>{config.titulo}</h1>}</div>
            <h2 className="lp-title">{config.subtitulo} <span style={{ color: config.botaoColor || '#fbbf24' }}>{config.destaque}</span></h2>
            <p className="lp-description">{config.descricao}</p>
            <div className="lp-benefits">{config.beneficios?.map((b: string, i: number) => (
              <div key={i} className="lp-benefit-item"><Check size={20} color="#10b981" /> {b}</div>
            ))}</div>
          </div>
          <div><CaptureForm config={config} templateId={page.templateId} onSubmit={handleFormSubmit} /></div>
        </div>
      </div>
      <div style={{ width: '100%', maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.5rem 4rem', textAlign: 'center', opacity: 0.6, position: 'relative', zIndex: 1 }}>
        <hr style={{ border: '0', borderTop: '1px solid rgba(255,255,255,0.1)', marginBottom: '1.5rem' }} />
        <p style={{ fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
          {config.footerText || 'Nós respeitamos sua privacidade e utilizamos seus dados apenas para as finalidades informadas.'}
        </p>
        {config.privacyPolicyUrl && (
          <a href={config.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', fontSize: '0.8rem', textDecoration: 'underline' }}>
            Política de Privacidade
          </a>
        )}
      </div>
      <WhatsappWidget config={config.whatsapp} pageSlug={page.slug} />
      {showCouponModal && <CouponModal />}
    </div>
  );
}

// --- PÁGINA DINÂMICA PRINCIPAL ---
export default function UnifiedClientPage({ slug, initialData }: { slug: string, initialData: any }) {
  const [data, setData] = useState<{ type: 'lp' | 'bio', content: any } | null>(initialData);
  const [loading, setLoading] = useState(!initialData);

  useEffect(() => {
    // Se temos dados iniciais (Bio Link), incrementamos a view
    if (initialData?.type === 'bio' && initialData.content?.id) {
      api.incrementBioView(initialData.content.id).catch(err => console.error("Erro ao contar view inicial:", err));
    } else if (initialData?.type === 'lp' && initialData.content?.id) {
      api.incrementLandingPageView(initialData.content.id).catch(err => console.error("Erro ao contar view inicial LP:", err));
    }

    if (initialData) return;

    const loadContent = async () => {
      const lp = await api.getLandingPageBySlug(slug);
      if (lp) {
        setData({ type: 'lp', content: lp });
        api.incrementLandingPageView(lp.id).catch(err => console.error("Erro ao contar view carregada LP:", err));
        setLoading(false);
        return;
      }

      const bio = await api.getBioLinkBySlug(slug);
      if (bio) {
        setData({ type: 'bio', content: bio });
        api.incrementBioView(bio.id).catch(err => console.error("Erro ao contar view carregada:", err));
        setLoading(false);
        return;
      }

      setLoading(false);
    };
    if (slug) loadContent();
  }, [slug, initialData]);

  if (loading) return <div style={{ minHeight: '100vh', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Carregando...</div>;
  
  if (!data) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#e2e8f0' }}>404</h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b' }}>Oops! Esta página não foi encontrada.</p>
        <a href="/" style={{ marginTop: '2rem', color: '#4f46e5', fontWeight: 600 }}>Voltar para o Início</a>
      </div>
    );
  }

  return (
    <Suspense fallback={<div />}>
      {data.type === 'lp' ? <RenderLandingPage page={data.content} /> : <RenderBioLink bio={data.content} />}
    </Suspense>
  );
}
