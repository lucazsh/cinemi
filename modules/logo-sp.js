(function() {
    const splash = document.getElementById('logo-sp');
    const logo = document.getElementById('sp-logo');

    const isDark = !document.documentElement.classList.contains('light-mode') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    logo.src = isDark ? '/icons/sp_dark.png' : '/icons/sp_light.png';

    const setupDone = localStorage.getItem('quizCompleted') === 'true' ||
        localStorage.getItem('isAuthenticated') === 'true' ||
        localStorage.getItem('guestMode') === 'true';
    if (setupDone) {
        _splashPrefetch();
    }

    setTimeout(() => {
        splash.classList.remove('active');
        if (setupDone) {
            showView('home');
        } else {
            document.getElementById('setup').classList.add('active');
        }
    }, 2000);

    async function _splashPrefetch() {
        try {
            const username = (document.getElementById('addUsername')?.textContent || '').trim();
            if (!username) return;
            if (typeof loadSpaceStateFromServer === 'function') {
                await loadSpaceStateFromServer(username);
                localStorage.setItem('cinemi_spaceCache_ts', Date.now());
            }
            const [followersRes, followingRes, favsRes, wlRes] = await Promise.allSettled([
                fetchWithAuth(`${baseUrl}/api/user/${username}/followers`),
                fetchWithAuth(`${baseUrl}/api/user/${username}/following`),
                fetchWithAuth(`${baseUrl}/api/user/${username}/favorites`),
                fetchWithAuth(`${baseUrl}/api/user/${username}/watchlist`)
            ]);
            const followers = followersRes.status === 'fulfilled' ? await followersRes.value.json() : [];
            const following = followingRes.status === 'fulfilled' ? await followingRes.value.json() : [];
            const favs      = favsRes.status === 'fulfilled'      ? await favsRes.value.json()      : [];
            const wl        = wlRes.status === 'fulfilled'        ? await wlRes.value.json()         : [];

            const friendCount = new Set([
                ...followers.map(f => f.username),
                ...following.map(f => f.username)
            ]).size;

            localStorage.setItem('cinemi_others_friendCount', friendCount);
            localStorage.setItem('cinemi_others_favCount',    Array.isArray(favs) ? favs.length : 0);
            localStorage.setItem('cinemi_others_wlCount',     Array.isArray(wl)   ? wl.length   : 0);
            localStorage.setItem('cinemi_others_ts',          Date.now());
            _applyOthersCounts();

        } catch(e) { console.warn('splash prefetch failed', e); }
    }

    function _applyOthersCounts() {
        const fc = document.getElementById('friendsCount');
        const n  = parseInt(localStorage.getItem('cinemi_others_friendCount') || '0');
        if (fc) fc.textContent = `${n} friend${n !== 1 ? 's' : ''}`;

        const favSub = document.querySelector('#profile-tab-other .card[onclick*="favorites"] .subtitle');
        const fav    = parseInt(localStorage.getItem('cinemi_others_favCount') || '0');
        if (favSub) favSub.textContent = `${fav} movie${fav !== 1 ? 's' : ''}`;

        const wlSub  = document.querySelector('#profile-tab-other .card[onclick*="watchlist"] .subtitle');
        const wl     = parseInt(localStorage.getItem('cinemi_others_wlCount') || '0');
        if (wlSub) wlSub.textContent = `${wl} movie${wl !== 1 ? 's' : ''}`;
    }

    window._applyOthersCounts = _applyOthersCounts;
})();
