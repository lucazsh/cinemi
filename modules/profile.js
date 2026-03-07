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
    renderSpace();

    function animateImgs(container, imgs, isNew) {
        if (!container) return;
        imgs.forEach((img, i) => {
            img.style.opacity = '0';
            img.style.transform = isNew ? 'translateY(10px) scale(0.96)' : 'translateY(0) scale(1)';
            img.style.transition = `opacity 0.35s ease ${i * 0.06}s, transform 0.35s ease ${i * 0.06}s`;
            container.appendChild(img);
            requestAnimationFrame(() => requestAnimationFrame(() => {
                img.style.opacity = '1';
                img.style.transform = 'translateY(0) scale(1)';
            }));
        });
    }

    async function loadSection(key, fetchFn, rowId, buildImg) {
        const row = document.getElementById(rowId);
        if (!row) return;

        const cacheKey = 'space_ids_' + key;
        const cachedIds = JSON.parse(localStorage.getItem(cacheKey) || '[]');

        let items = [];
        try { items = await fetchFn(); } catch(e) { return; }
        if (!items || items.length === 0) {
            row.innerHTML = '<div style="padding:10px;color:var(--text-secondary);font-size:13px;">Nothing here yet.</div>';
            window._spaceImgCache[key] = '';
            localStorage.setItem(cacheKey, '[]');
            return;
        }

        const newIds = items.map(m => m.movieId || m.id);
        const freshIds = newIds.filter(id => !cachedIds.includes(String(id)));

        if (cachedIds.length === 0 || (row.children.length <= 1 && !row.querySelector('img'))) {
            row.innerHTML = '';
            const imgs = items.slice(0, 6).map(m => buildImg(m, true));
            animateImgs(row, imgs, true);
        } else {
            items.slice(0, 6).forEach((m, i) => {
                const existing = row.querySelectorAll('img')[i];
                if (!existing) {
                    const img = buildImg(m, false);
                    img.style.opacity = '0';
                    img.style.transform = 'scale(0.9)';
                    img.style.transition = `opacity 0.4s ease ${i * 0.05}s, transform 0.4s ease ${i * 0.05}s`;
                    row.appendChild(img);
                    requestAnimationFrame(() => requestAnimationFrame(() => {
                        img.style.opacity = '1';
                        img.style.transform = 'scale(1)';
                    }));
                } else if (freshIds.includes(String(m.movieId || m.id))) {
                    const img = buildImg(m, false);
                    img.style.opacity = '0';
                    img.style.transition = 'opacity 0.5s ease';
                    existing.replaceWith(img);
                    requestAnimationFrame(() => requestAnimationFrame(() => { img.style.opacity = '1'; }));
                }
            });
        }

        window._spaceImgCache[key] = row.innerHTML;
        localStorage.setItem(cacheKey, JSON.stringify(newIds.map(String)));
    }

    function makeMovieImg(m, posterPath, id, isNew) {
        const img = document.createElement('img');
        img.src = `${IMG}${posterPath}`;
        img.onclick = () => showMovieDetails(String(id));
        img.onerror = function() { this.style.display = 'none'; };
        return img;
    }

    loadSection('favs', loadFavorites, 'space-favs-row', (m) => makeMovieImg(m, m.posterPath, m.movieId));
    loadSection('watchlist', loadWatchlist, 'space-watchlist-row', (m) => makeMovieImg(m, m.posterPath, m.movieId));

    const genreDefs = [
        { id: 878, cacheKey: 'genre-878' },
        { id: 18,  cacheKey: 'genre-18'  },
        { id: 53,  cacheKey: 'genre-53'  }
    ];

    genreDefs.forEach(g => {
        loadSection(
            g.cacheKey,
            async () => {
                const res = await fetch(`${baseUrl}/api/tmdb/discover/genre/${g.id}`, { headers: ngrokHeaders });
                const data = await res.json();
                return (data.results || []).slice(0, 6).map(m => ({ movieId: m.id, posterPath: m.poster_path, id: m.id }));
            },
            `space-genre-${g.id}`,
            (m) => makeMovieImg(m, m.posterPath, m.id || m.movieId)
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
