let worker=null;let ready=false;const pending=new Map();let reqId=0;

function getBaseUrl(){
    // utils.js sets window.server — check that first
    return window.server || window.BASE_URL || window.baseUrl || localStorage.getItem('cinemi_baseUrl') || '';
}

function getUsername(){
    try{
        const u=JSON.parse(localStorage.getItem('cinemi_user')||'{}');
        if(u.username)return u.username;
        const cached=JSON.parse(localStorage.getItem('cinemi_userProfile')||'{}');
        return cached.username||'';
    }catch{return '';}
}

function getSessionToken(){
    return localStorage.getItem('sessionToken')||sessionStorage.getItem('sessionToken')||'';
}

export async function initNemo(){
    if(worker)return;
    console.log('[NEMO] Initializing worker...');

    // Worker file lives on the frontend (cinemi.space), use window.location.origin for it
    const workerUrl = `${window.location.origin}/modules/nemo-worker.js`;
    worker = new Worker(workerUrl);

    worker.onmessage=(e)=>{
        const msg=e.data;
        console.log('[NEMO] Message from worker:', msg.type, msg);
        if(msg.type==='ready'){ready=true;console.log('[NEMO] Ready!');return;}
        if(msg.type==='error'){console.error('[NEMO] Worker reported error:', msg.message);}
        if(msg.type==='scored'&&pending.has(msg.requestId)){
            console.log('[NEMO] Scored', msg.results?.length, 'movies');
            pending.get(msg.requestId).resolve(msg.results);
            pending.delete(msg.requestId);
        }
        if(msg.type==='feedbackDone'){
            console.log('[NEMO] Feedback done');
            const cb=pending.get('feedback');
            if(cb){cb.resolve();pending.delete('feedback');}
        }
    };

    worker.onerror=(e)=>{
        console.error('[NEMO] Worker error:', e.message, 'file:', e.filename, 'line:', e.lineno);
    };

    const bu = getBaseUrl();
    const st = getSessionToken();
    const un = getUsername();

    console.log('[NEMO] baseUrl:', bu, '| username:', un, '| token:', st ? 'present' : 'MISSING');

    // Send init ONCE only — duplicate was causing double-init race condition
    worker.postMessage({type:'init', baseUrl: bu, sessionToken: st, username: un});

    console.log('[NEMO] Worker created, waiting for ready...');

    await new Promise(res=>{
        const iv=setInterval(()=>{if(ready){clearInterval(iv);res();}},100);
        setTimeout(()=>{clearInterval(iv);console.warn('[NEMO] Timeout waiting for ready');res();},15000);
    });

    console.log('[NEMO] Init complete, ready:', ready);
}

export async function scoreMovies(candidates){
    if(!worker||!ready){
        console.warn('[NEMO] scoreMovies called but not ready');
        return null;
    }
    console.log('[NEMO] Scoring', candidates.length, 'candidates...');
    const id=reqId++;
    return new Promise((resolve,reject)=>{
        pending.set(id,{resolve,reject});
        setTimeout(()=>{
            if(pending.has(id)){
                pending.delete(id);
                console.error('[NEMO] Score timeout for request', id);
                reject(new Error('timeout'));
            }
        },30000);
        worker.postMessage({type:'score',candidates,requestId:id});
    });
}

export async function sendFeedback(movieData,action){
    if(!worker||!ready){
        console.warn('[NEMO] sendFeedback called but not ready');
        return;
    }
    console.log('[NEMO] Sending feedback:', action, movieData?.title||movieData?.id);
    return new Promise(resolve=>{
        pending.set('feedback',{resolve});
        worker.postMessage({type:'feedback',movieData,action});
        setTimeout(()=>{pending.delete('feedback');resolve();},5000);
    });
}

export function syncNemo(){
    if(worker&&ready){
        console.log('[NEMO] Triggering sync...');
        worker.postMessage({type:'sync'});
    }
}
