export type LeadStatus = 'novo' | 'contatado' | 'convertido' | 'perdido';
export type CampaignStatus = 'rascunho' | 'agendada' | 'em execução' | 'concluída' | 'cancelada';
export type QueueStatus = 'pendente' | 'enviado' | 'erro';

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  celular?: string;
  empresa?: string;
  origem: string;
  dataCriacao: string;
  dataUltimaAtividade?: string;
  status: LeadStatus;
  tags: string[];
  consentimentoLGPD: boolean;
  observacoes?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  cidade?: string;
  estado?: string;
  totalConversoes?: number;
  dataUltimaConversao?: string;
  avatar?: string;
  isMetaLead?: boolean;
  documento?: string;
  faturamento?: number;
}

export interface Campaign {
  id: string;
  nome: string;
  assunto: string;
  preheader?: string;
  conteudoHtml: string;
  dataCriacao: string;
  dataAgendada?: string;
  botaoTexto?: string;
  botaoLink?: string;
  status: CampaignStatus;
  channel: 'email' | 'whatsapp';
  whatsappConnectionId?: string;
  segmentId?: string;
  whatsappTemplateId?: string;
  totalLeads: number;
  totalEnviados: number;
  totalPendentes: number;
  totalErro: number;
  totalAbertos: number;
  totalCliques: number;
  textoSimples?: string;
  bannerImg?: string;
}

export interface FilaEnvio {
  id: string;
  campanhaId: string;
  leadId: string;
  email?: string;
  telefone?: string;
  channel: 'email' | 'whatsapp';
  status: QueueStatus;
  tentativa: number;
  dataAgendada: string;
  dataEnvio?: string;
  erroMensagem?: string | null;
  loteNumero?: number;
  prioridade: number;
  whatsappConnectionId?: string;
  templateData?: {
    name: string;
    language: string;
    components?: any[];
  };
}

export type LandingPageTemplate = 'professional' | 'lead-magnet' | 'vsl' | 'minimalist' | 'event' | 'coupon' | 'offers';

export interface Attendant {
  id: string;
  nome: string;
  cargo: string;
  telefone: string;
  avatarUrl?: string;
  disponibilidade?: string;
}

export interface WhatsappWidgetConfig {
  enabled: boolean;
  posicao: 'left' | 'right';
  atendentes: Attendant[];
}

export interface  LandingPageSettings {
  titulo: string;
  subtitulo: string;
  destaque: string;
  descricao: string;
  beneficios: string[];
  formTitulo: string;
  formSubtitulo: string;
  botaoTexto: string;
  backgroundUrl: string;
  formColor: string;
  botaoColor: string;
  logoUrl?: string;
  headerColor?: string;
  downloadFileUrl?: string;
  videoUrl?: string;
  eventDate?: string;
  accentColor?: string;
  whatsapp?: WhatsappWidgetConfig;
  formActionType?: 'redirect' | 'download' | 'none';
  formActionUrl?: string;
  couponCode?: string;
  sendCouponEmail?: boolean;
  footerText?: string;
  privacyPolicyUrl?: string;
}

export interface LandingPageInstance {
  id: string;
  slug: string;
  templateId: LandingPageTemplate;
  config: LandingPageSettings;
  dataCriacao: string;
  isAtiva: boolean;
  visualizacoes?: number;
  cliquesTotais?: number;
}

export interface Settings {
  brevoApiKey?: string;
  remetenteNome?: string;
  remetenteEmail?: string;
  limiteDiario?: number;
  notificacoes?: {
    novosLeads?: boolean;
    errosEnvio?: boolean;
    novasMensagens?: boolean;
  };
  landingPage?: {
    titulo?: string;
    subtitulo?: string;
    destaque?: string;
    descricao?: string;
    beneficios?: string[];
    formTitulo?: string;
    formSubtitulo?: string;
    botaoTexto?: string;
    backgroundUrl?: string;
    formColor?: string;
    botaoColor?: string;
    logoUrl?: string;
    headerColor?: string;
    ogLogoUrl?: string;
    faviconUrl?: string;
    footerText?: string;
    privacyPolicyUrl?: string;
  };
  empresa?: {
    website?: string;
    endereco?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };
  whatsappWidget?: WhatsappWidgetConfig;
  omnichannel?: {
    messengerAccessToken?: string;
    instagramAccessToken?: string;
    metaVerifyToken?: string;
    evolutionApiUrl?: string; // URL base da Evolution API
    evolutionApiKey?: string; // Global API Key
    evolutionInstanceName?: string;
    tiktokAccessToken?: string;
    tiktokAppId?: string;
    tiktokAppSecret?: string;
    tiktokClientSecret?: string;
    tiktokRefreshToken?: string;
    tiktokTokenExpiry?: string;
    youtubeApiKey?: string;
    youtubeChannelId?: string;
    youtubeClientId?: string;
    youtubeClientSecret?: string;
    youtubeRefreshToken?: string;
    youtubeAccessToken?: string;
    youtubeTokenExpiry?: string;
  };
  appUrl?: string;

  autoresponder?: {
    enabled: boolean;
    message: string;
  };
  gtmId?: string; // ID do Google Tag Manager
}

// --- LINK NA BIO ---

export interface BioSocial {
  platform: 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'whatsapp' | 'linkedin' | 'twitter' | 'github' | 'threads' | 'shopee' | 'pinterest';
  url: string;
}

export interface BioItem {
  id: string;
  type: 'link' | 'product' | 'header' | 'video' | 'image' | 'carousel';
  title: string;
  subtitle?: string;
  url: string;
  videoUrl?: string;
  icon?: string;
  buttonText?: string;
  imageUrl?: string;
  carouselImages?: string[];
  price?: string;
  isActive: boolean;
  buttonColor?: string;
  buttonTextColor?: string;
}

export interface BioTheme {
  background: string;
  backgroundType?: 'solid' | 'gradient';
  backgroundGradient?: string;
  gradientColor1?: string;
  gradientColor2?: string;
  textColor: string;
  cardTextColor: string;
  socialIconColor: string;
  buttonBackground: string;
  buttonTextColor: string;
  cardBackground: string;
  fontFamily: string;
  style: 'glass' | 'flat' | 'gradient' | 'minimal';
}

export interface BioLink {
  id: string;
  slug: string;
  profileName: string;
  bio: string;
  avatarUrl: string;
  footerLogoUrl?: string;
  socials: BioSocial[];
  items: BioItem[];
  theme: BioTheme;
  dataCriacao: string;
  cliquesTotais: number;
  visualizacoes?: number; // Contador de visualizações do perfil
}

// --- USUÁRIOS E PERMISSÕES ---
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type UserRole = 'admin' | 'editor';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  status: UserStatus;
  role: UserRole;
  dataSolicitacao: string;
  dataAprovacao?: string;
}

export interface Segmentation {
  id: string;
  nome: string;
  descricao?: string;
  leadIds: string[];
  dataCriacao: string;
}

// --- POPUPS ---
export type PopupTrigger = 'timer' | 'exit-intent' | 'scroll';
export type PopupTemplate = 'simple' | 'image-left' | 'image-right' | 'image-top' | 'lead-form' | 'image-form-left' | 'image-form-right' | 'coupon' | 'horizontal-banner';

export interface PopupConfig {
  id: string;
  name: string;
  templateId: PopupTemplate;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  buttonText: string;
  buttonLink: string;
  couponCode?: string;
  trigger: PopupTrigger;
  triggerValue?: number; // segundos para timer, porcentagem para scroll
  isActive: boolean;
  dataCriacao: string;
  pages?: string[]; // Slugs das páginas onde deve aparecer (vazio = todas)
  theme?: {
    backgroundColor?: string;
    textColor?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    overlayColor?: string;
  };
}

// --- CONEXÕES WHATSAPP ---
export type WhatsappConnectionType = 'meta_official' | 'evolution_api';
export type WhatsappConnectionStatus = 'connected' | 'disconnected' | 'qr_code_ready' | 'pending';

export interface WhatsappTemplate {
  id: string;
  connectionId: string;
  name: string;          // Nome de referência na Meta (ex: boas_vindas_leads)
  category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
  language: string;      // ex: pt_BR
  content: string;       // O texto para visualização no CRM
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'UNKNOWN';
  components?: any[];    // Estrutura completa da Meta
  dataCriacao: string;
}

export interface WhatsappConnection {
  id: string;
  name: string;
  type: WhatsappConnectionType;
  status: WhatsappConnectionStatus;
  phoneNumber?: string;
  
  // Para API Oficial da Meta
  metaPhoneNumberId?: string;
  metaWabaId?: string; // ID da conta Business (WABA)
  metaAccessToken?: string;

  // Para Evolution API
  evolutionInstanceName?: string;
  evolutionApiKey?: string;
  qrCodeBase64?: string; // QR Code gerado para leitura

  isDefault: boolean;
  dataCriacao: string;
}

// --- OMNICHANNEL / CHAT ---
export type ChannelType = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok' | 'youtube' | 'system';

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string; // ID do Lead ou ID do Usuário do sistema
  senderName: string;
  content: string;
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'file';
  status: 'sent' | 'delivered' | 'read' | 'failed';
  isIncoming: boolean; // True se veio do lead, False se enviado pelo atendente
}

export interface ChatSession {
  id: string;
  leadId: string;
  leadName: string;
  leadAvatar?: string;
  channel: ChannelType;
  connectionId?: string; // ID da WhatsappConnection (se for whatsapp)
  connectionName?: string; // Nome da conexão (para display)
  lastMessage?: string;
  lastTimestamp?: string;
  unreadCount: number;
  status: 'active' | 'archived';
  assignedTo?: string; // ID do atendente
  lastPlatformMessageId?: string; // ID da mensagem na plataforma de origem (ex: commentId no YouTube)
  lastVideoId?: string; // ID do vídeo (para o YouTube)
  dataCriacao: string;
}

export interface InternalChat {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatarUrl?: string; // NOVO: Foto do grupo
  participantsJson: string; // JSON array of user uids
  lastMessage?: string;
  lastTimestamp?: string;
  dataCriacao: string;
}

export interface InternalMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  readByJson: string; // JSON array of user uids
  attachmentUrl?: string;
  attachmentName?: string;
  isEdited?: boolean; // NOVO
  isDeleted?: boolean; // NOVO
}
