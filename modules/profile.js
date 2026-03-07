const img_input = document.getElementById('img_input');

if (img_input) {
    img_input.addEventListener('change', async function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = async function(event) {
            const img = new Image();
            img.onload = async function() {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = Math.min(img.width, img.height);

                canvas.width = size;
                canvas.height = size;

                const startX = (img.width - size) / 2;
                const startY = (img.height - size) / 2;
                ctx.drawImage(img, startX, startY, size, size, 0, 0, size, size);
                
                canvas.toBlob(async function(blob) {
                    const formData = new FormData();
                    formData.append('photo', blob, 'profile.jpg');
                    
                    const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
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
                        
                        profileImg.src = result.photoUrl;
                        profileImg.style.opacity = '1';
                        
                        updateAllProfilePhotos(username, result.photoUrl);
                        
                        try {
                            localStorage.setItem(`profilePhotoUrl_${username}`, result.photoUrl);
                        } catch(err) {}

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
        const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
        const savedPhotoUrl = localStorage.getItem(`profilePhotoUrl_${username}`);
        if (savedPhotoUrl) {
            document.getElementById('profileImg').src = savedPhotoUrl;
            console.log('Loaded saved profile photo for', username);
        }
    } catch(err) {
        console.log('Could not load:', err);
    }
}

async function updateMyFriendsCount() {
    const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
    
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
        
        document.getElementById('friendsCount').textContent = `${totalFriends} friend${totalFriends !== 1 ? 's' : ''}`;
    } catch (err) {
        console.error('Failed to update friends count:', err);
    }
}

async function showFriendsPanel() {
const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
const panel = document.getElementById('friends-panel');
const sheet = panel.querySelector('.sheet');

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
    
    sheet.innerHTML = `
    <h2>Friends (${totalFriends})</h2>
    <div style="max-height:60vh; overflow-y:auto; margin:20px 0;">
        ${followers.length > 0 ? `
        <div style="margin-bottom:20px;">
            <h3 style="font-size:16px; margin-bottom:10px;">Followers (${followers.length})</h3>
            ${followers.map(f => `
            <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center; cursor:pointer;" onclick="closePanel('friends'); viewUserProfile('${f.username}')">
                <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
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
                <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
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
        
        const followBtn = document.getElementById('followBtn');
        if (followData.isFollowing) {
            followBtn.textContent = 'Unfollow';
            followBtn.style.background = 'var(--iconbox-bg)';
            followBtn.style.color = 'var(--text-primary)';
            followBtn.style.border = '1px solid var(--border-dark-alpha-2)';
        } else {
            followBtn.textContent = 'Follow';
            followBtn.style.background = 'var(--button-bg)';
            followBtn.style.color = 'var(--button-text)';
            followBtn.style.border = 'none';
        }
        
        showView('user-profile');
    } catch (err) {
        console.error('Failed to load user profile:', err);
    }
}

document.getElementById('followBtn').onclick = async function() {
    if (!currentViewedUser) return;
    
    const isFollowing = this.textContent === 'Unfollow';
    
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/user/${currentViewedUser}/follow`, {
            method: isFollowing ? 'DELETE' : 'POST'
        });
        
        if (!res.ok) throw new Error('Failed');
        
        if (isFollowing) {
            this.textContent = 'Follow';
            this.style.background = 'var(--button-bg)';
            this.style.color = 'var(--button-text)';
            this.style.border = 'none';
        } else {
            this.textContent = 'Unfollow';
            this.style.background = 'var(--iconbox-bg)';
            this.style.color = 'var(--text-primary)';
            this.style.border = '1px solid var(--border-dark-alpha-2)';
        }
    } catch (err) {
        console.error('Follow error:', err);
    }
};

document.getElementById('messageBtn').onclick = function() {
    alert('Messaging feature coming soon!');
};

async function openUserPanel(panelType) {
    if (!currentViewedUser) return;
    
    if (panelType === 'friends') {
        const panel = document.getElementById('user-friends-panel');
        const sheet = panel.querySelector('.sheet');
        
        panel.style.display = 'flex';
        requestAnimationFrame(() => panel.classList.add('open'));
        
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
                        <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
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
                        <img src="${f.photoUrl}" style="width:40px; height:40px; border-radius:50%; object-fit:cover;">
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
    
    panel.style.display = 'flex';
    requestAnimationFrame(() => panel.classList.add('open'));
    
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

async function reportUser(username) {
    if (!username) return;
    
    const reason = prompt('Why are you reporting this user?');
    if (!reason || !reason.trim()) return;
    
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/report/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                reportedUsername: username,
                reason: reason.trim()
            })
        });
        
        if (!res.ok) throw new Error('Failed to report');
        
        alert('Report submitted. Thank you.');
    } catch (err) {
        console.error('Report error:', err);
        alert('Failed to submit report.');
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
    if (username && username !== (document.getElementById('addUsername')?.value || 'user_tag').trim()) viewUserProfile(username);
    return;
  }

  const prImg = e.target.closest('.pr-img');
  if (prImg && prImg.dataset && prImg.dataset.username) {
    const username = prImg.dataset.username;
    if (username && username !== (document.getElementById('addUsername')?.value || 'user_tag').trim()) viewUserProfile(username);
    return;
  }
});

function switchProfileTab(tab, btn) {
    document.querySelectorAll('#profile .tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('profile-tab-space').style.display = tab === 'space' ? 'block' : 'none';
    document.getElementById('profile-tab-other').style.display = tab === 'other' ? 'block' : 'none';
}

async function loadSpaceTab() {
    const IMG = 'https://image.tmdb.org/t/p/w300';

    const savedQuote = localStorage.getItem('space_quote') || 'Get busy living, or get busy dying.';
    const savedSource = localStorage.getItem('space_quote_source') || 'The Shawshank Redemption, 1994';
    state.quoteText = savedQuote;
    state.quoteSource = savedSource;

    function buildImg(posterPath, id) {
        const img = document.createElement('img');
        img.src = `${IMG}${posterPath}`;
        img.style.opacity = '1';
        img.onclick = () => showMovieDetails(String(id));
        img.onerror = function() { this.style.display = 'none'; };
        return img;
    }

    function injectCached(rowId, items, layoutOverride) {
        if (!items || !items.length) return;
        window._spaceImgCache[rowId] = items;
        const row = document.getElementById(rowId);
        if (!row) return;
        row.innerHTML = '';
        items.forEach(m => row.appendChild(buildImg(m.posterPath, m.id)));
    }

    function restoreFromCache() {
        Object.keys(window._spaceImgCache).forEach(key => {
            const items = window._spaceImgCache[key];
            if (!Array.isArray(items)) return;
            const row = document.getElementById('space-' + key);
            if (!row) return;
            row.innerHTML = '';
            items.forEach(m => row.appendChild(buildImg(m.posterPath, m.id)));
        });
        ['genre-878','genre-18','genre-53'].forEach(gKey => {
            const items = window._spaceImgCache[gKey];
            if (!Array.isArray(items)) return;
            const row = document.getElementById('space-' + gKey);
            if (!row) return;
            row.innerHTML = '';
            items.forEach(m => row.appendChild(buildImg(m.posterPath, m.id)));
        });
    }

    renderSpace();
    restoreFromCache();

    async function loadAndAnimate(rowId, fetchFn, cacheKey, toItems) {
        let items;
        try { items = await fetchFn(); } catch(e) { return; }
        if (!items) return;

        const mapped = toItems(items);
        const row = document.getElementById(rowId);
        if (!row) return;

        const prev = window._spaceImgCache[cacheKey] || [];
        const prevIds = prev.map(m => String(m.id));
        const newIds = mapped.map(m => String(m.id));
        const isFirstLoad = prev.length === 0;

        window._spaceImgCache[cacheKey] = mapped;
        try {
            localStorage.setItem('space_data_' + cacheKey, JSON.stringify(mapped));
        } catch(e) {}

        if (mapped.length === 0) {
            row.innerHTML = '<div style="padding:10px;color:var(--text-secondary);font-size:13px;">Nothing here yet.</div>';
            return;
        }

        if (isFirstLoad) {
            row.innerHTML = '';
            mapped.forEach((m, i) => {
                const img = buildImg(m.posterPath, m.id);
                img.style.opacity = '0';
                img.style.transform = 'translateY(8px)';
                img.style.transition = `opacity 0.3s ease ${i * 0.06}s, transform 0.3s ease ${i * 0.06}s`;
                row.appendChild(img);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    img.style.opacity = '1';
                    img.style.transform = 'translateY(0)';
                    setTimeout(() => { img.style.transition = ''; img.style.transform = ''; }, 400 + i * 60);
                }));
            });
        } else {
            const freshIds = newIds.filter(id => !prevIds.includes(id));
            const existingImgs = row.querySelectorAll('img');

            mapped.forEach((m, i) => {
                if (freshIds.includes(String(m.id))) {
                    const img = buildImg(m.posterPath, m.id);
                    img.style.opacity = '0';
                    img.style.transition = 'opacity 0.4s ease';
                    if (existingImgs[i]) {
                        existingImgs[i].replaceWith(img);
                    } else {
                        row.appendChild(img);
                    }
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        img.style.opacity = '1';
                        setTimeout(() => { img.style.transition = ''; }, 450);
                    }));
                }
            });
        }
    }

    ['genre-878','genre-18','genre-53','favs','watchlist'].forEach(key => {
        try {
            const saved = localStorage.getItem('space_data_' + key);
            if (saved && !window._spaceImgCache[key]) {
                window._spaceImgCache[key] = JSON.parse(saved);
            }
        } catch(e) {}
    });

    restoreFromCache();

    loadAndAnimate('space-favs-row', loadFavorites, 'favs',
        items => items.map(m => ({ id: m.movieId, posterPath: m.posterPath })));

    loadAndAnimate('space-watchlist-row', loadWatchlist, 'watchlist',
        items => items.map(m => ({ id: m.movieId, posterPath: m.posterPath })));

    [
        { genreId: 878, key: 'genre-878' },
        { genreId: 18,  key: 'genre-18'  },
        { genreId: 53,  key: 'genre-53'  }
    ].forEach(g => {
        loadAndAnimate(
            `space-genre-${g.genreId}`,
            async () => {
                const res = await fetch(`${baseUrl}/api/tmdb/discover/genre/${g.genreId}`, { headers: ngrokHeaders });
                const data = await res.json();
                return data.results || [];
            },
            g.key,
            items => items.slice(0, 6).map(m => ({ id: m.id, posterPath: m.poster_path }))
        );
    });
}

const _origShowView = window.showView;
window.showView = function(view) {
    if (_origShowView) _origShowView(view);
    const fab = document.getElementById('sp-fab');
    if (fab) {
        if (view === 'profile') fab.classList.remove('hidden');
        else fab.classList.add('hidden');
    }
    if (view === 'profile') loadSpaceTab();
};
