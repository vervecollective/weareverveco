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
  '<a class="vc-brand" href="/hub"><span class="vc-logo">V</span><span>Verve Collective</span></a>' +
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
