const SERVER_URL = 'https://miss-thin-sat-engaging.trycloudflare.com';
const baseUrl = SERVER_URL ? SERVER_URL.replace(/\/$/, '') : '';
const ngrokHeaders = { 'ngrok-skip-browser-warning': 'true' };

window.BASE_URL = baseUrl;

function formatTimeAgo(dateString) {
    const now = new Date();
    const past = new Date(dateString);
    const diffMs = now - past;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 30) {
        return 'now';
    } else if (diffSeconds < 60) {
        return diffSeconds + 's';
    } else if (diffMinutes < 60) {
        return diffMinutes + 'm';
    } else if (diffHours < 24) {
        return diffHours + 'h';
    } else if (diffDays < 7) {
        return diffDays + 'd';
    } else if (diffWeeks < 4) {
        return diffWeeks + 'w';
    } else if (diffMonths < 12) {
        return diffMonths + 'mo';
    } else {
        return diffYears + 'y';
    }
}
/*
function getTimeBasedGreeting() { 
    const hour = new Date().getHours();
    const name = document.querySelector('.p-name')?.textContent || 'there';
    
    if (hour >= 5 && hour < 12) 
        return `<span style="color: var(--sub-home);">Good morning,</span> ${name}`;
    
    if (hour >= 12 && hour < 17) 
        return `<span style="color: var(--sub-home);">Good afternoon,</span> ${name}`;
    
    if (hour >= 17 && hour < 22) 
        return `<span style="color: var(--sub-home);">Good evening,</span> ${name}`;
    
    return `<span style="color: var(--sub-home);">Good night,</span> ${name}`;
}
*/
function truncateText(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function timeLabelForNow() {
    return 'now';
}
function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2,8);
}

function updateAllTimestamps() {
    document.querySelectorAll('[data-timestamp]').forEach(element => {
        const timestamp = element.getAttribute('data-timestamp');
        if (!timestamp) return;
        
        const timeSpan = element.querySelector('.time');
        if (timeSpan) {
            timeSpan.textContent = formatTimeAgo(timestamp);
        }
    });
}
setInterval(updateAllTimestamps, 30000);




