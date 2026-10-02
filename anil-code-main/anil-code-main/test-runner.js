const http = require('http');

async function executeCode(language, code) {
  const payload = JSON.stringify({ language, code });
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/execute',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function testAll() {
  console.log("=== Testing Multi-Language Compiler & Runner ===");
  
  const tests = [
    {
      lang: "javascript",
      code: "console.log('JS execution works!'); const a = 20, b = 22; console.log('Result:', a + b);"
    },
    {
      lang: "python",
      code: "print('Python compiler active!')\nprint([x**2 for x in range(6)])"
    },
    {
      lang: "json",
      code: '{"name": "Anil6", "features": ["realtime", "compile", "sync"]}'
    },
    {
      lang: "sql",
      code: 'SELECT id, username, email FROM users WHERE active = 1;'
    }
  ];

  for (const t of tests) {
    try {
      const res = await executeCode(t.lang, t.code);
      console.log(`\n[${t.lang.toUpperCase()}] status: ${res.status}`);
      console.log("Output:", res.data);
    } catch (err) {
      console.log(`[${t.lang.toUpperCase()}] error:`, err.message);
    }
  }
}

testAll();
