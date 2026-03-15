// DayFrame sync using Netlify Blobs built-in API
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

    const key      = Buffer.from(email).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
    const siteID   = process.env.SITE_ID || context.clientContext?.site?.id || 'local';
    const token    = process.env.NETLIFY_BLOBS_TOKEN || process.env.TOKEN;
    const storeURL = `https://api.netlify.com/api/v1/sites/${siteID}/blobs/${key}`;

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    if (body.action === 'load') {
      const res = await fetch(storeURL, { headers });
      if (res.status === 404) return { statusCode: 200, headers: cors, body: JSON.stringify({ data: null }) };
      if (!res.ok) throw new Error('Load failed: ' + res.status);
      const data = await res.json();
      return { statusCode: 200, headers: cors, body: JSON.stringify({ data }) };
    }

    if (body.action === 'save') {
      const res = await fetch(storeURL, {
        method: 'PUT',
        headers,
        body: JSON.stringify(body.data)
      });
      if (!res.ok) throw new Error('Save failed: ' + res.status);
      return { statusCode: 200, headers: cors, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: 'Unknown action' }) };

  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
