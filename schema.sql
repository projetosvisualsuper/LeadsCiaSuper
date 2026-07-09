-- Cloudflare D1 Database Schema for CRM

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  valueJson TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  celular TEXT,
  empresa TEXT,
  origem TEXT NOT NULL,
  dataCriacao TEXT NOT NULL,
  dataUltimaAtividade TEXT,
  status TEXT NOT NULL,
  tags TEXT, -- Comma-separated or JSON array
  consentimentoLGPD INTEGER DEFAULT 0,
  observacoes TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  cidade TEXT,
  estado TEXT,
  totalConversoes INTEGER DEFAULT 1,
  dataUltimaConversao TEXT,
  avatar TEXT,
  isMetaLead INTEGER DEFAULT 0,
  documento TEXT,
  faturamento REAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS campaigns (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  assunto TEXT NOT NULL,
  preheader TEXT,
  conteudoHtml TEXT NOT NULL,
  dataCriacao TEXT NOT NULL,
  dataAgendada TEXT,
  botaoTexto TEXT,
  botaoLink TEXT,
  status TEXT NOT NULL,
  channel TEXT NOT NULL,
  whatsappConnectionId TEXT,
  segmentId TEXT,
  whatsappTemplateId TEXT,
  totalLeads INTEGER DEFAULT 0,
  totalEnviados INTEGER DEFAULT 0,
  totalPendentes INTEGER DEFAULT 0,
  totalErro INTEGER DEFAULT 0,
  totalAbertos INTEGER DEFAULT 0,
  totalCliques INTEGER DEFAULT 0,
  textoSimples TEXT,
  bannerImg TEXT
);

CREATE TABLE IF NOT EXISTS queue (
  id TEXT PRIMARY KEY,
  campanhaId TEXT NOT NULL,
  leadId TEXT NOT NULL,
  email TEXT,
  telefone TEXT,
  channel TEXT NOT NULL,
  whatsappConnectionId TEXT,
  status TEXT NOT NULL,
  tentativa INTEGER DEFAULT 0,
  dataAgendada TEXT NOT NULL,
  dataEnvio TEXT,
  erroMensagem TEXT,
  loteNumero INTEGER,
  prioridade INTEGER DEFAULT 1,
  templateDataJson TEXT
);

CREATE TABLE IF NOT EXISTS landing_pages (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  templateId TEXT NOT NULL,
  configJson TEXT NOT NULL,
  dataCriacao TEXT NOT NULL,
  isAtiva INTEGER DEFAULT 1,
  visualizacoes INTEGER DEFAULT 0,
  cliquesTotais INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS bio_links (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  profileName TEXT NOT NULL,
  bio TEXT,
  avatarUrl TEXT,
  footerLogoUrl TEXT,
  socialsJson TEXT,
  itemsJson TEXT,
  themeJson TEXT,
  dataCriacao TEXT NOT NULL,
  cliquesTotais INTEGER DEFAULT 0,
  visualizacoes INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS users (
  uid TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  status TEXT NOT NULL,
  role TEXT NOT NULL,
  dataSolicitacao TEXT NOT NULL,
  dataAprovacao TEXT,
  passwordHash TEXT,
  salt TEXT,
  whatsappConnectionId TEXT
);

CREATE TABLE IF NOT EXISTS segmentations (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  leadIdsJson TEXT NOT NULL,
  dataCriacao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS popups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  templateId TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  imageUrl TEXT,
  buttonText TEXT NOT NULL,
  buttonLink TEXT NOT NULL,
  couponCode TEXT,
  trigger TEXT NOT NULL,
  triggerValue INTEGER,
  isActive INTEGER DEFAULT 1,
  dataCriacao TEXT NOT NULL,
  pagesJson TEXT,
  themeJson TEXT
);

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  leadName TEXT NOT NULL,
  leadAvatar TEXT,
  channel TEXT NOT NULL,
  connectionId TEXT,
  connectionName TEXT,
  lastMessage TEXT,
  lastTimestamp TEXT,
  unreadCount INTEGER DEFAULT 0,
  status TEXT NOT NULL,
  assignedTo TEXT,
  lastPlatformMessageId TEXT,
  lastVideoId TEXT,
  dataCriacao TEXT NOT NULL,
  isInternal INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chatId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  senderName TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  isIncoming INTEGER DEFAULT 0,
  mediaUrl TEXT,
  mediaMimeType TEXT,
  quotedMessageId TEXT,
  quotedMessageSender TEXT,
  quotedMessageContent TEXT
);

CREATE TABLE IF NOT EXISTS whatsapp_connections (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  phoneNumber TEXT,
  metaPhoneNumberId TEXT,
  metaWabaId TEXT,
  metaAccessToken TEXT,
  evolutionInstanceName TEXT,
  evolutionApiKey TEXT,
  qrCodeBase64 TEXT,
  isDefault INTEGER DEFAULT 0,
  dataCriacao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id TEXT PRIMARY KEY,
  connectionId TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL,
  componentsJson TEXT,
  dataCriacao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS internal_chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  name TEXT,
  participantsJson TEXT NOT NULL,
  lastMessage TEXT,
  lastTimestamp TEXT,
  dataCriacao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS internal_messages (
  id TEXT PRIMARY KEY,
  chatId TEXT NOT NULL,
  senderId TEXT NOT NULL,
  senderName TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  readByJson TEXT DEFAULT '[]',
  attachmentUrl TEXT,
  attachmentName TEXT,
  type TEXT DEFAULT 'text',
  quotedMessageId TEXT,
  quotedMessageSender TEXT,
  quotedMessageContent TEXT
);

CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  level TEXT NOT NULL,
  source TEXT NOT NULL,
  message TEXT NOT NULL,
  details TEXT,
  dataCriacao TEXT NOT NULL,
  isRead INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY,
  leadId TEXT NOT NULL,
  pedidoReferencia TEXT,
  itens TEXT,
  valor REAL,
  status TEXT DEFAULT 'pendente',
  isRead INTEGER DEFAULT 0,
  dataCriacao TEXT NOT NULL,
  observacao TEXT,
  origem TEXT DEFAULT 'site',
  numeroLojaVirtual TEXT
);

CREATE TABLE IF NOT EXISTS pipeline_automations (
  id TEXT PRIMARY KEY,
  statusOrigem TEXT NOT NULL,
  nome TEXT NOT NULL,
  ativo INTEGER DEFAULT 1,
  condicoesJson TEXT NOT NULL,
  tipoGatilho TEXT NOT NULL,
  gatilhoConfigJson TEXT NOT NULL,
  restricaoHorarioJson TEXT NOT NULL,
  destinatarioTipo TEXT NOT NULL,
  whatsappConnectionId TEXT,
  salesbotId TEXT,
  deixarSemResposta INTEGER DEFAULT 0,
  aplicarExistentes INTEGER DEFAULT 0,
  alterarEtapaPara TEXT,
  adicionarTags TEXT,
  atribuirUsuarioId TEXT,
  dataCriacao TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bots (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  nodesJson TEXT NOT NULL,
  edgesJson TEXT NOT NULL,
  ativo INTEGER DEFAULT 1,
  dataCriacao TEXT NOT NULL,
  dataAtualizacao TEXT NOT NULL
);
