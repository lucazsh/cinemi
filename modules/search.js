let searchTimer;
const RECENT_KEY = 'cinemi_recent_searches';

document.addEventListener('DOMContentLoaded', () => {
    initMovieSearch();
    renderRecentSearches();
});

function initMovieSearch() {
    const input = document.getElementById('fs-textarea');
    const results = document.getElementById('search-results');
    const initial = document.getElementById('finder-initial');

    if (!input || !results || !initial) return;

    input.addEventListener('input', (e) => {
        clearTimeout(searchTimer);

        const rawQuery = e.target.value || '';
        const query = rawQuery.trim();

        if (query.length < 1) {
            results.innerHTML = '';
            results.style.display = 'none';
            initial.style.display = 'block';
            renderRecentSearches();
            return;
        }

        results.style.display = 'grid';
        initial.style.display = 'none';

        if (query.startsWith('@')) {
            const userQuery = query.slice(1).trim();
            if (userQuery.length < 1) {
                results.innerHTML = '';
                return;
            }
            results.innerHTML = '<div style="color:var(--text-primary); padding:20px;">Searching users...</div>';
            searchTimer = setTimeout(() => fetchUsers(userQuery, results), 300);
            return;
        }

        if (query.length < 2) {
            results.innerHTML = '';
            return;
        }

        results.innerHTML = '<div style="color:var(--text-primary); padding:20px;">Searching...</div>';
        searchTimer = setTimeout(() => fetchMovies(query, results), 400);
    });
}

function setSearchValue(val) {
    const input = document.getElementById('fs-textarea');
    if (!input) return;
    input.value = val;
    input.dispatchEvent(new Event('input'));
}

function saveRecentSearch(query) {
    if (!query || query.length < 2) return;
    let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent = recent.filter(i => i !== query);
    recent.unshift(query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

function renderRecentSearches() {
    const container = document.getElementById('recent-searches-container');
    const list = document.getElementById('recent-searches-list');
    if (!container || !list) return;

    const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');

    if (recent.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = recent.map((query, idx) => `
        <div class="recent-item">
            <div class="recent-left" onclick="setSearchValue('${escapeHtml(query)}')">
                <div class="recent-pill">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                <span class="recent-text">${escapeHtml(query)}</span>
            </div>
            <button class="recent-remove-btn" onclick="removeRecentSearch(${idx})">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    `).join('');
}

function removeRecentSearch(idx) {
    let recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    recent.splice(idx, 1);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
    renderRecentSearches();
}

function clearRecentSearches() {
    localStorage.removeItem(RECENT_KEY);
    renderRecentSearches();
}

async function fetchUsers(query, container) {
    try {
        const response = await fetch(
            `${baseUrl}/api/search/users?q=${encodeURIComponent(query)}`,
            { headers: ngrokHeaders }
        );
        const users = await response.json();
        if (!Array.isArray(users) || users.length === 0) {
            container.innerHTML = '<div style="color:var(--text-primary); padding:20px;">No users found</div>';
            return;
        }
        container.innerHTML = users.map(user => `
            <div class="usr usr-search" data-username="${escapeHtml(user.username || '')}" style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-secondary); border-radius:18px; cursor:pointer; border:1px solid var(--border-dark-alpha-2);">
                <img src="${escapeHtml(user.photoUrl || '')}" style="width:48px; height:48px; border-radius:15.36px; object-fit:cover;" alt="${escapeHtml(user.username || 'user')}">
                <div><div style="font-weight:600; color:var(--text-primary);">@${escapeHtml(user.username || '')}</div></div>
            </div>
        `).join('');
    } catch (error) {
        console.error('User search error:', error);
        container.innerHTML = '<div style="padding:20px;">Error loading users.</div>';
    }
}

async function fetchMovies(query, container) {
    try {
        const normalizedQuery = normalizeSearchQuery(query);
        const variants = buildQueryVariants(normalizedQuery);
        const [movieResponses, tvResponses] = await Promise.all([
            Promise.all(variants.map(q => fetch(`${baseUrl}/api/tmdb/search/movie?query=${encodeURIComponent(q)}`, { headers: ngrokHeaders }).then(r => r.ok ? r.json() : ({ results: [] })).catch(() => ({ results: [] })))),
            Promise.all(variants.map(q => fetch(`${baseUrl}/api/tmdb/search/tv?query=${encodeURIComponent(q)}`, { headers: ngrokHeaders }).then(r => r.ok ? r.json() : ({ results: [] })).catch(() => ({ results: [] }))))
        ]);
        const allResults = [
            ...movieResponses.flatMap(d => Array.isArray(d.results) ? d.results : []),
            ...tvResponses.flatMap(d => Array.isArray(d.results) ? d.results : [])
        ];
        const uniqueResults = dedupeResults(allResults);
        const scoredResults = uniqueResults
            .filter(item => item && item.poster_path)
            .map(item => ({ ...item, _score: scoreResult(item, normalizedQuery) }))
            .sort((a, b) => b._score - a._score);
        renderResults(scoredResults, container);
    } catch (error) {
        console.error('Movie search error:', error);
        container.innerHTML = '<div style="padding:20px;">Error loading results.</div>';
    }
}

function renderResults(items, container) {
    if (!items || items.length === 0) {
        container.innerHTML = '<div style="color:var(--text-primary); padding:20px;">No results found.</div>';
        return;
    }
    container.innerHTML = '';
    items.slice(0, 10).forEach(item => {
        const card = document.createElement('div');
        card.className = 'search-result-card';
        const poster = item.poster_path ? `${IMG_W500}${item.poster_path}` : '';
        const title = item.title || item.name || 'Untitled';
        const releaseDate = item.release_date || item.first_air_date || '';
        const mediaType = item.media_type === 'tv' || item.name ? 'TV' : 'Movie';
        card.innerHTML = `
            <img src="${escapeHtml(poster)}" class="search-poster" alt="${escapeHtml(title)}">
            <div class="search-info">
                <div class="search-card-title">${escapeHtml(title)}</div>
                <div style="font-size:12px; opacity:0.7;">
                    ${releaseDate ? escapeHtml(releaseDate.split('-')[0]) : 'N/A'} • ${mediaType}
                </div>
            </div>
        `;
        card.onclick = () => {
            saveRecentSearch(title);
            showDetails(item);
        };
        container.appendChild(card);
    });
}

function normalizeSearchQuery(query) {
    return (query || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

function buildQueryVariants(query) {
    const variants = new Set();
    if (!query) return [''];
    variants.add(query);
    if (query.endsWith('s') && query.length > 1) {
        variants.add(query.slice(0, -1));
    } else {
        variants.add(query + 's');
    }
    if (query.endsWith('er')) {
        variants.add(query + 's');
    }
    return [...variants].filter(Boolean);
}

function scoreResult(item, query) {
    const title = normalizeSearchQuery(item.title || item.name || '');
    const originalTitle = normalizeSearchQuery(item.original_title || item.original_name || '');
    let score = 0;
    if (!title) return score;
    if (title === query) score += 100;
    if (originalTitle === query) score += 90;
    if (title.startsWith(query)) score += 60;
    if (originalTitle.startsWith(query)) score += 50;
    if (title.includes(query)) score += 35;
    if (originalTitle.includes(query)) score += 30;
    if (query.endsWith('s') && title.includes(query.slice(0, -1))) score += 12;
    if (!query.endsWith('s') && title.includes(query + 's')) score += 12;
    if (item.poster_path) score += 5;
    if (item.overview && item.overview.length > 10) score += 3;
    return score;
}

function dedupeResults(results) {
    const seen = new Set();
    const unique = [];
    for (const item of results || []) {
        const id = `${item.media_type || ''}-${item.id || ''}`;
        if (!item || seen.has(id)) continue;
        seen.add(id);
        unique.push(item);
    }
    return unique;
}

function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
