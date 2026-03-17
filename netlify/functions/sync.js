// DayFrame sync using Netlify Blobs API
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
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsRequest(method, res.headers.location, {}, body || null)
          .then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

exports.handler = async (event, context) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '{}' };

  try {
    const body  = JSON.parse(event.body || '{}');
    const email = (body.email || '').toLowerCase().trim();

    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Email required' }) };
    }

    const key    = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const token  = process.env.NETLIFY_BLOBS_TOKEN;
    const siteID = 'e04a683b-fa45-4469-88b0-2dc93729f96a';

    // Try both URL formats
    const storeURL = `https://api.netlify.com/api/v1/blobs/${siteID}/${key}`;
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    if (body.action === 'load') {
      const res = await httpsRequest('GET', storeURL, authHeaders, null);
      if (res.status === 404) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ data: null }) };
      }
      if (res.status !== 200) {
        // Return debug info so we can see what's wrong
        return { statusCode: 200, headers: cors, body: JSON.stringify({ data: null, debug: res.status, msg: res.body.slice(0, 200) }) };
      }
      try {
        const data = JSON.parse(res.body);
        return { statusCode: 200, headers: cors, body: JSON.stringify({ data }) };
      } catch(e) {
        return { statusCode: 200, headers: cors, body: JSON.stringify({ data: null, parseError: true }) };
      }
    }

    if (body.action === 'save') {
      const saveBody = JSON.stringify(body.data);
      const res = await httpsRequest('PUT', storeURL, authHeaders, saveBody);
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ ok: res.status === 200 || res.status === 204, status: res.status, msg: res.body.slice(0, 100) })
      };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
