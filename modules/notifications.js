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
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 3px;
  pointer-events: none;
}
#notif-panel {
  position: fixed;
  top: 0;
  padding-top: env(safe-area-inset-top);
  right: 0;
  width: min(380px, 100vw);
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
  border-radius: 50%;
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
  border-left-color: #e63946;
}
.notif-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
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
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  bottom: -2px;
  right: -2px;
  border: 2px solid var(--bg-primary);
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
      <svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>
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
  if (type === 'follow') return { bg: '#3a86ff', svg: `<svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="white"><path d="M500-482q29-32 44.5-73t15.5-85q0-44-15.5-85T500-798q60 8 100 53t40 105q0 60-40 105t-100 53Zm220 322v-120q0-36-16-68.5T662-406q51 18 94.5 46.5T800-280v120h-80Zm80-320v-80h-80v-80h80v-80h80v80h80v80h-80v80h-80Zm-480-80q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM0-160v-112q0-34 17.5-62.5T64-378q62-31 126-46.5T320-440q66 0 130 15.5T576-378q29 15 46.5 43.5T640-272v112H0Zm320-320q33 0 56.5-23.5T400-560q0-33-23.5-56.5T320-640q-33 0-56.5 23.5T240-560q0 33 23.5 56.5T320-480ZM80-240h480v-32q0-11-5.5-20T540-306q-54-27-109-40.5T320-360q-56 0-111 13.5T100-306q-9 5-14.5 14T80-272v32Zm240-320Zm0 320Z"/></svg>` };
  if (type === 'reply') return { bg: '#2ec4b6', svg: `<svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="white"><path d="M880-80 720-240H320q-33 0-56.5-23.5T240-320v-40h440q33 0 56.5-23.5T760-440v-280h40q33 0 56.5 23.5T880-640v560ZM160-473l47-47H680v-280H80v280h80v120l47-47-47 47Z"/></svg>` };
  if (type === 'message') return { bg: '#e63946', svg: `<svg xmlns="http://www.w3.org/2000/svg" height="12px" viewBox="0 -960 960 960" width="12px" fill="white"><path d="M80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm134-240h586v-480H160v525l54-45Zm-54 0v-480 480Z"/></svg>` };
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
  if (unseenCount > 0) {
    badge.style.display = 'flex';
    badge.textContent = unseenCount > 99 ? '99+' : unseenCount;
  } else {
    badge.style.display = 'none';
  }
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
    position: fixed; top: 16px; left: 50%; transform: translateX(-50%) translateY(-80px);
    background: var(--bg-primary); border: 1px solid var(--border-light);
    border-radius: 16px; padding: 12px 16px; display: flex; align-items: center;
    gap: 12px; z-index: 99999; max-width: 340px; width: calc(100vw - 32px);
    box-shadow: 0 8px 32px rgba(0,0,0,0.18); transition: transform 0.35s cubic-bezier(.4,0,.2,1);
    cursor: pointer;
  `;
  const icon = notifTypeIcon(notif.type);
  toast.innerHTML = `
    <div style="position:relative;flex-shrink:0;">
      <img src="${notif.fromPhoto}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;" onerror="this.src='https://i.imgflip.com/1ickup.jpg'">
      <span style="position:absolute;bottom:-2px;right:-2px;width:18px;height:18px;border-radius:50%;background:${icon.bg};display:flex;align-items:center;justify-content:center;border:2px solid var(--bg-primary);">${icon.svg}</span>
    </div>
    <div style="flex:1;min-width:0;">
      <div style="font-size:13px;font-weight:600;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notifTypeLabel(notif.type, notif.fromUsername)}</div>
      ${notif.refText ? `<div style="font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${notif.refText}</div>` : ''}
    </div>
  `;
  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });
  });
  toast.addEventListener('click', () => {
    handleNotifClick(notif.type, notif.refId);
    toast.remove();
  });
  setTimeout(() => {
    toast.style.transform = 'translateX(-50%) translateY(-80px)';
    setTimeout(() => toast.remove(), 400);
  }, 4000);
}
