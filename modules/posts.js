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
            fr.onload = (ev) => {
                entry.dataUrl = ev.target.result;
                renderFilePreview(entry);
            };
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
        ph.style.display = 'flex';
        ph.style.alignItems = 'center';
        ph.style.justifyContent = 'center';
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
function createPostWrapper(username, displayName, content, files, timeLabel, photoUrl) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post';
    const safeContent = escapeHtml(content).replace(/\n/g, '<br>');
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
                if (f.url) {
                    url = f.url;
                } else if (f.file) {
                    url = URL.createObjectURL(f.file);
                    setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
                } else {
                    return;
                }
                const name = f.file ? f.file.name : f.originalName || '';
                filesHtml += `<div><a href="${url}" download="${escapeHtml(name)}">${escapeHtml(name)}</a></div>`;
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
            <div class="cnt">${safeContent}</div>
            ${filesHtml}
            <div class="re">
                <button class="like"><svg xmlns="http://www.w3.org/2000/svg" height="21px" viewBox="0 -960 960 960" width="21px" fill="#666666"><path d="M480-170q-13 0-25.5-4.5T431-189l-59-54q-109-97-192.5-189.5T96-634q0-88.02 59.85-147.01Q215.7-840 305-840q51.2 0 96.6 21.5Q447-797 480-757q35-40 79.66-61.5t95.02-21.5Q744-840 804-781.01T864-634q0 109-83.5 201.5T588-243l-59 54q-11 10-23.5 14.5T480-170Zm-34-512q-24-41-60-63.5T305-768q-58.71 0-97.86 38Q168-692 168-633.61 168-583 204-527t86 109.5Q340-364 393-318t87 76q34-30 87-76t103-99.5Q720-471 756-527t36-106.61Q792-692 752.86-730q-39.15-38-97.86-38-45 0-81.5 22.5T513-682q-5 10-14.05 14.5t-19 4.5q-9.95 0-19.45-4.5T446-682Zm34 177Z"/></svg></button>
                <button class="reply" onclick="showView('replies')"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#666666"><path d="m282-474 98 98q11 11 11 25.5t-11 25.98Q369-314 354.5-314T329-325L169-485q-11-10.64-11-24.82T169-535l160-160q11-11 25.67-11 14.66 0 25.33 11 11 10.67 11 25.33Q391-655 380-644l-98 98h342q79.68 0 135.84 56.16T816-354v108q0 15.3-10.29 25.65Q795.42-210 780.21-210t-25.71-10.35Q744-230.7 744-246v-108q0-50-35-85t-85-35H282Z"/></svg></button>
                <button class="send"><svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#666666"><path d="M780-447 193-212q-18 7-33.5-3.5T144-245v-470q0-19 15.5-29.5T193-748l587 235q23 9 23 33t-23 33ZM216-299l454-181-454-181v109l216 72-216 72v109Zm0 0v-362 362Z"/></svg></button>
            </div>
        </div></div>
    `;
    return wrapper;
}
function buildPostElement(username, displayName, content, files, photoUrl) {
    return createPostWrapper(username, displayName, content, files, timeLabelForNow(), photoUrl);
}

const ADS = false;

let adConfig = null;
let adScriptLoaded = false;

function waitForAdsense(callback) {
    if (adScriptLoaded && window.adsbygoogle) {
        callback();
    } else {
        setTimeout(() => waitForAdsense(callback), 300);
    }
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
            } else {
                adScriptLoaded = true;
            }
        }
    } catch (e) { adConfig = { publisherId: '', slot: '' }; }
    return adConfig;
}

function createAdPost(slotId, publisherId) {
    const wrapper = document.createElement('div');
    wrapper.className = 'post';
    wrapper.setAttribute('data-ad', 'true');
    wrapper.innerHTML = `
        <div class="pt" style="flex-direction:column; padding: 10px 12px 12px 12px;">
            <span style="font-size:10px; color:var(--text-subtle); text-transform:uppercase;
                letter-spacing:0.6px; margin-bottom:8px; align-self:flex-start;">Sponsored</span>
            <ins class="adsbygoogle"
                 style="display:block; border-radius:12px; overflow:hidden; width:100%;"
                 data-ad-client="${publisherId}"
                 data-ad-slot="${slotId}"
                 data-ad-format="auto"
                 data-full-width-responsive="true"></ins>
        </div>
    `;
    waitForAdsense(() => {
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch(e) {}
    });
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
    if (referenceEl) {
        postsContainer.insertBefore(createAdPost(config.slot, config.publisherId), referenceEl);
    }
}

function addPostToUIFromServer(post) {
    if (currentFeed !== 'posts') {
        return;
    }
    
    if (document.querySelector(`[data-post-id="${post.id}"]`)) {
        return;
    }
    
    const timeLabel = post.createdAt ? formatTimeAgo(post.createdAt) : timeLabelForNow();
    if (post.tempId) {
        const existing = document.querySelector(`[data-temp-id="${post.tempId}"]`);
        if (existing) {
            const newWrapper = createPostWrapper(post.username, post.displayName, post.text, post.files, timeLabel, post.photoUrl);
            newWrapper.setAttribute('data-post-id', post.id);
            newWrapper.setAttribute('data-timestamp', post.createdAt);
            newWrapper.querySelectorAll('.reply').forEach(b => b.setAttribute('data-post-id', post.id));
            existing.parentNode.replaceChild(newWrapper, existing);
            lastTimestamp = Math.max(lastTimestamp, new Date(post.createdAt).getTime());
            return;
        }
    }
    
    const noPostsMsg = postsContainer.querySelector('div[style*="No posts yet"]');
    if (noPostsMsg) {
        postsContainer.innerHTML = '';
    }
    
    const wrapper = createPostWrapper(post.username, post.displayName, post.text || '', post.files || [], timeLabel, post.photoUrl);
    wrapper.setAttribute('data-post-id', post.id);
    wrapper.setAttribute('data-timestamp', post.createdAt);
    wrapper.querySelectorAll('.reply').forEach(b => b.setAttribute('data-post-id', post.id));
    postsContainer.prepend(wrapper);
    lastTimestamp = Math.max(lastTimestamp, new Date(post.createdAt).getTime());
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
        const [res, config] = await Promise.all([
            fetch(baseUrl + '/api/posts'),
            loadAdConfig()
        ]);
        if (!res.ok) throw new Error('failed to load posts');
        const list = await res.json();
        list.slice().reverse().forEach(p => {
            seenPostIds.add(p.id);
            addPostToUIFromServer(p);
        });
        if (list.length) lastTimestamp = new Date(list[0].createdAt).getTime();
        injectAdsIntoPosts(list, config);
    } catch (err) {}
}

async function pollForNewPosts() {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/posts?since=${lastTimestamp}`);
        if (!res.ok) return;
        const newPosts = await res.json();
        newPosts.forEach(post => {
            if (!seenPostIds.has(post.id)) {
                seenPostIds.add(post.id);
                addPostToUIFromServer(post);
            }
        });
    } catch (err) {}
}
async function submitPostToServerHandler(e) {
    e.preventDefault();
    e.stopPropagation();

    const content = document.getElementById('postTextarea')?.value || '';
    const username = (document.getElementById('addUsername')?.value || '').trim() || 'user_tag';
    const displayName = document.querySelector('.p-name')?.textContent || username;
    const selected = selectedFiles || [];

    if (content.trim() === '' && selected.length === 0) {
        const ta = document.getElementById('postTextarea');
        if (ta) {
            ta.focus();
            ta.style.borderColor = 'red';
            setTimeout(() => ta.style.borderColor = '#ccc', 900);
        }
        return;
    }

    const tempId = uid();
    const currentPhotoUrl = localStorage.getItem(`profilePhotoUrl_${username}`) || 'https://i.imgflip.com/1ickup.jpg';
    const filesForPost = selected.map(f => ({ ...f }));
    
    if (currentFeed === 'posts') {
        const noPostsMsg = postsContainer.querySelector('div[style*="No posts yet"]');
        if (noPostsMsg) {
            postsContainer.innerHTML = '';
        }
        
        const optimisticPostEl = buildPostElement(username, displayName, content, filesForPost, currentPhotoUrl);
        optimisticPostEl.setAttribute('data-temp-id', tempId);
        postsContainer.prepend(optimisticPostEl);
    }

    const ta = document.getElementById('postTextarea');
    if (ta) ta.value = '';
    const fp = document.getElementById('filePreview');
    if (fp) fp.innerHTML = '';
    const fi = document.getElementById('postFiles');
    if (fi) fi.value = '';
    selectedFiles = [];
    const addEl = document.getElementById('add');
    if (addEl) {
        addEl.classList.remove('active');
        addEl.style.transform = '';
        addEl.style.transition = '';
        addEl.style.height = '';
        addEl.style.paddingBottom = '';
    }
    showView('pos-t');

    const fd = new FormData();
    fd.append('username', username);
    fd.append('text', content);
    fd.append('tempId', tempId);
    selected.forEach((f) => fd.append('files', f.file, f.file.name));

    try {
        const btn = document.getElementById('postSubmit');
        if (btn) { btn.disabled = true; btn.textContent = 'Posting...'; }
        const res = await fetchWithAuth(baseUrl + '/api/posts', {
            method: 'POST',
            body: fd
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || 'upload failed');
        
        if (currentFeed === 'posts') {
            const optimisticEl = document.querySelector(`[data-temp-id="${tempId}"]`);
            if (optimisticEl) {
                optimisticEl.remove();
            }
        }
        
    } catch (err) {
        console.error('Post error:', err);
        if (currentFeed === 'posts') {
            const optimisticEl = document.querySelector(`[data-temp-id="${tempId}"]`);
            if (optimisticEl) optimisticEl.remove();
        }
        alert('Failed to post. Please try again.');
        if (ta) ta.value = content;
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
        const socket = io(baseUrl, { 
            transports: ['websocket','polling']
        });
        socket.on('connect', () => console.log('Socket connected'));
        socket.on('post_created', (post) => {
            if (!seenPostIds.has(post.id)) {
                seenPostIds.add(post.id);
                addPostToUIFromServer(post);
            }
        });
    } catch (err) {
        console.error('Socket initialization error:', err);
    }
}

async function createReviewPost(review) {
    const reviewPost = document.createElement('div');
    reviewPost.className = 'post';
    
    let movieInfo = '';
    try {
        const numericId = review.movieId.includes('-') 
            ? review.movieId.split('-').pop() 
            : review.movieId;
        
        const movieRes = await fetch(`${baseUrl}/api/tmdb/movie/${numericId}`, {
            headers: ngrokHeaders
        });
        if (movieRes.ok) {
            const movie = await movieRes.json();
            const posterUrl = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
            
            movieInfo = `
                <div class="review-movie-info" data-movie-id="${numericId}" style="margin-top: 12px; padding: 12px; background: var(--iconbox-bg); border-radius: 12px; display: flex; gap: 12px; cursor: pointer; transition: background 0.2s;">
                    ${posterUrl ? `<img src="${posterUrl}" style="width: 60px; height: 90px; border-radius: 8px; object-fit: cover;">` : ''}
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${escapeHtml(movie.title)}</div>
                        <div style="font-size: 12px; color: var(--text-subtle);">${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'} • ⭐ ${movie.vote_average.toFixed(1)}</div>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error('Failed to fetch movie info:', err);
    }
    
    reviewPost.innerHTML = `
        <div class="pt">
            <div class="pr-img"><img src="${review.photoUrl}"></div>
            <div style="display: block; width: 100%;">
                <span class="usr">${escapeHtml(review.username)}</span>
                <span class="time">${formatTimeAgo(review.createdAt)}</span>
                <div class="cnt">
                    <div style="color: #ffc107; margin-bottom: 8px; font-size: 18px;">${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}</div>
                    ${review.text ? `<div style="margin-bottom: 8px;">${escapeHtml(review.text)}</div>` : ''}
                    ${movieInfo}
                </div>
            </div>
        </div>
    `;
    
    const movieInfoEl = reviewPost.querySelector('.review-movie-info');
    if (movieInfoEl) {
        movieInfoEl.addEventListener('mouseenter', function() {
            this.style.background = 'var(--nav-active-bg)';
        });
        movieInfoEl.addEventListener('mouseleave', function() {
            this.style.background = 'var(--iconbox-bg)';
        });
        movieInfoEl.addEventListener('click', async function() {
            const movieId = this.getAttribute('data-movie-id');
            showView('finder');
            
            try {
                const res = await fetch(`${baseUrl}/api/tmdb/movie/${movieId}`, {
                    headers: ngrokHeaders
                });
                if (res.ok) {
                    const movie = await res.json();
                    showDetails(movie);
                }
            } catch (err) {
                console.error('Failed to open movie:', err);
            }
        });
    }
    
    return reviewPost;
}

postsMenuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    feedMenu.style.display = feedMenu.style.display === 'none' ? 'block' : 'none';
});

document.addEventListener('click', (e) => {
    if (!postsMenuBtn.contains(e.target) && !feedMenu.contains(e.target)) {
        feedMenu.style.display = 'none';
    }
});

feedOptions.forEach(option => {
    option.addEventListener('click', async () => {
        const selectedFeed = option.getAttribute('data-feed');
        
        if (currentFeed === selectedFeed) {
            feedMenu.style.display = 'none';
            return;
        }
        
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
    
    postsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-subtle);">Loading...</div>';
    
    if (feedType === 'posts') {
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/posts`);
            if (!res.ok) throw new Error('Failed to load posts');
            const list = await res.json();
            
            postsContainer.innerHTML = '';
            list.slice().reverse().forEach(p => {
                addPostToUIFromServer(p);
            });
            
            if (list.length === 0) {
                postsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-subtle);">No posts yet</div>';
            }
        } catch (err) {
            postsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-subtle);">Failed to load posts</div>';
        }
    } else if (feedType === 'friends') {
        postsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-subtle);">Friends feed coming soon...</div>';
    } else if (feedType === 'reviews') {
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/reviews/all`);
            if (!res.ok) throw new Error('Failed to load reviews');
            const allReviews = await res.json();
            
            postsContainer.innerHTML = '';
            
            for (const review of allReviews) {
                const reviewPost = await createReviewPost(review);
                postsContainer.appendChild(reviewPost);
            }
            
            if (allReviews.length === 0) {
                postsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-subtle);">No reviews yet</div>';
            }
        } catch (err) {
            postsContainer.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-subtle);">Failed to load reviews</div>';
        }
    }
}

if (baseUrl) {
    replacePostButtonListener(submitPostToServerHandler);
    loadInitialPostsFromServer();
    initSocket();
    setInterval(pollForNewPosts, 5000);
    textarea && textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            submitPostToServerHandler(e);
        }
    });
}
feedOptions[0]?.classList.add('active');
