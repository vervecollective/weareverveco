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
    // 1) Customer — reuse an existing one for this email rather than creating a
    //    duplicate on every invoice, which would fragment the client's history.
    let customer;
    const existing = await stripe(
      'customers?email=' + encodeURIComponent(eng.clientEmail) + '&limit=1',
      key, null, 'GET'
    );
    if (existing && existing.data && existing.data.length > 0) {
      customer = existing.data[0];
    } else {
      customer = await stripe('customers', key, {
        email: eng.clientEmail || '',
        name: eng.businessName || eng.clientName || '',
      });
      if (customer.error) throw new Error(customer.error.message);
    }

    // 2) Create the draft invoice FIRST, so line items can be attached to it
    //    explicitly. Relying on Stripe to auto-pull pending invoice items is not
    //    dependable on current API versions — it silently produced $0 invoices.
    const invoice = await stripe('invoices', key, {
      customer: customer.id,
      collection_method: 'send_invoice',
      days_until_due: String(eng.daysUntilDue || 15),
      description: eng.invoiceNote || 'Verve Collective LLC — services as scoped.',
      'metadata[engagement_id]': eng.id,
    });
    if (invoice.error) throw new Error(invoice.error.message);

    // 3) Line items, each attached to that invoice by id. Ad spend is deliberately
    //    excluded — the client pays the platform directly, it never runs through
    //    Verve's books.
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
        invoice: invoice.id,
        currency: 'usd',
        amount: String(lineTotalCents),
        description: label,
      });
      if (r.error) throw new Error(r.error.message);
    }

    // 4) Finalize to get the payable hosted URL
    // Guard against ever finalizing a $0 invoice again.
    const check = await stripe('invoices/' + invoice.id, key, null, 'GET');
    if (!check.total || check.total <= 0) {
      throw new Error('Invoice built with no billable lines — nothing was sent. Check the line items and try again.');
    }

    const finalized = await stripe('invoices/' + invoice.id + '/finalize', key, {});
    if (finalized.error) throw new Error(finalized.error.message);

    // 5) Finalizing only makes the invoice payable — it does NOT deliver it.
    //    This is the step that actually emails the client a request for payment.
    const sent = await stripe('invoices/' + finalized.id + '/send', key, {});
    if (sent.error) throw new Error('Invoice created but could not be emailed: ' + sent.error.message);

    const updated = {
      ...eng,
      status: 'invoiced',
      stripeInvoiceId: sent.id || finalized.id,
      stripeInvoiceUrl: sent.hosted_invoice_url || finalized.hosted_invoice_url,
      invoicedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await engStore.setJSON(eng.id, updated);

    return json({ ok: true, url: sent.hosted_invoice_url || finalized.hosted_invoice_url, engagement: updated }, 200, cors);
  } catch (err) {
    return json({ error: String(err.message || err) }, 500, cors);
  }
};

export const config = { path: '/api/billing' };

// Redeploy trigger: pick up STRIPE_SECRET_KEY env var.
