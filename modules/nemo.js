let worker=null;let ready=false;const pending=new Map();let reqId=0;

function getBaseUrl(){return window.baseUrl||'';}
function getSessionToken(){return localStorage.getItem('sessionToken')||sessionStorage.getItem('sessionToken')||'';}
function getUsername(){try{return JSON.parse(localStorage.getItem('cinemi_user')||'{}').username||'';}catch{return '';}}

export async function initNemo(){
    if(worker)return;
    worker=new Worker(`${getBaseUrl()}/modules/nemo-worker.js`);
    worker.onmessage=(e)=>{
        const msg=e.data;
        if(msg.type==='ready'){ready=true;return;}
        if(msg.type==='scored'&&pending.has(msg.requestId)){pending.get(msg.requestId).resolve(msg.results);pending.delete(msg.requestId);}
        if(msg.type==='feedbackDone'){const cb=pending.get('feedback');if(cb){cb.resolve();pending.delete('feedback');}}
    };
    worker.onerror=(e)=>console.error('[NEMO]',e);
    worker.postMessage({type:'init',baseUrl:getBaseUrl(),sessionToken:getSessionToken(),username:getUsername()});
    await new Promise(res=>{const iv=setInterval(()=>{if(ready){clearInterval(iv);res();}},100);setTimeout(()=>{clearInterval(iv);res();},10000);});
}

export async function scoreMovies(candidates){
    if(!worker||!ready)return null;
    const id=reqId++;
    return new Promise((resolve,reject)=>{
        pending.set(id,{resolve,reject});
        setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(new Error('timeout'));}},30000);
        worker.postMessage({type:'score',candidates,requestId:id});
    });
}

export async function sendFeedback(movieData,action){
    if(!worker||!ready)return;
    return new Promise(resolve=>{
        pending.set('feedback',{resolve});
        worker.postMessage({type:'feedback',movieData,action});
        setTimeout(()=>{pending.delete('feedback');resolve();},5000);
    });
}

export function syncNemo(){if(worker&&ready)worker.postMessage({type:'sync'});}
