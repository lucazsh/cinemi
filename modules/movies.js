const IMG_W500 = 'https://image.tmdb.org/t/p/w500';
const IMG_BACKDROP = 'https://image.tmdb.org/t/p/original';
let featuredMovie = null;
let featuredGenres = [];
let moviesLoaded = false;

function showSkeletonLoaders() {
    const fMovContainer = document.querySelector('.f-mov');
    if (fMovContainer) {
        fMovContainer.innerHTML = `
            <div class="skeleton-loader" style="width:100%;aspect-ratio:2/2.5;border-radius:15px;background:linear-gradient(90deg,var(--bg-primary) 25%,var(--bg-secondary) 50%,var(--bg-primary) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
        `;
    }
    
    const genreContainer = document.getElementById('genre');
    if (genreContainer) {
        genreContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-loader" style="width:40%;aspect-ratio:2/3;border-radius:15px;background:linear-gradient(90deg,var(--bg-primary) 25%,var(--bg-secondary) 50%,var(--bg-primary) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
        `).join('');
    }
    
    const moodContainer = document.getElementById('mood');
    if (moodContainer) {
        moodContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-loader" style="width:40%;aspect-ratio:2/3;border-radius:15px;background:linear-gradient(90deg,var(--bg-primary) 25%,var(--bg-secondary) 50%,var(--bg-primary) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
        `).join('');
    }
    
    const trendingContainer = document.querySelector('.m1-rec .mov:last-of-type');
    if (trendingContainer) {
        trendingContainer.innerHTML = Array(3).fill(0).map(() => `
            <div class="skeleton-loader" style="width:40%;aspect-ratio:2/3;border-radius:15px;background:linear-gradient(90deg,var(--bg-primary) 25%,var(--bg-secondary) 50%,var(--bg-primary) 75%);background-size:200% 100%;animation:shimmer 1.5s infinite;"></div>
        `).join('');
    }
    
    if (!document.getElementById('shimmer-style')) {
        const style = document.createElement('style');
        style.id = 'shimmer-style';
        style.textContent = `
            @keyframes shimmer {
                0% { background-position: -200% 0; }
                100% { background-position: 200% 0; }
            }
            .fade-in-content {
                animation: fadeInContent 0.6s ease-out forwards;
                opacity: 0;
            }
            @keyframes fadeInContent {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    }
}

async function loadFeaturedMovie() {
    try {
        const res = await fetch(`${baseUrl}/api/content/recommend`, { headers: ngrokHeaders });
        const data = await res.json();
        const validMovies = (data.content || []).filter(m => m.poster_path && m.overview);
        
        if (validMovies.length === 0) return;
        
        const movies = validMovies.slice(0, 5);
        featuredMovie = movies[0];
        featuredGenres = featuredMovie.genre_ids || [];
        
        let currentIndex = 0;
        function uptheme(imageUrl) {
            const img = new Image();
            img.src = imageUrl;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 10;
                canvas.height = 10;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, 10, 10);
                let r=80,g=80,b=80;try{[r,g,b]=ctx.getImageData(0,0,1,1).data;}catch(e){}
                const darken = (v) => Math.floor(v * 0.4);
                const color = `rgb(${darken(r)}, ${darken(g)}, ${darken(b)})`;
                document.getElementById('theme-color-dark')?.setAttribute('content', color);
                document.getElementById('theme-color-light')?.setAttribute('content', color);
            };
        }
        function renderSlide(index) {
            const m = movies[index];
            const posterUrl = `${IMG_W500}${m.poster_path}`;
            const title = m.title || m.name;
            const overview = truncateText(m.overview, 100);
            
            const fMovContainer = document.querySelector('.f-mov');
            if (!fMovContainer) return;
            
            fMovContainer.style.opacity = '0';
            fMovContainer.style.transition = 'opacity 0.4s ease';
            
            setTimeout(() => {
                fMovContainer.innerHTML = `
                    <img src="${posterUrl}" class="fade-in-content">
                    <div class="fmov-over fade-in-content" style="animation-delay:0.1s;">
                        <span class="fmov-title">${escapeHtml(title)}</span>
                        <span class="fmov-desciption">${escapeHtml(overview)}</span>
                        <span class="fmov-buttons">
                            <button class="fmov-b" onclick="event.stopPropagation();" style="color:#18191e; background-color: #fffffff9;">Add to list</button>
                            <button class="fmov-b" onclick="event.stopPropagation(); showDetails(window._featuredMovies[${index}]);">Details</button>
                        </span>
                    </div>
                `;
                
                fMovContainer.style.opacity = '1';
                fMovContainer.onclick = () => showDetails(movies[index]);
                
                const ambientA = document.getElementById('fmov-ambient-a');
                const ambientB = document.getElementById('fmov-ambient-b');
                if (ambientA && ambientB) {
                    const activeIsA = parseFloat(ambientA.style.opacity || 0.4) > 0.1;
                    const next = activeIsA ? ambientB : ambientA;
                    const prev = activeIsA ? ambientA : ambientB;
                    next.style.backgroundImage = `url(${posterUrl})`;
                    uptheme(posterUrl);
                    requestAnimationFrame(() => {
                        next.style.opacity = '0.4';
                        prev.style.opacity = '0';
                    });
                }
                
                updateDots(index);
            }, 400);
        }
        
        let dotEls = [];

        function buildDots(movies) {
            const container = document.getElementById('fmov-dots');
            if (!container) return;
            container.innerHTML = '';
            dotEls = movies.map((_, i) => {
                const d = document.createElement('div');
                d.style.cssText = `
                    height:6px; border-radius:3px; cursor:pointer; flex-shrink:0;
                    width:${i === 0 ? '28px' : '6px'};
                    background:${i === 0 ? '#ffffff' : 'rgba(255,255,255,0.35)'};
                    transition: width 0.4s cubic-bezier(0.175,0.885,0.32,1.1),
                                background 0.4s ease;
                `;
                d.onclick = () => goToSlide(i);
                container.appendChild(d);
                return d;
            });
        }

        function updateDots(index) {
            dotEls.forEach((d, i) => {
                d.style.width = i === index ? '28px' : '6px';
                d.style.background = i === index ? '#ffffff' : 'rgba(255,255,255,0.35)';
            });
        }
        
        window._featuredMovies = movies;
        window.goToSlide = (i) => {
            currentIndex = i;
            featuredMovie = movies[i];
            clearInterval(window._featuredInterval);
            renderSlide(i);
            window._featuredInterval = setInterval(() => {
                currentIndex = (currentIndex + 1) % movies.length;
                featuredMovie = movies[currentIndex];
                renderSlide(currentIndex);
            }, 4000);
        };
        buildDots(movies);
        renderSlide(0);
        
        clearInterval(window._featuredInterval);
        window._featuredInterval = setInterval(() => {
            currentIndex = (currentIndex + 1) % movies.length;
            featuredMovie = movies[currentIndex];
            renderSlide(currentIndex);
        }, 4000);
        
    } catch (err) {
        console.error('Failed to load featured movie:', err);
    }
}

async function loadGenreMovies() {
    const quizProfile = JSON.parse(localStorage.getItem('cinemi_userQuizProfile') || '{}');
    if (!quizProfile || !quizProfile.movieGenre) {
        if (!featuredGenres?.length) return;
        return await loadMoviesByGenre(featuredGenres[0]);
    }

    const res = await fetchWithAuth(`${baseUrl}/api/content/quiz-recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quizProfile)
    });

    if (!res.ok) throw new Error("quiz-recommend failed");

    const data = await res.json();
    const movies = data.movies || [];

    const genreLabel = document.getElementById('genre-label');
    if (genreLabel) {
        const genreName = await getGenreNameFromValue(quizProfile.movieGenre);
        genreLabel.innerHTML = `
            <span class="sec-sub">Because you like</span>
            <span class="sec-title">${genreName} movies</span>
        `;
    }

    const container = document.getElementById('genre');
    if (container) {
        container.innerHTML = '';
        movies.slice(0, 6).forEach((movie, idx) => {
            const posterUrl = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
            if (!posterUrl) return;
            const img = document.createElement('img');
            img.src = posterUrl;
            img.className = 'fade-in-content';
            img.style.animationDelay = `${idx * 0.1}s`;
            img.style.cursor = 'pointer';
            img.onclick = () => showDetails(movie);
            container.appendChild(img);
        });
        if (movies.length === 0) {
            container.innerHTML = '<div style="color: var(--text-subtle); padding: 20px;">No recommendations yet...</div>';
        }
    }
}

async function loadMoviesByGenre(genreId) {
    const res = await fetch(`${baseUrl}/api/tmdb/discover/genre/${genreId}`, { headers: ngrokHeaders });
    const data = await res.json();
    const genreName = await getGenreName(genreId);

    const genreLabel = document.getElementById('genre-label');
    if (genreLabel) {
        genreLabel.innerHTML = `
            <span class="sec-sub">Recommended for you</span>
            <span class="sec-title">${genreName} movies</span>
        `;
    }

    const container = document.getElementById('genre');
    if (container && data.results) {
        container.innerHTML = '';
        data.results.slice(0, 6).forEach((m, i) => {
            const url = m.poster_path ? `${IMG_W500}${m.poster_path}` : '';
            if (!url) return;
            const img = document.createElement('img');
            img.src = url;
            img.className = 'fade-in-content';
            img.style.animationDelay = `${i * 0.1}s`;
            img.style.cursor = 'pointer';
            img.onclick = () => showDetails(m);
            container.appendChild(img);
        });
    }
}

async function getGenreNameFromValue(quizValue) {
    const map = {
        'psychological_thriller': 'Psychological Thrillers',
        'action': 'Action',
        'horror': 'Horror',
        'romantic_drama': 'Romantic Dramas',
        'romantic_comedy': 'Rom-Coms',
        'fantasy': 'Fantasy',
        'science_fiction': 'Sci-Fi',
        'superheroes': 'Superhero Movies',
        'comedy': 'Comedy',
        'melancholic': 'Melancholic / Drama',
        'crime_detective': 'Crime & Detective'
    };
    return map[quizValue] || 'movies';
}

async function loadMoodMovies() {
    try {
        if (!featuredGenres || featuredGenres.length === 0) return;
        
        const genreIds = featuredGenres.length > 1 ? featuredGenres.slice(0, 2) : featuredGenres;
        const genreParam = genreIds.join(',');
        
        const res = await fetch(`${baseUrl}/api/tmdb/discover/mood?genres=${genreParam}`, {
            headers: ngrokHeaders
        });
        const data = await res.json();
        
        const moodContainer = document.getElementById('mood');
        if (moodContainer && data.results) {
            moodContainer.innerHTML = '';
            data.results.slice(0, 6).forEach((movie, idx) => {
                const posterUrl = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
                if (posterUrl) {
                    const img = document.createElement('img');
                    img.src = posterUrl;
                    img.className = 'fade-in-content';
                    img.style.animationDelay = `${idx * 0.1}s`;
                    img.style.cursor = 'pointer';
                    img.onclick = () => showDetails(movie);
                    moodContainer.appendChild(img);
                }
            });
        }
    } catch (err) {
        console.error('Failed to load mood movies:', err);
    }
}

async function loadAIRecommendations() {
    try {
        const moodLabel = document.getElementById('mood');
        if (moodLabel) moodLabel.innerHTML = '<span style="color: var(--sub-home);">AI Picks for</span> You';

        const { initNemo, scoreMovies } = await import('./nemo.js');
        await initNemo();

        const candRes = await fetchWithAuth(`${baseUrl}/api/nemo/candidates`);
        if (!candRes.ok) { await loadMoodMovies(); return; }
        const { candidates } = await candRes.json();
        if (!candidates || candidates.length === 0) { await loadMoodMovies(); return; }

        let recommendations = await scoreMovies(candidates);

        if (!recommendations || recommendations.length === 0) {
            const fallback = await fetchWithAuth(`${baseUrl}/api/recommendations`);
            if (fallback.ok) {
                const d = await fallback.json();
                recommendations = d.recommendations || [];
            }
        }

        if (!recommendations || recommendations.length === 0) { await loadMoodMovies(); return; }

        const moodContainer = document.getElementById('mood');
        if (moodContainer) {
            moodContainer.innerHTML = '';
            recommendations.slice(0, 6).forEach((movie, idx) => {
                const numericId = movie.movieId.includes('-') ? movie.movieId.split('-').pop() : movie.movieId;
                const posterUrl = movie.posterPath ? `${IMG_W500}${movie.posterPath}` : '';
                if (posterUrl) {
                    const img = document.createElement('img');
                    img.src = posterUrl;
                    img.className = 'fade-in-content';
                    img.style.animationDelay = `${idx * 0.1}s`;
                    img.style.cursor = 'pointer';
                    const movieObj = { id: parseInt(numericId), media_type: movie.mediaType || 'movie', title: movie.title, poster_path: movie.posterPath, backdrop_path: movie.backdropPath, overview: movie.overview, vote_average: movie.rating };
                    img.onclick = () => showDetails(movieObj);
                    moodContainer.appendChild(img);
                }
            });
        }
    } catch (err) {
        console.error('Failed to load AI recommendations:', err);
        await loadMoodMovies();
    }
}
async function loadTrendingMovies() {
    try {
        const res = await fetch(`${baseUrl}/api/tmdb/trending`, { headers: ngrokHeaders });
        const data = await res.json();
        
        const trendingContainer = document.querySelector('.m1-rec .mov:last-of-type');
        if (trendingContainer && data.results) {
            trendingContainer.innerHTML = '';
            data.results.slice(0, 6).forEach((movie, idx) => {
                const posterUrl = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
                if (posterUrl) {
                    const img = document.createElement('img');
                    img.src = posterUrl;
                    img.className = 'fade-in-content';
                    img.style.animationDelay = `${idx * 0.1}s`;
                    img.style.cursor = 'pointer';
                    img.onclick = () => showDetails(movie);
                    trendingContainer.appendChild(img);
                }
            });
        }
    } catch (err) {
        console.error('Failed to load trending:', err);
    }
}

async function initHomeFeed() {
    if (moviesLoaded) return;
    showSkeletonLoaders();
    await loadFeaturedMovie();
    if (featuredGenres && featuredGenres.length > 0) {
        await loadGenreMovies();
        await loadAIRecommendations();
    }
    await loadTrendingMovies();
    moviesLoaded = true;
}

async function getGenreName(genreId) {
    const genreMap = {
        28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
        80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
        14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
        9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
        53: 'Thriller', 10752: 'War', 37: 'Western'
    };
    return genreMap[genreId] || 'recommended';
}

async function getWatchProviders(id) {
    try {
        const res = await fetch(`${baseUrl}/api/tmdb/movie/${id}/watch/providers`, {
            headers: ngrokHeaders
        });
        const data = await res.json();
        const regions = ['US', 'GB', 'RO', 'CA', 'DE', 'FR'];
        for (const region of regions) {
            if (data.results?.[region]) {
                return data.results[region];
            }
        }
        return null;
    } catch (err) {
        console.error('Provider fetch error:', err);
        return null;
    }
}

async function loadReviews(movieId) {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/movies/${movieId}/reviews`);
        if (!res.ok) throw new Error('Failed to load reviews');
        const reviews = await res.json();
        const statsRes = await fetchWithAuth(`${baseUrl}/api/movies/${movieId}/stats`);
        const stats = statsRes.ok ? await statsRes.json() : { count: 0, averageRating: 0 };
        return { reviews, stats };
    } catch (err) {
        console.error('Review load error:', err);
        return { reviews: [], stats: { count: 0, averageRating: 0 } };
    }
}

async function addToWatchlist(movie) {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/watchlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movieId: `${movie.media_type}-${movie.id}`,
                title: movie.title || movie.name,
                posterPath: movie.poster_path,
                mediaType: movie.media_type || 'movie',
                overview: movie.overview,
                rating: movie.vote_average
            })
        });
        const data = await res.json();
        if (res.ok) return true;
        return false;
    } catch (err) {
        console.error('Watchlist error:', err);
        alert('Network error');
        return false;
    }
}

async function addToFavorites(movie) {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/favorites`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                movieId: `${movie.media_type}-${movie.id}`,
                title: movie.title || movie.name,
                posterPath: movie.poster_path,
                mediaType: movie.media_type || 'movie',
                overview: movie.overview,
                rating: movie.vote_average
            })
        });
        const data = await res.json();
        if (res.ok) return true;
        return false;
    } catch (err) {
        console.error('Favorites error:', err);
        alert('Network error');
        return false;
    }
}

async function removeFromWatchlist(movieId) {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/watchlist/${movieId}`, { method: 'DELETE' });
        if (res.ok) return true;
        return false;
    } catch (err) {
        console.error('Remove error:', err);
        return false;
    }
}

async function removeFromFavorites(movieId) {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/favorites/${movieId}`, { method: 'DELETE' });
        if (res.ok) return true;
        return false;
    } catch (err) {
        console.error('Remove error:', err);
        return false;
    }
}

async function showDetails(item) {
    const isTV = item.media_type === 'tv';
    const title = item.title || item.name;
    const releaseDate = item.release_date || item.first_air_date;
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    const backdrop = item.backdrop_path ? `${IMG_BACKDROP}${item.backdrop_path}` : `${IMG_W500}${item.poster_path}`;
    
    overlay.innerHTML = `
        <div class="modal-content">
            <button class="modal-close-btn"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#000000"><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg></button>
            <div id="trailer-container" style="position: relative; width: 100%; height: 280px; background: #000; display: none;">
                <div id="youtube-player"></div>
                <div id="youtube-blocker" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 1; pointer-events: auto;"></div>
                <div id="custom-controls" style="position: absolute; bottom: 0; left: 0; right: 0; background: linear-gradient(transparent, rgba(0,0,0,0.8)); padding: 15px; display: flex; align-items: center; gap: 10px; z-index: 2; pointer-events: auto;">
                    <button id="play-pause-btn" style="background: none; border: none; cursor: pointer; padding: 5px; pointer-events: auto;">
                        <svg id="play-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white"><path d="M320-200v-560l440 280-440 280Z"/></svg>
                        <svg id="pause-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white" style="display: none;"><path d="M520-200v-560h240v560H520Zm-320 0v-560h240v560H200Z"/></svg>
                    </button>
                    <div id="progress-bar" style="flex: 1; height: 4px; background: rgba(255,255,255,0.3); border-radius: 2px; cursor: pointer; position: relative; pointer-events: auto;">
                        <div id="progress-fill" style="height: 100%; background: var(--button-bg); border-radius: 2px; width: 0%;"></div>
                    </div>
                    <span id="time-display" style="color: white; font-size: 12px; min-width: 80px;">0:00 / 0:00</span>
                    <button id="mute-btn" style="background: none; border: none; cursor: pointer; padding: 5px; pointer-events: auto;">
                        <svg id="volume-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Z"/></svg>
                        <svg id="mute-icon" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white" style="display: none;"><path d="M792-56 671-177q-25 16-53 27.5T560-131v-82q14-5 27.5-10t25.5-12L480-368v208L280-360H120v-240h128L56-792l56-56 736 736-56 56Z"/></svg>
                    </button>
                    <button id="fullscreen-btn" style="background: none; border: none; cursor: pointer; padding: 5px; pointer-events: auto;">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white"><path d="M120-120v-200h80v120h120v80H120Zm520 0v-80h120v-120h80v200H640ZM120-640v-200h200v80H200v120h-80Zm640 0v-120H640v-80h200v200h-80Z"/></svg>
                    </button>
                </div>
            </div>
            <img src="${backdrop}" class="modal-header-img" id="backdrop-img">
            <div class="modal-body">
                <h2 class="modal-title">${escapeHtml(title)}</h2>
                <div class="modal-meta" id="modal-meta-container">
                    <span>${releaseDate ? releaseDate.split('-')[0] : 'N/A'}</span>
                    <span style="color:#46d369;">⭐ ${item.vote_average.toFixed(1)}</span>
                    <span style="border:1px solid; padding:0 4px; border-radius:3px; font-size:11px;">${isTV ? 'TV' : 'HD'}</span>
                </div>
                <p class="modal-overview">${escapeHtml(item.overview)}</p>
                <div id="modal-providers-list" style="margin-top:20px;"></div>
                <div style="display:flex; gap:10px; margin-top:15px;">
                    <button id="add-to-watchlist-btn" style="flex:1; padding:10px; background:var(--button-bg); color:var(--button-text); border:none; border-radius:8px; cursor:pointer; font-weight:600;">Add to Watchlist</button>
                    <button id="add-to-favorites-btn" style="flex:1; padding:10px; background:#ff4444; color:white; border:none; border-radius:8px; cursor:pointer; font-weight:600;">Add to Favorites</button>
                </div>
                <div id="reviews-section" style="margin-top:30px; border-top: 1px solid var(--border-dark-alpha-2); padding-top:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                        <h3 style="margin:0; font-size:18px;">Reviews</h3>
                        <div id="review-stats" style="font-size:14px; color:var(--text-subtle);"></div>
                    </div>
                    <div id="add-review-form" style="margin-bottom:20px; padding:15px; background:var(--iconbox-bg); border-radius:12px;">
                        <div style="margin-bottom:10px;">
                            <label style="font-size:14px; font-weight:600; display:block; margin-bottom:8px;">Your Rating</label>
                            <div id="star-rating" style="display:flex; gap:5px;">
                                ${[1,2,3,4,5].map(n => `<button class="star-btn" data-rating="${n}" style="background:none; border:none; font-size:28px; cursor:pointer; padding:0;">☆</button>`).join('')}
                            </div>
                        </div>
                        <textarea id="review-text" placeholder="Write your review... (optional)" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-light); background:var(--bg-secondary); color:var(--text-primary); resize:none; font-family:inherit; box-sizing:border-box;" rows="3"></textarea>
                        <button id="submit-review" style="margin-top:10px; padding:8px 16px; background:var(--button-bg); color:var(--button-text); border:none; border-radius:8px; cursor:pointer; font-weight:600;">Submit Review</button>
                    </div>
                    <div id="reviews-list"></div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    overlay.querySelector('#add-to-watchlist-btn').onclick = () => addToWatchlist(item);
    overlay.querySelector('#add-to-favorites-btn').onclick = () => addToFavorites(item);
    document.body.style.overflow = 'hidden';

    let player = null;
    let updateInterval = null;
    
    const trailerContainer = overlay.querySelector('#trailer-container');
    const backdropImg = overlay.querySelector('#backdrop-img');
    const customControls = overlay.querySelector('#custom-controls');
    const playPauseBtn = overlay.querySelector('#play-pause-btn');
    const playIcon = overlay.querySelector('#play-icon');
    const pauseIcon = overlay.querySelector('#pause-icon');
    const progressBar = overlay.querySelector('#progress-bar');
    const progressFill = overlay.querySelector('#progress-fill');
    const timeDisplay = overlay.querySelector('#time-display');
    const muteBtn = overlay.querySelector('#mute-btn');
    const volumeIcon = overlay.querySelector('#volume-icon');
    const muteIcon = overlay.querySelector('#mute-icon');
    const fullscreenBtn = overlay.querySelector('#fullscreen-btn');
    const metaContainer = overlay.querySelector('#modal-meta-container');
    const youtubeBlocker = overlay.querySelector('#youtube-blocker');

    const close = () => {
        if (updateInterval) {
            clearInterval(updateInterval);
            updateInterval = null;
        }
        if (player) {
            player.pauseVideo();
            trailerContainer.style.display = 'none';
        }
        overlay.remove();
        document.body.style.overflow = '';
    };

    overlay.querySelector('.modal-close-btn').onclick = close;
    overlay.onclick = (e) => { if (e.target === overlay) close(); };

    function handleFullscreenChange() {
        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || 
                                document.mozFullScreenElement || document.msFullscreenElement);
        const navh = document.querySelector('.navh');
        if (isFullscreen) {
            fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white"><path d="M240-120v-120H120v-80h200v200h-80Zm400 0v-200h200v80H720v120h-80ZM120-640v-80h120v-120h80v200H120Zm520 0v-200h80v120h120v80H640Z"/></svg>';
            if (navh) navh.classList.add('hide');
        } else {
            fullscreenBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="white"><path d="M120-120v-200h80v120h120v80H120Zm520 0v-80h120v-120h80v200H640ZM120-640v-200h200v80H200v120h-80Zm640 0v-120H640v-80h200v200h-80Z"/></svg>';
            if (navh) navh.classList.remove('hide');
        }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    const endpoint = isTV ? 'tv' : 'movie';
    
    fetch(`${baseUrl}/api/tmdb/${endpoint}/${item.id}/videos`, { headers: ngrokHeaders })
        .then(res => res.json())
        .then(data => {
            const trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
            
            if (trailer) {
                const trailerBtn = document.createElement('button');
                trailerBtn.id = 'watch-trailer-btn';
                trailerBtn.innerHTML = '▶ Watch Trailer';
                trailerBtn.style.cssText = 'margin-left: 10px; padding: 6px 12px; background: var(--button-bg); color: var(--button-text); border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px;';
                
                const closeTrailerBtn = document.createElement('button');
                closeTrailerBtn.id = 'close-trailer-btn';
                closeTrailerBtn.innerHTML = '✕ Close Trailer';
                closeTrailerBtn.style.cssText = 'margin-left: 10px; padding: 6px 12px; background: #ff4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600; font-size: 12px; display: none;';
                
                metaContainer.appendChild(trailerBtn);
                metaContainer.appendChild(closeTrailerBtn);
                
                trailerBtn.onclick = async () => {
                    backdropImg.style.display = 'none';
                    trailerContainer.style.display = 'block';
                    trailerBtn.style.display = 'none';
                    closeTrailerBtn.style.display = 'inline-block';
                    
                    if (!player) {
                        if (!window.YT) {
                            const tag = document.createElement('script');
                            tag.src = 'https://www.youtube.com/iframe_api';
                            document.head.appendChild(tag);
                            await new Promise(resolve => { window.onYouTubeIframeAPIReady = resolve; });
                        }
                        
                        player = new YT.Player('youtube-player', {
                            height: '280',
                            width: '100%',
                            videoId: trailer.key,
                            playerVars: { 'controls': 0, 'modestbranding': 1, 'rel': 0, 'playsinline': 1, 'fs': 1 },
                            events: {
                                'onReady': () => {
                                    updateTimeDisplay();
                                    updateInterval = setInterval(updateTimeDisplay, 100);
                                }
                            }
                        });
                        
                        playPauseBtn.onclick = (e) => {
                            e.stopPropagation();
                            const state = player.getPlayerState();
                            if (state === YT.PlayerState.PLAYING) player.pauseVideo();
                            else player.playVideo();
                        };
                        
                        progressBar.onclick = (e) => {
                            e.stopPropagation();
                            const rect = progressBar.getBoundingClientRect();
                            const percent = (e.clientX - rect.left) / rect.width;
                            player.seekTo(player.getDuration() * percent);
                        };
                        
                        muteBtn.onclick = (e) => {
                            e.stopPropagation();
                            if (player.isMuted()) player.unMute();
                            else player.mute();
                        };
                        
                        fullscreenBtn.onclick = (e) => {
                            e.stopPropagation();
                            const iframe = document.querySelector('#youtube-player');
                            if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
                                if (document.exitFullscreen) document.exitFullscreen();
                                else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
                                else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
                                else if (document.msExitFullscreen) document.msExitFullscreen();
                            } else {
                                if (iframe.requestFullscreen) iframe.requestFullscreen();
                                else if (iframe.webkitRequestFullscreen) iframe.webkitRequestFullscreen();
                                else if (iframe.webkitEnterFullscreen) iframe.webkitEnterFullscreen();
                                else if (iframe.mozRequestFullScreen) iframe.mozRequestFullScreen();
                                else if (iframe.msRequestFullscreen) iframe.msRequestFullscreen();
                            }
                        };
                        
                        youtubeBlocker.onclick = (e) => {
                            e.stopPropagation();
                            const state = player.getPlayerState();
                            if (state === YT.PlayerState.PLAYING) player.pauseVideo();
                            else player.playVideo();
                        };
                        
                        function updateTimeDisplay() {
                            if (!player || !player.getDuration) return;
                            const current = player.getCurrentTime();
                            const duration = player.getDuration();
                            const percent = (current / duration) * 100;
                            progressFill.style.width = `${percent}%`;
                            timeDisplay.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
                            const state = player.getPlayerState();
                            if (state === YT.PlayerState.PLAYING) {
                                playIcon.style.display = 'none';
                                pauseIcon.style.display = 'block';
                            } else {
                                playIcon.style.display = 'block';
                                pauseIcon.style.display = 'none';
                            }
                            if (player.isMuted()) {
                                volumeIcon.style.display = 'none';
                                muteIcon.style.display = 'block';
                            } else {
                                volumeIcon.style.display = 'block';
                                muteIcon.style.display = 'none';
                            }
                        }
                        
                        function formatTime(seconds) {
                            const mins = Math.floor(seconds / 60);
                            const secs = Math.floor(seconds % 60);
                            return `${mins}:${secs.toString().padStart(2, '0')}`;
                        }
                    }
                };
                
                closeTrailerBtn.onclick = () => {
                    if (player) player.pauseVideo();
                    trailerContainer.style.display = 'none';
                    backdropImg.style.display = 'block';
                    trailerBtn.style.display = 'inline-block';
                    closeTrailerBtn.style.display = 'none';
                };
            }
        })
        .catch(err => console.error('Failed to load trailer:', err));

    fetch(`${baseUrl}/api/tmdb/${endpoint}/${item.id}/watch/providers`, { headers: ngrokHeaders })
        .then(res => res.json())
        .then(providers => {
            const pList = document.getElementById('modal-providers-list');
            if (providers.results && pList) {
                const regions = ['US', 'GB', 'RO', 'CA', 'DE', 'FR'];
                for (const region of regions) {
                    if (providers.results[region]) {
                        const all = [...(providers.results[region].flatrate || []), ...(providers.results[region].buy || [])];
                        if (all.length > 0) {
                            pList.innerHTML = '<div style="font-size:13px; margin-bottom:8px; font-weight:600;">Available on:</div>' +
                                [...new Map(all.map(p => [p.provider_id, p])).values()]
                                .slice(0, 5)
                                .map(p => `<span class="provider-badge">${p.provider_name}</span>`).join('');
                            break;
                        }
                    }
                }
            }
        });

    let selectedRating = 0;
    const starBtns = overlay.querySelectorAll('.star-btn');
    
    starBtns.forEach(btn => {
        btn.onclick = () => {
            selectedRating = parseInt(btn.dataset.rating);
            starBtns.forEach((s, i) => {
                s.textContent = i < selectedRating ? '★' : '☆';
                s.style.color = i < selectedRating ? '#ffc107' : 'var(--text-subtle)';
            });
        };
    });

    overlay.querySelector('#submit-review').onclick = async () => {
        if (selectedRating === 0) {
            alert('Please select a rating');
            return;
        }
        
        const text = overlay.querySelector('#review-text').value.trim();
        const username = (document.getElementById('addUsername')?.value || 'user_tag').trim();
        const displayName = document.querySelector('.p-name')?.textContent || username;
        const photoUrl = localStorage.getItem(`profilePhotoUrl_${username}`) || 'https://i.imgflip.com/1ickup.jpg';
        const contentId = `${item.media_type}-${item.id}`;
        
        const optimisticReview = {
            id: 'temp-' + Date.now(),
            movieId: item.id,
            username,
            displayName,
            photoUrl,
            rating: selectedRating,
            text,
            createdAt: new Date().toISOString()
        };
        
        if (currentFeed === 'reviews') {
            const postsContainer = document.getElementById('posts');
            const noReviewsMsg = postsContainer.querySelector('div[style*="No reviews yet"]');
            if (noReviewsMsg) postsContainer.innerHTML = '';
            const reviewPost = await createReviewPost(optimisticReview);
            reviewPost.setAttribute('data-temp-review-id', optimisticReview.id);
            postsContainer.insertBefore(reviewPost, postsContainer.firstChild);
        }
        
        try {
            const res = await fetchWithAuth(`${baseUrl}/api/movies/${contentId}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: selectedRating, text })
            });
            
            if (!res.ok) throw new Error('Failed to submit review');
            const result = await res.json();
            
            if (currentFeed === 'reviews') {
                const tempReview = document.querySelector(`[data-temp-review-id="${optimisticReview.id}"]`);
                if (tempReview) {
                    const actualReviewPost = await createReviewPost(result.review);
                    tempReview.parentNode.replaceChild(actualReviewPost, tempReview);
                }
            }
            
            overlay.querySelector('#review-text').value = '';
            selectedRating = 0;
            starBtns.forEach(s => {
                s.textContent = '☆';
                s.style.color = 'var(--text-subtle)';
            });
            
            loadAndDisplayReviews(contentId);
        } catch (err) {
            if (currentFeed === 'reviews') {
                const tempReview = document.querySelector(`[data-temp-review-id="${optimisticReview.id}"]`);
                if (tempReview) tempReview.remove();
            }
            alert('Failed to submit review. Please try again.');
        }
    };

    loadAndDisplayReviews(`${item.media_type}-${item.id}`);
}

async function loadAndDisplayReviews(movieId) {
    const { reviews, stats } = await loadReviews(movieId);
    
    const statsEl = document.getElementById('review-stats');
    if (statsEl) {
        if (stats.count > 0) {
            statsEl.innerHTML = `⭐ ${stats.averageRating} (${stats.count} review${stats.count !== 1 ? 's' : ''})`;
        } else {
            statsEl.innerHTML = 'No reviews yet';
        }
    }
    
    const listEl = document.getElementById('reviews-list');
    if (!listEl) return;
    
    if (reviews.length === 0) {
        listEl.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-subtle);">No reviews yet. Be the first!</div>';
        return;
    }
    
    listEl.innerHTML = reviews.map(r => `
        <div style="padding:15px; border-bottom:1px solid var(--border-dark-alpha-2);">
            <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                <img src="${r.photoUrl}" style="width:32px; height:32px; border-radius:50%; object-fit:cover;">
                <div style="flex:1;">
                    <div style="font-weight:600; font-size:14px;">${escapeHtml(r.displayName || r.username)}</div>
                    <div style="font-size:12px; color:var(--text-subtle);">${formatTimeAgo(r.createdAt)}</div>
                </div>
                <div style="color:#ffc107; font-size:16px;">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</div>
            </div>
            ${r.text ? `<div style="font-size:14px; line-height:1.4; color:var(--text-secondary);">${escapeHtml(r.text)}</div>` : ''}
        </div>
    `).join('');
}

async function loadWatchlist() {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/watchlist`);
        if (!res.ok) throw new Error('Failed to load watchlist');
        return await res.json();
    } catch (err) {
        console.error('Watchlist load error:', err);
        return [];
    }
}

async function loadFavorites() {
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/favorites`);
        if (!res.ok) throw new Error('Failed to load favorites');
        return await res.json();
    } catch (err) {
        console.error('Favorites load error:', err);
        return [];
    }
}

async function showWatchlistPanel() {
    const movies = await loadWatchlist();
    const panel = document.getElementById('watchlist-panel');
    const sheet = panel.querySelector('.sheet');
    if (movies.length === 0) {
        sheet.innerHTML = `
            <h2>Watch List</h2>
            <p style="text-align:center; color:var(--text-subtle); padding:40px;">No movies in your watchlist yet!</p>
            <button class="btn-close" onclick="closePanel('watchlist')">Close</button>
        `;
    } else {
        sheet.innerHTML = `
            <h2>Watch List (${movies.length})</h2>
            <div style="max-height:60vh; overflow-y:auto; margin:20px 0;">
                ${movies.map(m => `
                    <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center;">
                        <img src="${IMG_W500}${m.posterPath}" style="width:50px; height:75px; border-radius:8px; object-fit:cover;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:14px;">${escapeHtml(m.title)}</div>
                            <div style="font-size:12px; color:var(--text-subtle);">⭐ ${m.rating?.toFixed(1) || 'N/A'}</div>
                        </div>
                        <button onclick="removeFromWatchlistUI('${m.movieId}')" style="padding:8px 12px; background:#ff4444; color:white; border:none; border-radius:6px; cursor:pointer;">Remove</button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-close" onclick="closePanel('watchlist')">Close</button>
        `;
    }
}

async function showFavoritesPanel() {
    const movies = await loadFavorites();
    const panel = document.getElementById('favorites-panel');
    const sheet = panel.querySelector('.sheet');
    if (movies.length === 0) {
        sheet.innerHTML = `
            <h2>Favorites</h2>
            <p style="text-align:center; color:var(--text-subtle); padding:40px;">No favorite movies yet!</p>
            <button class="btn-close" onclick="closePanel('favorites')">Close</button>
        `;
    } else {
        sheet.innerHTML = `
            <h2>Favorites (${movies.length})</h2>
            <div style="max-height:60vh; overflow-y:auto; margin:20px 0;">
                ${movies.map(m => `
                    <div style="display:flex; gap:12px; padding:12px; border-bottom:1px solid var(--border-dark-alpha-2); align-items:center;">
                        <img src="${IMG_W500}${m.posterPath}" style="width:50px; height:75px; border-radius:8px; object-fit:cover;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:14px;">${escapeHtml(m.title)}</div>
                            <div style="font-size:12px; color:var(--text-subtle);">⭐ ${m.rating?.toFixed(1) || 'N/A'}</div>
                        </div>
                        <button onclick="removeFromFavoritesUI('${m.movieId}')" style="display:flex; align-items:center; justify-content:center; padding:8px 8px; color:white; border:none;border-radius:6px;cursor:pointer;background-color:var(--placeholder-bg);"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#999999"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm80-160h80v-360h-80v360Zm160 0h80v-360h-80v360Z"/></svg></button>
                    </div>
                `).join('')}
            </div>
            <button class="btn-close" onclick="closePanel('favorites')">Close</button>
        `;
    }
}

async function removeFromWatchlistUI(movieId) {
    const success = await removeFromWatchlist(movieId);
    if (success) showWatchlistPanel();
}

async function removeFromFavoritesUI(movieId) {
    const success = await removeFromFavorites(movieId);
    if (success) showFavoritesPanel();
}

async function showMovieDetails(movieId) {
    const numericId = movieId.includes('-') ? movieId.split('-').pop() : movieId;
    const mediaType = movieId.startsWith('tv-') ? 'tv' : 'movie';
    try {
        const res = await fetch(`${baseUrl}/api/tmdb/${mediaType === 'tv' ? 'tv' : 'movie'}/${numericId}`, { headers: ngrokHeaders });
        if (res.ok) {
            const movie = await res.json();
            movie.media_type = mediaType;
            showDetails(movie);
        }
    } catch (err) {
        console.error('Failed to load movie:', err);
    }
}
