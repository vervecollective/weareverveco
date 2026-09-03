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
    .select('full_name, role, title, avatar_url, onboarded_at, phone, demo_role, status, business_name, logo_url, brand_colour, website, instagram, tiktok, facebook')
    .eq('id', session.user.id)
    .single();
  profile = data;
}
const realRole = (profile && profile.role) || 'contractor';
/* Previewing another role changes what the interface shows, never what the
   database allows. Row-level security still answers to the real account, so a
   preview can never reveal something the owner could not already see. */
const previewRole = (realRole === 'owner' && profile && profile.demo_role) || null;
const role = previewRole || realRole;
window.__realRole = realRole;
window.__preview = previewRole;

/* First run: send them through onboarding once, then never again. */
if (profile && !profile.onboarded_at && !location.pathname.startsWith('/welcome')) {
  location.replace('/welcome');
}
const name = (profile && profile.full_name) || (session && session.user.email) || '';
window.__role = role;
window.__profile = Object.assign({ id: session.user.id }, profile || {});

/* ---- navigation, filtered by role ---- */
const NAV = [
  { group: 'Today', items: [
    { href: '/hub',      label: 'Home',      icon: 'home',  roles: ['owner','account_owner','contractor','client'] },
    { href: '/mywork',   label: 'My Work',   icon: 'check', roles: ['owner','account_owner','contractor'] },
    { href: '/messages', label: 'Messages',  icon: 'chat',  roles: ['owner','account_owner','contractor'] },
    { href: '/project',  label: 'My Project',icon: 'chart', roles: ['client'] },
  ]},
  { group: 'Plan', items: [
    { href: '/board',    label: 'Board',     icon: 'board', roles: ['owner','account_owner','contractor'] },
    { href: '/calendar', label: 'Calendar',  icon: 'cal',   roles: ['owner','account_owner','contractor'] },
    { href: '/timeline', label: 'Timeline',  icon: 'gantt', roles: ['owner','account_owner'] },
    { href: '/capacity', label: 'Capacity',  icon: 'gauge', roles: ['owner','account_owner'] },
  ]},
  { group: 'Clients', items: [
    { href: '/console',  label: 'Call Console', icon: 'phone',  roles: ['owner','account_owner'] },
    { href: '/internal', label: 'Engagements',  icon: 'folder', roles: ['owner','account_owner'] },
    { href: '/audit',    label: 'Audits',       icon: 'chart',  roles: ['owner','account_owner'] },
    { href: '/documents',label: 'Documents',    icon: 'doc',    roles: ['owner','account_owner'] },
  ]},
  { group: 'Crew', items: [
    { href: '/jobs', label: 'Jobs',   icon: 'camera', roles: ['owner','account_owner','contractor'] },
    { href: '/pay',  label: 'Pay',    icon: 'cash',   roles: ['owner','account_owner','contractor'] },
    { href: '/team', label: 'People', icon: 'users',  roles: ['owner','account_owner'] },
  ]},
  { group: 'Account', items: [
    { href: '/settings', label: 'Settings', icon: 'gear', roles: ['owner','account_owner','contractor','client'] },
    { href: '/resources', label: 'Resources', icon: 'book', roles: ['owner','account_owner','contractor'] },
    { href: '/notifications', label: 'Notifications', icon: 'bell', roles: ['owner','account_owner','contractor','client'] },
    { href: '/help',     label: 'Help',     icon: 'help', roles: ['owner','account_owner','contractor','client'] },
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
  help:  'M12 17h.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18',
  doc:   'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  cal:   'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  cash:  'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M6 10v.01M18 14v.01',
  gauge: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M13.4 10.6 19 5M4.2 18a9 9 0 1 1 15.6 0z',
  gantt: 'M4 6h9M4 12h14M4 18h6M3 4v16',
  chat:  'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H9l-5 4z',
  book:  'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  bell:  'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0',
  gear:  'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z',
  help:  'M12 17h.01M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18',
  doc:   'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
  board: 'M4 4h5v16H4zM10 4h5v10h-5zM16 4h4v13h-4z',
  cal:   'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  cash:  'M3 7h18v10H3zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M6 10v.01M18 14v.01',
  gauge: 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4M13.4 10.6 19 5M4.2 18a9 9 0 1 1 15.6 0z',
  gantt: 'M4 6h9M4 12h14M4 18h6M3 4v16',
  chat:  'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 0 1 21 11.5z',
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
    '<span class="vc-avatar" data-profile="' + session.user.id + '"' +
      (profile && profile.avatar_url
        ? ' style="background-image:url(' + profile.avatar_url + ');background-size:cover"></span>'
        : '>' + initials + '</span>') +
    '<span class="vc-userinfo"><b>' + name + '</b><em>' + (ROLE_LABEL[role] || role) + '</em></span>' +
    '<button class="vc-signout" id="vcSignOut" title="Sign out" aria-label="Sign out">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" ' +
      'stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>' +
      '<path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>' +
      '<span class="vc-signout-txt">Sign out</span></button>' +
  '</div>' +
  '';

document.body.appendChild(shell);
document.body.classList.add('vc-shelled');

/* Top bar lives on <body>, outside the sidebar, so it stays put when the
   drawer slides. Inside the sidebar it inherited the transform and vanished. */
const topbar = document.createElement('div');
topbar.className = 'vc-topbar';
topbar.innerHTML =
  '<button class="vc-toggle" id="vcToggle" aria-label="Open menu">' +
    '<span></span><span></span><span></span></button>' +
  '<span class="vc-topbar-title">Verve Collective</span>' +
  '<a class="vc-topbar-me" href="/settings" aria-label="Settings"></a>';
document.body.appendChild(topbar);

const scrim = document.createElement('div');
scrim.className = 'vc-scrim';
scrim.addEventListener('click', () => shell.classList.remove('open'));
document.body.appendChild(scrim);

const me = document.querySelector('.vc-topbar-me');
if (me) me.textContent = initials;

// Collapse the rail to icons. Remembered per device.
const collapseBtn = document.createElement('button');
collapseBtn.className = 'vc-collapse';
collapseBtn.id = 'vcCollapse';
collapseBtn.setAttribute('aria-label', 'Collapse menu');
collapseBtn.innerHTML =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>';
shell.appendChild(collapseBtn);

if (localStorage.getItem('vc-rail') === 'mini') document.body.classList.add('vc-mini');

collapseBtn.addEventListener('click', () => {
  const mini = document.body.classList.toggle('vc-mini');
  localStorage.setItem('vc-rail', mini ? 'mini' : 'full');
});

document.getElementById('vcSignOut').addEventListener('click', async () => {
  await sb.auth.signOut();
  location.href = '/login.html';
});
document.getElementById('vcToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  shell.classList.toggle('open');
  document.body.classList.toggle('vc-locked', shell.classList.contains('open'));
});

/* On a phone the drawer covers the page — close it as soon as a link is tapped,
   and let a tap outside dismiss it. */
shell.querySelectorAll('.vc-navitem').forEach((a) => {
  a.addEventListener('click', () => {
    shell.classList.remove('open');
    document.body.classList.remove('vc-locked');
  });
});
document.addEventListener('click', (e) => {
  if (window.innerWidth > 860) return;
  if (!shell.classList.contains('open')) return;
  if (shell.contains(e.target) || e.target.closest('#vcToggle')) return;
  shell.classList.remove('open');
  document.body.classList.remove('vc-locked');
});

/* Hide anything a contractor or client must never see, belt-and-braces on top of RLS */
if (role === 'contractor' || role === 'client') {
  document.querySelectorAll('[data-staff-only]').forEach(el => el.remove());
}


/* ── Presence ──────────────────────────────────────────────────────────────
   A heartbeat row per person. Anything not touched in five minutes is treated
   as away, so a closed laptop stops showing as online without needing a
   reliable disconnect event. Clients are excluded — this is a team view. */
if (role !== 'client') {
  const PAGE_LABEL = {
    '/hub':'Home', '/board':'Board', '/console':'Call console',
    '/internal':'Engagements', '/jobs':'Jobs', '/audit':'Audits',
    '/documents':'Documents', '/team':'People', '/settings':'Settings',
    '/help':'Help', '/project':'Project'
  };

  function pageLabel(){
    const p = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/hub';
    return PAGE_LABEL[p] || 'Working';
  }

  async function beat(){
    try {
      await sb.from('presence').upsert({
        profile_id: session.user.id,
        last_seen_at: new Date().toISOString(),
        current_page: pageLabel(),
        engagement_id: window.__engagementContext || null
      }, { onConflict: 'profile_id' });
    } catch (e) { /* presence is a nicety, never block the page for it */ }
  }

  beat();
  let beatTimer = setInterval(beat, 60000);

  // Stop pinging when the tab is hidden; resume on return.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clearInterval(beatTimer); }
    else { beat(); clearInterval(beatTimer); beatTimer = setInterval(beat, 60000); }
  });

  const panel = document.createElement('div');
  panel.className = 'vc-presence';
  panel.innerHTML = '<div class="vc-pres-h">Who\u2019s around</div><div id="vcPresList"></div>';
  shell.querySelector('.vc-user').before(panel);

  async function paintPresence(){
    const since = new Date(Date.now() - 5 * 60000).toISOString();
    const { data } = await sb
      .from('presence')
      .select('profile_id, current_page, last_seen_at, profiles(full_name, avatar_url, role)')
      .gte('last_seen_at', since)
      .order('last_seen_at', { ascending: false });

    const rows = (data || []).filter(r => r.profile_id !== session.user.id);
    const list = document.getElementById('vcPresList');
    if (!list) return;

    if (!rows.length) {
      list.innerHTML = '<div class="vc-pres-none">No one else right now</div>';
      return;
    }
    list.innerHTML = rows.slice(0, 6).map(r => {
      const p = r.profiles || {};
      const nm = p.full_name || 'Someone';
      const init = nm.split(' ').map(x => x[0]).filter(Boolean).join('').slice(0,2).toUpperCase();
      const av = p.avatar_url
        ? `<span class="vc-pres-av" style="background-image:url(${p.avatar_url});background-size:cover"></span>`
        : `<span class="vc-pres-av">${init}</span>`;
      return `<div class="vc-pres-row" data-profile="${r.profile_id}" title="${nm} \u00b7 ${r.current_page || ''}">
          ${av}<span class="vc-pres-dot"></span>
          <span class="vc-pres-t"><b>${nm.split(' ')[0]}</b><em>${r.current_page || 'Working'}</em></span>
        </div>`;
    }).join('');
  }

  paintPresence();
  setInterval(paintPresence, 45000);

  // Live updates rather than waiting for the next poll.
  sb.channel('presence-feed')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, paintPresence)
    .subscribe();
}


/* ── Peek drawer ───────────────────────────────────────────────────────────
   One detail panel every page can open, so clicking a thing shows the thing
   rather than navigating somewhere and losing your place. Call it with
   window.vcPeek('task'|'assignment'|'milestone'|'engagement', id). */
try {
(function(){
    const veil = document.createElement('div');
    veil.className = 'vc-peek-veil';
    const panel = document.createElement('div');
    panel.className = 'vc-peek';
    panel.innerHTML =
      '<div class="vc-peek-h">' +
        '<span class="vc-peek-k" id="vcPeekKind"></span>' +
        '<div style="display:flex;gap:8px;align-items:center">' +
          '<a class="vc-peek-open" id="vcPeekOpen" href="#">Expand</a>' +
          '<button class="vc-peek-x" id="vcPeekX" aria-label="Close">&times;</button>' +
        '</div>' +
      '</div><div class="vc-peek-b" id="vcPeekBody"></div>';
    document.body.append(veil, panel);
  
    function shut(){
      panel.classList.remove('on'); panel.classList.remove('pushed');
      veil.classList.remove('on');
      const th = document.querySelector('.vc-thread');
      if (th) th.classList.remove('on');
      document.body.classList.remove('vc-locked');
    }
    veil.addEventListener('click', shut);
    document.getElementById('vcPeekX').addEventListener('click', shut);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') shut(); });
  
    const esc = (v) => { const d = document.createElement('div'); d.textContent = v == null ? '' : v; return d.innerHTML; };
    const money = (n) => '$' + (Number(n)||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const date = (d) => d ? new Date(d + 'T12:00:00').toLocaleDateString('en-US',
      { weekday:'short', month:'long', day:'numeric' }) : '\u2014';
    const fld = (k, v) => '<div class="vc-peek-f"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';
  
    window.vcPeek = async function(kind, id){
      if (!id) return;
      document.getElementById('vcPeekKind').textContent =
        ({ task:'Task', assignment:'Shoot', milestone:'Milestone', engagement:'Engagement' })[kind] || 'Detail';
      document.getElementById('vcPeekBody').innerHTML = '<p class="vc-peek-load">Loading\u2026</p>';
      document.getElementById('vcPeekOpen').href =
        ({ task:'/task?id=' + id, assignment:'/jobs', milestone:'/internal', engagement:'/internal' })[kind] || '#';
  
      panel.classList.add('on'); veil.classList.add('on');
      document.body.classList.add('vc-locked');
  
      let html = '';
      try {
        /* Comments belong on anything you can open, not only tasks. A shoot and
         a milestone both generate questions that currently go into a DM and
         are lost. */
      async function discussionFor(col, id, engId){
        const { data: cm } = await sb.from('comments')
          .select('id, body, created_at, profiles:author_id(full_name)')
          .eq(col, id).is('parent_comment_id', null)
          .order('created_at', { ascending:false }).limit(4);

        const rows = (cm || []).slice().reverse().map((c) => {
          const nm = (c.profiles && c.profiles.full_name) || 'Someone';
          const iv = nm.split(' ').map(x => x[0]).filter(Boolean).join('').slice(0,2).toUpperCase();
          const when = new Date(c.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric'});
          return '<div class="vc-peek-c"><span class="vc-peek-av">' + iv + '</span>' +
            '<span class="vc-peek-cb"><em>' + esc(nm) + ' \u00b7 <i>' + when + '</i></em>' +
            esc(c.body) +
            '<span class="vc-peek-cacts"><button class="vc-peek-more" data-thread="' + c.id + '">' +
            'Reply</button></span></span></div>';
        }).join('');

        return '<div class="vc-peek-cm" data-col="' + col + '" data-oid="' + id +
               '" data-eng="' + (engId || '') + '"><b>Discussion</b>' +
          (rows || '<p class="vc-peek-load">Nothing said yet.</p>') +
          '<div class="vc-peek-add">' +
            '<textarea class="vcAnyNew" rows="2" placeholder="Add a comment"></textarea>' +
            '<button class="vcAnySend">Comment</button></div></div>';
      }

      if (kind === 'task') {
          const { data: t } = await sb.from('tasks')
            .select('*, engagements(title, clients(business_name)), profiles:assignee_id(full_name)')
            .eq('id', id).single();
          if (!t) throw new Error('Not found');
  
          const [{ data: cm }, { data: subs }, { data: cols }, { data: allCm }] = await Promise.all([
            sb.from('comments').select('id, body, created_at, parent_comment_id, profiles:author_id(full_name)')
              .eq('task_id', id).is('parent_comment_id', null)
              .order('created_at', { ascending:false }).limit(4),
            sb.from('tasks').select('id, title, status').eq('parent_task_id', id).order('sort_order'),
            sb.from('board_statuses').select('*').eq('active', true).order('sort_order'),
            sb.from('comments').select('id, parent_comment_id').eq('task_id', id)
          ]);
  
          const cmCount = (allCm || []).length;
          const replyCount = {};
          (allCm || []).forEach((c) => {
            if (!c.parent_comment_id) return;
            replyCount[c.parent_comment_id] = (replyCount[c.parent_comment_id] || 0) + 1;
          });
  
          const COLS = (cols && cols.length) ? cols : [
            { key:'todo', label:'To do', colour:'#94A3B8', is_done:false },
            { key:'in_progress', label:'In progress', colour:'#9A3412', is_done:false },
            { key:'done', label:'Done', colour:'#00A870', is_done:true }
          ];
          const doneKeys = COLS.filter(c => c.is_done).map(c => c.key);
          const cur = COLS.filter(c => c.key === t.status)[0] || COLS[0];
  
          const total = (subs || []).length;
          const done = (subs || []).filter(x => doneKeys.indexOf(x.status) > -1).length;
          const pct = total ? Math.round(done / total * 100) : 0;
  
          html =
            '<div class="vc-peek-status" style="background:' + cur.colour + '">' + esc(cur.label) + '</div>' +
            '<h3>' + esc(t.title) + '</h3>' +
            (t.detail ? '<p class="vc-peek-d">' + esc(t.detail) + '</p>' : '') +
  
            (total
              ? '<div class="vc-peek-prog"><div class="vc-peek-prog-h">' +
                  '<span>Subtasks</span><b>' + done + ' of ' + total + '</b></div>' +
                  '<div class="vc-peek-bar"><i style="width:' + pct + '%"></i></div>' +
                  (subs || []).slice(0, 4).map((x) =>
                    '<div class="vc-peek-sub' + (doneKeys.indexOf(x.status) > -1 ? ' done' : '') + '">' +
                    esc(x.title) + '</div>').join('') +
                  (total > 4 ? '<div class="vc-peek-sub more">and ' + (total - 4) + ' more</div>' : '') +
                '</div>'
              : '') +
  
            fld('Account', (t.engagements && t.engagements.clients && t.engagements.clients.business_name) || '\u2014') +
            fld('Assignee', (t.profiles && t.profiles.full_name) || 'Unassigned') +
            fld('Priority', t.priority) +
            fld('Due', t.due_date ? date(t.due_date) : '\u2014') +
            (t.blocked_reason ? fld('Blocked by', t.blocked_reason) : '') +
  
            '<div class="vc-peek-quick"><label>Move to</label><select id="vcPeekStatus">' +
              COLS.map(c => '<option value="' + c.key + '"' + (c.key === t.status ? ' selected' : '') + '>' +
                esc(c.label) + '</option>').join('') + '</select></div>' +
  
            '<div class="vc-peek-cm" id="vcPeekCm"><b>Discussion' +
              (cmCount ? ' <span class="vc-peek-n">' + cmCount + '</span>' : '') + '</b>' +
              ((cm && cm.length)
                ? cm.slice().reverse().map((c) => {
                    const nm = (c.profiles && c.profiles.full_name) || 'Someone';
                    const iv = nm.split(' ').map(x => x[0]).filter(Boolean).join('').slice(0,2).toUpperCase();
                    const when = new Date(c.created_at).toLocaleDateString('en-US',{ month:'short', day:'numeric' });
                    const kids = replyCount[c.id] || 0;
                    return '<div class="vc-peek-c"><span class="vc-peek-av">' + iv + '</span>' +
                      '<span class="vc-peek-cb"><em>' + esc(nm) + ' \u00b7 <i>' + when + '</i></em>' +
                      esc(c.body) +
                      '<span class="vc-peek-cacts">' +
                        '<button class="vc-peek-more" data-thread="' + c.id + '">' +
                          (kids ? kids + (kids === 1 ? ' reply' : ' replies') : 'Reply') +
                        '</button>' +
                      '</span>' +
                      '</span></div>';
                  }).join('')
                : '<p class="vc-peek-load">No comments yet. Say the first thing.</p>') +
              (cmCount > 4 ? '<a class="vc-peek-all" href="/task?id=' + id + '">See all ' + cmCount + '</a>' : '') +
              '<div class="vc-peek-add">' +
                '<textarea id="vcPeekNew" rows="2" placeholder="Add a comment"></textarea>' +
                '<button id="vcPeekSend">Comment</button>' +
              '</div>' +
            '</div>';
  
        } else if (kind === 'assignment') {
          const { data: a } = await sb.from('assignments')
            .select('*, assignment_days(*), engagements(clients(business_name)), profiles:contractor_id(full_name)')
            .eq('id', id).single();
          if (!a) throw new Error('Not found');
          const dayList = (a.assignment_days || [])
            .sort((x,y) => (x.sort_order||0) - (y.sort_order||0))
            .map((d) => '<div class="vc-peek-f"><span>' + esc(date(d.work_date)) + '</span><b>' +
              (d.call_time ? d.call_time.slice(0,5) + (d.wrap_time ? '\u2013' + d.wrap_time.slice(0,5) : '') : 'Time TBC') +
              '</b></div>').join('');
  
          html = '<h3>' + esc(a.role_on_job) + '</h3>' +
            '<p class="vc-peek-d">' + esc(a.scope || '') + '</p>' +
            fld('Account', (a.engagements && a.engagements.clients && a.engagements.clients.business_name) || '\u2014') +
            fld('Crew', (a.profiles && a.profiles.full_name) || 'Unassigned') +
            fld('Status', a.status) +
            (a.location ? fld('Location', a.location) : '') +
            (a.performer === 'internal' ? fld('Doing it', 'In-house') : fld('Their pay', money(a.pay_amount))) +
            (dayList ? '<div class="vc-peek-cm"><b>Schedule</b>' + dayList + '</div>' : '');
  
          html += await discussionFor('assignment_id', id, a && a.engagement_id);

      } else if (kind === 'milestone') {
          const { data: m } = await sb.from('milestones')
            .select('*, engagements(title, clients(business_name))').eq('id', id).single();
          if (!m) throw new Error('Not found');
          html = '<h3>' + esc(m.label) + '</h3>' +
            fld('Account', (m.engagements && m.engagements.clients && m.engagements.clients.business_name) || '\u2014') +
            /* Editable in place. Moving a date from the timeline is the most
               common thing anyone wants to do here. */
            '<div class="vc-peek-quick"><label for="vcPeekMsStatus">Status</label>' +
              '<select id="vcPeekMsStatus">' +
                ['not_started','in_progress','blocked','done','cancelled'].map((k) =>
                  '<option value="' + k + '"' + (k === String(m.status) ? ' selected' : '') + '>' +
                  k.replace(/_/g,' ').replace(/^./, c => c.toUpperCase()) + '</option>').join('') +
              '</select></div>' +
            '<div class="vc-peek-quick"><label for="vcPeekMsDate">Due</label>' +
              '<input type="date" id="vcPeekMsDate" value="' + (m.due_date || '') + '"></div>' +
            (m.due_date && m.due_date < new Date().toISOString().slice(0,10)
              ? '<p class="vc-peek-warn">Past its date. Moving it shifts the work under it ' +
                'and tells the account owner.</p>' : '');
  
          html += await discussionFor('milestone_id', id, m && m.engagement_id);

      } else if (kind === 'engagement') {
          const { data: e } = await sb.from('engagements')
            .select('*, clients(business_name, contact_name), line_items(*)').eq('id', id).single();
          if (!e) throw new Error('Not found');
          const total = (e.line_items || []).reduce((s,l) => s + (Number(l.qty)||1) * (Number(l.unit_price)||0), 0);
          html = '<h3>' + esc((e.clients && e.clients.business_name) || e.title || 'Engagement') + '</h3>' +
            fld('Stage', String(e.stage).replace(/_/g,' ')) +
            fld('Starts', e.start_date ? date(e.start_date) : '\u2014') +
            fld('Value', money(total)) +
            fld('Paid', money(e.amount_paid)) +
            fld('Hours a week', (Number(e.weekly_hours)||0) + 'h');
        }
      } catch (err) {
        html = '<p class="vc-peek-load">Could not load that.</p>';
      }
      document.getElementById('vcPeekBody').innerHTML = html;
  
      /* Commenting from the drawer, so a quick answer does not need a page load. */
      const send = document.getElementById('vcPeekSend');
      if (send) {
        const ta = document.getElementById('vcPeekNew');
        const post = async () => {
          const body = ta.value.trim();
          if (!body) return;
          send.disabled = true;
          const { data: t } = await sb.from('tasks').select('engagement_id').eq('id', id).single();
          const { error } = await sb.from('comments').insert({
            engagement_id: t && t.engagement_id, task_id: id, author_id: session.user.id, body
          });
          send.disabled = false;
          if (error) { alert(error.message); return; }
          ta.value = '';
          window.vcPeek('task', id);
        };
        send.addEventListener('click', post);
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
        });
      }
  
      /* A thread opens a second panel to the left rather than replacing what you
         were looking at, so the task stays in view while you read the replies. */
      // Handled by a delegated listener installed once (see below).
  
      /* Commenting from any drawer, whatever it is showing. */
    const anySend = document.querySelector('.vcAnySend');
    if (anySend) {
      const wrap = anySend.closest('.vc-peek-cm');
      const ta   = wrap.querySelector('.vcAnyNew');
      const post = async () => {
        const body = ta.value.trim();
        if (!body) return;
        anySend.disabled = true;
        const row = { author_id: session.user.id, body: body,
                      engagement_id: wrap.dataset.eng || null };
        row[wrap.dataset.col] = wrap.dataset.oid;
        const { error } = await sb.from('comments').insert(row);
        anySend.disabled = false;
        if (error) { alert(error.message); return; }
        ta.value = '';
        window.vcPeek(kind, id);
      };
      anySend.addEventListener('click', post);
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
      });
    }

    /* Editing a milestone date without leaving the timeline. */
    const msDate = document.getElementById('vcPeekMsDate');
    if (msDate) {
      msDate.addEventListener('change', async () => {
        await sb.from('milestones').update({ due_date: msDate.value || null }).eq('id', id);
        if (typeof window.vcInit === 'function') window.vcInit();
        window.vcPeek('milestone', id);
      });
    }

    const msStatus = document.getElementById('vcPeekMsStatus');
    if (msStatus) {
      msStatus.addEventListener('change', async () => {
        await sb.from('milestones').update({ status: msStatus.value }).eq('id', id);
        if (typeof window.vcInit === 'function') window.vcInit();
        window.vcPeek('milestone', id);
      });
    }

    const quick = document.getElementById('vcPeekStatus');
      if (quick) {
        quick.addEventListener('change', async () => {
          await sb.from('tasks').update({ status: quick.value }).eq('id', id);
          if (typeof window.vcInit === 'function') window.vcInit();   // refresh the page behind
          window.vcPeek(kind, id);                                    // and the drawer
        });
      }
    };
  })();
  
  
  /* ── Notifications ─────────────────────────────────────────────────────────
     Written by database triggers, so nothing depends on a page remembering to
     create them. Bell lives in the sidebar and works on every screen. */
try {
  (function(){
      const bell = document.createElement('button');
      bell.className = 'vc-bell';
      bell.setAttribute('aria-label','Notifications');
      bell.innerHTML =
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/></svg>' +
        '<span class="vc-bell-n" id="vcBellN"></span>';
    
      const tray = document.createElement('div');
      tray.className = 'vc-tray';
      tray.innerHTML =
        '<div class="vc-tray-h"><b>Notifications</b>' +
          '<button id="vcReadAll">Mark all read</button></div>' +
        '<div class="vc-tray-b" id="vcTrayB"></div>' +
        '<div class="vc-tray-f"><button id="vcShowAll">Show read as well</button>' +
          '<a href="/notifications">See all</a></div>';
    
      const brand = shell.querySelector('.vc-brand');
      if (brand) brand.after(bell);
      shell.append(tray);
    
      bell.addEventListener('click', (e) => {
        e.stopPropagation();
        tray.classList.toggle('on');
        if (tray.classList.contains('on')) paint();
      });
      document.addEventListener('click', (e) => {
        if (!tray.contains(e.target) && !bell.contains(e.target)) tray.classList.remove('on');
      });
    
      const esc = (v) => { const d = document.createElement('div'); d.textContent = v == null ? '' : v; return d.innerHTML; };
      const ago = (ts) => {
        const m = Math.round((Date.now() - new Date(ts)) / 60000);
        if (m < 1) return 'now';
        if (m < 60) return m + 'm';
        if (m < 1440) return Math.round(m/60) + 'h';
        return Math.round(m/1440) + 'd';
      };
      const ICON = { mention:'\uD83D\uDCAC', assigned:'\u25CF', offer:'\u2691',
                     offer_accepted:'\u2713', offer_declined:'\u2715' };
    
      let items = [];
      let showRead = false;
    
      function badgeTo(n){
        const badge = document.getElementById('vcBellN');
        if (!badge) return;
        badge.textContent = n > 9 ? '9+' : (n || '');
        badge.style.display = n ? 'flex' : 'none';
      }
    
      async function load(){
        const { data } = await sb.from('notifications')
          .select('*').eq('profile_id', session.user.id)
          .order('created_at', { ascending:false }).limit(30);
        items = (data || []).sort((a, b) => {
          const au = a.read_at ? 1 : 0, bu = b.read_at ? 1 : 0;
          if (au !== bu) return au - bu;                       // unread first
          return a.created_at < b.created_at ? 1 : -1;         // then newest
        });
        const unread = items.filter(n => !n.read_at).length;
        const badge = document.getElementById('vcBellN');
        if (badge) {
          badge.textContent = unread > 9 ? '9+' : (unread || '');
          badge.style.display = unread ? 'flex' : 'none';
        }
        return unread;
      }
    
      function paint(){
        const b = document.getElementById('vcTrayB');
        const shown = showRead ? items : items.filter((n) => !n.read_at);
        const btn = document.getElementById('vcShowAll');
        if (btn) btn.textContent = showRead ? 'Show unread only' : 'Show read as well';
        if (!shown.length) {
          b.innerHTML = '<p class="vc-tray-none">' +
            (showRead ? 'Nothing here yet.' : 'You are all caught up.') + '</p>';
          return;
        }
        if (!items.length) {
          b.innerHTML = '<p class="vc-tray-none">Nothing yet. You will hear about mentions, ' +
                        'tasks assigned to you, and job offers.</p>';
          return;
        }
        b.innerHTML = shown.map(n =>
          '<a class="vc-nt' + (n.read_at ? '' : ' unread') + '" href="' + (n.url || '#') + '" data-id="' + n.id + '">' +
            '<span class="vc-nt-i">' + (ICON[n.kind] || '\u25CF') + '</span>' +
            '<span class="vc-nt-b"><b>' + esc(n.title) + '</b>' +
              (n.body ? '<em>' + esc(n.body) + '</em>' : '') + '</span>' +
            '<span class="vc-nt-t">' + ago(n.created_at) + '</span>' +
          '</a>').join('');
    
        b.querySelectorAll('.vc-nt').forEach((a) => {
          a.addEventListener('click', async (e) => {
            /* This is a link, so the browser would navigate before the write
               finished and the notification would come back unread. Hold the
               navigation, mark it read, then go. */
            e.preventDefault();
            const href = a.getAttribute('href');
            a.classList.remove('unread');
            const it = items.filter((x) => x.id === a.dataset.id)[0];
            if (it) it.read_at = new Date().toISOString();
            badgeTo(items.filter((x) => !x.read_at).length);
    
            try {
              await sb.from('notifications').update({ read_at: new Date().toISOString() })
                .eq('id', a.dataset.id);
            } catch (err) { /* still navigate */ }
    
            if (href && href !== '#') location.href = href;
            else paint();
          });
        });
      }
    
      document.getElementById('vcShowAll').addEventListener('click', (e) => {
        e.stopPropagation();
        showRead = !showRead;
        paint();
      });
    
      document.getElementById('vcReadAll').addEventListener('click', async (e) => {
        e.stopPropagation();
        // Grey them immediately — waiting on a round trip made this feel broken.
        tray.querySelectorAll('.vc-nt.unread').forEach((n) => n.classList.remove('unread'));
        const badge = document.getElementById('vcBellN');
        if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
    
        await sb.from('notifications').update({ read_at: new Date().toISOString() })
          .eq('profile_id', session.user.id).is('read_at', null);
        items.forEach((n) => { n.read_at = n.read_at || new Date().toISOString(); });
        await load();
      });
    
      /* Browser notification, but only after the person opts in by clicking the
         bell. Asking on page load is the fastest way to get permanently blocked. */
      let asked = false;
      function askOnce(){
        if (asked || !('Notification' in window)) return;
        asked = true;
        if (Notification.permission === 'default') Notification.requestPermission();
      }
      bell.addEventListener('click', askOnce);
      // Also ask after a little real use, so it is not the first thing that happens.
      setTimeout(askOnce, 45000);
    
      /* An in-app toast, because a browser notification only appears when the tab
         is in the background and many people never grant permission. */
      function toast(n){
        const wrap = document.getElementById('vcToasts') || (function(){
          const w = document.createElement('div'); w.className = 'vc-toasts'; w.id = 'vcToasts';
          document.body.appendChild(w); return w;
        })();
    
        const ICON = { mention:'\uD83D\uDCAC', assigned:'\u25CF', offer:'\u2691', message:'\uD83D\uDCAC',
                       slip_late:'\u26A0', slip_badly_late:'\u26A0', slip_blocked:'\u26A0',
                       client_risk:'\u26A0', reply:'\u21A9' };
        const urgent = /slip_badly_late|client_risk|slip_blocked/.test(n.kind);
    
        const t = document.createElement('div');
        t.className = 'vc-toast' + (urgent ? ' urgent' : '');
        t.innerHTML =
          '<span class="vc-toast-i">' + (ICON[n.kind] || '\u25CF') + '</span>' +
          '<span class="vc-toast-b"><b>' + escv(n.title) + '</b>' +
            (n.body ? '<em>' + escv(n.body) + '</em>' : '') + '</span>' +
          '<button class="vc-toast-x" aria-label="Dismiss">&times;</button>';
    
        t.addEventListener('click', async (e) => {
          if (e.target.closest('.vc-toast-x')) { t.remove(); return; }
          await sb.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', n.id);
          if (n.url) location.href = n.url;
        });
    
        wrap.prepend(t);
        // Urgent ones stay until dismissed; the rest fade after eight seconds.
        if (!urgent) setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 8000);
        while (wrap.children.length > 4) wrap.lastElementChild.remove();
      }
    
      function popup(n){
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        const note = new Notification(n.title, {
          body: n.body || '', icon: '/assets/logo-email.png', tag: n.id
        });
        note.onclick = () => { window.focus(); if (n.url) location.href = n.url; };
      }
    
      load();
      setInterval(load, 60000);
    
      sb.channel('notif-' + session.user.id)
        .on('postgres_changes',
            { event:'INSERT', schema:'public', table:'notifications',
              filter:'profile_id=eq.' + session.user.id },
            (payload) => { load().then(() => {
                paint(); toast(payload.new); popup(payload.new);
                bell.classList.add('new');
                setTimeout(() => bell.classList.remove('new'), 1600);
              }); })
        .subscribe();
    })();
} catch (vcErr) { console.error("shell feature failed:", vcErr); }
} catch (vcErr) { console.error("shell feature failed:", vcErr); }


/* ── Identity bar ──────────────────────────────────────────────────────────
   Your avatar top-right, and a profile card for anyone whose avatar is
   clicked. Identity should be reachable from every screen, not buried. */
try {
try {
(function(){
      const escv = (v) => { const d = document.createElement('div'); d.textContent = v == null ? '' : v; return d.innerHTML; };
      const initialsOf = (n) => (n || '?').split(' ').map(x => x[0]).filter(Boolean).join('').slice(0,2).toUpperCase();
      const avatarHtml = (p, cls) => (p && p.avatar_url)
        ? `<span class="${cls}" style="background-image:url(${escv(p.avatar_url)})"></span>`
        : `<span class="${cls}">${initialsOf(p && (p.full_name || p.email))}</span>`;
    
      const ROLE = { owner:'Owner', account_owner:'Account owner', contractor:'Contractor', client:'Client' };
    
      // ---- top-right identity ----
      const bar = document.createElement('div');
      bar.className = 'vc-idbar';
      bar.innerHTML = `<button class="vc-id" id="vcId" aria-label="Your account">
          ${avatarHtml(profile || { full_name: name }, 'vc-id-av')}
          <span class="vc-id-t"><b>${escv(name)}</b>
            <em><span class="vc-sdot" id="vcSDot"></span><span id="vcSTxt">${ROLE[role] || role}</span></em></span>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
            stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>
        </button>
        <div class="vc-idmenu" id="vcIdMenu">
      <div class="vc-idmenu-sec vc-status-pick">
        <span>Your status</span>
        <button data-st="available"><i class="s-available"></i>Available</button>
        <button data-st="busy"><i class="s-busy"></i>Heads down</button>
        <button data-st="away"><i class="s-away"></i>Away</button>
        <button data-st="offline"><i class="s-offline"></i>Off for the day</button>
      </div>
          <a href="/settings">Your profile</a>
          <a href="/settings">Settings</a>
          <a href="/help">Help</a>
          <button id="vcIdReport">Report a problem</button>
          <button id="vcIdOut">Sign out</button>
        </div>`;
      document.body.appendChild(bar);
    
      document.getElementById('vcId').addEventListener('click', (e) => {
        e.stopPropagation();
        document.getElementById('vcIdMenu').classList.toggle('on');
      });
      document.addEventListener('click', () => {
        document.getElementById('vcIdMenu').classList.remove('on');
      });
      /* Your own status, set by you. Presence answers "is the tab open"; this
     answers "should anyone expect a reply". */
  const SLABEL = { available:'Available', busy:'Heads down', away:'Away', offline:'Off for the day' };

  function paintStatus(st){
    const dot = document.getElementById('vcSDot');
    const txt = document.getElementById('vcSTxt');
    if (dot) dot.className = 'vc-sdot s-' + st;
    if (txt) txt.textContent = SLABEL[st] || st;
    document.querySelectorAll('.vc-status-pick [data-st]').forEach((b) => {
      b.classList.toggle('on', b.dataset.st === st);
    });
  }
  paintStatus((profile && profile.status) || 'available');

  document.querySelectorAll('.vc-status-pick [data-st]').forEach((b) => {
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const st = b.dataset.st;
      paintStatus(st);
      await sb.from('profiles').update({ status: st }).eq('id', session.user.id);
      document.getElementById('vcIdMenu').classList.remove('on');
    });
  });

  document.getElementById('vcIdOut').addEventListener('click', async () => {
        await sb.auth.signOut();
        location.href = '/login.html';
      });
    
      // ---- profile card for anyone ----
      const card = document.createElement('div');
      card.className = 'vc-pcard';
      card.innerHTML = '<div id="vcPcBody"></div>';
      const cardVeil = document.createElement('div');
      cardVeil.className = 'vc-pcard-veil';
      cardVeil.addEventListener('click', () => {
        card.classList.remove('on'); cardVeil.classList.remove('on');
      });
      document.body.append(cardVeil, card);
    
      const thread = document.createElement('div');
      thread.className = 'vc-thread';
      thread.innerHTML = '<div class="vc-thread-h"><b>Thread</b>' +
        '<button class="vc-peek-x" id="vcThreadX" aria-label="Close">&times;</button></div>' +
        '<div class="vc-thread-b" id="vcThreadB"></div>';
      document.body.appendChild(thread);
      document.getElementById('vcThreadX').addEventListener('click', () => {
        thread.classList.remove('on'); panel.classList.remove('pushed');
      });
    
      async function openThread(commentId, taskId){
        thread.classList.add('on');
        panel.classList.add('pushed');
        const b = document.getElementById('vcThreadB');
        b.innerHTML = '<p class="vc-peek-load">Loading\u2026</p>';
    
        const { data: root } = await sb.from('comments')
          .select('*, profiles:author_id(full_name)').eq('id', commentId).single();
        const { data: kids } = await sb.from('comments')
          .select('*, profiles:author_id(full_name)')
          .eq('parent_comment_id', commentId).order('created_at');
    
        const row = (c, isReply) => {
          const nm = (c.profiles && c.profiles.full_name) || 'Someone';
          const iv = nm.split(' ').map(x => x[0]).filter(Boolean).join('').slice(0,2).toUpperCase();
          const when = new Date(c.created_at).toLocaleString('en-US',
            { month:'short', day:'numeric', hour:'numeric', minute:'2-digit' });
          return '<div class="vc-peek-c' + (isReply ? ' reply' : '') + '">' +
            '<span class="vc-peek-av">' + iv + '</span>' +
            '<span class="vc-peek-cb"><em>' + esc(nm) + ' \u00b7 <i>' + when + '</i></em>' +
            esc(c.body) + '</span></div>';
        };
    
        const who = ((root && root.profiles && root.profiles.full_name) || 'them').split(' ')[0];
        b.innerHTML = (root ? row(root, false) : '') +
          ((kids && kids.length)
            ? '<div class="vc-thread-sep">' + kids.length +
              (kids.length === 1 ? ' reply' : ' replies') + '</div>' +
              kids.map((k) => row(k, true)).join('')
            : '<p class="vc-thread-none">No replies yet.</p>') +
          '<div class="vc-peek-add">' +
            '<textarea id="vcThreadNew" rows="2" placeholder="Reply to ' + esc(who) + '\u2026"></textarea>' +
            '<button id="vcThreadSend">Reply</button></div>';
    
        const send = document.getElementById('vcThreadSend');
        const ta = document.getElementById('vcThreadNew');
        const post = async () => {
          const body = ta.value.trim(); if (!body) return;
          send.disabled = true;
          const { data: t } = await sb.from('tasks').select('engagement_id').eq('id', taskId).single();
          const { error } = await sb.from('comments').insert({
            engagement_id: t && t.engagement_id, task_id: taskId,
            author_id: session.user.id, parent_comment_id: commentId, body
          });
          send.disabled = false;
          if (error) { alert(error.message); return; }
          openThread(commentId, taskId);
          window.vcPeek('task', taskId);
        };
        send.addEventListener('click', post);
        ta.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
        });
        setTimeout(() => ta.focus(), 140);
      }
    
      /* Delegated once. Re-rendering the drawer used to drop these listeners,
         which is why replies stopped opening. */
      document.addEventListener('click', (e) => {
        const b = e.target.closest('[data-thread]');
        if (!b) return;
        e.preventDefault();
        e.stopPropagation();
        const taskId = (document.getElementById('vcPeekOpen') || {}).href || '';
        const m = taskId.match(/id=([0-9a-f-]{36})/i);
        openThread(b.dataset.thread, m ? m[1] : null);
      });
    
      window.vcProfile = async function(profileId){
        if (!profileId) return;
        card.classList.add('on'); cardVeil.classList.add('on');
        document.getElementById('vcPcBody').innerHTML = '<p class="vc-pc-load">Loading\u2026</p>';
    
        const { data: p } = await sb.from('profiles')
          .select('*, contractor_details(crafts, part_107, gear, home_city)')
          .eq('id', profileId).single();
        if (!p) {
          document.getElementById('vcPcBody').innerHTML = '<p class="vc-pc-load">Could not load that profile.</p>';
          return;
        }
    
        const since = new Date(Date.now() - 5 * 60000).toISOString();
        const { data: pr } = await sb.from('presence')
          .select('current_page,last_seen_at').eq('profile_id', profileId).gte('last_seen_at', since).maybeSingle();
    
        const cd = (p.contractor_details && p.contractor_details[0]) || p.contractor_details || {};
        const crafts = (cd.crafts || []).join(' \u00b7 ');
        const days = (p.available_days || []).join(', ');
    
        const row = (k, v) => v ? `<div class="vc-pc-f"><span>${escv(k)}</span><b>${escv(v)}</b></div>` : '';
    
        document.getElementById('vcPcBody').innerHTML =
          `<div class="vc-pc-top">
            ${avatarHtml(p, 'vc-pc-av')}
            <div class="vc-pc-who">
              <b>${escv(p.full_name || p.email)}</b>
              <em>${ROLE[p.role] || p.role}${p.title ? ' \u00b7 ' + escv(p.title) : ''}</em>
              ${pr ? `<span class="vc-pc-on">Active now${pr.current_page ? ' \u00b7 ' + escv(pr.current_page) : ''}</span>` : ''}
            </div>
          </div>
          ${p.bio ? `<p class="vc-pc-bio">${escv(p.bio)}</p>` : ''}
          ${row('Does', crafts)}
          ${row('Part 107', cd.part_107 ? 'Certified' : '')}
          ${row('Gear', cd.gear)}
          ${row('Usually works', days)}
          ${row('Note', p.availability_note)}
          ${row('Email', p.email)}
          ${row('Phone', p.phone)}
          ${p.accepting_work === false ? '<div class="vc-pc-off">Not taking new work right now</div>' : ''}
          ${profileId !== session.user.id
            ? `<button class="vc-pc-msg" id="vcPcMsg">Message ${escv((p.full_name || '').split(' ')[0] || 'them')}</button>`
            : '<a class="vc-pc-msg" href="/settings">Edit your profile</a>'}`;
    
        /* Commenting from the drawer, so a quick answer does not need a page load. */
        const send = document.getElementById('vcPeekSend');
        if (send) {
          const ta = document.getElementById('vcPeekNew');
          const post = async () => {
            const body = ta.value.trim();
            if (!body) return;
            send.disabled = true;
            const { data: t } = await sb.from('tasks').select('engagement_id').eq('id', id).single();
            const { error } = await sb.from('comments').insert({
              engagement_id: t && t.engagement_id, task_id: id, author_id: session.user.id, body
            });
            send.disabled = false;
            if (error) { alert(error.message); return; }
            ta.value = '';
            window.vcPeek('task', id);
          };
          send.addEventListener('click', post);
          ta.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
          });
        }
    
        /* A thread opens a second panel to the left rather than replacing what you
           were looking at, so the task stays in view while you read the replies. */
        document.querySelectorAll('[data-thread]').forEach((b) => {
          b.addEventListener('click', () => openThread(b.dataset.thread, id));
        });
    
        /* Commenting from any drawer, whatever it is showing. */
    const anySend = document.querySelector('.vcAnySend');
    if (anySend) {
      const wrap = anySend.closest('.vc-peek-cm');
      const ta   = wrap.querySelector('.vcAnyNew');
      const post = async () => {
        const body = ta.value.trim();
        if (!body) return;
        anySend.disabled = true;
        const row = { author_id: session.user.id, body: body,
                      engagement_id: wrap.dataset.eng || null };
        row[wrap.dataset.col] = wrap.dataset.oid;
        const { error } = await sb.from('comments').insert(row);
        anySend.disabled = false;
        if (error) { alert(error.message); return; }
        ta.value = '';
        window.vcPeek(kind, id);
      };
      anySend.addEventListener('click', post);
      ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); post(); }
      });
    }

    /* Editing a milestone date without leaving the timeline. */
    const msDate = document.getElementById('vcPeekMsDate');
    if (msDate) {
      msDate.addEventListener('change', async () => {
        await sb.from('milestones').update({ due_date: msDate.value || null }).eq('id', id);
        if (typeof window.vcInit === 'function') window.vcInit();
        window.vcPeek('milestone', id);
      });
    }

    const msStatus = document.getElementById('vcPeekMsStatus');
    if (msStatus) {
      msStatus.addEventListener('change', async () => {
        await sb.from('milestones').update({ status: msStatus.value }).eq('id', id);
        if (typeof window.vcInit === 'function') window.vcInit();
        window.vcPeek('milestone', id);
      });
    }

    const quick = document.getElementById('vcPeekStatus');
        if (quick) {
          quick.addEventListener('change', async () => {
            await sb.from('tasks').update({ status: quick.value }).eq('id', id);
            // Repaint whatever page is underneath so the change is visible at once.
            if (typeof window.vcInit === 'function') window.vcInit();
            window.vcPeek(kind, id);
          });
        }
    
        const msgBtn = document.getElementById('vcPcMsg');
        if (msgBtn) msgBtn.addEventListener('click', async () => {
          const r = await sb.rpc('open_dm', { other: profileId });
          if (r.error) return alert(r.error.message);
          location.href = '/messages?c=' + r.data;
        });
      };
    
      /* Any avatar carrying data-profile becomes clickable, including ones added
         to the page later. */
      document.addEventListener('click', (e) => {
        const t = e.target.closest('[data-profile]');
        if (!t) return;
        e.stopPropagation();
        window.vcProfile(t.dataset.profile);
      });
    
      /* Every peek target, everywhere, handled once. Pages used to bind these per
         render, so any repaint silently dropped them — which is how the timeline
         stopped opening tasks. */
      document.addEventListener('click', (e) => {
        const el = e.target.closest('[data-k][data-r]');
        if (!el) return;
        const kind = el.dataset.k, ref = el.dataset.r;
        if (!kind || !ref) return;
        e.preventDefault();
        e.stopPropagation();
        window.vcPeek(kind, ref);
      });
    })();
} catch (vcErr) { console.error("shell feature failed:", vcErr); }
  
  
  /* ── Report a problem ──────────────────────────────────────────────────────
     Reachable from every page. Without this, someone who hits a bug has no
     route other than texting Trae, and most people just stop using the thing. */
try {
  (function(){
      /* No floating button: it sat on top of the chat compose bar. It lives in the
         profile menu instead, which is where people already look and is never in
         front of anything. */
    
      const veil = document.createElement('div');
      veil.className = 'vc-rep-veil';
      const box = document.createElement('div');
      box.className = 'vc-rep';
      box.innerHTML =
        '<div class="vc-rep-h"><b>Something not right?</b>' +
          '<p>Tell us what you were doing and what happened. It goes straight to Trae.</p></div>' +
        '<div class="vc-rep-b">' +
          '<div class="vc-rep-kinds">' +
            '<button data-k="bug" class="on">Something is broken</button>' +
            '<button data-k="idea">I have an idea</button>' +
            '<button data-k="question">I am stuck</button>' +
          '</div>' +
          '<textarea id="vcRepBody" rows="4" placeholder="The Save button on Engagements did nothing when I clicked it."></textarea>' +
          '<p class="vc-rep-note">We record which page you were on, so you do not have to explain that.</p>' +
          '<div class="vc-rep-f"><button class="vc-rep-cancel" id="vcRepCancel">Cancel</button>' +
          '<button class="vc-rep-send" id="vcRepSend">Send it</button></div>' +
          '<p class="vc-rep-msg" id="vcRepMsg"></p>' +
        '</div>';
      document.body.append(veil, box);
    
      let kind = 'bug';
      box.querySelectorAll('.vc-rep-kinds button').forEach((b) => {
        b.addEventListener('click', () => {
          box.querySelectorAll('.vc-rep-kinds button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          kind = b.dataset.k;
        });
      });
    
      function open(){ veil.classList.add('on'); box.classList.add('on');
        setTimeout(() => document.getElementById('vcRepBody').focus(), 120); }
      function shut(){ veil.classList.remove('on'); box.classList.remove('on');
        document.getElementById('vcRepMsg').className = 'vc-rep-msg'; }
    
      const menuItem = document.getElementById('vcIdReport');
      if (menuItem) {
        menuItem.addEventListener('click', (e) => {
          e.stopPropagation();
          document.getElementById('vcIdMenu').classList.remove('on');
          open();
        });
      }
    
      // Keyboard shortcut for anyone who reports often.
      document.addEventListener('keydown', (e) => {
        if (e.key === '?' && e.shiftKey && !/input|textarea/i.test((e.target.tagName || ''))) {
          e.preventDefault(); open();
        }
      });
      veil.addEventListener('click', shut);
      document.getElementById('vcRepCancel').addEventListener('click', shut);
    
      document.getElementById('vcRepSend').addEventListener('click', async () => {
        const body = document.getElementById('vcRepBody').value.trim();
        const msg = document.getElementById('vcRepMsg');
        if (!body) { msg.textContent = 'Tell us what happened first.'; msg.className = 'vc-rep-msg show err'; return; }
    
        const send = document.getElementById('vcRepSend');
        send.disabled = true;

        const { error } = await sb.from('reports').insert({
          profile_id: session.user.id,
          kind, body,
          page: location.pathname,
          user_agent: navigator.userAgent.slice(0, 240)
        });

        /* A report that vanishes into a table is a report you never hear about
           again. This also opens a conversation, so it can be answered and the
           person can see what happened to it. */
        let cid = null;
        try {
          const r = await sb.rpc('open_support_thread', {
            p_kind: kind, p_body: body, p_page: location.pathname
          });
          cid = r.data || null;
        } catch (e) { /* the report is filed either way */ }

        send.disabled = false;

        if (error && !cid) { msg.textContent = error.message; msg.className = 'vc-rep-msg show err'; return; }

        if (cid) {
          msg.innerHTML = 'Sent, and opened as a conversation so you can follow it. ' +
            '<a href="/messages?c=' + cid + '" style="color:#9A3412;font-weight:600">Open it</a>.';
        } else {
          msg.textContent = 'Sent. Thank you \u2014 that genuinely helps.';
        }
        msg.className = 'vc-rep-msg show ok';
        document.getElementById('vcRepBody').value = '';
        setTimeout(shut, 1600);
      });
    })();
} catch (vcErr) { console.error("shell feature failed:", vcErr); }
} catch (vcErr) { console.error("shell feature failed:", vcErr); }


/* ── Confirm ───────────────────────────────────────────────────────────────
   One dialog for anything that cannot be undone. It says what actually goes,
   not "are you sure", and the heaviest deletions ask you to type the name so
   a stray click cannot take an account with it. */
try {
try {
(function(){
      const veil = document.createElement('div');
      veil.className = 'vc-cf-veil';
      const box = document.createElement('div');
      box.className = 'vc-cf';
      box.setAttribute('role', 'dialog');
      box.setAttribute('aria-modal', 'true');
      document.body.append(veil, box);
    
      let resolver = null;
    
      function shut(v){
        box.classList.remove('on'); veil.classList.remove('on');
        document.body.classList.remove('vc-locked');
        if (resolver) { resolver(v); resolver = null; }
      }
      veil.addEventListener('click', () => shut(false));
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && box.classList.contains('on')) shut(false);
      });
    
      /* opts: { title, body, list, confirm, cancel, danger, typeToConfirm } */
      window.vcConfirm = function(opts){
        opts = opts || {};
        const danger = opts.danger !== false;
        const needType = opts.typeToConfirm;
    
        box.innerHTML =
          '<div class="vc-cf-h">' +
            '<span class="vc-cf-icon' + (danger ? ' danger' : '') + '">' +
              (danger
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                  '<path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
                  '<circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>') +
            '</span>' +
            '<b>' + escv(opts.title || 'Are you sure?') + '</b>' +
          '</div>' +
          '<div class="vc-cf-b">' +
            (opts.body ? '<p>' + escv(opts.body) + '</p>' : '') +
            (opts.list && opts.list.length
              ? '<ul class="vc-cf-list">' + opts.list.map(x => '<li>' + escv(x) + '</li>').join('') + '</ul>'
              : '') +
            (needType
              ? '<label class="vc-cf-type">Type <b>' + escv(needType) + '</b> to confirm' +
                '<input type="text" id="vcCfType" autocomplete="off" spellcheck="false"></label>'
              : '') +
            '<div class="vc-cf-f">' +
              '<button class="vc-cf-no" id="vcCfNo">' + escv(opts.cancel || 'Cancel') + '</button>' +
              '<button class="vc-cf-yes' + (danger ? ' danger' : '') + '" id="vcCfYes"' +
                (needType ? ' disabled' : '') + '>' + escv(opts.confirm || 'Delete') + '</button>' +
            '</div>' +
          '</div>';
    
        veil.classList.add('on'); box.classList.add('on');
        document.body.classList.add('vc-locked');
    
        document.getElementById('vcCfNo').addEventListener('click', () => shut(false));
        document.getElementById('vcCfYes').addEventListener('click', () => shut(true));
    
        if (needType) {
          const inp = document.getElementById('vcCfType');
          const yes = document.getElementById('vcCfYes');
          inp.addEventListener('input', () => {
            yes.disabled = inp.value.trim().toLowerCase() !== String(needType).trim().toLowerCase();
          });
          inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !yes.disabled) shut(true);
          });
          setTimeout(() => inp.focus(), 120);
        } else {
          setTimeout(() => document.getElementById('vcCfNo').focus(), 120);
        }
    
        return new Promise((res) => { resolver = res; });
      };
    })();
} catch (vcErr) { console.error("shell feature failed:", vcErr); }
  
  
  /* ── Loading states ────────────────────────────────────────────────────────
     Without these you cannot tell a slow save from a broken one, so people click
     twice. Three pieces: a top progress bar for page loads, automatic busy state
     on any button that fires an async action, and skeletons for empty regions. */
  try {
  (function(){
    
      // 1. A thin bar at the top, like a browser's own.
      const bar = document.createElement('div');
      bar.className = 'vc-progress';
      bar.innerHTML = '<i></i>';
      document.body.appendChild(bar);
    
      let depth = 0, timer = null;
    
      window.vcLoading = function(on){
        depth = Math.max(0, depth + (on ? 1 : -1));
        if (depth > 0) {
          bar.classList.add('on');
          clearTimeout(timer);
        } else {
          // Hold briefly so a fast response still registers as something happening.
          clearTimeout(timer);
          timer = setTimeout(() => bar.classList.remove('on'), 220);
        }
        if (typeof paintBusy === 'function') paintBusy();
      };
    
      // Nothing should be able to leave a button spinning for ever.
      setInterval(() => {
        if (busyBtn && depth === 0) { busyBtn.classList.remove('vc-busy'); busyBtn = null; }
      }, 3000);
    
      /* 2. A clicked button stays busy for as long as queries are actually in
         flight. Guessing when async work finishes is not possible generically, so
         this hangs off the same counter the progress bar uses. */
      let busyBtn = null;
    
      document.addEventListener('click', (e) => {
        const b = e.target.closest('button, a.btn');
        if (!b || b.disabled || b.dataset.noBusy) return;
        busyBtn = b;
        // If nothing starts loading within a moment, this was not an async action.
        setTimeout(() => { if (depth === 0 && busyBtn === b) busyBtn = null; }, 250);
      }, true);
    
      function paintBusy(){
        if (busyBtn) {
          if (depth > 0) busyBtn.classList.add('vc-busy');
          else { busyBtn.classList.remove('vc-busy'); busyBtn = null; }
        }
      }
    
      /* 3. Skeletons. A page calls vcSkeleton(el, rows) before fetching. */
      window.vcSkeleton = function(el, rows){
        if (typeof el === 'string') el = document.getElementById(el);
        if (!el) return;
        let h = '';
        for (let i = 0; i < (rows || 3); i++) {
          h += '<div class="vc-skel-row">' +
            '<div class="vc-skel vc-skel-av"></div>' +
            '<div class="vc-skel-lines">' +
              '<div class="vc-skel" style="width:' + (58 + (i * 11) % 30) + '%"></div>' +
              '<div class="vc-skel short" style="width:' + (32 + (i * 7) % 22) + '%"></div>' +
            '</div></div>';
        }
        el.innerHTML = '<div class="vc-skels">' + h + '</div>';
      };
    
      /* 4. Hook the network, not the client.
    
         The previous version wrapped sb.from(). That does not work: from() returns
         a query builder with no .then — the thenable only appears after .select(),
         which returns a different object, so the override was discarded and the
         bar never fired once. Patching fetch catches every request regardless of
         how the query was built, including storage and edge functions. */
      const origFetch = window.fetch.bind(window);
      window.fetch = function(input, init){
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        const ours = url.indexOf('supabase.co') > -1 || url.indexOf('/functions/v1/') > -1;
        if (!ours) return origFetch(input, init);
    
        window.vcLoading(true);
        return origFetch(input, init)
          .then((r) => { window.vcLoading(false); return r; })
          .catch((e) => { window.vcLoading(false); throw e; });
      };
    
      // The initial page render counts as loading until vcInit finishes.
      window.addEventListener('vc-auth-ready', () => {
        window.vcLoading(true);
        setTimeout(() => window.vcLoading(false), 400);
      });
    })();
  } catch (vcErr) { console.error("shell feature failed:", vcErr); }
} catch (vcErr) { console.error("shell feature failed:", vcErr); }


/* ── Chat dock ─────────────────────────────────────────────────────────────
   Messages follow you around the platform. A bubble bottom-right with an
   unread count; click it for a compact list, click a conversation for a small
   window you can type in without leaving the page you are working on. */
try {
try {
(function(){
      if (role === 'client') return;   // clients use the request channel instead
    
      const dock = document.createElement('div');
      dock.className = 'vc-dock';
      dock.innerHTML =
        '<button class="vc-dock-btn" id="vcDockBtn" aria-label="Open messages" title="Messages">' +
          '<svg viewBox="0 0 24 24" fill="currentColor">' +
            '<path d="M12 3C6.9 3 3 6.6 3 11c0 2.3 1.1 4.4 2.9 5.8v3.4c0 .5.6.8 1 .5l2.9-2a11 11 0 0 0 2.2.2' +
            'c5.1 0 9-3.6 9-8s-3.9-8-9-8z"/>' +
            '<circle cx="8.2" cy="11" r="1.15" fill="#fff"/>' +
            '<circle cx="12" cy="11" r="1.15" fill="#fff"/>' +
            '<circle cx="15.8" cy="11" r="1.15" fill="#fff"/></svg>' +
          '<span class="vc-dock-label">Messages</span>' +
          '<span class="vc-dock-n" id="vcDockN"></span>' +
        '</button>' +
        '<div class="vc-dock-panel" id="vcDockPanel">' +
          '<div class="vc-dock-h">' +
            '<b id="vcDockTitle">Messages</b>' +
            '<span class="vc-dock-acts">' +
              '<a href="/messages" title="Expand">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round"><path d="M15 3h6v6M21 3l-9 9M10 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/></svg></a>' +
              '<button id="vcDockBack" style="display:none" title="Back">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg></button>' +
              '<button id="vcDockX" title="Close">&times;</button>' +
            '</span>' +
          '</div>' +
          '<div class="vc-dock-b" id="vcDockB"></div>' +
          '<div class="vc-dock-c" id="vcDockC" style="display:none">' +
            '<textarea id="vcDockNew" rows="1" placeholder="Write a message"></textarea>' +
            '<button id="vcDockSend" aria-label="Send">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
              'stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>' +
            '</button>' +
          '</div>' +
        '</div>';
      document.body.appendChild(dock);
    
      const $d = (i) => document.getElementById(i);
      const escd = (v) => { const x = document.createElement('div'); x.textContent = v == null ? '' : v; return x.innerHTML; };
      const inid = (n) => (n || '?').split(' ').map(x => x[0]).filter(Boolean).join('').slice(0,2).toUpperCase();
    
      let chans = [], openChan = null, people = {}, dockSub = null;
    
      async function loadPeople(){
        const { data } = await sb.from('profiles')
          .select('id, full_name, email, avatar_url').eq('is_active', true);
        (data || []).forEach(p => { people[p.id] = p; });
      }
    
      function titleOf(c){
        if (c.name) return c.name;
        const ids = (c.channel_members || []).map(m => m.profile_id).filter(x => x !== session.user.id);
        const p = people[ids[0]];
        return p ? (p.full_name || p.email) : 'Conversation';
      }
    
      /* Describe the current page well enough that a message about it makes sense
         to whoever receives it. */
      function pageContext(){
        const p = location.pathname;
        const q = new URLSearchParams(location.search);
        const title = (document.querySelector('h1') || {}).textContent || '';
    
        if (p.indexOf('/task') === 0 && q.get('id'))
          return { label: title.trim() || 'this task', url: location.href, kind: 'task' };
        if (p.indexOf('/internal') === 0)
          return { label: 'an engagement', url: location.origin + '/internal', kind: 'engagement' };
        if (p.indexOf('/board') === 0)
          return { label: 'the board', url: location.origin + '/board', kind: 'board' };
        if (p.indexOf('/timeline') === 0)
          return { label: 'the timeline', url: location.origin + '/timeline', kind: 'timeline' };
        if (p.indexOf('/jobs') === 0)
          return { label: 'a job', url: location.origin + '/jobs', kind: 'job' };
        if (p.indexOf('/capacity') === 0)
          return { label: 'capacity', url: location.origin + '/capacity', kind: 'capacity' };
        return null;
      }
    
      /* Sharing drops a link into a conversation you pick, rather than making you
         copy a URL, open chat, find the person and paste. */
      function sharePage(ctx){
        if (!ctx) return;
        const b = $d('vcDockB');
        $d('vcDockTitle').textContent = 'Share ' + ctx.label;
        $d('vcDockBack').style.display = '';
        $d('vcDockC').style.display = 'none';
    
        b.innerHTML = '<p class="vc-dock-hint">Pick a conversation to send it to.</p>' +
          chans.map(c =>
            '<div class="vc-dock-row" data-share="' + c.id + '">' +
              '<span class="vc-dock-av">' + inid(titleOf(c)) + '</span>' +
              '<span class="vc-dock-t"><b>' + escd(titleOf(c)) + '</b></span></div>').join('');
    
        b.querySelectorAll('[data-share]').forEach(el => {
          el.addEventListener('click', async () => {
            const body = 'Have a look at ' + ctx.label + ': ' + ctx.url;
            await sb.from('messages').insert({
              channel_id: el.dataset.share, author_id: session.user.id, body
            });
            openConversation(el.dataset.share);
          });
        });
      }
    
      async function loadList(){
        const { data } = await sb.from('channels')
          .select('*, channel_members(profile_id, last_read_at, muted, pinned, manually_unread), messages(body, created_at, author_id)')
          .order('last_message_at', { ascending:false });
        chans = (data || []).filter(c =>
          (c.channel_members || []).some(m => m.profile_id === session.user.id));
    
        let total = 0;
        chans.forEach(c => {
          const mine = (c.channel_members || []).filter(m => m.profile_id === session.user.id)[0];
          c._unread = (c.messages || []).filter(m =>
            m.author_id !== session.user.id && mine &&
            new Date(m.created_at) > new Date(mine.last_read_at || 0)).length;
          c._pinned = !!(mine && mine.pinned);
          c._muted  = !!(mine && mine.muted);
          if (!c._muted) total += c._unread;
        });
    
        const badge = $d('vcDockN');
        badge.textContent = total > 9 ? '9+' : (total || '');
        badge.style.display = total ? 'flex' : 'none';
        if (total) dock.classList.add('has'); else dock.classList.remove('has');
    
        const btn = $d('vcDockBtn');
        const lbl = dock.querySelector('.vc-dock-label');
        if (lbl) lbl.textContent = total
          ? total + (total === 1 ? ' new message' : ' new messages')
          : 'Messages';
        if (btn) btn.title = total
          ? total + ' unread \u2014 click to read'
          : 'Messages \u2014 click to open';
    
        if (!openChan) paintList();
      }
    
      function paintList(){
        const sorted = chans.slice().sort((a, b) => {
          if (a._pinned !== b._pinned) return a._pinned ? -1 : 1;
          return (a.last_message_at < b.last_message_at) ? 1 : -1;
        });
    
        $d('vcDockTitle').textContent = 'Messages';
        $d('vcDockBack').style.display = 'none';
        $d('vcDockC').style.display = 'none';
    
        /* Two things you nearly always want from a chat list: start something, or
           point at whatever you are currently looking at. */
        const here = pageContext();
        const actions =
          '<div class="vc-dock-acts-row">' +
            '<button class="vc-dock-act" id="vcDockNewBtn">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
              'stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>New message</button>' +
            (here ? '<button class="vc-dock-act" id="vcDockShare">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
              'stroke-linecap="round" stroke-linejoin="round">' +
              '<path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7M16 6l-4-4-4 4M12 2v14"/></svg>' +
              'Share this page</button>' : '') +
          '</div>';
    
        $d('vcDockB').innerHTML = actions + (sorted.length ? sorted.map(c => {
          const last = (c.messages || []).slice().sort((x, y) => x.created_at < y.created_at ? 1 : -1)[0];
          return '<div class="vc-dock-row' + (c._muted ? ' muted' : '') + '" data-c="' + c.id + '">' +
            '<span class="vc-dock-av">' + inid(titleOf(c)) + '</span>' +
            '<span class="vc-dock-t"><b>' + (c._pinned ? '\u2022 ' : '') + escd(titleOf(c)) + '</b>' +
            '<em>' + escd(last ? (last.body || 'Sent a file').slice(0, 34) : 'No messages') + '</em></span>' +
            (c._unread && !c._muted ? '<span class="vc-dock-u">' + c._unread + '</span>' : '') +
            '</div>';
        }).join('') : '<p class="vc-dock-none">No conversations yet.</p>');
    
        const nb = $d('vcDockNewBtn');
        if (nb) nb.addEventListener('click', () => { location.href = '/messages'; });
    
        const sh = $d('vcDockShare');
        if (sh) sh.addEventListener('click', () => sharePage(here));
    
        $d('vcDockB').querySelectorAll('[data-c]').forEach(el => {
          el.addEventListener('click', () => openConversation(el.dataset.c));
        });
      }
    
      async function openConversation(cid){
        openChan = cid;
        const c = chans.filter(x => x.id === cid)[0];
        $d('vcDockTitle').textContent = c ? titleOf(c) : 'Conversation';
        $d('vcDockBack').style.display = '';
        $d('vcDockC').style.display = '';
        await paintMessages();
    
        await sb.from('channel_members')
          .update({ last_read_at: new Date().toISOString(), manually_unread: false })
          .eq('channel_id', cid).eq('profile_id', session.user.id);
        loadList();
    
        if (dockSub) sb.removeChannel(dockSub);
        dockSub = sb.channel('dock-' + cid)
          .on('postgres_changes',
              { event:'INSERT', schema:'public', table:'messages', filter:'channel_id=eq.' + cid },
              paintMessages)
          .subscribe();
      }
    
      async function paintMessages(){
        if (!openChan) return;
        const { data } = await sb.from('messages').select('*')
          .eq('channel_id', openChan).order('created_at', { ascending:false }).limit(30);
        const ms = (data || []).slice().reverse();
        const b = $d('vcDockB');
    
        b.innerHTML = ms.length ? ms.map(m => {
          const p = people[m.author_id] || {};
          const mine = m.author_id === session.user.id;
          return '<div class="vc-dock-m' + (mine ? ' mine' : '') + '">' +
            (mine ? '' : '<span class="vc-dock-av sm">' + inid(p.full_name || p.email) + '</span>') +
            '<span class="vc-dock-bub">' +
              (m.body ? escd(m.body) : '') +
              (m.attachment_url && /image/.test(m.attachment_type || '')
                ? '<img src="' + escd(m.attachment_url) + '" alt="">' : '') +
              (m.attachment_url && !/image/.test(m.attachment_type || '')
                ? '<a href="' + escd(m.attachment_url) + '" target="_blank" rel="noopener">' +
                  escd(m.attachment_name || 'File') + '</a>' : '') +
            '</span></div>';
        }).join('') : '<p class="vc-dock-none">Say something.</p>';
    
        b.scrollTop = b.scrollHeight;
      }
    
      async function send(){
        const ta = $d('vcDockNew');
        const body = ta.value.trim();
        if (!body || !openChan) return;
        ta.value = ''; ta.style.height = 'auto';
        const { error } = await sb.from('messages')
          .insert({ channel_id: openChan, author_id: session.user.id, body });
        if (error) { alert(error.message); return; }
        paintMessages(); loadList();
      }
    
      $d('vcDockBtn').addEventListener('click', () => {
        const open = dock.classList.toggle('open');
        if (open) { openChan = null; paintList(); }
      });
      $d('vcDockX').addEventListener('click', (e) => {
        e.stopPropagation(); dock.classList.remove('open'); openChan = null;
      });
      $d('vcDockBack').addEventListener('click', () => {
        openChan = null;
        if (dockSub) { sb.removeChannel(dockSub); dockSub = null; }
        paintList();
      });
      $d('vcDockSend').addEventListener('click', send);
      $d('vcDockNew').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
      });
      $d('vcDockNew').addEventListener('input', function(){
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 90) + 'px';
      });
    
      // Hide the dock on the messages page itself; two chat surfaces is one too many.
      if (location.pathname.indexOf('/messages') === 0) dock.style.display = 'none';
    
      loadPeople().then(loadList);
      setInterval(loadList, 30000);
    
      // A new message anywhere makes the bubble pulse.
      sb.channel('dock-any-' + session.user.id)
        .on('postgres_changes', { event:'INSERT', schema:'public', table:'messages' }, () => {
          loadList();
          if (!dock.classList.contains('open')) {
            dock.classList.add('ping');
            setTimeout(() => dock.classList.remove('ping'), 1400);
          } else if (openChan) { paintMessages(); }
        })
        .subscribe();
    })();
} catch (vcErr) { console.error("shell feature failed:", vcErr); }
  
  
  /* ── Role preview ──────────────────────────────────────────────────────────
     Seeing the platform as a contractor or a client is the only way to check
     what they actually get without inviting three people first. */
  try {
  (function(){
      if (realRole !== 'owner') return;
    
      const LABEL = { owner:'Owner', account_owner:'Account owner',
                      contractor:'Contractor', client:'Client' };
    
      if (previewRole) {
        const bar = document.createElement('div');
        bar.className = 'vc-preview';
        bar.innerHTML =
          '<span class="vc-preview-t">Viewing as <b>' + (LABEL[previewRole] || previewRole) + '</b>' +
          ' \u2014 this is what they see</span>' +
          '<button id="vcPreviewOff">Back to your account</button>';
        document.body.appendChild(bar);
        document.body.classList.add('vc-previewing');
    
        document.getElementById('vcPreviewOff').addEventListener('click', async () => {
          await sb.rpc('set_demo_role', { r: null });
          location.reload();
        });
      }
    
      // The switcher lives in the profile menu, where account-level things belong.
      const menu = document.getElementById('vcIdMenu');
      if (menu) {
        const wrap = document.createElement('div');
        wrap.className = 'vc-idmenu-sec';
        wrap.innerHTML = '<span>View as</span>' +
          ['owner','account_owner','contractor','client'].map((r) =>
            '<button data-view="' + r + '"' + (role === r ? ' class="on"' : '') + '>' +
            LABEL[r] + '</button>').join('');
        menu.insertBefore(wrap, menu.querySelector('#vcIdReport'));
    
        wrap.querySelectorAll('[data-view]').forEach((b) => {
          b.addEventListener('click', async (e) => {
            e.stopPropagation();
            const r = b.dataset.view;
            await sb.rpc('set_demo_role', { r: r === 'owner' ? null : r });
            // Land somewhere that role actually uses.
            location.href = r === 'client' ? '/project'
                          : r === 'contractor' ? '/mywork' : '/hub';
          });
        });
      }
    })();
  } catch (vcErr) { console.error("shell feature failed:", vcErr); }
} catch (vcErr) { console.error("shell feature failed:", vcErr); }


/* ── Manual steps ──────────────────────────────────────────────────────────
   Things the platform cannot do for you. A blocking one interrupts, because a
   note in a list is a note that does not happen. Each says where to go, what to
   do there, and what to bring back. */
try {
  (function(){
    if (role === 'contractor' || role === 'client') return;

    const bar = document.createElement('div');
    bar.className = 'vc-ms-bar';
    document.body.appendChild(bar);

    const veil = document.createElement('div');
    veil.className = 'vc-ms-veil';
    const modal = document.createElement('div');
    modal.className = 'vc-ms';
    document.body.append(veil, modal);

    let steps = [], at = 0;

    async function load(){
      const { data } = await sb.from('manual_steps')
        .select('*').eq('status','open').order('blocking', { ascending:false });
      steps = data || [];
      paintBar();
      const blockers = steps.filter(s => s.blocking);
      if (blockers.length && !sessionStorage.getItem('vcMsSeen')) {
        sessionStorage.setItem('vcMsSeen', '1');
        open(0);
      }
    }

    function paintBar(){
      if (!steps.length) { bar.classList.remove('on'); document.body.classList.remove('vc-ms-open'); return; }
      const b = steps.filter(s => s.blocking).length;
      bar.innerHTML =
        '<span class="vc-ms-i">\u270B</span>' +
        '<span class="vc-ms-t">' +
          (b ? '<b>' + b + ' thing' + (b>1?'s':'') + ' only you can do</b>' +
               ' \u2014 work is waiting on ' + (b>1?'them':'it')
             : '<b>' + steps.length + ' manual step' + (steps.length>1?'s':'') + '</b> outstanding') +
        '</span>' +
        '<button class="vc-ms-go">Show me</button>';
      bar.className = 'vc-ms-bar on' + (b ? ' blocking' : '');
      document.body.classList.add('vc-ms-open');
      bar.querySelector('.vc-ms-go').addEventListener('click', () => open(0));
    }

    function open(i){
      at = Math.max(0, Math.min(i, steps.length - 1));
      const s = steps[at];
      if (!s) return;

      modal.innerHTML =
        '<div class="vc-ms-h">' +
          '<span class="vc-ms-count">' + (at+1) + ' of ' + steps.length + '</span>' +
          (s.blocking ? '<span class="vc-ms-blk">Blocking</span>' : '') +
          '<button class="vc-ms-x" aria-label="Close">&times;</button>' +
        '</div>' +
        '<h3>' + esc(s.title) + '</h3>' +
        '<p class="vc-ms-why">' + esc(s.why) + '</p>' +

        '<div class="vc-ms-where"><span>Where</span><b>' + esc(s.where_to_go) + '</b>' +
          (s.url ? '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">Open it \u2197</a>' : '') +
        '</div>' +

        (s.steps && s.steps.length
          ? '<ol class="vc-ms-steps">' + s.steps.map(x => '<li>' + esc(x) + '</li>').join('') + '</ol>'
          : '') +

        (s.bring_back
          ? '<div class="vc-ms-back"><span>Bring back</span><b>' + esc(s.bring_back) + '</b>' +
            (s.return_to ? '<em>to ' + esc(s.return_to) + '</em>' : '') + '</div>'
          : '') +

        '<div class="vc-ms-f">' +
          (steps.length > 1 ? '<button class="vc-ms-nav" data-d="-1">Previous</button>' +
                              '<button class="vc-ms-nav" data-d="1">Next</button>' : '') +
          '<button class="vc-ms-later">Not now</button>' +
          '<button class="vc-ms-done">I have done this</button>' +
        '</div>';

      veil.classList.add('on'); modal.classList.add('on');
      document.body.classList.add('vc-locked');

      modal.querySelector('.vc-ms-x').addEventListener('click', shut);
      modal.querySelector('.vc-ms-later').addEventListener('click', shut);
      modal.querySelectorAll('.vc-ms-nav').forEach((b) => {
        b.addEventListener('click', () => open(at + Number(b.dataset.d)));
      });
      modal.querySelector('.vc-ms-done').addEventListener('click', async () => {
        await sb.from('manual_steps')
          .update({ status:'done', done_at:new Date().toISOString() }).eq('id', s.id);
        shut(); load();
      });
    }

    function shut(){
      veil.classList.remove('on'); modal.classList.remove('on');
      document.body.classList.remove('vc-locked');
    }
    veil.addEventListener('click', shut);

    window.vcManualSteps = load;
    load();
    setInterval(load, 120000);
  })();
} catch (vcErr) { console.error("shell feature failed:", vcErr); }


/* ── Two-step sign-in ──────────────────────────────────────────────────────
   Supabase issues a session at aal1 even when a factor exists. Without this
   check, enrolling in 2FA would change nothing: the password alone would still
   get you in. */
try {
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.nextLevel === 'aal2' && aal.currentLevel !== 'aal2') {
    const { data: fs } = await sb.auth.mfa.listFactors();
    const factor = ((fs && fs.totp) || []).filter((f) => f.status === 'verified')[0];

    if (factor) {
      document.body.innerHTML =
        '<div class="vc-mfa-wrap"><div class="vc-mfa">' +
          '<h1>One more step</h1>' +
          '<p>Open your authenticator app and enter the six digits it shows.</p>' +
          '<input type="text" id="vcMfaCode" inputmode="numeric" maxlength="6" ' +
            'autocomplete="one-time-code" autofocus>' +
          '<button id="vcMfaGo">Continue</button>' +
          '<p class="vc-mfa-msg" id="vcMfaMsg"></p>' +
          '<a href="/login?signout=1" id="vcMfaOut">Sign in as someone else</a>' +
        '</div></div>';

      const go = async () => {
        const code = document.getElementById('vcMfaCode').value.trim();
        const msgEl = document.getElementById('vcMfaMsg');
        if (code.length !== 6) { msgEl.textContent = 'Six digits.'; return; }
        document.getElementById('vcMfaGo').disabled = true;

        const ch = await sb.auth.mfa.challenge({ factorId: factor.id });
        if (ch.error) {
          msgEl.textContent = ch.error.message;
          document.getElementById('vcMfaGo').disabled = false; return;
        }
        const v = await sb.auth.mfa.verify({
          factorId: factor.id, challengeId: ch.data.id, code });
        if (v.error) {
          msgEl.textContent = 'That code did not work. Wait for the next one.';
          document.getElementById('vcMfaGo').disabled = false;
          document.getElementById('vcMfaCode').value = '';
          return;
        }
        location.reload();
      };

      document.getElementById('vcMfaGo').addEventListener('click', go);
      document.getElementById('vcMfaCode').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') go();
      });
      document.getElementById('vcMfaOut').addEventListener('click', async (e) => {
        e.preventDefault();
        await sb.auth.signOut();
        location.href = '/login';
      });

      window.__mfaBlocked = true;
    }
  }
} catch (mfaErr) {
  console.error('mfa check failed:', mfaErr);
}

/* Nothing behind the challenge should load, or a page would render and fetch
   data while the second factor is still outstanding. */
if (!window.__mfaBlocked) {
  window.dispatchEvent(new Event('vc-auth-ready'));
}

/* Pages define window.vcInit and expect it to run once auth resolves. Calling it
   here (rather than relying on each page to add its own listener) means a new
   page can never silently fail to initialise. */
if (typeof window.vcInit === 'function') {
  try { window.vcInit(); } catch (e) { console.error('vcInit failed:', e); }
} else {
  // The page's inline script may parse after this module; retry once.
  setTimeout(function(){
    if (typeof window.vcInit === 'function') {
      try { window.vcInit(); } catch (e) { console.error('vcInit failed:', e); }
    }
  }, 0);
}
