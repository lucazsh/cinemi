let current = 0;
const questions = document.querySelectorAll('.question');
const progress = document.getElementById('progressFill');
const inputAge = document.querySelector('.q-input[type="text"]');
const total = questions.length;

const nextBtn = document.querySelector('.next');

function pressOn() {
    nextBtn.classList.add('pressed');
}

function pressOff() {
    nextBtn.classList.remove('pressed');
}

nextBtn.addEventListener('pointerdown', pressOn);
nextBtn.addEventListener('pointerup', pressOff);
nextBtn.addEventListener('pointercancel', pressOff);
nextBtn.addEventListener('pointerleave', pressOff);
nextBtn.addEventListener('blur', pressOff);

document.querySelectorAll('#genreQ input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', () => {
        const checked = document.querySelectorAll('#genreQ input:checked');
        if (checked.length > 3) cb.checked = false;
    });
});

async function nextQuestion() {
    const currentQuestion = questions[current];
    let answer = null;

    if (current === 4) {
        questions[current].classList.remove('active');
        questions[current].style.display = 'none';
        current++;
        questions[current].classList.add('active');
        questions[current].style.display = 'block';
        updateProgress();
        return;
    }

    if (current === 0) {
        answer = currentQuestion.querySelector('.q-input').value;
    } else if (current === 10) {
        const checked = currentQuestion.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length === 0) { alert('Please select at least one genre'); return; }
        answer = Array.from(checked).map(c => c.value);
    } else if (current === 11) {
        const checked = currentQuestion.querySelectorAll('input[type="checkbox"]:checked');
        if (checked.length === 0) { alert('Please select at least one platform'); return; }
        answer = Array.from(checked).map(c => c.value);
    } else {
        const selected = currentQuestion.querySelector('input[type="radio"]:checked');
        if (selected) answer = selected.value || selected.id;
    }

    if (!answer) { alert('Please answer the question'); return; }

    questions[current].classList.remove('active');
    questions[current].style.display = 'none';
    current++;

    if (current < total) {
        questions[current].classList.add('active');
        questions[current].style.display = 'block';
        updateProgress();
    } else {
        progress.style.width = '100%';

        const movieGenres = Array.from(questions[10].querySelectorAll('input:checked')).map(c => c.value);
        const streamingPlatforms = Array.from(questions[11].querySelectorAll('input:checked')).map(c => c.value);

        const quizAnswers = {
            age: questions[0].querySelector('.q-input').value,
            gender: questions[1].querySelector('input:checked')?.id,
            personality: questions[2].querySelector('input:checked')?.id,
            movieOrigin: questions[3].querySelector('input:checked')?.id,
            teamwork: questions[5].querySelector('input:checked')?.id,
            friends: questions[6].querySelector('input:checked')?.id,
            family: questions[7].querySelector('input:checked')?.id,
            adrenaline: questions[8].querySelector('input:checked')?.id,
            sports: questions[9].querySelector('input:checked')?.id,
            movieGenres,
            movieGenre: movieGenres[0],
            streamingPlatforms,
            streamingPlatform: streamingPlatforms[0]
        };

        try {
            await fetchWithAuth(`${baseUrl}/api/quiz/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(quizAnswers)
            });
            localStorage.setItem('quizCompleted', 'true');
            localStorage.setItem('cinemi_userQuizProfile', JSON.stringify(quizAnswers));
        } catch (err) {
            console.error('Quiz submit error:', err);
        }
        showView('home');
    }
}

function updateProgress() {
    const percent = Math.round((current / total) * 100);
    progress.style.width = percent + '%';
}

async function checkQuizStatus() {
    const quizCompleted = localStorage.getItem('quizCompleted');
    const hasProfile = localStorage.getItem('cinemi_userQuizProfile');
    if (quizCompleted === 'true' && hasProfile) { showView('home'); return true; }
    try {
        const res = await fetchWithAuth(`${baseUrl}/api/quiz/status`);
        const data = await res.json();
        if (data.completed) {
            localStorage.setItem('quizCompleted', 'true');
            if (data.data) {
                localStorage.setItem('cinemi_userQuizProfile', JSON.stringify(data.data));
            }
            showView('home');
            return true;
        } else {
            showView('setup');
            return false;
        }
    } catch (err) {
        showView('setup');
        return false;
    }
}

if (inputAge) {
    let active = false;
    inputAge.addEventListener('input', function(e) {
        const val = e.target.value.trim();
        if (val === '67' && !active) {
            active = true;
            document.body.classList.add('shake-eff');
            const wrap = document.createElement('div');
            wrap.className = 'layer-67';
            let smalls = '';
            for (let i = 0; i < 20; i++) {
                const rx = Math.random() * 100;
                const delay = Math.random() * 2;
                const dur = 1 + Math.random() * 2;
                smalls += `<div class="s-67" style="left:${rx}vw;top:-10vh;animation:fall ${dur}s linear infinite;animation-delay:${delay}s">67</div>`;
            }
            wrap.innerHTML = `${smalls}<div class="mid-67"><div class="big-67">67</div></div><div class="hand-row"><div class="h-anim h-l">🫴</div><div class="h-anim h-r">🫴</div></div>`;
            document.body.appendChild(wrap);
            setTimeout(() => {
                wrap.classList.add('exit-animation');
                wrap.querySelectorAll('.s-67,.big-67,.h-anim').forEach(el => { el.style.animation = 'none'; el.classList.add('zoom-out'); });
                setTimeout(() => { wrap.remove(); document.body.classList.remove('shake-eff'); active = false; }, 500);
            }, 4500);
        }
    });
}

const css = document.createElement('style');
css.textContent = `@keyframes entry-zoom{0%{transform:scale(3);opacity:0}100%{transform:scale(1);opacity:1}}.zoom-out{animation:zoom-out-anim 0.5s ease-in forwards!important}@keyframes zoom-out-anim{to{transform:scale(8);opacity:0}}.exit-animation{pointer-events:none!important}.layer-67{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;display:flex!important;flex-direction:column!important;z-index:9999999!important;pointer-events:none!important;overflow:hidden!important;animation:entry-zoom 0.4s ease-out forwards}.s-67{position:absolute!important;font-size:8vw!important;font-weight:bold!important;color:var(--text-primary)!important}@keyframes fall{0%{transform:translateY(0) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(360deg);opacity:.5}}.mid-67{flex:1!important;display:flex!important;align-items:center!important;justify-content:center!important}.big-67{font-size:70vw!important;font-weight:900!important;color:#ff3e3e!important;text-shadow:8px 8px 0px #000!important;animation:rotate-move 0.3s infinite alternate ease-in-out}@keyframes rotate-move{from{transform:rotate(-15deg)}to{transform:rotate(15deg)}}.hand-row{height:25vh!important;display:flex!important;justify-content:space-around!important;align-items:flex-end!important;width:100%!important}.h-anim{font-size:35vw!important}.h-l{animation:alt-y 0.5s infinite alternate ease-in-out}.h-r{transform:scaleX(-1);animation:alt-y-rev 0.5s infinite alternate ease-in-out}@keyframes alt-y{from{transform:translateY(0)}to{transform:translateY(-60px)}}@keyframes alt-y-rev{from{transform:scaleX(-1) translateY(-60px)}to{transform:scaleX(-1) translateY(0)}}.shake-eff{animation:intense-shake 0.08s infinite!important}@keyframes intense-shake{0%{transform:translate(5px,5px)}25%{transform:translate(-5px,-4px)}50%{transform:translate(-6px,3px)}75%{transform:translate(5px,-3px)}100%{transform:translate(2px,5px)}}@media(min-width:768px){.big-67{font-size:400px!important}.s-67{font-size:40px!important}.h-anim{font-size:180px!important}}`;
document.head.appendChild(css);
