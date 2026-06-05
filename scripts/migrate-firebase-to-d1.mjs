/**
 * Script de Migração: Firebase Firestore → Cloudflare D1
 * 
 * Executa: node scripts/migrate-firebase-to-d1.mjs
 *
 * O que migra:
 *  - bio_links (coleção "bio_links" ou "bioLinks" do Firestore)
 *  - landing_pages (coleção "landing_pages" ou "landingPages")
 *  - leads (coleção "leads")
 *  - settings (documento "settings/global")
 *
 * Após gerar os SQL inserts, aplica no D1 via "wrangler d1 execute"
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ─── Configuração ────────────────────────────────────────────────────────────
const PROJECT_ID   = 'gerency-leads';
const DATABASE_NAME = 'gerency-leads-db';           // wrangler.toml database_name
const WRANGLER_CMD  = 'npx wrangler';

// Coleções do Firestore a migrar (nome Firestore → tabela D1)
const COLLECTIONS = {
  bio_links:     'bio_links',
  bioLinks:      'bio_links',        // nome alternativo
  landing_pages: 'landing_pages',
  landingPages:  'landing_pages',    // nome alternativo
  leads:         'leads',
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ─────────────────────────────────────────────────────────────────────────────

// Inicializa Firebase Admin sem chave de serviço — usa Application Default Credentials
// OU acessa com apiKey público via REST (sem Admin SDK)
// Aqui usamos a API REST do Firestore (não precisa de service account)
async function fetchCollection(collectionName) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${collectionName}?pageSize=300`;
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Erro ao buscar coleção "${collectionName}": ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.documents || [];
}

function parseFirestoreValue(val) {
  if (!val) return null;
  if ('stringValue'  in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue'  in val) return val.doubleValue;
  if ('booleanValue' in val) return val.booleanValue;
  if ('nullValue'    in val) return null;
  if ('timestampValue' in val) return val.timestampValue;
  if ('mapValue' in val) {
    const obj = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      obj[k] = parseFirestoreValue(v);
    }
    return obj;
  }
  if ('arrayValue' in val) {
    return (val.arrayValue.values || []).map(parseFirestoreValue);
  }
  return null;
}

function parseDoc(doc) {
  const fields = doc.fields || {};
  const parsed = {};
  for (const [k, v] of Object.entries(fields)) {
    parsed[k] = parseFirestoreValue(v);
  }
  // Extrair ID do path: projects/.../documents/col/ID
  const parts = doc.name.split('/');
  parsed.id = parts[parts.length - 1];
  return parsed;
}

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'boolean') return val ? '1' : '0';
  if (typeof val === 'number') return String(val);
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  return `'${str.replace(/'/g, "''")}'`;
}

// ─── Gerador de SQL por tabela ────────────────────────────────────────────────

function bioLinkToSql(row) {
  const id            = escapeSql(row.id);
  const slug          = escapeSql(row.slug || row.id);
  const profileName   = escapeSql(row.profileName || row.nome || 'Sem Nome');
  const bio           = escapeSql(row.bio || null);
  const avatarUrl     = escapeSql(row.avatarUrl || null);
  const footerLogoUrl = escapeSql(row.footerLogoUrl || null);
  const socialsJson   = escapeSql(JSON.stringify(row.socials || []));
  const itemsJson     = escapeSql(JSON.stringify(row.items || []));
  const themeJson     = escapeSql(JSON.stringify(row.theme || {}));
  const dataCriacao   = escapeSql(row.dataCriacao || new Date().toISOString());
  const cliques       = row.cliquesTotais || 0;
  const views         = row.visualizacoes || 0;

  return `INSERT INTO bio_links (id, slug, profileName, bio, avatarUrl, footerLogoUrl, socialsJson, itemsJson, themeJson, dataCriacao, cliquesTotais, visualizacoes)
VALUES (${id}, ${slug}, ${profileName}, ${bio}, ${avatarUrl}, ${footerLogoUrl}, ${socialsJson}, ${itemsJson}, ${themeJson}, ${dataCriacao}, ${cliques}, ${views})
ON CONFLICT(id) DO UPDATE SET
  slug=excluded.slug, profileName=excluded.profileName, bio=excluded.bio,
  avatarUrl=excluded.avatarUrl, footerLogoUrl=excluded.footerLogoUrl,
  socialsJson=excluded.socialsJson, itemsJson=excluded.itemsJson, themeJson=excluded.themeJson;`;
}

function landingPageToSql(row) {
  const id          = escapeSql(row.id);
  const slug        = escapeSql(row.slug || row.id);
  const templateId  = escapeSql(row.templateId || 'professional');
  const configJson  = escapeSql(JSON.stringify(row.config || row));
  const dataCriacao = escapeSql(row.dataCriacao || new Date().toISOString());
  const isAtiva     = row.isAtiva === false ? 0 : 1;
  const views       = row.visualizacoes || 0;
  const clicks      = row.cliquesTotais || 0;

  return `INSERT INTO landing_pages (id, slug, templateId, configJson, dataCriacao, isAtiva, visualizacoes, cliquesTotais)
VALUES (${id}, ${slug}, ${templateId}, ${configJson}, ${dataCriacao}, ${isAtiva}, ${views}, ${clicks})
ON CONFLICT(id) DO UPDATE SET
  slug=excluded.slug, templateId=excluded.templateId, configJson=excluded.configJson,
  isAtiva=excluded.isAtiva;`;
}

function leadToSql(row) {
  const s = (v) => escapeSql(v ?? null);
  return `INSERT INTO leads (id, nome, email, telefone, celular, empresa, origem, dataCriacao, dataUltimaAtividade, status, tags, consentimentoLGPD, observacoes, utm_source, utm_medium, utm_campaign, cidade, estado, totalConversoes, dataUltimaConversao, avatar, isMetaLead)
VALUES (${s(row.id)}, ${s(row.nome)}, ${s(row.email)}, ${s(row.telefone)}, ${s(row.celular)}, ${s(row.empresa)},
  ${s(row.origem || 'firebase')}, ${s(row.dataCriacao || new Date().toISOString())}, ${s(row.dataUltimaAtividade)},
  ${s(row.status || 'novo')}, ${s(JSON.stringify(row.tags || []))}, ${row.consentimentoLGPD ? 1 : 0},
  ${s(row.observacoes)}, ${s(row.utm_source)}, ${s(row.utm_medium)}, ${s(row.utm_campaign)},
  ${s(row.cidade)}, ${s(row.estado)}, ${row.totalConversoes || 1}, ${s(row.dataUltimaConversao)},
  ${s(row.avatar)}, ${row.isMetaLead ? 1 : 0})
ON CONFLICT(id) DO NOTHING;`;
}

// ─── Principal ────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔥 Iniciando migração Firebase → D1...\n');

  const sqlStatements = ['-- Migração automática Firebase → D1'];
  let totalInserted = 0;

  // Tentar coleções com diferentes nomes (Firestore pode ter nomes variados)
  const collectionsToTry = [
    { firestoreName: 'bio_links',     table: 'bio_links',     toSql: bioLinkToSql },
    { firestoreName: 'bioLinks',      table: 'bio_links',     toSql: bioLinkToSql },
    { firestoreName: 'landing_pages', table: 'landing_pages', toSql: landingPageToSql },
    { firestoreName: 'landingPages',  table: 'landing_pages', toSql: landingPageToSql },
    { firestoreName: 'leads',         table: 'leads',         toSql: leadToSql },
  ];

  const migratedTables = new Set();

  for (const { firestoreName, table, toSql } of collectionsToTry) {
    if (migratedTables.has(table)) continue; // já migrou essa tabela por outro nome

    console.log(`📦 Buscando coleção "${firestoreName}" → tabela "${table}"...`);
    let docs;
    try {
      docs = await fetchCollection(firestoreName);
    } catch (e) {
      console.warn(`  ⚠  ${e.message}`);
      continue;
    }

    if (docs.length === 0) {
      console.log(`  ℹ  Coleção "${firestoreName}" está vazia ou não existe.`);
      continue;
    }

    console.log(`  ✓  ${docs.length} documentos encontrados.`);
    migratedTables.add(table);
    sqlStatements.push(`\n-- === ${table} (de: ${firestoreName}) ===`);

    for (const doc of docs) {
      const parsed = parseDoc(doc);
      try {
        sqlStatements.push(toSql(parsed));
        totalInserted++;
      } catch (e) {
        console.warn(`  ⚠  Erro ao gerar SQL para doc ${parsed.id}: ${e.message}`);
      }
    }
  }

  if (totalInserted === 0) {
    console.log('\n⚠  Nenhum dado encontrado para migrar. Verifique se o Firestore é público ou se as coleções existem.');
    return;
  }

  // Salvar SQL em arquivo temporário
  const sqlPath = path.join(__dirname, '..', 'scratch', 'migration.sql');
  writeFileSync(sqlPath, sqlStatements.join('\n'), 'utf8');
  console.log(`\n✅ SQL gerado: ${sqlPath}`);
  console.log(`   Total de registros: ${totalInserted}`);

  // Aplicar no D1 remoto (produção na Cloudflare)
  console.log('\n🚀 Aplicando no banco D1 REMOTO (Cloudflare)...');
  try {
    const result = execSync(
      `${WRANGLER_CMD} d1 execute ${DATABASE_NAME} --remote --file="${sqlPath}"`,
      { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe' }
    );
    console.log(result);
    console.log('✅ Migração remota concluída com sucesso!');
  } catch (e) {
    console.error('❌ Erro ao executar no D1 remoto:', e.stdout || e.message);
    console.log('\n💡 Tente executar manualmente:');
    console.log(`   npx wrangler d1 execute ${DATABASE_NAME} --remote --file="scratch/migration.sql"`);
  }

  // Também aplicar localmente
  console.log('\n💻 Aplicando no banco D1 LOCAL...');
  try {
    const result = execSync(
      `${WRANGLER_CMD} d1 execute ${DATABASE_NAME} --local --file="${sqlPath}"`,
      { cwd: path.join(__dirname, '..'), encoding: 'utf8', stdio: 'pipe' }
    );
    console.log(result);
    console.log('✅ Migração local concluída!');
  } catch (e) {
    console.warn('⚠  Erro ao executar localmente (pode ignorar se só precisar do remoto):', e.message);
  }
}

main().catch(err => {
  console.error('❌ Falha na migração:', err);
  process.exit(1);
});
