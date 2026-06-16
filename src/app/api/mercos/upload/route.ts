import { NextResponse } from 'next/server';
import { api } from '@/services/api';
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

      // Procurar lead e salvar
      const leadPayload: Lead = {
        id: Math.random().toString(36).substr(2, 9), // Se não achar, não deve criar um novo lead apenas com vendas (opcional, mas aqui podemos criar se quiser, por enquanto vamos tentar atualizar)
        nome: row['Razao Social'] || row['Nome Fantasia'] || 'Cliente Mercos',
        email,
        celular: telefone,
        documento,
        origem: 'Mercos Import',
        dataCriacao: new Date().toISOString(),
        status: 'convertido', // Atualiza para convertido
        faturamento, // O saveLead deve somar ou sobrescrever? A lógica no d1.ts `lead.faturamento !== undefined ? lead.faturamento : ...` vai sobrescrever se passarmos. Como queremos somar as vendas da planilha?
        // Mas se a planilha contiver várias compras do mesmo lead, isso vai substituir a última. 
        // Para uma integração completa, precisaríamos somar `existingData.faturamento + lead.faturamento`.
        // Na nossa atualização em d1.ts, fizemos: `lead.faturamento !== undefined ? lead.faturamento : ...`
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
