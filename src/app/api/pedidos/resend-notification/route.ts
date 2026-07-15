import { NextResponse } from 'next/server';
import { d1Api } from '@/services/d1';
import { sendOmnichannelMessageAction } from '@/app/actions/chat';
import { Pedido } from '@/types/crm';

export const runtime = 'edge';

export async function POST(request: Request) {
  try {
    const { pedidoId, celular } = await request.json();

    if (!pedidoId || !celular) {
      return NextResponse.json({ error: 'Pedido ID e Celular são obrigatórios.' }, { status: 400 });
    }

    // 1. Localizar o pedido
    const pedidos = await d1Api.getPedidos();
    const pedido = pedidos.find((p: Pedido) => p.id === pedidoId);

    if (!pedido) {
      return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
    }

    const cleanPhone = celular.replace(/\D/g, '');
    if (!cleanPhone) {
      return NextResponse.json({ error: 'Número de celular inválido.' }, { status: 400 });
    }

    // 2. Atualizar o celular do lead no banco de dados
    await d1Api.executeRun(
      `UPDATE leads SET celular = ? WHERE id = ?`,
      [cleanPhone, pedido.leadId]
    );

    // 3. Buscar nome do lead para personalizar a mensagem
    const leadResult = await d1Api.runQuery(`SELECT nome FROM leads WHERE id = ? LIMIT 1`, [pedido.leadId]);
    const leadNome = leadResult.results?.[0]?.nome || 'Cliente';

    // 4. Carregar configurações do Bling
    const settings = await d1Api.getSettings();

    const orderRef = pedido.pedidoReferencia || pedido.id;
    const msgText = `Olá, *${leadNome}*! Seu pedido *#${orderRef}* foi enviado com sucesso! 🚀\n\nVocê pode acompanhar a entrega e rastrear seu pedido através do nosso portal:\n🔗 https://portal.visualsuper.com.br\n\nObrigado pela confiança! 😊`;

    let result: any;
    if (settings.bling?.templateName) {
      result = await sendOmnichannelMessageAction(
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
                { type: "text", text: leadNome },
                { type: "text", text: orderRef.toString() }
              ]
            }
          ]
        }
      );
    } else {
      result = await sendOmnichannelMessageAction(
        cleanPhone,
        'whatsapp',
        msgText
      );
    }

    const formattedDate = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    if (result && result.success) {
      const logText = `\n[WHATSAPP NOTIFICAÇÃO] Mensagem de envio enviada manualmente para +${cleanPhone} em ${formattedDate}.`;
      
      const currentObsResult = await d1Api.runQuery(`SELECT observacao FROM pedidos WHERE id = ? LIMIT 1`, [pedidoId]);
      const currentObs = currentObsResult.results?.[0]?.observacao || '';
      await d1Api.updatePedidoObservacao(pedidoId, currentObs + logText);

      return NextResponse.json({ success: true, message: 'Notificação enviada com sucesso!' });
    } else {
      const errorMsg = result?.error || 'Erro desconhecido';
      const logText = `\n[WHATSAPP NOTIFICAÇÃO FALHA] Falha no disparo manual para +${cleanPhone}: ${errorMsg} em ${formattedDate}.`;
      
      const currentObsResult = await d1Api.runQuery(`SELECT observacao FROM pedidos WHERE id = ? LIMIT 1`, [pedidoId]);
      const currentObs = currentObsResult.results?.[0]?.observacao || '';
      await d1Api.updatePedidoObservacao(pedidoId, currentObs + logText);

      return NextResponse.json({ error: `Erro ao enviar WhatsApp: ${errorMsg}` }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Erro na API de reenvio de notificação:', error);
    return NextResponse.json({ error: error.message || 'Erro interno do servidor' }, { status: 500 });
  }
}
