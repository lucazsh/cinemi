(function () {
  const style = document.createElement('style');
  style.textContent = `
    #chats .nt { position: sticky; top: 0; background: var(--bg-primary); z-index: 10; }
    .conv-item {
      display: flex; align-items: center; gap: 13px; padding: 12px 8px;
      border-radius: 16px; cursor: pointer; transition: background .18s;
      border-bottom: 1px solid var(--border-dark-alpha-2); position: relative;
    }
    .conv-item:active { background: var(--nav-active-bg); }
    .conv-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .conv-meta { flex: 1; min-width: 0; }
    .conv-top { display: flex; justify-content: space-between; align-items: center; }
    .conv-name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
    .conv-time { font-size: 12px; color: var(--text-subtle); }
    .conv-preview {
      font-size: 13px; color: var(--text-subtle); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis;
      display: flex; align-items: center; gap: 5px; margin-top: 2px;
    }
    .conv-preview.conv-unread { color: var(--text-primary); font-weight: 600; }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-primary); flex-shrink: 0; }
    #chat-win-messages { scrollbar-width: none; }
    #chat-win-messages::-webkit-scrollbar { display: none; }
    @keyframes dmAppear {
      from { opacity: 0; transform: translateY(8px) scale(0.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dm-msg { display: flex; flex-direction: column; max-width: 75%; }
    .dm-msg.animated { animation: dmAppear .2s ease forwards; }
    .dm-msg-me { align-self: flex-end; align-items: flex-end; }
    .dm-msg-them { align-self: flex-start; align-items: flex-start; }
    .dm-bubble {
      padding: 10px 14px; border-radius: 18px;
      font-size: 15px; line-height: 1.45; word-break: break-word;
      cursor: pointer; transition: opacity .15s;
    }
    .dm-bubble:active { opacity: 0.7; }
    .dm-msg-me .dm-bubble { background: var(--button-bg); color: var(--button-text); }
    .dm-msg-them .dm-bubble { background: var(--ichat-c); border: 1px solid var(--border-dark-alpha-2); color: var(--text-primary); }
    .dm-msg-me .dm-bubble.deleted-bubble { background: var(--placeholder-bg); color: var(--text-subtle); font-style: italic; cursor: default; }
    .dm-time { font-size: 11px; color: var(--text-subtle); margin-top: 3px; padding: 0 4px; }
    .chat-search-user-row {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      border-radius: 14px; cursor: pointer; background: var(--bg-secondary);
      border: 1px solid var(--border-dark-alpha-2); margin-bottom: 8px;
    }
    .chat-search-user-row:active { background: var(--nav-active-bg); }
    #chat-toast {
      position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
      background: #18191ef0; color: white; padding: 10px 18px; border-radius: 12px;
      z-index: 9999; font-size: 14px; pointer-events: none;
      opacity: 0; transition: opacity .3s; white-space: nowrap;
    }
    .chat-action-sheet {
      position: fixed; inset: 0; z-index: 9000;
      display: flex; flex-direction: column; justify-content: flex-end;
    }
    .chat-action-backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,0.4);
      animation: fadeIn .2s ease;
    }
    @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
    .chat-action-body {
      position: relative; z-index: 1;
      background: var(--bg-secondary);
      border-radius: 20px 20px 0 0;
      padding: 8px 0 max(20px, env(safe-area-inset-bottom));
      animation: slideUp .22s ease;
    }
    @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
    .chat-action-title {
      font-size: 13px; color: var(--text-subtle); text-align: center;
      padding: 10px 20px 14px; border-bottom: 1px solid var(--border-dark-alpha-2);
    }
    .chat-action-btn {
      display: flex; align-items: center; gap: 14px;
      width: 100%; padding: 16px 22px;
      font-size: 16px; color: var(--text-primary);
      background: none; border: none; cursor: pointer;
      transition: background .15s;
    }
    .chat-action-btn:active { background: var(--nav-active-bg); }
    .chat-action-btn.danger { color: #ff3b30; }
    .chat-action-cancel {
      margin: 6px 12px 0;
      width: calc(100% - 24px); padding: 16px;
      font-size: 16px; font-weight: 600;
      background: var(--bg-primary); color: var(--text-primary);
      border: none; border-radius: 14px; cursor: pointer;
    }
  `;
  document.head.appendChild(style);

  const toast = document.createElement('div');
  toast.id = 'chat-toast';
  document.body.appendChild(toast);

  let currentConvId = null;
  let pollInterval = null;
  let lastMsgTs = 0;
  const renderedIds = new Set();

  const chatsList       = document.getElementById('chats-list');
  const chatWindow      = document.getElementById('chat-window');
  const chatWinMessages = document.getElementById('chat-win-messages');
  const chatWinInput    = document.getElementById('chat-win-input');
  const chatWinName     = document.getElementById('chat-win-name');
  const chatWinAvatar   = document.getElementById('chat-win-avatar');
  const chatSearchOverlay = document.getElementById('chat-search-overlay');
  const chatSearchInput   = document.getElementById('chat-search-input');
  const chatSearchResults = document.getElementById('chat-search-results');

  function myUsername() { return (document.getElementById('addUsername')?.textContent || '').trim(); }
  function showEl(el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
  function hideEl(el) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; }
  function showToast(msg) { toast.textContent = msg; toast.style.opacity = '1'; setTimeout(() => { toast.style.opacity = '0'; }, 2800); }
  function seenKey(id) { return `chat_seen_${id}`; }
  function markSeen(id) { try { localStorage.setItem(seenKey(id), Date.now().toString()); } catch {} }
  function getSeenTs(id) { try { return parseInt(localStorage.getItem(seenKey(id)) || '0'); } catch { return 0; } }
  function atBottom() { return chatWinMessages.scrollHeight - chatWinMessages.scrollTop - chatWinMessages.clientHeight < 80; }
  function scrollToBottom() { chatWinMessages.scrollTop = chatWinMessages.scrollHeight; }
  function clearEmpty() { chatWinMessages.querySelector('[data-empty]')?.remove(); }

  function showActionSheet(title, actions, onCancel) {
    const sheet = document.createElement('div');
    sheet.className = 'chat-action-sheet';
    sheet.innerHTML = `
      <div class="chat-action-backdrop"></div>
      <div class="chat-action-body">
        ${title ? `<div class="chat-action-title">${escapeHtml(title)}</div>` : ''}
        ${actions.map((a, i) => `
          <button class="chat-action-btn${a.danger ? ' danger' : ''}" data-idx="${i}">
            ${a.icon || ''} ${escapeHtml(a.label)}
          </button>`).join('')}
        <button class="chat-action-cancel">Cancel</button>
      </div>`;
    document.body.appendChild(sheet);
    function close() { sheet.remove(); onCancel?.(); }
    sheet.querySelector('.chat-action-backdrop').onclick = close;
    sheet.querySelector('.chat-action-cancel').onclick = close;
    sheet.querySelectorAll('.chat-action-btn').forEach(btn => {
      btn.onclick = () => { sheet.remove(); actions[+btn.dataset.idx].action(); };
    });
  }

  function updateTimestamps() {
    const msgs = [...chatWinMessages.querySelectorAll('.dm-msg')];
    for (let i = 0; i < msgs.length; i++) {
      const cur = msgs[i], next = msgs[i + 1];
      const t = cur.querySelector('.dm-time');
      if (!t) continue;
      if (!next) { t.style.display = ''; continue; }
      const sameSender = cur.dataset.sender === next.dataset.sender;
      const close = (new Date(next.dataset.ts) - new Date(cur.dataset.ts)) < 60000;
      t.style.display = (sameSender && close) ? 'none' : '';
    }
  }

  function buildBubble(msg, animate) {
    const isMe = msg.sender === myUsername();
    const el = document.createElement('div');
    el.className = 'dm-msg ' + (isMe ? 'dm-msg-me' : 'dm-msg-them') + (animate ? ' animated' : '');
    el.dataset.sender = msg.sender;
    el.dataset.ts = msg.createdAt;
    el.dataset.id = msg.id;
    const bubble = document.createElement('div');
    bubble.className = 'dm-bubble';
    bubble.textContent = msg.content;
    if (isMe) {
      bubble.onclick = () => onTapOwnMessage(msg.id);
    }
    const timeEl = document.createElement('span');
    timeEl.className = 'dm-time';
    timeEl.textContent = formatTimeAgo(msg.createdAt);
    el.appendChild(bubble);
    el.appendChild(timeEl);
    return el;
  }

  function addMessage(msg, animate) {
    if (renderedIds.has(msg.id)) return;
    renderedIds.add(msg.id);
    clearEmpty();
    chatWinMessages.appendChild(buildBubble(msg, animate));
    updateTimestamps();
  }

  function onTapOwnMessage(msgId) {
    showActionSheet('Message', [
      {
        label: 'Delete for everyone',
        danger: true,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>',
        action: () => deleteMessageForEveryone(msgId)
      }
    ]);
  }

  async function deleteMessageForEveryone(msgId) {
    if (!currentConvId) return;
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations/${currentConvId}/messages/${msgId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) removeMessageFromUI(msgId);
      else showToast('Could not delete message.');
    } catch { showToast('Error deleting message.'); }
  }

  function removeMessageFromUI(msgId) {
    const el = chatWinMessages.querySelector(`[data-id="${msgId}"]`);
    if (el) {
      el.style.transition = 'opacity .2s, transform .2s';
      el.style.opacity = '0';
      el.style.transform = 'scale(0.9)';
      setTimeout(() => { el.remove(); updateTimestamps(); }, 200);
    }
    renderedIds.delete(msgId);
  }

  function setupLongPress(el, convId, otherUsername) {
    let timer = null;
    let moved = false;

    function startPress(e) {
      moved = false;
      timer = setTimeout(() => {
        if (!moved) showConvActionSheet(convId, otherUsername);
      }, 480);
    }
    function cancelPress() { clearTimeout(timer); }
    function onMove() { moved = true; clearTimeout(timer); }

    el.addEventListener('touchstart', startPress, { passive: true });
    el.addEventListener('touchend', cancelPress);
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('mousedown', startPress);
    el.addEventListener('mouseup', cancelPress);
    el.addEventListener('mouseleave', cancelPress);
  }

  function showConvActionSheet(convId, otherUsername) {
    showActionSheet(`Chat with @${otherUsername}`, [
      {
        label: 'Delete conversation',
        danger: true,
        icon: '<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg>',
        action: () => deleteConversation(convId)
      }
    ]);
  }

  async function deleteConversation(convId) {
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations/${convId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        try { localStorage.removeItem(seenKey(convId)); } catch {}
        loadConversations();
      } else showToast('Could not delete conversation.');
    } catch { showToast('Error.'); }
  }

  function openChatsView(targetUser, targetPhoto) {
    showView('chats');
    loadConversations();
    if (targetUser) setTimeout(() => startChatWith(targetUser, targetPhoto), 300);
  }

  async function loadConversations() {
    chatsList.innerHTML = '<div style="padding:30px;color:var(--text-subtle);text-align:center;">Loading...</div>';
    try {
      const data = await fetchWithAuth(`${baseUrl}/api/conversations`).then(r => r.json());
      if (!data.length) {
        chatsList.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-subtle);">No conversations yet.<br>Tap <b>+</b> to start a new chat.</div>';
        return;
      }
      chatsList.innerHTML = '';
      data.forEach(conv => {
        const el = document.createElement('div');
        el.className = 'conv-item';
        const lastTs = conv.lastMessageAt ? new Date(conv.lastMessageAt).getTime() : 0;
        const unread = lastTs > getSeenTs(conv.id) && !!conv.lastMessage;
        el.innerHTML = `
          <img class="conv-avatar" src="${escapeHtml(conv.otherPhotoUrl)}">
          <div class="conv-meta">
            <div class="conv-top">
              <span class="conv-name">@${escapeHtml(conv.otherUsername)}</span>
              <span class="conv-time">${conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}</span>
            </div>
            <div class="conv-preview${unread ? ' conv-unread' : ''}">
              ${unread ? '<span class="unread-dot"></span>' : ''}
              ${escapeHtml(truncateText(conv.lastMessage || 'No messages yet', 42))}
            </div>
          </div>`;
        el.onclick = () => openConversation(conv.id, conv.otherUsername, conv.otherPhotoUrl);
        setupLongPress(el, conv.id, conv.otherUsername);
        chatsList.appendChild(el);
      });
    } catch {
      chatsList.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">Failed to load.</div>';
    }
  }

  async function openConversation(convId, otherUser, otherPhoto) {
    currentConvId = convId;
    lastMsgTs = 0;
    renderedIds.clear();
    chatWinName.textContent = '@' + otherUser;
    chatWinAvatar.src = otherPhoto || 'https://i.imgflip.com/1ickup.jpg';
    chatWinMessages.innerHTML = '<div style="padding:20px;color:var(--text-subtle);text-align:center;">Loading...</div>';
    showEl(chatWindow);
    try {
      const msgs = await fetchWithAuth(`${baseUrl}/api/conversations/${convId}/messages`).then(r => r.json());
      chatWinMessages.innerHTML = '';
      renderedIds.clear();
      if (!msgs.length) {
        const e = document.createElement('div');
        e.setAttribute('data-empty', '1');
        e.style.cssText = 'padding:40px 20px;text-align:center;color:var(--text-subtle);';
        e.textContent = 'Say hello! 👋';
        chatWinMessages.appendChild(e);
      } else {
        msgs.forEach(m => addMessage(m, false));
        scrollToBottom();
        lastMsgTs = new Date(msgs[msgs.length - 1].createdAt).getTime();
      }
    } catch {}
    markSeen(convId);
    clearInterval(pollInterval);
    pollInterval = setInterval(pollOtherMessages, 1500);
  }

  function closeChatWindow() {
    hideEl(chatWindow);
    clearInterval(pollInterval);
    pollInterval = null;
    if (currentConvId) markSeen(currentConvId);
    currentConvId = null;
    loadConversations();
  }

  async function pollOtherMessages() {
    if (!currentConvId) return;
    try {
      const msgs = await fetchWithAuth(`${baseUrl}/api/conversations/${currentConvId}/messages?since=${lastMsgTs}`).then(r => r.json());
      const newMsgs = msgs.filter(m => !renderedIds.has(m.id) && m.sender !== myUsername());
      if (!newMsgs.length) return;
      const wasAtBottom = atBottom();
      newMsgs.forEach(m => addMessage(m, true));
      if (wasAtBottom) scrollToBottom();
      lastMsgTs = Math.max(lastMsgTs, new Date(msgs[msgs.length - 1].createdAt).getTime());
      markSeen(currentConvId);
    } catch {}
  }

  async function sendMessage() {
    const text = chatWinInput.value.trim();
    if (!text || !currentConvId) return;
    chatWinInput.value = '';
    const now = new Date().toISOString();
    const tempId = 'tmp_' + Date.now();
    addMessage({ id: tempId, sender: myUsername(), content: text, createdAt: now }, true);
    scrollToBottom();
    try {
      const data = await fetchWithAuth(`${baseUrl}/api/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      }).then(r => r.json());
      if (data.ok) {
        renderedIds.delete(tempId);
        const tempEl = chatWinMessages.querySelector(`[data-id="${tempId}"]`);
        if (tempEl) {
          tempEl.dataset.id = data.message.id;
          tempEl.dataset.ts = data.message.createdAt;
          const bubble = tempEl.querySelector('.dm-bubble');
          if (bubble) bubble.onclick = () => onTapOwnMessage(data.message.id);
        }
        renderedIds.add(data.message.id);
        if (data.message.createdAt) lastMsgTs = Math.max(lastMsgTs, new Date(data.message.createdAt).getTime());
        updateTimestamps();
        markSeen(currentConvId);
      }
    } catch {}
  }

  function openCompose() {
    chatSearchInput.value = '';
    chatSearchResults.innerHTML = '';
    showEl(chatSearchOverlay);
    setTimeout(() => chatSearchInput.focus(), 200);
  }

  function closeCompose() { hideEl(chatSearchOverlay); }

  async function searchUsersForChat(query) {
    if (!query) { chatSearchResults.innerHTML = ''; return; }
    chatSearchResults.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">Searching...</div>';
    try {
      const users = await fetchWithAuth(`${baseUrl}/api/search/users?q=${encodeURIComponent(query)}`).then(r => r.json());
      if (!users.length) { chatSearchResults.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">No users found.</div>'; return; }
      chatSearchResults.innerHTML = '';
      users.forEach(u => {
        const el = document.createElement('div');
        el.className = 'chat-search-user-row';
        el.innerHTML = `
          <img src="${escapeHtml(u.photoUrl)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">
          <div>
            <div style="font-weight:700;color:var(--text-primary);font-size:15px;">@${escapeHtml(u.username)}</div>
            <div style="font-size:12px;color:var(--text-subtle);">Tap to message</div>
          </div>`;
        el.onclick = () => { closeCompose(); startChatWith(u.username, u.photoUrl); };
        chatSearchResults.appendChild(el);
      });
    } catch { chatSearchResults.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">Error.</div>'; }
  }

  async function startChatWith(username, photoUrl) {
    try {
      const data = await fetchWithAuth(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUsername: username })
      }).then(r => r.json());
      if (!data.ok) { showToast(data.error || 'Cannot start conversation.'); return; }
      openConversation(data.conversation.id, username, photoUrl || 'https://i.imgflip.com/1ickup.jpg');
    } catch { showToast('Failed to open conversation.'); }
  }

  function addMsgBtnToUserRow(el) {
    if (el.dataset.chatBtnAdded) return;
    el.dataset.chatBtnAdded = '1';
    const username = el.dataset.username;
    if (!username) return;
    const btn = document.createElement('button');
    btn.title = 'Message';
    btn.style.cssText = 'margin-left:auto;background:var(--iconbox-bg);border:1px solid var(--border-dark-alpha-2);border-radius:10px;padding:7px 10px;cursor:pointer;flex-shrink:0;display:flex;align-items:center;';
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="var(--text-primary)"><path d="M240-240 92 92q-19 19-43.5 8.5T80-177v-623q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240Zm-34-80h594v-480H160v525l46-45Zm-46 0v-480 480Z"/></svg>`;
    btn.onclick = e => { e.stopPropagation(); openChatsView(username, el.querySelector('img')?.src); };
    el.appendChild(btn);
  }

  const observer = new MutationObserver(muts => {
    muts.forEach(m => m.addedNodes.forEach(node => {
      if (node.nodeType !== 1) return;
      if (node.classList?.contains('usr-search')) addMsgBtnToUserRow(node);
      node.querySelectorAll?.('.usr-search').forEach(addMsgBtnToUserRow);
    }));
  });

  function init() {
    const sr = document.getElementById('chat-search-results')
    if (sr) observer.observe(sr, { childList: true, subtree: true });

    const messageBtn = document.getElementById('messageBtn');
    if (messageBtn) {
      messageBtn.onclick = () => {
        const username = document.getElementById('userProfileTag')?.textContent?.replace('@', '').trim();
        const photo = document.getElementById('userProfileImg')?.src;
        if (username) openChatsView(username, photo); else openChatsView();
      };
    }

    document.getElementById('chats-compose-btn')?.addEventListener('click', openCompose);
    document.getElementById('chat-win-back')?.addEventListener('click', closeChatWindow);
    document.getElementById('chat-search-back')?.addEventListener('click', closeCompose);
    document.getElementById('chat-win-send')?.addEventListener('click', sendMessage);
    chatWinInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });

    let st;
    chatSearchInput?.addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => searchUsersForChat(chatSearchInput.value.trim()), 350); });

    const origOpenPanel = window.openPanel;
    if (origOpenPanel) {
      window.openPanel = name => { if (name === 'chat') { openChatsView(); return; } origOpenPanel(name); };
    }

    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });

    socket.on('dm_message', msg => {
      if (msg.conversationId !== currentConvId) return;
      if (msg.sender === myUsername()) return;
      if (renderedIds.has(msg.id)) return;
      const wasAtBottom = atBottom();
      addMessage(msg, true);
      if (wasAtBottom) scrollToBottom();
      lastMsgTs = Math.max(lastMsgTs, new Date(msg.createdAt).getTime());
      markSeen(currentConvId);
    });

    socket.on('dm_message_deleted', ({ conversationId, messageId }) => {
      if (conversationId === currentConvId) removeMessageFromUI(messageId);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.openChatsWithUser = openChatsView;
})();
