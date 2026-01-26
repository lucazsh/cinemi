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

async function renderMovieCards(aiMsg, text) {
    const titlePattern = /\*([^*]+)\*/g;
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