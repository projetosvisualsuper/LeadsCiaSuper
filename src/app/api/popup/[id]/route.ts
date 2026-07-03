export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { api } from '@/services/api';

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const body = await request.json();
    const { nome, email, telefone } = body;

    if (!email && !telefone) {
      return new NextResponse(JSON.stringify({ error: 'E-mail ou telefone obrigatório' }), {
        status: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    const allPopups = await api.getPopups();
    const popup = allPopups.find(p => p.id === id);

    if (!popup) {
      return new NextResponse(JSON.stringify({ error: 'Pop-up não encontrado' }), {
        status: 404,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Content-Type': 'application/json'
        }
      });
    }

    // 1. Salvar Lead no D1
    const leadId = Math.random().toString(36).substr(2, 9);
    const agora = new Date().toISOString();
    const tags = ['popup', popup.name];
    if (popup.templateId === 'coupon' || popup.couponCode) {
      tags.push('cupom pop-up');
    }

    await api.saveLead({
      id: leadId,
      nome: nome || 'Lead de Pop-up',
      email: email || null,
      celular: telefone || null,
      origem: `Popup: ${popup.name}`,
      status: 'novo',
      tags: tags,
      consentimentoLGPD: true,
      dataCriacao: agora,
      dataUltimaAtividade: agora,
      observacoes: `[POPUP CAPTURE] Convertido via pop-up "${popup.name}" (modelo: ${popup.templateId}).`
    } as any);

    // 2. Se tiver configurado cupom e e-mail automático
    if (popup.couponCode && popup.theme?.sendCouponEmail && email) {
      const globalSettings = await api.getSettings();
      if (globalSettings?.brevoApiKey) {
        const remetenteNome = globalSettings.remetenteNome || 'Visual Super';
        const remetenteEmail = globalSettings.remetenteEmail || 'contato@visualsuper.com.br';
        
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; text-align: center;">Seu Cupom Chegou! 🎁</h2>
            <p>Olá <strong>${nome || 'Cliente'}</strong>,</p>
            <p>Parabéns! Você acaba de resgatar seu cupom de desconto exclusivo da <strong>${remetenteNome}</strong>.</p>
            <div style="background: #f8fafc; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0; border: 2px dashed #cbd5e1;">
              <span style="font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #1e293b;">${popup.couponCode}</span>
            </div>
            <p>Aproveite seu cupom exclusivo de desconto em nosso site. Use o código: <strong>${popup.couponCode}</strong> no carrinho de compras!</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #64748b; text-align: center;">Este e-mail foi enviado automaticamente após seu cadastro em nosso pop-up.</p>
          </div>
        `;

        try {
          await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'api-key': globalSettings.brevoApiKey,
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              sender: { name: remetenteNome, email: remetenteEmail },
              to: [{ email, name: nome || 'Cliente' }],
              subject: `🎁 Seu Cupom de Desconto: ${popup.couponCode}`,
              htmlContent: html
            })
          });
        } catch (mailErr) {
          console.error('Erro ao disparar email pelo Brevo na API do Popup:', mailErr);
        }
      }
    }

    return new NextResponse(JSON.stringify({ success: true, couponCode: popup.couponCode }), {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });

  } catch (error: any) {
    console.error('Erro ao processar post de popup:', error);
    return new NextResponse(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const allPopups = await api.getPopups();
    const popup = allPopups.find(p => p.id === id);

    if (!popup || !popup.isActive) {
      return new NextResponse('// Popup not found or inactive', {
        headers: { 
          'Content-Type': 'application/javascript',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
        },
      });
    }

    const cleanText = (str?: string) => {
      if (!str) return '';
      let res = str.replace(/\\text{/g, '').replace(/ext{/g, '');
      if (str.includes('text{') || str.includes('ext{')) {
        res = res.replace(/}/g, '');
      }
      return res.trim();
    };

    const cleanedPopup = {
      ...popup,
      title: cleanText(popup.title),
      subtitle: cleanText(popup.subtitle),
      buttonText: cleanText(popup.buttonText),
    };

    // Gerar o Script Vanilla JS
    const script = `
(function() {
  console.log('GerencyLeads Popup: Script carregado para o ID ${id}');
  const popupData = ${JSON.stringify(cleanedPopup)};
  const theme = popupData.theme || {};
  const template = popupData.templateId || 'simple';

  const popupVersion = [
    popupData.title,
    popupData.subtitle || '',
    popupData.imageUrl || '',
    popupData.buttonText,
    popupData.buttonLink,
    popupData.couponCode || '',
    popupData.trigger,
    popupData.triggerValue || 0,
    popupData.isActive,
    JSON.stringify(theme)
  ].join('|');

  const glHandleFormSubmit = async (event, formElement) => {
    event.preventDefault();
    const submitBtn = formElement.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerText;
    submitBtn.disabled = true;
    submitBtn.innerText = 'Enviando...';

    const inputs = formElement.querySelectorAll('input');
    const nome = inputs[0].value;
    const email = inputs[1].value;
    const telefone = inputs[2].value;

    const baseUrl = 'https://leads.ciasuper.com.br';
    try {
      const res = await fetch(baseUrl + '/api/popup/' + popupData.id, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, telefone })
      });

      if (!res.ok) throw new Error('Erro na requisição');
      const data = await res.json();

      // Salvar versão dismiss no localStorage após enviar formulário com sucesso
      localStorage.setItem('gl-popup-dismissed-' + popupData.id, popupVersion);

      if (popupData.couponCode) {
        const contentContainer = formElement.closest('.gl-popup-content');
        const overlay = contentContainer.closest('.gl-popup-overlay');

        // Resetar fundo para branco exatamente como o card da página de captura e definir largura para 420px
        contentContainer.style.background = 'white';
        contentContainer.style.color = '#1e293b';
        contentContainer.style.border = 'none';
        contentContainer.style.boxShadow = '0 25px 50px -12px rgba(0,0,0,0.5)';
        contentContainer.style.borderRadius = '24px';
        contentContainer.style.maxWidth = '420px';
        contentContainer.style.width = '100%';

        const couponCode = data.couponCode || popupData.couponCode;
        const sendEmail = ${JSON.stringify(!!popup.sendCouponEmail)};

        contentContainer.innerHTML = \`
          <button class="gl-popup-close" style="background: rgba(0,0,0,0.08); color: #64748b; border: none; cursor: pointer; position: absolute; top: 1rem; right: 1rem; width: 32px; height: 32px; border-radius: 50%; font-size: 1rem; display: flex; align-items: center; justify-content: center; z-index: 10;">✕</button>
          <div style="text-align: center; padding: 2.5rem 2rem; background: white; color: #1e293b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; box-sizing: border-box; width: 100%;">
            <div style="width: 80px; height: 80px; background: rgba(251,191,36,0.1); color: #fbbf24; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.5rem; font-size: 2.5rem; line-height: 1;">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="display: block; margin: auto;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </div>
            <h2 style="font-size: 2rem; font-weight: 800; margin: 0 0 0.5rem 0; color: #1e293b !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.2; display: block !important;">Sucesso!</h2>
            <p style="opacity: 1 !important; margin: 0 0 2rem 0; color: #475569 !important; font-size: 1.15rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; display: block !important;">Seu cadastro foi realizado e seu cupom de desconto foi liberado.</p>
            <div style="background: #f8fafc; padding: 1.5rem; border-radius: 16px; border: 2px dashed #e2e8f0; margin-bottom: 1.5rem; box-sizing: border-box;">
              <div style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; opacity: 0.6; margin-bottom: 0.5rem; color: #64748b; letter-spacing: 0.5px;">Código do Cupom</div>
              <div id="gl-coupon-code" style="font-size: 2.5rem; font-weight: 900; letter-spacing: 2px; color: #1e3a8a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">\${couponCode}</div>
            </div>
            <div style="display: grid; gap: 0.75rem; width: 100%;">
              <button id="gl-copy-btn" style="width: 100%; height: 58px; border-radius: 12px; background: #1e293b; color: white; font-weight: 800; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.75rem; font-size: 1.15rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; transition: background 0.2s;">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                Copiar Código
              </button>
              \${popupData.buttonLink ? \`<a href="\${popupData.buttonLink}" style="display:flex; align-items:center; justify-content:center; width:100%; height:64px; border-radius:12px; background:\${theme.buttonColor || '#fbbf24'}; color:#0f172a !important; font-weight:900; text-align:center; text-decoration:none; font-size:1.35rem; text-transform:uppercase; letter-spacing:0.5px; box-sizing:border-box; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">\${popupData.buttonText || 'OK, Continuar'}</a>\` : ''}
            </div>
            \${sendEmail ? \`
              <div style="margin-top: 1.5rem; font-size: 0.95rem; font-weight: 600; color: #10b981; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,12 2,6"></polyline></svg>
                Enviamos uma cópia para seu e-mail
              </div>
            \` : ''}
          </div>
        \`;

        const newCloseBtn = contentContainer.querySelector('.gl-popup-close');
        newCloseBtn.onclick = () => overlay.classList.remove('gl-popup-show');

        const copyBtn = contentContainer.querySelector('#gl-copy-btn');
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(couponCode);
          copyBtn.innerHTML = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg> Copiado!\`;
          setTimeout(() => {
            copyBtn.innerHTML = \`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle;"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copiar Código\`;
          }, 2000);
        };
      } else {
        if (popupData.buttonLink) {
          window.location.href = popupData.buttonLink;
        } else {
          submitBtn.disabled = false;
          submitBtn.innerText = originalBtnText;
          alert('Dados enviados com sucesso!');
        }
      }

    } catch (err) {
      console.error('Erro na submissão do pop-up:', err);
      if (popupData.buttonLink) {
        window.location.href = popupData.buttonLink;
      } else {
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
        alert('Erro ao enviar dados. Tente novamente.');
      }
    }
  };

  // Expor a função no escopo global
  window.glHandleFormSubmit = glHandleFormSubmit;

  const init = () => {
    if (document.getElementById('gl-popup-' + popupData.id)) {
      console.log('GerencyLeads Popup: Pop-up já renderizado na tela.');
      return;
    }

    // Verificar se o pop-up deve aparecer nesta página
    if (popupData.pages && popupData.pages.length > 0) {
      const currentUrl = window.location.href;
      const currentPath = window.location.pathname;
      const isPageAllowed = popupData.pages.some(pattern => {
        const cleanPattern = pattern.trim();
        if (!cleanPattern) return false;
        if (cleanPattern.startsWith('http://') || cleanPattern.startsWith('https://')) {
          return currentUrl.includes(cleanPattern);
        }
        return currentPath.includes(cleanPattern) || currentUrl.includes(cleanPattern);
      });
      
      if (!isPageAllowed) {
        console.log('GerencyLeads Popup: Ignorado porque esta URL não está listada nas páginas permitidas.');
        return;
      }
    }

    // Não exibir em páginas de captura / landing pages do próprio CRM
    if (document.querySelector('.lp-container') || document.querySelector('.lp-form-container') || document.getElementById('vsl-form')) {
      console.log('GerencyLeads Popup: Ignorado porque a página atual é uma página de captura do CRM.');
      return;
    }

    // CSS dinâmico
    const style = document.createElement('style');
    style.innerHTML = \`
      .gl-popup-overlay {
        position: fixed; inset: 0; z-index: 999999;
        display: flex; align-items: \${template === 'horizontal-banner' ? 'flex-end' : 'center'};
        justify-content: center; padding: \${template === 'horizontal-banner' ? '0' : '1.5rem'};
        background: \${template === 'horizontal-banner' ? 'transparent' : (theme.overlayColor || 'rgba(0,0,0,0.5)')};
        opacity: 0; pointer-events: none; transition: opacity 0.3s ease;
      }
      .gl-popup-content {
        position: relative; background: \${theme.backgroundColor || '#fff'};
        color: \${theme.textColor || '#1e293b'}; width: 100%;
        max-width: \${template === 'horizontal-banner' ? '100%' : (['image-left', 'image-right', 'image-form-left', 'image-form-right'].includes(template) ? '700px' : '450px')};
        border-radius: \${template === 'horizontal-banner' ? '0' : '24px'};
        overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
        transform: \${template === 'horizontal-banner' ? 'translateY(100%)' : 'scale(0.9) translateY(20px)'};
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.1);
        display: flex; flex-direction: column;
      }
      .gl-popup-content h2 {
        color: \${theme.textColor || '#1e293b'} !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
        font-weight: 800 !important;
        line-height: 1.25 !important;
        margin-top: 0 !important;
      }
      .gl-popup-content p {
        color: \${theme.textColor || '#1e293b'} !important;
        opacity: 0.8 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      .gl-popup-show { opacity: 1; pointer-events: auto; }
      .gl-popup-show .gl-popup-content { transform: translateY(0) scale(1); }
      .gl-popup-btn {
        display: block; padding: 1rem 2rem; border-radius: 12px; font-weight: 700;
        text-decoration: none; text-align: center; transition: transform 0.2s ease;
        background: \${theme.buttonColor || '#3b82f6'}; color: \${theme.buttonTextColor || '#fff'};
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      }
      .gl-popup-btn:hover { transform: scale(1.03); }
      .gl-popup-close {
        position: absolute; right: 1rem; top: 1rem; cursor: pointer;
        background: rgba(0,0,0,0.1); border: none; border-radius: 50%;
        width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
      }
    \`;
    document.head.appendChild(style);

    // Criar HTML
    const overlay = document.createElement('div');
    overlay.id = 'gl-popup-' + popupData.id;
    overlay.className = 'gl-popup-overlay';
    
    let contentHtml = '';
    const renderImage = popupData.imageUrl ? \`<img src="\${popupData.imageUrl}" style="width: 100%; height: \${template === 'horizontal-banner' ? '60px' : '200px'}; object-fit: cover;">\` : '';

    if (template === 'horizontal-banner') {
       contentHtml = \`
        <div style="display: flex; align-items: center; gap: 1.5rem; padding: 1rem 2rem; width: 100%;">
          \${popupData.imageUrl ? \`<div style="width: 80px; height: 50px; border-radius: 8px; overflow: hidden; flex-shrink: 0;"><img src="\${popupData.imageUrl}" style="width:100%; height:100%; object-fit:cover;"></div>\` : ''}
          <div style="flex: 1;">
            <h2 style="margin:0; font-size: 1.1rem; font-weight: 800;">\${popupData.title}</h2>
            <p style="margin:0; font-size: 0.85rem; opacity: 0.7;">\${popupData.subtitle || ''}</p>
            \${popupData.couponCode ? \`
               <div style="background: #f8fafc; padding: 0.4rem 0.8rem; border-radius: 8px; border: 1px dashed #e2e8f0; margin-top: 0.4rem; display: inline-flex; align-items: center; gap: 0.5rem;">
                  <span style="font-size: 0.8rem; font-weight: 900; letter-spacing: 1px; color: \${theme.buttonColor || '#3b82f6'};">\${popupData.couponCode}</span>
                  <button id="gl-copy-btn" style="background: #1e293b; color: white; border: none; border-radius: 4px; padding: 0.1rem 0.4rem; font-size: 0.7rem; cursor: pointer; font-weight: bold;">Copiar</button>
               </div>
            \` : ''}
          </div>
          <a href="\${popupData.buttonLink}" class="gl-popup-btn" style="padding: 0.6rem 1.5rem; font-size: 0.9rem;">\${popupData.buttonText}</a>
        </div>
       \`;
    } else if (template === 'coupon') {
       contentHtml = \`
        <div style="display: flex; min-height: 350px; flex-direction: column;">
          <div style="padding: 2.5rem; display: flex; flex-direction: column; justify-content: center; text-align: center; width: 100%; box-sizing: border-box;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">🎁</div>
            <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem;">\${popupData.title}</h2>
            <p style="opacity: 0.7; margin-bottom: 1.5rem;">\${popupData.subtitle || ''}</p>
            <form onsubmit="glHandleFormSubmit(event, this)" style="display: grid; gap: 0.75rem; width: 100%;">
              <input required placeholder="Seu Nome" style="padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b; background-color: #ffffff; width: 100%; box-sizing: border-box;">
              <input required type="email" placeholder="Seu E-mail" style="padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b; background-color: #ffffff; width: 100%; box-sizing: border-box;">
              <input required type="tel" placeholder="Seu WhatsApp" style="padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b; background-color: #ffffff; width: 100%; box-sizing: border-box;">
              <button type="submit" class="gl-popup-btn" style="border:none; cursor:pointer; width: 100%;">\${popupData.buttonText}</button>
            </form>
          </div>
        </div>
       \`;
    } else if (template === 'lead-form' || template.includes('form')) {
       const isSide = template.includes('form-');
       const isImgLeft = template === 'image-form-left';
       contentHtml = \`
        <div style="display: flex; min-height: 350px; flex-direction: \${window.innerWidth < 640 ? 'column' : (isImgLeft ? 'row' : (template === 'image-form-right' ? 'row-reverse' : 'column'))}">
          \${isSide ? \`<div style="flex: 1; min-height:200px;"><img src="\${popupData.imageUrl}" style="width:100%; height:100%; object-fit:cover;"></div>\` : ''}
          <div style="flex: 1.2; padding: 2.5rem; display: flex; flex-direction: column; justify-content: center; text-align: center;">
            \${!isSide ? renderImage : ''}
            <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 0.5rem;">\${popupData.title}</h2>
            <p style="opacity: 0.7; margin-bottom: 1.5rem;">\${popupData.subtitle || ''}</p>
            <form onsubmit="glHandleFormSubmit(event, this)" style="display: grid; gap: 0.75rem;">
              <input required placeholder="Seu Nome" style="padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b; background-color: #ffffff;">
              <input required type="email" placeholder="Seu E-mail" style="padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b; background-color: #ffffff;">
              <input required type="tel" placeholder="Seu WhatsApp" style="padding: 0.75rem; border-radius: 8px; border: 1px solid #e2e8f0; color: #1e293b; background-color: #ffffff;">
              <button type="submit" class="gl-popup-btn" style="border:none; cursor:pointer;">\${popupData.buttonText}</button>
            </form>
          </div>
        </div>
       \`;
    } else {
       const isSide = template === 'image-left' || template === 'image-right';
       contentHtml = \`
        <div style="display: flex; min-height: 350px; flex-direction: \${window.innerWidth < 640 ? 'column' : (template === 'image-right' ? 'row-reverse' : (isSide ? 'row' : 'column'))}">
          \${isSide || template === 'image-top' ? \`<div style="flex: 1; min-height:200px;"><img src="\${popupData.imageUrl}" style="width:100%; height:100%; object-fit:cover;"></div>\` : ''}
          <div style="flex: 1; padding: 2.5rem; display: flex; flex-direction: column; justify-content: center; text-align: \${isSide ? 'left' : 'center'};">
            \${popupData.couponCode ? '<div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎁</div>' : (template === 'simple' ? renderImage : '')}
            <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem;">\${popupData.title}</h2>
            <p style="opacity: 0.8; margin-bottom: 2rem;">\${popupData.subtitle || ''}</p>
            \${popupData.couponCode ? \`
               <div style="background: #f8fafc; padding: 1.25rem; border-radius: 16px; border: 2px dashed #e2e8f0; margin-bottom: 1.5rem; text-align: center;">
                  <div style="font-size: 0.7rem; font-weight: 700; text-transform: uppercase; opacity: 0.5; margin-bottom: 0.25rem;">Seu Cupom</div>
                  <div style="font-size: 1.75rem; font-weight: 900; letter-spacing: 1px; color: \${theme.buttonColor || '#3b82f6'};">\${popupData.couponCode}</div>
               </div>
               <div style="display: grid; gap: 0.5rem; width: 100%;">
                 <button id="gl-copy-btn" style="width: 100%; height: 42px; border-radius: 8px; background: #1e293b; color: white; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.9rem;">
                    Copiar Código
                 </button>
                 \${popupData.buttonLink ? \`<a href="\${popupData.buttonLink}" class="gl-popup-btn" style="background: \${theme.buttonColor || '#3b82f6'}; color: \${theme.buttonTextColor || '#fff'};">\${popupData.buttonText}</a>\` : ''}
               </div>
            \` : \`
               <a href="\${popupData.buttonLink}" class="gl-popup-btn">\${popupData.buttonText}</a>
            \`}
          </div>
        </div>
       \`;
    }

    overlay.innerHTML = \`
      <div class="gl-popup-content">
        <button class="gl-popup-close">✕</button>
        \${contentHtml}
        <div style="padding: 0 2.5rem 1.5rem; text-align: center;">
          <button style="background:none; border:none; opacity:0.5; font-size:0.8rem; cursor:pointer;" class="gl-popup-decline">Não, obrigado.</button>
        </div>
      </div>
    \`;

    document.body.appendChild(overlay);

    const dismissPopup = () => {
      localStorage.setItem('gl-popup-dismissed-' + popupData.id, popupVersion);
      overlay.classList.remove('gl-popup-show');
    };

    const closeBtn = overlay.querySelector('.gl-popup-close');
    if (closeBtn) closeBtn.onclick = dismissPopup;

    const declineBtn = overlay.querySelector('.gl-popup-decline');
    if (declineBtn) declineBtn.onclick = dismissPopup;

    // Vincular cópia se houver botão estático de cópia
    const staticCopyBtn = overlay.querySelector('#gl-copy-btn');
    if (staticCopyBtn && popupData.couponCode) {
      staticCopyBtn.onclick = () => {
        navigator.clipboard.writeText(popupData.couponCode);
        const originalText = staticCopyBtn.innerText;
        staticCopyBtn.innerText = '✓ Copiado!';
        setTimeout(() => { staticCopyBtn.innerText = originalText; }, 2000);
      };
    }
    
    const show = () => {
      const isDebug = window.location.search.includes('debug_popup=true') || window.location.search.includes('preview=true');
      const savedVersion = localStorage.getItem('gl-popup-dismissed-' + popupData.id);
      if (!isDebug && savedVersion === popupVersion) {
        console.log('GerencyLeads Popup: Ignorado porque já foi fechado/enviado nesta versão.');
        return;
      }
      overlay.classList.add('gl-popup-show');
      console.log('GerencyLeads Popup: Exibido com sucesso!');
    };

    // Gatilhos
    if (popupData.trigger === 'timer') {
      setTimeout(show, (popupData.triggerValue || 5) * 1000);
    } else if (popupData.trigger === 'exit-intent') {
      // Desktop mouse leave
      const handleMouseLeave = (e) => {
        if (e.clientY < 15 && (!e.relatedTarget || e.clientY <= 0)) {
          show();
        }
      };
      document.addEventListener('mouseleave', handleMouseLeave);

      // Mobile / generic visibility change
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          show();
        }
      });

      // Mobile scroll-up behavior
      let lastScrollTop = 0;
      const handleScrollMobile = () => {
        const st = window.pageYOffset || document.documentElement.scrollTop;
        if (st < lastScrollTop && st < 150 && lastScrollTop - st > 30) {
          show();
        }
        lastScrollTop = st;
      };
      window.addEventListener('scroll', handleScrollMobile, { passive: true });
    } else if (popupData.trigger === 'scroll') {
      window.addEventListener('scroll', () => {
        const scrollPercent = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent >= (popupData.triggerValue || 50)) show();
      });
    }
  };

  if (document.body) {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
    `;

    return new NextResponse(script, {
      headers: {
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error rendering popup script:', error);
    const errMessage = error instanceof Error ? error.message : String(error);
    return new NextResponse(`// Error loading popup: ${errMessage}`, {
      headers: { 
        'Content-Type': 'application/javascript',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      },
    });
  }
}
