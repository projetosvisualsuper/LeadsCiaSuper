export const runtime = 'edge';

import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, updateDoc, doc, arrayUnion, getDoc, setDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

/**
 * Endpoint para converter um lead quando uma compra é realizada no site externo.
 * Aceita POST com JSON contendo email ou telefone.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Dados recebidos no webhook:', JSON.stringify(body));
    
    // Função auxiliar para buscar campo em objetos aninhados (comum em WooCommerce/Zapier)
    const getField = (obj: any, keys: string[]): string => {
      for (const key of keys) {
        if (obj[key] && typeof obj[key] !== 'object') return String(obj[key]);
      }
      // Busca em objetos aninhados comuns
      const subObjs = ['billing', 'customer', 'data', 'shipping', 'user'];
      for (const sub of subObjs) {
        if (obj[sub] && typeof obj[sub] === 'object') {
          for (const key of keys) {
            if (obj[sub][key] && typeof obj[sub][key] !== 'object') return String(obj[sub][key]);
          }
        }
      }
      return '';
    };

    const email = getField(body, ['email', 'email_address', 'user_email', 'billing_email']);
    const rawTelefone = getField(body, ['telefone', 'phone', 'celular', 'mobile', 'billing_phone', 'phone_number']);
    const telefone = rawTelefone.replace(/\D/g, '');
    
    // Tenta extrair nome completo ou primeiro/último nome
    let nome = getField(body, ['nome', 'name', 'full_name', 'billing_first_name', 'first_name']);
    const sobrenome = getField(body, ['sobrenome', 'last_name', 'billing_last_name']);
    if (nome && sobrenome && !nome.includes(sobrenome)) nome += ' ' + sobrenome;

    const valor = getField(body, ['valor', 'total', 'amount', 'order_total']);
    const pedidoId = getField(body, ['pedidoId', 'order_id', 'id', 'number', 'order_number']);

    if (!email && !telefone) {
      return NextResponse.json({ error: 'Identificador (email ou telefone) não encontrado no payload.' }, { status: 400 });
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
          await updateLead(leadDoc.id, nome, telefone, valor, pedidoId);
          return NextResponse.json({ success: true, message: 'Lead atualizado via telefone fixo.' });
        }
      }

      // Criar novo lead como convertido
      const leadId = Math.random().toString(36).substr(2, 9);
      const agora = new Date().toISOString();
      const newLead = {
        id: leadId,
        nome: nome || 'Cliente do Site',
        email: email,
        celular: telefone,
        status: 'convertido',
        tags: ['compra-realizada', 'conversao-direta'],
        origem: 'Conversão Direta (Site)',
        dataCriacao: agora,
        dataUltimaAtividade: agora,
        dataUltimaConversao: agora,
        totalConversoes: 1,
        consentimentoLGPD: true,
        observacoes: `[CONVERSÃO DIRETA] Cadastro automático via venda.${valor ? ` Valor: R$ ${valor}.` : ''}${pedidoId ? ` Pedido: ${pedidoId}.` : ''}`
      };

      await setDoc(doc(db, 'leads', leadId), newLead);

      return NextResponse.json({ success: true, message: 'Novo lead criado e convertido.', leadId });
    }

    // Atualizar o primeiro lead encontrado
    const leadDoc = querySnapshot.docs[0];
    await updateLead(leadDoc.id, nome, telefone, valor, pedidoId);

    return NextResponse.json({ success: true, message: 'Lead existente convertido.', leadId: leadDoc.id });

  } catch (error: any) {
    console.error('Erro na conversão:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

async function updateLead(leadId: string, nome?: string, celular?: string, valor?: string, pedidoId?: string) {
  const leadRef = doc(db, 'leads', leadId);
  const snap = await getDoc(leadRef);
  const data = snap.data();
  
  const newTags = ['compra-realizada'];
  if (valor) newTags.push(`valor-${valor}`);
  
  const novaObs = `\n[CONVERSÃO] Compra realizada${pedidoId ? ` (Pedido: ${pedidoId})` : ''}${valor ? ` no valor de R$ ${valor}` : ''} em ${new Date().toLocaleString('pt-BR')}`;
  
  const updateData: any = {
    status: 'convertido',
    dataUltimaAtividade: new Date().toISOString(),
    dataUltimaConversao: new Date().toISOString(),
    totalConversoes: (data?.totalConversoes || 1) + 1,
    tags: arrayUnion(...newTags),
    observacoes: (data?.observacoes || '') + novaObs
  };

  // Só atualiza se o dado recebido for válido e o atual for genérico
  if (nome && (!data?.nome || data.nome === 'Cliente do Site' || data.nome === 'Sem Nome' || data.nome === 'Sem nome')) {
    updateData.nome = nome;
  }
  
  if (celular && (!data?.celular || data.celular === '-')) {
    updateData.celular = celular;
  }
  
  await updateDoc(leadRef, updateData);
}
