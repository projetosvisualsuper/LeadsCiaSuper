import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { Pedido } from '@/types/crm';

export const runtime = 'edge';

const statusMap: Record<string, string> = {
  'pendente': 'pending',
  'em_atendimento': 'processing',
  'finalizado': 'completed',
  'cancelado': 'cancelled',
  'enviado': 'completed'
};

export async function POST(request: Request) {
  try {
    const { pedidoId, status } = await request.json();

    if (!pedidoId || !status) {
      return NextResponse.json({ error: 'Pedido ID e Status são obrigatórios' }, { status: 400 });
    }

    // 1. Atualizar o status localmente no D1
    await d1Api.updatePedidoStatus(pedidoId, status);

    // 2. Buscar o pedido para pegar a Referência (ID do WooCommerce)
    const pedidos = await d1Api.getPedidos();
    const pedido = pedidos.find((p: Pedido) => p.id === pedidoId);

    if (!pedido || !pedido.pedidoReferencia) {
      // Se não encontrou a referência, termina por aqui (sucesso local)
      return NextResponse.json({ success: true, message: 'Status atualizado localmente.' });
    }

    // 3. Buscar configurações para ver se o WooCommerce Sync está ativo
    const settings = await d1Api.getSettings();

    // 2.A Enviar WhatsApp automático se alterado para 'enviado' e notificações do Bling/Mercos estiverem ativas
    if (status === 'enviado' && settings.bling?.enabled && pedido) {
      try {
        const leadResult = await d1Api.runQuery(`SELECT nome, celular FROM leads WHERE id = ? LIMIT 1`, [pedido.leadId]);
        const targetLead = leadResult.results?.[0];
        
        if (targetLead && targetLead.celular) {
          const cleanPhone = targetLead.celular.replace(/\D/g, '');
          if (cleanPhone) {
            const orderRef = pedido.pedidoReferencia || pedido.id;
            const msgText = `Olá, *${targetLead.nome}*! Seu pedido *#${orderRef}* foi enviado com sucesso! 🚀\n\nVocê pode acompanhar a entrega e rastrear seu pedido através do nosso portal:\n🔗 https://portal.visualsuper.com.br\n\nObrigado pela confiança! 😊`;
            
            const { sendOmnichannelMessageAction } = await import('@/app/actions/chat');
            
            if (settings.bling.templateName) {
              await sendOmnichannelMessageAction(
                cleanPhone,
                'whatsapp',
                msgText,
                undefined,
                {
                  name: settings.bling.templateName,
                  language: settings.bling.templateLanguage || 'pt_BR',
                  components: [
                    {
                      type: "body",
                      parameters: [
                        { type: "text", text: targetLead.nome },
                        { type: "text", text: orderRef.toString() }
                      ]
                    }
                  ]
                }
              );
            } else {
              await sendOmnichannelMessageAction(
                cleanPhone,
                'whatsapp',
                msgText
              );
            }
          }
        }
      } catch (msgErr) {
        console.error('Erro ao disparar notificação de envio na alteração de status:', msgErr);
      }
    }

    const wcConfig = settings?.woocommerce;

    if (!wcConfig || !wcConfig.syncEnabled || !wcConfig.url || !wcConfig.consumerKey || !wcConfig.consumerSecret) {
      return NextResponse.json({ success: true, message: 'Status atualizado localmente (Sync Desativado).' });
    }

    // 4. Sincronizar com WooCommerce
    const wooStatus = statusMap[status];
    if (!wooStatus) {
      return NextResponse.json({ success: true, message: 'Status atualizado localmente (Status não mapeável para Woo).' });
    }

    // Limpar a URL para não ter barra no final
    const cleanUrl = wcConfig.url.endsWith('/') ? wcConfig.url.slice(0, -1) : wcConfig.url;
    const apiUrl = `${cleanUrl}/wp-json/wc/v3/orders/${pedido.pedidoReferencia}`;

    const authHeader = 'Basic ' + btoa(`${wcConfig.consumerKey}:${wcConfig.consumerSecret}`);

    const wooResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader
      },
      body: JSON.stringify({ status: wooStatus })
    });

    if (!wooResponse.ok) {
      const errorData = await wooResponse.text();
      console.error('Erro ao sincronizar com WooCommerce:', errorData);
      
      await d1Api.saveSystemLog({
        level: 'error',
        source: 'WooCommerce Sync',
        message: `Falha ao atualizar pedido ${pedido.pedidoReferencia} para ${wooStatus}: ${errorData}`,
        details: null
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Status atualizado localmente, mas falhou ao enviar para a loja.', 
        wooError: errorData 
      });
    }

    return NextResponse.json({ success: true, message: 'Status atualizado localmente e sincronizado com a loja!' });

  } catch (error: any) {
    console.error('Erro na rota de status do pedido:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
