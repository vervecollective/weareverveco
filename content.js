import { getStore } from '@netlify/blobs';

const DEFAULT_PASSWORD = 'Verve-Collective-2026!';

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
    const supplied = req.headers.get('x-admin-password');
    const stored = (await store.get('admin_password')) || DEFAULT_PASSWORD;

    if (!supplied || supplied !== stored) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    const body = await req.json();

    // Password-change request, not a content save
    if (body._newPassword) {
      if (typeof body._newPassword !== 'string' || body._newPassword.length < 8) {
        return new Response(JSON.stringify({ error: 'Password must be at least 8 characters' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors },
        });
      }
      await store.set('admin_password', body._newPassword);
      return new Response(JSON.stringify({ ok: true, passwordChanged: true }), {
        headers: { 'Content-Type': 'application/json', ...cors },
      });
    }

    // Normal content save
    await store.setJSON('content', body);
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', ...cors },
    });
  }

  return new Response('Method not allowed', { status: 405, headers: cors });
};

export const config = { path: '/api/content' };
