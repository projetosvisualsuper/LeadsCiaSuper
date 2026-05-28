// Mock Firebase and Firestore/Storage/Auth compatibility layer for Cloudflare Pages

import { d1Api } from '@/services/d1';

// Mocks for firebase/app
export function initializeApp() { return {}; }
export function getApps() { return []; }
export function getApp() { return {}; }

// Mocks for firebase/auth
export function getAuth() { return {}; }

// Mocks for firebase/storage
export function getStorage() { return {}; }
export function ref(storage: any, path: string) { return { path }; }
export async function uploadBytes(ref: any, bytes: any, metadata?: any) { return {}; }
export async function getDownloadURL(ref: any) {
  return ref.path;
}

// Helper to run query safely (copying from d1.ts to avoid circular imports)
const getDbBinding = (): any => {
  try {
    const nextOnPages = eval("require")('@cloudflare/next-on-pages');
    const ctx = nextOnPages.getRequestContext();
    if (ctx && ctx.env && ctx.env.DB) {
      return ctx.env.DB;
    }
  } catch (e) {}

  if (typeof globalThis !== 'undefined' && (globalThis as any).DB) {
    return (globalThis as any).DB;
  }
  if (process.env.DB) {
    return process.env.DB;
  }
  return null;
};

const runSql = async (sql: string, params: any[] = []): Promise<any> => {
  const db = getDbBinding();
  if (!db) return { results: [] };
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) return await stmt.bind(...params).all();
    return await stmt.all();
  } catch (error) {
    console.error('Mock DB SQL Error:', error, 'SQL:', sql);
    return { results: [] };
  }
};

const executeSql = async (sql: string, params: any[] = []): Promise<any> => {
  const db = getDbBinding();
  if (!db) return { changes: 0 };
  try {
    const stmt = db.prepare(sql);
    if (params.length > 0) return await stmt.bind(...params).run();
    return await stmt.run();
  } catch (error) {
    console.error('Mock DB Execute Error:', error, 'SQL:', sql);
    return { changes: 0 };
  }
};

// Firestore model classes
export const db = { type: 'db' };

export function collection(parent: any, path: string) {
  return { type: 'collection', path };
}

export function doc(parent: any, path: string, id?: string) {
  if (typeof parent === 'string' && id === undefined) {
    const parts = parent.split('/');
    return { type: 'doc', path: parts[0], id: parts[1] };
  }
  if (parent && parent.type === 'collection') {
    return { type: 'doc', path: parent.path, id };
  }
  return { type: 'doc', path, id };
}

export function query(collectionRef: any, ...constraints: any[]) {
  return { type: 'query', collectionRef, constraints };
}

export function where(field: string, op: string, value: any) {
  return { type: 'where', field, op, value };
}

export function limit(value: number) {
  return { type: 'limit', value };
}

export function orderBy(field: string, direction: string = 'asc') {
  return { type: 'orderBy', field, direction };
}

export function arrayUnion(...elements: any[]) {
  return { type: 'arrayUnion', elements };
}

export function increment(value: number) {
  return { type: 'increment', value };
}

// Convert Firestore doc path to D1 Table and Field Mapping
function getTableMapping(path: string) {
  if (path === 'atendimentos_v3') return 'chats';
  return path;
}

export async function getDoc(docRef: any) {
  if (!docRef) return { exists: () => false, data: () => ({}), id: '' };
  const table = getTableMapping(docRef.path);
  const id = docRef.id;

  if (table === 'settings' && id === 'global') {
    const { results } = await runSql(`SELECT valueJson FROM settings WHERE key = 'global' LIMIT 1`);
    const data = results && results[0] ? JSON.parse(results[0].valueJson) : {};
    return {
      exists: () => Object.keys(data).length > 0,
      data: () => data,
      id
    };
  }

  const { results } = await runSql(`SELECT * FROM \`${table}\` WHERE id = ? LIMIT 1`, [id]);
  const row = results && results[0] ? results[0] : null;
  
  let parsedData = row;
  if (row) {
    parsedData = { ...row };
    if (table === 'leads') {
      parsedData.consentimentoLGPD = row.consentimentoLGPD === 1;
      parsedData.isMetaLead = row.isMetaLead === 1;
      parsedData.tags = row.tags ? JSON.parse(row.tags) : [];
    } else if (table === 'whatsapp_connections') {
      parsedData.isDefault = row.isDefault === 1;
      parsedData.isPrincipal = row.isDefault === 1; 
    }
  }

  return {
    exists: () => !!row,
    data: () => parsedData,
    id
  };
}

export async function getDocs(queryRef: any) {
  const collectionRef = queryRef.type === 'query' ? queryRef.collectionRef : queryRef;
  const constraints = queryRef.type === 'query' ? queryRef.constraints : [];
  
  if (!collectionRef) return { empty: true, docs: [], size: 0 };

  const table = getTableMapping(collectionRef.path);
  let sql = `SELECT * FROM \`${table}\``;
  let params: any[] = [];
  let whereClauses: string[] = [];
  let orderClause = '';
  let limitClause = '';

  for (const c of constraints) {
    if (!c) continue;
    if (c.type === 'where') {
      let field = c.field;
      if (field === 'isPrincipal') field = 'isDefault';
      
      let op = c.op;
      let val = c.value;
      if (val === true) val = 1;
      if (val === false) val = 0;

      if (op === '==') {
        whereClauses.push(`\`${field}\` = ?`);
        params.push(val);
      }
    } else if (c.type === 'orderBy') {
      orderClause = ` ORDER BY \`${c.field}\` ${c.direction.toUpperCase()}`;
    } else if (c.type === 'limit') {
      limitClause = ` LIMIT ${c.value}`;
    }
  }

  if (whereClauses.length > 0) {
    sql += ' WHERE ' + whereClauses.join(' AND ');
  }
  sql += orderClause + limitClause;

  const { results } = await runSql(sql, params);
  const docs = (results || []).map((row: any) => {
    let parsedData = { ...row };
    if (table === 'leads') {
      parsedData.consentimentoLGPD = row.consentimentoLGPD === 1;
      parsedData.isMetaLead = row.isMetaLead === 1;
      parsedData.tags = row.tags ? JSON.parse(row.tags) : [];
    } else if (table === 'whatsapp_connections') {
      parsedData.isDefault = row.isDefault === 1;
      parsedData.isPrincipal = row.isDefault === 1;
    }
    return {
      id: row.id || row.uid || row.key,
      data: () => parsedData
    };
  });

  return {
    empty: docs.length === 0,
    docs,
    size: docs.length
  };
}

export async function setDoc(docRef: any, data: any, options?: any) {
  if (!docRef) return;
  const table = getTableMapping(docRef.path);
  const id = docRef.id;

  if (table === 'settings' && id === 'global') {
    let finalData = data;
    if (options?.merge) {
      const current = await getDoc(docRef);
      finalData = { ...current.data(), ...data };
    }
    await executeSql(
      `INSERT INTO settings (key, valueJson) VALUES ('global', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`,
      [JSON.stringify(finalData)]
    );
    return;
  }

  const keys = Object.keys(data);
  const columns = ['id', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const updateClause = keys.map(k => `\`${k}\` = excluded.\`${k}\``).join(', ');
  
  const values = [id, ...keys.map(k => {
    let val = data[k];
    if (val && typeof val === 'object') return JSON.stringify(val);
    if (val === true) return 1;
    if (val === false) return 0;
    return val;
  })];

  const sql = `
    INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')})
    VALUES (${placeholders})
    ON CONFLICT(id) DO UPDATE SET ${updateClause}
  `;
  await executeSql(sql, values);
}

export async function updateDoc(docRef: any, data: any) {
  if (!docRef) return;
  const table = getTableMapping(docRef.path);
  const id = docRef.id;

  if (table === 'settings' && id === 'global') {
    const current = await getDoc(docRef);
    const finalData = { ...current.data() };
    for (const key of Object.keys(data)) {
      if (key.includes('.')) {
        const parts = key.split('.');
        let target: any = finalData;
        for (let i = 0; i < parts.length - 1; i++) {
          if (!target[parts[i]]) target[parts[i]] = {};
          target = target[parts[i]];
        }
        target[parts[parts.length - 1]] = data[key];
      } else {
        finalData[key] = data[key];
      }
    }
    await executeSql(
      `INSERT INTO settings (key, valueJson) VALUES ('global', ?) ON CONFLICT(key) DO UPDATE SET valueJson = excluded.valueJson`,
      [JSON.stringify(finalData)]
    );
    return;
  }

  const updates: string[] = [];
  const params: any[] = [];

  for (const k of Object.keys(data)) {
    let val = data[k];
    if (val && typeof val === 'object' && val.type === 'increment') {
      updates.push(`\`${k}\` = \`${k}\` + ?`);
      params.push(val.value);
    } else if (val && typeof val === 'object' && val.type === 'arrayUnion') {
      const current = await getDoc(docRef);
      const currentVal = current.data()?.[k] || [];
      const updatedArr = Array.from(new Set([...currentVal, ...val.elements]));
      updates.push(`\`${k}\` = ?`);
      params.push(JSON.stringify(updatedArr));
    } else {
      updates.push(`\`${k}\` = ?`);
      params.push(val === true ? 1 : (val === false ? 0 : (typeof val === 'object' ? JSON.stringify(val) : val)));
    }
  }

  params.push(id);
  const sql = `UPDATE \`${table}\` SET ${updates.join(', ')} WHERE id = ?`;
  await executeSql(sql, params);
}

export async function addDoc(collectionRef: any, data: any) {
  if (!collectionRef) return { id: '' };
  const table = getTableMapping(collectionRef.path);
  const id = Math.random().toString(36).substr(2, 9);
  
  const keys = Object.keys(data);
  const columns = ['id', ...keys];
  const placeholders = columns.map(() => '?').join(', ');
  const values = [id, ...keys.map(k => {
    let val = data[k];
    if (val && typeof val === 'object') return JSON.stringify(val);
    if (val === true) return 1;
    if (val === false) return 0;
    return val;
  })];

  const sql = `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES (${placeholders})`;
  await executeSql(sql, values);
  return { id };
}

export async function deleteDoc(docRef: any) {
  if (!docRef) return;
  const table = getTableMapping(docRef.path);
  await executeSql(`DELETE FROM \`${table}\` WHERE id = ?`, [docRef.id]);
}

export function onSnapshot(queryRef: any, onNext: any, onError?: any) {
  if (!queryRef) return () => {};
  if (queryRef.type === 'query' || queryRef.type === 'collection') {
    getDocs(queryRef).then(onNext).catch(onError);
  } else {
    getDoc(queryRef).then(onNext).catch(onError);
  }
  return () => {};
}
