import { getStore } from '@netlify/blobs';

const DEFAULT_PASSWORD = 'Verve-Collective-2026!';

function checkAuth(req, storedPassword) {
  const supplied = req.headers.get('x-admin-password');
  return Boolean(supplied) && supplied === storedPassword;
}

function json(data, status, cors) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}

export default async (req) => {
  const contentStore = getStore('site-content');
  const store = getStore('engagements');
  const url = new URL(req.url);

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

  // Single source of truth for the admin password — same one as the CMS
  const storedPassword = (await contentStore.get('admin_password')) || DEFAULT_PASSWORD;
  if (!checkAuth(req, storedPassword)) return json({ error: 'Unauthorized' }, 401, cors);

  if (req.method === 'GET') {
    const id = url.searchParams.get('id');
    if (id) {
      const one = await store.get(id, { type: 'json' });
      return one ? json(one, 200, cors) : json({ error: 'Not found' }, 404, cors);
    }
    const { blobs } = await store.list();
    const all = [];
    for (const b of blobs) {
      const rec = await store.get(b.key, { type: 'json' });
      if (rec) all.push(rec);
    }
    all.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
    return json({ engagements: all }, 200, cors);
  }

  if (req.method === 'POST') {
    const body = await req.json();

    // Hard delete — the purge you asked for. Irreversible by design.
    if (body._delete) {
      await store.delete(body._delete);
      return json({ ok: true, deleted: body._delete }, 200, cors);
    }

    // Purge everything. Requires an explicit confirmation string so a stray
    // request can never wipe the record set.
    if (body._purgeAll === 'PURGE ALL ENGAGEMENTS') {
      const { blobs } = await store.list();
      for (const b of blobs) await store.delete(b.key);
      return json({ ok: true, purged: blobs.length }, 200, cors);
    }

    const now = new Date().toISOString();
    const id = body.id || 'eng_' + Date.now().toString(36);
    const existing = body.id ? await store.get(body.id, { type: 'json' }) : null;

    const record = {
      ...(existing || {}),
      ...body,
      id,
      createdAt: (existing && existing.createdAt) || now,
      updatedAt: now,
    };

    await store.setJSON(id, record);
    return json({ ok: true, engagement: record }, 200, cors);
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: '/api/engagements' };
