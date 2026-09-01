const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

// Stripe's API is form-encoded, not JSON.
async function stripe(path, key, params, method) {
  const res = await fetch('https://api.stripe.com/v1/' + path, {
    method: method || 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params ? new URLSearchParams(params).toString() : undefined,
  });
  return res.json();
}

/* Read through Supabase's REST API using the CALLER'S token, not a service key.
   That means row-level security still applies here — someone can only invoice
   an engagement they were already allowed to see. */
async function sbGet(path, token) {
  const base = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const res = await fetch(base + '/rest/v1/' + path, {
    headers: { apikey: anon, Authorization: 'Bearer ' + token },
  });
  return res.json();
}

async function sbPatch(path, token, body) {
  const base = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const res = await fetch(base + '/rest/v1/' + path, {
    method: 'PATCH',
    headers: {
      apikey: anon,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401);
  const token = auth.slice(7);

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return json({ error: 'STRIPE_SECRET_KEY is not set.' }, 500);

  const { engagementId } = await req.json().catch(() => ({}));
  if (!engagementId) return json({ error: 'engagementId is required.' }, 400);

  // Engagement + client, scoped by RLS
  const engRows = await sbGet(
    'engagements?id=eq.' + engagementId + '&select=*,clients(business_name,contact_name,contact_email)',
    token
  );
  if (!Array.isArray(engRows) || !engRows.length) {
    return json({ error: 'Engagement not found, or you do not have access to it.' }, 404);
  }
  const eng = engRows[0];
  const client = eng.clients || {};
  const email = client.contact_email;
  if (!email) return json({ error: 'This client has no contact email.' }, 400);

  const lines = await sbGet(
    'line_items?engagement_id=eq.' + engagementId + '&select=*&order=sort_order',
    token
  );
  const billable = (Array.isArray(lines) ? lines : []).filter(
    (l) => l.description && Number(l.unit_price) > 0
  );
  if (!billable.length) return json({ error: 'No billable line items on this engagement.' }, 400);

  try {
    // Reuse an existing Stripe customer for this email rather than duplicating.
    let customer;
    const existing = await stripe(
      'customers?email=' + encodeURIComponent(email) + '&limit=1', key, null, 'GET'
    );
    if (existing && existing.data && existing.data.length) {
      customer = existing.data[0];
    } else {
      customer = await stripe('customers', key, {
        email,
        name: client.business_name || client.contact_name || '',
      });
      if (customer.error) throw new Error(customer.error.message);
    }

    // Invoice first, then attach items to it explicitly. Stripe defaults to
    // EXCLUDING pending invoice items, which silently produces $0 invoices.
    const invoice = await stripe('invoices', key, {
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: String(eng.days_until_due || 15),
      description: eng.client_visible_note || 'Verve Collective LLC — services as scoped.',
      'metadata[engagement_id]': eng.id,
    });
    if (invoice.error) throw new Error(invoice.error.message);

    for (const li of billable) {
      const qty = Number(li.qty) || 1;
      const unit = Number(li.unit_price) || 0;
      const cents = Math.round(unit * qty * 100);
      const label = qty > 1
        ? li.description + ' (' + qty + ' x $' + unit.toFixed(2) + ')'
        : li.description;
      const r = await stripe('invoiceitems', key, {
        customer: customer.id,
        invoice: invoice.id,
        currency: 'usd',
        amount: String(cents),
        description: label,
      });
      if (r.error) throw new Error(r.error.message);
    }

    const check = await stripe('invoices/' + invoice.id, key, null, 'GET');
    if (!check.total || check.total <= 0) {
      throw new Error('Invoice built with no billable lines — nothing was sent.');
    }

    const finalized = await stripe('invoices/' + invoice.id + '/finalize', key, {});
    if (finalized.error) throw new Error(finalized.error.message);

    // Finalizing makes it payable; sending is what actually emails the client.
    const sent = await stripe('invoices/' + finalized.id + '/send', key, {});
    if (sent.error) throw new Error('Invoice created but could not be emailed: ' + sent.error.message);

    const url = sent.hosted_invoice_url || finalized.hosted_invoice_url;
    await sbPatch('engagements?id=eq.' + eng.id, token, {
      stripe_invoice_id: sent.id || finalized.id,
      stripe_invoice_url: url,
      amount_total: (check.total || 0) / 100,
      payment_status: 'unpaid',
      updated_at: new Date().toISOString(),
    });

    return json({ ok: true, url });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
};

export const config = { path: '/api/billing' };
