# Verve Collective Platform — Build State & Roadmap
*Generated September 2026. This is the source of truth for the platform build.*

---

## 0. How to use this document

Paste the **Context block** below into a new conversation to continue the build without re-explaining anything. Everything is in GitHub and Supabase — nothing lives only in a chat.

### Context block

> I'm building the Verve Collective platform.
> - **Repo:** github.com/vervecollective/weareverveco (public)
> - **Supabase project ref:** `otqrkxjtojqlpzzvqavp`
> - **Netlify site ID:** `924c51d2-3ace-439d-a80c-8a131641fa1c`
> - **Stripe account:** `acct_1UAk9sEAX0n22xEa` (Verve Collective, live)
> - **HubSpot portal:** `51849674`
> - Connectors available: GitHub (via PAT), Netlify, Supabase, Stripe, HubSpot, Supermetrics, QuickBooks
> - Read `BUILD-STATE.md` in the repo for full state, then continue from the roadmap.

---

## 1. Architecture

| Layer | Technology | Notes |
|---|---|---|
| Hosting | Netlify (auto-deploy from GitHub `main`) | Static HTML + edge functions |
| Database | Supabase Postgres | Row-level security on every table |
| Auth | Supabase Auth | Per-user accounts, four roles |
| Payments | Stripe | Restricted key, invoice-only scope |
| CRM | HubSpot | Deal pipeline, synced from webhook |
| Books | QuickBooks | Contractor bills, 1099s |
| Bank | Bluevine | Stripe payout destination |
| Ad data | Supermetrics | Studio dashboards (not yet built) |
| E-signature | Dropbox Sign | Key set, **not yet wired** |

### Money flow
`Client pays Stripe → Stripe pays out to Bluevine → Bluevine bank feed into QuickBooks`

Ad spend never touches any of this. Client's card sits on Google/Meta directly.

---

## 2. Roles

| Role | Sees |
|---|---|
| `owner` | Everything |
| `account_owner` | Only their own clients and engagements |
| `contractor` | Only their own job assignments and pay. Never client pricing or margin. |
| `client` | Only their own project status, timeline, and balance |

Enforced by Postgres RLS policies, not by hiding UI. Helper functions live in a `private` schema so they are unreachable over the REST API.

---

## 3. Database schema (live)

`profiles` · `contractor_details` · `availability` · `clients` · `engagements` · `line_items` · `splits` · `split_defaults` · `assignments` · `documents` · `milestones` · `client_requests` · `audits`

**Key design decisions:**
- **Splits freeze per engagement.** Changing default rates never rewrites historical economics.
- **Contractor cost lives on `line_items`** beside client price, so margin is computed not guessed.
- **`engagements.ad_spend_reference`** is recorded for reporting only and is never invoiced.

---

## 4. Pages built

| Route | Purpose | Status |
|---|---|---|
| `/login` | Supabase auth, password reset | Live |
| `/hub` | Home, client-journey map | Live |
| `/console` | Stage-by-stage call scripts, timeline + deposit calculators | Live |
| `/internal` | Engagements: scope, line items, margin, Stripe invoicing | Live |
| `/audit` | Social + ad audit builder | Live (manual entry) |
| `/team` | People: team, contractors, client logins | Live |
| `/settings` | Profile, security, team invites, split defaults | Live |
| `/help` | Role-specific onboarding | Live |
| `/project` | Client portal: progress, milestones, billing, requests | Live |
| `/jobs` | Contractor job offers, accept/decline | **NOT BUILT** |

---

## 5. Edge functions

| Function | Host | Purpose |
|---|---|---|
| `content` | Netlify | Site CMS content |
| `engagements` | Netlify | Legacy Blobs store — **now orphaned, safe to delete** |
| `billing` | Netlify | Creates + sends Stripe invoices, reads Supabase under caller RLS |
| `blog-posts` | Netlify | Blog feed |
| `invite-user` | Supabase | Owner-only user invites (service role) |
| `stripe-webhook` | Supabase | Payment events → engagement + HubSpot |

---

## 6. Known gaps — ranked

### P1 — blocks real operation
1. **Contract signing not wired.** Dropbox Sign API key is in Netlify env (`DROPBOX_SIGN_API_KEY`) but nothing calls it. **Your own process says contract → deposit → work.** The system currently lets you skip it.
2. **`/jobs` does not exist.** Contractors can be invited but have nowhere to accept work. Blocks hiring.
3. **Contractor agreements do not exist** — ICA, IP assignment/NDA, model release. Without IP assignment you cannot legally license contractor footage to a client.

### P2 — degrades the product
4. **Supermetrics dashboards not built.** Audit data is entered by hand, which does not scale past one person.
5. **Milestones are read-only.** `/project` displays them; nothing writes them. Console's timeline builder should save them.
6. **No email on payment.** Webhook updates records silently. Needs a Resend key.

### P3 — polish
7. QA sweep of all docs against the built flow
8. Delete the orphaned `engagements` edge function and Blobs store
9. Leaked Password Protection toggle in Supabase (dashboard only)

---

## 7. Sequenced roadmap

### Phase 1 — Make hiring possible *(P1)*
1. Draft the three contractor documents (ICA, IP assignment + NDA, model release)
2. Wire Dropbox Sign: send → track status in `documents` → webhook back on signature
3. Build `/jobs` — contractor sees offer, scope, date, their pay; accepts or declines
4. Add contractor assignment UI to `/internal`

**Done when:** you can invite a videographer, they sign, get offered a job, and accept it.

### Phase 2 — Close the delivery loop *(P2)*
5. Console timeline builder writes to `milestones`
6. Milestone status editor for staff
7. Resend integration → payment and assignment emails

**Done when:** paying a deposit populates the client's timeline automatically.

### Phase 3 — Reporting at scale *(P2)*
8. Connect a real ad account in Supermetrics
9. Build one Studio dashboard, scoped to that account
10. Embed in `/audit`; duplicate per client, scoped per account owner
11. Owner-level roll-up dashboard across all accounts

**Done when:** an account owner opens a link and sees live client data without manual entry.

### Phase 4 — QA and documentation *(P3)*
12. Full flow audit: every page against the playbook
13. Reconcile doc language — the ad-audit-live vs social-sweep-after distinction is now correct in Console and Help, but other docs may still contradict
14. Standardise `trae@` vs `hello@` across all scripts and docs
15. Delete orphaned function and Blobs store

---

## 8. Design system

**Palette** — neutral base, colour for state only.

| Token | Value | Use |
|---|---|---|
| Canvas | `#f7f8f9` | Page background |
| Surface | `#ffffff` | Cards |
| Border | `#e5e7eb` | All dividers |
| Text | `#111827` | Primary |
| Text 2 | `#4b5563` | Secondary |
| Text 3 | `#6b7280` | Tertiary |
| Accent | `#D9531E` | Primary actions + active nav ONLY |
| Success | `#047857` / `#ecfdf5` | Paid, done |
| Warning | `#b45309` / `#fffbeb` | Needs attention |
| Error | `#b91c1c` / `#fef2f2` | Broken, blocked |

**Rules**
- Colour communicates state, never decoration
- 256px sidebar, left-aligned content at 1160px max
- Cards on canvas, not a flat white page
- Mobile: 44px touch targets, 16px inputs (prevents iOS zoom), drawer nav
- One accent. The black-and-orange brand palette belongs on the marketing site, not the tool.

---

## 9. Business rules that must never break

1. **Ad spend is never invoiced by Verve**, never marked up, never blended with a management fee
2. **Contractor cost and Verve fee always appear as separate line items**
3. **Contract signed before invoice, invoice before work**
4. **No fabricated results, client counts, or case studies** — ever
5. **Account owner splits agreed in writing before handover**, never renegotiated mid-engagement
6. Contractor markup: 1.5× standard (Verve keeps 33%). 1.33× pass-through, 1.67× art-directed
7. Splits: 40/60 Verve-sourced · 20/80 owner-sourced · 10/90 own-brand

---

## 10. Credentials location

All secrets live in environment variables, never in the repo.

**Netlify env:** `STRIPE_SECRET_KEY` · `ADMIN_PASSWORD` · `HUBSPOT_API_TOKEN` · `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `DROPBOX_SIGN_API_KEY` · `STRIPE_WEBHOOK_SECRET`

**Supabase function secrets:** `STRIPE_WEBHOOK_SECRET` · `HUBSPOT_API_TOKEN`

**Entity:** Verve Collective LLC · EIN 42-4451247 · name control VERV · 2547 S Providence Rd, Columbia, MO 65203
