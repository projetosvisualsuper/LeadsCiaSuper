import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  try {
    const { messageContent, context } = await req.json();

    if (!messageContent) {
      return NextResponse.json({ success: false, error: 'Mensagem não fornecida' }, { status: 400 });
    }

    // Aqui você integraria com a OpenAI ou outra IA.
    // Como exemplo estático (ou fallback):
    let suggestion = "Olá! Como posso ajudar você hoje?";
    
    const lowerMsg = messageContent.toLowerCase();
    
    if (lowerMsg.includes('preço') || lowerMsg.includes('valor')) {
      suggestion = "Nossos planos começam a partir de R$ 97/mês. Gostaria de ver as opções detalhadas?";
    } else if (lowerMsg.includes('bom dia') || lowerMsg.includes('boa tarde')) {
      suggestion = "Olá, tudo bem? Como posso ajudar você hoje?";
    } else if (lowerMsg.includes('obrigad')) {
      suggestion = "Por nada! Se precisar de mais alguma coisa, estamos à disposição.";
    } else if (lowerMsg.includes('audio') || lowerMsg.includes('áudio') || lowerMsg.includes('entendi')) {
      suggestion = "Perfeito! Qualquer dúvida, é só chamar.";
    } else if (lowerMsg.includes('sim') || lowerMsg.includes('ok') || lowerMsg.includes('certo')) {
      suggestion = "Maravilha. Vamos dar continuidade então.";
    } else {
      suggestion = "Entendi. Me conte mais detalhes para eu poder te ajudar da melhor forma.";
    }

    // Simular delay de IA
    await new Promise(resolve => setTimeout(resolve, 800));

    return NextResponse.json({ success: true, suggestion });
  } catch (error: any) {
    console.error('Erro ao gerar sugestão:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
