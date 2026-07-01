'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { BioLink, BioItem, BioSocial } from '@/types/crm';
import { 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  ExternalLink, 
  Settings as SettingsIcon, 
  Image as ImageIcon,
  Layout,
  Share2,
  ChevronRight,
  Eye,
  Globe,
  Smartphone,
  Save,
  X,
  ShoppingCart,
  MessageCircle,
  Star
} from 'lucide-react';

export default function BioLinksPage() {
  const [bios, setBios] = useState<BioLink[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentBio, setCurrentBio] = useState<BioLink | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'theme' | 'social'>('content');
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const refreshBios = async () => {
    const data = await api.getBioLinks();
    setBios(data);
  };

  useEffect(() => {
    refreshBios();
  }, []);

  const handleCreateNew = () => {
    const newBio: BioLink = {
      id: Math.random().toString(36).substr(2, 9),
      slug: '',
      profileName: 'Meu Nome / Empresa',
      bio: 'Breve descrição sobre o que você faz.',
      avatarUrl: '',
      socials: [],
      items: [],
      theme: {
        background: '#f8fafc',
        textColor: '#1e293b',
        cardTextColor: '#1e293b',
        socialIconColor: '#1e293b',
        buttonBackground: '#ffffff',
        buttonTextColor: '#1e293b',
        cardBackground: '#ffffff',
        fontFamily: 'Inter',
        style: 'flat'
      },
      dataCriacao: new Date().toISOString(),
      cliquesTotais: 0
    };
    setCurrentBio(newBio);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentBio) return;
    if (!currentBio.slug) {
      showNotification('Por favor, defina um link (slug) para seu perfil.', 'error');
      return;
    }

    try {
      // Comprensão em massa de todas as imagens antes de salvar para garantir que fique abaixo de 1MB
      const bioToSave = { ...currentBio };
      
      const uploadBase64Image = async (base64: string, filename = 'image.jpg'): Promise<string> => {
        const resBlob = await fetch(base64);
        const blob = await resBlob.blob();
        const file = new File([blob], filename, { type: blob.type });
        
        const formData = new FormData();
        formData.append('file', file);
        formData.append('chatId', 'bio');
        
        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!res.ok) throw new Error('Falha no upload da imagem');
        const data = await res.json();
        if (data.success && data.url) {
          return data.url;
        }
        throw new Error(data.error || 'Erro desconhecido no upload');
      };

      if (bioToSave.avatarUrl?.startsWith('data:image')) {
        const format = bioToSave.avatarUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
        const compressed = await compressImage(bioToSave.avatarUrl, 400, format);
        bioToSave.avatarUrl = await uploadBase64Image(compressed, `avatar-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`);
      }
      
      if (bioToSave.footerLogoUrl?.startsWith('data:image')) {
        const compressed = await compressImage(bioToSave.footerLogoUrl, 500, 'image/png');
        bioToSave.footerLogoUrl = await uploadBase64Image(compressed, `footer-${Date.now()}.png`);
      }

      bioToSave.items = await Promise.all(bioToSave.items.map(async item => {
        if (item.imageUrl?.startsWith('data:image')) {
          // Detectar se é PNG para manter transparência
          const format = item.imageUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
          const compressed = await compressImage(item.imageUrl, 700, format);
          const url = await uploadBase64Image(compressed, `item-${item.id}-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`);
          item = { ...item, imageUrl: url };
        }
        
        if (item.type === 'carousel' && item.carouselImages) {
          item.carouselImages = await Promise.all(item.carouselImages.map(async (img, idx) => {
            if (img.startsWith('data:image')) {
              const format = img.includes('image/png') ? 'image/png' : 'image/jpeg';
              const compressed = await compressImage(img, 700, format);
              return await uploadBase64Image(compressed, `carousel-${item.id}-${idx}-${Date.now()}.${format === 'image/png' ? 'png' : 'jpg'}`);
            }
            return img;
          }));
        }
        
        return item;
      }));

      await api.saveBioLink(bioToSave);
      await refreshBios();
      setIsEditing(false);
      setCurrentBio(null);
      showNotification('Perfil salvo com sucesso!');
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showNotification('Erro ao salvar perfil. Verifique se as imagens não são muito grandes.', 'error');
    }
  };

  const copyToClipboard = (slug: string) => {
    const url = `${window.location.origin}/${slug}`;
    navigator.clipboard.writeText(url);
    showNotification('Link copiado com sucesso!');
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este Link na Bio?')) {
      await api.deleteBioLink(id);
      await refreshBios();
    }
  };

  const addItem = (type: 'link' | 'product' | 'header' | 'video' | 'image' | 'carousel') => {
    if (!currentBio) return;
    const newItem: BioItem = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      title: type === 'header' ? 'Título da Seção' : (type === 'link' || type === 'product' ? 'Novo Link' : (type === 'carousel' ? 'Galeria de Produtos' : '')),
      url: '',
      isActive: true,
      price: type === 'product' ? 'R$ 0,00' : undefined,
      carouselImages: type === 'carousel' ? [] : undefined
    };
    setCurrentBio({
      ...currentBio,
      items: [...currentBio.items, newItem]
    });
  };

  const removeItem = (id: string) => {
    if (!currentBio) return;
    setCurrentBio({
      ...currentBio,
      items: currentBio.items.filter(item => item.id !== id)
    });
  };

  const updateItem = (id: string, updates: Partial<BioItem>) => {
    if (!currentBio) return;
    setCurrentBio({
      ...currentBio,
      items: currentBio.items.map(item => item.id === id ? { ...item, ...updates } : item)
    });
  };

  const addSocial = (platform: BioSocial['platform']) => {
    if (!currentBio) return;
    if (currentBio.socials.some(s => s.platform === platform)) return;
    setCurrentBio({
      ...currentBio,
      socials: [...currentBio.socials, { platform, url: '' }]
    });
  };

  const renderSocialIcon = (platform: string, size: number = 24, color?: string) => {
    const svgPaths: Record<string, string> = {
      instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c.796 0 1.441.645 1.441 1.44s-.645 1.44-1.441 1.44c-.795 0-1.439-.645-1.439-1.44s.644-1.44 1.439-1.44z",
      facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.469h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.469h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
      whatsapp: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z",
      youtube: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.377.505 9.377.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
      tiktok: "M12.525.02c1.31-.02 2.61-.01 3.91-.01.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.9-.32-1.98-.23-2.81.33-.85.51-1.44 1.43-1.58 2.41-.14.99.13 2.02.74 2.82.55.75 1.4 1.25 2.33 1.35.93.09 1.88-.16 2.58-.79.77-.69 1.09-1.76 1.09-2.77.01-4.13.01-8.26.01-12.39z",
      linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.454C23.208 24 24 23.227 24 22.271V1.729C24 .774 23.208 0 22.225 0z",
      twitter: "M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z",
      shopee: "M12 0L2.1 4.5v15L12 24l9.9-4.5v-15L12 0zm0 2.2l7.7 3.5v12.6L12 21.8 4.3 18.3V5.7l7.7-3.5z", // Simples placeholder Shopee
      threads: "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 0 1 3.02.142c-.126-.742-.375-1.332-.75-1.757-.513-.586-1.308-.883-2.359-.89h-.029c-.844 0-1.992.232-2.721 1.32L7.734 7.847c.98-1.454 2.568-2.256 4.478-2.256h.044c3.194.02 5.097 1.975 5.287 5.388.108.046.216.094.321.142 1.49.7 2.58 1.761 3.154 3.07.797 1.82.871 4.79-1.548 7.158-1.85 1.81-4.094 2.628-7.277 2.65Zm1.003-11.69c-.242 0-.487.007-.739.021-1.836.103-2.98.946-2.916 2.143.067 1.256 1.452 1.839 2.784 1.767 1.224-.065 2.818-.543 3.086-3.71a10.5 10.5 0 0 0-2.215-.221z",
      pinterest: "M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.965 1.406-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.259 7.929-7.259 4.162 0 7.398 2.966 7.398 6.931 0 4.135-2.607 7.462-6.223 7.462-1.215 0-2.358-.63-2.75-1.378l-.748 2.853c-.271 1.031-1.002 2.324-1.492 3.121 1.12.332 2.299.512 3.527.512 6.621 0 11.988-5.367 11.988-11.987S18.638 0 12.017 0z"
    };

    return (
      <svg 
        viewBox="0 0 24 24" 
        width={size} 
        height={size} 
        fill={color || "currentColor"} 
        style={{ display: 'block' }}
      >
        <path d={svgPaths[platform] || svgPaths.instagram} />
      </svg>
    );
  };

  const compressImage = (base64: string, maxWidth = 800, format = 'image/jpeg', addPadding = false): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // Se a imagem original for PNG e não pedirmos especificamente JPEG, mantemos PNG para transparência
        const finalFormat = (base64.includes('image/png') && format === 'image/jpeg') ? 'image/png' : format;

        if (addPadding) {
          const size = maxWidth;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            if (finalFormat !== 'image/png') {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, size, size);
            }
            const scale = (size * 0.9) / Math.max(img.width, img.height);
            const dw = img.width * scale;
            const dh = img.height * scale;
            const dx = (size - dw) / 2;
            const dy = (size - dh) / 2;
            ctx.drawImage(img, dx, dy, dw, dh);
          }
          resolve(canvas.toDataURL(finalFormat, 0.8));
          return;
        }

        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL(finalFormat, 0.8));
      };
    });
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      // Adicionar padding para não cortar no WhatsApp
      const compressed = await compressImage(reader.result as string, 400, 'image/jpeg', true);
      if (currentBio) setCurrentBio({ ...currentBio, avatarUrl: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleFooterLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentBio || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = async () => {
      // Usar PNG para manter a transparência da logo
      const compressed = await compressImage(reader.result as string, 500, 'image/png');
      setCurrentBio({ ...currentBio, footerLogoUrl: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleProductImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      const compressed = await compressImage(reader.result as string, 600);
      updateItem(id, { imageUrl: compressed });
    };
    reader.readAsDataURL(file);
  };

  const handleCarouselImageUpload = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const item = currentBio?.items.find(i => i.id === id);
    if (!item) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        // Detectar se é PNG
        const format = (reader.result as string).includes('image/png') ? 'image/png' : 'image/jpeg';
        const compressed = await compressImage(reader.result as string, 700, format);
        
        // Precisamos pegar o estado mais atual para evitar problemas com múltiplos uploads simultâneos
        setCurrentBio(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map(i => {
              if (i.id === id) {
                return { ...i, carouselImages: [...(i.carouselImages || []), compressed] };
              }
              return i;
            })
          };
        });
      };
      reader.readAsDataURL(file);
    });
  };

  const removeCarouselImage = (id: string, index: number) => {
    const item = currentBio?.items.find(i => i.id === id);
    if (!item || !item.carouselImages) return;
    const newImages = [...item.carouselImages];
    newImages.splice(index, 1);
    updateItem(id, { carouselImages: newImages });
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
      <div style={{ position: 'relative', width: '100%', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
        <div style={{ 
          display: 'flex', 
          transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)', 
          transform: `translateX(-${currentIndex * 100}%)`,
        }}>
          {images.map((img, idx) => (
            <div key={idx} style={{ width: '100%', flexShrink: 0, aspectRatio: '1/1' }}>
              <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Carousel" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div style={{ position: 'absolute', bottom: '10px', left: '0', right: '0', display: 'flex', justifyContent: 'center', gap: '4px' }}>
            {images.map((_, idx) => (
              <div 
                key={idx} 
                style={{ 
                  width: idx === currentIndex ? '12px' : '4px', 
                  height: '4px', 
                  borderRadius: '2px', 
                  background: idx === currentIndex ? 'white' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s ease'
                }} 
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const moveItem = (id: string, direction: 'up' | 'down') => {
    if (!currentBio) return;
    const index = currentBio.items.findIndex(item => item.id === id);
    if (index === -1) return;
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === currentBio.items.length - 1) return;

    const newItems = [...currentBio.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
    
    setCurrentBio({ ...currentBio, items: newItems });
  };

  const getYoutubeEmbed = (url: string) => {
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

  const removeSocial = (platform: string) => {
    if (!currentBio) return;
    setCurrentBio({
      ...currentBio,
      socials: currentBio.socials.filter(s => s.platform !== platform)
    });
  };

  if (isEditing && currentBio) {
    return (
      <div style={{ height: 'calc(100vh - 100px)', display: 'flex', gap: '2rem', position: 'relative' }}>
        {/* Notificação Toast */}
        {notification && (
          <div style={{ 
            position: 'fixed', 
            top: '2rem', 
            left: '50%', 
            transform: 'translateX(-50%)', 
            background: notification.type === 'success' ? '#10b981' : '#ef4444', 
            color: '#fff', 
            padding: '1rem 2rem', 
            borderRadius: '12px', 
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            animation: 'slideDown 0.3s ease-out',
            fontWeight: 600
          }}>
            {notification.type === 'success' ? <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>✓</div> : <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>!</div>}
            {notification.message}
            <style>{`
              @keyframes slideDown {
                from { transform: translate(-50%, -100%); opacity: 0; }
                to { transform: translate(-50%, 0); opacity: 1; }
              }
            `}</style>
          </div>
        )}

        {/* Painel de Edição */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '1rem' }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <button onClick={() => setIsEditing(false)} className="btn btn-outline" style={{ border: 'none', padding: 0 }}>
              <X size={24} />
            </button>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-primary" onClick={handleSave}>
                <Save size={18} /> Salvar Perfil
              </button>
            </div>
          </header>

          <section className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 600 }}>Informações do Perfil</h3>
            <div style={{ display: 'grid', gap: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Link do Perfil (Slug)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem 1rem', borderRadius: 'var(--radius)' }}>
                  <span style={{ opacity: 0.5 }}>gerencyleads.com/b/</span>
                  <input 
                    type="text" 
                    placeholder="seu-nome"
                    style={{ background: 'transparent', border: 'none', outline: 'none', flex: 1, fontWeight: 600 }}
                    value={currentBio.slug}
                    onChange={e => setCurrentBio({...currentBio, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {currentBio.avatarUrl ? <img src={currentBio.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={32} style={{ opacity: 0.3 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Foto de Perfil</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input 
                      type="file" 
                      id="avatar-upload" 
                      accept="image/*" 
                      hidden 
                      onChange={handleAvatarUpload} 
                    />
                    <input 
                      type="text" 
                      className="btn-outline" 
                      style={{ flex: 1, height: '40px', padding: '0 0.75rem' }}
                      placeholder="URL da foto ou faça upload"
                      value={currentBio.avatarUrl}
                      onChange={e => setCurrentBio({...currentBio, avatarUrl: e.target.value})}
                    />
                    <button className="btn btn-outline" onClick={() => document.getElementById('avatar-upload')?.click()}>
                      Upload
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Nome de Exibição</label>
                <input 
                  type="text" 
                  className="btn-outline" 
                  style={{ width: '100%', height: '40px', padding: '0 0.75rem' }}
                  value={currentBio.profileName}
                  onChange={e => setCurrentBio({...currentBio, profileName: e.target.value})}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Mini Bio</label>
                <textarea 
                  className="btn-outline" 
                  style={{ width: '100%', height: '80px', padding: '0.75rem' }}
                  value={currentBio.bio}
                  onChange={e => setCurrentBio({...currentBio, bio: e.target.value})}
                />
              </div>
            </div>
          </section>

          {/* Tabs de Conteúdo */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
            <button 
              onClick={() => setActiveTab('content')}
              style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'content' ? '2px solid var(--primary)' : 'none', color: activeTab === 'content' ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 'content' ? 600 : 400 }}
            >
              Conteúdo & Links
            </button>
            <button 
              onClick={() => setActiveTab('social')}
              style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'social' ? '2px solid var(--primary)' : 'none', color: activeTab === 'social' ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 'social' ? 600 : 400 }}
            >
              Redes Sociais
            </button>
            <button 
              onClick={() => setActiveTab('theme')}
              style={{ padding: '0.75rem 1rem', borderBottom: activeTab === 'theme' ? '2px solid var(--primary)' : 'none', color: activeTab === 'theme' ? 'var(--primary)' : 'inherit', fontWeight: activeTab === 'theme' ? 600 : 400 }}
            >
              Aparência
            </button>
          </div>

          {activeTab === 'content' && (
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => addItem('link')}>+ Link</button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => addItem('product')}>+ Produto</button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => addItem('carousel')}>+ Carrossel</button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => addItem('video')}>+ Vídeo</button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => addItem('image')}>+ Banner</button>
                <button className="btn btn-outline" style={{ flex: 1, minWidth: '120px' }} onClick={() => addItem('header')}>+ Divisor</button>
              </div>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {currentBio.items.map((item, idx) => (
                  <div key={item.id} className="card" style={{ padding: '1rem', border: '1px solid var(--border)', background: item.isActive ? 'white' : '#f8fafc', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <button onClick={() => moveItem(item.id, 'up')} style={{ padding: '2px', opacity: idx === 0 ? 0.2 : 0.5 }} disabled={idx === 0}>▲</button>
                          <button onClick={() => moveItem(item.id, 'down')} style={{ padding: '2px', opacity: idx === currentBio.items.length - 1 ? 0.2 : 0.5 }} disabled={idx === currentBio.items.length - 1}>▼</button>
                        </div>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', opacity: 0.5 }}>{item.type}</span>
                      </div>
                      <button onClick={() => removeItem(item.id)} style={{ color: 'var(--danger)', opacity: 0.5 }}><Trash2 size={16} /></button>
                    </div>

                    {item.type === 'video' && (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                         <input 
                          type="text" 
                          placeholder="Título do Vídeo (Opcional)" 
                          className="btn-outline" 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem' }}
                          value={item.title}
                          onChange={e => updateItem(item.id, { title: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="URL do Vídeo (YouTube/Vimeo)" 
                          className="btn-outline" 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem' }}
                          value={item.videoUrl}
                          onChange={e => updateItem(item.id, { videoUrl: e.target.value })}
                        />
                      </div>
                    )}

                    {item.type === 'image' && (
                       <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '120px 1fr' }}>
                        <div 
                          style={{ width: '120px', height: '80px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)' }}
                          onClick={() => document.getElementById(`banner-img-${item.id}`)?.click()}
                        >
                          {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}><ImageIcon size={24} /></div>}
                        </div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                           <input 
                            type="file" 
                            id={`banner-img-${item.id}`} 
                            accept="image/*" 
                            hidden 
                            onChange={(e) => handleProductImageUpload(item.id, e)} 
                          />
                           <input 
                            type="text" 
                            placeholder="Link de Destino (Opcional)" 
                            className="btn-outline" 
                            style={{ width: '100%', height: '36px', padding: '0 0.5rem' }}
                            value={item.url}
                            onChange={e => updateItem(item.id, { url: e.target.value })}
                          />
                          <button className="btn btn-outline" style={{ height: '32px', fontSize: '12px' }} onClick={() => document.getElementById(`banner-img-${item.id}`)?.click()}>Escolher Imagem</button>
                        </div>
                      </div>
                    )}

                    {item.type === 'carousel' && (
                      <div style={{ display: 'grid', gap: '1rem' }}>
                        <input 
                          type="text" 
                          placeholder="Título do Carrossel (Opcional)" 
                          className="btn-outline" 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem' }}
                          value={item.title}
                          onChange={e => updateItem(item.id, { title: e.target.value })}
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                          <div 
                            style={{ width: '80px', height: '80px', flexShrink: 0, background: '#f1f5f9', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '2px dashed var(--border)' }}
                            onClick={() => document.getElementById(`carousel-upload-${item.id}`)?.click()}
                          >
                            <Plus size={24} style={{ opacity: 0.3 }} />
                          </div>
                          {item.carouselImages?.map((img, idx) => (
                            <div key={idx} style={{ width: '80px', height: '80px', flexShrink: 0, position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
                              <img src={img} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              <button 
                                onClick={() => removeCarouselImage(item.id, idx)}
                                style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(239, 68, 68, 0.8)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                        <input 
                          type="file" 
                          id={`carousel-upload-${item.id}`} 
                          multiple 
                          accept="image/*" 
                          hidden 
                          onChange={(e) => handleCarouselImageUpload(item.id, e)} 
                        />
                        <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: 0 }}>Dica: Você pode selecionar várias imagens de uma vez.</p>
                      </div>
                    )}

                    {item.type === 'header' && (
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <label style={{ fontSize: '0.75rem', opacity: 0.6 }}>Texto do Divisor / Título de Seção</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Nossos Produtos, Redes Sociais..." 
                          className="btn-outline" 
                          style={{ width: '100%', height: '40px', padding: '0 0.75rem', fontWeight: 800 }}
                          value={item.title}
                          onChange={e => updateItem(item.id, { title: e.target.value })}
                        />
                      </div>
                    )}

                    {(item.type === 'link' || item.type === 'product') && (
                       <div style={{ display: 'grid', gridTemplateColumns: item.type === 'product' ? '120px 1fr' : '1fr', gap: '1rem' }}>
                      {item.type === 'product' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div 
                            style={{ width: '120px', height: '120px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: '1px solid var(--border)' }}
                            onClick={() => document.getElementById(`prod-img-${item.id}`)?.click()}
                          >
                            {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0.3 }}><ImageIcon size={24} /></div>}
                          </div>
                          <input 
                            type="file" 
                            id={`prod-img-${item.id}`} 
                            accept="image/*" 
                            hidden 
                            onChange={(e) => handleProductImageUpload(item.id, e)} 
                          />
                          <button 
                            className="btn btn-outline" 
                            style={{ fontSize: '10px', height: '24px', padding: '0' }}
                            onClick={() => document.getElementById(`prod-img-${item.id}`)?.click()}
                          >
                            Mudar Foto
                          </button>
                        </div>
                      )}
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        <input 
                          type="text" 
                          placeholder="Título do Produto" 
                          className="btn-outline" 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontWeight: 600 }}
                          value={item.title}
                          onChange={e => updateItem(item.id, { title: e.target.value })}
                        />
                        <input 
                          type="text" 
                          placeholder="Breve Descrição (Opcional)" 
                          className="btn-outline" 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                          value={item.subtitle}
                          onChange={e => updateItem(item.id, { subtitle: e.target.value })}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                          <input 
                            type="text" 
                            placeholder="Preço (Ex: R$ 99,90)" 
                            className="btn-outline" 
                            style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem', color: 'var(--success)' }}
                            value={item.price}
                            onChange={e => updateItem(item.id, { price: e.target.value })}
                          />
                          <input 
                            type="text" 
                            placeholder="Texto do Botão" 
                            className="btn-outline" 
                            style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                            value={item.buttonText || 'Comprar'}
                            onChange={e => updateItem(item.id, { buttonText: e.target.value })}
                          />
                        </div>
                        <input 
                          type="text" 
                          placeholder="URL de Destino" 
                          className="btn-outline" 
                          style={{ width: '100%', height: '36px', padding: '0 0.5rem', fontSize: '0.875rem' }}
                          value={item.url}
                          onChange={e => updateItem(item.id, { url: e.target.value })}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                            <div>
                              <label style={{ fontSize: '0.65rem', opacity: 0.6 }}>Cor do Botão</label>
                              <input 
                                type="color" 
                                style={{ width: '100%', height: '24px', padding: '0', cursor: 'pointer', border: 'none' }}
                                value={item.buttonColor || currentBio.theme.buttonBackground}
                                onChange={e => updateItem(item.id, { buttonColor: e.target.value })}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '0.65rem', opacity: 0.6 }}>Cor do Texto do Botão</label>
                              <input 
                                type="color" 
                                style={{ width: '100%', height: '24px', padding: '0', cursor: 'pointer', border: 'none' }}
                                value={item.buttonTextColor || currentBio.theme.buttonTextColor}
                                onChange={e => updateItem(item.id, { buttonTextColor: e.target.value })}
                              />
                            </div>
                          </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Ícone:</span>
                          <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                            {['shopping-cart', 'smartphone', 'link', 'star', 'globe', 'message-circle'].map(iconName => (
                              <button 
                                key={iconName}
                                className="btn btn-outline"
                                style={{ 
                                  padding: '0.25rem', 
                                  borderColor: item.icon === iconName ? 'var(--primary)' : 'var(--border)',
                                  background: item.icon === iconName ? 'rgba(79, 70, 229, 0.1)' : 'transparent'
                                }}
                                onClick={() => updateItem(item.id, { icon: iconName })}
                              >
                                {iconName === 'shopping-cart' && <ShoppingCart size={14} />}
                                {iconName === 'smartphone' && <Smartphone size={14} />}
                                {iconName === 'link' && <LinkIcon size={14} />}
                                {iconName === 'star' && <Plus size={14} />}
                                {iconName === 'globe' && <Globe size={14} />}
                                {iconName === 'message-circle' && <MessageCircle size={14} />}
                              </button>
                            ))}
                            <button className="btn btn-outline" style={{ fontSize: '10px' }} onClick={() => updateItem(item.id, { icon: undefined })}>X</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

          {activeTab === 'social' && (
            <div className="card">
              <h4 style={{ marginBottom: '1rem' }}>Minhas Redes</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {['instagram', 'whatsapp', 'tiktok', 'youtube', 'facebook', 'linkedin', 'threads', 'shopee'].map((p: any) => (
                  <button 
                    key={p} 
                    className="btn btn-outline" 
                    style={{ fontSize: '0.75rem', height: '32px' }}
                    onClick={() => addSocial(p)}
                  >
                    + {p.charAt(0).toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <div style={{ display: 'grid', gap: '1rem' }}>
                {currentBio.socials.map(s => (
                  <div key={s.platform} style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <div style={{ width: '100px', fontSize: '0.875rem', fontWeight: 600, textTransform: 'capitalize' }}>{s.platform}</div>
                    <input 
                      type="text" 
                      className="btn-outline" 
                      placeholder={`URL do ${s.platform}`}
                      style={{ flex: 1, height: '36px', padding: '0 0.75rem' }}
                      value={s.url}
                      onChange={e => setCurrentBio({
                        ...currentBio,
                        socials: currentBio.socials.map(social => social.platform === s.platform ? { ...social, url: e.target.value } : social)
                      })}
                    />
                    <button onClick={() => removeSocial(s.platform)} style={{ color: 'var(--danger)' }}><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'theme' && (
            <div className="card">
               <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fundo (Background)</label>
                  <input 
                    type="color" 
                    style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                    value={currentBio.theme.background}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, background: e.target.value}})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Tipo de Fundo</label>
                  <select 
                    className="btn-outline" 
                    style={{ width: '100%', height: '40px' }}
                    value={currentBio.theme.backgroundType || 'solid'}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, backgroundType: e.target.value as any}})}
                  >
                    <option value="solid">Cor Sólida</option>
                    <option value="gradient">Gradiente</option>
                  </select>
                </div>
                {currentBio.theme.backgroundType === 'gradient' && (
                  <>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cor Inicial</label>
                      <input 
                        type="color" 
                        style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                        value={currentBio.theme.gradientColor1 || '#667eea'}
                        onChange={e => {
                          const c1 = e.target.value;
                          const c2 = currentBio.theme.gradientColor2 || '#764ba2';
                          setCurrentBio({
                            ...currentBio, 
                            theme: {
                              ...currentBio.theme, 
                              gradientColor1: c1,
                              backgroundGradient: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
                            }
                          })
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cor Final</label>
                      <input 
                        type="color" 
                        style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                        value={currentBio.theme.gradientColor2 || '#764ba2'}
                        onChange={e => {
                          const c1 = currentBio.theme.gradientColor1 || '#667eea';
                          const c2 = e.target.value;
                          setCurrentBio({
                            ...currentBio, 
                            theme: {
                              ...currentBio.theme, 
                              gradientColor2: c2,
                              backgroundGradient: `linear-gradient(135deg, ${c1} 0%, ${c2} 100%)`
                            }
                          })
                        }}
                      />
                    </div>
                  </>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cor do Texto do Perfil</label>
                  <input 
                    type="color" 
                    style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                    value={currentBio.theme.textColor}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, textColor: e.target.value}})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cor do Texto dos Cards</label>
                  <input 
                    type="color" 
                    style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                    value={currentBio.theme.cardTextColor || currentBio.theme.textColor}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, cardTextColor: e.target.value}})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cor dos Ícones Sociais</label>
                  <input 
                    type="color" 
                    style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                    value={currentBio.theme.socialIconColor || currentBio.theme.textColor}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, socialIconColor: e.target.value}})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Cor de Fundo dos Cards</label>
                  <input 
                    type="color" 
                    style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                    value={currentBio.theme.cardBackground}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, cardBackground: e.target.value}})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Fundo dos Botões (Links)</label>
                  <input 
                    type="color" 
                    style={{ width: '100%', height: '40px', padding: '0', cursor: 'pointer' }}
                    value={currentBio.theme.buttonBackground}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, buttonBackground: e.target.value}})}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Logo da Empresa (Rodapé)</label>
                  <div 
                    style={{ width: '100%', height: '40px', border: '1px dashed var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}
                    onClick={() => document.getElementById('footer-logo-upload')?.click()}
                  >
                    {currentBio.footerLogoUrl ? <img src={currentBio.footerLogoUrl} style={{ height: '100%', objectFit: 'contain' }} /> : <Plus size={16} />}
                  </div>
                  <input type="file" id="footer-logo-upload" hidden accept="image/*" onChange={handleFooterLogoUpload} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Estilo dos Cards</label>
                  <select 
                    className="btn-outline" 
                    style={{ width: '100%', height: '40px' }}
                    value={currentBio.theme.style}
                    onChange={e => setCurrentBio({...currentBio, theme: {...currentBio.theme, style: e.target.value as any}})}
                  >
                    <option value="flat">Sólido (Flat)</option>
                    <option value="glass">Vidro (Glassmorphism)</option>
                    <option value="gradient">Gradiente Suave</option>
                    <option value="minimal">Mínimalista</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview do Celular (Mockup) */}
        <div style={{ width: '380px', background: '#1e293b', borderRadius: '40px', padding: '12px', position: 'relative', display: 'flex', flexDirection: 'column', border: '8px solid #334155' }}>
          <div style={{ position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)', width: '120px', height: '25px', background: '#1e293b', borderBottomLeftRadius: '15px', borderBottomRightRadius: '15px', zIndex: 10 }}></div>
          <div className="iphone-screen" style={{ 
            flex: 1, 
            background: currentBio.theme.backgroundType === 'gradient' ? currentBio.theme.backgroundGradient : currentBio.theme.background, 
            borderRadius: '30px', 
            overflowY: 'auto', 
            padding: '2rem 1.5rem',
            color: currentBio.theme.textColor,
            fontFamily: 'Inter, sans-serif'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ width: '110px', height: '110px', borderRadius: '50%', background: 'white', margin: '0 auto 1rem', overflow: 'hidden', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
                {currentBio.avatarUrl && <img src={currentBio.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>{currentBio.profileName}</h2>
              <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '1rem' }}>{currentBio.bio}</p>
              


              <div style={{ display: 'grid', gap: '1rem' }}>
                {currentBio.items.filter(i => i.isActive).map(item => (
                  <div 
                    key={item.id} 
                    style={{ 
                      background: (item.type === 'product') ? currentBio.theme.cardBackground : (item.buttonColor || currentBio.theme.buttonBackground),
                      backdropFilter: currentBio.theme.style === 'glass' ? 'blur(10px)' : 'none',
                      color: (item.type === 'product' || item.type === 'image' || item.type === 'video' || item.type === 'carousel') ? currentBio.theme.textColor : (item.buttonTextColor || currentBio.theme.buttonTextColor),
                      padding: (item.type === 'image' || item.type === 'video' || item.type === 'carousel') ? '8px' : (item.type === 'product' ? '1rem' : '0.875rem'),
                      borderRadius: '16px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      border: (item.type === 'image' || item.type === 'video') ? `3px solid ${currentBio.theme.buttonBackground}` : (currentBio.theme.style === 'glass' ? '1px solid rgba(255,255,255,0.2)' : 'none'),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: (item.type === 'product' || item.type === 'carousel') ? 'flex-start' : 'center',
                      textAlign: (item.type === 'product' || item.type === 'carousel') ? 'left' : 'center',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px -2px rgba(0,0,0,0.12)'
                    }}
                  >
                    {item.type === 'product' && (
                      <div style={{ display: 'flex', width: '100%', gap: '1rem' }}>
                        <div style={{ width: '100px', height: '100px', flexShrink: 0, borderRadius: '12px', overflow: 'hidden', background: '#f1f5f9' }}>
                          {item.imageUrl && <img src={item.imageUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', color: currentBio.theme.cardTextColor || currentBio.theme.textColor }}>
                          <div>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, lineHeight: 1.3 }}>{item.title}</h4>
                            {item.subtitle && <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', opacity: 0.7, fontWeight: 400 }}>{item.subtitle}</p>}
                          </div>
                          <div>
                            <p style={{ margin: '0.5rem 0', fontSize: '0.95rem', fontWeight: 800 }}>{item.price}</p>
                            <div style={{ 
                              background: item.buttonColor || '#000', 
                              color: item.buttonTextColor || '#fff', 
                              padding: '0.4rem 0.8rem', 
                              borderRadius: '20px', 
                              fontSize: '0.75rem', 
                              display: 'inline-block',
                              textAlign: 'center'
                            }}>
                              {item.buttonText || 'Comprar'}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {item.type === 'video' && (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ width: '100%', overflow: 'hidden', background: '#000', borderRadius: '12px', position: 'relative', aspectRatio: '16/9' }}>
                          {getYoutubeEmbed(item.videoUrl || '') ? (
                            <iframe 
                              src={getYoutubeEmbed(item.videoUrl || '') || ''} 
                              style={{ 
                                width: '100%',
                                height: '100%',
                                border: '0',
                                borderRadius: '12px',
                                pointerEvents: 'auto'
                              }}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                              allowFullScreen
                            ></iframe>
                          ) : (
                            <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.8rem', opacity: 0.5 }}>Vídeo Indisponível</div>
                          )}
                        </div>
                        {item.title && <div style={{ padding: '0.4rem', fontSize: '0.7rem', background: 'transparent', color: 'inherit', fontWeight: 500, textAlign: 'center', opacity: 0.7 }}>{item.title}</div>}
                      </div>
                    )}

                    {item.type === 'image' && (
                      <div style={{ width: '100%', overflow: 'hidden', borderRadius: '16px', border: `2px solid ${currentBio.theme.buttonBackground}`, padding: '4px' }}>
                        <div style={{ borderRadius: '12px', overflow: 'hidden' }}>
                          {item.imageUrl ? <img src={item.imageUrl} style={{ width: '100%', display: 'block', borderRadius: '12px' }} /> : <div style={{ height: '100px', background: '#f1f5f9' }}></div>}
                        </div>
                      </div>
                    )}

                    {item.type === 'carousel' && (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                        {item.title && <div style={{ fontSize: '0.8rem', fontWeight: 700, color: currentBio.theme.cardTextColor || currentBio.theme.textColor, textAlign: 'center', opacity: 0.8 }}>{item.title}</div>}
                        <AutoCarousel images={item.carouselImages || []} />
                      </div>
                    )}

                    {item.type === 'header' && (
                      <div style={{ width: '100%', padding: '1rem 0 0.5rem', textAlign: 'center', fontSize: '0.9rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px', opacity: 0.7 }}>
                        {item.title}
                      </div>
                    )}

                    {!(item.type === 'product' || item.type === 'video' || item.type === 'image' || item.type === 'header' || item.type === 'carousel') && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
                        {item.icon === 'shopping-cart' && <ShoppingCart size={18} />}
                        {item.icon === 'smartphone' && <Smartphone size={18} />}
                        {item.icon === 'link' && <LinkIcon size={18} />}
                        {item.icon === 'star' && <Star size={18} />}
                        {item.icon === 'globe' && <Globe size={18} />}
                        {item.icon === 'message-circle' && renderSocialIcon('whatsapp', 18)}
                        {item.title}
                      </div>
                    )}
                  </div>
                ))}
                <div style={{ marginTop: '2rem', textAlign: 'center', paddingBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                    {currentBio.socials.map(s => (
                      <div key={s.platform} style={{ transition: 'transform 0.2s' }}>
                        {renderSocialIcon(s.platform, 24, currentBio.theme.socialIconColor || currentBio.theme.textColor)}
                      </div>
                    ))}
                  </div>
                  {currentBio.footerLogoUrl && (
                    <img src={currentBio.footerLogoUrl} style={{ height: '35px', objectFit: 'contain', margin: '0 auto', display: 'block' }} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold' }}>Link na Bio</h2>
          <p style={{ opacity: 0.6 }}>Gerencie seus cartões de visita digitais.</p>
        </div>
        <button className="btn btn-primary" onClick={handleCreateNew}>
          <Plus size={18} /> Novo Link na Bio
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {bios.map(bio => (
          <div key={bio.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#e2e8f0', overflow: 'hidden' }}>
                {bio.avatarUrl && <img src={bio.avatarUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 600 }}>{bio.profileName}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <p style={{ fontSize: '0.875rem', opacity: 0.6, margin: 0 }}>/{bio.slug}</p>
                  <button 
                    onClick={() => copyToClipboard(bio.slug)}
                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                    title="Copiar Link"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
              <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{bio.items.length}</div>
                <div style={{ opacity: 0.6 }}>Itens</div>
              </div>
              <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--primary)' }}>{bio.visualizacoes || 0}</div>
                <div style={{ opacity: 0.6 }}>Views</div>
              </div>
              <div style={{ background: '#f1f5f9', padding: '0.5rem', borderRadius: '8px', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--success)' }}>{bio.cliquesTotais}</div>
                <div style={{ opacity: 0.6 }}>Cliques</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => { setCurrentBio(bio); setIsEditing(true); }}>
                <SettingsIcon size={16} /> Editar
              </button>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => window.open(`/${bio.slug}`, '_blank')}>
                <Eye size={16} /> Ver
              </button>
              <button className="btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '0.5rem' }} onClick={() => handleDelete(bio.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {bios.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', background: 'white', borderRadius: 'var(--radius)', border: '2px dashed var(--border)' }}>
            <Smartphone size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p style={{ opacity: 0.5 }}>Você ainda não criou nenhum Link na Bio.</p>
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={handleCreateNew}>Criar Meu Primeiro Link</button>
          </div>
        )}
      </div>
    </div>
  );
}
