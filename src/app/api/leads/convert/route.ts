import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para converter um lead quando uma compra é realizada no site externo.
 * Aceita POST com JSON contendo email ou telefone.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, telefone, valor, pedidoId } = body;

    if (!email && !telefone) {
      return NextResponse.json({ error: 'É necessário informar email ou telefone para identificar o lead.' }, { status: 400 });
    }

    const leadsRef = collection(db, 'leads');
    let q;

    if (email) {
      q = query(leadsRef, where('email', '==', email));
    } else {
      q = query(leadsRef, where('celular', '==', telefone));
    }

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      // Se não encontrar por celular, tenta por telefone fixo se foi passado telefone
      if (!email && telefone) {
        const q2 = query(leadsRef, where('telefone', '==', telefone));
        const snap2 = await getDocs(q2);
        if (!snap2.empty) {
          const leadDoc = snap2.docs[0];
          await updateLead(leadDoc.id, leadDoc.data().tags || [], valor, pedidoId);
          return NextResponse.json({ success: true, message: 'Lead convertido com sucesso (via telefone fixo).' });
        }
      }

      // NOVO: Se não encontrou de jeito nenhum, cria um novo lead como convertido
      const leadId = Math.random().toString(36).substr(2, 9);
      const newLead = {
        id: leadId,
        nome: body.nome || 'Cliente do Site',
        email: email || '',
        celular: telefone || '',
        status: 'convertido',
        tags: ['compra-realizada', 'conversao-direta'],
        origem: 'Conversão Direta (Site)',
        dataCriacao: new Date().toISOString(),
        consentimentoLGPD: true,
        observacoes: `[CONVERSÃO DIRETA] Lead criado automaticamente a partir de uma compra no site.${valor ? ` Valor: R$ ${valor}.` : ''}${pedidoId ? ` Pedido: ${pedidoId}.` : ''}`
      };

      const { setDoc, doc: firestoreDoc } = await import('firebase/firestore');
      await setDoc(firestoreDoc(db, 'leads', leadId), newLead);

      return NextResponse.json({ 
        success: true, 
        message: 'Novo lead criado e convertido com sucesso.',
        leadId: leadId
      });
    }

    // Atualizar o primeiro lead encontrado
    const leadDoc = querySnapshot.docs[0];
    await updateLead(leadDoc.id, leadDoc.data().tags || [], valor, pedidoId);

    return NextResponse.json({ 
      success: true, 
      message: 'Lead convertido com sucesso.',
      leadId: leadDoc.id
    });

  } catch (error: any) {
    console.error('Erro na conversão de lead:', error);
    return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
  }
}

async function updateLead(leadId: string, currentTags: string[], valor?: string, pedidoId?: string) {
  const leadRef = doc(db, 'leads', leadId);
  const snap = await getDoc(leadRef);
  const data = snap.data();
  
  const newTags = ['compra-realizada'];
  if (valor) newTags.push(`valor-${valor}`);
  
  const novaObs = `\n[CONVERSÃO] Compra realizada${pedidoId ? ` (Pedido: ${pedidoId})` : ''}${valor ? ` no valor de R$ ${valor}` : ''} em ${new Date().toLocaleString('pt-BR')}`;
  
  await updateDoc(leadRef, {
    status: 'convertido',
    tags: arrayUnion(...newTags),
    observacoes: (data?.observacoes || '') + novaObs
  });
}
