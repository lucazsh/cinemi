(function () {
  const style = document.createElement('style');
  style.textContent = `
    #chats .nt { position: sticky; top: 0; background: var(--bg-primary); z-index: 10; }
    .conv-item {
      display: flex;
      align-items: center;
      gap: 13px;
      padding: 12px 8px;
      border-radius: 16px;
      cursor: pointer;
      transition: background .18s;
      border-bottom: 1px solid var(--border-dark-alpha-2);
    }
    .conv-item:active { background: var(--nav-active-bg); }
    .conv-avatar { width: 50px; height: 50px; border-radius: 50%; object-fit: cover; flex-shrink: 0; }
    .conv-meta { flex: 1; min-width: 0; }
    .conv-top { display: flex; justify-content: space-between; align-items: center; }
    .conv-name { font-weight: 700; font-size: 15px; color: var(--text-primary); }
    .conv-time { font-size: 12px; color: var(--text-subtle); }
    .conv-preview { font-size: 13px; color: var(--text-subtle); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
    .conv-preview.conv-unread { color: var(--text-primary); font-weight: 600; }
    .unread-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--text-primary); flex-shrink: 0; }
    #chat-win-messages::-webkit-scrollbar { display: none; }
    .dm-msg { display: flex; flex-direction: column; max-width: 75%; }
    .dm-msg-me { align-self: flex-end; align-items: flex-end; }
    .dm-msg-them { align-self: flex-start; align-items: flex-start; }
    .dm-bubble {
      padding: 10px 14px;
      border-radius: 18px;
      font-size: 15px;
      line-height: 1.45;
      word-break: break-word;
      color: var(--text-primary);
    }
    .dm-msg-me .dm-bubble { background: var(--button-bg); color: var(--button-text); border-bottom-right-radius: 4px; }
    .dm-msg-them .dm-bubble { background: var(--ichat-c); border: 1px solid var(--border-dark-alpha-2); border-bottom-left-radius: 4px; }
    .dm-time { font-size: 11px; color: var(--text-subtle); margin-top: 3px; padding: 0 4px; }
    .chat-search-user-row {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      border-radius: 14px; cursor: pointer;
      background: var(--bg-secondary); border: 1px solid var(--border-dark-alpha-2);
      margin-bottom: 8px; transition: background .15s;
    }
    .chat-search-user-row:active { background: var(--nav-active-bg); }
    #chat-toast {
      position: fixed; bottom: 120px; left: 50%; transform: translateX(-50%);
      background: #18191ef0; color: white; padding: 10px 18px; border-radius: 12px;
      z-index: 9999; font-size: 14px; pointer-events: none;
      opacity: 0; transition: opacity .3s; white-space: nowrap;
    }
  `;
  document.head.appendChild(style);

  const toast = document.createElement('div');
  toast.id = 'chat-toast';
  document.body.appendChild(toast);

  let currentConvId = null;
  let currentConvUser = null;
  let pollInterval = null;
  let lastMsgTs = 0;

  const chatsView = document.getElementById('chats');
  const chatsList = document.getElementById('chats-list');
  const chatWindow = document.getElementById('chat-window');
  const chatWinMessages = document.getElementById('chat-win-messages');
  const chatWinInput = document.getElementById('chat-win-input');
  const chatWinName = document.getElementById('chat-win-name');
  const chatWinAvatar = document.getElementById('chat-win-avatar');
  const chatSearchOverlay = document.getElementById('chat-search-overlay');
  const chatSearchInput = document.getElementById('chat-search-input');
  const chatSearchResults = document.getElementById('chat-search-results');

  function showEl(el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; }
  function hideEl(el) { el.style.opacity = '0'; el.style.pointerEvents = 'none'; }

  function showToast(msg) {
    toast.textContent = msg;
    toast.style.opacity = '1';
    setTimeout(() => { toast.style.opacity = '0'; }, 2800);
  }

  function getMyUsername() {
    return (document.getElementById('addUsername')?.value || '').trim();
  }

  function openChatsView(targetUser, targetPhoto) {
    showView('chats');
    loadConversations();
    if (targetUser) {
      setTimeout(() => startChatWith(targetUser, targetPhoto), 300);
    }
  }

  async function loadConversations() {
    chatsList.innerHTML = '<div style="padding:30px 20px;color:var(--text-subtle);text-align:center;">Loading...</div>';
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations`);
      const data = await res.json();
      if (!data.length) {
        chatsList.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-subtle);">No conversations yet.<br>Tap <b>+</b> to start a new chat.</div>';
        return;
      }
      chatsList.innerHTML = '';
      data.forEach(conv => {
        const el = document.createElement('div');
        el.className = 'conv-item';
        const recent = conv.lastMessageAt && (Date.now() - new Date(conv.lastMessageAt).getTime()) < 5 * 60 * 1000;
        el.innerHTML = `
          <img class="conv-avatar" src="${escapeHtml(conv.otherPhotoUrl)}">
          <div class="conv-meta">
            <div class="conv-top">
              <span class="conv-name">@${escapeHtml(conv.otherUsername)}</span>
              <span class="conv-time">${conv.lastMessageAt ? formatTimeAgo(conv.lastMessageAt) : ''}</span>
            </div>
            <div class="conv-preview ${recent ? 'conv-unread' : ''}">
              ${recent ? '<span class="unread-dot"></span>' : ''}
              ${escapeHtml(truncateText(conv.lastMessage || 'No messages yet', 42))}
            </div>
          </div>
        `;
        el.onclick = () => openConversation(conv.id, conv.otherUsername, conv.otherPhotoUrl);
        chatsList.appendChild(el);
      });
    } catch {
      chatsList.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">Failed to load.</div>';
    }
  }

  async function openConversation(convId, otherUser, otherPhoto) {
    currentConvId = convId;
    currentConvUser = otherUser;
    lastMsgTs = 0;
    chatWinName.textContent = '@' + otherUser;
    chatWinAvatar.src = otherPhoto || 'https://i.imgflip.com/1ickup.jpg';
    chatWinMessages.innerHTML = '<div style="padding:20px;color:var(--text-subtle);text-align:center;">Loading...</div>';
    showEl(chatWindow);
    await loadMessages();
    clearInterval(pollInterval);
    pollInterval = setInterval(pollNewMessages, 3000);
  }

  function closeChatWindow() {
    hideEl(chatWindow);
    clearInterval(pollInterval);
    pollInterval = null;
    currentConvId = null;
    loadConversations();
  }

  async function loadMessages() {
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations/${currentConvId}/messages`);
      const msgs = await res.json();
      chatWinMessages.innerHTML = '';
      if (!msgs.length) {
        chatWinMessages.innerHTML = '<div style="padding:40px 20px;text-align:center;color:var(--text-subtle);">Say hello! 👋</div>';
        return;
      }
      msgs.forEach(m => appendMessage(m));
      scrollToBottom();
      lastMsgTs = new Date(msgs[msgs.length - 1].createdAt).getTime();
    } catch {}
  }

  async function pollNewMessages() {
    if (!currentConvId) return;
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations/${currentConvId}/messages?since=${lastMsgTs}`);
      const msgs = await res.json();
      if (!msgs.length) return;
      const emptyNotice = chatWinMessages.querySelector('[data-empty]');
      if (emptyNotice) chatWinMessages.innerHTML = '';
      msgs.forEach(m => appendMessage(m));
      scrollToBottom();
      lastMsgTs = new Date(msgs[msgs.length - 1].createdAt).getTime();
    } catch {}
  }

  function appendMessage(msg) {
    const me = getMyUsername();
    const isMe = msg.sender === me;
    const el = document.createElement('div');
    el.className = 'dm-msg ' + (isMe ? 'dm-msg-me' : 'dm-msg-them');
    el.innerHTML = `<div class="dm-bubble">${escapeHtml(msg.content)}</div><span class="dm-time">${formatTimeAgo(msg.createdAt)}</span>`;
    chatWinMessages.appendChild(el);
  }

  function scrollToBottom() {
    chatWinMessages.scrollTop = chatWinMessages.scrollHeight;
  }

  async function sendMessage() {
    const text = chatWinInput.value.trim();
    if (!text || !currentConvId) return;
    chatWinInput.value = '';
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      const data = await res.json();
      if (data.ok) {
        const emptyNotice = chatWinMessages.querySelector('[data-empty]');
        if (emptyNotice) chatWinMessages.innerHTML = '';
        appendMessage(data.message);
        scrollToBottom();
        lastMsgTs = new Date(data.message.createdAt).getTime();
      }
    } catch {}
  }

  function openCompose() {
    chatSearchInput.value = '';
    chatSearchResults.innerHTML = '';
    showEl(chatSearchOverlay);
    setTimeout(() => chatSearchInput.focus(), 200);
  }

  function closeCompose() {
    hideEl(chatSearchOverlay);
  }

  async function searchUsersForChat(query) {
    if (!query) { chatSearchResults.innerHTML = ''; return; }
    chatSearchResults.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">Searching...</div>';
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/search/users?q=${encodeURIComponent(query)}`);
      const users = await res.json();
      if (!users.length) {
        chatSearchResults.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">No users found.</div>';
        return;
      }
      chatSearchResults.innerHTML = '';
      users.forEach(u => {
        const el = document.createElement('div');
        el.className = 'chat-search-user-row';
        el.innerHTML = `
          <img src="${escapeHtml(u.photoUrl)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;">
          <div>
            <div style="font-weight:700;color:var(--text-primary);font-size:15px;">@${escapeHtml(u.username)}</div>
            <div style="font-size:12px;color:var(--text-subtle);">Tap to message</div>
          </div>
        `;
        el.onclick = () => { closeCompose(); startChatWith(u.username, u.photoUrl); };
        chatSearchResults.appendChild(el);
      });
    } catch {
      chatSearchResults.innerHTML = '<div style="padding:20px;color:var(--text-subtle);">Error loading users.</div>';
    }
  }

  async function startChatWith(username, photoUrl) {
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/conversations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otherUsername: username })
      });
      const data = await res.json();
      if (!data.ok) {
        showToast(data.error || 'Cannot start conversation.');
        return;
      }
      openConversation(data.conversation.id, username, photoUrl || 'https://i.imgflip.com/1ickup.jpg');
    } catch {
      showToast('Failed to open conversation.');
    }
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
    btn.onclick = (e) => {
      e.stopPropagation();
      const img = el.querySelector('img');
      openChatsView(username, img?.src);
    };
    el.style.position = 'relative';
    el.appendChild(btn);
  }

  const observer = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains('usr-search')) addMsgBtnToUserRow(node);
        node.querySelectorAll?.('.usr-search').forEach(addMsgBtnToUserRow);
      });
    });
  });

  function init() {
    const searchResults = document.getElementById('search-results');
    if (searchResults) observer.observe(searchResults, { childList: true, subtree: true });

    const messageBtn = document.getElementById('messageBtn');
    if (messageBtn) {
      messageBtn.onclick = function () {
        const username = document.getElementById('userProfileTag')?.textContent?.replace('@', '').trim();
        const photo = document.getElementById('userProfileImg')?.src;
        if (username) openChatsView(username, photo);
        else openChatsView();
      };
    }

    document.getElementById('chats-compose-btn')?.addEventListener('click', openCompose);
    document.getElementById('chat-win-back')?.addEventListener('click', closeChatWindow);
    document.getElementById('chat-search-back')?.addEventListener('click', closeCompose);
    document.getElementById('chat-win-send')?.addEventListener('click', sendMessage);
    chatWinInput?.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } });

    let searchTimer;
    chatSearchInput?.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => searchUsersForChat(chatSearchInput.value.trim()), 350);
    });

    const origOpenPanel = window.openPanel;
    if (origOpenPanel) {
      window.openPanel = function (name) {
        if (name === 'chat') { openChatsView(); return; }
        origOpenPanel(name);
      };
    }

    const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
    socket.on('dm_message', msg => {
      if (msg.conversationId === currentConvId) {
        appendMessage(msg);
        scrollToBottom();
        lastMsgTs = new Date(msg.createdAt).getTime();
      }
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.openChatsWithUser = openChatsView;
})();
