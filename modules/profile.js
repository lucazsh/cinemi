const img_input = document.getElementById('img_input');

if (img_input) {
    img_input.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function (event) {
            const img = new Image();
            img.onload = async function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = Math.min(img.width, img.height);

                canvas.width = size;
                canvas.height = size;

                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);

                canvas.toBlob(async function (blob) {
                    const formData = new FormData();
                    formData.append('photo', blob, 'profile.jpg');

                    const username = getMyUsername();
                    formData.append('username', username);

                    try {
                        const profileImg = document.getElementById('profileImg');
                        profileImg.style.opacity = '0.5';

                        const response = await fetchWithAuth(`${baseUrl}/api/profile/photo`, {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) throw new Error('Upload failed');

                        const result = await response.json();

                        profileImg.onload = function () {
                            profileImg.style.opacity = '1';
                            if (typeof applyProfileGradient === 'function') {
                                applyProfileGradient._cachedRgb = null;
                                applyProfileGradient();
                            }
                        };
                        profileImg.src = result.photoUrl;

                        updateAllProfilePhotos(username, result.photoUrl);

                        try {
                            localStorage.setItem(`profilePhotoUrl_${username}`, result.photoUrl);
                        } catch (err) { }

                    } catch (error) {
                        console.error('Upload error:', error);
                        alert('Failed to upload. Please try again.');
                        profileImg.style.opacity = '1';
                    }
                }, 'image/jpeg', 0.9);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);

        img_input.value = '';
    });

    try {
        const username = getMyUsername();
        const savedPhotoUrl = localStorage.getItem(`profilePhotoUrl_${username}`);
        if (savedPhotoUrl) {
            const pImg = document.getElementById('profileImg');
            pImg.onload = function () {
                if (typeof applyProfileGradient === 'function') {
                    applyProfileGradient._cachedRgb = null;
                    applyProfileGradient();
                }
            };
            pImg.src = savedPhotoUrl;
            console.log('Loaded saved profile photo for', username);
        }
    } catch (err) {
        console.log('Could not load:', err);
    }
}

const _otherCache = {
    friends: null,
    favorites: null,
    watchlist: null
};
function getMyUsername() {
    return (document.getElementById('addUsername')?.textContent || '').trim();
}
async function prefetchOtherTab() {
    const username = (document.getElementById('addUsername')?.textContent || 'user_tag').trim();

    const [followersRes, followingRes, favsRes, wlRes] = await Promise.allSettled([
        fetchWithAuth(`${baseUrl}/api/user/${username}/followers`),
        fetchWithAuth(`${baseUrl}/api/user/${username}/following`),
        fetchWithAuth(`${baseUrl}/api/user/${username}/favorites`),
        fetchWithAuth(`${baseUrl}/api/user/${username}/watchlist`)
    ]);

    try {
        const followers = followersRes.status === 'fulfilled' ? await followersRes.value.json() : [];
        const following = followingRes.status === 'fulfilled' ? await followingRes.value.json() : [];
        _otherCache.friends = { followers, following };

        const total = new Set([
            ...followers.map(f => f.username),
            ...following.map(f => f.username)
        ]).size;

        const fc = document.getElementById('friendsCount');
        if (fc) fc.textContent = `${total} friend${total !== 1 ? 's' : ''}`;
        localStorage.setItem('cinemi_others_friendCount', total);
        localStorage.setItem('cinemi_others_ts', Date.now());
    } catch (e) {}

    try {
        const favs = favsRes.status === 'fulfilled' ? await favsRes.value.json() : [];
        _otherCache.favorites = Array.isArray(favs) ? favs : [];

        const favSubtitle = document.getElementById('favsCount');
        if (favSubtitle) favSubtitle.textContent = `${_otherCache.favorites.length} movie${_otherCache.favorites.length !== 1 ? 's' : ''}`;
        localStorage.setItem('cinemi_others_favCount', _otherCache.favorites.length);
    } catch (e) {}

    try {
        const wl = wlRes.status === 'fulfilled' ? await wlRes.value.json() : [];
        _otherCache.watchlist = Array.isArray(wl) ? wl : [];

        const wlSubtitle = document.getElementById('wlCount');
        if (wlSubtitle) wlSubtitle.textContent = `${_otherCache.watchlist.length} movie${_otherCache.watchlist.length !== 1 ? 's' : ''}`;
        localStorage.setItem('cinemi_others_wlCount', _otherCache.watchlist.length);
    } catch (e) {}
}

async function updateMyFriendsCount() {
    const username = (document.getElementById('addUsername')?.textContent || 'user_tag').trim();

    try {
        const [followersRes, followingRes] = await Promise.all([
            fetchWithAuth(`${baseUrl}/api/user/${username}/followers`),
            fetchWithAuth(`${baseUrl}/api/user/${username}/following`)
        ]);

        const followers = await followersRes.json();
        const following = await followingRes.json();

        const totalFriends = new Set([
            ...followers.map(f => f.username),
            ...following.map(f => f.username)
        ]).size;

        const fc = document.getElementById('friendsCount');
        if (fc) fc.textContent = `${totalFriends} friend${totalFriends !== 1 ? 's' : ''}`;
    } catch (err) {
        console.error('Failed to update friends count:', err);
    }
}

async function showFriendsPanel() {
    const username = (document.getElementById('addUsername')?.textContent || 'user_tag').trim();
    const panel = document.getElementById('friends-panel');
    const sheet = panel.querySelector('.sheet');

    try {
        let followers, following;

        if (_otherCache.friends) {
            ({ followers, following } = _otherCache.friends);
        } else {
            const [followersRes, followingRes] = await Promise.all([
                fetchWithAuth(`${baseUrl}/api/user/${username}/followers`),
                fetchWithAuth(`${baseUrl}/api/user/${username}/following`)
            ]);
            followers = await followersRes.json();
            following = await followingRes.json();
            _otherCache.friends = { followers, following };
        }

        const totalFriends = new Set([
            ...followers.map(f => f.username),
            ...following.map(f => f.username)
        ]).size;

        sheet.innerHTML = `
        <h2>Friends (${totalFriends})</h2>
        <div style="max-height:60vh; overflow-y:auto; margin:20px 0;">
            ${followers.length > 0 ? `
            <div style="margin-bottom:20px;">
                <h3 style="font-size:16px; margin-bottom:10px;">Followers (${followers.length})</h3>
                ${followers.map(f => `
                <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center; cursor:pointer;" onclick="closePanel('friends'); viewUserProfile('${f.username}')">
                    <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:14.4px; object-fit:cover;">
                    <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px;">${escapeHtml(f.displayName)}</div>
                    <div style="font-size:12px; color:var(--text-subtle);">@${escapeHtml(f.username)}</div>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            ${following.length > 0 ? `
            <div>
                <h3 style="font-size:16px; margin-bottom:10px;">Following (${following.length})</h3>
                ${following.map(f => `
                <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center; cursor:pointer;" onclick="closePanel('friends'); viewUserProfile('${f.username}')">
                    <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:14.4px; object-fit:cover;">
                    <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px;">${escapeHtml(f.displayName)}</div>
                    <div style="font-size:12px; color:var(--text-subtle);">@${escapeHtml(f.username)}</div>
                    </div>
                </div>
                `).join('')}
            </div>
            ` : ''}
            ${totalFriends === 0 ? '<p style="text-align:center; color:var(--text-subtle); padding:40px;">No friends yet</p>' : ''}
        </div>
        <button class="btn-close" onclick="closePanel('friends')">Close</button>
        `;
    } catch (err) {
        sheet.innerHTML = `
        <h2>Friends</h2>
        <p style="text-align:center; color:var(--text-subtle); padding:40px;">Failed to load</p>
        <button class="btn-close" onclick="closePanel('friends')">Close</button>
        `;
    }
}

let currentViewedUser = null;

async function viewUserProfile(username) {
    if (!username) return;
    currentViewedUser = username;

    try {
        const res = await fetchWithAuth(`${baseUrl}/api/user/${username}`);
        if (!res.ok) throw new Error('User not found');
        const data = await res.json();

        document.getElementById('userProfileName').textContent = data.user.displayName;
        document.getElementById('userProfileTag').textContent = '@' + data.user.username;
        document.getElementById('userProfileImg').src = data.user.photoUrl;

        const [followersRes, followingRes, isFollowingRes] = await Promise.all([
            fetchWithAuth(`${baseUrl}/api/user/${username}/followers`),
            fetchWithAuth(`${baseUrl}/api/user/${username}/following`),
            fetchWithAuth(`${baseUrl}/api/user/${username}/is-following`)
        ]);

        const followers = await followersRes.json();
        const following = await followingRes.json();
        const followData = await isFollowingRes.json();

        const totalFriends = new Set([
            ...followers.map(f => f.username),
            ...following.map(f => f.username)
        ]).size;

        document.getElementById('userFriendsCount').textContent = `${totalFriends} friend${totalFriends !== 1 ? 's' : ''}`;

        _setUserProfileFollowState(followData.isFollowing);

        if (followData.isFollowing) {
            loadUserSpace(username);
        }
        applyUserProfileGradient(data.user.photoUrl, data.user.profileBgMode || 'auto');
        initReactCarousel(username);
        showView('user-profile');
    } catch (err) {
        console.error('Failed to load user profile:', err);
    }
}
function applyUserProfileGradient(photoUrl, mode) {
    const el = document.getElementById('user-profile-gradient-bg');
    if (!el) return;
    if (mode === 'static') {
        el.style.background = 'linear-gradient(to bottom, var(--profile-bg) 0%, transparent 100%)';
        return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () {
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 50; canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 50, 50);
            const d = ctx.getImageData(0, 0, 50, 50).data;
            let r = 0, g = 0, b = 0, c = 0;
            for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; c++; }
            r = Math.round(r/c); g = Math.round(g/c); b = Math.round(b/c);
            el.style.background = `linear-gradient(to bottom, rgba(${r},${g},${b},0.25) 0%, transparent 100%)`;
        } catch(e) {
            el.style.background = 'linear-gradient(to bottom, rgba(31,31,31,0.8) 0%, transparent 100%)';
        }
    };
    img.onerror = function () {
        el.style.background = 'linear-gradient(to bottom, rgba(31,31,31,0.8) 0%, transparent 100%)';
    };
    img.src = photoUrl;
}
function _setUserProfileFollowState(isFollowing) {
    const addFriendState = document.getElementById('upAddFriendState');
    const tabsState = document.getElementById('upTabsState');
    const msgBtn = document.getElementById('upMsgBtn');
    const sep = document.getElementById('upNavSep');

    if (isFollowing) {
        addFriendState.style.display = 'none';
        addFriendState.classList.remove('morphing-out');
        tabsState.style.display = 'block';
        requestAnimationFrame(() => requestAnimationFrame(() => tabsState.classList.add('visible')));
        msgBtn.classList.add('visible');
        // sep.classList.add('visible');
        document.getElementById('up-tab-space').style.display = 'block';
        document.getElementById('up-tab-others').style.display = 'none';
        const btns = document.querySelectorAll('#upTabsState .tab-btn');
        btns.forEach((b, i) => b.classList.toggle('active', i === 0));
    } else {
        addFriendState.style.display = 'block';
        addFriendState.classList.remove('morphing-out');
        tabsState.classList.remove('visible');
        tabsState.style.display = 'none';
        msgBtn.classList.remove('visible');
        // sep.classList.remove('visible');
        const btn = document.getElementById('addFriendBtn');
        if (btn) btn.disabled = false;
    }
}

async function addFriendAndMorph() {
    const _username = currentViewedUser || document.getElementById('userProfileTag')?.textContent?.replace('@','').trim();
    if (!_username) return;
    currentViewedUser = _username;
    const btn = document.getElementById('addFriendBtn');
    btn.disabled = true;

    try {
        const res = await fetchWithAuth(`${baseUrl}/api/user/${currentViewedUser}/follow`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed');

        const addFriendState = document.getElementById('upAddFriendState');
        const tabsState = document.getElementById('upTabsState');
        const msgBtn = document.getElementById('upMsgBtn');
        const sep = document.getElementById('upNavSep');

        addFriendState.classList.add('morphing-out');

        setTimeout(() => {
            msgBtn.classList.add('visible');
            // sep.classList.add('visible');
        }, 180);

        setTimeout(() => {
            addFriendState.style.display = 'none';
            tabsState.style.display = 'block';
            requestAnimationFrame(() => requestAnimationFrame(() => tabsState.classList.add('visible')));
            document.getElementById('up-tab-space').style.display = 'block';
            document.getElementById('up-tab-others').style.display = 'none';
            const btns = document.querySelectorAll('#upTabsState .tab-btn');
            btns.forEach((b, i) => b.classList.toggle('active', i === 0));
            loadUserSpace(currentViewedUser);
        }, 320);

        _otherCache.friends = null;
    } catch (err) {
        console.error('Add friend error:', err);
        btn.disabled = false;
    }
}

async function loadUserSpace(username) {
    const container = document.getElementById('up-tab-space');
    if (!container) return;
    container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-subtle);font-size:13px;">Loading...</div>';

    try {
        const [cfgRes, favsRes, wlRes, compatRes] = await Promise.allSettled([
            fetch(`${baseUrl}/api/space-config/${username}`, { headers: ngrokHeaders }),
            fetchWithAuth(`${baseUrl}/api/user/${username}/favorites`),
            fetchWithAuth(`${baseUrl}/api/user/${username}/watchlist`),
            fetchWithAuth(`${baseUrl}/api/user/${username}/compatibility`)
        ]);

        const cfgData = cfgRes.status === 'fulfilled' ? await cfgRes.value.json() : { config: null };
        const favsData = favsRes.status === 'fulfilled' ? await favsRes.value.json() : [];
        const wlData = wlRes.status === 'fulfilled' ? await wlRes.value.json() : [];
        const compatData = compatRes.status === 'fulfilled' ? await compatRes.value.json() : null;

        const cfg = cfgData.config || {
            titleColor: 'auto', customColor: '#ff3b30', layout: 'scroll',
            perSectionEnabled: false,
            quoteText: 'Get busy living, or get busy dying.',
            quoteSource: 'The Shawshank Redemption, 1994',
            quoteTextColor: 'auto', quoteCustomColor: '#ff3b30',
            sections: [
                { id: 'favs', label: 'My Favs', visible: true, core: true, titleColor: 'auto', customColor: '#ff3b30', titleAlign: 'left' },
                { id: 'genres', label: 'My Genres', visible: true, core: true, titleColor: 'auto', customColor: '#ff3b30', titleAlign: 'left' },
                { id: 'quote', label: 'Quote', visible: true, core: true, titleColor: 'auto', customColor: '#ff3b30', titleAlign: 'left' }
            ]
        };

        await renderUserSpace(cfg, Array.isArray(favsData) ? favsData : [], Array.isArray(wlData) ? wlData : [], container);

        if (compatData && compatData.ok) {
            await _renderTasteWidget(compatData, container);
        }
    } catch (err) {
        if (container) container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-subtle);font-size:13px;">Could not load space</div>';
    }
}

async function _extractMutedColor(posterPath) {
    return new Promise(resolve => {
        if (!posterPath) return resolve('rgba(255,255,255,0.08)');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const c = document.createElement('canvas');
                c.width = 8; c.height = 12;
                const ctx = c.getContext('2d');
                ctx.drawImage(img, 0, 0, 8, 12);
                const d = ctx.getImageData(0, 0, 8, 12).data;
                let r = 0, g = 0, b = 0, n = 0;
                for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i+1]; b += d[i+2]; n++; }
                r /= n*255; g /= n*255; b /= n*255;
                const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
                let h = 0, s = 0;
                if (max !== min) {
                    const dv = max - min;
                    s = l > 0.5 ? dv/(2-max-min) : dv/(max+min);
                    if (max === r) h = ((g-b)/dv + (g<b?6:0))/6;
                    else if (max === g) h = ((b-r)/dv+2)/6;
                    else h = ((r-g)/dv+4)/6;
                }
                resolve(`hsl(${Math.round(h*360)},${Math.round(Math.min(s,0.65)*100)}%,28%)`);
            } catch { resolve('rgba(255,255,255,0.08)'); }
        };
        img.onerror = () => resolve('rgba(255,255,255,0.08)');
        img.src = 'https://image.tmdb.org/t/p/w92' + posterPath;
    });
}

const _GENRE_LABELS = {
    action:'Action', horror:'Horror', comedy:'Comedy', psychological_thriller:'Thriller',
    romantic_drama:'Romance', romantic_comedy:'Rom-Com', fantasy:'Fantasy',
    science_fiction:'Sci-Fi', superheroes:'Superheroes', melancholic:'Melancholic',
    crime_detective:'Crime'
};

async function _renderTasteWidget(compat, container) {
    const allItems = [
        ...compat.sharedFavorites.map(m => ({ kind:'movie', ...m })),
        ...compat.sharedGenres.map(g => ({ kind:'genre', id:g }))
    ].slice(0, 7);

    const colors = await Promise.all(
        allItems.map(item => item.kind === 'movie' ? _extractMutedColor(item.poster) : Promise.resolve(null))
    );

    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin: 10px 14px 0; background: var(--bg-secondary); border: 1px solid var(--border-dark-alpha-2); border-radius: 20px; padding: 18px 16px; display: flex; align-items: center; gap: 12px; cursor: pointer; -webkit-tap-highlight-color: transparent;';

    const left = document.createElement('div');
    left.style.cssText = 'flex: 1; min-width: 0;';

    const scoreEl = document.createElement('div');
    scoreEl.style.cssText = 'font-size: 29.5px; font-family: Nunito, sans-serif; font-weight: 900; color: var(--text-primary); -webkit-mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%); mask-image: linear-gradient(to bottom, #000 0%, #000 50%, transparent 100%); letter-spacing: -1.8px; line-height: 1; margin-bottom: 10px;';
    scoreEl.innerHTML = `${compat.score}% <span style="font-size:18px;font-weight:800;opacity:0.7;letter-spacing:-1px;">similar</span>`;

    const row = document.createElement('div');
    row.style.cssText = 'display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; padding-bottom: 2px; -webkit-overflow-scrolling: touch; -webkit-mask-image: linear-gradient(to right, black 0%, black 75%, transparent 100%); mask-image: linear-gradient(to right, black 0%, black 75%, transparent 100%);';

    if (allItems.length === 0) {
        const empty = document.createElement('span');
        empty.style.cssText = 'font-size: 12px; color: var(--text-subtle); font-weight: 600;';
        empty.textContent = 'No overlap yet';
        row.appendChild(empty);
    } else {
        allItems.forEach((item, i) => {
            const pill = document.createElement('div');
            pill.style.cssText = `display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,0.1);border-radius:14px;padding:5px 12px 5px 5px;flex-shrink:0;background:${colors[i] || 'rgba(255,255,255,0.08)'};`;
            if (item.kind === 'movie') {
                const img = document.createElement('img');
                img.src = 'https://image.tmdb.org/t/p/w92' + item.poster;
                img.style.cssText = 'width:26px;height:26px;border-radius:50%;object-fit:cover;background:var(--placeholder-bg);flex-shrink:0;';
                const title = document.createElement('span');
                title.style.cssText = 'font-size:13px;font-weight:700;color:#fff;white-space:nowrap;';
                title.textContent = item.title.split(' ').slice(0, 3).join(' ');
                pill.appendChild(img);
                pill.appendChild(title);
            } else {
                const icon = document.createElement('div');
                icon.style.cssText = 'width:26px;height:26px;border-radius:50%;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;';
                icon.textContent = '🎭';
                const label = document.createElement('span');
                label.style.cssText = 'font-size:13px;font-weight:700;color:var(--text-primary);white-space:nowrap;';
                label.textContent = _GENRE_LABELS[item.id] || item.id;
                pill.appendChild(icon);
                pill.appendChild(label);
            }
            row.appendChild(pill);
        });
    }

    const arrow = `<svg xmlns="http://www.w3.org/2000/svg" height="22px" viewBox="0 -960 960 960" width="22px" style="fill:var(--border-dark-alpha-1);flex-shrink:0;"><path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/></svg>`;

    left.appendChild(scoreEl);
    left.appendChild(row);
    wrap.appendChild(left);
    wrap.insertAdjacentHTML('beforeend', arrow);
    container.insertBefore(wrap, container.firstChild);
}

async function renderUserSpace(cfg, favs, wl, container) {
    const IMG = 'https://image.tmdb.org/t/p/w300';

    function getC(c, custom) {
        if (c === 'auto') return 'var(--text-primary)';
        if (c === 'custom') return custom;
        return c;
    }

    const globalTitleColor = getC(cfg.titleColor, cfg.customColor);
    const titleCssVal = cfg.titleColor === 'auto' ? 'var(--text-primary)' : (cfg.titleColor === 'custom' ? cfg.customColor : cfg.titleColor);
    container.style.setProperty('--title-color', titleCssVal);

    function makeTitle(sec) {
        const tc = cfg.perSectionEnabled ? getC(sec.titleColor, sec.customColor) : globalTitleColor;
        const align = sec.titleAlign || 'left';
        const origins = { left: 'top left', center: 'top center', right: 'top right' };
        return `<div class="sp-title-wrap" style="text-align:${align}"><span class="sp-title" style="color:${tc};transform-origin:${origins[align]}">${escapeHtml(sec.label)}</span></div>`;
    }

    function makePosterRow(items) {
        if (!items.length) return '<div style="padding:0 15px 10px;color:var(--text-subtle);font-size:13px;">Nothing here yet</div>';
        if (cfg.layout === 'grid') {
            return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:0 14px 10px;">${items.map(m =>
                `<img src="${IMG}${m.posterPath}" style="width:100%;aspect-ratio:2/3;object-fit:cover;border-radius:8px;display:block;cursor:pointer;" onclick="showMovieDetails('${String(m.movieId)}')" onerror="this.style.display='none'">`
            ).join('')}</div>`;
        }
        if (cfg.layout === 'large') {
            return `<div style="padding:0 14px 10px;display:flex;flex-direction:column;gap:10px;">${items.slice(0, 1).map(m =>
                `<img src="${IMG}${m.posterPath}" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:16px;display:block;cursor:pointer;" onclick="showMovieDetails('${String(m.movieId)}')" onerror="this.style.display='none'">`
            ).join('')}</div>`;
        }
        return `<div class="sp-mov-row">${items.map(m =>
            `<img src="${IMG}${m.posterPath}" onclick="showMovieDetails('${String(m.movieId)}')" onerror="this.style.display='none'">`
        ).join('')}</div>`;
    }

    container.innerHTML = '';

    for (const sec of (cfg.sections || [])) {
        if (!sec.visible) continue;
        const el = document.createElement('div');
        el.className = 'sp-section';

        if (sec.id === 'favs') {
            el.innerHTML = makeTitle(sec) + makePosterRow(favs);
        } else if (sec.id === 'watchlistprev') {
            el.innerHTML = makeTitle(sec) + makePosterRow(wl);
        } else if (sec.id === 'genres') {
            el.innerHTML = makeTitle(sec) + `<div class="sp-genres-list">
                <div class="sp-genre-row"><span class="sp-genre-name scifi">Sci-Fi</span><div class="sp-mov-row" id="usp-genre-878"></div></div>
                <div class="sp-genre-row"><span class="sp-genre-name drama">Drama</span><div class="sp-mov-row" id="usp-genre-18"></div></div>
                <div class="sp-genre-row"><span class="sp-genre-name thriller">Thriller</span><div class="sp-mov-row" id="usp-genre-53"></div></div>
            </div>`;
            container.appendChild(el);
            [878, 18, 53].forEach(async (genreId) => {
                try {
                    const res = await fetch(`${baseUrl}/api/tmdb/discover/genre/${genreId}`, { headers: ngrokHeaders });
                    const data = await res.json();
                    const row = document.getElementById(`usp-genre-${genreId}`);
                    if (!row) return;
                    const movies = (data.results || []).filter(m => m.poster_path).slice(0, 6);
                    row.innerHTML = movies.map(m =>
                        `<img src="${IMG}${m.poster_path}" onclick="showMovieDetails('${m.id}')" onerror="this.style.display='none'">`
                    ).join('');
                } catch {}
            });
            continue;
        } else if (sec.id === 'quote') {
            const qColor = getC(cfg.quoteTextColor, cfg.quoteCustomColor);
            const quoteText = cfg.quoteText || 'Get busy living, or get busy dying.';
            const quoteSource = cfg.quoteSource || 'The Shawshank Redemption, 1994';
            el.innerHTML = makeTitle(sec) + `<div class="sp-quote-wrap" style="pointer-events:none;cursor:default;">
                <p class="sp-quote-text" style="color:${qColor}">"${escapeHtml(quoteText)}"</p>
                <span class="sp-quote-source">&mdash; ${escapeHtml(quoteSource)}</span>
            </div>`;
        } else {
            el.innerHTML = makeTitle(sec) + `<div style="margin:0 15px;background:var(--bg-secondary);border-radius:20px;padding:20px;border:1px solid var(--border-dark-alpha-2);"><span style="font-size:13px;font-weight:600;color:var(--text-secondary);">Coming soon...</span></div>`;
        }

        container.appendChild(el);
    }

    if (!container.children.length) {
        container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-subtle);font-size:13px;">No space yet</div>';
    }
}

function switchUserTab(tab, btn) {
    document.querySelectorAll('#upTabsState .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('up-tab-space').style.display = tab === 'space' ? 'block' : 'none';
    document.getElementById('up-tab-others').style.display = tab === 'others' ? 'block' : 'none';
}

function openChatWithCurrentUser() {
    if (!currentViewedUser) return;
    const photo = document.getElementById('userProfileImg')?.src || '';
    if (typeof openChatsWithUser === 'function') openChatsWithUser(currentViewedUser, photo);
}

let _upMoreOpen = false;

function toggleUserMoreMenu() {
    const menu = document.getElementById('upMoreDropdown');
    _upMoreOpen = !_upMoreOpen;
    menu.classList.toggle('open', _upMoreOpen);
    if (_upMoreOpen) {
        setTimeout(() => document.addEventListener('click', _closeUserMoreOnOutside, { once: true }), 10);
    }
}

function _closeUserMoreOnOutside(e) {
    const menu = document.getElementById('upMoreDropdown');
    if (!menu.contains(e.target)) {
        menu.classList.remove('open');
        _upMoreOpen = false;
    }
}

async function unfollowCurrentUser() {
    const menu = document.getElementById('upMoreDropdown');
    menu.classList.remove('open');
    _upMoreOpen = false;
    if (!currentViewedUser) return;

    try {
        const res = await fetchWithAuth(`${baseUrl}/api/user/${currentViewedUser}/follow`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed');

        const tabsState = document.getElementById('upTabsState');
        const addFriendState = document.getElementById('upAddFriendState');
        const msgBtn = document.getElementById('upMsgBtn');
        const sep = document.getElementById('upNavSep');

        tabsState.classList.remove('visible');
        msgBtn.classList.remove('visible');
        // sep.classList.remove('visible');

        setTimeout(() => {
            tabsState.style.display = 'none';
            addFriendState.style.display = 'block';
            addFriendState.classList.remove('morphing-out');
            const btn = document.getElementById('addFriendBtn');
            if (btn) btn.disabled = false;
        }, 310);

        _otherCache.friends = null;
    } catch (err) {
        console.error('Unfollow error:', err);
    }
}

function reportCurrentUser() {
    const menu = document.getElementById('upMoreDropdown');
    menu.classList.remove('open');
    _upMoreOpen = false;
    reportUser(currentViewedUser);
}

async function openUserPanel(panelType) {
    if (!currentViewedUser) return;

    if (panelType === 'friends') {
        const panel = document.getElementById('user-friends-panel');
        const sheet = panel.querySelector('.sheet');
        panel.style.display = '';
        openPanel('user-friends');

        try {
            const [followersRes, followingRes] = await Promise.all([
                fetchWithAuth(`${baseUrl}/api/user/${currentViewedUser}/followers`),
                fetchWithAuth(`${baseUrl}/api/user/${currentViewedUser}/following`)
            ]);

            const followers = await followersRes.json();
            const following = await followingRes.json();

            const totalFriends = new Set([
                ...followers.map(f => f.username),
                ...following.map(f => f.username)
            ]).size;

            sheet.innerHTML = `
            <h2>Friends (${totalFriends})</h2>
            <div style="max-height:60vh; overflow-y:auto; margin:20px 0;">
                ${followers.length > 0 ? `
                <div style="margin-bottom:20px;">
                    <h3 style="font-size:16px; margin-bottom:10px;">Followers (${followers.length})</h3>
                    ${followers.map(f => `
                    <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center; cursor:pointer;" onclick="closePanel('user-friends'); viewUserProfile('${f.username}')">
                        <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:14.4px; object-fit:cover;">
                        <div style="flex:1;">
                        <div style="font-weight:600; font-size:14px;">${escapeHtml(f.displayName)}</div>
                        <div style="font-size:12px; color:var(--text-subtle);">@${escapeHtml(f.username)}</div>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
                ${following.length > 0 ? `
                <div>
                    <h3 style="font-size:16px; margin-bottom:10px;">Following (${following.length})</h3>
                    ${following.map(f => `
                    <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center; cursor:pointer;" onclick="closePanel('user-friends'); viewUserProfile('${f.username}')">
                        <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:14.4px; object-fit:cover;">
                        <div style="flex:1;">
                        <div style="font-weight:600; font-size:14px;">${escapeHtml(f.displayName)}</div>
                        <div style="font-size:12px; color:var(--text-subtle);">@${escapeHtml(f.username)}</div>
                        </div>
                    </div>
                    `).join('')}
                </div>
                ` : ''}
                ${totalFriends === 0 ? '<p style="text-align:center; color:var(--text-subtle); padding:40px;">No friends yet</p>' : ''}
            </div>
            <button class="btn-close" onclick="closePanel('user-friends')">Close</button>
            `;
        } catch (err) {
            sheet.innerHTML = `
            <h2>Friends</h2>
            <p style="text-align:center; color:var(--text-subtle); padding:40px;">Failed to load</p>
            <button class="btn-close" onclick="closePanel('user-friends')">Close</button>
            `;
        }

        const backdrop = panel.querySelector('.backdrop');
        if (backdrop) backdrop.onclick = () => closePanel('user-friends');
        return;
    }

    const panelId = `user-${panelType}-panel`;
    const panel = document.getElementById(panelId);
    const sheet = panel.querySelector('.sheet');
    panel.style.display = '';
    openPanel(`user-${panelType}`);

    try {
        const res = await fetchWithAuth(`${baseUrl}/api/user/${currentViewedUser}/${panelType}`);
        const movies = await res.json();

        if (movies.length === 0) {
            sheet.innerHTML = `
                <h2>${panelType === 'favorites' ? 'Favorites' : 'Watch List'}</h2>
                <p style="text-align:center; color:var(--text-subtle); padding:40px;">No movies yet!</p>
                <button class="btn-close" onclick="closePanel('user-${panelType}')">Close</button>
            `;
        } else {
            sheet.innerHTML = `
                <h2>${panelType === 'favorites' ? 'Favorites' : 'Watch List'} (${movies.length})</h2>
                <div style="max-height:60vh; overflow-y:auto; margin:20px 0;">
                    ${movies.map(m => `
                        <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center; cursor:pointer;" onclick="showMovieDetails('${m.movieId}')">
                            <img src="${IMG_W500}${m.posterPath}" style="width:50px; height:75px; border-radius:8px; object-fit:cover;">
                            <div style="flex:1;">
                                <div style="font-weight:600; font-size:14px;">${escapeHtml(m.title)}</div>
                                <div style="font-size:12px; color:var(--text-subtle);">⭐ ${m.rating?.toFixed(1) || 'N/A'}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <button class="btn-close" onclick="closePanel('user-${panelType}')">Close</button>
            `;
        }
    } catch (err) {
        sheet.innerHTML = `
            <h2>${panelType === 'favorites' ? 'Favorites' : 'Watch List'}</h2>
            <p style="text-align:center; color:var(--text-subtle); padding:40px;">Failed to load</p>
            <button class="btn-close" onclick="closePanel('user-${panelType}')">Close</button>
        `;
    }

    const backdrop = panel.querySelector('.backdrop');
    if (backdrop) backdrop.onclick = () => closePanel(`user-${panelType}`);
}

const _REPORT_REASONS = {
    spam: { label: 'Spam', path: 'm774-62-53-52H170q-57 0-96.5-40T34-250v-460q0-48 30-85t75-48l133 133H125l-94-93q-15-15-15-36.5T32-877q15-15 36.5-15t37.5 15l742 742q15 15 15.5 36T848-62q-16 16-37 16t-37-16Zm72-226q-20-3-36-19L632-485l135-89q22-14 23.5-34t-9-36q-10.5-16-29-22.5T712-659L559-558 388-729q-16-16-19.5-36.5t4-38q7.5-17.5 23.5-30t39-12.5h355q57 0 96.5 40t39.5 96v355q0 23-12 39.5T884-292q-18 7-38 4Z' },
    harassment: { label: 'Harassment or bullying', path: 'M306-69q-81-35-141.58-95.76-60.58-60.77-95.5-142.52Q34-389.04 34-482q0-91.29 35.09-172.82 35.1-81.52 95.26-141.83 60.17-60.31 141.86-94.83Q387.91-926 479.95-926q92.05 0 173.77 34.52 81.72 34.52 141.89 94.83 60.18 60.31 95.29 141.83Q926-573.29 926-481.5q0 92.4-34.92 174.17-34.92 81.78-95.5 142.55Q735-104 653.93-69q-81.08 35-174 35Q387-34 306-69Zm342-151q28-18.5 52.25-42.75T743-315L314-745q-28 18.5-52.75 43.25T218-649l430 429Z' },
    fake: { label: 'Fake profile', path: 'M801-34h1-93q-29 0-48.5-19.5T641-102q0-27 8.5-41.5T672-166h-2l-61-60H294q-28 0-48-20t-20-48v-22q0-25 12.5-46.5T272-397q28-16 58-28t61-19L166-668v-3q-8 14-24 22t-40 8q-29 0-48.5-19.5T34-709v-94l7 7q-8-15-6-32t15-31q15-15 36.5-15t36.5 15l752 751q15 15 15.5 36T875-35q-16 16-37 16.5T801-34Zm125-217v60L792-325v-10q20 7 37 11.5t30 4.5q29 0 48.5 19.5T926-251ZM170-34q-57 0-96.5-39.5T34-170v-81q0-29 19.5-48.5T102-319q28 0 48 19.5t20 48.5v81h81q29 0 48.5 20t19.5 48q0 29-19.5 48.5T251-34h-81Zm620-675v-81h-81q-29 0-48.5-20T641-858.5q0-28.5 19.5-48T709-926h81q57 0 96.5 39.5T926-790v81q0 29-19.5 48.5t-48 19.5q-28.5 0-48.5-19.5T790-709ZM191-926h60q29 0 48.5 19t19.5 48q0 13 4.5 30t11.5 37h-10L191-926Zm423 312q0 24-7.5 44.5T585-532L398-719q17-14 38-21.5t44-7.5q55 0 94.5 39.5T614-614Z' },
    inappropriate: { label: 'Inappropriate content', path: 'M109-87q-20 0-35-10t-24-25q-9-14-9-32t9-36l371-640q9-18 25.5-26t33.5-8q17 0 33.5 8t25.5 26l371 640q9 18 9 36t-9 32.5Q901-107 886-97t-35 10H109Zm406.5-160.5q14.5-14.5 14.5-35t-14.5-35Q501-332 480.5-332T445-317.5q-15 14.5-15 35t15 35q15 14.5 35.5 14.5t35-14.5Zm-3.5-124q13-13.5 13-31.5v-101q0-19-13-32t-31.5-13q-18.5 0-32 13T435-504v101q0 18 13.5 31.5t32 13.5q18.5 0 31.5-13.5Z' },
    other: { label: 'Something else', path: 'M520-251q19-19 19-45.5t-19-45Q501-360 474.5-360T429-341.5q-19 18.5-19 45t19 45.5q19 19 45.5 19t45.5-19Zm107-354q0-57-39.5-91.5T484-731q-44 0-81 20.5T342-652q-11 17-2.5 35.5T369-590q17 7 35.5.5T438-613q10-10 20.5-15t22.5-5q17 0 29 11.5t12 26.5q0 12-9.5 27.5T489-540q-38 35-49.5 53T425-440q-2 20 13 34.5t37 14.5q19 0 34-13t23-35q5-14 15-27.5t27-29.5q28-27 40.5-53t12.5-56ZM212-76q-57 0-96.5-39.5T76-212v-536q0-57 39.5-96.5T212-884h536q57 0 96.5 39.5T884-748v536q0 57-39.5 96.5T748-76H212Z' },
};
let _reportUsername = null;
let _reportSelectedKey = null;

async function reportUser(username) {
    if (!username) return;
    _reportUsername = username;
    _reportSelectedKey = null;
    document.querySelectorAll('.report-reason-item').forEach(e => e.classList.remove('selected'));
    document.getElementById('report-next-btn').disabled = true;
    document.getElementById('report-details-text').value = '';
    document.getElementById('report-char-count').textContent = '0 / 300';
    _reportShowStep('reason', false);
    const panel = document.getElementById('report-panel');
    panel.classList.remove('closing');
    panel.classList.add('open');
}

function closeReportPanel() {
    const panel = document.getElementById('report-panel');
    panel.classList.add('closing');
    setTimeout(() => panel.classList.remove('open', 'closing'), 300);
}

function _reportShowStep(name, isBack) {
    const map = { reason: 'report-step-reason', details: 'report-step-details', success: 'report-step-success' };
    Object.values(map).forEach(id => document.getElementById(id).style.display = 'none');
    const el = document.getElementById(map[name]);
    el.style.display = 'block';
    el.classList.remove('report-step-view', 'back');
    void el.offsetWidth;
    el.classList.add('report-step-view');
    if (isBack) el.classList.add('back');
}

function reportSelectReason(el, key) {
    document.querySelectorAll('.report-reason-item').forEach(e => e.classList.remove('selected'));
    el.classList.add('selected');
    _reportSelectedKey = key;
    document.getElementById('report-next-btn').disabled = false;
}

function reportGoToDetails() {
    if (!_reportSelectedKey) return;
    const r = _REPORT_REASONS[_reportSelectedKey];
    document.getElementById('report-selected-badge').innerHTML =
        `<span class="report-selected-badge-icon"><svg viewBox="0 -960 960 960" xmlns="http://www.w3.org/2000/svg"><path d="${r.path}"/></svg></span>${r.label}`;
    _reportShowStep('details', false);
}

function reportGoBack() { _reportShowStep('reason', true); }

function reportUpdateCharCount() {
    const n = document.getElementById('report-details-text').value.length;
    const el = document.getElementById('report-char-count');
    el.textContent = `${n} / 300`;
    el.classList.toggle('warn', n > 240);
}

async function reportSubmit() {
    const details = document.getElementById('report-details-text').value.trim();
    const reason = _reportSelectedKey + (details ? ': ' + details : '');
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/report/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reportedUsername: _reportUsername, reason })
        });
        if (!res.ok) throw new Error('Failed to report');
        _reportShowStep('success', false);
    } catch (err) {
        console.error('Report error:', err);
        closeReportPanel();
    }
}

document.addEventListener('click', (e) => {
    const searchEl = e.target.closest('.usr-search');
    if (searchEl) {
        const username = searchEl.dataset.username;
        if (username) {
            viewUserProfile(username);
        }
        return;
    }

    const postUsr = e.target.closest('.usr-post');
    if (postUsr) {
        const username = postUsr.dataset.username;
        if (username && username !== (document.getElementById('addUsername')?.textContent || 'user_tag').trim()) viewUserProfile(username);
        return;
    }

    const prImg = e.target.closest('.pr-img');
    if (prImg && prImg.dataset && prImg.dataset.username) {
        const username = prImg.dataset.username;
        if (username && username !== (document.getElementById('addUsername')?.textContent || 'user_tag').trim()) viewUserProfile(username);
        return;
    }
});

function closeUserProfileOverlays() {
    currentViewedUser = null;

    document.getElementById('upMoreDropdown')?.classList.remove('open');
    document.getElementById('upTabsState')?.classList.remove('visible');
    document.getElementById('upMsgBtn')?.classList.remove('visible');
    document.getElementById('upAddFriendState')?.classList.remove('morphing-out');
    const rcw = document.getElementById('react-carousel-wrap');
    if (rcw) rcw.classList.remove('visible');
    _reactCarouselOpen = false;
    const reactFab = document.getElementById('react-fab');
    if (reactFab) {
        reactFab.classList.remove('carousel-open');
        reactFab.classList.add('hidden');
    }

    const pImgWrap = document.getElementById('userProfileImg')?.closest('.p-img-wrap');
    if (pImgWrap) {
        pImgWrap.querySelectorAll('.profile-reaction-persist').forEach(el => el.remove());
    }

    ['user-favorites-panel', 'user-watchlist-panel', 'user-friends-panel', 'report-panel'].forEach(id => {
        const panel = document.getElementById(id);
        if (!panel) return;
        panel.classList.remove('open', 'closing');
        panel.style.display = 'none';
    });

    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
}
async function loadSpaceTab() {
    const IMG = 'https://image.tmdb.org/t/p/w300';
    const username = (document.getElementById('addUsername')?.textContent || '').trim();

    if (username && typeof loadSpaceStateFromServer === 'function') {
        await loadSpaceStateFromServer(username);
    }

    if (typeof applyProfileGradient === 'function') {
        applyProfileGradient._cachedRgb = null;
        applyProfileGradient();
    }

    if (typeof prefetchOtherTab === 'function') prefetchOtherTab();
    if (typeof window._applyOthersCounts === 'function') window._applyOthersCounts();

    const savedQuote = localStorage.getItem('space_quote') || state.quoteText || 'Get busy living, or get busy dying.';
    const savedSource = localStorage.getItem('space_quote_source') || state.quoteSource || 'The Shawshank Redemption, 1994';
    state.quoteText = savedQuote;
    state.quoteSource = savedSource;
    renderSpace();

    async function syncSection(rowId, mvKey, fetchFn, toItems) {
        let raw;
        try { raw = await fetchFn(); } catch (e) { return; }
        const fresh = toItems(raw || []);
        const prev = window._mv[mvKey] || [];
        const prevIds = prev.map(m => String(m.id));
        const newOnes = fresh.filter(m => !prevIds.includes(String(m.id)));

        window._mv[mvKey] = fresh;

        const row = document.getElementById(rowId);
        if (!row) return;

        if (prev.length === 0) {
            row.innerHTML = '';
            fresh.forEach((m, i) => {
                const img = document.createElement('img');
                img.src = `${IMG}${m.posterPath}`;
                img.onclick = () => showMovieDetails(String(m.id));
                img.onerror = function () { this.style.display = 'none'; };
                img.style.opacity = '0';
                img.style.transform = 'translateY(8px)';
                img.style.transition = `opacity 0.3s ease ${i * 0.07}s, transform 0.3s ease ${i * 0.07}s`;
                row.appendChild(img);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    img.style.opacity = '1';
                    img.style.transform = 'translateY(0)';
                }));
            });
        } else if (newOnes.length > 0) {
            _restoreMv();
            newOnes.forEach(m => {
                const existing = [...row.querySelectorAll('img')].find(
                    el => el.src.includes(m.posterPath)
                );
                if (existing) {
                    existing.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    existing.style.opacity = '0';
                    existing.style.transform = 'scale(1.05)';
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        existing.style.opacity = '1';
                        existing.style.transform = 'scale(1)';
                    }));
                }
            });
        }
    }

    syncSection('space-favs-row', 'favs', loadFavorites,
        items => items.map(m => ({ id: m.movieId, posterPath: m.posterPath })));

    syncSection('space-watchlist-row', 'watchlist', loadWatchlist,
        items => items.map(m => ({ id: m.movieId, posterPath: m.posterPath })));

    [
        { genreId: 878, key: 'genre-878' },
        { genreId: 18, key: 'genre-18' },
        { genreId: 53, key: 'genre-53' }
    ].forEach(g => {
        syncSection(
            `space-genre-${g.genreId}`, g.key,
            async () => {
                const res = await fetch(`${baseUrl}/api/tmdb/discover/genre/${g.genreId}`, { headers: ngrokHeaders });
                const data = await res.json();
                return data.results || [];
            },
            items => items.slice(0, 6).map(m => ({ id: m.id, posterPath: m.poster_path }))
        );
    });
}

const _origShowView = window.showView;
window.showView = function (view) {
    if (currentViewedUser !== null && view !== 'user-profile') {
        closeUserProfileOverlays();
    }

    if (_origShowView) _origShowView(view);
    const fab = document.getElementById('sp-fab');
    if (fab) {
        if (view === 'profile') fab.classList.remove('hidden');
        else fab.classList.add('hidden');
    }
    const reactFab = document.getElementById('react-fab');
    if (reactFab) {
        if (view === 'user-profile') {
            reactFab.classList.remove('hidden');
            reactFab.classList.remove('carousel-open');
            _initReactFabGestures();
            const upView = document.getElementById('user-profile');
            if (upView && !upView.dataset.reactScrollBound) {
                upView.dataset.reactScrollBound = '1';
                let _upLastScroll = 0;
                upView.addEventListener('scroll', () => {
                    if (_reactCarouselOpen) return;
                    const cur = upView.scrollTop;
                    const rf = document.getElementById('react-fab');
                    if (rf) rf.classList.toggle('hidden', cur > _upLastScroll && cur > 40);
                    _upLastScroll = cur;
                }, { passive: true });
            }
        } else {
            reactFab.classList.add('hidden');
            reactFab.classList.remove('carousel-open');
        }
    }
    if (view === 'profile') {
        closeUserProfileOverlays();
        const username = (document.getElementById('addUsername')?.textContent || '').trim();
        if (username) {
            const pImg = document.getElementById('profileImg');
            const saved = localStorage.getItem(`profilePhotoUrl_${username}`);
            if (pImg && saved) {
                const current = pImg.src || '';
                const normalizedSaved = saved.startsWith('http') 
                    ? saved 
                    : new URL(saved, window.location.origin).href;
                if (current !== normalizedSaved) {
                    pImg.src = saved;
                }
            }
        }
        loadSpaceTab();
    }
};

const _REACT_DEFAULT_EMOJIS = ['🔥','❤️','😂','👏','😮','🎬','⭐','🤩','💀'];

function _getReactData() {
    try { return JSON.parse(localStorage.getItem('cinemi_reactData') || '{}'); } catch { return {}; }
}
function _saveReactData(d) {
    try { localStorage.setItem('cinemi_reactData', JSON.stringify(d)); } catch {}
}

let _reactCarouselOpen = false;

function showReactCarousel() {
    const fab = document.getElementById('react-fab');
    const wrap = document.getElementById('react-carousel-wrap');
    if (!wrap) return;
    _reactCarouselOpen = true;
    if (fab) fab.classList.add('carousel-open');
    setTimeout(() => {
        wrap.classList.add('visible');
        const track = document.getElementById('react-carousel-track');
        if (track) requestAnimationFrame(() => {
            const trackRect = track.getBoundingClientRect();
            const centerX = trackRect.left + trackRect.width / 2;
            [...track.children].forEach(el => {
                const r = el.getBoundingClientRect();
                const dist = Math.abs((r.left + r.width / 2) - centerX);
                const t = Math.min(dist / (trackRect.width * 0.38), 1);
                el.style.setProperty('--lift', `${Math.round(18 * Math.pow(t, 1.7))}px`);
                el.style.setProperty('--scale', (1.42 - t * 0.26).toFixed(2));
            });
        });
    }, 160);
}

function hideReactCarousel(restoreButton) {
    const wrap = document.getElementById('react-carousel-wrap');
    const fab = document.getElementById('react-fab');
    _reactCarouselOpen = false;
    if (wrap) wrap.classList.remove('visible');
    if (fab) {
        fab.classList.remove('carousel-open');
        if (restoreButton === false) {
            fab.classList.add('hidden');
        }
    }
}

function _initReactFabGestures() {
    const wrap = document.getElementById('react-carousel-wrap');
    const fab = document.getElementById('react-fab');

    if (wrap && !wrap.dataset.swipeBound) {
        wrap.dataset.swipeBound = '1';
        let startY = 0;
        wrap.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
        wrap.addEventListener('touchend', e => {
            if (e.changedTouches[0].clientY - startY > 55) hideReactCarousel(true);
        }, { passive: true });
    }

    if (fab && !fab.dataset.swipeBound) {
        fab.dataset.swipeBound = '1';
        let startY = 0;
        fab.addEventListener('touchstart', e => { startY = e.touches[0].clientY; }, { passive: true });
        fab.addEventListener('touchend', e => {
            if (e.changedTouches[0].clientY - startY > 35) hideReactCarousel(false);
        }, { passive: true });
    }
}

function initReactCarousel(targetUsername) {
    const wrap = document.getElementById('react-carousel-wrap');
    const track = document.getElementById('react-carousel-track');
    if (!wrap || !track) return;

    const data = _getReactData();
    const mostUsed = data.mostUsed || {};
    const customItems = data.customItems || [];

    const sorted = [..._REACT_DEFAULT_EMOJIS].sort((a, b) => (mostUsed[b] || 0) - (mostUsed[a] || 0));
    const allItems = [
        { type: 'custom' },
        ...sorted.map(e => ({ type: 'emoji', value: e })),
        ...customItems.map(c => ({ type: 'custom-emoji', ...c }))
    ];

    track.innerHTML = '';

    allItems.forEach((item) => {
        const el = document.createElement('div');
        el.className = 'react-item';

        const badge = document.createElement('span');
        badge.className = 'react-hold-badge';
        badge.textContent = 'x1';
        el.appendChild(badge);

        if (item.type === 'custom') {
            el.classList.add('react-item-custom');
            el.insertAdjacentHTML('beforeend', `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M142-74q-29 0-48.5-19.5T74-142v-123q0-26.86 10.2-52.01Q94.39-342.16 114-362l497.32-497.32Q624-873 641.47-879.5 658.93-886 677-886q17.74 0 34.87 6.5T744-860l117 115q14 14 20 31.48 6 17.49 6 36.47 0 18.05-6.5 35.55Q874-624 860-611L364-114q-19.84 19.61-44.99 29.8Q293.86-74 267-74H142Zm537-548 57-55-58-58-57 56 58 57Z"/></svg>`);
            el.addEventListener('pointerdown', e => { e.stopPropagation(); openCustomReactModal(); });
        } else {
            const span = document.createElement('span');
            span.className = 'react-emoji-inner';

            if (item.type === 'custom-emoji') {
                el.classList.add('react-item-custom-text');
                span.textContent = item.text;
                span.style.color = item.textColor || '#fff';
                span.style.fontSize = item.text.length > 5 ? '29px' : '36px';
                span.style.fontWeight = '800';
                const bc = item.borderColor || '#ffffff';
                span.style.textShadow = `-1px -1px 0 ${bc}, 1px -1px 0 ${bc}, -1px 1px 0 ${bc}, 1px 1px 0 ${bc}, 0 0 6px ${bc}`;
                const style = { textShadow: span.style.textShadow, color: item.textColor || '#fff', fontSize: span.style.fontSize };
                el.appendChild(span);
                _attachHoldReact(el, badge, item.text, targetUsername, style);
            } else {
                span.textContent = item.value;
                el.appendChild(span);
                _attachHoldReact(el, badge, item.value, targetUsername, null);
            }
        }

        track.appendChild(el);
    });

    const updateArc = () => {
        const trackRect = track.getBoundingClientRect();
        const centerX = trackRect.left + trackRect.width / 2;

        [...track.children].forEach((el) => {
            const r = el.getBoundingClientRect();
            const itemCenter = r.left + r.width / 2;
            const dist = Math.abs(itemCenter - centerX);
            const t = Math.min(dist / (trackRect.width * 0.38), 1);
            const lift = Math.round(18 * Math.pow(t, 1.7));
            const scale = (1.42 - t * 0.26).toFixed(2);

            el.style.setProperty('--lift', `${lift}px`);
            el.style.setProperty('--scale', scale);
            el.style.zIndex = String(Math.round((1 - t) * 100));
        });
    };

    if (!track.dataset.arcBound) {
        track.dataset.arcBound = '1';
        track.addEventListener('scroll', () => requestAnimationFrame(updateArc), { passive: true });
        window.addEventListener('resize', () => requestAnimationFrame(updateArc));
    }

    requestAnimationFrame(() => {
        updateArc();
        if (_reactCarouselOpen) {
            requestAnimationFrame(() => wrap.classList.add('visible'));
        }
    });
}

let _holdTimer = null;
let _holdCount = 0;
let _holdActive = false;

function _attachHoldReact(el, badge, emoji, targetUsername, style) {
    let holding = false;

    const onStart = (e) => {
        e.preventDefault();
        holding = true;
        _holdActive = true;
        _holdCount = 0;
        badge.textContent = 'x1';
        badge.classList.add('show');
        el.style.transform = 'scale(0.92)';
        _holdTimer = setInterval(() => {
            if (!holding) return;
            _holdCount++;
            const c = Math.min(_holdCount + 1, 100);
            badge.textContent = `x${c}`;
            if (c === 100) {
                badge.classList.remove('pulse');
                void badge.offsetWidth;
                badge.classList.add('pulse');
            }
        }, 80);
    };

    const onEnd = () => {
        if (!holding) return;
        holding = false;
        _holdActive = false;
        clearInterval(_holdTimer);
        badge.classList.remove('show');
        el.style.transform = '';
        const count = Math.min(_holdCount + 1, 100);
        _sendReaction(emoji, count, targetUsername, style);
        _trackReactUsage(emoji);
    };

    el.addEventListener('pointerdown', onStart);
    el.addEventListener('pointerup', onEnd);
    el.addEventListener('pointercancel', onEnd);
    el.addEventListener('pointerleave', onEnd);
    el.addEventListener('contextmenu', e => e.preventDefault());
}

function _trackReactUsage(emoji) {
    const data = _getReactData();
    if (!data.mostUsed) data.mostUsed = {};
    data.mostUsed[emoji] = (data.mostUsed[emoji] || 0) + 1;
    _saveReactData(data);
}

function _sendReaction(emoji, count, targetUsername, style) {
    const imgEl = document.getElementById('userProfileImg');
    if (!imgEl) return;
    const rect = imgEl.getBoundingClientRect();
    const spawns = Math.min(count, 18);
    for (let i = 0; i < spawns; i++) {
        const side = Math.floor(Math.random() * 4);
        let cx, cy;
        switch (side) {
            case 0:
                cx = rect.left + Math.random() * rect.width;
                cy = rect.top;
                break;
            case 1:
                cx = rect.right;
                cy = rect.top + Math.random() * rect.height;
                break;
            case 2:
                cx = rect.left + Math.random() * rect.width;
                cy = rect.bottom;
                break;
            case 3:
                cx = rect.left;
                cy = rect.top + Math.random() * rect.height;
                break;
        }
        cx += (Math.random() - 0.5) * 8;
        cy += (Math.random() - 0.5) * 8;

        setTimeout(() => _spawnFloatEmoji(emoji, cx, cy, style), i * 55);
    }
    _placeReactionOnProfile(emoji, style);
}

const _PERSIST_POSITIONS = [
    { top: '8px', right: '8px' },
    { bottom: '8px', right: '8px' },
    { bottom: '8px', left: '8px' },
    { top: '8px', left: '8px' },
    { top: '50%', right: '10px', transform: 'translateY(-50%)' },
    { top: '50%', left: '10px', transform: 'translateY(-50%)' },
    { top: '10px', left: '50%', transform: 'translateX(-50%)' },
    { bottom: '10px', left: '50%', transform: 'translateX(-50%)' },
];

function _placeReactionOnProfile(emoji, style) {
    const imgEl = document.getElementById('userProfileImg');
    if (!imgEl) return;
    const wrap = imgEl.closest('.p-img-wrap');
    if (!wrap) return;

    const existing = wrap.querySelector('.profile-reaction-persist');

    const angle = (Math.random() * Math.PI * 1.4) + Math.PI * 0.3;
    const r = 47;
    const cx = 50 + r * Math.cos(angle);
    const cy = 50 + r * Math.sin(angle);

    function applyStyle(el) {
        if (style && style.textShadow) {
            el.style.textShadow = style.textShadow;
            el.style.color = style.color || '#fff';
            el.style.fontSize = style.fontSize || '28px';
            el.style.fontWeight = '800';
            el.style.filter = '';
        } else {
            el.style.textShadow = '-1.5px -1.5px 0 #fff, 1.5px -1.5px 0 #fff, -1.5px 1.5px 0 #fff, 1.5px 1.5px 0 #fff, 0 2px 10px rgba(0,0,0,0.65)';
            el.style.color = '';
            el.style.fontSize = '43px';
            el.style.fontWeight = '';
            el.style.filter = '';
        }
    }

    if (existing) {
        existing.style.transform = (existing.style.transform || 'translate(-50%, -50%)') + ' scale(0) rotate(25deg)';
        existing.style.opacity = '0';
        setTimeout(() => {
            existing.textContent = emoji;
            existing.style.top = cy + '%';
            existing.style.left = cx + '%';
            existing.style.right = '';
            existing.style.bottom = '';
            existing.style.transform = 'translate(-50%, -50%)';
            applyStyle(existing);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                existing.style.opacity = '1';
            }));
        }, 230);
    } else {
        const el = document.createElement('span');
        el.className = 'profile-reaction-persist';
        el.textContent = emoji;
        el.style.left = cx + '%';
        el.style.top = cy + '%';
        el.style.transform = 'translate(-50%, -50%) scale(0)';
        applyStyle(el);
        wrap.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'translate(-50%, -50%) scale(1)';
        }));
    }
}
function _spawnFloatEmoji(emoji, cx, cy, style) {
    const el = document.createElement('span');
    el.className = 'float-react-emoji';
    el.textContent = emoji;
    if (style && style.textShadow) {
        el.style.textShadow = style.textShadow;
        el.style.color = style.color || '#fff';
        el.style.fontSize = style.fontSize || '22px';
        el.style.fontWeight = '800';
    }
    const angle = Math.random() * Math.PI * 2;
    const dist = 70 + Math.random() * 90;
    el.style.setProperty('--fx', (Math.cos(angle) * dist) + 'px');
    el.style.setProperty('--fy', (Math.sin(angle) * dist - 30) + 'px');
    el.style.left = (cx - 13) + 'px';
    el.style.top = (cy - 13) + 'px';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1100);
}

function openCustomReactModal() {
    const modal = document.getElementById('custom-react-modal');
    if (!modal) return;
    document.getElementById('crm-emoji-input').value = '';
    document.getElementById('crm-border-color').value = '#ffffff';
    document.getElementById('crm-text-color').value = '#ffffff';
    document.getElementById('crm-border-swatch').style.background = '#ffffff';
    document.getElementById('crm-text-swatch').style.background = '#ffffff';
    _updateCrmPreview();
    modal.classList.add('open');
}

function closeCrmModal() {
    document.getElementById('custom-react-modal')?.classList.remove('open');
}

function _updateCrmPreview() {
    const text = document.getElementById('crm-emoji-input').value || '?';
    const borderColor = document.getElementById('crm-border-color').value;
    const textColor = document.getElementById('crm-text-color').value;
    const preview = document.getElementById('crm-preview-item');
    if (!preview) return;
    preview.textContent = text;
    preview.style.borderColor = borderColor;
    preview.style.color = textColor;
    preview.style.fontSize = text.length > 2 ? '16px' : '28px';
    document.getElementById('crm-border-swatch').style.background = borderColor;
    document.getElementById('crm-text-swatch').style.background = textColor;
}

function saveCrmReact() {
    const text = document.getElementById('crm-emoji-input').value.trim();
    if (!text) return;
    const borderColor = document.getElementById('crm-border-color').value;
    const textColor = document.getElementById('crm-text-color').value;
    const data = _getReactData();
    if (!data.customItems) data.customItems = [];
    data.customItems = data.customItems.filter(c => c.text !== text);
    data.customItems.unshift({ text, borderColor, textColor });
    if (data.customItems.length > 5) data.customItems.pop();
    _saveReactData(data);
    closeCrmModal();
    _reactCarouselOpen = true;
    initReactCarousel(currentViewedUser);
}

const _SC_PRESETS = [
    { grad: 'linear-gradient(145deg, #0d0d1a 0%, #302b63 50%, #0d0d1a 100%)', qrFg: '#302b63' },
    { grad: 'linear-gradient(145deg, #1a0000 0%, #c0392b 50%, #1a0000 100%)', qrFg: '#c0392b' },
    { grad: 'linear-gradient(145deg, #000428 0%, #004e92 50%, #000428 100%)', qrFg: '#004e92' },
    { grad: 'linear-gradient(145deg, #1a0010 0%, #8e0057 50%, #1a0010 100%)', qrFg: '#8e0057' },
    { grad: 'linear-gradient(145deg, #0a1a0a 0%, #1e7e34 50%, #0a1a0a 100%)', qrFg: '#1e7e34' },
    { grad: 'linear-gradient(145deg, #1a1000 0%, #7d5200 50%, #1a1000 100%)', qrFg: '#7d5200' },
];

const _SC_STICKER_POOL = [
  '🎬','🎥','🍿','🎞️','🎭','📽️','🎦','🎟️',
  '⭐','🌟','✨','💫','🔥','❤️','💔','😍',
  '😢','😱','😂','😎','😡','😮',
  '🏆','🎖️','👏','🎯'
];

let _scCurrentPreset = 0;
let _scCustomColor = null;
let _scStickers = [];

function _scRandBetween(a, b) { return a + Math.random() * (b - a); }

function _generateStickers(count) {
    const card = document.getElementById('share-card');
    if (!card) return;

    card.querySelectorAll('.sc-sticker').forEach(el => el.remove());

    const pool = [..._SC_STICKER_POOL].sort(() => Math.random() - 0.5);
    const chosen = pool.slice(0, count);
    _scStickers = [];

    const zones = [
        { xMin: 3,  xMax: 22, yMin: 5,  yMax: 35 },
        { xMin: 78, xMax: 90, yMin: 5,  yMax: 35 },
        { xMin: 3,  xMax: 22, yMin: 62, yMax: 88 },
        { xMin: 78, xMax: 96, yMin: 62, yMax: 88 },
    ];

    const placed = [];
    const minDist = 20;
    const maxAttempts = 30;

    function isFarEnough(x, y) {
        for (const p of placed) {
            const dx = x - p.x;
            const dy = y - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) return false;
        }
        return true;
    }

    chosen.forEach((emoji, i) => {
        const zone = zones[i % zones.length];

        let x = 0;
        let y = 0;
        let attempts = 0;

        do {
            x = _scRandBetween(zone.xMin, zone.xMax);
            y = _scRandBetween(zone.yMin, zone.yMax);
            attempts++;
        } while (!isFarEnough(x, y) && attempts < maxAttempts);

        placed.push({ x, y });

        const rot = _scRandBetween(-18, 18);
        const scale = _scRandBetween(0.68, 0.82);
        const delay = i * 45;

        const el = document.createElement('span');
        el.className = 'sc-sticker';
        el.textContent = emoji;
        el.style.left = x + '%';
        el.style.top = y + '%';
        el.style.setProperty('--sc-rot', `rotate(${rot}deg)`);
        el.style.setProperty('--sc-scale', scale);
        el.style.transform = `rotate(${rot}deg) scale(${scale})`;
        el.style.opacity = '0';
        el.style.animationDelay = delay + 'ms';

        card.appendChild(el);
        _scStickers.push({ el, rot, scale });

        setTimeout(() => {
            el.classList.add('animate');
            el.style.opacity = '1';
        }, delay);
    });
}

function _applyPresetToCard(preset) {
    const card = document.getElementById('share-card');
    if (!card) return;
    card.style.background = preset.grad;

    const qrWrap = document.getElementById('sc-qr-wrap');
    if (qrWrap) {
        qrWrap.innerHTML = '';
        const username = (document.getElementById('addUsername')?.textContent || '').trim();
        const url = `${window.location.origin}?u=${encodeURIComponent(username)}`;
        if (typeof QRCode !== 'undefined') {
            new QRCode(qrWrap, {
                text: url,
                width: 100,
                height: 100,
                colorDark: preset.qrFg,
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.M
            });
        }
    }
}

function setSharePreset(idx, btn) {
    _scCurrentPreset = idx;
    _scCustomColor = null;
    document.querySelectorAll('.sc-preset-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    _applyPresetToCard(_SC_PRESETS[idx]);
}

function setShareCustomColor(hex) {
    _scCustomColor = hex;
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    const dark = `rgba(${Math.round(r*0.15)},${Math.round(g*0.15)},${Math.round(b*0.15)},1)`;
    const mid = hex;
    const customPreset = {
        grad: `linear-gradient(145deg, ${dark} 0%, ${mid} 50%, ${dark} 100%)`,
        qrFg: hex
    };
    document.querySelectorAll('.sc-preset-btn').forEach(b => b.classList.remove('active'));
    _applyPresetToCard(customPreset);
}

function shuffleShareStickers() {
    _generateStickers(6);
}

function openShareCard() {
    const overlay = document.getElementById('share-card-overlay');
    if (!overlay) return;

    const username = (document.getElementById('addUsername')?.textContent || '').trim();
    const pfpSrc = document.getElementById('profileImg')?.src || '';

    document.getElementById('sc-tag').textContent = '@' + username;

    const scPfp = document.getElementById('sc-pfp');
    scPfp.src = pfpSrc;

    _scCurrentPreset = 0;
    _scCustomColor = null;
    document.querySelectorAll('.sc-preset-btn').forEach((b, i) => b.classList.toggle('active', i === 0));

    _applyPresetToCard(_SC_PRESETS[0]);
    _generateStickers(6);

    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
}

async function _buildShareBlob() {
    const card = document.getElementById('share-card');
    const canvas = await html2canvas(card, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
    });
    return new Promise(res => canvas.toBlob(res, 'image/png', 1));
}

async function shareToInstagram() {
    const username = (document.getElementById('addUsername')?.textContent || 'user').trim();
    const btn = document.querySelector('.sc-insta-btn');
    if (btn) { btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }
    try {
        const blob = await _buildShareBlob();
        const file = new File([blob], `cinemi-${username}.png`, { type: 'image/png' });
        const isAndroid = /android/i.test(navigator.userAgent);
        const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        if ((isAndroid || isIOS) && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'My Cinemi Profile' });
        } else if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'My Cinemi Profile' });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cinemi-${username}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch (err) { if (err.name !== 'AbortError') console.error(err); }
    if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
}

async function shareMore() {
    const username = (document.getElementById('addUsername')?.textContent || 'user').trim();
    const appUrl = window.location.origin;
    const text = `Join me on Cinemi 🎬\nDiscover and share movies with friends!\n${appUrl}`;
    const btn = document.querySelector('.sc-more-btn');
    if (btn) { btn.style.opacity = '0.6'; btn.style.pointerEvents = 'none'; }
    try {
        const blob = await _buildShareBlob();
        const file = new File([blob], `cinemi-${username}.png`, { type: 'image/png' });
        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Join me on Cinemi', text });
        } else if (navigator.share) {
            await navigator.share({ title: 'Join me on Cinemi', text, url: appUrl });
        } else {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cinemi-${username}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }
    } catch (err) { if (err.name !== 'AbortError') console.error(err); }
    if (btn) { btn.style.opacity = ''; btn.style.pointerEvents = ''; }
}

function closeShareCard() {
    const overlay = document.getElementById('share-card-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
}
