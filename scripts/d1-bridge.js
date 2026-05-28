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

  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { sql, params } = JSON.parse(body);
        
        const escapedSql = sql.replace(/"/g, '\\"');
        let sqlWithParams = escapedSql;
        params.forEach(param => {
          const val = typeof param === 'string' ? `'${param.replace(/'/g, "''")}'` : param === null ? 'NULL' : param;
          sqlWithParams = sqlWithParams.replace('?', val);
        });

        const cmd = `npx wrangler d1 execute gerency-leads-db --command="${sqlWithParams}" --local --json`;
        const stdout = execSync(cmd, { cwd: process.cwd(), encoding: 'utf-8' });
        
        const parsed = JSON.parse(stdout);
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
      } catch (err) {
        console.error('Erro na ponte local D1:', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: err.message }));
      }
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
