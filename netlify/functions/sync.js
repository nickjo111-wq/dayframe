const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
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

    const key   = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const store = getStore({ name: 'dayframe-users', consistency: 'strong' });

    if (body.action === 'load') {
      const data = await store.get(key, { type: 'json' }).catch(() => null);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ data: data || null }) };
    }

    if (body.action === 'save') {
      await store.setJSON(key, body.data);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
