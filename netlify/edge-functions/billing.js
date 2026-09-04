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

async function sbPost(path, token, body) {
  const base = Deno.env.get('SUPABASE_URL');
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  const res = await fetch(base + '/rest/v1/' + path, {
    method: 'POST',
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

/* The payment schedule the Client Services Agreement actually promises. Billing
   the full contract value in one invoice contradicted the agreement the client
   signed, so the schedule is derived from the same deposit_structure the
   agreement's Exhibit A was generated from. */
const SCHEDULES = {
  '5050': [
    { seq: 1, label: 'Deposit \u2014 50% at signing', share: 0.5 },
    { seq: 2, label: 'Balance \u2014 50% at delivery', share: 0.5 },
  ],
  '403030': [
    { seq: 1, label: 'Deposit \u2014 40% at signing', share: 0.4 },
    { seq: 2, label: 'Midpoint milestone \u2014 30%', share: 0.3 },
    { seq: 3, label: 'Balance \u2014 30% at delivery', share: 0.3 },
  ],
  retainer: [
    { seq: 1, label: 'Monthly retainer \u2014 billed in advance', share: 1 },
  ],
};

const money = (n) => '$' + Number(n || 0).toFixed(2);

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const auth = req.headers.get('authorization') || '';
  if (!auth.startsWith('Bearer ')) return json({ error: 'Not signed in' }, 401);
  const token = auth.slice(7);

  const key = Deno.env.get('STRIPE_SECRET_KEY');
  if (!key) return json({ error: 'STRIPE_SECRET_KEY is not set.' }, 500);

  const body = await req.json().catch(() => ({}));
  const engagementId = body.engagementId;
  const requestedSeq = body.seq ? Number(body.seq) : null;
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

  const totalCents = billable.reduce(
    (s, l) => s + Math.round((Number(l.unit_price) || 0) * (Number(l.qty) || 1) * 100), 0
  );
  if (totalCents <= 0) return json({ error: 'The engagement totals $0.00 \u2014 nothing to invoice.' }, 400);

  try {
    /* Build the schedule once, on the first invoice, and never rewrite it. A
       later change to deposit_structure must not silently restate what the
       client already agreed to pay. */
    let schedule = await sbGet(
      'engagement_invoices?engagement_id=eq.' + engagementId + '&select=*&order=seq',
      token
    );
    if (!Array.isArray(schedule)) schedule = [];

    if (!schedule.length) {
      const plan = SCHEDULES[eng.deposit_structure] || SCHEDULES['5050'];
      let allocated = 0;
      const rows = plan.map((p, i) => {
        // The last part absorbs rounding so the parts sum to the total exactly.
        const cents = i === plan.length - 1
          ? totalCents - allocated
          : Math.round(totalCents * p.share);
        allocated += cents;
        return {
          engagement_id: engagementId,
          seq: p.seq,
          label: p.label,
          share: p.share,
          amount: cents / 100,
          status: 'unbilled',
        };
      });
      const created = await sbPost('engagement_invoices', token, rows);
      if (!Array.isArray(created)) {
        return json({ error: 'Could not create the payment schedule: ' + JSON.stringify(created) }, 500);
      }
      schedule = created.slice().sort((a, b) => Number(a.seq) - Number(b.seq));
    }

    const target = requestedSeq
      ? schedule.find((r) => Number(r.seq) === requestedSeq)
      : schedule.find((r) => r.status === 'unbilled');

    if (!target) {
      return json({ error: 'Every part of this payment schedule has already been invoiced.' }, 400);
    }
    if (target.status !== 'unbilled') {
      return json({ error: target.label + ' has already been invoiced.' }, 400);
    }

    /* Do not let the balance go out before the deposit has cleared. The whole
       sequence exists so work never starts on an unpaid deposit, and invoicing
       out of order is how that gets quietly bypassed. */
    const earlierUnpaid = schedule.filter(
      (r) => Number(r.seq) < Number(target.seq) && r.status !== 'paid'
    );
    if (earlierUnpaid.length) {
      return json({
        error: 'Cannot invoice "' + target.label + '" yet \u2014 ' +
          earlierUnpaid.map((r) => r.label).join(' and ') + ' has not been paid.',
      }, 400);
    }

    const targetCents = Math.round(Number(target.amount) * 100);
    if (targetCents <= 0) return json({ error: 'That part of the schedule is $0.00.' }, 400);

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
      description: (eng.client_visible_note || 'Verve Collective LLC \u2014 services as scoped.') +
        ' (' + target.label + ')',
      'metadata[engagement_id]': eng.id,
      'metadata[engagement_invoice_id]': target.id,
      'metadata[seq]': String(target.seq),
    });
    if (invoice.error) throw new Error(invoice.error.message);

    /* Each line is billed at its share of this part rather than collapsing the
       invoice into a single "deposit" line. Section 8.3: never a lump line. */
    let placed = 0;
    for (let i = 0; i < billable.length; i++) {
      const li = billable[i];
      const qty = Number(li.qty) || 1;
      const unit = Number(li.unit_price) || 0;
      const fullCents = Math.round(unit * qty * 100);
      const isLast = i === billable.length - 1;
      const cents = isLast
        ? targetCents - placed
        : Math.round((fullCents / totalCents) * targetCents);
      placed += cents;
      if (cents <= 0) continue;

      const base = qty > 1
        ? li.description + ' (' + qty + ' x ' + money(unit) + ')'
        : li.description;
      const label = Number(target.share) === 1
        ? base
        : base + ' \u2014 ' + target.label + ' of ' + money(fullCents / 100);

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
      throw new Error('Invoice built with no billable lines \u2014 nothing was sent.');
    }
    if (check.total !== targetCents) {
      throw new Error(
        'Invoice total ' + money(check.total / 100) + ' does not match the scheduled ' +
        money(targetCents / 100) + ' \u2014 nothing was sent.'
      );
    }

    const finalized = await stripe('invoices/' + invoice.id + '/finalize', key, {});
    if (finalized.error) throw new Error(finalized.error.message);

    // Finalizing makes it payable; sending is what actually emails the client.
    const sent = await stripe('invoices/' + finalized.id + '/send', key, {});
    if (sent.error) throw new Error('Invoice created but could not be emailed: ' + sent.error.message);

    const url = sent.hosted_invoice_url || finalized.hosted_invoice_url;
    const invoiceId = sent.id || finalized.id;

    await sbPatch('engagement_invoices?id=eq.' + target.id, token, {
      stripe_invoice_id: invoiceId,
      stripe_invoice_url: url,
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    /* amount_total stays the full contract value and the legacy invoice columns
       track whichever invoice is currently outstanding, so the client portal's
       "Pay [balance due]" button and the internal payment link keep working
       without needing to know the schedule exists. */
    await sbPatch('engagements?id=eq.' + eng.id, token, {
      stripe_invoice_id: invoiceId,
      stripe_invoice_url: url,
      amount_total: totalCents / 100,
      payment_status: 'unpaid',
      updated_at: new Date().toISOString(),
    });

    const remaining = schedule.filter((r) => Number(r.seq) > Number(target.seq)).length;
    return json({
      ok: true,
      url,
      part: target.label,
      amount: targetCents / 100,
      remaining_parts: remaining,
    });
  } catch (err) {
    return json({ error: String(err.message || err) }, 500);
  }
};

export const config = { path: '/api/billing' };
