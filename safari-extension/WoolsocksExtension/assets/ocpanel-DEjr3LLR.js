import{i as O,t as s}from"./i18n-ChiNe6Ig.js";import{b as U}from"./browser-polyfill-D6ovI04A.js";async function F(i,t,n=!1){try{await U.storage.local.set({cashback_event:{merchant:i,deals:t.map(a=>({id:a.id,name:a.name,rate:a.rate})),activated:n,timestamp:Date.now(),url:window.location.href}});try{sessionStorage.setItem("__wsLastCashback",JSON.stringify({merchant:i,deals:t,activated:n,timestamp:Date.now()}))}catch{}}catch(a){console.debug("[Woolsocks] Failed to write cashback to App Groups:",a)}}const w={green:chrome.runtime.getURL("public/icons/woolsocks _W_ green.png"),yellow:chrome.runtime.getURL("public/icons/woolsocks _W_ yellow.png"),grey:chrome.runtime.getURL("public/icons/woolsocks _W_ grey.png")},z=chrome.runtime.getURL("public/icons/Close.svg"),N='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22ZM16.8071 9.59036C17.1332 9.14459 17.0361 8.51891 16.5904 8.19286C16.1446 7.86681 15.5189 7.96387 15.1929 8.40964L10.8166 14.3929L8.75809 12C8.39791 11.5813 7.76653 11.5339 7.34785 11.8941C6.92917 12.2543 6.88174 12.8856 7.24191 13.3043L10.1219 16.6522C10.3209 16.8835 10.6146 17.0113 10.9194 16.9992C11.2243 16.9872 11.507 16.8366 11.6871 16.5904L16.8071 9.59036Z" fill="#00C275"/></svg>',_='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="25" viewBox="0 0 24 25" fill="none"><path fill-rule="evenodd" clip-rule="evenodd" d="M11.9999 14.0858L17.2928 8.79289L18.707 10.2071L12.707 16.2071C12.3165 16.5976 11.6833 16.5976 11.2928 16.2071L5.29282 10.2071L6.70703 8.79289L11.9999 14.0858Z" fill="#0084FF"/></svg>',E='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><g opacity="0.5"><path fill-rule="evenodd" clip-rule="evenodd" d="M6.41421 10.9999L10.7071 6.70703L9.29289 5.29282L3.29289 11.2928C2.90237 11.6833 2.90237 12.3165 3.29289 12.707L9.29289 18.707L10.7071 17.2928L6.41421 12.9999L20 12.9999L20 10.9999L6.41421 10.9999Z" fill="#0F0B1C"/></g></svg>',L='<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"><path opacity="0.5" fill-rule="evenodd" clip-rule="evenodd" d="M17.5858 13.0001L13.2929 17.293L14.7071 18.7072L20.7071 12.7072C21.0976 12.3167 21.0976 11.6835 20.7071 11.293L14.7071 5.29297L13.2929 6.70718L17.5858 11.0001H4V13.0001H17.5858Z" fill="#0F0B1C"/></svg>';let r=null,e=null,m=null;const C="__wsOcPanelCorner";let $=!1;function W(i){if(!e)return;const t="16px";e.style.left="",e.style.right="",e.style.top="",e.style.bottom="",i==="br"?(e.style.right=t,e.style.bottom=t):i==="bl"?(e.style.left=t,e.style.bottom=t):i==="tr"?(e.style.right=t,e.style.top=t):(e.style.left=t,e.style.top=t)}function q(){if(!e)return"br";const i=e.getBoundingClientRect(),t=i.left+i.width/2;return i.top+i.height/2>window.innerHeight/2?t>window.innerWidth/2?"br":"bl":t>window.innerWidth/2?"tr":"tl"}function B(){if($||!e)return;$=!0;let i=!1,t=0,n=0;const a=o=>{!i||!e||(e.style.left=Math.max(0,Math.min(window.innerWidth-40,o.clientX-t))+"px",e.style.top=Math.max(0,Math.min(window.innerHeight-40,o.clientY-n))+"px",e.style.right="",e.style.bottom="")},l=()=>{if(!i)return;i=!1,document.removeEventListener("mousemove",a);const o=q();W(o),(async()=>{try{await chrome.storage.session.set({[C]:o})}catch{}})()};e.addEventListener("mousedown",o=>{if(o.button!==0)return;const p=e.getBoundingClientRect();i=!0,t=o.clientX-p.left,n=o.clientY-p.top,document.addEventListener("mousemove",a),document.addEventListener("mouseup",l,{once:!0}),o.preventDefault()})}let v=null;const P="__wsOcActivePillByDomain";function u(){try{return location.hostname.replace(/^www\./i,"").toLowerCase()}catch{return""}}async function b(i,t){try{const n=P,l=(await chrome.storage.session.get(n))[n]||{};l[i]=t,await chrome.storage.session.set({[n]:l})}catch{}}async function D(i){try{const t=P,n=(await chrome.storage.session.get(t))[t];return!!(n&&n[i])}catch{return!1}}function h(){if(r&&e&&document.documentElement.contains(e)&&e.shadowRoot&&e.shadowRoot.getElementById("ws-oc-container"))return r;try{const n=document.getElementById("ws-oc-panel-host");if(n){if(e=n,e.style.position="fixed",e.style.zIndex="2147483647",e.style.width="auto",e.style.maxWidth="calc(100vw - 32px)",e.style.pointerEvents="none",r=e.shadowRoot||e.attachShadow({mode:"open"}),!r.querySelector('style[data-ws-oc="core"]')){const a=document.createElement("style");a.setAttribute("data-ws-oc","core"),a.textContent=`
    :host { display:block !important; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important; font-size:14px !important; line-height:1.4 !important; color:#0F0B1C !important; background:transparent !important; }
    * { box-sizing:border-box !important; margin:0 !important; padding:0 !important; }
    .panel { pointer-events:auto !important; border-radius:16px !important; background:#FFFFFF !important; box-shadow:0 4px 24px rgba(0,0,0,.1) !important; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif !important; font-size:14px !important; overflow:hidden !important; width:auto !important; min-width:240px !important; max-width:360px !important; min-height:200px !important; display:block !important; }
        `,r.appendChild(a)}if(!r.querySelector('style[data-ws-oc="extra"]')){const a=document.createElement("style");a.setAttribute("data-ws-oc","extra"),a.textContent="@keyframes ws-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } } .spin{animation:ws-spin 1.5s linear infinite !important;}",r.appendChild(a)}return m=r.getElementById("ws-oc-container"),m||(m=document.createElement("div"),m.id="ws-oc-container",r.appendChild(m)),(async()=>{try{const a=(await chrome.storage.session.get("__wsOcPanelCorner")).__wsOcPanelCorner;if(a){const o="16px";e.style.left=e.style.right=e.style.top=e.style.bottom="",a==="br"?(e.style.right=o,e.style.bottom=o):a==="bl"?(e.style.left=o,e.style.bottom=o):a==="tr"?(e.style.right=o,e.style.top=o):(e.style.left=o,e.style.top=o)}const l=(await chrome.storage.session.get("__wsOcPanelWidth")).__wsOcPanelWidth;l&&e&&(e.style.width=`${l}px`)}catch{}})(),B(),r}}catch{}e=document.createElement("div"),e.id="ws-oc-panel-host",e.style.position="fixed",e.style.bottom="16px",e.style.right="16px",e.style.zIndex="2147483647",e.style.width="auto",e.style.maxWidth="calc(100vw - 32px)",e.style.pointerEvents="none",document.documentElement.appendChild(e),r=e.attachShadow({mode:"open"});const i=document.createElement("style");i.setAttribute("data-ws-oc","core"),i.textContent=`
    :host { 
      display: block !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      line-height: 1.4 !important;
      color: #0F0B1C !important;
      background: transparent !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .panel { 
      pointer-events: auto !important; 
      border-radius: 16px !important; 
      background: #FFFFFF !important; 
      box-shadow: 0px 4px 24px 0px rgba(0,0,0,0.1) !important; 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important; 
      font-size: 14px !important;
      overflow: hidden !important; 
      width: auto !important;
      min-width: 240px !important;
      max-width: 360px !important;
      min-height: 200px !important;
      display: block !important;
    }
  `,r.appendChild(i);const t=document.createElement("style");return t.setAttribute("data-ws-oc","extra"),t.textContent=`
    .logo { display: inline-block !important; }
    .logo-30 { width: 30px !important; height: 31px !important; }
    .row { 
      display: flex !important; 
      align-items: center !important; 
      gap: 12px !important; 
      padding: 12px 16px !important; 
      font-size: 14px !important;
    }
    .header { 
      font-weight: 500 !important; 
      color: #0F0B1C !important; 
      font-size: 20px !important; 
      line-height: 1.25 !important;
      text-align: center !important;
    }
    .subtle { 
      color: #0F0B1C !important; 
      font-size: 16px !important; 
      line-height: 1.45 !important;
      opacity: 0.5 !important;
    }
    .progress { 
      height: 6px !important; 
      background: #E5F3FF !important; 
      border-radius: 999px !important; 
      overflow: hidden !important; 
      margin: 8px 16px 16px !important; 
    }
    .bar { 
      height: 100% !important; 
      width: 40% !important; 
      background: #0084FF !important; 
      border-radius: inherit !important; 
      animation: grow 1100ms infinite alternate ease-in-out !important; 
    }
    @keyframes grow { from { width: 30% } to { width: 85% } }
    @keyframes ws-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
    .spin { animation: ws-spin 1.5s linear infinite !important; }
    .panel.compact { min-width: unset !important; max-width: none !important; min-height: auto !important; width: auto !important; }
    .setup-row { display:flex !important; align-items:center !important; gap:12px !important; padding: 12px 16px !important; }
    .setup-text { color:#0F0B1C !important; font-size:16px !important; line-height:1.45 !important; opacity:0.5 !important; white-space:nowrap !important; }
    .footer { 
      display: flex !important; 
      gap: 8px !important; 
      padding: 12px 16px !important; 
      justify-content: flex-end !important; 
    }
    .btn { 
      border: none !important; 
      border-radius: 8px !important; 
      height: 36px !important; 
      padding: 0 12px !important; 
      cursor: pointer !important; 
      font-weight: 500 !important; 
      font-size: 12px !important;
      line-height: 1.3 !important;
      font-family: inherit !important;
    }
    .primary { 
      background: #0F0B1C !important; 
      color: #FFFFFF !important; 
    }
    .ghost { 
      background: transparent !important; 
      color: #0F0B1C !important; 
    }
    .link-btn {
      display: flex !important;
      padding: 8px !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 4px !important;
      flex: 1 0 0 !important;
      background: #E5F3FF !important;
      color: #0084FF !important;
      border-radius: 8px !important;
      font-weight: 500 !important;
      font-size: 12px !important;
      line-height: 1.3 !important;
      border: none !important;
      cursor: pointer !important;
      font-family: inherit !important;
    }
    .deal { 
      display: flex !important; 
      align-items: center !important; 
      gap: 8px !important; 
      padding: 2px 0 !important; 
    }
    .badge { 
      min-width: 40px !important; 
      text-align: center !important; 
      padding: 16px !important; 
      border-radius: 8px !important; 
      background: rgba(0,194,117,0.2) !important; 
      color: #0F0B1C !important; 
      font-weight: 500 !important; 
      font-size: 12px !important;
      line-height: 1.45 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    .deal-text {
      flex: 1 !important;
      color: #0F0B1C !important;
      font-size: 12px !important;
      line-height: 1.45 !important;
      font-weight: 400 !important;
      font-family: inherit !important;
    }
    .minipill { 
      pointer-events: auto !important; 
      display: flex !important; 
      align-items: center !important; 
      gap: 8px !important; 
      background: #FFFFFF !important; 
      border-radius: 16px !important; 
      box-shadow: 0px 4px 24px 0px rgba(0,0,0,0.1) !important; 
      padding: 16px !important; 
      white-space: nowrap !important;
    }
    .icon-btn { background: transparent !important; border: none !important; cursor: pointer !important; padding: 0 !important; display:flex !important; align-items:center !important; justify-content:center !important; width: 48px !important; height: 48px !important; }
    .cta-btn { 
      display:flex !important; align-items:center !important; justify-content:center !important;
      height: 32px !important; padding: 0 12px !important; 
      background: #211940 !important; color: #FFFFFF !important; 
      border: none !important; border-radius: 4px !important; cursor: pointer !important;
      font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important; font-weight: 500 !important; line-height: 1.4 !important;
    }
    .pill-row { display:flex !important; align-items:center !important; gap:8px !important; white-space: nowrap !important; padding: 16px !important; }
    .label-text { white-space: nowrap !important; font-weight:400 !important; color:#0F0B1C !important; font-size:16px !important; line-height:1.45 !important; opacity:0.5 !important; }
    .active-pill { display:flex !important; align-items:center !important; gap:12px !important; background: rgba(0,194,117,0.12) !important; border-radius: 16px !important; padding: 8px 16px !important; white-space: nowrap !important; }
    .active-text { color:#268E60 !important; font-size:16px !important; line-height:1.45 !important; font-weight:500 !important; }
    .minimize-btn {
      display: flex !important;
      padding: 0 16px !important;
      align-items: center !important;
      gap: 8px !important;
      align-self: stretch !important;
      border-radius: 4px !important;
      background: #E5F3FF !important;
      border: none !important;
      cursor: pointer !important;
      justify-content: center !important;
      height: 31px !important;
      width: auto !important;
      min-width: 56px !important;
      font-family: inherit !important;
    }
    .minimize-btn:hover {
      background: #0084FF !important;
    }
    .minimize-btn:hover svg path {
      fill: #FFFFFF !important;
    }
    .hidden { display: none !important; }
    .deck-container {
      display: flex !important;
      flex-direction: column !important;
      gap: 12px !important;
      padding: 16px !important;
    }
    .deck-header {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
    }
    .deck-header .nav-btn { width: 24px !important; height: 24px !important; display:flex !important; align-items:center !important; justify-content:center !important; cursor: pointer !important; }
    .deck-header .step-indicator { display:flex !important; align-items:center !important; gap:6px !important; }
    .deck-header .step-dot { width:6px !important; height:6px !important; border-radius:50% !important; background:#E5F3FF !important; }
    .deck-header .step-dot.active { background:#0084FF !important; }
    .deck-nav {
      display: flex !important;
      align-items: center !important;
      gap: 8px !important;
    }
    .deck-dots {
      display: flex !important;
      gap: 4px !important;
    }
    .dot {
      width: 6px !important;
      height: 6px !important;
      border-radius: 50% !important;
      background: #E5F3FF !important;
    }
    .dot.active {
      background: #0084FF !important;
    }
    .deck-content {
      text-align: center !important;
      color: #100B1C !important;
      font-size: 20px !important;
      font-weight: 500 !important;
      line-height: 1.25 !important; /* 125% */
      letter-spacing: -0.15px !important;
      width: 100% !important;
      word-break: break-word !important;
      font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    }
    .deck-footer {
      display: flex !important;
      align-items: center !important;
      justify-content: space-between !important;
      gap: 8px !important;
      padding: 16px 0 !important;
      width: 100% !important;
      align-self: stretch !important;
    }
    .primary-cta {
      display: flex !important;
      height: 48px !important;
      padding: 12px 16px !important;
      justify-content: center !important;
      align-items: center !important;
      gap: 8px !important;
      align-self: stretch !important;
      border-radius: 4px !important;
      background: #211940 !important;
      color: #FFFFFF !important;
      text-align: center !important;
      font-family: 'Woolsocks', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
      font-size: 14px !important;
      font-style: normal !important;
      font-weight: 500 !important;
      line-height: 1.4 !important;
      border: none !important;
      cursor: pointer !important;
      width: 100% !important;
      margin: 8px 0 0 0 !important;
    }
    .deck-status {
      color: #0F0B1C !important;
      font-size: 16px !important;
      font-weight: 400 !important;
      line-height: 1.45 !important;
      opacity: 0.5 !important;
      font-family: inherit !important;
      flex: 1 1 auto !important;
      text-align: center !important;
    }
  `,r.appendChild(t),m=document.createElement("div"),m.id="ws-oc-container",r.appendChild(m),(async()=>{try{const n=(await chrome.storage.session.get(C))[C];n&&W(n);const a=(await chrome.storage.session.get("__wsOcPanelWidth")).__wsOcPanelWidth;a&&e&&(e.style.width=`${a}px`)}catch{}})(),B(),r}function c(){v&&(window.clearTimeout(v),v=null)}function y(i,t){i.innerHTML=t}function T(i,t){const n=h();c();const a=document.createElement("div");a.className="panel";const l=i.replace(/^www\./i,""),o=t.map(p=>`<div class='deal'><div class='badge'>${A(p)}</div><div>${f(p.name||"Online aankoop")}</div></div>`).join("");y(a,`
    <div class="row header">${s("ocPanel.dealsFoundAt",{host:f(l)})}</div>
    <div class="progress"><div class="bar"></div></div>
    ${o}
  `),n.getElementById?.("ws-oc-container")?.replaceChildren(a)}function H(i){const t=h();c();const n=document.createElement("div");n.className="panel compact";const a=i.replace(/^www\./i,"");y(n,`
    <div class="setup-row">
      <div class="setup-text">${s("ocPanel.settingUpFor",{host:f(a)})}</div>
      <img class="logo logo-30 spin" alt="Woolsocks" src="${w.yellow}">
    </div>
  `),t.getElementById?.("ws-oc-container")?.replaceChildren(n)}function j(){const i=h();c();const t=document.createElement("div");t.className="panel",y(t,`
    <div class="row header">${s("ocPanel.noDealsFound")}</div>
  `),i.getElementById?.("ws-oc-container")?.replaceChildren(t),v=window.setTimeout(()=>k(),1e4)}function S(i,t,n,a){const l=h();c();const o=document.createElement("div");o.className="panel",o.style.background="#FFFFFF",o.style.borderRadius="16px",o.style.boxShadow="0px 4px 24px 0px rgba(0,0,0,0.1)",o.style.fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',o.style.fontSize="14px",o.style.color="#0F0B1C",o.style.display="block",o.style.overflow="hidden",o.style.width="auto",o.style.minWidth="240px",o.style.maxWidth="360px",o.style.minHeight="200px";let p=u();try{const d=window.__wsLastMerchantWebUrl;d&&(p=new URL(d).hostname.replace(/^www\./i,"")||p)}catch{}const g=i.map(d=>`
    <div class="deal">
      <div class="badge">${A(d)}</div>
      <div class="deal-text">${f(d.name||"Online aankoop")}</div>
    </div>
  `).join("");y(o,`
    <div class="deck-container">
      ${`
      <div class="deck-header">
        <div class="nav-btn" id="ws-nav-left-1">${E}</div>
        <div class="step-indicator"><div class="step-dot active"></div><div class="step-dot"></div><div class="step-dot"></div></div>
        <div class="nav-btn" id="ws-nav-right-1">${L}</div>
      </div>`}
      ${`<div class="deck-content">${f(p)}</div>`}
      ${`
      <div style="display:flex;gap:16px;width:100%;">
        <button class="link-btn" id="ws-view" style="flex:1 0 100% !important;width:100%">${s("ocPanel.viewConditions")}</button>
      </div>`}
      ${g}
      <button class="primary-cta" id="ws-login">${s("ocPanel.signupLogin")}</button>
      <div class="deck-footer">
        <button class="minimize-btn" id="ws-minimize">${_}</button>
        <div class="deck-status">${s("ocPanel.cashbackActive")}</div>
        <img class="logo logo-30" alt="Woolsocks" src="${w.green}">
      </div>
    </div>
  `),l.getElementById?.("ws-oc-container")?.replaceChildren(o),(async()=>{try{const d=(await chrome.storage.session.get("__wsOcPanelWidth")).__wsOcPanelWidth;d&&e?e.style.width=`${d}px`:a?.unauth}catch{}})(),o.querySelector("#ws-view")?.addEventListener("click",t),o.querySelector("#ws-login")?.addEventListener("click",n),o.querySelector("#ws-nav-right-1")?.addEventListener("click",()=>{I()}),o.querySelector("#ws-nav-left-1")?.addEventListener("click",()=>{M()}),o.querySelector("#ws-minimize")?.addEventListener("click",()=>{x()})}function I(){const i=h();c();const t=document.createElement("div");t.className="panel",t.style.background="#FFFFFF",t.style.borderRadius="16px",t.style.boxShadow="0px 4px 24px 0px rgba(0,0,0,0.1)",t.style.fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',t.style.fontSize="14px",t.style.color="#0F0B1C",t.style.display="block",t.style.overflow="hidden",t.style.width="auto",t.style.minWidth="240px",t.style.maxWidth="360px",t.style.minHeight="200px",y(t,`
    <div class="deck-container">
      <div class="deck-header">
        <div class="nav-btn" id="ws-nav-left-2">${E}</div>
        <div class="step-indicator"><div class="step-dot"></div><div class="step-dot active"></div><div class="step-dot"></div></div>
        <div class="nav-btn" id="ws-nav-right-2">${L}</div>
      </div>
      <div class="deck-content">${s("ocPanel.shopAndPayNormally")}</div>
      <div class="deck-footer">
        <button class="minimize-btn" id="ws-minimize">${_}</button>
        <div class="deck-status">${s("ocPanel.cashbackActive")}</div>
        <img class="logo logo-30" alt="Woolsocks" src="${w.green}">
      </div>
    </div>
  `),i.getElementById?.("ws-oc-container")?.replaceChildren(t),t.querySelector("#ws-nav-right-2")?.addEventListener("click",()=>{M()}),t.querySelector("#ws-nav-left-2")?.addEventListener("click",()=>{location.hash="",S([],()=>{},()=>{})}),t.querySelector("#ws-minimize")?.addEventListener("click",()=>{x()})}function M(){const i=h();c();const t=document.createElement("div");t.className="panel",t.style.background="#FFFFFF",t.style.borderRadius="16px",t.style.boxShadow="0px 4px 24px 0px rgba(0,0,0,0.1)",t.style.fontFamily='-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',t.style.fontSize="14px",t.style.color="#0F0B1C",t.style.display="block",t.style.overflow="hidden",t.style.width="auto",t.style.minWidth="256px",t.style.maxWidth="320px",t.style.minHeight="200px",y(t,`
    <div class="deck-container">
      <div class="deck-header">
        <div class="nav-btn" id="ws-nav-left-3">${E}</div>
        <div class="step-indicator"><div class="step-dot"></div><div class="step-dot"></div><div class="step-dot active"></div></div>
        <div class="nav-btn" id="ws-nav-right-3">${L}</div>
      </div>
      <div class="deck-content">${s("ocPanel.acceptCookiesDisableAdblock")}</div>
      <div class="deck-footer">
        <button class="minimize-btn" id="ws-minimize">${_}</button>
        <div class="deck-status">${s("ocPanel.cashbackActive")}</div>
        <img class="logo logo-30" alt="Woolsocks" src="${w.green}">
      </div>
    </div>
  `),i.getElementById?.("ws-oc-container")?.replaceChildren(t),t.querySelector("#ws-nav-right-3")?.addEventListener("click",()=>{S([],()=>{},()=>{})}),t.querySelector("#ws-nav-left-3")?.addEventListener("click",()=>{I()}),t.querySelector("#ws-minimize")?.addEventListener("click",()=>{x()})}function x(i){const t=h();c();const n=document.createElement("div");n.className="minipill";const a=i?.deals||window.__wsLastDeals||[],l=Array.isArray(a)&&a.length?Math.max(...a.map(g=>Number(g?.rate||0))):0,o=i?.unauth?s("ocPanel.earnRateCashback",{rate:l}):s("ocPanel.cashbackActive"),p=i?.unauth?w.grey:w.green;n.innerHTML=`
    <div class="pill-row">
      <button class="cta-btn" id="ws-expand">${s("popup.login")}</button>
      <div class="label-text">${o}</div>
      <img class="logo logo-30" alt="Woolsocks" src="${p}">
      <button class="icon-btn" id="ws-dismiss"><img src="${z}" alt="close" width="48" height="48" /></button>
    </div>
  `,t.getElementById?.("ws-oc-container")?.replaceChildren(n),(async()=>{try{const g=n.getBoundingClientRect().width;g&&e&&(e.style.width=`${Math.round(g)}px`,await chrome.storage.session.set({__wsOcPanelWidth:Math.round(g)}))}catch{}})(),n.querySelector("#ws-dismiss")?.addEventListener("click",async()=>{try{await b(u(),!1)}catch{}k()}),n.querySelector("#ws-expand")?.addEventListener("click",()=>{i?.unauth?chrome.runtime.sendMessage({type:"OPEN_URL",url:"https://woolsocks.eu"}):S(window.__wsLastDeals||[],()=>{},()=>{})})}function R(){const i=h();c();const t=document.createElement("div");t.className="minipill",t.innerHTML=`
    <div class="active-pill">
      ${N}
      <div class="active-text">${s("ocPanel.cashbackActive")}</div>
    </div>
    <button class="icon-btn" id="ws-dismiss"><img src="${z}" alt="close" width="48" height="48" /></button>
  `,i.getElementById?.("ws-oc-container")?.replaceChildren(t),(async()=>{try{const n=t.getBoundingClientRect().width;n&&e&&(e.style.width=`${Math.round(n)}px`,await chrome.storage.session.set({__wsOcPanelWidth:Math.round(n)}))}catch{}})(),t.querySelector("#ws-dismiss")?.addEventListener("click",async()=>{try{await b(u(),!1)}catch{}k()})}function k(){c(),e&&e.parentNode&&e.parentNode.removeChild(e),e=null,r=null}function f(i){return i.replace(/[&<>"']/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[t])}function A(i){return(i.amountType||"").toUpperCase()==="FIXED"?`${i.currency||"€"}${i.rate}`:`${typeof i.rate=="number"?i.rate:0}%`}chrome.runtime.onMessage.addListener(i=>{if(!i||!i.__wsOcUi)return;const t=u(),n=i;if(n.kind==="oc_scan_start")n.host;else if(n.kind==="oc_deals_found")T(n.host,n.deals||[]),F(n.host,n.deals||[]);else if(n.kind==="oc_redirect_requested")H(n.host);else if(n.kind==="oc_blocked")n.reason==="no_deals"?j():k();else if(n.kind==="oc_activated")(async()=>{try{await b(t,!0)}catch{}})(),R(),F(t,n.deals||[],!0);else if(n.kind==="oc_login_required"){try{window.__wsLastDeals=n.deals||[]}catch{}try{window.__wsLastProviderId=n.providerMerchantId}catch{}(async()=>{try{await b(u(),!0)}catch{}})(),x({unauth:!0,deals:n.deals||[]}),F(t,n.deals||[])}});document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")try{chrome.runtime.sendMessage({type:"REQUEST_ACTIVATION_STATE",domain:u()},i=>{if(i&&i.active){R();try{window.__wsLastActivation={at:i.at,clickId:i.clickId}}catch{}try{console.debug?.("[WS OC] reemit active from bg state")}catch{}}})}catch{}});(async()=>{try{await O()}catch{}const i=u();await D(i)&&x()})();
