const ALLOWED_TABLES = ['Applications', 'Referrals'];

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: { message: 'Invalid JSON' } }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const { table, fields } = body;

    if (!ALLOWED_TABLES.includes(table)) {
      return new Response(JSON.stringify({ error: { message: 'Invalid table' } }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${env.AIRTABLE_BASE}/${encodeURIComponent(table)}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.AIRTABLE_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      }
    );

    const data = await airtableRes.text();
    return new Response(data, {
      status: airtableRes.status,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
};
