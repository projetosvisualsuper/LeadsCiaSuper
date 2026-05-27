'use server';

import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  updateDoc, 
  doc, 
  query, 
  where,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { FilaEnvio, Campaign, Settings, Lead } from '@/types/crm';
import { sendEmailBrevoAction, getBrevoCreditsAction } from './brevo';

import { sendOmnichannelMessageAction } from './chat';

/**
 * Processa a fila de e-mails e whatsapp no servidor.
 * Pode ser chamado via UI ou via Cron Job.
 */
export async function processQueueServerAction() {
  console.log('Iniciando processamento de fila no servidor...');

  try {
    // 1. Buscar Configurações
    const settingsSnap = await getDoc(doc(db, 'settings', 'global'));
    if (!settingsSnap.exists()) return { success: false, message: 'Configurações não encontradas.' };
    const settings = settingsSnap.data() as Settings;

    // 2. Verificar Campanhas Agendadas que já devem começar
    const now = new Date().toISOString();
    const scheduledQuery = query(
      collection(db, 'campaigns'),
      where('status', '==', 'agendada')
    );
    const scheduledSnap = await getDocs(scheduledQuery);
    
    for (const campaignDoc of scheduledSnap.docs) {
      const camp = campaignDoc.data() as Campaign;
      if (camp.dataAgendada && camp.dataAgendada <= now) {
        console.log(`Iniciando campanha agendada: ${camp.nome} (${camp.channel})`);
        
        // Buscar todos os leads
        const leadsSnap = await getDocs(collection(db, 'leads'));
        const leads: Lead[] = [];
        leadsSnap.forEach(d => leads.push({ id: d.id, ...d.data() } as Lead));

        // Gerar fila para esta campanha
        for (const lead of leads) {
          const queueId = Math.random().toString(36).substr(2, 9);
          
          await setDoc(doc(db, 'queue', queueId), {
            id: queueId,
            campanhaId: camp.id,
            leadId: lead.id,
            email: camp.channel === 'email' ? lead.email : undefined,
            telefone: camp.channel === 'whatsapp' ? (lead.celular || lead.telefone) : undefined,
            channel: camp.channel,
            status: 'pendente',
            tentativa: 0,
            dataAgendada: now,
            prioridade: 1
          });
        }

        // Atualizar status da campanha para em execução
        await updateDoc(doc(db, 'campaigns', camp.id), {
          status: 'em execução',
          totalLeads: leads.length,
          totalPendentes: leads.length
        });
      }
    }

    // 3. Buscar itens pendentes na fila
    const q = query(
      collection(db, 'queue'),
      where('status', 'in', ['pendente', 'erro'])
    );
    const queueSnapshot = await getDocs(q);
    
    let pendingItems: FilaEnvio[] = [];
    queueSnapshot.forEach(doc => {
      const data = doc.data() as FilaEnvio;
      if (data.status === 'pendente' || (data.status === 'erro' && data.tentativa < 3)) {
        pendingItems.push({ ...data, id: doc.id });
      }
    });

    // Limite diário (para e-mail ainda é importante)
    const dailyConfig = settings.limiteDiario || 280;
    
    // Pegar apenas o que cabe no limite (simplificado: limitando total, mas whatsapp poderia ter limite diferente)
    pendingItems = pendingItems.slice(0, dailyConfig);

    if (pendingItems.length === 0) {
      return { success: true, message: 'Nenhum item pendente para processar.' };
    }

    console.log(`Processando ${pendingItems.length} itens na fila...`);

    // 4. Buscar Campanhas necessárias para o processamento
    const campaignsSnap = await getDocs(collection(db, 'campaigns'));
    const campaigns: Campaign[] = [];
    campaignsSnap.forEach(d => campaigns.push({ id: d.id, ...d.data() } as Campaign));

    let processedCount = 0;

    for (const item of pendingItems) {
      const campaign = campaigns.find(c => c.id === item.campanhaId);
      if (!campaign) continue;

      // Buscar o lead correspondente sob demanda para economizar leitura de toda a base
      const leadSnap = await getDoc(doc(db, 'leads', item.leadId));
      if (!leadSnap.exists()) continue;
      const lead = { id: leadSnap.id, ...leadSnap.data() } as Lead;

      // Incrementar tentativa
      const tentativaAtual = (item.tentativa || 0) + 1;
      let sendResult: { success: boolean; message?: string } = { success: false };

      if (item.channel === 'email') {
        if (!settings.brevoApiKey) {
          sendResult = { success: false, message: 'API Key do Brevo não configurada.' };
        } else {
          const result = await sendEmailBrevoAction({
            apiKey: settings.brevoApiKey,
            sender: { name: settings.remetenteNome || '', email: settings.remetenteEmail || '' },
            to: [{ email: lead.email, name: lead.nome }],
            subject: campaign.assunto,
            htmlContent: campaign.conteudoHtml.replace(/\{\{nome\}\}/g, lead.nome)
          });
          sendResult = { success: result.success, message: result.message };
        }
      } else if (item.channel === 'whatsapp') {
        const targetPhone = lead.celular || lead.telefone;
        if (!targetPhone) {
          sendResult = { success: false, message: 'Lead sem telefone cadastrado.' };
        } else {
          const message = (campaign.textoSimples || campaign.assunto || '').replace(/\{\{nome\}\}/g, lead.nome);
          const result = await sendOmnichannelMessageAction(
            targetPhone, 
            'whatsapp', 
            message,
            item.whatsappConnectionId,
            item.templateData
          );
          sendResult = { success: result.success, message: result.error };
        }
      }

      if (sendResult.success) {
        await updateDoc(doc(db, 'queue', item.id), {
          status: 'enviado',
          dataEnvio: new Date().toISOString(),
          tentativa: tentativaAtual,
          erroMensagem: null
        });
        processedCount++;
      } else {
        await updateDoc(doc(db, 'queue', item.id), {
          status: 'erro',
          tentativa: tentativaAtual,
          erroMensagem: sendResult.message || 'Erro desconhecido'
        });
      }

      // Atualizar estatísticas da campanha
      const campaignRef = doc(db, 'campaigns', campaign.id);
      const updatedCampSnap = await getDoc(campaignRef);
      if (updatedCampSnap.exists()) {
        const campData = updatedCampSnap.data() as Campaign;
        const totalEnviados = sendResult.success ? (campData.totalEnviados + 1) : campData.totalEnviados;
        const totalPendentes = Math.max(0, campData.totalPendentes - 1);
        const totalErro = (!sendResult.success && tentativaAtual >= 3) ? (campData.totalErro + 1) : campData.totalErro;
        
        await updateDoc(campaignRef, {
          totalEnviados,
          totalPendentes,
          totalErro,
          status: totalPendentes === 0 ? 'concluída' : 'em execução'
        });
      }

      // Intervalo entre envios (5s para e-mail, talvez 10s para WhatsApp para evitar ban)
      const delay = item.channel === 'whatsapp' ? 10000 : 5000;
      if (processedCount < pendingItems.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    return { 
      success: true, 
      message: `Processamento concluído. ${processedCount} itens enviados.` 
    };

  } catch (error: any) {
    console.error('Erro no processador de fila:', error);
    return { success: false, message: error.message };
  }
}
