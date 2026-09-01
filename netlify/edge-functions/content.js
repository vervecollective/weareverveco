import { getStore } from '@netlify/blobs';


// Accepts EITHER a Supabase session (normal path) or the legacy admin password
// (recovery path, so a bad deploy can never lock everyone out).
async function checkAuth(req, storedPassword) {
  const bearer = req.headers.get('authorization');
  if (bearer && bearer.startsWith('Bearer ')) {
    const token = bearer.slice(7);
    const base = Deno.env.get('SUPABASE_URL');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (base && anon) {
      try {
        const res = await fetch(base + '/auth/v1/user', {
          headers: { Authorization: 'Bearer ' + token, apikey: anon },
        });
        if (res.ok) return true;
      } catch (_) { /* fall through to password */ }
    }
  }
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
  const store = getStore('site-content');
  const url = new URL(req.url);

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password, authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  const storedPassword = (await store.get('admin_password')) || Deno.env.get('ADMIN_PASSWORD');

  if (req.method === 'GET') {
    const wantsDraft = url.searchParams.get('mode') === 'draft';

    if (wantsDraft) {
      if (!(await checkAuth(req, storedPassword))) return json({ error: 'Unauthorized' }, 401, cors);
      const draft = await store.get('content_draft', { type: 'json' });
      const live = await store.get('content', { type: 'json' });
      return json(draft || live || {}, 200, cors);
    }

    // Public: what real visitors see
    const live = await store.get('content', { type: 'json' });
    return json(live || {}, 200, cors);
  }

  if (req.method === 'POST') {
    if (!(await checkAuth(req, storedPassword))) return json({ error: 'Unauthorized' }, 401, cors);

    const body = await req.json();

    if (body._newPassword) {
      if (typeof body._newPassword !== 'string' || body._newPassword.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, 400, cors);
      }
      await store.set('admin_password', body._newPassword);
      return json({ ok: true, passwordChanged: true }, 200, cors);
    }

    if (body._publish) {
      const draft = await store.get('content_draft', { type: 'json' });
      if (!draft) return json({ error: 'No draft to publish' }, 400, cors);
      await store.setJSON('content', draft);
      return json({ ok: true, published: true }, 200, cors);
    }

    // Default: this is a draft save, never touches the live site
    await store.setJSON('content_draft', body);
    return json({ ok: true, draftSaved: true }, 200, cors);
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: '/api/content' };
