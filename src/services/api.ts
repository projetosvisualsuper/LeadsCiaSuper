import { Lead, Campaign, FilaEnvio, Settings, LandingPageInstance, LandingPageSettings, BioLink, UserProfile, Segmentation, PopupConfig, ChatSession, ChatMessage, WhatsappConnection, WhatsappTemplate } from '@/types/crm';
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
  increment,
  writeBatch,
  getCountFromServer
} from 'firebase/firestore';

const COLLECTIONS = {
  LEADS: 'leads',
  CAMPAIGNS: 'campaigns',
  QUEUE: 'queue',
  SETTINGS: 'settings',
  LANDING_PAGES: 'landing_pages',
  BIO_LINKS: 'bio_links',
  USERS: 'users',
  SEGMENTATIONS: 'segmentations',
  POPUPS: 'popups',
  CHATS: 'atendimentos_v3',
  MESSAGES: 'messages',
  WHATSAPP_CONNECTIONS: 'whatsapp_connections'
};

const initialSettings: Settings = {
  brevoApiKey: '',
  remetenteNome: 'Minha Empresa',
  remetenteEmail: 'contato@minhaempresa.com',
  limiteDiario: 280,
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
  },
  gtmId: ''
};

export const api = {
  // Leads
  getLeads: async (limitCount: number = 5000): Promise<Lead[]> => {
    const q = query(collection(db, COLLECTIONS.LEADS), orderBy('dataCriacao', 'desc'), firestoreLimit(limitCount));
    const querySnapshot = await getDocs(q);
    const leads: Lead[] = [];
    querySnapshot.forEach((doc) => {
      leads.push({ ...doc.data(), id: doc.id } as Lead);
    });
    // Ordenar em memória para garantir que leads com atividade recente (re-conversão) fiquem no topo
    return leads.sort((a, b) => {
      const timeA = new Date(a.dataUltimaAtividade || a.dataCriacao).getTime();
      const timeB = new Date(b.dataUltimaAtividade || b.dataCriacao).getTime();
      return timeB - timeA;
    });
  },
  
  saveLead: async (lead: Lead) => {
    const agora = new Date().toISOString();
    let targetId = lead.id;
    let existingData: any = null;

    // 1. Tentar encontrar lead por ID
    const leadRef = doc(db, COLLECTIONS.LEADS, lead.id);
    const snap = await getDoc(leadRef);

    if (snap.exists()) {
      existingData = snap.data();
    } else {
      // 2. Se não encontrar por ID, tentar por E-mail
      if (lead.email) {
        const q = query(collection(db, COLLECTIONS.LEADS), where('email', '==', lead.email));
        const emailSnap = await getDocs(q);
        if (!emailSnap.empty) {
          targetId = emailSnap.docs[0].id;
          existingData = emailSnap.docs[0].data();
        }
      }

      // 3. Se ainda não encontrar, tentar por Celular
      if (!existingData && lead.celular) {
        const q = query(collection(db, COLLECTIONS.LEADS), where('celular', '==', lead.celular));
        const phoneSnap = await getDocs(q);
        if (!phoneSnap.empty) {
          targetId = phoneSnap.docs[0].id;
          existingData = phoneSnap.docs[0].data();
        }
      }
    }

    const sanitizedLead = JSON.parse(JSON.stringify(lead));
    const finalRef = doc(db, COLLECTIONS.LEADS, targetId);

    if (existingData) {
      // Atualizar Lead Existente
      const totalConversoes = (existingData.totalConversoes || 1) + (snap.exists() ? 0 : 1); // Só soma se for uma "nova" conversão (ID diferente)
      
      const updateData = {
        ...sanitizedLead,
        id: targetId,
        totalConversoes,
        dataUltimaConversao: snap.exists() ? (existingData.dataUltimaConversao || existingData.dataCriacao) : agora,
        dataUltimaAtividade: agora,
        // Manter dados que não queremos sobrescrever por completo se o novo lead for incompleto
        nome: lead.nome && lead.nome !== 'Cliente' ? lead.nome : existingData.nome,
        tags: Array.from(new Set([...(existingData.tags || []), ...(lead.tags || [])])),
        observacoes: (existingData.observacoes || '') + (snap.exists() ? '' : `\n[RECONVERSÃO] Nova interação em ${new Date().toLocaleString('pt-BR')} via ${lead.origem}`)
      };

      await updateDoc(finalRef, updateData);
      lead.id = targetId; // Atualiza o objeto local com o ID correto
    } else {
      // Criar Novo Lead
      const newLead = {
        ...sanitizedLead,
        totalConversoes: 1,
        dataUltimaConversao: agora,
        dataUltimaAtividade: agora
      };
      await setDoc(finalRef, newLead);
    }

    // Disparar evento para o sistema saber que há um novo lead (apenas localmente)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('crm_new_lead', { detail: lead }));
    }

    return lead;
  },

  async getWhatsappTemplates(connectionId?: string): Promise<WhatsappTemplate[]> {
    const q = connectionId 
      ? query(collection(db, 'whatsapp_templates'), where('connectionId', '==', connectionId))
      : collection(db, 'whatsapp_templates');
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsappTemplate));
  },

  async saveWhatsappTemplate(template: WhatsappTemplate) {
    const { id, ...data } = template;
    await setDoc(doc(db, 'whatsapp_templates', id), data);
  },

  async deleteWhatsappTemplate(id: string) {
    await deleteDoc(doc(db, 'whatsapp_templates', id));
  },

  deleteLead: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.LEADS, id));
  },

  deleteLeadsBulk: async (ids: string[]) => {
    const batch = writeBatch(db);
    ids.forEach(id => {
      batch.delete(doc(db, COLLECTIONS.LEADS, id));
    });
    await batch.commit();
  },

  saveLeadsBulk: async (leads: Lead[]) => {
    // Processar em chunks de 500 (limite do Firestore)
    const chunks = [];
    for (let i = 0; i < leads.length; i += 500) {
      chunks.push(leads.slice(i, i + 500));
    }

    for (const chunk of chunks) {
      const batch = writeBatch(db);
      chunk.forEach(lead => {
        const leadRef = doc(db, COLLECTIONS.LEADS, lead.id);
        batch.set(leadRef, {
          ...lead,
          dataUltimaAtividade: new Date().toISOString()
        }, { merge: true });
      });
      await batch.commit();
    }
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

  incrementLandingPageView: async (id: string) => {
    try {
      const pageRef = doc(db, COLLECTIONS.LANDING_PAGES, id);
      const snap = await getDoc(pageRef);
      if (snap.exists()) {
        const data = snap.data() as LandingPageInstance;
        await updateDoc(pageRef, {
          visualizacoes: (data.visualizacoes || 0) + 1
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  incrementLandingPageClick: async (id: string) => {
    try {
      const pageRef = doc(db, COLLECTIONS.LANDING_PAGES, id);
      const snap = await getDoc(pageRef);
      if (snap.exists()) {
        const data = snap.data() as LandingPageInstance;
        await updateDoc(pageRef, {
          cliquesTotais: (data.cliquesTotais || 0) + 1
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  generateQueueForCampaign: async (campanhaId: string, leadIds: string[]) => {
    const campaigns = await api.getCampaigns();
    const campaign = campaigns.find(c => c.id === campanhaId);
    if (!campaign) throw new Error('Campanha não encontrada');

    // Buscar apenas os leads necessários em chunks de 30 (limite do 'in' no Firestore)
    const leads: Lead[] = [];
    for (let i = 0; i < leadIds.length; i += 30) {
      const chunk = leadIds.slice(i, i + 30);
      const q = query(collection(db, COLLECTIONS.LEADS), where('__name__', 'in', chunk));
      const snap = await getDocs(q);
      snap.forEach(doc => leads.push({ ...doc.data(), id: doc.id } as Lead));
    }
    
    // Buscar template se houver
    let templateData = undefined;
    if (campaign.channel === 'whatsapp' && campaign.whatsappTemplateId) {
      const tplSnap = await getDoc(doc(db, 'whatsapp_templates', campaign.whatsappTemplateId));
      if (tplSnap.exists()) {
        const tpl = tplSnap.data() as WhatsappTemplate;
        templateData = {
          name: tpl.name,
          language: tpl.language || 'pt_BR',
          components: tpl.components || []
        };
      }
    }

    const batch = writeBatch(db);
    const newItems: FilaEnvio[] = [];
    
    for (const lead of leads) {
      const item: any = {
        id: Math.random().toString(36).substr(2, 9),
        campanhaId,
        leadId: lead.id,
        email: campaign.channel === 'email' ? lead.email : undefined,
        telefone: campaign.channel === 'whatsapp' ? (lead.celular || lead.telefone) : undefined,
        channel: campaign.channel,
        status: 'pendente',
        tentativa: 0,
        dataAgendada: new Date().toISOString(),
        prioridade: 1,
        whatsappConnectionId: campaign.whatsappConnectionId,
        templateData: templateData
      };
      batch.set(doc(db, COLLECTIONS.QUEUE, item.id), item);
      newItems.push(item);
    }
    
    await batch.commit();
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
        empresa: { ...initialSettings.empresa, ...(settings.empresa || {}) },
        gtmId: settings.gtmId || ''
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

    const baseSettings = JSON.parse(JSON.stringify({
      ...settings,
      landingPage: {
        ...otherLp,
        logoUrl: logoUrl?.startsWith('data:') ? 'none' : (logoUrl || ''),
        ogLogoUrl: ogLogoUrl?.startsWith('data:') ? 'none' : (ogLogoUrl || ''),
        faviconUrl: faviconUrl?.startsWith('data:') ? 'none' : (faviconUrl || ''),
        backgroundUrl: backgroundUrl?.startsWith('data:') ? 'none' : (backgroundUrl || '')
      }
    }));

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
      where("status", "==", "enviado"),
      where("dataEnvio", ">=", today),
      where("dataEnvio", "<=", today + "\uf8ff")
    );
    const snap = await getCountFromServer(q);
    return snap.data().count;
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

  deleteUserProfile: async (uid: string) => {
    await deleteDoc(doc(db, COLLECTIONS.USERS, uid));
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
  },

  // Popups
  getPopups: async (): Promise<PopupConfig[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.POPUPS));
    const popups: PopupConfig[] = [];
    querySnapshot.forEach((doc) => {
      popups.push({ id: doc.id, ...doc.data() } as PopupConfig);
    });
    return popups.sort((a, b) => new Date(b.dataCriacao).getTime() - new Date(a.dataCriacao).getTime());
  },

  savePopup: async (popup: PopupConfig) => {
    const sanitized = JSON.parse(JSON.stringify(popup));
    const popupRef = doc(db, COLLECTIONS.POPUPS, popup.id);
    const snap = await getDoc(popupRef);
    if (snap.exists()) {
      await updateDoc(popupRef, sanitized);
    } else {
      await setDoc(popupRef, sanitized);
    }
    return popup;
  },

  deletePopup: async (id: string) => {
    await deleteDoc(doc(db, COLLECTIONS.POPUPS, id));
  },

  // Chat / Omnichannel
  getChats: async (): Promise<ChatSession[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.CHATS));
    const chats: ChatSession[] = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as ChatSession);
    });
    return chats.sort((a, b) => {
      const dateA = new Date(a.lastTimestamp || a.dataCriacao).getTime();
      const dateB = new Date(b.lastTimestamp || b.dataCriacao).getTime();
      return dateB - dateA;
    });
  },

  getMessages: async (chatId: string): Promise<ChatMessage[]> => {
    const q = query(
      collection(db, COLLECTIONS.MESSAGES),
      where("chatId", "==", chatId)
    );
    const querySnapshot = await getDocs(q);
    const messages: ChatMessage[] = [];
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as ChatMessage);
    });
    
    // Ordenar manualmente para evitar a necessidade de criar índices compostos no Firestore
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  },

  sendMessage: async (message: any) => {
    // 1. Determinar o ID correto do chat (Forçar ID determinístico para Meta)
    let finalChatId = message.chatId;
    
    if (message.channel === 'instagram' || message.channel === 'facebook') {
      if (message.leadId) {
        finalChatId = `${message.channel}_${message.leadId}`;
      }
    }

    // 2. Salvar a mensagem
    const docRef = await addDoc(collection(db, COLLECTIONS.MESSAGES), {
      ...message,
      chatId: finalChatId, // Garantir que a mensagem aponte para o ID certo
      timestamp: new Date().toISOString()
    });

    // 3. Atualizar o ChatSession com a última mensagem
    if (finalChatId) {
      await updateDoc(doc(db, COLLECTIONS.CHATS, finalChatId), {
        lastMessage: message.content,
        lastTimestamp: new Date().toISOString(),
        unreadCount: 0
      }).catch(async (err) => {
        // Se o documento não existir (ex: chat novo sendo iniciado pelo atendente), criamos ele
        if (err.code === 'not-found' && message.leadId) {
           await setDoc(doc(db, COLLECTIONS.CHATS, finalChatId), {
             id: finalChatId,
             leadId: message.leadId,
             leadName: message.leadName || 'Lead',
             channel: message.channel,
             lastMessage: message.content,
             lastTimestamp: new Date().toISOString(),
             unreadCount: 0,
             status: 'active'
           });
        }
      });
    }
    return message;
  },

  markChatAsRead: async (chatId: string) => {
    const chatRef = doc(db, COLLECTIONS.CHATS, chatId);
    await updateDoc(chatRef, { unreadCount: 0 });
  },

  saveChatSession: async (session: any) => {
    const chatRef = doc(db, COLLECTIONS.CHATS, session.id);
    await setDoc(chatRef, session);
    return session;
  },

  // --- WHATSAPP CONNECTIONS ---
  getWhatsappConnections: async (): Promise<WhatsappConnection[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTIONS.WHATSAPP_CONNECTIONS));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as WhatsappConnection));
  },

  getWhatsappConnectionById: async (id: string): Promise<WhatsappConnection | null> => {
    const docRef = doc(db, COLLECTIONS.WHATSAPP_CONNECTIONS, id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as WhatsappConnection;
    }
    return null;
  },

  createWhatsappConnection: async (connection: Omit<WhatsappConnection, 'id'>): Promise<string> => {
    const docRef = await addDoc(collection(db, COLLECTIONS.WHATSAPP_CONNECTIONS), connection);
    return docRef.id;
  },

  updateWhatsappConnection: async (id: string, updates: Partial<WhatsappConnection>) => {
    const docRef = doc(db, COLLECTIONS.WHATSAPP_CONNECTIONS, id);
    await updateDoc(docRef, updates);
  },

  deleteWhatsappConnection: async (id: string) => {
    const docRef = doc(db, COLLECTIONS.WHATSAPP_CONNECTIONS, id);
    await deleteDoc(docRef);
  },

  // Optimized Dashboard Stats
  getDashboardStats: async () => {
    const leadsRef = collection(db, COLLECTIONS.LEADS);
    const campaignsRef = collection(db, COLLECTIONS.CAMPAIGNS);
    const queueRef = collection(db, COLLECTIONS.QUEUE);

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const [
      totalLeadsSnap,
      totalCampaignsSnap,
      pendentesQueueSnap,
      leadsHojeSnap
    ] = await Promise.all([
      getCountFromServer(leadsRef),
      getCountFromServer(campaignsRef),
      getCountFromServer(query(queueRef, where('status', '==', 'pendente'))),
      getCountFromServer(query(leadsRef, where('dataUltimaAtividade', '>=', todayStr), where('dataUltimaAtividade', '<=', todayStr + '\uf8ff')))
    ]);

    // Buscar últimos 5 leads e 4 campanhas para o dashboard
    const [recentLeadsSnap, recentCampaignsSnap] = await Promise.all([
      getDocs(query(leadsRef, orderBy('dataUltimaAtividade', 'desc'), firestoreLimit(5))),
      getDocs(query(campaignsRef, orderBy('dataCriacao', 'desc'), firestoreLimit(4)))
    ]);

    const recentLeads = recentLeadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Lead));
    const recentCampaigns = recentCampaignsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Campaign));

    return {
      totalLeads: totalLeadsSnap.data().count,
      totalCampaigns: totalCampaignsSnap.data().count,
      pendentes: pendentesQueueSnap.data().count,
      leadsHoje: leadsHojeSnap.data().count,
      recentLeads,
      recentCampaigns
    };
  }
};
