function showView(id) {
    const add = document.getElementById('add');
    if (id === 'replies') {
        const replies = document.getElementById('replies');
        replies.classList.add('active');
        setTimeout(() => {
            document.getElementById('replyTextarea')?.focus();
        }, 120);
        return;
    }
    if (id === 'add') {
        add.classList.add('active');
        setTimeout(() => {
            const ta = document.getElementById('postTextarea');
            if (ta) ta.focus();
        }, 120);
        updateNavActive(id);
        return;
    }
    add.classList.remove('active');
    document.querySelectorAll('.view').forEach(v => {
        if (v.id !== 'add') v.classList.remove('active');
    });
    const safeBar = document.getElementById('safe-area-bar');
    if (safeBar) safeBar.style.opacity = '0';
    
    document.getElementById('replies')?.classList.remove('active')
    document.getElementById(id).classList.add('active');
    
    if (id === 'home') {
        initHomeFeed();
    }
    
    updateNavActive(id);
}
const homeEl = document.getElementById('home');
if (homeEl) {
    const nt = homeEl.querySelector('.nt');
    const safeBar = document.getElementById('safe-area-bar');
    nt.style.transition = 'transform 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease, background-color 0.35s ease';
    safeBar.style.transition = 'opacity 0.35s ease';

    let lastScrollY = 0;
    let ticking = false;

    homeEl.addEventListener('scroll', () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const current = homeEl.scrollTop;
            nt.classList.toggle('scrolled', current > 10);
            if (current > lastScrollY && current > 80) {
                nt.style.transform = 'translateY(-100%)';
                nt.style.opacity = '0';
                nt.style.pointerEvents = 'none';
                safeBar.style.opacity = '1';
            } else {
                nt.style.transform = 'translateY(0)';
                nt.style.opacity = '1';
                nt.style.pointerEvents = 'auto';
                safeBar.style.opacity = '0';
            }
            lastScrollY = current;
            ticking = false;
        });
    }, { passive: true });
}
function updateNavActive(id) {
    const buttons = document.querySelectorAll('.navh button');
    buttons.forEach(btn => btn.classList.remove('active'));
    const btn = Array.from(buttons).find(b => b.getAttribute('onclick')?.includes(id));
    if (btn) btn.classList.add('active');
}

function closeAdd() {
    const add = document.getElementById('add');
    add.classList.remove('active');
}
function closeReplies() {
    const replies = document.getElementById('replies');
    replies.classList.remove('active');
    if (replyPollingInterval) {
        clearInterval(replyPollingInterval);
        replyPollingInterval = null;
    }
    seenReplyIds = new Set();
    lastReplyTimestamp = 0;
}

(function() {
    function magicRotate(row) {
        const imgs = row.querySelectorAll('img');
        let lastAngle = 0;
        imgs.forEach((img, i) => {
            let angle, attempts = 0;
            do {
                const mag = 3 + Math.random() * 3.7;
                const sign = (i % 2 === 0 ? 1 : -1) * (Math.random() > 0.15 ? 1 : -1);
                angle = sign * mag;
                attempts++;
            } while (Math.abs(angle - lastAngle) < 2 && attempts < 10);
            lastAngle = angle;
            img._baseAngle = angle;
            img.style.transform = `rotate(${angle.toFixed(1)}deg)`;
            img.style.transition = 'transform 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.1)';
        });
    }

    const row = document.getElementById('mood');
    if (!row) return;
    magicRotate(row);
    let lastScrollY = 0;
    let ticking = false;

    row.closest('.view, #home') && row.closest('.view, #home').addEventListener('scroll', function() {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
            const scrollY = this.scrollTop;
            const delta = scrollY - lastScrollY;
            lastScrollY = scrollY;

            row.querySelectorAll('img').forEach((img, i) => {
                const base = img._baseAngle || 0;
                const wobble = delta * 0.08 * (i % 2 === 0 ? 1 : -1);
                const clamped = Math.max(-5, Math.min(6.7, base + wobble));
                img.style.transform = `rotate(${clamped.toFixed(2)}deg)`;
            });
            clearTimeout(row._resetTimer);
            row._resetTimer = setTimeout(() => {
                row.querySelectorAll('img').forEach(img => {
                    img.style.transform = `rotate(${(img._baseAngle || 0).toFixed(1)}deg)`;
                });
            }, 400);

            ticking = false;
        });
    }, { passive: true });
})();

function forceSafeAreaUpdate() {
    const root = document.documentElement;
    const navh = document.querySelector('.navh');
    root.style.setProperty('--safe-area-bottom', '0px');
    void root.offsetHeight;
    
    window.scrollBy(0, 1);
    window.scrollBy(0, -1);

    root.style.setProperty('--safe-area-bottom', 'env(safe-area-inset-bottom)');

    if (navh) {
        navh.style.transform = 'translateX(-50%) translateY(1px)';
        void navh.offsetHeight;
        navh.style.transform = 'translateX(-50%)';
    }
}

if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', forceSafeAreaUpdate);
}

const container = document.getElementById('login-screen');
const tickerContainer = document.getElementById('ticker-container');
const strips = document.querySelectorAll('.ticker-strip');

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
    navigator.serviceWorker.register("/modules/sw.js")
        .then(reg => console.log("SW registered", reg))
        .catch(err => console.error("SW error", err));
    });
}

if (/Android/i.test(navigator.userAgent)) {
    document.documentElement.classList.add('is-android');
}

document.addEventListener('DOMContentLoaded', () => {
    const resetBtn = document.querySelector('[data-action="reset-localstorage"]');
    if (!resetBtn) return;

    resetBtn.addEventListener('click', () => {
        const keysToRemove = [
            'sessionToken',
            'isAuthenticated',
            'quizCompleted'
        ];

        keysToRemove.forEach(key => localStorage.removeItem(key));

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key.includes('cinemi_')) {
                localStorage.removeItem(key);
            }
        }

        window.location.href = window.location.pathname + '?t=' + Date.now();
    });

    resetBtn.style.cursor = 'pointer';
});

let offsetX = 0;
let offsetY = 0;

let velocityX = 0;
let velocityY = 0;

let isInteracting = false;
let lastX = null;
let lastY = null;

let time = 0;
function getPoint(e) {
    if (e.touches && e.touches.length) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
}
function onMove(e) {
    const { x, y } = getPoint(e);

    if (!isInteracting) {
        isInteracting = true;
        lastX = x;
        lastY = y;
        return;
    }

    const dx = x - lastX;
    const dy = y - lastY;

    offsetX += dx * 0.35;
    offsetY += dy * 0.35;

    velocityX = dx;
    velocityY = dy;

    lastX = x;
    lastY = y;
}

function onEnd() {
    isInteracting = false;
    lastX = null;
    lastY = null;
}

container.addEventListener('mousemove', onMove);
container.addEventListener('touchmove', onMove, { passive: true });

container.addEventListener('mousedown', () => isInteracting = false);
container.addEventListener('mouseup', onEnd);
container.addEventListener('mouseleave', onEnd);
container.addEventListener('touchend', onEnd);
function animate() {
    time += 0.01;

    if (!isInteracting) {
        offsetX += velocityX;
        offsetY += velocityY;

        velocityX *= 0.92;
        velocityY *= 0.92;

        if (Math.abs(velocityX) < 0.01) velocityX = 0;
        if (Math.abs(velocityY) < 0.01) velocityY = 0;
    }

    tickerContainer.style.transform = `
        rotate(-35deg)
        translate(${offsetX * 0.2}px, ${offsetY * 0.2}px)
    `;
    function hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        const bigint = parseInt(hex, 16);
        const r = (bigint >> 16) & 255;
        const g = (bigint >> 8) & 255;
        const b = bigint & 255;

        return `${r},${g},${b}`;
    }

    strips.forEach((strip, index) => {
        const speed = (index + 1) * 0.4;
        const direction = index % 2 === 0 ? 1 : -1;

        const wave = Math.sin(time + index) * 20;

        strip.style.transform = `
            translateX(${direction * 15}%)
            translateX(${offsetX * speed}px)
            translateX(${wave}px)
        `;
        const baseColor = getComputedStyle(document.documentElement)
                            .getPropertyValue('--bg-q-text').trim();

        const opacity = 1 + Math.min(Math.abs(offsetX) / 100, 0.2);
        strip.style.color = `rgba(${hexToRgb(baseColor)}, ${opacity})`;
    });


    requestAnimationFrame(animate);
}

animate();
