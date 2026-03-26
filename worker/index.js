const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    try {
      const { table, fields, files } = await request.json();

      const allowed = (env.ALLOWED_TABLES || '').split(',').map(t => t.trim());
      if (!allowed.includes(table)) {
        return json({ error: 'Invalid table' }, 400);
      }

      if (files && files.length && env.UPLOADS) {
        const buildUrls = [];
        const sciUrls = [];

        for (const f of files) {
          try {
            const bytes = Uint8Array.from(atob(f.data), c => c.charCodeAt(0));
            const timestamp = Date.now();
            const rand = Math.random().toString(36).slice(2, 15);
            const safe = f.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const key = `${timestamp}-${rand}-${safe}`;

            await env.UPLOADS.put(key, bytes, {
              httpMetadata: { contentType: f.type || 'application/octet-stream' },
            });

            const publicUrl = `${env.R2_PUBLIC_URL}/${key}`;
            const entry = { url: publicUrl, filename: f.name };

            if (f.category === 'build') buildUrls.push(entry);
            else sciUrls.push(entry);
          } catch (e) {
            // Skip failed files, continue with rest
          }
        }

        if (buildUrls.length) fields['Build Files'] = buildUrls;
        if (sciUrls.length) fields['Science Files'] = sciUrls;
      }

      fields['Time'] = new Date().toISOString();

      const url = `https://api.airtable.com/v0/${env.AIRTABLE_BASE_ID}/${encodeURIComponent(table)}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.AIRTABLE_PAT}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      });

      const data = await res.json();

      return json(data, res.status);
    } catch (err) {
      return json({ error: err.message }, 500);
    }
  },
};
