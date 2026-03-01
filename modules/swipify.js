let swipifyMovies = [];
let currentSwipifyIndex = 0;
let partyCode = null;
let partyRole = null;
let partyMatches = [];
let partyPollInterval = null;
let partyStarted = false;

(function injectStyles() {
    const s = document.createElement('style');
    s.textContent = `
        @keyframes matchPop { 
            0%{opacity:0;transform:translateY(-60px)} 
            60%{opacity:1;transform:translateY(10px)} 
            80%{transform:translateY(-4px)} 
            100%{transform:translateY(0)} 
        }
        @keyframes matchFadeOut { 
            0%,70%{opacity:1} 
            100%{opacity:0} 
        }
        @keyframes swCenterAppear { 
            0%{opacity:0;transform:translateY(18px)} 
            100%{opacity:1;transform:translateY(0)} 
        }
        .match-overlay { 
            animation: matchPop 0.6s ease forwards, matchFadeOut 2.8s ease forwards; 
        }
        .match-small{
            font-size:28px;
            font-weight:600;
            color: #46d369;
            letter-spacing:2px;
            margin-bottom:-10px;
        }
        .match-overlay .match-title {
            position: relative;
            font-size: 72px;
            font-weight: 900;
            font-style: italic;
            color: #46d369;
            letter-spacing: 3px;
            line-height: 1;
            text-transform: uppercase;
            -webkit-font-smoothing:antialiased;
            font-family: system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        .match-overlay .match-title::before,
        .match-overlay .match-title::after {
            content: "MATCH";
            position: absolute;
            left: 0;
            width: 100%;
            color: transparent;
            -webkit-text-stroke: 2px rgba(70,211,105,0.55);
            z-index: -1;
            pointer-events: none;
        }
        .match-overlay .match-title::before {
            top: 10px;
            -webkit-text-stroke-width: 2px;
            -webkit-text-stroke-color: rgba(70,211,105,0.55);
        }
        .match-overlay .match-title::after {
            top: 22px;
            -webkit-text-stroke-width: 1px;
            -webkit-text-stroke-color: rgba(70,211,105,0.30);
        }
        .match-overlay .match-subtitle {
            font-size: 17px;
            color: rgba(255,255,255,0.9);
            margin-top: 32px;
            padding: 0 32px;
            text-align: center;
            max-width: 720px;
            line-height: 1.3;
        }
        .party-code-display { font-size:38px;font-weight:900;letter-spacing:10px;color:var(--text-primary);background:var(--card-bg);border:2px solid var(--border-h);border-radius:16px;padding:18px 28px;text-align:center;cursor:pointer;transition:transform 0.15s; }
        .party-code-display:active { transform:scale(0.96); }
        .sw-btn-primary { width:100%;max-width:300px;padding:15px 24px;background:var(--button-bg);color:var(--button-text);border:none;border-radius:14px;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.15s,opacity 0.15s; }
        .sw-btn-primary:active { transform:scale(0.97);opacity:0.85; }
        .sw-btn-secondary { width:100%;max-width:300px;padding:15px 24px;background:var(--card-bg);color:var(--text-primary);border:1.5px solid var(--border-h);border-radius:14px;font-size:16px;font-weight:600;cursor:pointer;transition:transform 0.15s; }
        .sw-btn-secondary:active { transform:scale(0.97); }
        .sw-btn-ghost { background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:8px 16px;display:flex;align-items:center;gap:6px; }
        .sw-center { position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:28px;animation:swCenterAppear 0.45s cubic-bezier(0.22,1,0.36,1) both; }
        .sw-match-card { display:flex;align-items:center;gap:12px;padding:12px;background:var(--card-bg);border-radius:12px;border:1.5px solid var(--border-h); }
    `;
    document.head.appendChild(s);
})();

const BACK_ARROW = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="var(--text-primary)"><path d="m382-480 294 294q15 15 14.5 35T675-116q-15 15-35 15t-35-15L297-423q-12-12-18-27t-6-30q0-15 6-30t18-27l308-308q15-15 35.5-14.5T676-844q15 15 15 35t-15 35L382-480Z"/></svg> Back`;

function setSwipeButtonsVisible(visible) {
    const leftBtn = document.getElementById('swipe-left-btn');
    const rightBtn = document.getElementById('swipe-right-btn');
    if (leftBtn) leftBtn.style.display = visible ? '' : 'none';
    if (rightBtn) rightBtn.style.display = visible ? '' : 'none';
}

function openPanel(panelName) {
    const panel = document.getElementById(`${panelName}-panel`);
    if (!panel) return;
    panel.style.display = 'flex';
    requestAnimationFrame(() => panel.classList.add('open'));
    if (panelName === 'swipify') {
        loadSwipifyMovies(false);
        const leftBtn = document.getElementById('swipe-left-btn');
        const rightBtn = document.getElementById('swipe-right-btn');
        if (leftBtn) leftBtn.onclick = () => swipifyMovies[currentSwipifyIndex] && swipeCard('left', swipifyMovies[currentSwipifyIndex]);
        if (rightBtn) rightBtn.onclick = () => swipifyMovies[currentSwipifyIndex] && swipeCard('right', swipifyMovies[currentSwipifyIndex]);
    } else if (panelName === 'watchlist') {
        showWatchlistPanel();
    } else if (panelName === 'favorites') {
        showFavoritesPanel();
    }
    const backdrop = panel.querySelector('.backdrop');
    if (backdrop) backdrop.onclick = () => closePanel(panelName);
}

function closePanel(panelName) {
    const panel = document.getElementById(`${panelName}-panel`);
    if (panel) {
        panel.classList.remove('open');
        setTimeout(() => { panel.style.display = 'none'; }, 300);
        if (panelName === 'swipify') cleanupParty();
    }
}

function showPartyOptions() {
    setSwipeButtonsVisible(false);
    const container = document.getElementById('swipify-container');
    container.innerHTML = `<div class="sw-center"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">Party Mode</div><div style="font-size:13px;color:var(--text-secondary);text-align:center;max-width:260px;">Swipe together and find the movie everyone wants to watch.</div><button class="sw-btn-primary" onclick="createParty()">Create Party</button><button class="sw-btn-secondary" onclick="showJoinParty()">Join Party</button><button class="sw-btn-ghost" onclick="loadSwipifyMovies(false)">${BACK_ARROW}</button></div>`;
}

function showJoinParty() {
    setSwipeButtonsVisible(false);
    const container = document.getElementById('swipify-container');
    container.innerHTML = `<div class="sw-center"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">Join a Party</div><input id="party-code-input" placeholder="Enter code" maxlength="6" autocomplete="off" style="width:100%;max-width:280px;padding:14px;background:var(--card-bg);color:var(--text-primary);border:2px solid var(--border-h);border-radius:12px;font-size:26px;text-align:center;letter-spacing:8px;font-weight:800;outline:none;" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')"><button class="sw-btn-primary" onclick="joinParty()">Join Party</button><button class="sw-btn-ghost" onclick="showPartyOptions()">${BACK_ARROW}</button></div>`;
    setTimeout(() => document.getElementById('party-code-input')?.focus(), 100);
}

async function createParty() {
    partyCode = generatePartyCode();
    partyRole = 'host';
    partyStarted = false;
    partyMatches = [];
    try {
        await fetchWithAuth(`${baseUrl}/api/party/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: partyCode }) });
    } catch (e) {}
    showPartyLobby();
}

async function joinParty() {
    const input = document.getElementById('party-code-input');
    const code = input ? input.value.trim().toUpperCase() : '';
    if (code.length !== 6) { showToastMsg('Enter a valid 6-character code'); return; }
    partyCode = code;
    partyRole = 'guest';
    partyStarted = false;
    partyMatches = [];
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/party/join`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
        if (res && !res.ok) { showToastMsg('Party not found'); return; }
    } catch (e) {}
    showPartyLobby();
}

function generatePartyCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function showPartyLobby() {
    setSwipeButtonsVisible(false);
    const container = document.getElementById('swipify-container');
    const isHost = partyRole === 'host';
    container.innerHTML = `<div class="sw-center"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">Party Lobby</div><div style="font-size:13px;color:var(--text-secondary);">Share this code with your friends</div><div class="party-code-display" onclick="copyPartyCode()" title="Click to copy">${partyCode}</div><div style="font-size:12px;color:var(--text-secondary);">Click to copy</div><div id="party-members-label" style="font-size:14px;color:var(--text-secondary);">Waiting for members...</div>${isHost ? `<button class="sw-btn-primary" id="start-party-btn" onclick="startParty()">Start Party</button>` : `<div style="font-size:14px;color:var(--text-secondary);text-align:center;">Waiting for the host to start...</div>`}<button class="sw-btn-ghost" onclick="cleanupParty();loadSwipifyMovies(false);">${BACK_ARROW}</button></div>`;
    startLobbyPolling();
}

function copyPartyCode() {
    navigator.clipboard?.writeText(partyCode).then(() => showToastMsg('Code copied!')).catch(() => {});
}

function startLobbyPolling() {
    if (partyPollInterval) clearInterval(partyPollInterval);
    partyPollInterval = setInterval(async () => {
        if (!partyCode) return;
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/party/${partyCode}`);
            if (!res || !res.ok) return;
            const data = await res.json();
            const label = document.getElementById('party-members-label');
            if (label && data.members) label.textContent = `${data.members.length} member${data.members.length !== 1 ? 's' : ''} in party`;
            if (data.started && !partyStarted) {
                partyStarted = true;
                clearInterval(partyPollInterval);
                partyPollInterval = null;
                loadPartyMovies();
            }
        } catch (e) {}
    }, 2000);
}

async function startParty() {
    if (partyRole !== 'host') return;
    const btn = document.getElementById('start-party-btn');
    if (btn) { btn.disabled = true; btn.textContent = 'Starting...'; }

    const container = document.getElementById('swipify-container');
    container.innerHTML = `<div class="sw-center"><div style="font-size:16px;color:var(--text-secondary);">Loading movies...</div></div>`;

    try {
        const res = await fetchWithAuth(`${baseUrl}/api/content/recommend`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const movies = (data.content || []).filter(m => m.overview && (m.title || m.name));

        await fetchWithAuth(`${baseUrl}/api/party/set-movies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: partyCode, movies })
        });

        await fetchWithAuth(`${baseUrl}/api/party/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: partyCode })
        });

        partyStarted = true;
        swipifyMovies = movies;
        currentSwipifyIndex = 0;
        clearInterval(partyPollInterval);
        partyPollInterval = null;
        setSwipeButtonsVisible(false);
        renderSwipifyCard();
        startMatchPolling();
    } catch (e) {
        showToastMsg('Failed to load movies. Try again.');
        showPartyLobby();
    }
}

async function loadPartyMovies() {
    setSwipeButtonsVisible(false);
    const container = document.getElementById('swipify-container');
    container.innerHTML = `<div class="sw-center"><div style="font-size:16px;color:var(--text-secondary);">Loading movies...</div></div>`;
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/party/${partyCode}/movies`);
        if (!res || !res.ok) throw new Error();
        const data = await res.json();
        swipifyMovies = (data.movies || []).filter(m => m.overview && (m.title || m.name));
        currentSwipifyIndex = 0;
        renderSwipifyCard();
        startMatchPolling();
    } catch (e) {
        container.innerHTML = `<div class="sw-center"><div style="color:var(--text-primary);">Failed to load movies.</div><button class="sw-btn-primary" onclick="loadPartyMovies()">Retry</button></div>`;
    }
}

function cleanupParty() {
    partyCode = null;
    partyRole = null;
    partyMatches = [];
    partyStarted = false;
    if (partyPollInterval) { clearInterval(partyPollInterval); partyPollInterval = null; }
}

async function loadSwipifyMovies(isParty = false) {
    setSwipeButtonsVisible(false);
    const container = document.getElementById('swipify-container');
    const loading = document.getElementById('swipify-loading');
    container.innerHTML = '';
    if (loading) loading.style.display = 'flex';
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/content/recommend`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        swipifyMovies = (data.content || []).filter(m => m.overview && (m.title || m.name));
        currentSwipifyIndex = 0;
        if (loading) loading.style.display = 'none';
        if (swipifyMovies.length === 0) {
            container.innerHTML = `<div class="sw-center"><div style="font-size:18px;font-weight:600;color:var(--text-primary);">No content available</div><button class="sw-btn-primary" onclick="loadSwipifyMovies(false)">Retry</button></div>`;
            return;
        }
        setSwipeButtonsVisible(true);
        renderSwipifyCard();
    } catch (e) {
        if (loading) loading.style.display = 'none';
        container.innerHTML = `<div class="sw-center"><div style="color:var(--text-primary);">Failed to load content.</div><button class="sw-btn-primary" onclick="loadSwipifyMovies(false)">Retry</button></div>`;
    }
}

function startMatchPolling() {
    if (partyPollInterval) clearInterval(partyPollInterval);
    partyPollInterval = setInterval(async () => {
        if (!partyCode) return;
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/party/${partyCode}`);
            if (!res || !res.ok) return;
            const data = await res.json();
            if (data.matches) {
                const prevCount = partyMatches.length;
                partyMatches = data.matches;
                if (data.matches.length > prevCount) {
                    const newest = data.matches[data.matches.length - 1];
                    showMatchAnimation(newest.title);
                }
            }
            if (data.ended) { clearInterval(partyPollInterval); partyPollInterval = null; showPartyResults(); }
        } catch (e) {}
    }, 3000);
}

function renderSwipifyCard() {
    const container = document.getElementById('swipify-container');
    if (!swipifyMovies || swipifyMovies.length === 0 || currentSwipifyIndex >= swipifyMovies.length) {
        if (partyCode && partyStarted) { showPartyWaiting(); return; }
        container.innerHTML = `<div class="sw-center"><div style="font-size:18px;font-weight:600;color:var(--text-primary);">No more movies!</div><button class="sw-btn-primary" onclick="loadSwipifyMovies(false)">Load More</button></div>`;
        return;
    }
    let movie = swipifyMovies[currentSwipifyIndex];
    let attempts = 0;
    while ((!movie || !movie.overview || (!movie.title && !movie.name)) && attempts < swipifyMovies.length) {
        currentSwipifyIndex++;
        if (currentSwipifyIndex >= swipifyMovies.length) { renderSwipifyCard(); return; }
        movie = swipifyMovies[currentSwipifyIndex];
        attempts++;
    }
    if (!movie || !movie.overview || (!movie.title && !movie.name)) {
        container.innerHTML = `<div class="sw-center"><div style="font-size:18px;font-weight:600;color:var(--text-primary);">No valid movies!</div><button class="sw-btn-primary" onclick="loadSwipifyMovies(false)">Retry</button></div>`;
        return;
    }
    container.innerHTML = '';
    const backdropUrl = movie.backdrop_path ? `${IMG_BACKDROP}${movie.backdrop_path}` : (movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '');
    const title = movie.title || movie.name || 'Unknown';
    const releaseDate = movie.release_date || movie.first_air_date || '';
    const rating = movie.vote_average || 0;
    const overview = movie.overview || '';
    const card = document.createElement('div');
    card.className = 'swipify-card';
    card.style.cssText = `position:absolute;inset:0;border-radius:20px;background:linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.75)),url('${backdropUrl}');background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:flex-end;padding:24px;color:white;cursor:grab;user-select:none;touch-action:none;border:2px solid var(--border-h);box-shadow:0 10px 40px rgba(0,0,0,0.35);opacity:0;transform:scale(0.8);`;
    const partyBadge = partyCode && partyStarted ? `<div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:3px;">${partyCode}</div>` : '';
    card.innerHTML = `${partyBadge}<div class="swipe-indicator swipe-left" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.15s ease;pointer-events:none;"><div style="width:110px;height:110px;border-radius:50%;background:rgba(255,68,68,0.92);display:flex;align-items:center;justify-content:center;border:4px solid #ff4444;"><svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 960" width="60px" fill="white"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></div></div><div class="swipe-indicator swipe-right" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.15s ease;pointer-events:none;"><div style="width:110px;height:110px;border-radius:50%;background:rgba(70,211,105,0.92);display:flex;align-items:center;justify-content:center;border:4px solid #46d369;"><svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 960" width="60px" fill="white"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg></div></div><div style="position:absolute;bottom:24px;left:24px;right:24px;"><div style="font-size:26px;font-weight:700;margin-bottom:6px;line-height:1.15;">${escapeHtml(title)}</div><div style="font-size:13px;opacity:0.85;margin-bottom:10px;">${releaseDate ? releaseDate.split('-')[0] : 'N/A'} &bull; ${rating.toFixed(1)}</div><div style="font-size:13px;line-height:1.45;opacity:0.8;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(overview)}</div></div>`;
    container.appendChild(card);
    requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    });
    setupSwipeGestures(card, movie);
}

function setupSwipeGestures(card, movie) {
    let startX = 0, startY = 0, currentX = 0, isDragging = false;
    const leftIndicator = card.querySelector('.swipe-left');
    const rightIndicator = card.querySelector('.swipe-right');
    const onStart = (e) => {
        isDragging = true;
        const p = e.touches ? e.touches[0] : e;
        startX = p.clientX; startY = p.clientY;
        card.style.cursor = 'grabbing';
        card.style.transition = 'none';
    };
    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const p = e.touches ? e.touches[0] : e;
        currentX = p.clientX - startX;
        const currentY = p.clientY - startY;
        const lx = Math.max(-150, Math.min(150, currentX));
        const ly = Math.max(-150, Math.min(150, currentY));
        card.style.transform = `translateX(${lx}px) translateY(${ly}px) rotate(${lx / 20}deg)`;
        if (currentX < -50) { leftIndicator.style.opacity = Math.min(Math.abs(currentX) / 150, 1); rightIndicator.style.opacity = 0; }
        else if (currentX > 50) { rightIndicator.style.opacity = Math.min(currentX / 150, 1); leftIndicator.style.opacity = 0; }
        else { leftIndicator.style.opacity = 0; rightIndicator.style.opacity = 0; }
    };
    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.cursor = 'grab';
        leftIndicator.style.opacity = 0; rightIndicator.style.opacity = 0;
        if (Math.abs(currentX) > 100) {
            swipeCard(currentX > 0 ? 'right' : 'left', movie);
        } else {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = '';
        }
    };
    card.addEventListener('mousedown', onStart);
    card.addEventListener('touchstart', onStart, { passive: false });
    card.addEventListener('mousemove', onMove);
    card.addEventListener('touchmove', onMove, { passive: false });
    card.addEventListener('mouseup', onEnd);
    card.addEventListener('touchend', onEnd);
    card.addEventListener('mouseleave', onEnd);
}

function swipeCard(direction, movie) {
    const container = document.getElementById('swipify-container');
    const card = container.querySelector('.swipify-card');
    if (!card) return;
    card.style.transition = 'opacity 0.28s ease, transform 0.28s ease';
    card.style.opacity = '0';
    card.style.transform = direction === 'right' ? 'translateX(60px) scale(0.8)' : 'translateX(-60px) scale(0.8)';
    currentSwipifyIndex++;
    setTimeout(() => renderSwipifyCard(), 280);
    if (direction === 'right') {
        addToFavorites(movie).catch(() => {});
        if (partyCode && partyStarted) sendPartySwipe(movie).catch(() => {});
    }
    sendAIFeedback(movie, direction === 'right' ? 'swipe_right' : 'swipe_left').catch(() => {});
}

async function sendPartySwipe(movie) {
    const movieId = `${movie.media_type || 'movie'}-${movie.id}`;
    const title = movie.title || movie.name || 'Unknown';
    const poster = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/party/swipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: partyCode, movieId, direction: 'right', title, poster })
        });
        if (res && res.ok) {
            const data = await res.json();
            if (data.match) {
                partyMatches.push({ movieId, title, poster });
                showMatchAnimation(title);
            }
        }
    } catch (e) {}
}

function showMatchAnimation(title) {
    const overlay = document.createElement('div');
    overlay.className = 'match-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg-primary);pointer-events:none;';
    overlay.innerHTML = `
        <div class="match-small">It's a</div>
        <div class="match-title">MATCH</div>
        <div class="match-subtitle" style="margin-top: 30px;">${escapeHtml(title)}</div>
    `;
    document.body.appendChild(overlay);
    setTimeout(() => overlay.remove(), 2900);
}

function showPartyWaiting() {
    setSwipeButtonsVisible(false);
    const container = document.getElementById('swipify-container');
    container.innerHTML = `<div class="sw-center"><div style="font-size:18px;font-weight:600;color:var(--text-primary);">You are done!</div><div style="font-size:14px;color:var(--text-secondary);text-align:center;">Waiting for others to finish...</div><div id="matches-count" style="font-size:14px;font-weight:600;color:#46d369;">${partyMatches.length} match${partyMatches.length !== 1 ? 'es' : ''} so far</div><button class="sw-btn-primary" onclick="showPartyResults()">View results</button></div>`;
}

function showPartyResults() {
    setSwipeButtonsVisible(false);
    if (partyPollInterval) { clearInterval(partyPollInterval); partyPollInterval = null; }
    const container = document.getElementById('swipify-container');
    if (partyMatches.length === 0) {
        container.innerHTML = `<div class="sw-center"><div style="font-size:20px;font-weight:700;color:var(--text-primary);">No matches</div><div style="font-size:14px;color:var(--text-secondary);text-align:center;">You did not agree on any movie. Try again!</div><button class="sw-btn-primary" onclick="cleanupParty();loadSwipifyMovies(false);">Back</button></div>`;
        return;
    }
    const matchesHtml = partyMatches.map(m => `<div class="sw-match-card">${m.poster ? `<img src="${m.poster}" style="width:44px;height:66px;border-radius:7px;object-fit:cover;" onerror="this.style.display='none'">` : `<div style="width:44px;height:66px;background:var(--border-h);border-radius:7px;"></div>`}<div><div style="font-size:15px;font-weight:600;color:var(--text-primary);">${escapeHtml(m.title || m.movieId)}</div><div style="font-size:12px;color:#46d369;font-weight:600;margin-top:3px;">Everyone liked this</div></div></div>`).join('');
    container.innerHTML = `<div style="position:absolute;inset:0;display:flex;flex-direction:column;padding:24px;overflow-y:auto;animation:swCenterAppear 0.45s cubic-bezier(0.22,1,0.36,1) both;"><div style="text-align:center;margin-bottom:20px;"><div style="font-size:22px;font-weight:700;color:var(--text-primary);">Party Matches</div><div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">${partyMatches.length} movie${partyMatches.length !== 1 ? 's' : ''} everyone wants to watch</div></div><div style="display:flex;flex-direction:column;gap:10px;flex:1;">${matchesHtml}</div><button class="sw-btn-primary" style="margin-top:20px;" onclick="cleanupParty();loadSwipifyMovies(false);">Done</button></div>`;
}

function showToastMsg(msg) {
    if (typeof showToast === 'function') { showToast(msg); return; }
    const t = document.createElement('div');
    t.style.cssText = `position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.85);color:white;padding:10px 20px;border-radius:10px;font-size:14px;z-index:99999;pointer-events:none;`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

function getUserProfile() {
    try { const s = localStorage.getItem('cinemi_userQuizProfile'); if (s) return JSON.parse(s); } catch (e) {}
    return {};
}

async function sendAIFeedback(movie, action) {
    const profile = getUserProfile();
    const movieId = `${movie.media_type || 'movie'}-${movie.id}`;
    try {
        const [favorites, watchlist] = await Promise.all([loadFavorites(), loadWatchlist()]);
        await fetchWithAuth(`${baseUrl}/api/recommendations/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movieId, action, profile, reviews: [], favorites: favorites.map(f => f.movieId), watchlist: watchlist.map(w => w.movieId) })
        });
    } catch (e) {}
}

document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.movie-card').forEach(card => card.addEventListener('click', () => openPanel('swipify')));
});





