export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { api } from '@/services/api';

export async function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
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

    const theme = popup.theme || {};
    const template = popup.templateId || 'simple';

    // Gerar o Script Vanilla JS
    const script = `
(function() {
  console.log('GerencyLeads Popup: Script carregado para o ID ${id}');
  const popupData = ${JSON.stringify(popup)};
  const theme = popupData.theme || {};
  const template = popupData.templateId || 'simple';

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
          </div>
          <a href="\${popupData.buttonLink}" class="gl-popup-btn" style="padding: 0.6rem 1.5rem; font-size: 0.9rem;">\${popupData.buttonText}</a>
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
            <form onsubmit="event.preventDefault(); window.location.href='\${popupData.buttonLink}'" style="display: grid; gap: 0.75rem;">
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
            \${template === 'simple' ? renderImage : ''}
            <h2 style="font-size: 1.75rem; font-weight: 800; margin-bottom: 1rem;">\${popupData.title}</h2>
            <p style="opacity: 0.8; margin-bottom: 2rem;">\${popupData.subtitle || ''}</p>
            <a href="\${popupData.buttonLink}" class="gl-popup-btn">\${popupData.buttonText}</a>
          </div>
        </div>
       \`;
    }

    overlay.innerHTML = \`
      <div class="gl-popup-content">
        <button class="gl-popup-close">✕</button>
        \${contentHtml}
        <div style="padding: 0 2.5rem 1.5rem; text-align: center;">
          <button style="background:none; border:none; opacity:0.5; font-size:0.8rem; cursor:pointer;" onclick="this.closest('.gl-popup-overlay').classList.remove('gl-popup-show')">Não, obrigado.</button>
        </div>
      </div>
    \`;

    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.gl-popup-close');
    closeBtn.onclick = () => overlay.classList.remove('gl-popup-show');
    
    const show = () => {
      const isDebug = window.location.search.includes('debug_popup=true') || window.location.search.includes('preview=true');
      if (!isDebug && sessionStorage.getItem('gl-popup-closed-' + popupData.id)) {
        console.log('GerencyLeads Popup: Ignorado porque já foi fechado nesta sessão.');
        return;
      }
      overlay.classList.add('gl-popup-show');
      if (!isDebug) {
        sessionStorage.setItem('gl-popup-closed-' + popupData.id, 'true');
      }
      console.log('GerencyLeads Popup: Exibido com sucesso!');
    };

    // Gatilhos
    if (popupData.trigger === 'timer') {
      setTimeout(show, (popupData.triggerValue || 5) * 1000);
    } else if (popupData.trigger === 'exit-intent') {
      // Desktop mouse leave
      const handleMouseLeave = (e) => {
        if (e.clientY < 20 || !e.relatedTarget) {
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

