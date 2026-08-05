import { d1Api } from '@/services/d1';

/**
 * Função para gerar hash SHA-256 exigido pela Meta para dados de usuário (LGPD / Privacidade)
 */
export async function sha256(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  leadId?: string;
  clientIp?: string;
  clientUserAgent?: string;
  fbc?: string;
  fbp?: string;
  fbclid?: string;
}

export interface MetaCapiEventPayload {
  eventName: 'Lead' | 'Purchase' | 'Contact' | 'Schedule' | 'CompleteRegistration' | 'Custom';
  customEventName?: string;
  userData: MetaUserData;
  customData?: {
    currency?: string;
    value?: number;
    status?: string;
    content_name?: string;
    content_category?: string;
    [key: string]: any;
  };
  eventSourceUrl?: string;
  actionSource?: 'system_generated' | 'website' | 'email' | 'other';
  testEventCode?: string;
}

/**
 * Envia um evento de conversão para a API de Conversões da Meta (Meta CAPI)
 */
export async function sendMetaCapiEvent(event: MetaCapiEventPayload): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const settings = await d1Api.getSettings();
    const omni = (settings?.omnichannel || settings || {}) as any;

    const capiEnabled = omni.metaCapiEnabled;
    const pixelId = omni.metaCapiPixelId?.trim();
    const accessToken = omni.metaCapiAccessToken?.trim();
    const testEventCode = event.testEventCode?.trim() || omni.metaCapiTestEventCode?.trim();

    if (!capiEnabled) {
      return { success: false, error: 'API de Conversões da Meta desativada nas Configurações.' };
    }

    if (!pixelId || !accessToken) {
      return { success: false, error: 'Pixel ID ou Access Token da Meta CAPI não configurados.' };
    }

    // Processar hashing dos dados do usuário
    const processedUserData: Record<string, any> = {};

    if (event.userData.email) {
      processedUserData.em = [await sha256(event.userData.email)];
    }

    if (event.userData.phone) {
      let cleanPhone = event.userData.phone.replace(/\D/g, '');
      if (cleanPhone.length === 10 || cleanPhone.length === 11) {
        cleanPhone = '55' + cleanPhone;
      }
      if (cleanPhone.length >= 8) {
        processedUserData.ph = [await sha256(cleanPhone)];
      }
    }

    if (event.userData.firstName) {
      const nameParts = event.userData.firstName.trim().split(/\s+/);
      const fn = nameParts[0];
      const ln = event.userData.lastName || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : undefined);
      
      if (fn) processedUserData.fn = [await sha256(fn)];
      if (ln) processedUserData.ln = [await sha256(ln)];
    } else if (event.userData.lastName) {
      processedUserData.ln = [await sha256(event.userData.lastName)];
    }

    if (event.userData.leadId) {
      processedUserData.lead_id = event.userData.leadId;
    }

    if (event.userData.clientIp) {
      processedUserData.client_ip_address = event.userData.clientIp;
    }

    if (event.userData.clientUserAgent) {
      processedUserData.client_user_agent = event.userData.clientUserAgent;
    }

    // Processar Identificação de Clique Meta Ads (fbc) e Navegador (fbp)
    let fbcVal = event.userData.fbc;
    if (!fbcVal && event.userData.fbclid) {
      const cleanFbclid = event.userData.fbclid.trim();
      if (cleanFbclid) {
        fbcVal = cleanFbclid.startsWith('fb.') ? cleanFbclid : `fb.1.${Date.now()}.${cleanFbclid}`;
      }
    }
    if (fbcVal) {
      processedUserData.fbc = fbcVal;
    }

    if (event.userData.fbp) {
      processedUserData.fbp = event.userData.fbp;
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = `event_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const eventDataPayload: any = {
      event_name: event.eventName === 'Custom' && event.customEventName ? event.customEventName : event.eventName,
      event_time: eventTime,
      event_id: eventId,
      action_source: event.actionSource || 'website',
      event_source_url: event.eventSourceUrl || 'https://leads.ciasuper.com.br',
      user_data: processedUserData,
      custom_data: {
        currency: event.customData?.currency || 'BRL',
        value: event.customData?.value || 0,
        status: event.customData?.status || 'completed',
        ...event.customData
      }
    };

    const requestBody: any = {
      data: [eventDataPayload]
    };

    if (testEventCode) {
      requestBody.test_event_code = testEventCode;
    }

    let url = `https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${accessToken}`;
    if (testEventCode) {
      url += `&test_event_code=${encodeURIComponent(testEventCode)}`;
    }

    console.log(`[Meta CAPI] Enviando evento '${eventDataPayload.event_name}' para Pixel ${pixelId} (Test Code: ${testEventCode || 'Nenhum'})...`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (response.ok) {
      console.log(`[Meta CAPI] Evento enviado com sucesso! Events Received: ${result.events_received || 1}`);
      return { success: true, result };
    } else {
      console.error(`[Meta CAPI] Erro ao enviar evento:`, result);
      return { success: false, error: result.error?.message || 'Erro na API da Meta', result };
    }
  } catch (err: any) {
    console.error(`[Meta CAPI] Exceção ao enviar evento:`, err);
    return { success: false, error: err.message || 'Exceção interna' };
  }
}
