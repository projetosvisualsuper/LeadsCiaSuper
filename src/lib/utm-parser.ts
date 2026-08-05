/**
 * Utilitário para captura e extração de parâmetros UTM (Rastreamento de Marketing)
 */

export interface UtmParams {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  fbc?: string;
  fbp?: string;
  fbclid?: string;
}

/**
 * Extrai parâmetros UTM a partir de uma URL ou string de busca (ex: ?utm_source=google&utm_medium=cpc)
 */
export function extractUtmsFromUrl(urlOrQuery?: string): UtmParams {
  if (!urlOrQuery) return {};
  
  try {
    const queryString = urlOrQuery.includes('?') 
      ? urlOrQuery.substring(urlOrQuery.indexOf('?')) 
      : (urlOrQuery.startsWith('utm_') ? `?${urlOrQuery}` : urlOrQuery);
      
    const params = new URLSearchParams(queryString);
    const utm_source = params.get('utm_source') || params.get('source') || undefined;
    const utm_medium = params.get('utm_medium') || params.get('medium') || undefined;
    const utm_campaign = params.get('utm_campaign') || params.get('campaign') || undefined;
    const fbclid = params.get('fbclid') || undefined;
    let fbc = params.get('fbc') || undefined;
    let fbp = params.get('fbp') || undefined;

    if (typeof document !== 'undefined' && document.cookie) {
      const matchFbc = document.cookie.match(/(?:^|;\s*)_fbc=([^;]+)/);
      if (matchFbc) fbc = matchFbc[1];
      const matchFbp = document.cookie.match(/(?:^|;\s*)_fbp=([^;]+)/);
      if (matchFbp) fbp = matchFbp[1];
    }

    if (!fbc && fbclid) {
      fbc = `fb.1.${Date.now()}.${fbclid}`;
    }

    return {
      ...(utm_source ? { utm_source } : {}),
      ...(utm_medium ? { utm_medium } : {}),
      ...(utm_campaign ? { utm_campaign } : {}),
      ...(fbc ? { fbc } : {}),
      ...(fbp ? { fbp } : {}),
      ...(fbclid ? { fbclid } : {})
    };
  } catch (e) {
    return {};
  }
}

/**
 * Extrai parâmetros UTM a partir do texto da mensagem ou do payload de anúncio (Meta Ads Click-to-WhatsApp)
 */
export function extractUtmsFromTextOrPayload(text?: string, referralPayload?: any): UtmParams {
  const result: UtmParams = {};

  // 1. Tentar extrair do objeto 'referral' do Meta Ads (Click to WhatsApp / Instagram / Messenger)
  if (referralPayload) {
    const sourceUrl = referralPayload.source_url || referralPayload.sourceUrl || referralPayload.url || referralPayload.ref || referralPayload.referral_link;
    if (sourceUrl) {
      const fromUrl = extractUtmsFromUrl(sourceUrl);
      if (fromUrl.utm_source) result.utm_source = fromUrl.utm_source;
      if (fromUrl.utm_medium) result.utm_medium = fromUrl.utm_medium;
      if (fromUrl.utm_campaign) result.utm_campaign = fromUrl.utm_campaign;
      if (fromUrl.fbc) result.fbc = fromUrl.fbc;
      if (fromUrl.fbp) result.fbp = fromUrl.fbp;
      if (fromUrl.fbclid) result.fbclid = fromUrl.fbclid;

      if (!result.utm_source && typeof referralPayload.ref === 'string' && referralPayload.ref.trim() && !referralPayload.ref.includes('=')) {
        result.utm_campaign = referralPayload.ref.trim();
      }
    }

    if (!result.utm_source && (referralPayload.source_type || referralPayload.sourceType || referralPayload.source)) {
      const srcType = (referralPayload.source_type || referralPayload.sourceType || referralPayload.source || 'ad').toString().toLowerCase();
      result.utm_source = srcType === 'ad' || srcType === 'ads' ? 'meta_ads' : `meta_${srcType}`;
    }

    if (!result.utm_medium && (referralPayload.ad_id || referralPayload.adId || referralPayload.ad_name)) {
      result.utm_medium = referralPayload.ad_name || `ad_${referralPayload.ad_id || referralPayload.adId}`;
    }

    if (!result.utm_campaign && (referralPayload.headline || referralPayload.title || referralPayload.campaign_name || referralPayload.campaign_id || referralPayload.source_id || referralPayload.sourceId)) {
      result.utm_campaign = referralPayload.headline || referralPayload.title || referralPayload.campaign_name || `campaign_${referralPayload.campaign_id || referralPayload.source_id || referralPayload.sourceId}`;
    }
  }

  // 2. Tentar extrair do texto da mensagem (caso o link do anúncio passe UTMs formatadas no texto)
  if (text) {
    const fromText = extractUtmsFromUrl(text);
    if (!result.utm_source && fromText.utm_source) result.utm_source = fromText.utm_source;
    if (!result.utm_medium && fromText.utm_medium) result.utm_medium = fromText.utm_medium;
    if (!result.utm_campaign && fromText.utm_campaign) result.utm_campaign = fromText.utm_campaign;
    if (!result.fbc && fromText.fbc) result.fbc = fromText.fbc;
    if (!result.fbp && fromText.fbp) result.fbp = fromText.fbp;
    if (!result.fbclid && fromText.fbclid) result.fbclid = fromText.fbclid;

    // Regex simples para identificar utm_source=xxx no meio do texto
    if (!result.utm_source) {
      const matchSource = text.match(/utm_source=([^\s&"'#]+)/i);
      if (matchSource) result.utm_source = decodeURIComponent(matchSource[1]);
    }
    if (!result.utm_medium) {
      const matchMedium = text.match(/utm_medium=([^\s&"'#]+)/i);
      if (matchMedium) result.utm_medium = decodeURIComponent(matchMedium[1]);
    }
    if (!result.utm_campaign) {
      const matchCampaign = text.match(/utm_campaign=([^\s&"'#]+)/i);
      if (matchCampaign) result.utm_campaign = decodeURIComponent(matchCampaign[1]);
    }
    if (!result.fbclid) {
      const matchFbclid = text.match(/fbclid=([^\s&"'#]+)/i);
      if (matchFbclid) {
        result.fbclid = decodeURIComponent(matchFbclid[1]);
        result.fbc = `fb.1.${Date.now()}.${result.fbclid}`;
      }
    }
  }

  return result;
}

/**
 * Salva os UTMs no sessionStorage/localStorage no navegador para não perder quando o lead navega
 */
export function saveUtmsToStorage(utms: UtmParams) {
  if (typeof window === 'undefined') return;
  try {
    if (utms.utm_source) sessionStorage.setItem('cs_utm_source', utms.utm_source);
    if (utms.utm_medium) sessionStorage.setItem('cs_utm_medium', utms.utm_medium);
    if (utms.utm_campaign) sessionStorage.setItem('cs_utm_campaign', utms.utm_campaign);
    if (utms.fbc) sessionStorage.setItem('cs_fbc', utms.fbc);
    if (utms.fbp) sessionStorage.setItem('cs_fbp', utms.fbp);
    if (utms.fbclid) sessionStorage.setItem('cs_fbclid', utms.fbclid);
  } catch (e) {}
}

/**
 * Recupera os UTMs salvos do sessionStorage no navegador
 */
export function getSavedUtmsFromStorage(): UtmParams {
  if (typeof window === 'undefined') return {};
  try {
    const utm_source = sessionStorage.getItem('cs_utm_source') || undefined;
    const utm_medium = sessionStorage.getItem('cs_utm_medium') || undefined;
    const utm_campaign = sessionStorage.getItem('cs_utm_campaign') || undefined;
    const fbc = sessionStorage.getItem('cs_fbc') || undefined;
    const fbp = sessionStorage.getItem('cs_fbp') || undefined;
    const fbclid = sessionStorage.getItem('cs_fbclid') || undefined;
    return {
      ...(utm_source ? { utm_source } : {}),
      ...(utm_medium ? { utm_medium } : {}),
      ...(utm_campaign ? { utm_campaign } : {}),
      ...(fbc ? { fbc } : {}),
      ...(fbp ? { fbp } : {}),
      ...(fbclid ? { fbclid } : {})
    };
  } catch (e) {
    return {};
  }
}
