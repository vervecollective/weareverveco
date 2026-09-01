# Platform Audit — four flows against the business plan
*September 2026. Read with BUILD-STATE.md.*

---

## The headline

**The system is complete and untested.** One owner account. Zero account owners,
zero contractors, zero client logins, zero signed documents, zero proposals sent,
zero contractor invoices, zero assignments, zero notifications.

Everything below is built and syntax-checked. Almost none of it has been walked
by a second human being. That is the single largest risk in the build, and no
further feature reduces it.

---

## 1. Owner flow

**Path:** Home → Console → Engagements → Documents → Pay → Capacity

### Works
- Dashboard opens on what costs most if it waits, not what happened most recently
- Stall detection covers seven patterns with distinct thresholds and distinct advice
- Margin is calculated from contractor cost, never guessed
- Splits freeze per engagement, so changing defaults cannot rewrite history
- Ad spend is structurally excluded from invoices, enforced in the billing function

### Gaps
| Gap | Impact |
|---|---|
| **Four SignWell templates missing** | Contract signing does not work. SOW autofill is built and idle. |
| **No QuickBooks vendor sync** | Adding a contractor as a 1099-tracked vendor is manual and easy to forget |
| **No revenue reporting** | Money is visible per engagement, never in aggregate. No month view, no year-to-date. |
| **Console notes and Proposals overlap** | Both capture "their situation". Two places to write the same thing. |

### Against the business plan
Consistent. Two core services, add-ons never given equal billing, ad spend never
marked up, no fabricated traction anywhere. The plan's "pre-launch, stated plainly"
posture matches what the platform actually shows.

---

## 2. Account owner flow

**Path:** Home → their own engagements → Board → Capacity

### Works
- RLS scopes them to their own clients. Enforced in the database, not by hiding links.
- Split table and its reasoning are on the Help page in their own words
- Margin visible live while scoping

### Gaps
| Gap | Impact |
|---|---|
| **Never tested** | No account owner has ever signed in. The isolation is unproven in practice. |
| **No earnings view** | They can see engagement value but not "what have I earned this month" |
| **No onboarding path** | An invited account owner lands on Help with no guided first-run |
| **Cannot be paid through the system** | `contractor_invoices` is keyed to assignments. An account owner's share has no route. |

**The last one is a real hole.** The split is documented, agreed and stored — and
there is no mechanism to actually pay it. That needs building before the first
account owner, not after.

---

## 3. Contractor flow

**Path:** invite → Settings availability → sign docs → My Work → Jobs → Pay

### Works
- Cannot be offered work without a signed IP assignment. Hard block, database-backed.
- Call sheets carry multi-day schedules, travel, lodging, meals, gear, arrival notes
- They see total compensation, never client price or margin
- Declining is explicitly framed as fine, in three separate places
- They declare their own availability rather than having it assumed
- Paid on Verve's terms regardless of client payment, stated in the ICA and the UI

### Gaps
| Gap | Impact |
|---|---|
| **Never tested** | The most complex role, entirely unwalked |
| **No file delivery route** | They finish a shoot with nowhere in the platform to hand work over. Frame.io is referenced, never linked. |
| **W-9 collection is partial** | Last four digits captured; the actual signed W-9 is still an email attachment |
| **No earnings history** | Invoices are listed; there is no year-to-date total for their own tax planning |

---

## 4. Client flow

**Path:** invite → My Project → progress, timeline, files, billing, questions

### Works
- Progress track in plain language, not pipeline jargon
- "Needs you" in amber is the clearest thing on the page — it is usually the client blocking themselves
- Deliverables approve or request changes, feedback returns to the engagement
- Activity feed writes itself from triggers
- Ad spend explained in their terms, separated from the invoice

### Gaps
| Gap | Impact |
|---|---|
| **Never tested** | No client login has ever been used |
| **No email on client-visible events** | A deliverable is shared and they only find out by visiting |
| **No document access** | Their signed agreement and SOW are not visible to them |
| **One engagement only** | The portal shows the most recent. A client with two projects sees one. |
| **No invoice history** | Current balance shows; past invoices do not |

---

## Cross-cutting

### Two places where the model may not match reality
1. **Console notes vs Proposals** — overlapping capture of the same discovery content
2. **`assignments` vs `engagement_team`** — correct distinction (shoot days vs standing
   involvement) but the naming does not teach it. Expect confusion.

### Documents
| Document | State |
|---|---|
| Client Services Agreement | Current. Needs attorney review. |
| Statement of Work | Current. Autofill built, waiting on a template. |
| ICA / IP Assignment / Release | Current. Needs attorney review. |
| Pricing & Splits | Current |
| Brand & Messaging Guides | Current |
| QA Playbook | **Stale** — still says `trae@` for contracts; standard is now `hello@` |
| Business Plan | **Stale** — does not mention the platform, which is now a real asset |

### Help page
Rewritten and current, but missing: notifications, subtasks and dependencies,
the peek drawer, and how the board columns can be reconfigured.

---

## What to do, in order

1. **Invite a test contractor and walk the whole path.** Ten minutes. Highest value item on this list.
2. **Build the four SignWell templates.** Unblocks contracts and SOW autofill.
3. **Account owner payouts.** The split has no payment route. Build before the first one is hired.
4. **Email on client-visible events.** A shared deliverable that nobody is told about is not delivered.
5. **Update the Playbook** for the `hello@` decision, and the Business Plan for the platform.
6. **Attorney review** across all five legal documents.

Everything else is refinement. These six are load-bearing.
