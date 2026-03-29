let swipifyMovies = [];
let currentSwipifyIndex = 0;
let partyCode = null;
let partyRole = null;
let partyMatches = [];
let partyPollInterval = null;
let partyStarted = false;
let trailerMode = false;
let trailerCache = {};

const PLAY_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#e3e3e3"><path d="M295.12-249.56V-715.1q0-20.87 14.56-34.57 14.56-13.69 34.24-13.69 5.5 0 12.2 1.61 6.71 1.62 13.46 5.26l366.17 233.92q11.53 6.86 17.35 17.8 5.81 10.94 5.81 22.84t-6.06 22.77q-6.07 10.87-17.1 17.06L369.58-208.18q-6.75 4.31-13.68 5.74-6.93 1.43-12.34 1.43-19.37 0-33.91-13.43-14.53-13.42-14.53-35.12Z"/></svg>`;
const PAUSE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="#e3e3e3"><path d="M640-200q-33 0-56.5-23.5T560-280v-400q0-33 23.5-56.5T640-760q33 0 56.5 23.5T720-680v400q0 33-23.5 56.5T640-200Zm-320 0q-33 0-56.5-23.5T240-280v-400q0-33 23.5-56.5T320-760q33 0 56.5 23.5T400-680v400q0 33-23.5 56.5T320-200Z"/></svg>`;
const MAXIMISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M203.04-80.09q-51.34 0-87.15-35.8-35.8-35.81-35.8-87.15v-94.05q0-25.95 17.76-43.71 17.76-17.77 43.43-17.77 25.68 0 43.72 17.77 18.04 17.76 18.04 43.71v94.05h94.05q25.95 0 43.71 18.04 17.77 18.04 17.77 43.72 0 25.67-17.77 43.43-17.76 17.76-43.71 17.76h-94.05Zm553.92 0h-94.05q-25.95 0-43.71-17.76-17.77-17.76-17.77-43.43 0-25.68 17.77-43.72 17.76-18.04 43.71-18.04h94.05v-94.05q0-25.95 18.04-43.71 18.04-17.77 43.72-17.77 25.67 0 43.43 17.77 17.76 17.76 17.76 43.71v94.05q0 51.34-35.8 87.15-35.81 35.8-87.15 35.8ZM80.09-662.91v-94.05q0-51.34 35.8-87.15 35.81-35.8 87.15-35.8h94.05q25.95 0 43.71 17.76 17.77 17.76 17.77 43.43 0 25.68-17.77 43.72-17.76 18.04-43.71 18.04h-94.05v94.05q0 25.95-18.04 43.71-18.04 17.77-43.72 17.77-25.67 0-43.43-17.77-17.76-17.76-17.76-43.71Zm676.87 0v-94.05h-94.05q-25.95 0-43.71-18.04-17.77-18.04-17.77-43.72 0-25.67 17.77-43.43 17.76-17.76 43.71-17.76h94.05q51.34 0 87.15 35.8 35.8 35.81 35.8 87.15v94.05q0 25.95-17.76 43.71-17.76 17.77-43.43 17.77-25.68 0-43.72-17.77-18.04-17.76-18.04-43.71Z"/></svg>`;
const MINIMISE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="#e3e3e3"><path d="M208.43-208.43h-67.86q-25.27 0-42.88-18.05-17.6-18.04-17.6-43.79 0-25.74 17.76-43.21 17.76-17.48 43.72-17.48h127.91q25.16 0 43.32 18.16t18.16 43.32v128.91q0 25.27-17.48 42.88-17.47 17.6-43.21 17.6-25.75 0-43.79-17.76-18.05-17.76-18.05-43.72v-66.86Zm543.7 0v67.86q0 25.27-17.47 42.88-17.48 17.6-43.22 17.6t-43.79-17.76q-18.04-17.76-18.04-43.72v-127.91q0-25.16 18.15-43.32 18.16-18.16 43.33-18.16h128.34q25.27 0 42.88 17.48 17.6 17.47 17.6 43.21 0 25.75-17.6 43.79-17.61 18.05-42.88 18.05h-67.3Zm-543.7-543.7v-67.3q0-25.27 18.05-42.88 18.04-17.6 43.79-17.6 25.74 0 43.21 17.6 17.48 17.61 17.48 42.88v128.34q0 25.17-18.16 43.33-18.16 18.15-43.32 18.15H140.57q-25.27 0-42.88-18.04-17.6-18.05-17.6-43.79t17.76-43.22q17.76-17.47 43.72-17.47h66.86Zm543.7 0h67.3q25.27 0 42.88 17.47 17.6 17.48 17.6 43.22t-17.6 43.79q-17.61 18.04-42.88 18.04H691.09q-25.17 0-43.33-18.15-18.15-18.16-18.15-43.33v-128.34q0-25.27 18.04-42.88 18.05-17.6 43.79-17.6t43.22 17.6q17.47 17.61 17.47 42.88v67.3Z"/></svg>`;

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
            0%   { opacity: 0; }
            100% { opacity: 1; }
        }
        @keyframes swPanClose {
            0%   { opacity: 1; }
            100% { opacity: 0; }
        }
        @keyframes trailerCtrlIn {
            0%   { opacity: 0; transform: scale(0.75); }
            60%  { transform: scale(1.08); }
            100% { opacity: 1; transform: scale(1); }
        }
        @keyframes trailerCtrlOut {
            0%   { opacity: 1; transform: scale(1); }
            100% { opacity: 0; transform: scale(0.8); }
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
        #swipify-panel.open > div:not(.backdrop) {
            animation: swCenterAppear 0.38s cubic-bezier(0.22,1,0.36,1) both;
        }
        .party-code-display { font-size:38px;font-weight:900;letter-spacing:10px;color:var(--text-primary);background:var(--card-bg);border:2px solid var(--border-h);border-radius:16px;padding:18px 28px;text-align:center;cursor:pointer;transition:transform 0.15s; }
        .party-code-display:active { transform:scale(0.96); }
        .sw-btn-primary { width:100%;max-width:300px;padding:15px 24px;background:var(--button-bg);color:var(--button-text);border:none;border-radius:10px;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.15s,opacity 0.15s; }
        .sw-btn-primary:active { transform:scale(0.97);opacity:0.85; }
        .sw-btn-secondary { width:100%;max-width:300px;padding:15px 24px;background:var(--card-bg);color:var(--text-primary);border:1.5px solid var(--border-h);border-radius:10px;font-size:16px;font-weight:600;cursor:pointer;transition:transform 0.15s; }
        .sw-btn-secondary:active { transform:scale(0.97); }
        .sw-btn-ghost { background:none;border:none;color:var(--text-secondary);cursor:pointer;font-size:14px;padding:8px 16px;display:flex;align-items:center;gap:6px; }
        .sw-center { position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:28px;animation:swCenterAppear 0.3s ease-out both; }
        .sw-match-card { display:flex;align-items:center;gap:12px;padding:12px;background:var(--card-bg);border-radius:12px;border:1.5px solid var(--border-h); }
        .trailer-ctrl-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(0,0,0,0.55);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1.5px solid rgba(255,255,255,0.12);
            border-radius: 25.92px;
            cursor: pointer;
            pointer-events: auto;
            transition: opacity 0.22s ease, transform 0.22s ease, background 0.15s;
        }
        .trailer-ctrl-btn:active { background: rgba(0,0,0,0.75); transform: scale(0.9) !important; }
        .trailer-ctrl-visible {
            animation: trailerCtrlIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both;
        }
        .trailer-ctrl-hidden {
            animation: trailerCtrlOut 0.22s ease forwards;
        }
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

function openPan(panelName) {
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
    if (backdrop) backdrop.onclick = () => closePan(panelName);
}

function closePan(panelName) {
    const panel = document.getElementById(`${panelName}-panel`);
    if (panel) {
        const inner = panel.querySelector(':not(.backdrop)');
        if (inner) inner.style.animation = 'swPanClose 0.3s ease-out both';
        const backdrop = panel.querySelector('.backdrop');
        if (backdrop) backdrop.style.opacity = '0';
        setTimeout(() => {
            panel.classList.remove('open');
            if (inner) inner.style.animation = '';
            if (backdrop) backdrop.style.opacity = '';
            panel.style.display = 'none';
            if (panelName === 'swipify') {
                cleanupParty();
                const iframe = document.querySelector('#swipify-container .trailer-iframe');
                if (iframe) iframe.src = 'about:blank';
            }
        }, 300);
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
        await fetchWithAuth(`${baseUrl}/api/party/set-movies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: partyCode, movies }) });
        await fetchWithAuth(`${baseUrl}/api/party/start`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code: partyCode }) });
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
    card.style.cssText = `position:absolute;inset:0;border-radius:20px;background:linear-gradient(to bottom,rgba(0,0,0,0.1),rgba(0,0,0,0.75)),url('${backdropUrl}');background-size:cover;background-position:center;display:flex;flex-direction:column;justify-content:flex-end;padding:24px;color:white;cursor:grab;user-select:none;touch-action:none;border:2px solid var(--border-h);box-shadow:0 10px 40px rgba(0,0,0,0.35);opacity:0;transform:scale(0.8);overflow:hidden;`;
    const partyBadge = partyCode && partyStarted ? `<div class="swipify-party-badge" style="position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);backdrop-filter:blur(8px);border-radius:20px;padding:5px 14px;font-size:12px;font-weight:700;letter-spacing:3px;z-index:6;">${partyCode}</div>` : '';
    card.innerHTML = `${partyBadge}<div class="swipe-indicator swipe-left" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.15s ease;pointer-events:none;z-index:6;"><div style="width:110px;height:110px;border-radius:50%;background:rgba(255,68,68,0.92);display:flex;align-items:center;justify-content:center;border:4px solid #ff4444;"><svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 960" width="60px" fill="white"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></div></div><div class="swipe-indicator swipe-right" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);opacity:0;transition:opacity 0.15s ease;pointer-events:none;z-index:6;"><div style="width:110px;height:110px;border-radius:50%;background:rgba(70,211,105,0.92);display:flex;align-items:center;justify-content:center;border:4px solid #46d369;"><svg xmlns="http://www.w3.org/2000/svg" height="60px" viewBox="0 -960 960 960" width="60px" fill="white"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg></div></div><div class="swipify-info" style="position:absolute;bottom:24px;left:24px;right:24px;z-index:6;pointer-events:none;"><div style="font-size:26px;font-weight:700;margin-bottom:6px;line-height:1.15;">${escapeHtml(title)}</div><div style="font-size:13px;opacity:0.85;margin-bottom:10px;">${releaseDate ? releaseDate.split('-')[0] : 'N/A'} &bull; ${rating.toFixed(1)}</div><div style="font-size:13px;line-height:1.45;opacity:0.8;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(overview)}</div></div>`;
    container.appendChild(card);
    requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.35s ease, transform 0.35s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    });
    if (trailerMode) injectTrailerOverlay(card, movie);
    setupSwipeGestures(card, movie);
}

async function fetchTrailerKey(movie) {
    const type = movie.media_type === 'tv' ? 'tv' : 'movie';
    const cacheKey = `${type}-${movie.id}`;
    if (trailerCache[cacheKey] !== undefined) return trailerCache[cacheKey];
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/tmdb/${type}/${movie.id}/videos`);
        if (!res || !res.ok) throw new Error();
        const data = await res.json();
        const trailer = (data.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube')
            || (data.results || []).find(v => v.site === 'YouTube');
        trailerCache[cacheKey] = trailer ? trailer.key : null;
        return trailerCache[cacheKey];
    } catch (e) {
        trailerCache[cacheKey] = null;
        return null;
    }
}

let globalUserInteracted = false;
document.addEventListener('touchstart', () => { globalUserInteracted = true; }, { once: true });
document.addEventListener('pointerdown', () => { globalUserInteracted = true; }, { once: true });

async function injectTrailerOverlay(card, movie) {
    const key = await fetchTrailerKey(movie);
    if (!card.isConnected) return;
    if (!key) {
        const pill = document.createElement('div');
        pill.style.cssText = 'position:absolute;top:12px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.6);backdrop-filter:blur(6px);padding:5px 14px;border-radius:20px;font-size:11px;color:rgba(255,255,255,0.5);white-space:nowrap;z-index:6;pointer-events:none;';
        pill.textContent = 'No trailer available';
        card.appendChild(pill);
        return;
    }
    const isIos = /iP(hone|od|ad)/.test(navigator.userAgent);
    const backdropUrl = movie.backdrop_path ? `${IMG_BACKDROP}${movie.backdrop_path}` : (movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '');
    const wrapper = document.createElement('div');
    wrapper.className = 'trailer-wrapper';
    wrapper.style.cssText = 'position:absolute;inset:0;overflow:hidden;border-radius:18px;background:#000;z-index:1;';
    const iframeContainer = document.createElement('div');
    iframeContainer.style.cssText = 'position:absolute;width:118%;height:118%;top:-9%;left:-9%;transition:width 0.35s cubic-bezier(0.22,1,0.36,1),height 0.35s cubic-bezier(0.22,1,0.36,1),top 0.35s cubic-bezier(0.22,1,0.36,1),left 0.35s cubic-bezier(0.22,1,0.36,1);';
    const iframe = document.createElement('iframe');
    iframe.className = 'trailer-iframe';
    iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;pointer-events:none;';
    iframe.allow = 'autoplay; encrypted-media';
    iframe.setAttribute('allowfullscreen', '');
    iframe.setAttribute('playsinline', '');
    const baseUrl = `https://www.youtube.com/embed/${key}?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&playsinline=1&enablejsapi=1&origin=${location.origin}`;
    iframe.src = isIos ? `${baseUrl}&mute=1` : `${baseUrl}&mute=0`;
    iframeContainer.appendChild(iframe);
    wrapper.appendChild(iframeContainer);
    const cover = document.createElement('div');
    cover.style.cssText = `position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,0.2),rgba(0,0,0,0.8)),url('${backdropUrl}') center/cover no-repeat;opacity:0;transition:opacity 0.3s ease;z-index:3;pointer-events:none;`;
    wrapper.appendChild(cover);
    const controlsOverlay = document.createElement('div');
    controlsOverlay.style.cssText = 'position:absolute;inset:0;z-index:4;display:flex;align-items:center;justify-content:center;cursor:pointer;';
    wrapper.appendChild(controlsOverlay);
    const centerBtn = document.createElement('div');
    centerBtn.className = 'trailer-ctrl-btn';
    centerBtn.style.cssText = 'width:72px;height:72px;opacity:0;pointer-events:auto;z-index:6;position:relative;';
    centerBtn.innerHTML = PAUSE_SVG;
    controlsOverlay.appendChild(centerBtn);
    const zoomBtn = document.createElement('div');
    zoomBtn.className = 'trailer-ctrl-btn';
    zoomBtn.style.cssText = 'position:absolute;top:14px;right:14px;width:36px;height:36px;opacity:0;z-index:5;pointer-events:auto;';
    zoomBtn.innerHTML = MINIMISE_SVG;
    wrapper.appendChild(zoomBtn);
    card.insertBefore(wrapper, card.firstChild);
    const unlockIosPlay = () => {
        try {
            if (isIos) {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'unMute', args: '' }), '*');
            }
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: '' }), '*');
        } catch (e) {}
        setTimeout(() => showControls(), 300);
    };
    if (globalUserInteracted) {
        setTimeout(unlockIosPlay, 400);
    } else {
        card.addEventListener('touchstart', unlockIosPlay, { passive: true, once: true });
        card.addEventListener('pointerdown', unlockIosPlay, { once: true });
    }
    let paused = false;
    let isCoverFit = true;
    let hideTimer = null;
    let controlsVisible = false;
    function postToIframe(func) {
        try { iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func, args: '' }), '*'); } catch (e) {}
    }
    function setControlsVisible(visible) {
        controlsVisible = visible;
        if (visible) {
            centerBtn.style.animation = 'none';
            centerBtn.offsetHeight;
            centerBtn.style.animation = 'trailerCtrlIn 0.28s cubic-bezier(0.34,1.56,0.64,1) both';
            centerBtn.style.opacity = '1';
            zoomBtn.style.animation = 'none';
            zoomBtn.offsetHeight;
            zoomBtn.style.animation = 'trailerCtrlIn 0.28s cubic-bezier(0.34,1.56,0.64,1) 0.04s both';
            zoomBtn.style.opacity = '0.9';
        } else {
            centerBtn.style.animation = 'trailerCtrlOut 0.22s ease forwards';
            zoomBtn.style.animation = 'trailerCtrlOut 0.22s ease forwards';
        }
    }
    function scheduleHide() {
        clearTimeout(hideTimer);
        if (!paused) hideTimer = setTimeout(() => setControlsVisible(false), 2400);
    }
    function showControls() {
        setControlsVisible(true);
        scheduleHide();
    }
    function togglePlayPause() {
        paused = !paused;
        if (paused) {
            postToIframe('pauseVideo');
            cover.style.opacity = '1';
            centerBtn.innerHTML = PLAY_SVG;
            clearTimeout(hideTimer);
            setControlsVisible(true);
        } else {
            postToIframe('playVideo');
            cover.style.opacity = '0';
            centerBtn.innerHTML = PAUSE_SVG;
            showControls();
        }
    }
    controlsOverlay.addEventListener('click', e => { e.stopPropagation(); showControls(); });
    centerBtn.addEventListener('click', e => { e.stopPropagation(); togglePlayPause(); });
    zoomBtn.addEventListener('pointerdown', e => e.stopPropagation());
    zoomBtn.addEventListener('touchstart', e => e.stopPropagation(), { passive: true });
    zoomBtn.addEventListener('click', e => {
        e.stopPropagation();
        isCoverFit = !isCoverFit;
        if (isCoverFit) {
            iframeContainer.style.width = '118%';
            iframeContainer.style.height = '118%';
            iframeContainer.style.top = '-9%';
            iframeContainer.style.left = '-9%';
            zoomBtn.innerHTML = MINIMISE_SVG;
        } else {
            iframeContainer.style.width = '100%';
            iframeContainer.style.height = '100%';
            iframeContainer.style.top = '0';
            iframeContainer.style.left = '0';
            zoomBtn.innerHTML = MAXIMISE_SVG;
        }
        showControls();
    });
    if (!isIos) setTimeout(() => showControls(), 1200);
}

function toggleTrailerMode() {
    trailerMode = !trailerMode;
    const container = document.getElementById('swipify-container');
    if (container && container.querySelector('.swipify-card')) {
        const iframe = container.querySelector('.trailer-iframe');
        if (iframe) iframe.src = 'about:blank';
        renderSwipifyCard();
    }
    return trailerMode;
}

function setupSwipeGestures(card, movie) {
    let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false;
    const leftIndicator = card.querySelector('.swipe-left');
    const rightIndicator = card.querySelector('.swipe-right');

    const onStart = (e) => {
        isDragging = true;
        const p = e.touches ? e.touches[0] : e;
        startX = p.clientX; startY = p.clientY;
        currentX = 0; currentY = 0;
        card.style.cursor = 'grabbing';
        card.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const p = e.touches ? e.touches[0] : e;
        currentX = p.clientX - startX;
        currentY = p.clientY - startY;
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
        leftIndicator.style.opacity = 0;
        rightIndicator.style.opacity = 0;
        if (Math.abs(currentX) > 100) {
            swipeCard(currentX > 0 ? 'right' : 'left', movie);
        } else {
            card.style.transition = 'transform 0.3s ease';
            card.style.transform = '';
        }
    };

    
    const onMouseLeave = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.cursor = 'grab';
        leftIndicator.style.opacity = 0;
        rightIndicator.style.opacity = 0;
        card.style.transition = 'transform 0.3s ease';
        card.style.transform = '';
    };

    card.addEventListener('mousedown', onStart);
    card.addEventListener('touchstart', onStart, { passive: false });
    card.addEventListener('mousemove', onMove);
    card.addEventListener('touchmove', onMove, { passive: false });
    card.addEventListener('mouseup', onEnd);
    card.addEventListener('touchend', onEnd);
    card.addEventListener('mouseleave', onMouseLeave);
}

function swipeCard(direction, movie) {
    const container = document.getElementById('swipify-container');
    const card = container.querySelector('.swipify-card');
    if (!card) return;
    const iframe = card.querySelector('.trailer-iframe');
    if (iframe) {
        try { iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: 'stopVideo', args: '' }), '*'); } catch (e) {}
        setTimeout(() => { iframe.src = 'about:blank'; }, 50);
    }
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
    overlay.innerHTML = `<div class="match-small">It's a</div><div class="match-title">MATCH</div><div class="match-subtitle" style="margin-top:30px;">${escapeHtml(title)}</div>`;
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
