let sessionToken = localStorage.getItem('sessionToken');
const urlParams = new URLSearchParams(window.location.search);
const urlSessionToken = urlParams.get('sessionToken');
const googleSigninBtn = document.getElementById('google-signin-btn');
const logoutBtn = document.querySelector('[data-action="logout"]');

if (urlSessionToken) {
    console.log('Received session token from Google login');
    sessionToken = urlSessionToken;
    localStorage.setItem('sessionToken', sessionToken);
    window.history.replaceState({}, document.title, window.location.pathname);
}

async function fetchWithAuth(url, options = {}) {
    if (!options.headers) options.headers = {};
    
    if (sessionToken) {
        options.headers['X-Session-Token'] = sessionToken;
    }
    
    Object.assign(options.headers, ngrokHeaders);
    options.credentials = 'include';
    
    return fetch(url, options);
}

if (urlSessionToken) {
    console.log('Received session token from Google login');
    sessionToken = urlSessionToken;
    localStorage.setItem('sessionToken', sessionToken);
    window.history.replaceState({}, document.title, window.location.pathname);
}

async function checkAuthStatus() {
    if (localStorage.getItem('guestMode') === 'true') {
        document.getElementById('login-screen').style.display = 'none';
        return false;
    }
    const loginScreen = document.getElementById('login-screen');
    
    if (sessionToken && localStorage.getItem('isAuthenticated') === 'true') {
        if (loginScreen) loginScreen.style.display = 'none';
    }
    
    try {
        const res = await fetchWithAuth(baseUrl + '/auth/user');
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const data = await res.json();
        
        if (data.ok && data.user) {
            localStorage.setItem('isAuthenticated', 'true');
            
            if (loginScreen) loginScreen.style.display = 'none';
            
            if (!data.user.username) {
                showUsernameSetup();
                return false;
            }
            
            const usernameField = document.getElementById('addUsername');
            if (usernameField) {
                usernameField.value = data.user.username;
                usernameField.disabled = true;
            }
            
            if (data.user.photoUrl) {
                const profileImg = document.getElementById('profileImg');
                if (profileImg) profileImg.src = data.user.photoUrl;
                try {
                    localStorage.setItem(`profilePhotoUrl_${data.user.username}`, data.user.photoUrl);
                } catch(e) {}
            }
            
            document.querySelectorAll('.p-name').forEach(el => {
                el.textContent = data.user.displayName || data.user.username;
            });
            
            document.querySelectorAll('.p-tag').forEach(el => {
                el.textContent = '@' + data.user.username;
            });
            
            return true;
        } else {
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('isAuthenticated');
            sessionToken = null;
            if (loginScreen) loginScreen.style.display = 'flex';
            return false;
        }
    } catch (err) {
        console.error("Auth check failed:", err);
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('isAuthenticated');
        sessionToken = null;
        if (loginScreen) loginScreen.style.display = 'flex';
        return false;
    }
}
if (googleSigninBtn) {
    googleSigninBtn.addEventListener('click', function() {
        window.location.href = baseUrl + '/auth/google';
    });
}


logoutBtn.addEventListener('click', logout);
logoutBtn.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        logout();
    }
});

checkAuthStatus();
checkAuthStatus().then(async isAuth => {
    if (isAuth) {
        const quizDone = await checkQuizStatus();
        if (quizDone) {
            await initHomeFeed();
            await updateMyFriendsCount();
        }
    }
});

document.getElementById('guest-btn')?.addEventListener('click', () => {
    localStorage.setItem('guestMode', 'true');
    document.getElementById('login-screen').style.display = 'none';
    loadInitialPostsFromServer();
});

async function showUsernameSetup() {
    const setup = document.getElementById('username-setup');
    const input = document.getElementById('username-input');
    const error = document.getElementById('username-error');
    const btn = document.getElementById('username-submit');
    
    setup.style.display = 'flex';
    setTimeout(() => input.focus(), 100);
    
    input.addEventListener('input', () => {
        error.textContent = '';
        input.style.borderColor = 'var(--border-light)';
    });
    
    const submit = async () => {
        const username = input.value.trim();
        
        if (username.length < 3) {
            error.textContent = 'Username must be at least 3 characters';
            input.style.borderColor = '#ff4444';
            return;
        }
        
        btn.disabled = true;
        btn.textContent = 'Checking...';
        
        try {
            const res = await fetchWithAuth(`${baseUrl}/auth/set-username`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username })
            });
            
            const data = await res.json();
            
            if (!res.ok) {
                error.textContent = data.error || 'Username taken or invalid';
                input.style.borderColor = '#ff4444';
                btn.disabled = false;
                btn.textContent = 'Continue';
                return;
            }
            
            setup.style.display = 'none';
            
            document.getElementById('addUsername').value = data.username;
            document.querySelectorAll('.p-tag').forEach(el => {
                el.textContent = '@' + data.username;
            });
            
            await checkQuizStatus();
            
        } catch (err) {
            error.textContent = 'Network error. Please try again.';
            btn.disabled = false;
            btn.textContent = 'Continue';
        }
    };
    
    btn.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
    });
}

function logout() {
    fetchWithAuth(baseUrl + '/auth/logout')
        .then(() => {
            localStorage.removeItem('sessionToken');
            localStorage.removeItem('isAuthenticated');
            sessionToken = null;
            localStorage.clear();
            window.location.reload();
        })
        .catch(err => console.error(err));

}

