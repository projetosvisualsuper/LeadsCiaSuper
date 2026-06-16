import { NextResponse } from 'next/server';
import { api } from '@/services/api';
import { d1Api } from '@/services/d1';
import * as xlsx from 'xlsx';
import { Lead } from '@/types/crm';

export const runtime = 'edge';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'A planilha está vazia ou não pôde ser lida.' }, { status: 400 });
    }

    let processedCount = 0;
    let updatedCount = 0;

    for (const row of data as any[]) {
      processedCount++;
      
      // Mapear os campos comuns de exportação do Mercos
      const documento = row['CNPJ/CPF'] ? String(row['CNPJ/CPF']).replace(/\D/g, '') : '';
      const email = row['Email'] ? String(row['Email']).trim().toLowerCase() : '';
      const telefoneStr = row['Telefone'] || row['Celular'];
      const telefone = telefoneStr ? String(telefoneStr).replace(/\D/g, '') : '';
      
      // Tentar pegar o Total do pedido (pode vir como R$ 1.200,50 ou apenas número)
      let faturamento = 0;
      const totalStr = row['Total do pedido'] || row['Total'];
      if (totalStr) {
        if (typeof totalStr === 'number') {
          faturamento = totalStr;
        } else {
          // Limpar string: remover R$, pontos de milhar, trocar vírgula por ponto
          const cleanStr = String(totalStr).replace(/[^\d,-]/g, '').replace(',', '.');
          faturamento = parseFloat(cleanStr) || 0;
        }
      }

      if (!documento && !email && !telefone) {
        continue; // Sem dados para identificar o lead
      }

      // Data de emissão do pedido na planilha
      const emissaoStr = row['Emissão'] || row['Data'] || row['Data de emissão'] || row['Data de Emissão'];
      let dataEmissao = new Date();
      if (emissaoStr) {
        // Tentar dar parse na data (DD/MM/YYYY)
        const parts = String(emissaoStr).split(' ')[0].split('/'); // Pega só a data e ignora hora se houver
        if (parts.length === 3) {
          dataEmissao = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`);
        } else {
          const parsed = new Date(emissaoStr);
          if (!isNaN(parsed.getTime())) {
            dataEmissao = parsed;
          }
        }
      }

      // Buscar a data de criação original do lead para calcular o ciclo de vendas
      let cicloVendasDias: number | undefined;
      let existingLeadData: any = null;

      try {
        if (documento) {
          existingLeadData = await d1Api.runQuery(`SELECT dataCriacao FROM leads WHERE documento = ? LIMIT 1`, [documento]).then(res => res.results?.[0]);
        }
        if (!existingLeadData && email) {
          existingLeadData = await d1Api.runQuery(`SELECT dataCriacao FROM leads WHERE email = ? LIMIT 1`, [email]).then(res => res.results?.[0]);
        }
        if (!existingLeadData && telefone) {
          existingLeadData = await d1Api.runQuery(`SELECT dataCriacao FROM leads WHERE celular = ? LIMIT 1`, [telefone]).then(res => res.results?.[0]);
        }

        if (existingLeadData && existingLeadData.dataCriacao) {
          const dataCriacao = new Date(existingLeadData.dataCriacao);
          const diffTime = dataEmissao.getTime() - dataCriacao.getTime();
          cicloVendasDias = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
        } else {
          cicloVendasDias = 0; // Lead novo, consideramos 0 dias
        }
      } catch (err) {
        console.error('Erro ao buscar lead existente para ciclo de vendas:', err);
      }

      // Procurar lead e salvar
      const leadPayload: Lead = {
        id: Math.random().toString(36).substr(2, 9),
        nome: row['Razao Social'] || row['Nome Fantasia'] || 'Cliente Mercos',
        email,
        celular: telefone,
        documento,
        origem: 'Mercos Import',
        dataCriacao: new Date().toISOString(),
        status: 'convertido',
        faturamento,
        cicloVendasDias,
        tags: ['mercos', 'venda'],
        consentimentoLGPD: true
      };

      try {
        await api.saveLead(leadPayload);
        updatedCount++;
      } catch (err) {
        console.error('Erro ao processar linha Mercos:', err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `${processedCount} linhas processadas. ${updatedCount} leads criados ou atualizados como 'convertido'.`,
      processedCount,
      updatedCount
    });

  } catch (error: any) {
    console.error('Erro na importação da Mercos:', error);
    return NextResponse.json({ error: error.message || 'Ocorreu um erro interno.' }, { status: 500 });
  }
}
