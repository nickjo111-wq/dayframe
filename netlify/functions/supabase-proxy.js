const https = require('https');

function httpsRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: { ...headers }
    };
    if (body) options.headers['Content-Length'] = Buffer.byteLength(body);
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data, headers: res.headers }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey, x-client-info',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }

  try {
    const SUPABASE_URL = 'https://qzqjhtzadiasqdrepnzp.supabase.co';
    const path = event.path.replace('/.netlify/functions/supabase-proxy', '');
    const url = SUPABASE_URL + (path || '/') + (event.rawQuery ? '?' + event.rawQuery : '');

    const headers = {
      'Content-Type': 'application/json',
      'apikey': event.headers['apikey'] || '',
      'Authorization': event.headers['authorization'] || ''
    };

    const result = await httpsRequest(
      event.httpMethod,
      url,
      headers,
      event.body || null
    );

    return {
      statusCode: result.status,
      headers: { ...corsHeaders, 'Content-Type': result.headers['content-type'] || 'application/json' },
      body: result.body
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message })
    };
  }
};
