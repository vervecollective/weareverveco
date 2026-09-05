/* A shared username and password on the demo, the way a staging site is gated.
   No account, no invite, no email address collected — an investor gets one link
   and one credential they can pass on.

   This is deliberately not a security boundary. It keeps the demo off search
   engines and out of casual reach; it is not protecting anything sensitive,
   because the demo page ships its own sample data and never touches the
   database. Real client data lives behind Supabase auth and row-level
   security, which is a different mechanism entirely. */

const USER = 'verve';
const PASS = 'collective';

/* Compare every character regardless of where the first mismatch is. Overkill
   for a credential we intend to share, but it costs nothing and means nobody
   has to reason about whether it matters. */
function same(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async (request, context) => {
  const header = request.headers.get('authorization') || '';

  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6));
      const at = decoded.indexOf(':');
      const user = decoded.slice(0, at);
      const pass = decoded.slice(at + 1);
      if (same(user, USER) && same(pass, PASS)) return context.next();
    } catch {
      /* Malformed header falls through to the prompt rather than erroring. */
    }
  }

  return new Response(
    'This walkthrough is password protected.\n\nUsername: verve\nPassword: collective',
    {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Verve Collective walkthrough", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        /* Never index the demo, and never let a proxy hold the page for the
           next person who has not authenticated. */
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'no-store',
      },
    }
  );
};

/* Both paths are gated. Protecting only the clean URL would leave demo.html
   open, which is the usual way this pattern gets bypassed by accident. */
export const config = { path: ['/demo', '/demo.html'] };
