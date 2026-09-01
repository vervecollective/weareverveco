import { getStore } from '@netlify/blobs';


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

// Stripe's API is form-encoded, not JSON.
async function stripe(path, key, params, method) {
  const body = params ? new URLSearchParams(params).toString() : undefined;
  const res = await fetch('https://api.stripe.com/v1/' + path, {
    method: method || 'POST',
    headers: {
      Authorization: 'Bearer ' + key,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });
  return res.json();
}

export default async (req) => {
  const contentStore = getStore('site-content');
  const engStore = getStore('engagements');

  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, x-admin-password',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

  const storedPassword = (await contentStore.get('admin_password')) || Deno.env.get('ADMIN_PASSWORD');
  if (!checkAuth(req, storedPassword)) return json({ error: 'Unauthorized' }, 401, cors);

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return json({ error: 'STRIPE_SECRET_KEY is not set in Netlify environment variables.' }, 500, cors);

  const { engagementId } = await req.json();
  const eng = await engStore.get(engagementId, { type: 'json' });
  if (!eng) return json({ error: 'Engagement not found' }, 404, cors);

  const items = (eng.lineItems || []).filter((li) => li.description && Number(li.unitPrice) > 0);
  if (!items.length) return json({ error: 'No billable line items on this engagement.' }, 400, cors);

  try {
    // 1) Customer
    const customer = await stripe('customers', key, {
      email: eng.clientEmail || '',
      name: eng.businessName || eng.clientName || '',
    });
    if (customer.error) throw new Error(customer.error.message);

    // 2) Line items. Ad spend is deliberately excluded — it is billed by the
    //    platform directly to the client and never runs through Verve's books.
    for (const li of items) {
      const qty = Number(li.qty) || 1;
      const unit = Number(li.unitPrice) || 0;
      // The invoiceitems endpoint takes a single line total in cents. Quantity
      // pricing there would require creating Price objects, which the restricted
      // key intentionally cannot do — so fold the quantity into the description.
      const lineTotalCents = Math.round(unit * qty * 100);
      const label = qty > 1
        ? li.description + ' (' + qty + ' x $' + unit.toFixed(2) + ')'
        : li.description;
      const r = await stripe('invoiceitems', key, {
        customer: customer.id,
        currency: 'usd',
        amount: String(lineTotalCents),
        description: label,
      });
      if (r.error) throw new Error(r.error.message);
    }

    // 3) Invoice
    const invoice = await stripe('invoices', key, {
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: String(eng.daysUntilDue || 15),
      description: eng.invoiceNote || 'Verve Collective LLC — services as scoped.',
      'metadata[engagement_id]': eng.id,
    });
    if (invoice.error) throw new Error(invoice.error.message);

    // 4) Finalize to get the payable hosted URL
    const finalized = await stripe('invoices/' + invoice.id + '/finalize', key, {});
    if (finalized.error) throw new Error(finalized.error.message);

    const updated = {
      ...eng,
      status: 'invoiced',
      stripeInvoiceId: finalized.id,
      stripeInvoiceUrl: finalized.hosted_invoice_url,
      invoicedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await engStore.setJSON(eng.id, updated);

    return json({ ok: true, url: finalized.hosted_invoice_url, engagement: updated }, 200, cors);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500, cors);
  }
};

export const config = { path: '/api/billing' };

// Redeploy trigger: pick up STRIPE_SECRET_KEY env var.
