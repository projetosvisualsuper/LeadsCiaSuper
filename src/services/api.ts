import { Lead, Campaign, FilaEnvio, Settings, LandingPageInstance, LandingPageSettings, BioLink, UserProfile, Segmentation } from '@/types/crm';
import { db } from '@/lib/firebase';
import { sendEmailBrevoAction } from '@/app/actions/brevo';
import { processQueueServerAction } from '@/app/actions/queue';
import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  query,
  where,
  setDoc,
  orderBy,
  limit as firestoreLimit,
  increment
} from 'firebase/firestore';

const COLLECTIONS = {
  LEADS: 'leads',
  CAMPAIGNS: 'campaigns',
  QUEUE: 'queue',
  SETTINGS: 'settings',
  LANDING_PAGES: 'landing_pages',
  BIO_LINKS: 'bio_links',
  USERS: 'users',
  SEGMENTATIONS: 'segmentations'
};

const initialSettings: Settings = {
  brevoApiKey: '',
  remetenteNome: 'Minha Empresa',
  remetenteEmail: 'contato@minhaempresa.com',
  limiteDiario: 300,
  notificacoes: {
    novosLeads: true,
    errosEnvio: true
  },
  landingPage: {
    titulo: 'Gerency Leads',
    subtitulo: 'Acelere suas vendas com o melhor CRM',
    destaque: 'do mercado brasileiro',
    descricao: 'Capture, organize e converta leads de forma profissional com nossa plataforma intuitiva.',
    beneficios: [
      'Automação de e-mail integrada',
      'Gestão de funil de vendas',
      'Dashboard em tempo real'
    ],
    formTitulo: 'Solicite uma demonstração',
    formSubtitulo: 'Preencha o formulário e um consultor entrará em contato.',
    botaoTexto: 'Falar com um consultor',
    backgroundUrl: '/images/sales-bg.png',
    formColor: '#3b82f6',
    botaoColor: '#fbbf24',
    logoUrl: '',
    headerColor: '#ffffff'
  },
  empresa: {
    website: 'www.visualsuper.com.br',
    endereco: 'Rua Jeremias Eugênio da Silva, 74 - Serraria - São José, Santa Catarina, Brasil',
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
    youtube: 'https://youtube.com'
  },
  whatsappWidget: {
    enabled: true,
    posicao: 'right',
    atendentes: [
      { id: '1', nome: 'Atendimento Comercial', cargo: 'Vendas', telefone: '554899999999', disponibilidade: '08:00 às 18:00' }
    ]
  }
};

export const api = {
  // Leads
  getLeads: async (): Promise<Lead[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.LEADS));
    const leads: Lead[] = [];
    querySnapshot.forEach((doc) => {
      leads.push({ id: doc.id, ...doc.data() } as Lead);
    });
    return leads.sort((a, b) => {
      const dateA = new Date(a.dataUltimaAtividade || a.dataCriacao).getTime();
      const dateB = new Date(b.dataUltimaAtividade || b.dataCriacao).getTime();
      return dateB - dateA;
    });
  },
  
  saveLead: async (lead: Lead) => {
    // Atualiza a data de última atividade sempre que o lead for salvo/alterado
    lead.dataUltimaAtividade = new Date().toISOString();
    
    const sanitizedLead = JSON.parse(JSON.stringify(lead));
    const leadRef = doc(db, COLLECTIONS.LEADS, lead.id);
    const snap = await getDoc(leadRef);
    
    if (snap.exists()) {
      await updateDoc(leadRef, sanitizedLead);
    } else {
      await setDoc(leadRef, sanitizedLead);
    }
    
    // Disparar evento para o sistema saber que há um novo lead (apenas localmente)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_new_lead', { detail: lead }));
    }
    
    return lead;
  },

  deleteLead: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.LEADS, id));
  },

  // Campaigns
  getCampaigns: async (): Promise<Campaign[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.CAMPAIGNS));
    const campaigns: Campaign[] = [];
    querySnapshot.forEach((doc) => {
      campaigns.push({ id: doc.id, ...doc.data() } as Campaign);
    });
    return campaigns.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
  },

  saveCampaign: async (campaign: Campaign) => {
    // Sanitizar objeto para remover valores 'undefined' que o Firestore não suporta
    const sanitizedCampaign = JSON.parse(JSON.stringify(campaign));
    const campaignRef = doc(db, COLLECTIONS.CAMPAIGNS, campaign.id);
    const snap = await getDoc(campaignRef);
    
    if (snap.exists()) {
      await updateDoc(campaignRef, sanitizedCampaign);
    } else {
      await setDoc(campaignRef, sanitizedCampaign);
    }
    return campaign;
  },

  deleteCampaign: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.CAMPAIGNS, id));
    
    // Opcionalmente: Limpar a fila de envio vinculada a esta campanha (isso exigiria uma query e loop no Firestore)
    const q = query(collection(db, COLLECTIONS.QUEUE), where("campanhaId", "==", id));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach(async (document) => {
      await deleteDoc(doc(db, COLLECTIONS.QUEUE, document.id));
    });
  },

  // Queue
  getQueue: async (): Promise<FilaEnvio[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.QUEUE));
    const queue: FilaEnvio[] = [];
    querySnapshot.forEach((doc) => {
      queue.push({ id: doc.id, ...doc.data() } as FilaEnvio);
    });
    return queue;
  },

  // Landing Pages (Multi-Template)
  getLandingPages: async (): Promise<LandingPageInstance[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.LANDING_PAGES));
    const pages: LandingPageInstance[] = [];
    querySnapshot.forEach((doc) => {
      pages.push({ id: doc.id, ...doc.data() } as LandingPageInstance);
    });
    return pages;
  },

  getLandingPageBySlug: async (slug: string): Promise<LandingPageInstance | null> => {
    const q = query(collection(db, COLLECTIONS.LANDING_PAGES), where("slug", "==", slug));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const docSnap = querySnapshot.docs[0];
    const data = docSnap.data();
    
    // Garantir integridade dos dados para evitar crashes no render
    const page = { id: docSnap.id, ...data } as LandingPageInstance;
    
    // Fallback para config se estiver faltando
    if (!page.config) {
      const settings = await api.getSettings();
      page.config = settings.landingPage as LandingPageSettings;
    }

    // Garantir que beneficios seja sempre um array
    if (!page.config.beneficios) {
      page.config.beneficios = [];
    }
    
    return page;
  },

  saveLandingPage: async (page: LandingPageInstance) => {
    const sanitizedPage = JSON.parse(JSON.stringify(page));
    await setDoc(doc(db, COLLECTIONS.LANDING_PAGES, page.id), sanitizedPage);
    return page;
  },

  deleteLandingPage: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.LANDING_PAGES, id));
  },

  generateQueueForCampaign: async (campanhaId: string, leadIds: string[]) => {
    const allLeads = await api.getLeads();
    const leads = allLeads.filter(l => leadIds.includes(l.id));
    
    const newItems: FilaEnvio[] = [];
    for (const lead of leads) {
      const item: FilaEnvio = {
        id: Math.random().toString(36).substr(2, 9),
        campanhaId,
        leadId: lead.id,
        email: lead.email,
        status: 'pendente',
        tentativa: 0,
        dataAgendada: new Date().toISOString(),
        prioridade: 1
      };
      await setDoc(doc(db, COLLECTIONS.QUEUE, item.id), item);
      newItems.push(item);
    }
    return newItems;
  },

  // Settings
  getSettings: async (): Promise<Settings> => {
    try {
      const docRef = doc(db, COLLECTIONS.SETTINGS, 'global');
      const visualRef = doc(db, COLLECTIONS.SETTINGS, 'visual');
      
      const [snap, visualSnap] = await Promise.all([getDoc(docRef), getDoc(visualRef)]);
      
      let settings = snap.exists() ? snap.data() as Settings : initialSettings;
      let visualData = visualSnap.exists() ? visualSnap.data() : {};

      // Mesclar dados
      return {
        ...initialSettings,
        ...settings,
        notificacoes: { ...initialSettings.notificacoes, ...(settings.notificacoes || {}) },
        landingPage: { 
          ...initialSettings.landingPage, 
          ...(settings.landingPage || {}),
          logoUrl: visualData.logoUrl || settings.landingPage?.logoUrl || '',
          ogLogoUrl: visualData.ogLogoUrl || settings.landingPage?.ogLogoUrl || '',
          faviconUrl: visualData.faviconUrl || settings.landingPage?.faviconUrl || '',
          backgroundUrl: visualData.backgroundUrl || settings.landingPage?.backgroundUrl || ''
        },
        empresa: { ...initialSettings.empresa, ...(settings.empresa || {}) }
      };
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      return initialSettings;
    }
  },

  saveSettings: async (settings: Settings) => {
    // Separar imagens pesadas
    const { logoUrl, ogLogoUrl, faviconUrl, backgroundUrl, ...otherLp } = settings.landingPage || {};
    
    const visualData = {
      logoUrl: logoUrl || '',
      ogLogoUrl: ogLogoUrl || '',
      faviconUrl: faviconUrl || '',
      backgroundUrl: backgroundUrl || ''
    };

    const baseSettings = {
      ...settings,
      landingPage: {
        ...otherLp,
        // Mantemos 'none' ou strings curtas no global para não dar erro
        logoUrl: logoUrl?.startsWith('data:') ? 'none' : (logoUrl || ''),
        ogLogoUrl: ogLogoUrl?.startsWith('data:') ? 'none' : (ogLogoUrl || ''),
        faviconUrl: faviconUrl?.startsWith('data:') ? 'none' : (faviconUrl || ''),
        backgroundUrl: backgroundUrl?.startsWith('data:') ? 'none' : (backgroundUrl || '')
      }
    };

    await Promise.all([
      setDoc(doc(db, COLLECTIONS.SETTINGS, 'global'), baseSettings),
      setDoc(doc(db, COLLECTIONS.SETTINGS, 'visual'), visualData)
    ]);
    return settings;
  },

  // Daily Stats Tracking
  // Bio Links
  getBioLinks: async (): Promise<BioLink[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.BIO_LINKS));
    const bios: BioLink[] = [];
    querySnapshot.forEach((doc) => {
      bios.push({ id: doc.id, ...doc.data() } as BioLink);
    });
    return bios.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
  },

  getBioLinkBySlug: async (slug: string): Promise<BioLink | null> => {
    const q = query(collection(db, COLLECTIONS.BIO_LINKS), where("slug", "==", slug));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as BioLink;
  },

  saveBioLink: async (bio: BioLink) => {
    // Sanitizar objeto para remover valores 'undefined' que o Firestore não suporta
    const sanitizedBio = JSON.parse(JSON.stringify(bio));
    const bioRef = doc(db, COLLECTIONS.BIO_LINKS, bio.id);
    const snap = await getDoc(bioRef);
    if (snap.exists()) {
      await updateDoc(bioRef, sanitizedBio);
    } else {
      await setDoc(bioRef, sanitizedBio);
    }
    return bio;
  },

  deleteBioLink: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.BIO_LINKS, id));
  },

  getSentTodayCount: async (): Promise<number> => {
    const today = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, COLLECTIONS.QUEUE), 
      where("status", "==", "enviado")
    );
    const querySnapshot = await getDocs(q);
    let count = 0;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.dataEnvio?.startsWith(today)) {
        count++;
      }
    });
    return count;
  },

  // Brevo Actions handled directly in components to avoid build conflicts

  // Queue Processing Engine (Refatorado para usar Server Action)
  processQueue: async (onProgress?: (msg: string) => void) => {
    onProgress?.('Iniciando processamento seguro no servidor...');
    
    const result = await processQueueServerAction();
    
    if (result.success) {
      onProgress?.(result.message || 'Processamento concluído.');
    } else {
      onProgress?.(`Erro: ${result.message}`);
      throw new Error(result.message);
    }
  },

  incrementBioView: async (id: string) => {
    const bioRef = doc(db, COLLECTIONS.BIO_LINKS, id);
    await updateDoc(bioRef, {
      visualizacoes: increment(1)
    });
  },

  // --- USER MANAGEMENT ---
  getUserProfile: async (uid: string): Promise<UserProfile | null> => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  },

  createUserProfile: async (profile: UserProfile) => {
    // Se for o primeiro usuário do sistema, aprova automaticamente como admin
    const q = query(collection(db, COLLECTIONS.USERS), firestoreLimit(1));
    const snap = await getDocs(q);
    if (snap.empty) {
      profile.status = 'approved';
      profile.role = 'admin';
    }
    
    const sanitized = JSON.parse(JSON.stringify(profile));
    await setDoc(doc(db, COLLECTIONS.USERS, profile.uid), sanitized);
    return profile;
  },

  updateUserProfile: async (uid: string, data: Partial<UserProfile>) => {
    const userRef = doc(db, COLLECTIONS.USERS, uid);
    await setDoc(userRef, data, { merge: true });
  },

  getAllUserProfiles: async (): Promise<UserProfile[]> => {
    const q = query(collection(db, COLLECTIONS.USERS), orderBy('dataSolicitacao', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(doc => doc.data() as UserProfile);
  },

  incrementBioClick: async (id: string) => {
    const bioRef = doc(db, COLLECTIONS.BIO_LINKS, id);
    await updateDoc(bioRef, {
      cliquesTotais: increment(1)
    });
  },

  // --- SEGMENTATIONS ---
  getSegmentations: async (): Promise<Segmentation[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.SEGMENTATIONS));
    const segments: Segmentation[] = [];
    querySnapshot.forEach((doc) => {
      segments.push({ id: doc.id, ...doc.data() } as Segmentation);
    });
    return segments.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
  },

  saveSegmentation: async (segment: Segmentation) => {
    const sanitized = JSON.parse(JSON.stringify(segment));
    await setDoc(doc(db, COLLECTIONS.SEGMENTATIONS, segment.id), sanitized);
    return segment;
  },

  deleteSegmentation: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.SEGMENTATIONS, id));
  }
};
