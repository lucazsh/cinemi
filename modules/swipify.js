let swipifyMovies = [];
let currentSwipifyIndex = 0;

function openPanel(panelName) {
    const panel = document.getElementById(`${panelName}-panel`);
    if (!panel) return;
    
    panel.style.display = 'flex';
    requestAnimationFrame(() => {
        panel.classList.add('open');
    });
    
    if (panelName === 'swipify') {
        loadSwipifyMovies();
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
        setTimeout(() => {
            panel.style.display = 'none';
        }, 300);
    }
}
async function loadSwipifyMovies() {
    const container = document.getElementById('swipify-container');
    const loading = document.getElementById('swipify-loading');
    
    try {
        loading.style.display = 'flex';
        
        const res = await fetchWithAuth(`${baseUrl}/api/content/recommend`);
        if (!res.ok) throw new Error('Failed to load content');
        
        const data = await res.json();
        swipifyMovies = data.content || [];
        currentSwipifyIndex = 0;
        
        loading.style.display = 'none';
        
        if (swipifyMovies.length === 0) {
            container.innerHTML = '<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;"><div style="font-size: 48px;">🎬</div><div style="font-size: 18px; font-weight: 600; color: var(--text-primary);">No content available</div><button onclick="loadSwipifyMovies()" style="padding: 12px 24px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">Retry</button></div>';
            return;
        }
        
        renderSwipifyCard();
        
    } catch (error) {
        console.error('Swipify load error:', error);
        loading.style.display = 'none';
        container.innerHTML = '<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;"><div style="color: var(--text-primary);">Failed to load content.</div><button onclick="loadSwipifyMovies()" style="margin-top: 10px; padding: 8px 16px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 8px; cursor: pointer;">Retry</button></div>';
    }
}

function renderSwipifyCard() {
    const container = document.getElementById('swipify-container');
    
    if (!swipifyMovies || swipifyMovies.length === 0 || currentSwipifyIndex >= swipifyMovies.length) {
        container.innerHTML = `<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;"><div style="font-size: 48px;">🎬</div><div style="font-size: 18px; font-weight: 600; color: var(--text-primary);">No more movies!</div><button onclick="loadSwipifyMovies()" style="padding: 12px 24px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">Load More</button></div>`;
        return;
    }

    let movie = swipifyMovies[currentSwipifyIndex];
    let attempts = 0;
    const maxAttempts = swipifyMovies.length;
    
    while ((!movie || !movie.overview || (!movie.title && !movie.name)) && attempts < maxAttempts) {
        currentSwipifyIndex++;
        if (currentSwipifyIndex >= swipifyMovies.length) {
            container.innerHTML = `<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;"><div style="font-size: 48px;">🎬</div><div style="font-size: 18px; font-weight: 600; color: var(--text-primary);">No more movies!</div><button onclick="loadSwipifyMovies()" style="padding: 12px 24px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">Load More</button></div>`;
            return;
        }
        movie = swipifyMovies[currentSwipifyIndex];
        attempts++;
    }
    
    if (!movie || !movie.overview || (!movie.title && !movie.name)) {
        container.innerHTML = `<div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;"><div style="font-size: 48px;">🎬</div><div style="font-size: 18px; font-weight: 600; color: var(--text-primary);">No valid movies!</div><button onclick="loadSwipifyMovies()" style="padding: 12px 24px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 12px; font-weight: 600; cursor: pointer;">Load More</button></div>`;
        return;
    }

    container.innerHTML = '';
    
    const backdropUrl = movie.backdrop_path ? `${IMG_BACKDROP}${movie.backdrop_path}` : (movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '');
    const title = movie.title || movie.name || 'Unknown';
    const releaseDate = movie.release_date || movie.first_air_date || '';
    const overview = movie.overview || 'No overview available';
    const rating = movie.vote_average || 0;
    
    const card = document.createElement('div');
    card.className = 'swipify-card';
    card.style.cssText = `position: absolute; inset: 0; border-radius: 20px; background: linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7)), url('${backdropUrl}'); background-size: cover; background-position: center; display: flex; flex-direction: column; justify-content: flex-end; padding: 24px; color: white; cursor: grab; user-select: none; touch-action: none; border: 2px solid var(--border-h); box-shadow: 0 10px 40px rgba(0,0,0,0.3); opacity: 0; transform: scale(0.8);`;
    
    card.innerHTML = `<div class="swipe-indicator swipe-left" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.2s ease;"><div style="width: 120px; height: 120px; border-radius: 50%; background: rgba(255, 68, 68, 0.9); display: flex; align-items: center; justify-content: center; border: 4px solid #ff4444;"><svg xmlns="http://www.w3.org/2000/svg" height="64px" viewBox="0 -960 960 960" width="64px" fill="white"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></div></div><div class="swipe-indicator swipe-right" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0; transition: opacity 0.2s ease;"><div style="width: 120px; height: 120px; border-radius: 50%; background: rgba(70, 211, 105, 0.9); display: flex; align-items: center; justify-content: center; border: 4px solid #46d369;"><svg xmlns="http://www.w3.org/2000/svg" height="64px" viewBox="0 -960 960 960" width="64px" fill="white"><path d="m424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z"/></svg></div></div><div style="position: absolute; bottom: 24px; left: 24px; right: 24px;"><div style="font-size: 28px; font-weight: 700; margin-bottom: 8px; line-height: 1.1;">${escapeHtml(title)}</div><div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">${releaseDate ? releaseDate.split('-')[0] : 'N/A'} • <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#FFFF55"><path d="M480-269 314-169q-11 7-23 6t-21-8q-9-7-14-17.5t-2-23.5l44-189-147-127q-10-9-12.5-20.5T140-571q4-11 12-18t22-9l194-17 75-178q5-12 15.5-18t21.5-6q11 0 21.5 6t15.5 18l75 178 194 17q14 2 22 9t12 18q4 11 1.5 22.5T809-528L662-401l44 189q3 13-2 23.5T690-171q-9 7-21 8t-23-6L480-269Z"/></svg> ${rating.toFixed(1)}</div><div style="font-size: 14px; line-height: 1.4; opacity: 0.85; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">${escapeHtml(overview)}</div></div>`;
    
    container.appendChild(card);
    
    requestAnimationFrame(() => {
        card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
    });
    
    setupSwipeGestures(card, movie);
}
function setupSwipeGestures(card, movie) {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let isDragging = false;

    const leftIndicator = card.querySelector('.swipe-left');
    const rightIndicator = card.querySelector('.swipe-right');

    const onStart = (e) => {
        isDragging = true;
        const point = e.touches ? e.touches[0] : e;
        startX = point.clientX;
        startY = point.clientY;
        card.style.cursor = 'grabbing';
        card.style.transition = 'none';
    };

    const onMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const point = e.touches ? e.touches[0] : e;
        currentX = point.clientX - startX;
        const currentY = point.clientY - startY;
        
        const maxMove = 150;
        const limitedX = Math.max(-maxMove, Math.min(maxMove, currentX));
        const limitedY = Math.max(-maxMove, Math.min(maxMove, currentY));
        
        const rotation = limitedX / 20;
        card.style.transform = `translateX(${limitedX}px) translateY(${limitedY}px) rotate(${rotation}deg)`;
        
        if (currentX < -50) {
            leftIndicator.style.opacity = Math.min(Math.abs(currentX) / 150, 1);
            rightIndicator.style.opacity = 0;
        } else if (currentX > 50) {
            rightIndicator.style.opacity = Math.min(currentX / 150, 1);
            leftIndicator.style.opacity = 0;
        } else {
            leftIndicator.style.opacity = 0;
            rightIndicator.style.opacity = 0;
        }
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        card.style.cursor = 'grab';
        
        leftIndicator.style.opacity = 0;
        rightIndicator.style.opacity = 0;
        
        const threshold = 100;
        
        if (Math.abs(currentX) > threshold) {
            const direction = currentX > 0 ? 'right' : 'left';
            swipeCard(direction, movie);
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

async function swipeCard(direction, movie) {
    const container = document.getElementById('swipify-container');
    const card = container.querySelector('.swipify-card');
    if (!card) return;
    
    const action = direction === 'right' ? 'swipe_right' : 'swipe_left';
    
    await sendAIFeedback(movie, action);
    
    if (direction === 'right') {
        await addToFavorites(movie);
    }
    
    card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    card.style.opacity = '0';
    card.style.transform = 'scale(0.8)';
    
    await new Promise(resolve => setTimeout(resolve, 400));
    
    currentSwipifyIndex++;
    renderSwipifyCard();
    }

    document.addEventListener('DOMContentLoaded', function() {
        const movieCards = document.querySelectorAll('.movie-card');
        movieCards.forEach(card => {
            card.addEventListener('click', () => openPanel('swipify'));
        });
});
function getUserProfile() {
    try {
        const saved = localStorage.getItem('cinemi_userQuizProfile');
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {}
    return {};
}

async function getReviews() {
    return [];
}

async function sendAIFeedback(movie, action) {
    const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
    const profile = getUserProfile();
    const favorites = await loadFavorites();
    const watchlist = await loadWatchlist();
    const movieId = `${movie.media_type || 'movie'}-${movie.id}`;

    try {
        await fetchWithAuth(`${baseUrl}/api/recommendations/feedback`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movieId,
                action,
                profile,
                reviews: [],
                favorites: favorites.map(f => f.movieId),
                watchlist: watchlist.map(w => w.movieId)
            })
        });
    } catch (err) {
        console.error('Feedback error:', err);
    }
}
