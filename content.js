import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore('site-content');

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  if (req.method === 'GET') {
    const data = await store.get('content', { type: 'json' });
    return new Response(JSON.stringify(data || {}), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  if (req.method === 'POST') {
    const password = req.headers.get('x-admin-password');
    if (!password || password !== process.env.ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }
    const body = await req.json();
    await store.setJSON('content', body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: '/api/content' };
