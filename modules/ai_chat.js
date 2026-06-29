// beta (just testing)
(function() {
  var suggestionPhrases = [
    "Psychological thrillers with unpredictable twists",
    "Completely underrated '90s sci-fi movies",
    "Feel-good comedies for a lazy afternoon",
    "Dark and gritty crime dramas from the 2000s",
    "Animated masterpieces that adults love too",
    "Movies that will make you question reality",
    "Action-packed blockbusters with epic fight scenes",
    "Romantic films that actually have a good plot",
    "Mind-bending time travel movies",
    "Horror movies that are more unsettling than gory",
    "Underrated indie gems you've probably missed",
    "Movies with unforgettable soundtracks",
    "Foreign language films that won an Oscar",
    "Biographical dramas that feel like fiction",
    "Movies that are better than the book",
    "Feel-good movies to watch when you're down",
    "Classic noir films that defined the genre",
    "Modern westerns that reinvent the genre",
    "Movies with twist endings you won't see coming",
    "Feel-bad movies that are still worth watching"
  ];

  function updateWatchingText() {
    var el = document.querySelector('#ai-chat .section-title');
    if (!el) return;
    var hour = new Date().getHours();
    el.textContent = hour < 17 ? 'What are we watching today?' : 'What are we watching tonight?';
  }

  function attachPillClickHandlers() {
    var container = document.querySelector('#ai-chat .suggestions-list');
    if (!container) return;
    var pills = container.querySelectorAll('.suggestion-pill');
    pills.forEach(function(pill) {
      if (pill.dataset.handled) return;
      pill.dataset.handled = 'true';
      pill.addEventListener('click', function(e) {
        e.preventDefault();
        var span = this.querySelector('span');
        if (!span) return;
        var text = span.textContent.trim();
        var suggestions = document.getElementById('suggestions-container');
        suggestions.classList.add('hide-suggestions');
        setTimeout(function() {
            suggestions.style.display = 'none';
            var chatContainer = document.querySelector('.a-chat');
            if (chatContainer) chatContainer.classList.add('show-chat');
            var input = document.querySelector('.c-ai');
            if (input) {
              input.value = text;
              input.dispatchEvent(new Event('input', { bubbles: true }));
            }
            var sendBtn = document.getElementById('send-btn');
            if (sendBtn) sendBtn.click();
        }, 400);
        });
    });
  }

  function randomSuggestions() {
    var container = document.querySelector('#ai-chat .suggestions-list');
    if (!container) return;
    var pills = container.querySelectorAll('.suggestion-pill');
    if (pills.length < 2) return;
    var shuffled = suggestionPhrases.slice().sort(function() { return 0.5 - Math.random(); });
    var selected = shuffled.slice(0, 2);
    pills.forEach(function(pill, index) {
      var span = pill.querySelector('span');
      if (span) span.textContent = selected[index] || 'Try something new';
      delete pill.dataset.handled;
    });
    attachPillClickHandlers();
  }

  function updateAll() {
    updateWatchingText();
    randomSuggestions();
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateAll();
  } else {
    document.addEventListener('DOMContentLoaded', updateAll);
  }

  var observer = new MutationObserver(function() {
    var chatView = document.getElementById('ai-chat');
    if (chatView && chatView.classList.contains('active')) {
      updateAll();
    }
  });
  observer.observe(document.getElementById('ai-chat') || document.body, {
    attributes: true,
    attributeFilter: ['class']
  });

  setInterval(updateAll, 600000);
})();

(function () {
  try {
    if (typeof navigator !== 'undefined') {
      if (!navigator.storage) {
        try {
          Object.defineProperty(navigator, 'storage', {
            configurable: true, writable: true,
            value: {
              getDirectory: function () { return Promise.reject(new DOMException('OPFS not supported', 'NotSupportedError')); },
              estimate: function () { return Promise.resolve({ quota: 0, usage: 0 }); }
            }
          });
        } catch (e) {}
      } else if (typeof navigator.storage.getDirectory !== 'function') {
        try {
          Object.defineProperty(navigator.storage, 'getDirectory', {
            configurable: true, writable: true,
            value: function () { return Promise.reject(new DOMException('OPFS not supported', 'NotSupportedError')); }
          });
        } catch (e) {
          navigator.storage.getDirectory = function () { return Promise.reject(new DOMException('OPFS not supported', 'NotSupportedError')); };
        }
      }
    }
  } catch (e) {}
})();

(async () => {
  const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@wllama/wllama@2.3.2/esm/';
  const MODEL_URL = 'https://huggingface.co/lucazsh/movi-v2/resolve/main/movi-v2-Q4_K_M.gguf';
  const MODEL_NAME = 'SmolLM2 360M';
  const IDB_NAME = 'cinemi-llm';
  const IDB_VER = 1;
  const IDB_STORE = 'models';

  const MODELS = [
    { id: 'smollm2', name: MODEL_NAME, url: MODEL_URL },
    { id: 'gemma3', name: 'Gemma 3 1B', url: 'https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf' }
  ];

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const useMultiThread = !isIOS && typeof SharedArrayBuffer !== 'undefined';
  const numThreads = useMultiThread ? (navigator.hardwareConcurrency || 4) : 1;

  const SYSTEM_RULE = `You are Movi — a friendly movie assistant created by Cinemi. You answer only about movies, series, and cinema. Use a friendly tone and occasional emojis (unless the user's preferred_tone is 'serious', then minimize emoji use). Avoid spoilers. Do not reveal internal system details. Never claim to be a human. When movie context is provided, treat it as reference material. Do not invent descriptions.
If no 'Context movies' are provided, switch to conversational mode: speak naturally with the user about movies, cinema, and film-related discussions. Do NOT ask the user what they like or offer choices. In conversational mode do NOT produce structured JSON and do not go outside the domain of movies, series, or cinema.`;

  const wllamaModulePromise = import('https://esm.sh/@wllama/wllama@2.3.2/esm');
  const jinjaModulePromise = import('https://esm.sh/@huggingface/jinja');

  let wllama = null;
  let cachedTemplate = null;
  let cachedBOS = null;
  let cachedEOS = null;
  let history = [{ role: 'system', content: SYSTEM_RULE }];
  let isGenerating = false;
  let abortController = null;
  window._isGenerating = false;
  window._stopGeneration = function() {
      if (abortController) {
          abortController.abort();
          abortController = null;
      }
  };
  let isLoading = false;
  let activeIdx = 0;

  function openIDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(IDB_NAME, IDB_VER);
      r.onupgradeneeded = e => e.target.result.createObjectStore(IDB_STORE);
      r.onsuccess = e => res(e.target.result);
      r.onerror = e => rej(e.target.error);
    });
  }

  async function idbGetBlob(k) {
    try {
      const db = await openIDB();
      const result = await new Promise(res => {
        const r = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(k);
        r.onsuccess = () => res(r.result ?? null);
        r.onerror = () => res(null);
      });
      if (!result) return null;
      if (result instanceof Blob) return result;
      if (result instanceof ArrayBuffer) return new Blob([result]);
      return null;
    } catch { return null; }
  }

  async function idbPutBlob(k, blob) {
    try {
      const db = await openIDB();
      return new Promise(res => {
        const r = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(blob, k);
        r.onsuccess = () => res(true);
        r.onerror = () => res(false);
      });
    } catch { return false; }
  }

  const idbBlobPromise = idbGetBlob(MODELS[0].url);

  function getAChat() { return document.querySelector('.a-chat'); }
  function getInput() { return document.querySelector('.i-chat input'); }

  function addAiMsg(text) {
    const c = getAChat();
    if (!c) return null;
    const d = document.createElement('div');
    d.className = 'ai-message';
    d.textContent = text;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
    return d;
  }

  function addUserMsg(text) {
    const c = getAChat();
    if (!c) return;
    const d = document.createElement('div');
    d.className = 'user-message';
    d.textContent = text;
    c.appendChild(d);
    c.scrollTop = c.scrollHeight;
  }

  function setInputEnabled(on) {
    const inp = getInput();
    const sb = document.getElementById('send-btn');
    if (inp) inp.disabled = !on;
    if (sb) sb.disabled = !on;
    if (inp) inp.placeholder = on ? 'Ask anything about movies...' : 'Loading model...';
  }

  async function buildPrompt(messages) {
    try {
      if (!cachedTemplate) {
        const { Template } = await jinjaModulePromise;
        const rawTemplate = wllama.getChatTemplate();
        cachedTemplate = new Template(rawTemplate ?? "{% for message in messages %}{{'<|im_start|>'+message['role']+'\n'+message['content']+'<|im_end|>'+'\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}");
        [cachedBOS, cachedEOS] = await Promise.all([
          wllama.detokenize([wllama.getBOS()]),
          wllama.detokenize([wllama.getEOS()])
        ]);
      }
      return cachedTemplate.render({
        messages,
        bos_token: cachedBOS,
        eos_token: cachedEOS,
        add_generation_prompt: true
      });
    } catch {
      return messages.map(m => `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`).join('') + '<|im_start|>assistant\n';
    }
  }

  async function loadModel() {
    if (isLoading || isGenerating) return;
    isLoading = true;
    setInputEnabled(false);

    const model = MODELS[activeIdx];

    try {
      if (wllama) { try { await wllama.exit(); } catch {} wllama = null; cachedTemplate = null; cachedBOS = null; cachedEOS = null; }

      const [{ Wllama }, existingBlob] = await Promise.all([
        wllamaModulePromise,
        activeIdx === 0 ? idbBlobPromise : idbGetBlob(model.url)
      ]);

      let blob = existingBlob;

      if (!blob) {
        const msgEl = addAiMsg('Downloading ' + model.name + '... 0%. This is a one-time download.');
        const c = getAChat();

        const res = await fetch(model.url);
        if (!res.ok) throw new Error('HTTP ' + res.status);

        const total = parseInt(res.headers.get('content-length') || '0');
        const reader = res.body.getReader();
        const parts = [];
        let loaded = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          parts.push(value);
          loaded += value.byteLength;
          const pct = total > 0 ? Math.round((loaded / total) * 100) : 0;
          const mbL = (loaded / 1048576).toFixed(1);
          const mbT = total > 0 ? (total / 1048576).toFixed(0) + ' MB' : '?';
          if (msgEl) {
            msgEl.textContent = 'Downloading ' + model.name + '... ' + mbL + ' / ' + mbT + ' (' + pct + '%). This is a one-time download.';
            if (c) c.scrollTop = c.scrollHeight;
          }
        }

        blob = new Blob(parts, { type: 'application/octet-stream' });
        parts.length = 0;

        if (msgEl) msgEl.textContent = 'Saving to cache...';
        const saved = await idbPutBlob(model.url, blob);
        if (msgEl) msgEl.remove();
        if (!saved) addAiMsg('Warning: could not save to cache. Model will re-download next time.');
      }

      wllama = new Wllama(
        {
          'single-thread/wllama.js': WASM_BASE + 'single-thread/wllama.js',
          'single-thread/wllama.wasm': WASM_BASE + 'single-thread/wllama.wasm',
          'multi-thread/wllama.js': WASM_BASE + 'multi-thread/wllama.js',
          'multi-thread/wllama.wasm': WASM_BASE + 'multi-thread/wllama.wasm',
          'multi-thread/wllama.worker.mjs': WASM_BASE + 'multi-thread/wllama.worker.mjs'
        },
        { suppressNativeLog: true }
      );

      const modelFile = new File([blob], 'model.gguf', { type: 'application/octet-stream' });
      blob = null;

      await Promise.all([
        wllama.loadModel([modelFile], {
          n_ctx: 2048,
          n_batch: 512,
          n_threads: numThreads
        }),
        jinjaModulePromise
      ]);

      history = [{ role: 'system', content: SYSTEM_RULE }];

      const rawTemplate = wllama.getChatTemplate();
      const { Template } = await jinjaModulePromise;
      cachedTemplate = new Template(rawTemplate ?? "{% for message in messages %}{{'<|im_start|>'+message['role']+'\n'+message['content']+'<|im_end|>'+'\n'}}{% endfor %}{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}");
      [cachedBOS, cachedEOS] = await Promise.all([
        wllama.detokenize([wllama.getBOS()]),
        wllama.detokenize([wllama.getEOS()])
      ]);

      setInputEnabled(true);

    } catch (err) {
      addAiMsg('Error: ' + (err?.message ?? 'Failed to load model'));
      if (wllama) { try { await wllama.exit(); } catch {} wllama = null; }
    }

    isLoading = false;
  }

  async function sendMessage() {
    const _icon = document.getElementById('send-btn-icon');
    if (isGenerating) {
      if (abortController) { abortController.abort(); abortController = null; }
      return;
    }
    if (!wllama || isLoading) return;
    const inp = getInput();
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    isGenerating = true;
    window._isGenerating = true;
    setInputEnabled(false);
    if (_icon) {
      _icon.style.transition = 'transform 0.12s ease';
      _icon.style.transform = 'scale(0)';
      setTimeout(() => {
        _icon.innerHTML = '<path d="M198-334v-292q0-58.4 38.8-97.2Q275.6-762 334-762h292q58.4 0 97.2 38.8Q762-684.4 762-626v292q0 58.4-38.8 97.2Q684.4-198 626-198H334q-58.4 0-97.2-38.8Q198-275.6 198-334Z"/>';
        _icon.style.transform = 'scale(1)';
      }, 130);
    }

    history.push({ role: 'user', content: text });
    addUserMsg(text);

    const c = getAChat();
    if (!c) { isGenerating = false; window._isGenerating = false; setInputEnabled(true); return; }
    const aiEl = document.createElement('div');
    aiEl.className = 'ai-message';
    c.appendChild(aiEl);
    c.scrollTop = c.scrollHeight;

    if (!document.getElementById('llm-blink')) {
      const s = document.createElement('style');
      s.id = 'llm-blink';
      s.textContent = `@keyframes llmBlink{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.2;transform:scale(2);}}`;
      document.head.appendChild(s);
    }

    const cursor = document.createElement('span');
    cursor.style.cssText = 'display:inline-block;width:10px;height:10px;background:currentColor;margin-left:4px;vertical-align:middle;border-radius:3px;animation:llmBlink 1.2s infinite ease-in-out;transform-origin:center;will-change:opacity,transform;';
    aiEl.appendChild(cursor);

    let output = '';
    try {
      const prompt = await buildPrompt(history);
      abortController = new AbortController();
      await wllama.createCompletion(prompt, {
        nPredict: 512,
        sampling: { temp: 0.7, top_k: 40, top_p: 0.9 },
        stop: ['<|im_end|>', '<|im_start|>'],
        signal: abortController.signal,
        onNewToken(_tok, _piece, current) {
          output = current;
          aiEl.textContent = current;
          aiEl.appendChild(cursor);
          if (c) c.scrollTop = c.scrollHeight;
        }
      });
      cursor.remove();
      aiEl.textContent = output || '...';
      history.push({ role: 'assistant', content: output });
    } catch (err) {
      cursor.remove();
      if (err.name === 'AbortError') {
        aiEl.textContent = output || 'Generation stopped.';
        history.push({ role: 'assistant', content: output || 'Generation stopped.' });
      } else {
        aiEl.textContent = 'Error: ' + (err?.message ?? 'Generation failed');
        history.pop();
      }
    } finally {
      abortController = null;
      isGenerating = false;
      window._isGenerating = false;
      setInputEnabled(!!wllama);
      if (c) c.scrollTop = c.scrollHeight;
      if (_icon) {
        _icon.style.transition = 'transform 0.12s ease';
        _icon.style.transform = 'scale(0)';
        setTimeout(() => {
          _icon.innerHTML = '<path d="M440-160v-487L216-423l-56-57 320-320 320 320-56 57-224-224v487h-80Z"/>';
          _icon.style.transform = 'scale(1)';
        }, 130);
      }
    }
  }

  async function setup() {
    const aChat = getAChat();
    if (aChat) aChat.innerHTML = '';
    setInputEnabled(false);

    const sendBtn = document.getElementById('send-btn');
    const inp = getInput();
    const ctxBtn = document.getElementById('context-btn');

    if (sendBtn) sendBtn.addEventListener('click', sendMessage);
    if (inp) {
      inp.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
      });
    }
    if (ctxBtn) {
      ctxBtn.title = 'Delete cached model';
      ctxBtn.addEventListener('click', async () => {
        if (isGenerating || isLoading) return;
        if (wllama) { try { await wllama.exit(); } catch {} wllama = null; cachedTemplate = null; cachedBOS = null; cachedEOS = null; }
        setInputEnabled(false);
        try {
          const db = await openIDB();
          await new Promise((res, rej) => {
            const r = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).delete(MODELS[activeIdx].url);
            r.onsuccess = () => res();
            r.onerror = () => rej(r.error);
          });
        } catch {}
      });
    }

    await loadModel();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setup);
  } else {
    setup();
  }
})();
/* 
let chatHistory = [];
let previousMovieIds = [];

async function sendAIMessage(useContext = false) {
    const input = document.querySelector('.i-chat input');
    const chatContainer = document.querySelector('.a-chat');
    const message = input.value.trim();
    
    if (!message) return;
    
    const userMsg = document.createElement('div');
    userMsg.className = 'user-message';
    userMsg.textContent = message;
    chatContainer.appendChild(userMsg);
    
    input.value = '';
    
    chatHistory.push({ role: 'user', content: message });
    
    const aiMsg = document.createElement('div');
    aiMsg.className = 'ai-message';
    aiMsg.textContent = '';
    chatContainer.appendChild(aiMsg);
    
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    try {
        const response = await fetch(`${baseUrl}/api/ai/chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Session-Token': sessionToken || ''
            },
            body: JSON.stringify({ 
                message, 
                history: chatHistory.slice(-10),
                useContext,
                previousMovieIds
            })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullResponse = '';
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') break;
                    
                    try {
                        const json = JSON.parse(data);
                        if (json.token) {
                            fullResponse += json.token;
                            aiMsg.textContent = fullResponse;
                            chatContainer.scrollTop = chatContainer.scrollHeight;
                        }
                        if (json.movieIds) {
                            previousMovieIds.push(...json.movieIds);
                        }
                    } catch (e) {}
                }
            }
        }
        
        chatHistory.push({ role: 'assistant', content: fullResponse });
        await renderMovieCards(aiMsg, fullResponse);
        
    } catch (error) {
        aiMsg.textContent = 'Error: Failed to connect to AI';
        aiMsg.style.color = '#ff4444';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const contextBtn = document.getElementById('context-btn');
    const sendBtn = document.getElementById('send-btn');
    const inputField = document.querySelector('.i-chat input');
    
    if (contextBtn) {
        contextBtn.onclick = () => sendAIMessage(true);
    }
    
    if (sendBtn) {
        sendBtn.onclick = () => sendAIMessage(false);
    }
    
    if (inputField) {
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendAIMessage(false);
        });
    }
});
*/

//async function renderMovieCards(aiMsg, text) {
// const titlePattern = /\*([^*]+)\*/g;
/*
    const matches = [...text.matchAll(titlePattern)];
    
    if (matches.length === 0) return;
    
    let cleanedText = text.replace(titlePattern, '$1');
    aiMsg.textContent = cleanedText;
    
    for (const match of matches) {
        const movieTitle = match[1].trim();
        
        try {
            const res = await fetch(`${baseUrl}/api/tmdb/search/multi?query=${encodeURIComponent(movieTitle)}`, {
                headers: ngrokHeaders
            });
            
            if (!res.ok) continue;
            
            const data = await res.json();
            const movie = data.results[0];
            
            if (!movie) continue;
            
            const posterUrl = movie.poster_path ? `${IMG_W500}${movie.poster_path}` : '';
            const title = movie.title || movie.name;
            const releaseDate = movie.release_date || movie.first_air_date;
            
            const movieCard = document.createElement('div');
            movieCard.style.cssText = 'margin-top: 12px; padding: 12px; background: var(--iconbox-bg); border-radius: 12px; display: flex; gap: 12px; cursor: pointer; transition: background 0.2s;';
            
            movieCard.innerHTML = `
                ${posterUrl ? `<img src="${posterUrl}" style="width: 60px; height: 90px; border-radius: 8px; object-fit: cover;">` : ''}
                <div style="flex: 1;">
                    <div style="font-weight: 600; font-size: 15px; margin-bottom: 4px;">${escapeHtml(title)}</div>
                    <div style="font-size: 12px; color: var(--text-subtle);">${releaseDate ? releaseDate.split('-')[0] : 'N/A'} • ⭐ ${movie.vote_average.toFixed(1)}</div>
                </div>
            `;
            
            movieCard.addEventListener('mouseenter', function() {
                this.style.background = 'var(--nav-active-bg)';
            });
            movieCard.addEventListener('mouseleave', function() {
                this.style.background = 'var(--iconbox-bg)';
            });
            movieCard.addEventListener('click', () => {
                showDetails(movie);
            });
            
            aiMsg.appendChild(movieCard);
        } catch (err) {
            console.error('Failed to fetch movie:', movieTitle, err);
        }
    }
}
*/
