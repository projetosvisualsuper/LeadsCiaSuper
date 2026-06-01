const http = require('http');
const { execSync } = require('child_process');

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

let queryQueue = Promise.resolve();

if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      // Enfileira a execução para evitar que chamadas paralelas crasharem o execSync no Windows (Assertion UV_HANDLE_CLOSING)
      queryQueue = queryQueue.then(() => {
        return new Promise((resolveQueue) => {
          try {
            const { sql, params } = JSON.parse(body);
            
            let sqlWithParams = sql;
            params.forEach(param => {
              const val = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param === null ? 'NULL' : param;
              sqlWithParams = sqlWithParams.replace('?', val);
            });

            const fs = require('fs');
            const path = require('path');
            // Nome de arquivo único por query na fila
            const tempFileName = `temp-query-${Math.random().toString(36).substring(2, 9)}.sql`;
            const tempFilePath = path.join(__dirname, tempFileName);
            fs.writeFileSync(tempFilePath, sqlWithParams, 'utf-8');

            try {
              const cmd = `npx wrangler d1 execute gerency-leads-db --file="${tempFilePath}" --local --json`;
              const stdout = execSync(cmd, { 
                cwd: process.cwd(), 
                encoding: 'utf-8', 
                maxBuffer: 50 * 1024 * 1024 // 50MB buffer to handle large rows/base64 images
              });
              
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }

              // Filtrar avisos ou mensagens que o wrangler possa imprimir antes do JSON
              const jsonStart = stdout.indexOf('[');
              if (jsonStart === -1) {
                throw new Error('Não foi possível encontrar o JSON na saída do wrangler: ' + stdout);
              }
              const jsonContent = stdout.substring(jsonStart);
              const parsed = JSON.parse(jsonContent);
              let result = { results: [], success: true, changes: 0 };
              if (parsed && parsed[0]) {
                result = {
                  results: parsed[0].results || [],
                  success: parsed[0].success,
                  changes: parsed[0].meta?.changes || 0
                };
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify(result));
              resolveQueue();
            } catch (execErr) {
              if (fs.existsSync(tempFilePath)) {
                fs.unlinkSync(tempFilePath);
              }
              throw execErr;
            }
          } catch (err) {
            console.error('Erro na ponte local D1:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, message: err.message }));
            resolveQueue();
          }
        });
      });
    });
  } else {
    res.writeHead(404);
    res.end();
  }
});

const PORT = 3005;
server.listen(PORT, '127.0.0.1', () => {
  console.log(`D1 Local Bridge rodando em http://127.0.0.1:${PORT}`);
});
