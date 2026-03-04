(function() {
    const splash = document.getElementById('logo-sp');
    const logo = document.getElementById('sp-logo');

    const isDark = !document.documentElement.classList.contains('light-mode') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches;

    logo.src = isDark ? '/icons/sp_light.png' : '/icons/sp_dark.png';

    const setupDone = localStorage.getItem('quizCompleted') === 'true' ||
        localStorage.getItem('isAuthenticated') === 'true' ||
        localStorage.getItem('guestMode') === 'true';

    setTimeout(() => {
        splash.classList.remove('active');
        if (setupDone) {
            showView('home');
        } else {
            document.getElementById('setup').classList.add('active');
        }
    }, 2000);
})();
