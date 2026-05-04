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
  email: string;
  status: QueueStatus;
  tentativa: number;
  dataAgendada: string;
  dataEnvio?: string;
  erroMensagem?: string | null;
  loteNumero?: number;
  prioridade: number;
}

export type LandingPageTemplate = 'professional' | 'lead-magnet' | 'vsl' | 'minimalist' | 'event' | 'coupon';

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
}

export interface LandingPageInstance {
  id: string;
  slug: string;
  templateId: LandingPageTemplate;
  config: LandingPageSettings;
  dataCriacao: string;
  isAtiva: boolean;
}

export interface Settings {
  brevoApiKey: string;
  remetenteNome: string;
  remetenteEmail: string;
  limiteDiario: number;
  notificacoes: {
    novosLeads: boolean;
    errosEnvio: boolean;
  };
  landingPage: {
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
    ogLogoUrl?: string;
    faviconUrl?: string;
  };
  empresa: {
    website: string;
    endereco: string;
    facebook: string;
    instagram: string;
    linkedin: string;
    youtube: string;
  };
  whatsappWidget?: WhatsappWidgetConfig;
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
