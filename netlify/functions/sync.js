// DayFrame sync using Netlify Blobs
// No external services needed — data stored on Netlify's own infrastructure

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  try {
    const store = getStore('dayframe-user-data');
    const body  = event.body ? JSON.parse(event.body) : {};
    const email = (body.email || '').toLowerCase().trim();

    if (!email || !email.includes('@')) {
      return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Email required' }) };
    }

    // Use email hash as key (simple obfuscation)
    const key = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');

    if (event.httpMethod === 'GET' || body.action === 'load') {
      const data = await store.get(key, { type: 'json' }).catch(() => null);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ data: data || null }) };
    }

    if (body.action === 'save') {
      if (!body.data) return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'No data' }) };
      await store.setJSON(key, body.data);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};

