let searchTimer;
document.addEventListener('DOMContentLoaded', initMovieSearch);
function initMovieSearch() {
    const input = document.getElementById('fs-textarea');
    const results = document.getElementById('search-results');
    
    if (!input || !results) return;

    input.addEventListener('input', (e) => {
        clearTimeout(searchTimer);
        const query = e.target.value.trim();
        
        if (query.length < 1) {
            results.innerHTML = '';
            return;
        }
        
        if (query.startsWith('@')) {
            searchTimer = setTimeout(() => fetchUsers(query.slice(1), results), 300);
            return;
        }
        
        if (query.length < 2) {
            results.innerHTML = '';
            return;
        }
        
        results.innerHTML = '<div style="color:var(--text-primary); padding:20px;">Searching...</div>';
        searchTimer = setTimeout(() => fetchMovies(query, results), 500);
    });
}

async function fetchUsers(query, container) {
    try {
        const response = await fetch(`${baseUrl}/api/search/users?q=${encodeURIComponent(query)}`, {
            headers: ngrokHeaders
        });
        const users = await response.json();
        
        if (!users.length) {
            container.innerHTML = '<div style="color:var(--text-primary); padding:20px;">No users found</div>';
            return;
        }
        
        container.innerHTML = users.map(user => `
            <div class="usr" style="display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-secondary); border-radius: 12px; cursor: pointer; border: 1px solid var(--border-dark-alpha-2);">
                <img src="${user.photoUrl}" style="width: 48px; height: 48px; border-radius: 50%; object-fit: cover;">
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">@${user.username}</div>
                </div>
            </div>
        `).join('');
        
    } catch (error) {
        container.innerHTML = '<div style="padding:20px;">Error loading users.</div>';
    }
}
async function fetchMovies(query, container) {
    try {
        const response = await fetch(`${baseUrl}/api/tmdb/search/multi?query=${encodeURIComponent(query)}`, {
            headers: ngrokHeaders
        });
        const data = await response.json();
        const validResults = data.results.filter(item => 
            item.poster_path && item.overview && item.overview.length > 5
        );
        
        renderResults(validResults, container);
    } catch (error) {
        container.innerHTML = '<div style="padding:20px;">Error loading results.</div>';
    }
}

function renderResults(items, container) {
    if (!items || items.length === 0) {
        container.innerHTML = '<div style="color:var(--text-primary); padding:20px;">No complete results found.</div>';
        return;
    }
    
    container.innerHTML = '';

    items.slice(0, 10).forEach(item => {
        const card = document.createElement('div');
        card.className = 'search-result-card';
        
        const poster = `${IMG_W500}${item.poster_path}`;
        const title = item.title || item.name;
        const releaseDate = item.release_date || item.first_air_date;
        const mediaType = item.media_type === 'tv' ? 'TV' : 'Movie';
        
        card.innerHTML = `
            <img src="${poster}" class="search-poster" alt="${escapeHtml(title)}">
            <div class="search-info">
                <div class="search-card-title">${escapeHtml(title)}</div>
                <div style="font-size:12px; opacity:0.7;">${releaseDate ? releaseDate.split('-')[0] : 'N/A'} • ${mediaType}</div>
            </div>
        `;
        
        card.onclick = () => showDetails(item);
        container.appendChild(card);
    });
}
