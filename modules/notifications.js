let notifPanelOpen = false;
let unseenCount = 0;

const notifStyles = document.createElement('style');
notifStyles.textContent = `
#notif-bell-btn {
  position: relative;
  cursor: pointer;
}
#notif-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  background: #e63946;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  pointer-events: none;
  border: 2px solid var(--bg-primary);
}
#notif-panel {
  position: fixed;
  top: 0;
  padding-top: env(safe-area-inset-top);
  right: 0;
  width: 100%;
  height: 100dvh;
  background: var(--bg-primary);
  z-index: 9998;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.3s cubic-bezier(.4,0,.2,1);
  box-shadow: -4px 0 24px rgba(0,0,0,0.18);
}
#notif-panel.open { transform: translateX(0); }
#notif-panel-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 9997;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s;
}
#notif-panel-backdrop.open { opacity: 1; pointer-events: all; }
.notif-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 18px 14px;
  border-bottom: 1px solid var(--border-light);
  flex-shrink: 0;
}
.notif-header h2 {
  font-size: 18px;
  font-weight: 700;
  margin: 0;
  color: var(--text-primary);
}
.notif-close-btn {
  background: var(--iconbox-bg);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  font-size: 18px;
  transition: background 0.15s;
}
.notif-close-btn:active { background: var(--border-light); }
.notif-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}
.notif-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 18px;
  cursor: pointer;
  transition: background 0.12s;
  border-left: 3px solid transparent;
}
.notif-item:active { background: var(--iconbox-bg); }
.notif-item.unseen {
  background: var(--iconbox-bg);
  border-left-color: transparent;
}
.notif-avatar {
  width: 44px;
  height: 44px;
  border-radius: 16px;
  object-fit: cover;
  flex-shrink: 0;
}
.notif-content { flex: 1; min-width: 0; }
.notif-content span { font-size: 14px; color: var(--text-primary); line-height: 1.4; }
.notif-content strong { font-weight: 700; }
.notif-content p {
  margin: 2px 0 0;
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notif-time {
  font-size: 11px;
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-top: 2px;
}
.notif-icon-badge {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: -2px;
  right: -2px;
  border: 2px solid var(--card);
}
.notif-icon-badge svg {
  fill: var(--text-primary);
}
.notif-avatar-wrap { position: relative; flex-shrink: 0; }
.notif-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  color: var(--text-secondary);
  gap: 8px;
  font-size: 15px;
}
.notif-section-title {
  font-size: 12px;
  font-weight: 700;
  color: var(--text-secondary);
  padding: 10px 18px 4px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
`;
document.head.appendChild(notifStyles);

const notifPanelBackdrop = document.createElement('div');
notifPanelBackdrop.id = 'notif-panel-backdrop';
document.body.appendChild(notifPanelBackdrop);

const notifPanel = document.createElement('div');
notifPanel.id = 'notif-panel';
notifPanel.innerHTML = `
  <div class="notif-header">
    <h2>Notifications</h2>
    <button class="notif-close-btn" id="notif-close-btn">
      <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#999999"><path d="M480-385 302-207q-20 20-48 20t-47-20q-20-20-20-47.5t20-47.5l178-178-178-179q-20-20-20-47.5t20-47.5q19-20 47-20t48 20l178 178 178-178q20-20 48-20t47 20q20 20 20 47.5T753-659L575-480l178 178q20 20 20 47.5T753-207q-19 20-47 20t-48-20L480-385Z"/></svg>
    </button>
  </div>
  <div class="notif-list" id="notif-list"></div>
`;
document.body.appendChild(notifPanel);

document.getElementById('notif-bell-btn').addEventListener('click', openNotifPanel);
notifPanelBackdrop.addEventListener('click', closeNotifPanel);
document.getElementById('notif-close-btn').addEventListener('click', closeNotifPanel);

function openNotifPanel() {
  notifPanelOpen = true;
  notifPanel.classList.add('open');
  notifPanelBackdrop.classList.add('open');
  loadNotifications();
  markAllSeen();
}

function closeNotifPanel() {
  notifPanelOpen = false;
  notifPanel.classList.remove('open');
  notifPanelBackdrop.classList.remove('open');
}

function timeAgo(isoStr) {
  const diff = Date.now() - new Date(isoStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function notifTypeLabel(type, fromUsername) {
  if (type === 'follow') return `<strong>@${fromUsername}</strong> started following you`;
  if (type === 'reply') return `<strong>@${fromUsername}</strong> replied to your post`;
  if (type === 'message') return `<strong>@${fromUsername}</strong> sent you a message`;
  return `<strong>@${fromUsername}</strong> interacted with you`;
}

function notifTypeIcon(type) {
  if (type === 'follow') return { bg: 'var(--iconbox-bg)', svg: `<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="#999999"><path d="M726-549h-28q-19.9 0-34.45-13.79Q649-576.58 649-597.29t13.85-35.21Q676.7-647 698-647h28v-27q0-19.9 13.79-34.45Q753.58-723 774.29-723t35.21 13.85Q824-695.3 824-674v27h27q19.9 0 34.45 14.29 14.55 14.29 14.55 35T886.15-563Q872.3-549 851-549h-27v28q0 19.9-14.29 34.45-14.29 14.55-35 14.55T740-486.55Q726-501.1 726-521v-28Zm-471.5-7Q201-610 201-688.5T254.34-820q53.34-53 132.5-53t132.66 53Q573-767 573-688.5T519.66-556q-53.34 54-132.5 54T254.5-556ZM53-246v-11q0-38.25 18.41-69.4Q89.81-357.56 123-375q59-35 126.31-53.5t137.5-18.5Q459-447 526-428.5T651-376q33.19 17.44 51.59 48.1Q721-297.25 721-257v11q0 55.1-37.16 91.55Q646.68-118 592.96-118H180.72Q127-118 90-154.45T53-246Z"/></svg>` };
  if (type === 'reply') return { bg: 'var(--iconbox-bg)', svg: `<svg xmlns="<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="#999999"><path d="m341-446 52 52q18 18 18.5 45T394-303.52Q375-284 348.5-285T304-304L143-465q-19-18.64-19-45.32T143-556l161-161q20-19 45.67-19 25.66 0 44.33 19 18 18.67 18.5 44.83Q413-646 394-628l-53 54h300q91.68 0 156.34 64.66T862-353v125q0 27.3-18.29 45.65-18.29 18.35-45 18.35T753-182.35Q734-200.7 734-228v-125q0-40-27-66.5T641-446H341Z"/></svg>` };
  if (type === 'message') return { bg: 'var(--iconbox-bg)', svg: `<svg xmlns="http://www.w3.org/2000/svg" height="14px" viewBox="0 -960 960 960" width="14px" fill="#999999"><path d="M172-117q-57.4 0-96.7-39.3Q36-195.6 36-253v-454q0-57.4 39.3-96.7Q114.6-843 172-843h616q57.4 0 96.7 39.3Q924-764.4 924-707v454q0 57.4-39.3 96.7Q845.4-117 788-117H172Zm85-175h446q18.6 0 31.8-13.28t13.2-32Q748-356 734.8-369T703-382H257q-18.6 0-31.8 13.08t-13.2 31.5q0 18.42 13.2 31.92T257-292Zm0-143h446q18.6 0 31.8-13t13.2-32q0-19-13.2-32T703-525H257q-18.6 0-31.8 13T212-480q0 19 13.2 32t31.8 13Zm0-143h283q18.6 0 31.8-13.08t13.2-31.5q0-18.42-13.2-31.92T540-668H257q-18.6 0-31.8 13.28t-13.2 32Q212-604 225.2-591t31.8 13Z"/></svg>` };
  return { bg: '#888', svg: '' };
}

async function loadNotifications() {
  const list = document.getElementById('notif-list');
  list.innerHTML = `<div class="notif-empty"><span>Loading...</span></div>`;

  try {
    const res = await fetchWithAuth(`${baseUrl}/api/notifications`);
    const notifs = await res.json();

    if (!notifs.length) {
      list.innerHTML = `<div class="notif-empty">
        <svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="currentColor" style="opacity:.25"><path d="M160-200v-80h80v-280q0-83 50-149.5T420-790v-30q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820v30q80 20 130 86.5T720-560v280h80v80H160Zm320-300Zm0 420q-33 0-56.5-23.5T400-160h160q0 33-23.5 56.5T480-80ZM320-280h320v-280q0-66-47-113t-113-47q-66 0-113 47t-47 113v280Z"/></svg>
        <span>No notifications yet</span>
      </div>`;
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const today = notifs.filter(n => new Date(n.createdAt) >= todayStart);
    const earlier = notifs.filter(n => new Date(n.createdAt) < todayStart);

    let html = '';
    if (today.length) {
      html += `<div class="notif-section-title">Today</div>`;
      today.forEach(n => { html += renderNotif(n); });
    }
    if (earlier.length) {
      html += `<div class="notif-section-title">Earlier</div>`;
      earlier.forEach(n => { html += renderNotif(n); });
    }

    list.innerHTML = html;

    list.querySelectorAll('.notif-item').forEach(el => {
      el.addEventListener('click', () => handleNotifClick(el.dataset.type, el.dataset.ref));
    });
  } catch (e) {
    list.innerHTML = `<div class="notif-empty">Failed to load</div>`;
  }
}

function renderNotif(n) {
  const icon = notifTypeIcon(n.type);
  return `
    <div class="notif-item ${n.seen ? '' : 'unseen'}" data-type="${n.type}" data-ref="${n.refId || ''}">
      <div class="notif-avatar-wrap">
        <img class="notif-avatar" src="${n.fromPhoto}" onerror="this.src='https://i.imgflip.com/1ickup.jpg'">
        <span class="notif-icon-badge" style="background:${icon.bg}">${icon.svg}</span>
      </div>
      <div class="notif-content">
        <span>${notifTypeLabel(n.type, n.fromUsername)}</span>
        ${n.refText ? `<p>${n.refText}</p>` : ''}
      </div>
      <span class="notif-time">${timeAgo(n.createdAt)}</span>
    </div>
  `;
}

function handleNotifClick(type, refId) {
  closeNotifPanel();
  if (type === 'follow') showView('profile');
  else if (type === 'reply') showView('pos-t');
  else if (type === 'message') showView('chats');
}

async function markAllSeen() {
  try {
    await fetchWithAuth(`${baseUrl}/api/notifications/seen`, { method: 'POST' });
    unseenCount = 0;
    updateBadge();
  } catch (e) {}
}

function updateBadge() {
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.style.display = unseenCount > 0 ? 'block' : 'none';
}

async function fetchUnseenCount() {
  try {
    const res = await fetchWithAuth(`${baseUrl}/api/notifications/unseen-count`);
    const data = await res.json();
    unseenCount = data.count || 0;
    updateBadge();
  } catch (e) {}
}

async function initPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const res = await fetch(`${baseUrl}/api/push/vapid-public`);
    const { key } = await res.json();
    if (!key) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key)
      });
    }
    await fetchWithAuth(`${baseUrl}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub })
    });
    console.log('Push subscribed OK');
  } catch (e) {
    console.error('Push init error:', e);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

navigator.serviceWorker?.addEventListener('message', event => {
  if (event.data?.type === 'navigate') {
    const url = new URL(event.data.url, window.location.origin);
    const view = url.searchParams.get('view');
    if (view) showView(view);
  }
});

window.addEventListener('load', async () => {
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  if (!isAuth) return;
  await fetchUnseenCount();
  setInterval(fetchUnseenCount, 30000);
  setTimeout(initPushNotifications, 2000);
});

if (typeof io !== 'undefined' && typeof baseUrl !== 'undefined') {
  const notifSocket = io(baseUrl, { transports: ['websocket', 'polling'] });
  notifSocket.on('connect', () => {
    const token = localStorage.getItem('sessionToken');
    if (token) notifSocket.emit('auth', token);
  });
  notifSocket.on('notification', (notif) => {
    unseenCount++;
    updateBadge();
    if (notifPanelOpen) loadNotifications();
    showInAppToast(notif);
  });
}

function showInAppToast(notif) {
  const existing = document.getElementById('notif-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'notif-toast';
  toast.style.cssText = `
    position: fixed;
    top: 0;
    left: 50%;
    transform: translateX(-50%) translateY(-120px);
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: 16px;
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    z-index: 99999;
    max-width: 340px;
    width: calc(100vw - 32px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.18);
    transition: transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
    cursor: pointer;
  `;

  const icon = notifTypeIcon(notif.type);

  toast.innerHTML = `
    <div style="position:relative;flex-shrink:0;">
      <img src="${notif.fromPhoto}" style="width:40px;height:40px;border-radius:12.8px;object-fit:cover;" onerror="this.src='https://i.imgflip.com/1ickup.jpg'">
      <span style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:${icon.bg};display:flex;align-items:center;justify-content:center;border:2px solid var(--bg-primary);">${icon.svg}</span>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notifTypeLabel(notif.type, notif.fromUsername)}</div>
      ${notif.refText ? `<div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notif.refText}</div>` : ''}
    </div>
  `;

  document.body.appendChild(toast);

  toast.getBoundingClientRect();
  toast.style.transform = 'translateX(-50%) translateY(calc(16px + env(safe-area-inset-top)))';

  toast.addEventListener('click', () => {
    handleNotifClick(notif.type, notif.refId);
    toast.remove();
  });

  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-120px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}