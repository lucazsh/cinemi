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
        const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
        const savedPhotoUrl = localStorage.getItem(`profilePhotoUrl_${username}`);
        if (savedPhotoUrl) {
            document.getElementById('profileImg').src = savedPhotoUrl;
            console.log('Loaded saved profile photo for', username);
        }
    } catch (err) {
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

        const fc = document.getElementById('friendsCount');
        if (fc) fc.textContent = `${totalFriends} friend${totalFriends !== 1 ? 's' : ''}`;
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

document.getElementById('followBtn').onclick = async function () {
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

document.getElementById('messageBtn').onclick = function () {
    alert('Messaging feature coming soon!');
};

async function openUserPanel(panelType) {
    if (!currentViewedUser) return;

    if (panelType === 'friends') {
        const panel = document.getElementById('user-friends-panel');
        const sheet = panel.querySelector('.sheet');
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
    if (_origShowView) _origShowView(view);
    const fab = document.getElementById('sp-fab');
    if (fab) {
        if (view === 'profile') fab.classList.remove('hidden');
        else fab.classList.add('hidden');
    }
    if (view === 'profile') loadSpaceTab();
};
