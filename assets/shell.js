/* Verve Collective — shared app shell.
   Include on any internal page:
     <link rel="stylesheet" href="/assets/shell.css">
     <script type="module" src="/assets/shell.js"></script>
   Handles: auth gate, sidebar, role visibility, sign out. */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const sb = createClient(
  'https://otqrkxjtojqlpzzvqavp.supabase.co',
  'sb_publishable_OBViGLggbcOKacti5iUonA_QCzw3kBv'
);
window.__sb = sb;

/* ---- auth gate: no session, no page ---- */
const { data: { session } } = await sb.auth.getSession();
if (!session) {
  location.replace('/login.html?next=' + encodeURIComponent(location.pathname));
}
window.__token = session ? session.access_token : '';
window.__user = session ? session.user : null;

let profile = null;
if (session) {
  const { data } = await sb
    .from('profiles')
    .select('full_name, role, title, avatar_url')
    .eq('id', session.user.id)
    .single();
  profile = data;
}
const role = (profile && profile.role) || 'contractor';
const name = (profile && profile.full_name) || (session && session.user.email) || '';
window.__role = role;
window.__profile = profile;

/* ---- navigation, filtered by role ---- */
const NAV = [
  { group: 'Work', items: [
    { href: '/hub',      label: 'Home',        icon: 'home',   roles: ['owner','account_owner','contractor','client'] },
    { href: '/console',  label: 'Call Console',icon: 'phone',  roles: ['owner','account_owner'] },
    { href: '/internal', label: 'Engagements', icon: 'folder', roles: ['owner','account_owner'] },
    { href: '/jobs',     label: 'My Jobs',     icon: 'check',  roles: ['contractor'] },
    { href: '/project',  label: 'My Project',  icon: 'chart',  roles: ['client'] },
  ]},
  { group: 'Team', items: [
    { href: '/team',        label: 'People',      icon: 'users',  roles: ['owner'] },
    { href: '/contractors', label: 'Contractors', icon: 'camera', roles: ['owner','account_owner'] },
  ]},
  { group: 'Account', items: [
    { href: '/settings', label: 'Settings', icon: 'gear', roles: ['owner','account_owner','contractor','client'] },
  ]},
  { group: 'Business', items: [
    { href: '/admin.html', label: 'Site Content', icon: 'edit', roles: ['owner'] },
    { href: 'https://app.hubspot.com/contacts/51849674/objects/0-3/views/all/board', label: 'HubSpot', icon: 'ext', roles: ['owner','account_owner'], ext: true },
    { href: 'https://dashboard.stripe.com/invoices', label: 'Stripe', icon: 'ext', roles: ['owner'], ext: true },
    { href: 'https://qbo.intuit.com', label: 'QuickBooks', icon: 'ext', roles: ['owner'], ext: true },
  ]},
];

const ICONS = {
  home:  'M3 10.5 12 3l9 7.5M5.5 9.5V20h13V9.5',
  phone: 'M4 5c0 8.3 6.7 15 15 15v-3.2l-4-1.6-2 2a12 12 0 0 1-6.2-6.2l2-2L7.2 5H4z',
  folder:'M3 6h6l2 2.5h10V19H3z',
  check: 'M4 12.5 9 17.5 20 6.5',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  users: 'M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 10.5a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5M20 19v-1.5a3.5 3.5 0 0 0-2.6-3.4',
  camera:'M3 8h3.5L8 6h8l1.5 2H21v11H3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
  edit:  'M4 20h4L19 9l-4-4L4 16zM14.5 5.5l4 4',
  ext:   'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  gear:  'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2V21a2 2 0 1 1-4 0v-.1A1.7 1.7 0 0 0 7 19.4a1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 15a1.7 1.7 0 0 0-1.6-1H1a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 3 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 3h0a1.7 1.7 0 0 0 1-1.6V1a2 2 0 1 1 4 0v.1A1.7 1.7 0 0 0 15 3a1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9v0a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};

const ROLE_LABEL = {
  owner: 'Owner',
  account_owner: 'Account Owner',
  contractor: 'Contractor',
  client: 'Client',
};

function icon(k) {
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
         'stroke-linecap="round" stroke-linejoin="round"><path d="' + (ICONS[k] || ICONS.home) + '"/></svg>';
}

const here = location.pathname.replace(/\/$/, '') || '/hub';
function isActive(href) {
  if (href.startsWith('http')) return false;
  const h = href.replace('.html', '');
  return here === href || here === h || here.replace('.html', '') === h;
}

const initials = name.split(' ').map(p => p[0]).filter(Boolean).join('').slice(0, 2).toUpperCase();

let navHtml = '';
for (const g of NAV) {
  const items = g.items.filter(i => i.roles.includes(role));
  if (!items.length) continue;
  navHtml += '<div class="vc-navgroup">' + g.group + '</div>';
  for (const i of items) {
    navHtml += '<a class="vc-navitem' + (isActive(i.href) ? ' on' : '') + '" href="' + i.href + '"' +
      (i.ext ? ' target="_blank" rel="noopener"' : '') + '>' +
      icon(i.icon) + '<span>' + i.label + '</span>' +
      (i.ext ? '<span class="vc-ext">↗</span>' : '') + '</a>';
  }
}

const shell = document.createElement('div');
shell.className = 'vc-sidebar';
shell.innerHTML =
  '<a class="vc-brand" href="/hub">' + '<img src="data:image/png;base64,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" alt="">' + '<span>Verve Collective</span></a>' +
  '<nav class="vc-nav">' + navHtml + '</nav>' +
  '<div class="vc-user">' +
    '<span class="vc-avatar"' +
      (profile && profile.avatar_url
        ? ' style="background-image:url(' + profile.avatar_url + ');background-size:cover"></span>'
        : '>' + initials + '</span>') +
    '<span class="vc-userinfo"><b>' + name + '</b><em>' + (ROLE_LABEL[role] || role) + '</em></span>' +
    '<button class="vc-signout" id="vcSignOut" title="Sign out">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">' +
      '<path d="M15 17l5-5-5-5M20 12H9M12 20H5V4h7"/></svg></button>' +
  '</div>' +
  '<button class="vc-toggle" id="vcToggle" aria-label="Menu">☰</button>';

document.body.appendChild(shell);
document.body.classList.add('vc-shelled');

document.getElementById('vcSignOut').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.href = '/login.html';
});
document.getElementById('vcToggle').addEventListener('click', () => {
  shell.classList.toggle('open');
});

/* Hide anything a contractor or client must never see, belt-and-braces on top of RLS */
if (role === 'contractor' || role === 'client') {
  document.querySelectorAll('[data-staff-only]').forEach(el => el.remove());
}

window.dispatchEvent(new Event('vc-auth-ready'));
