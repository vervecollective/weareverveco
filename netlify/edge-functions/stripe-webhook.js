import { getStore } from '@netlify/blobs';

const CORS = { 'Content-Type': 'application/json' };

/* Stripe signs every webhook. Verifying it is what stops anyone who finds this
   URL from POSTing a fake "invoice paid" and moving deals in your pipeline. */
async function verifyStripeSignature(rawBody, header, secret) {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=').map((s) => s.trim()))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Reject anything older than 5 minutes — blocks replay attacks.
  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Constant-time compare
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function hubspot(path, method, body) {
  const token = Deno.env.get('HUBSPOT_API_TOKEN');
  if (!token) return null;
  const res = await fetch('https://api.hubapi.com' + path, {
    method,
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json().catch(() => null);
}

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS });
  }

  const raw = await req.text();
  const ok = await verifyStripeSignature(
    raw,
    req.headers.get('stripe-signature'),
    Deno.env.get('STRIPE_WEBHOOK_SECRET')
  );
  if (!ok) {
    return new Response(JSON.stringify({ error: 'Bad signature' }), { status: 400, headers: CORS });
  }

  let event;
  try { event = JSON.parse(raw); } catch { 
    return new Response(JSON.stringify({ error: 'Bad payload' }), { status: 400, headers: CORS });
  }

  const invoice = event?.data?.object;
  const engagementId = invoice?.metadata?.engagement_id;
  const store = getStore('engagements');

  // Always 200 back to Stripe once verified — a non-2xx makes Stripe retry
  // for days over something we already recorded.
  try {
    if (event.type === 'invoice.paid' && engagementId) {
      const eng = await store.get(engagementId, { type: 'json' });

      if (eng) {
        const paidTotal = (invoice.amount_paid || 0) / 100;
        const invoiceTotal = (invoice.total || 0) / 100;
        const fullyPaid = invoice.amount_remaining === 0;

        const updated = {
          ...eng,
          status: fullyPaid ? 'paid' : 'partially_paid',
          amountPaid: paidTotal,
          paidAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await store.setJSON(engagementId, updated);

        // Advance the deal only on full payment — a deposit is not a close.
        if (fullyPaid && eng.hubspotDealId) {
          await hubspot('/crm/v3/objects/deals/' + eng.hubspotDealId, 'PATCH', {
            properties: { dealstage: 'closedwon' },
          });
        }

        const label = fullyPaid ? 'PAID IN FULL' : 'DEPOSIT RECEIVED';
        const next = fullyPaid
          ? 'Nothing owed. Deal moved to Closed Won.'
          : 'Deposit cleared \u2014 work can start. Balance of $' +
            ((invoice.amount_remaining || 0) / 100).toFixed(2) + ' due at delivery.';

        console.log(JSON.stringify({
          event: 'invoice.paid', engagementId, label,
          paid: paidTotal, total: invoiceTotal, next,
        }));
      }
    }

    if (event.type === 'invoice.payment_failed' && engagementId) {
      const eng = await store.get(engagementId, { type: 'json' });
      if (eng) {
        await store.setJSON(engagementId, {
          ...eng,
          status: 'payment_failed',
          updatedAt: new Date().toISOString(),
        });
      }
      console.log(JSON.stringify({ event: 'invoice.payment_failed', engagementId }));
    }

    if (event.type === 'invoice.marked_uncollectible' && engagementId) {
      const eng = await store.get(engagementId, { type: 'json' });
      if (eng) {
        await store.setJSON(engagementId, {
          ...eng,
          status: 'uncollectible',
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', String(err));
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers: CORS });
};

export const config = { path: '/api/stripe-webhook' };
