const postBtn = document.getElementById('postSubmit');
const postsContainer = document.getElementById('posts');
const textarea = document.getElementById('postTextarea');
const postsMenuBtn = document.getElementById('posts-menu-btn');
const feedMenu = document.getElementById('feed-menu');
const currentFeedLabel = document.getElementById('current-feed-label');
const feedOptions = document.querySelectorAll('.feed-option');
const fileInput = document.getElementById('postFiles');
const filePreview = document.getElementById('filePreview');
let currentFeed = 'posts';
let selectedFiles = [];

const likedPostIds = new Set();
const likesCountMap = {};
const replyCountMap = {};

function formatLikeCount(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return n > 0 ? String(n) : '';
}

function animateLikeCount(wrap, newVal, direction) {
  if (wrap._lcTimeout) { clearTimeout(wrap._lcTimeout); wrap._lcTimeout = null; }
  wrap.querySelectorAll('.like-count').forEach((s, i) => { if (i > 0) { s.remove(); } else { s.className = 'like-count'; s.style.cssText = 'position:absolute;left:0;top:0;'; } });
  const old = wrap.querySelector('.like-count');
  if (!old) {
    const s = document.createElement('span');
    s.className = 'like-count';
    s.textContent = newVal;
    s.style.cssText = 'position:absolute;left:0;top:0;';
    wrap.appendChild(s);
    return;
  }
  if (old.textContent === String(newVal)) return;
  const neo = document.createElement('span');
  neo.className = 'like-count';
  neo.textContent = newVal;
  neo.style.cssText = 'position:absolute;left:0;top:0;';
  old.classList.add(direction === 'up' ? 'lc-down-out' : 'lc-up-out');
  neo.classList.add(direction === 'up' ? 'lc-down-in' : 'lc-up-in');
  wrap.appendChild(neo);
  wrap._lcTimeout = setTimeout(() => {
    old.remove();
    neo.classList.remove('lc-down-in', 'lc-up-in');
    wrap._lcTimeout = null;
  }, 220);
  setCountWrapSize(wrap, newVal);
}

function setCountWrapSize(wrap, text) {
  if (!text) {
    wrap.style.width = '0px';
    wrap.style.marginLeft = '0px';
  } else {
    const tmp = document.createElement('span');
    tmp.style.cssText = 'position:absolute;visibility:hidden;font-size:12px;white-space:nowrap;pointer-events:none;';
    tmp.textContent = text;
    document.body.appendChild(tmp);
    const w = tmp.getBoundingClientRect().width;
    tmp.remove();
    wrap.style.width = Math.ceil(w) + 'px';
    wrap.style.marginLeft = '4px';
  }
}

function setupLikeBtn(wrapper, postId) {
  const btn = wrapper.querySelector('.like-btn');
  if (!btn || !postId) return;
  if (btn.dataset.likeInit === postId) return;
  btn.dataset.likeInit = postId;
  let count = likesCountMap[postId] || 0;
  let pending = false;
  const countWrap = btn.querySelector('.like-count-wrap');
  const countSpan = btn.querySelector('.like-count');
  if (countSpan) countSpan.textContent = formatLikeCount(count);
  setCountWrapSize(countWrap, formatLikeCount(count));
  if (likedPostIds.has(postId)) btn.classList.add('liked');

  btn.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (pending) return;
    pending = true;
    btn.style.pointerEvents = 'none';
    const wasLiked = likedPostIds.has(postId);
    const newCount = wasLiked ? Math.max(0, count - 1) : count + 1;
    if (wasLiked) {
      likedPostIds.delete(postId);
      btn.classList.remove('liked');
      const hf = btn.querySelector('.heart-out');
      if (hf) { hf.classList.remove('heart-unpop'); void hf.offsetWidth; hf.classList.add('heart-unpop'); }
    } else {
      likedPostIds.add(postId);
      btn.classList.add('liked');
      const hf = btn.querySelector('.heart-fill');
      if (hf) { hf.classList.remove('heart-pop'); void hf.offsetWidth; hf.classList.add('heart-pop'); }
    }
    animateLikeCount(countWrap, formatLikeCount(newCount), wasLiked ? 'down' : 'up');
    count = newCount;
    likesCountMap[postId] = count;
    try {
      const res = await fetchWithAuth(`${baseUrl}/api/posts/${postId}/like`, { method: 'POST' });
      const json = await res.json();
      if (json.count !== count) {
        animateLikeCount(countWrap, formatLikeCount(json.count), json.count > count ? 'up' : 'down');
        count = json.count;
        likesCountMap[postId] = count;
      }
    } catch (_) {
      if (wasLiked) { likedPostIds.add(postId); btn.classList.add('liked'); }
      else { likedPostIds.delete(postId); btn.classList.remove('liked'); }
      animateLikeCount(countWrap, formatLikeCount(count), wasLiked ? 'up' : 'down');
    } finally {
      pending = false;
      btn.style.pointerEvents = '';
    }
  });
}

function setReplyCountWrapSize(wrap, text) {
  if (!text) {
    wrap.style.width = '0px';
    wrap.style.marginLeft = '0px';
  } else {
    const tmp = document.createElement('span');
    tmp.style.cssText = 'position:absolute;visibility:hidden;font-size:12px;white-space:nowrap;pointer-events:none;';
    tmp.textContent = text;
    document.body.appendChild(tmp);
    const w = tmp.getBoundingClientRect().width;
    tmp.remove();
    wrap.style.width = Math.ceil(w) + 'px';
    wrap.style.marginLeft = '4px';
  }
}

function animateReplyCount(wrap, newVal, direction) {
  if (wrap._rcTimeout) { clearTimeout(wrap._rcTimeout); wrap._rcTimeout = null; }
  wrap.querySelectorAll('.reply-count').forEach((s, i) => { if (i > 0) { s.remove(); } else { s.className = 'reply-count'; s.style.cssText = 'position:absolute;left:0;top:0;'; } });
  const old = wrap.querySelector('.reply-count');
  if (!old) {
    const s = document.createElement('span');
    s.className = 'reply-count';
    s.textContent = newVal;
    s.style.cssText = 'position:absolute;left:0;top:0;';
    wrap.appendChild(s);
    setReplyCountWrapSize(wrap, newVal);
    return;
  }
  if (old.textContent === String(newVal)) return;
  const neo = document.createElement('span');
  neo.className = 'reply-count';
  neo.textContent = newVal;
  neo.style.cssText = 'position:absolute;left:0;top:0;';
  old.classList.add(direction === 'up' ? 'lc-down-out' : 'lc-up-out');
  neo.classList.add(direction === 'up' ? 'lc-down-in' : 'lc-up-in');
  wrap.appendChild(neo);
  wrap._rcTimeout = setTimeout(() => {
    old.remove();
    neo.classList.remove('lc-down-in', 'lc-up-in');
    wrap._rcTimeout = null;
  }, 220);
  setReplyCountWrapSize(wrap, newVal);
}

async function loadLikesData() {
  try {
    const [bulkRes, myRes, repliesRes] = await Promise.all([
      fetch(`${baseUrl}/api/posts/likes-bulk`),
      fetchWithAuth(`${baseUrl}/api/posts/liked-by-me`),
      fetch(`${baseUrl}/api/posts/replies-bulk`)
    ]);
    if (repliesRes.ok) { const bulk = await repliesRes.json(); Object.assign(replyCountMap, bulk); }
    if (bulkRes.ok) { const bulk = await bulkRes.json(); Object.assign(likesCountMap, bulk); }
    if (myRes.ok) { const myLiked = await myRes.json(); myLiked.forEach(id => likedPostIds.add(id)); }
    document.querySelectorAll('[data-post-id]').forEach(wrapper => {
      const postId = wrapper.getAttribute('data-post-id');
      if (!postId) return;
      const btn = wrapper.querySelector('.like-btn');
      if (!btn) return;
      const c = likesCountMap[postId] || 0;
      const countSpan = btn.querySelector('.like-count');
      if (countSpan) countSpan.textContent = c > 0 ? c : '';
      const cw = btn.querySelector('.like-count-wrap');
      if (cw) setCountWrapSize(cw, c > 0 ? String(c) : '');
      const btn2 = wrapper.querySelector('.reply');
      const rc = btn2 && btn2.querySelector('.reply-count-wrap');
      if (rc) {
        const c2 = replyCountMap[postId] || 0;
        const span = rc.querySelector('.reply-count');
        if (span) span.textContent = c2 > 0 ? String(c2) : '';
        setReplyCountWrapSize(rc, c2 > 0 ? String(c2) : '');
      }
      if (likedPostIds.has(postId)) btn.classList.add('liked');
      else btn.classList.remove('liked');
    });
  } catch (_) {}
}

fileInput && fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const MAX_FILES = 6;
    const remaining = Math.max(0, MAX_FILES - selectedFiles.length);
    const toAdd = files.slice(0, remaining);
    toAdd.forEach(file => {
        const id = uid();
        const entry = { id, file, dataUrl: null };
        selectedFiles.push(entry);
        if (file.type.startsWith('image/')) {
            const fr = new FileReader();
            fr.onload = (ev) => { entry.dataUrl = ev.target.result; renderFilePreview(entry); };
            fr.readAsDataURL(file);
        } else {
            renderFilePreview(entry);
        }
    });
    fileInput.value = '';
});

function renderFilePreview(entry) {
    if (document.querySelector(`[data-file-id="${entry.id}"]`)) return;
    const el = document.createElement('div');
    el.className = 'fc';
    el.setAttribute('data-file-id', entry.id);
    if (entry.dataUrl) {
        const img = document.createElement('img');
        img.className = 'ft';
        img.src = entry.dataUrl;
        el.appendChild(img);
    } else {
        const ph = document.createElement('div');
        ph.className = 'ft';
        ph.style.cssText = 'display:flex;align-items:center;justify-content:center;';
        ph.textContent = entry.file.type.split('/')[0] || 'file';
        el.appendChild(ph);
    }
    const name = document.createElement('div');
    name.className = 'fn';
    name.textContent = entry.file.name;
    el.appendChild(name);
    const remove = document.createElement('div');
    remove.className = 'fr';
    remove.title = 'Remove';
    remove.innerHTML = '×';
    remove.addEventListener('click', () => removeFile(entry.id));
    el.appendChild(remove);
    filePreview.appendChild(el);
}

function removeFile(id) {
    selectedFiles = selectedFiles.filter(f => f.id !== id);
    const node = document.querySelector(`[data-file-id="${id}"]`);
    if (node) node.remove();
}

function createPostWrapper(username, displayName, contentHtml, files, timeLabel, photoUrl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post';
    const imgSrc = photoUrl || 'https://i.imgflip.com/1ickup.jpg';

    let filesHtml = '';
    if (files && files.length) {
        const imgs = files.filter(f => (f.dataUrl || f.url) && (f.file ? f.file.type : f.mime).startsWith('image/'));
        const others = files.filter(f => !((f.dataUrl || f.url) && (f.file ? f.file.type : f.mime).startsWith('image/')));
        if (imgs.length) {
            filesHtml += '<div class="post-images" style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">';
            imgs.forEach(f => {
                const src = f.dataUrl || f.url;
                filesHtml += `<img src="${src}" style="width:80%;border-radius:8px;object-fit:cover;max-width:500px;"/>`;
            });
            filesHtml += '</div>';
        }
        if (others.length) {
            filesHtml += '<div class="post-files" style="margin-top:8px">';
            others.forEach(f => {
                let url;
                if (f.url) { url = f.url; }
                else if (f.file) { url = URL.createObjectURL(f.file); setTimeout(() => URL.revokeObjectURL(url), 60000); }
                else { return; }
                const fname = f.file ? f.file.name : f.originalName || '';
                filesHtml += `<div><a href="${url}" download="${escapeHtml(fname)}">${escapeHtml(fname)}</a></div>`;
            });
            filesHtml += '</div>';
        }
    }

    wrapper.innerHTML = `
        <div class="pt" data-username="${escapeHtml(username)}">
            <div class="pr-img" data-username="${escapeHtml(username)}">
                <img src="${imgSrc}" alt="${escapeHtml(username)} profile image">
            </div>
            <div style="display:block;">
                <span class="usr usr-post" data-username="${escapeHtml(username)}">${escapeHtml(username)}</span>
                <span class="time">${timeLabel}</span>
                <div class="cnt">${contentHtml}</div>
                ${filesHtml}
                <div class="re">
                    <button class="like-btn">
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" class="heart-out"><path d="M441.88-148.52q-17.69-7.11-33.9-21.05l-72.33-66.32q-104.24-93-189.62-188.48-85.38-95.48-85.38-216.43 0-101.65 69.7-169.98 69.7-68.33 172.16-68.33 56.49 0 101.65 21.81 45.17 21.8 75.6 49.52 32.44-27.72 76.86-49.52 44.42-21.81 100.07-21.81 102.57 0 172.73 68.33 70.17 68.33 70.17 169.98 0 120.95-86.24 216.05-86.24 95.1-187.96 187.34l-73.56 68.04q-16.24 14-34.06 20.98-17.81 6.98-38.01 6.98-20.19 0-37.88-7.11Zm-8.12-544.13q-12.24-29.48-49.51-55.38-37.26-25.9-81.11-25.9-58.96 0-98.14 37.28-39.17 37.28-39.17 96.48 0 51.67 36.04 107.52 36.05 55.85 86.42 110.25Q338.66-368.01 392-322.04q53.33 45.97 87.76 76.45 34.52-30.76 87.97-76.81 53.45-46.06 103.81-100.19 50.35-54.13 86.61-110.03t36.26-107.68q0-59.07-39.45-96.35-39.45-37.28-98.32-37.28-44.06 0-82.23 25.9T525-692.65q-6.31 14-18.67 21-12.36 7-26.19 7-13.66 0-26.39-7-12.74-7-19.99-21ZM480-509.76Z"/></svg>
                        <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor" class="heart-fill"><path d="M444.5-151.5Q428-158 413-171l-74-68q-104-93-189.5-188T64-642q0-100 69-167t170-67q57 0 102.5 23t74.5 50q31-27 75.5-50T657-876q101 0 170 67t69 167q0 120-86 214.5T623-241l-76 70q-15 13-31.5 19.5T480-145q-19 0-35.5-6.5Z"/></svg>
                        <div class="like-count-wrap"><span class="like-count"></span></div>
                    </button>
                    <button class="reply" onclick="showView('replies')"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="m309.04-458.17 73.31 73.3q15.72 15.72 15.83 37.77.12 22.06-15.59 37.49-15.96 15.72-37.51 14.72-21.56-1-36.51-15.96L145.28-474.13q-15.95-15.59-15.95-36.57 0-20.97 15.95-36.93l164.05-164.04q16.19-15.96 36.91-15.96 20.72 0 36.35 15.96 15.71 14.86 16.21 36.46t-15.45 37.32l-74.31 74.54h331.2q87.11 0 149.11 61.62 62 61.62 62 149.49v125q0 21.97-15.25 37.28-15.24 15.31-37.01 15.31-21.76 0-37.34-15.31-15.58-15.31-15.58-37.28v-125q0-44.56-31.18-75.25-31.19-30.68-74.75-30.68h-331.2Z"/></svg><div class="reply-count-wrap"><span class="reply-count"></span></div></button>
                    <button class="send"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M775.33-434.41 189.72-198.37q-25.92 10.96-48.85-4.74-22.94-15.69-22.94-43.37v-472.09q0-27.67 22.94-43.36 22.93-15.7 48.85-4.98l585.61 236.04q32.15 12.96 32.15 48.35t-32.15 48.11ZM205.67-300.83l453.72-182.69-453.72-182.46v103.59l231.68 78.87-231.68 79.11v103.58Zm0 0v-365.15 365.15Z"/></svg></button>
                </div>
            </div>
        </div>
    `;

    const ptEl = wrapper.querySelector('.pt');
    let _holdTimer = null;
    ptEl.addEventListener('pointerdown', e => {
        if (e.button !== 0 && e.button !== undefined) return;
        _holdTimer = setTimeout(() => {
            ptEl.classList.add('pt-holding');
            openPostCtx(e.clientX, e.clientY, { username, wrapper });
            setTimeout(() => ptEl.classList.remove('pt-holding'), 200);
        }, 450);
    });
    const _endHold = () => { clearTimeout(_holdTimer); _holdTimer = null; ptEl.classList.remove('pt-holding'); };
    ptEl.addEventListener('pointerup', _endHold);
    ptEl.addEventListener('pointercancel', _endHold);
    ptEl.addEventListener('pointermove', e => { if (_holdTimer && (Math.abs(e.movementX) > 6 || Math.abs(e.movementY) > 6)) _endHold(); });
    return wrapper;
}

function buildPostElement(username, displayName, contentHtml, files, photoUrl) {
    return createPostWrapper(username, displayName, contentHtml, files, timeLabelForNow(), photoUrl);
}

const ADS = false;
let adConfig = null;
let adScriptLoaded = false;

function waitForAdsense(callback) {
    if (adScriptLoaded && window.adsbygoogle) { callback(); }
    else { setTimeout(() => waitForAdsense(callback), 300); }
}

async function loadAdConfig() {
    if (adConfig) return adConfig;
    try {
        const res = await fetch(baseUrl + '/api/ads/config');
        adConfig = await res.json();
        if (adConfig.publisherId) {
            const existing = document.querySelector(`script[src*="adsbygoogle"]`);
            if (!existing) {
                const script = document.createElement('script');
                script.async = true;
                script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adConfig.publisherId}`;
                script.crossOrigin = 'anonymous';
                script.onload = () => { adScriptLoaded = true; };
                script.onerror = () => { adScriptLoaded = true; };
                document.head.appendChild(script);
            } else { adScriptLoaded = true; }
        }
    } catch (e) { adConfig = { publisherId: '', slot: '' }; }
    return adConfig;
}

function createAdPost(slotId, publisherId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post';
    wrapper.setAttribute('data-ad', 'true');
    wrapper.innerHTML = `
        <div class="pt" style="flex-direction:column;padding:10px 12px 12px 12px;">
            <span style="font-size:10px;color:var(--text-subtle);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:8px;align-self:flex-start;">Sponsored</span>
            <ins class="adsbygoogle" style="display:block;border-radius:12px;overflow:hidden;width:100%;"
                 data-ad-client="${publisherId}" data-ad-slot="${slotId}"
                 data-ad-format="auto" data-full-width-responsive="true"></ins>
        </div>`;
    waitForAdsense(() => { try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {} });
    return wrapper;
}

function injectAdsIntoPosts(posts, config) {
    if (!ADS) return;
    if (!config.publisherId || !config.slot) return;
    const children = Array.from(postsContainer.children).filter(el => !el.getAttribute('data-ad'));
    const total = children.length;
    if (total < 3) return;
    const pos = Math.floor(total / 2);
    const referenceEl = children[pos];
    if (referenceEl) postsContainer.insertBefore(createAdPost(config.slot, config.publisherId), referenceEl);
}

function addPostToUIFromServer(post) {
    if (currentFeed !== 'posts') return;
    if (document.querySelector(`[data-post-id="${post.id}"]`)) return;

    const timeLabel = post.createdAt ? formatTimeAgo(post.createdAt) : timeLabelForNow();
    if (post.tempId) {
        const existing = document.querySelector(`[data-temp-id="${post.tempId}"]`);
        if (existing) {
            existing.setAttribute('data-post-id', post.id);
            existing.setAttribute('data-timestamp', post.createdAt);
            existing.removeAttribute('data-temp-id');
            existing.querySelectorAll('.reply').forEach(b => b.setAttribute('data-post-id', post.id));
            setupLikeBtn(existing, post.id);
            seenPostIds.add(post.id);
            lastTimestamp = Math.max(lastTimestamp, new Date(post.createdAt).getTime());
            setTimeout(() => {
                if (typeof spInitAllParticleSpans === 'function') spInitAllParticleSpans();
                if (typeof spInitAllPixelSpans === 'function') spInitAllPixelSpans();
            }, 100);
            return;
        }
    }

    const noPostsMsg = postsContainer.querySelector('div[style*="No posts yet"]');
    if (noPostsMsg) postsContainer.innerHTML = '';

    const wrapper = createPostWrapper(post.username, post.displayName, post.text || '', post.files || [], timeLabel, post.photoUrl);
    wrapper.setAttribute('data-post-id', post.id);
    wrapper.setAttribute('data-timestamp', post.createdAt);
    wrapper.querySelectorAll('.reply').forEach(b => b.setAttribute('data-post-id', post.id));
    setupLikeBtn(wrapper, post.id);
    postsContainer.prepend(wrapper);
    lastTimestamp = Math.max(lastTimestamp, new Date(post.createdAt).getTime());
    setTimeout(() => {
        if (typeof spInitAllParticleSpans === 'function') spInitAllParticleSpans();
        if (typeof spInitAllPixelSpans === 'function') spInitAllPixelSpans();
    }, 100);
}

function replacePostButtonListener(newHandler) {
    const old = document.getElementById('postSubmit');
    if (!old) return;
    const clone = old.cloneNode(true);
    clone.setAttribute('type', 'button');
    old.parentNode.replaceChild(clone, old);
    window.postBtnNode = clone;
    clone.addEventListener('click', newHandler);
}

let lastTimestamp = 0;
const seenPostIds = new Set();

async function loadInitialPostsFromServer() {
    if (!baseUrl) return;
    try {
        const [res, config] = await Promise.all([fetch(baseUrl + '/api/posts'), loadAdConfig()]);
        if (!res.ok) throw new Error('failed to load posts');
        const list = await res.json();
        list.slice().reverse().forEach(p => { seenPostIds.add(p.id); addPostToUIFromServer(p); });
        if (list.length) lastTimestamp = new Date(list[0].createdAt).getTime();
        injectAdsIntoPosts(list, config);
        await loadLikesData();
        setTimeout(() => {
            if (typeof spInitAllParticleSpans === 'function') spInitAllParticleSpans();
            if (typeof spInitAllPixelSpans === 'function') spInitAllPixelSpans();
        }, 300);
    } catch (err) {}
}

async function pollForNewPosts() {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/posts?since=${lastTimestamp}`);
        if (!res.ok) return;
        const newPosts = await res.json();
        newPosts.forEach(post => {
            if (!seenPostIds.has(post.id)) { seenPostIds.add(post.id); addPostToUIFromServer(post); }
        });
    } catch (err) {}
}

async function submitPostToServerHandler(e) {
    e.preventDefault();
    e.stopPropagation();

    const rawText = document.getElementById('postTextarea')?.value || '';
    const username = (document.getElementById('addUsername')?.textContent || '').trim() || 'user_tag';
    const displayName = document.querySelector('.p-name')?.textContent || username;
    const selected = selectedFiles || [];

    const spoilerData = (typeof spGetContentForPost === 'function') ? spGetContentForPost() : null;
    const contentHtml = spoilerData ? spoilerData.html : escapeHtml(rawText).replace(/\n/g, '<br>');
    let movieHtml = '';
    const attachedMovie = window.postAttachedMovie || null;
    if (attachedMovie) {
        const mTitle = attachedMovie.title || attachedMovie.name || '';
        const mYear = (attachedMovie.release_date || attachedMovie.first_air_date || '').split('-')[0];
        const mPoster = 'https://image.tmdb.org/t/p/w200' + attachedMovie.poster_path;
        movieHtml = `
            <div style="display:flex;align-items:center;gap:12px;margin-top:10px;padding:10px 12px;background:rgba(255,255,255,0.05);border-radius:14px;border:1.5px solid rgba(255,255,255,0.08);">
                <img src="${mPoster}" style="width:42px;height:60px;object-fit:cover;border-radius:8px;flex-shrink:0;">
                <div style="flex:1;min-width:0;">
                    <div style="font-weight:700;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(mTitle)}</div>
                    <div style="font-size:12px;opacity:0.45;margin-top:3px;">${escapeHtml(mYear)}</div>
                </div>
            </div>`;
    }
    const hasContent = rawText.trim() !== '' || (spoilerData && spoilerData.html) || selected.length > 0;
    if (!hasContent) {
        const ta = document.getElementById('postTextarea');
        if (ta) { ta.focus(); ta.style.borderColor = 'red'; setTimeout(() => ta.style.borderColor = '#ccc', 900); }
        return;
    }

    const tempId = uid();
    const currentPhotoUrl = localStorage.getItem(`profilePhotoUrl_${username}`) || 'https://i.imgflip.com/1ickup.jpg';
    const filesForPost = selected.map(f => ({ ...f }));

    if (currentFeed === 'posts') {
        const noPostsMsg = postsContainer.querySelector('div[style*="No posts yet"]');
        if (noPostsMsg) postsContainer.innerHTML = '';
        const optimisticPostEl = buildPostElement(username, displayName, contentHtml + movieHtml, filesForPost, currentPhotoUrl);
        optimisticPostEl.setAttribute('data-temp-id', tempId);
        postsContainer.prepend(optimisticPostEl);
        setTimeout(() => {
            if (typeof spInitAllParticleSpans === 'function') spInitAllParticleSpans();
            if (typeof spInitAllPixelSpans === 'function') spInitAllPixelSpans();
        }, 100);
    }

    const ta = document.getElementById('postTextarea');
    if (ta) ta.value = '';
    const fp = document.getElementById('filePreview');
    if (fp) fp.innerHTML = '';
    const fi = document.getElementById('postFiles');
    if (fi) fi.value = '';
    selectedFiles = [];
    if (window.postAttachedMovie) {
        window.postAttachedMovie = null;
        const prev = document.getElementById('postMoviePreview');
        if (prev) { prev.style.display = 'none'; prev.innerHTML = ''; }
        const btn = document.getElementById('addMovieBtn');
        if (btn) btn.classList.remove('active');
    }
    if (typeof spResetComposeState === 'function') spResetComposeState();
    if (typeof closeAdd === 'function') closeAdd();

    showView('pos-t');

    const fd = new FormData();
    fd.append('username', username);
    fd.append('text', spoilerData ? spoilerData.html : rawText);
    fd.append('tempId', tempId);
    selected.forEach((f) => fd.append('files', f.file, f.file.name));

    try {
        const btn = document.getElementById('postSubmit');
        if (btn) { btn.disabled = true; btn.textContent = 'Posting...'; }
        const res = await fetchWithAuth(baseUrl + '/api/posts', { method: 'POST', body: fd });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'upload failed');
        if (currentFeed === 'posts') {
            const optimisticEl = document.querySelector(`[data-temp-id="${tempId}"]`);
            if (optimisticEl && json.id) {
                optimisticEl.setAttribute('data-post-id', json.id);
                optimisticEl.removeAttribute('data-temp-id');
                optimisticEl.querySelectorAll('.reply').forEach(b => b.setAttribute('data-post-id', json.id));
                setupLikeBtn(optimisticEl, json.id);
                seenPostIds.add(json.id);
            }
        }
    } catch (err) {
        console.error('Post error:', err);
        if (currentFeed === 'posts') {
            const optimisticEl = document.querySelector(`[data-temp-id="${tempId}"]`);
            if (optimisticEl) optimisticEl.remove();
        }
        alert('Failed to post. Please try again.');
        if (ta) ta.value = rawText;
        selectedFiles = filesForPost;
        filesForPost.forEach(entry => renderFilePreview(entry));
        showView('add');
    } finally {
        const btn = document.getElementById('postSubmit');
        if (btn) { btn.disabled = false; btn.textContent = 'Post'; }
    }
}

function updateAllProfilePhotos(username, photoUrl) {
    document.querySelectorAll('.post').forEach(postEl => {
        const usernameSpan = postEl.querySelector('.usr');
        if (usernameSpan && usernameSpan.textContent.trim() === username) {
            const img = postEl.querySelector('.pr-img img');
            if (img) img.src = photoUrl;
        }
    });
}

function initSocket() {
    if (!baseUrl || typeof io === 'undefined') return;
    try {
        const socket = io(baseUrl, { transports: ['websocket', 'polling'] });
        socket.on('connect', () => console.log('Socket connected'));
        socket.on('post_created', (post) => {
            if (!seenPostIds.has(post.id)) { seenPostIds.add(post.id); addPostToUIFromServer(post); }
        });
        socket.on('post_deleted', ({ postId }) => {
            const el = document.querySelector(`[data-post-id="${postId}"]`);
            if (el) el.remove();
        });
        socket.on('post_liked', ({ postId, count }) => {
            if (likesCountMap[postId] === count) return;
            document.querySelectorAll(`.post[data-post-id="${postId}"]`).forEach(wrapper => {
                const btn = wrapper.querySelector('.like-btn');
                if (!btn) return;
                const countWrap = btn.querySelector('.like-count-wrap');
                const current = parseInt(btn.querySelector('.like-count')?.textContent) || 0;
                animateLikeCount(countWrap, formatLikeCount(count), count > current ? 'up' : 'down');
                likesCountMap[postId] = count;
            });
        });
        socket.on('reply_created', ({ postId }) => {
            replyCountMap[postId] = (replyCountMap[postId] || 0) + 1;
            document.querySelectorAll(`.post[data-post-id="${postId}"]`).forEach(wrapper => {
                const replyBtn = wrapper.querySelector('.reply');
                const rcWrap = replyBtn && replyBtn.querySelector('.reply-count-wrap');
                if (rcWrap) animateReplyCount(rcWrap, String(replyCountMap[postId]), 'up');
            });
        });
    } catch (err) { console.error('Socket initialization error:', err); }
}

async function createReviewPost(review) {
    const reviewPost = document.createElement('div');
    reviewPost.className = 'post';

    let movieInfo = '';
    try {
        const numericId = review.movieId.includes('-') ? review.movieId.split('-').pop() : review.movieId;
        const movieRes = await fetch(`${baseUrl}/api/tmdb/movie/${numericId}`, { headers: ngrokHeaders });
        if (movieRes.ok) {
            const movie = await movieRes.json();
            const posterUrl = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
            movieInfo = `
                <div class="review-movie-info" data-movie-id="${numericId}" style="margin-top:12px;padding:12px;background:var(--iconbox-bg);border-radius:12px;display:flex;gap:12px;cursor:pointer;transition:background 0.2s;">
                    ${posterUrl ? `<img src="${posterUrl}" style="width:60px;height:90px;border-radius:8px;object-fit:cover;">` : ''}
                    <div style="flex:1;">
                        <div style="font-weight:600;font-size:15px;margin-bottom:4px;">${escapeHtml(movie.title)}</div>
                        <div style="font-size:12px;color:var(--text-subtle);">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'} • ⭐ ${movie.vote_average.toFixed(1)}</div>
                    </div>
                </div>`;
        }
    } catch (err) { console.error('Failed to fetch movie info:', err); }

    reviewPost.innerHTML = `
        <div class="pt">
            <div class="pr-img"><img src="${review.photoUrl}"></div>
            <div style="display:block;width:100%;">
                <span class="usr">${escapeHtml(review.username)}</span>
                <span class="time">${formatTimeAgo(review.createdAt)}</span>
                <div class="cnt">
                    <div style="color:#ffc107;margin-bottom:8px;font-size:18px;">${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}</div>
                    ${review.text ? `<div style="margin-bottom:8px;">${escapeHtml(review.text)}</div>` : ''}
                    ${movieInfo}
                </div>
            </div>
        </div>`;

    const movieInfoEl = reviewPost.querySelector('.review-movie-info');
    if (movieInfoEl) {
        movieInfoEl.addEventListener('mouseenter', function() { this.style.background = 'var(--nav-active-bg)'; });
        movieInfoEl.addEventListener('mouseleave', function() { this.style.background = 'var(--iconbox-bg)'; });
        movieInfoEl.addEventListener('click', async function() {
            const movieId = this.getAttribute('data-movie-id');
            showView('finder');
            try {
                const res = await fetch(`${baseUrl}/api/tmdb/movie/${movieId}`, { headers: ngrokHeaders });
                if (res.ok) { const movie = await res.json(); showDetails(movie); }
            } catch (err) { console.error('Failed to open movie:', err); }
        });
    }
    return reviewPost;
}

postsMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    feedMenu.style.display = feedMenu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if (!postsMenuBtn.contains(e.target) && !feedMenu.contains(e.target)) feedMenu.style.display = 'none';
});

feedOptions.forEach(option => {
    option.addEventListener('click', async () => {
        const selectedFeed = option.getAttribute('data-feed');
        if (currentFeed === selectedFeed) { feedMenu.style.display = 'none'; return; }
        currentFeed = selectedFeed;
        currentFeedLabel.textContent = option.textContent;
        feedOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        feedMenu.style.display = 'none';
        const postsContainer = document.getElementById('posts');
        postsContainer.classList.add('feed-transition');
        await new Promise(resolve => setTimeout(resolve, 200));
        await filterPostsByFeed(selectedFeed);
        postsContainer.classList.remove('feed-transition');
    });
});

async function filterPostsByFeed(feedType) {
    const postsContainer = document.getElementById('posts');
    postsContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-subtle);">Loading...</div>';
    if (feedType === 'posts') {
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/posts`);
            if (!res.ok) throw new Error('Failed to load posts');
            const list = await res.json();
            postsContainer.innerHTML = '';
            list.slice().reverse().forEach(p => addPostToUIFromServer(p));
            if (list.length === 0) postsContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-subtle);">No posts yet</div>';
        } catch (err) { postsContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-subtle);">Failed to load posts</div>'; }
    } else if (feedType === 'friends') {
        postsContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-subtle);">Friends feed coming soon...</div>';
    } else if (feedType === 'reviews') {
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/reviews/all`);
            if (!res.ok) throw new Error('Failed to load reviews');
            const allReviews = await res.json();
            postsContainer.innerHTML = '';
            for (const review of allReviews) postsContainer.appendChild(await createReviewPost(review));
            if (allReviews.length === 0) postsContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-subtle);">No reviews yet</div>';
        } catch (err) { postsContainer.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-subtle);">Failed to load reviews</div>'; }
    }
}

if (baseUrl) {
    replacePostButtonListener(submitPostToServerHandler);
    loadInitialPostsFromServer();
    initSocket();
    setInterval(pollForNewPosts, 5000);
    textarea && textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submitPostToServerHandler(e);
    });
}
feedOptions[0]?.classList.add('active');

let _ctxPost = null;
let _ctxToastTimer = null;

function openPostCtx(cx, cy, data) {
    _ctxPost = data;
    const me = (document.getElementById('addUsername')?.textContent || '').trim();
    const isOwn = data.username === me;
    const menu = document.getElementById('post-ctx-menu');
    menu.innerHTML = isOwn ? `
        <button class="post-ctx-item danger" onclick="postCtxAction('delete')">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M299-98q-53.7 0-90.85-37.15Q171-172.3 171-226v-461h-12q-26.3 0-44.65-18.29Q96-723.58 96-750.29T114.35-796q18.35-19 44.65-19h201v-12q0-25.3 17.85-43.65Q395.7-889 422-889h114q26.3 0 44.65 18.35Q599-852.3 599-827v12h202q27.3 0 45.65 18.79Q865-777.42 865-750.71t-18.35 45.21Q828.3-687 801-687h-12v460.57Q789-172 751.85-135 714.7-98 661-98H299Zm148.5-204.35Q463-317.7 463-339v-235q0-21.3-15.29-36.65Q432.42-626 411.21-626T374-610.65Q358-595.3 358-574v235q0 21.3 15.79 36.65 15.79 15.35 37 15.35t36.71-15.35Zm140 0Q603-317.7 603-339v-235q0-21.3-15.29-36.65Q572.42-626 551.21-626T514-610.65Q498-595.3 498-574v235q0 21.3 15.79 36.65 15.79 15.35 37 15.35t36.71-15.35Z"/></svg>
            Delete post
        </button>` : `
        <button class="post-ctx-item" onclick="postCtxAction('message')">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="m204-200-44.88 44.88Q129-125 89.5-140.91 50-156.81 50-200v-587q0-54.1 36.95-91.05Q123.9-915 178-915h604q54.1 0 91.05 36.95Q910-841.1 910-787v459q0 54.1-36.95 91.05Q836.1-200 782-200H204Zm138-321.78q15-14.78 15-35.5T342.22-593q-14.78-15-35.5-15T271-593.22q-15 14.78-15 35.5T270.78-522q14.78 15 35.5 15T342-521.78Zm173.5 0q14.5-14.78 14.5-35.5T515.71-593q-14.29-15-35.5-15t-35.71 14.78q-14.5 14.78-14.5 35.5T444.29-522q14.29 15 35.5 15t35.71-14.78Zm173.5 0q15-14.78 15-35.5T689.22-593q-14.78-15-35.5-15T618-593.22q-15 14.78-15 35.5T617.78-522q14.78 15 35.5 15T689-521.78Z"/></svg>
            Message @${data.username}
        </button>
        <div class="post-ctx-sep"></div>
        <button class="post-ctx-item danger" onclick="postCtxAction('report')">
            <svg xmlns="http://www.w3.org/2000/svg" height="16px" viewBox="0 -960 960 960" width="16px" fill="currentColor"><path d="M479.61-270Q503-270 519-285.61q16-15.62 16-39Q535-348 519.39-364q-15.62-16-39-16-22.39 0-38.89 15.61-16.5 15.62-16.5 39Q425-302 441.11-286q16.12 16 38.5 16Zm34.89-151.35Q529-435.7 529-456v-189q0-20.3-14.29-34.65Q500.42-694 480.21-694t-34.71 13.85Q431-666.3 431-645v189q0 19.3 14.29 34.15Q459.58-407 479.79-407t34.71-14.35ZM375-98q-25.65 0-48.96-9.09Q302.73-116.17 284-136L136-285q-18.87-17.91-28.43-41.74Q98-350.57 98-376v-209q0-25.65 9.09-48.96Q116.17-657.27 136-676l148-148q18.73-19.83 42.04-28.91Q349.35-862 375-862h210q25.65 0 48.96 9.09Q657.27-843.83 676-824l148 148q19.83 18.73 28.91 42.04Q862-610.65 862-585v210q0 25.65-9.09 48.96Q843.83-302.73 824-284L675-136q-17.91 18.87-41.74 28.43Q609.43-98 584-98H375Z"/></svg>
            Report
        </button>`;
    const mw = 200, mh = 120;
    let x = cx - mw / 2, y = cy - mh / 2;
    if (x < 8) x = 8;
    if (x + mw > window.innerWidth - 8) x = window.innerWidth - mw - 8;
    if (y < 8) y = 8;
    if (y + mh > window.innerHeight - 8) y = window.innerHeight - mh - 8;
    menu.style.cssText = `display:block;left:${x}px;top:${y}px;--origin:center center`;
    document.getElementById('post-ctx-backdrop').style.display = 'block';
}

function closePostCtx() {
    document.getElementById('post-ctx-menu').style.display = 'none';
    document.getElementById('post-ctx-backdrop').style.display = 'none';
    _ctxPost = null;
}

async function postCtxAction(type) {
    const data = _ctxPost;
    closePostCtx();
    if (!data) return;
    if (type === 'delete') {
        const postId = data.wrapper.getAttribute('data-post-id');
        if (!postId) { data.wrapper.remove(); return; }
        data.wrapper.style.cssText = 'transition:opacity .2s,transform .2s;opacity:0;transform:scale(0.97)';
        setTimeout(() => data.wrapper.remove(), 200);
        try { await fetchWithAuth(`${baseUrl}/api/posts/${postId}`, { method: 'DELETE' }); } catch (e) {}
        showPostCtxToast('Post deleted');
    } else if (type === 'message') {
        showPostCtxToast('Message @' + data.username);
    } else if (type === 'report') {
        showPostCtxToast('Reported @' + data.username);
    }
}

function showPostCtxToast(msg) {
    clearTimeout(_ctxToastTimer);
    const old = document.querySelector('.post-ctx-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'post-ctx-toast';
    t.textContent = msg;
    document.body.appendChild(t);
    _ctxToastTimer = setTimeout(() => {
        t.classList.add('hide');
        t.addEventListener('animationend', () => t.remove(), { once: true });
    }, 1800);
}
