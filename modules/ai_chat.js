// beta (just testing)
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

  const MODELS = [
    {
      id: 'smollm2',
      name: 'SmolLM2 360M',
      // url: 'https://huggingface.co/unsloth/SmolLM2-360M-Instruct-GGUF/resolve/main/SmolLM2-360M-Instruct-Q4_K_M.gguf'
      url: 'https://huggingface.co/professorf/SmolLM-135M-Instruct-gguf/resolve/main/SmolLM-135M-Instructt-q8_0.gguf'
    },
    {
      id: 'gemma3',
      name: 'Gemma 3 1B',
      url: 'https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q4_K_M.gguf'
    }
  ];

  const FALLBACK_TEMPLATE =
    "{% for message in messages %}{{'<|im_start|>'+message['role']+'\n'+message['content']+'<|im_end|>'+'\n'}}{% endfor %}" +
    "{% if add_generation_prompt %}{{ '<|im_start|>assistant\n' }}{% endif %}";

  const IDB_NAME = 'cinemi-llm';
  const IDB_VER = 1;
  const IDB_STORE = 'models';

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const useMultiThread = !isIOS && typeof SharedArrayBuffer !== 'undefined';

  let wllama = null;
  let history = [];
  let isGenerating = false;
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
      const { Template } = await import('https://esm.sh/@huggingface/jinja');
      const tmpl = new Template(wllama.getChatTemplate() ?? FALLBACK_TEMPLATE);
      return tmpl.render({
        messages,
        bos_token: await wllama.detokenize([wllama.getBOS()]),
        eos_token: await wllama.detokenize([wllama.getEOS()]),
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
      if (wllama) { try { await wllama.exit(); } catch {} wllama = null; }

      const { Wllama } = await import('https://esm.sh/@wllama/wllama@2.3.2/esm');

      let blob = await idbGetBlob(model.url);

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

      await wllama.loadModel([modelFile], {
        n_ctx: 2048,
        ...(useMultiThread ? {} : { n_threads: 1 })
      });

      history = [];
      setInputEnabled(true);

    } catch (err) {
      addAiMsg('Error: ' + (err?.message ?? 'Failed to load model'));
      if (wllama) { try { await wllama.exit(); } catch {} wllama = null; }
    }

    isLoading = false;
  }

  async function sendMessage() {
    if (!wllama || isGenerating || isLoading) return;
    const inp = getInput();
    if (!inp) return;
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    isGenerating = true;
    setInputEnabled(false);

    history.push({ role: 'user', content: text });
    addUserMsg(text);

    const c = getAChat();
    if (!c) { isGenerating = false; setInputEnabled(true); return; }
    const aiEl = document.createElement('div');
    aiEl.className = 'ai-message';
    c.appendChild(aiEl);
    c.scrollTop = c.scrollHeight;

    if (!document.getElementById('llm-blink')) {
      const s = document.createElement('style');
      s.id = 'llm-blink';
      s.textContent = '@keyframes llmBlink{0%,100%{opacity:1}50%{opacity:0}}';
      document.head.appendChild(s);
    }
    const cursor = document.createElement('span');
    cursor.style.cssText = 'display:inline-block;width:2px;height:1em;background:currentColor;margin-left:2px;vertical-align:text-bottom;border-radius:1px;animation:llmBlink 0.55s step-end infinite;';
    aiEl.appendChild(cursor);

    let output = '';
    try {
      const prompt = await buildPrompt(history);
      await wllama.createCompletion(prompt, {
        nPredict: 512,
        sampling: { temp: 0.7, top_k: 40, top_p: 0.9 },
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
      aiEl.textContent = 'Error: ' + (err?.message ?? 'Generation failed');
      history.pop();
    }

    isGenerating = false;
    setInputEnabled(!!wllama);
    if (c) c.scrollTop = c.scrollHeight;
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
        if (wllama) { try { await wllama.exit(); } catch {} wllama = null; }
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
