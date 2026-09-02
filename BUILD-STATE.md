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
| `/jobs` | Job offers with call sheets, multi-day, travel/lodging | Live |
| `/mywork` | Everything assigned to you, across accounts | Live |
| `/board` | Task kanban, comments, @mentions, share links | Live |
| `/calendar` | Shoots, milestones, tasks + clash detection | Live |
| `/capacity` | Team load and can-we-take-it planning | Live |
| `/pay` | Contractor invoicing, approval, payment | Live |
| `/documents` | Send + track signatures | Live |
| `/audit` | Social + ad audit with counted checklist | Live (manual data) |
| `/team` | People: team, contractors, client logins | Live |
| `/help` | Role-specific onboarding | Live — **stale, missing Audits/Documents/Jobs** |

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

### Collaboration layer (built after the first draft)
- **Tasks** under milestones, internal by default, with a configurable kanban
- **Comments** threaded per task with @mention autocomplete and email
- **Presence** — heartbeat, live "who's around" panel, 5-minute timeout
- **Capacity** — self-declared per-day availability windows, load bars, what-if planner
- **Organizations** above clients; engagements have date windows and weekly hours
- **Contractor invoicing** — they bill, you approve, you mark paid, both sides emailed
- **Deliverables** — links not uploads; client approves or requests changes
- **Peek drawer** in the shell so detail opens in place on every page
- **Hub dashboard** with stall detection across 7 patterns
- **Propagation triggers** — tasks roll up to milestones, everything logs to `activity`,
  accepted shoots become timeline milestones

### Demo data
A `DEMO —` prefixed organization, client and engagement exist for walking the platform.
Remove with: `delete from public.organizations where name like 'DEMO%';`
**Never cite any of it as traction.**

### Done since first draft
- All five documents drafted, brand-consistent, `hello@` throughout
- SignWell replaces Dropbox Sign (~$4/mo vs $100–300 — no monthly minimum)
- `send-document`, `signwell-webhook`, `notify`, `invite-user` edge functions live
- **SOW autofill** — 19 fields populate from the engagement
- `/jobs` with multi-day call sheets, travel/lodging/meals, stacking packages, multi-location
- Contractor eligibility gate: no IP assignment signed = cannot be offered work
- Branded email via Google Apps Script (job offers, responses, payments)
- Console timeline publishes real milestones; staff can set status
- Mobile shell rebuilt: fixed top bar, drawer, stacked data tables

### P1 — blocks real operation
1. **Contract signing not wired.** Dropbox Sign API key is in Netlify env (`DROPBOX_SIGN_API_KEY`) but nothing calls it. **Your own process says contract → deposit → work.** The system currently lets you skip it.
2. **`/jobs` does not exist.** Contractors can be invited but have nowhere to accept work. Blocks hiring.
3. ~~Contractor agreements~~ — **DONE.** Attorney review still outstanding.
4. **Four SignWell templates still to build** — CSA, SOW, ICA, IP/NDA. Release is done (`04f1dc11-06db-4061-8548-fe258839318b`). Get template IDs from the API, not the browser URL — the share slug is different.
5. **Contractor payment splits do not exist.** One `pay_amount` per assignment, no deposit/balance, no payment tracking.
6. **Contractors cannot submit their own details.** W-9 and payment info still collected by email.

### P2 — degrades the product
4. **Supermetrics dashboards not built.** Blocked: no live ad account is connected to Supermetrics.
   Connect one real account, then build one Studio dashboard and embed it in `/audit`.
5. ~~Milestones read-only~~ — DONE. Console publishes them; staff edit status on the engagement.
6. ~~No email on payment~~ — DONE. Branded mail via Google Apps Script webapp.

### P3 — polish
7. QA sweep of all docs against the built flow
8. Delete the orphaned `engagements` edge function and Blobs store
9. Leaked Password Protection toggle in Supabase (dashboard only)
10. `/help` needs updating — no mention of Audits, Documents, or Jobs
11. No early warning on stalled engagements (proposal sent 21 days ago, no movement)

### Never exercised with a real person
No contractor or client has ever signed in. Role separation, the job-offer email,
the signature flow and contractor invoicing are all built and syntax-checked but
unwalked. **Invite a test contractor and walk their whole path before a real one.**

### Pages live now
`/login` `/welcome` `/hub` `/mywork` `/messages` `/board` `/calendar` `/timeline`
`/capacity` `/console` `/internal` `/audit` `/documents` `/jobs` `/pay` `/team`
`/settings` `/help` `/project` `/proposal.html`

### Collaboration and chat
- **Messaging** — DMs and groups, presence dots, typing indicators, unread counts,
  file upload (10MB), ~130 emoji, reactions with a hover affordance, Realtime
- **Notifications** — bell with badge, written by database triggers, browser popups,
  emails when away
- **Profile cards** — click any avatar anywhere; identity pill top-right
- **Onboarding** — `/welcome`, role-aware, runs once on `onboarded_at`

### Outstanding, needs Trae
1. **Free Giphy key** — GIF search tab is built and waiting
2. **Four SignWell templates** — CSA, SOW, ICA, IP/NDA. Blocks contracts and SOW autofill.
3. **Attorney review** on all five legal documents
4. **Supabase leaked-password protection** toggle
5. **A real client**

### Recurring mistake to avoid
Two patterns have caused every self-inflicted bug in this build:
1. **Broad CSS rules clobbering specific ones** — caused the black flash, the
   invisible button hover, and the oversized mobile logo. Scope new rules narrowly.
2. **Replacing a *range* of code rather than an exact string** — silently ate the
   availability initialiser, so the day grid rendered empty. Always match an exact
   string so a failed patch errors instead of deleting neighbouring code.
3. **Repeated patching corrupts files.** `messages.html` ended up with two copies of
   `paintEmoji` and an orphaned fragment mid-function; the page was broken in
   production. When a file has been patched many times, **rebuild it rather than
   patch it again**, and always `node --check` every script block before pushing.
4. **Generic class names in global rules.** A mobile rule collapsing `.grid` to one
   column silently broke the emoji picker *and* the Gantt chart, because both used
   `.grid` with inline templates. Page-specific containers now use specific names
   (`.gantt-grid`, `.emo-grid`). Never write a global rule against a name a page
   might also use.
5. **JavaScript escapes written into HTML.** `\u2014` inside a Python string that
   builds HTML renders as literal text, not an em dash. It shipped to Help (23
   occurrences) and Messages. Use the real character or an HTML entity.

### Verification habits that caught real bugs
- `node --input-type=commonjs --check` on **every** script block before pushing
- Count `<div>` vs `</div>` after any markup edit
- After pushing, `curl` the live URL and grep for the change — twice this
  revealed the deployed file differed from what was expected
- Query Supabase directly to distinguish "the data is wrong" from "the page is wrong"

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

## 10. Document library

All five carry the same brand, signature blocks that cannot split across pages, and `hello@weareverveco.com` — never a personal address.

| Document | Purpose | When it is signed |
|---|---|---|
| Client Services Agreement | Standing terms of the client relationship | Once, before the first project |
| Statement of Work | Scope, exclusions, dates, price for one project | Per project, before the deposit invoice |
| Independent Contractor Agreement | The contractor relationship and classification | Once, before any assignment |
| Confidentiality & IP Assignment | Confidentiality + assignment of work product | Once, alongside the ICA |
| Appearance & Property Release | Consent from people and property owners on a shoot | Per shoot, returned with deliverables |

**Order that must not slip:**
`CSA signed → SOW signed → deposit invoice → deposit clears → work begins`
`ICA + IP/NDA + W-9 on file → contractor sees scope → assignment offered`

**Outstanding:** one attorney review pass across all five before first real use.

**Email standard, corrected:** contracts and client-facing documents use `hello@weareverveco.com`. This supersedes the earlier instruction in the build prompt to standardise on `trae@`. The Playbook still says `trae@` and needs updating.

---

## 11. Credentials location

All secrets live in environment variables, never in the repo.

**Netlify env:** `STRIPE_SECRET_KEY` · `ADMIN_PASSWORD` · `HUBSPOT_API_TOKEN` · `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `DROPBOX_SIGN_API_KEY` · `STRIPE_WEBHOOK_SECRET`

**Supabase function secrets:** `STRIPE_WEBHOOK_SECRET` · `HUBSPOT_API_TOKEN`

**Entity:** Verve Collective LLC · EIN 42-4451247 · name control VERV · 2547 S Providence Rd, Columbia, MO 65203
