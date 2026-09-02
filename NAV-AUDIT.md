# Navigation and flow audit
*September 2026. Every route, every link, every dead end.*

---

## Method

Twenty-two routes fetched and checked for: HTTP status, JavaScript syntax errors
in every script block, balanced markup, presence of an init function, empty
states, and whether every internal link resolves.

## Result

**All 22 routes return 200. No JavaScript syntax errors. Markup balanced on
every page. Every internal link resolves.** No 404s, no orphaned pages, no
broken hrefs.

That is the floor, not the ceiling — a page can load cleanly and still be
confusing. The findings below are about flow, not failure.

---

## Findings and fixes

### 1. Notifications was unreachable from the menu — FIXED
`/notifications` existed but was only reachable from a link inside the bell
tray. Someone who dismissed the tray had no route to their own history. It is
now in the menu under Account.

### 2. The board dead-ended for a new account — FIXED
With no engagements at all, the board said "Pick an engagement" and offered no
way to create one. A new account owner would sit there. It now distinguishes
"choose one above" from "there are none yet" and links to Engagements.

### 3. `/task` is intentionally not in the menu
It is reached from a board card, the drawer, a subtask, or a shared link. A menu
entry would be meaningless without an id.

---

## The five journeys, end to end

### Owner, daily
Home → what needs you, ordered by cost of delay → click through to the thing.
**Works.** Eight tiles, each linking somewhere useful.

### Owner, new client
Engagements → phase banner says what to do next → scope → proposal → Documents →
invoice. **Works, and the phase gating means only the relevant tools show.**

### Account owner
Sees only their own engagements. Home, Board, Pay. **Untested with a real
account owner — the isolation is enforced but unobserved.**

### Contractor
Sign in → onboarding → My Work → Jobs → accept → hand over → Pay.
**Untested with a real contractor.** Everything is built and gated correctly.

### Client
Sign in → My Project. Progress, timeline, files, billing, ask a question.
**Untested with a real client login.**

---

## What the audit cannot tell you

Three of the five journeys have never been walked by the person they were built
for. Every check here is structural. A page that loads, links correctly and has
an empty state can still be the wrong page.

**The remaining risk is not in the code. It is that nobody but the owner has
ever used this.**
