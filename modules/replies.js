const replyTextarea = document.getElementById('replyTextarea');
const replySubmitBtn = document.getElementById('replySubmit');
const rRepliesContainer = document.querySelector('.r-replies');
let replyPollingInterval = null;
let lastReplyTimestamp = 0;
let seenReplyIds = new Set();
let currentReplyPostId = null;

function renderReplyElement(reply) {
    const el = document.createElement('div');
    el.className = 'post';
    el.setAttribute('data-timestamp', reply.createdAt);
    const imgSrc = reply.photoUrl || 'https://i.imgflip.com/1ickup.jpg';
    const timeLabel = formatTimeAgo(reply.createdAt);
    
    el.innerHTML = `
        <div class="pt" data-reply-id="${reply.id}">
            <div class="pr-img"><img src="${imgSrc}"></div>
            <div>
                <span class="usr">${escapeHtml(reply.username)}</span>
                <span class="time">${timeLabel}</span>
                <div class="cnt">${escapeHtml(reply.text || '').replace(/\n/g,'<br>')}</div>
            </div>
        </div>
    `;
    return el;
}

async function openReplies(postId) {
    if (!postId) return;
    currentReplyPostId = postId;
    seenReplyIds = new Set();
    showView('replies');
    setTimeout(() => { replyTextarea?.focus(); }, 120);
    rRepliesContainer.innerHTML = '';
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/posts/${postId}/replies`);
        if (!res.ok) throw new Error('fail');
        const list = await res.json();
        if (!list.length) {
            rRepliesContainer.innerHTML = '<div style="padding:12px;color:gray" id="noReply">No replies yet. Be first!</div>';
        } else {
            list.forEach(rep => {
                rRepliesContainer.appendChild(renderReplyElement(rep));
                seenReplyIds.add(rep.id);
            });
            lastReplyTimestamp = new Date(list[list.length - 1].createdAt).getTime();
        }
    } catch (e) {
        rRepliesContainer.innerHTML = '<div style="padding:12px;color:gray">Failed to load replies</div>';
    }
    if (replyPollingInterval) clearInterval(replyPollingInterval);
    replyPollingInterval = setInterval(() => pollForNewReplies(postId), 1000);
}

async function pollForNewReplies(postId) {
    if (!postId || !document.getElementById('replies').classList.contains('active')) return;
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/posts/${postId}/replies?since=${lastReplyTimestamp}`);
        if (!res.ok) return;
        const replies = await res.json();
        const newReplies = replies.filter(rep => !seenReplyIds.has(rep.id));
        if (newReplies.length) {
            newReplies.forEach(reply => {
                rRepliesContainer.appendChild(renderReplyElement(reply));
                seenReplyIds.add(reply.id);
            });
            document.getElementById('noReply')?.remove();
            lastReplyTimestamp = new Date(newReplies[newReplies.length - 1].createdAt).getTime();
        }
    } catch (err) {}
}

document.addEventListener('click', function(e) {
    const btn = e.target.closest && e.target.closest('.reply');
    if (!btn) return;
    const pid = btn.getAttribute('data-post-id') || (btn.closest && btn.closest('[data-post-id]') && btn.closest('[data-post-id]').getAttribute('data-post-id'));
    if (pid) openReplies(pid);
    else alert('Replies for this post are not available until it is posted to server.');
});

async function submitReplyHandler(e) {
    e && e.preventDefault();
    if (!currentReplyPostId) { alert('No post selected'); return; }
    const text = (replyTextarea?.value || '').trim();
    const username = (document.getElementById('addUsername')?.textContent || '').trim() || 'user_tag';
    const displayName = document.querySelector('.p-name')?.textContent || username;
    const photoUrl = localStorage.getItem(`profilePhotoUrl_${username}`) || 'https://i.imgflip.com/1ickup.jpg';
    
    if (!text) { 
        replyTextarea?.focus(); 
        replyTextarea.style.borderColor = 'red'; 
        setTimeout(()=> replyTextarea.style.borderColor = '#ccc', 800); 
        return; 
    }
    
    const optimisticReply = { 
        id: 'temp-' + uid(), 
        username,
        displayName,
        text, 
        photoUrl,
        createdAt: new Date().toISOString() 
    };
    const optimisticEl = renderReplyElement(optimisticReply);
    optimisticEl.setAttribute('data-temp-reply', optimisticReply.id);
    rRepliesContainer.appendChild(optimisticEl);
    replyTextarea.value = '';
    document.getElementById('noReply')?.remove();
    
    try {
            replySubmitBtn.disabled = true; 
            const res = await fetchWithAuth(`${baseUrl}/api/posts/${currentReplyPostId}/replies`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, text })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || 'reply failed');
            
            document.querySelector(`[data-temp-reply="${optimisticReply.id}"]`)?.remove();
            seenReplyIds.add(json.reply.id);
            lastReplyTimestamp = Math.max(lastReplyTimestamp, new Date(json.reply.createdAt).getTime());
            
            setTimeout(() => {
                const existingReal = document.querySelector(`[data-reply-id="${json.reply.id}"]`);
                if (!existingReal) {
                    rRepliesContainer.appendChild(renderReplyElement(json.reply));
                }
            }, 300);
            
        } catch (err) {
            document.querySelector(`[data-temp-reply="${optimisticReply.id}"]`)?.remove();
            alert('Failed to send reply. Try again.');
        } finally {
            replySubmitBtn.disabled = false; 
        }
    }

replySubmitBtn && replySubmitBtn.addEventListener('click', submitReplyHandler);
replyTextarea && replyTextarea.addEventListener('keydown', function(e){ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitReplyHandler(e); });

let replySocket;
let profileSocket;

document.addEventListener('DOMContentLoaded', function() {
    if (typeof io !== 'undefined') {
        replySocket = io(baseUrl, { transports: ['websocket','polling'] });
        replySocket.on('reply_created', function(reply) {
            if (reply.postId && currentReplyPostId && reply.postId === currentReplyPostId && !seenReplyIds.has(reply.id)) {
                const existingReply = document.querySelector(`[data-reply-id="${reply.id}"]`);
                if (!existingReply) {
                    rRepliesContainer.appendChild(renderReplyElement(reply));
                    seenReplyIds.add(reply.id);
                    document.getElementById('noReply')?.remove();
                }
            }
        });
        
        profileSocket = io(baseUrl, { transports: ['websocket','polling'] });
        profileSocket.on('profile_updated', function(data) {
            const currentUsername = (document.getElementById('addUsername')?.value || 'user_tag').trim();
            
            updateAllProfilePhotos(data.username, data.photoUrl);
            
            if (data.username === currentUsername) {
                const profileImg = document.getElementById('profileImg');
                if (profileImg) profileImg.src = data.photoUrl;
                try {
                    localStorage.setItem(`profilePhotoUrl_${data.username}`, data.photoUrl);
                } catch(err) {}
            }
        });
    }
});

