(()=>{var _="openchamber.sdk",k=1;var VT=`
:root {
  --oc-scrollbar-thumb: color-mix(in srgb, var(--oc-muted, currentColor) 40%, transparent);
  --oc-scrollbar-thumb-hover: color-mix(in srgb, var(--oc-muted, currentColor) 65%, transparent);
  scrollbar-gutter: stable;
}
* {
  scrollbar-width: thin;
  scrollbar-color: var(--oc-scrollbar-thumb) transparent;
}
/* Chromium's standard scrollbar properties otherwise override its pseudo-elements. */
@supports selector(::-webkit-scrollbar) {
  * { scrollbar-width: auto; scrollbar-color: auto; }
  ::-webkit-scrollbar { width: 6px; height: 6px; background: transparent; }
  :root::-webkit-scrollbar, body::-webkit-scrollbar { background: var(--oc-bg, inherit); }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb {
    background: var(--oc-scrollbar-thumb);
    border-radius: 999px;
    min-width: 24px;
    min-height: 24px;
  }
  ::-webkit-scrollbar-thumb:hover { background: var(--oc-scrollbar-thumb-hover); }
  ::-webkit-scrollbar-corner { background: transparent; }
  ::-webkit-scrollbar-button { display: none; width: 0; height: 0; }
}
@media (forced-colors: active) {
  * { scrollbar-color: auto; }
  ::-webkit-scrollbar-thumb, ::-webkit-scrollbar-thumb:hover { background: CanvasText; }
}
`;var DT=128,OT=65536;var iT=["file","directory","other","missing"],CT=(T)=>Boolean(T&&"sessionId"in T),BT=(T)=>Boolean(T&&"sent"in T&&!("sessionId"in T));var TT=500,ST=32000,rT=16000,tT=128,sT=200,eT=2000,TS=16000,SS=80,fS=200,bS=16000;var GS=2000;var ET=20000,fT=1024,bT=2000000;var GT=64000,UT=8000,KT=4000;var IT=90000;var US=999,_T=500,_S=["HOST_UNAVAILABLE","HOST_TIMEOUT","HOST_REJECTED","DISCONNECTED","DISABLED","BAD_PATH","NO_INTEGRATION","NO_SERVICE","SERVICE_FAILED","NO_SESSION","SESSION_BUSY","NOT_GRANTED","NO_DIRECTORY","NOT_FOUND","FILE_TOO_LARGE","DENIED","NO_MODEL","MODEL_FAILED"],kS=["stopped","starting","ready","failed"],FS=new Set(_S),XS=(T)=>FS.has(T),AS=(T)=>T&&XS(T)?T:"HOST_REJECTED",p=(T)=>{if(T===void 0)return!1;if(T===null||T===!0||T===!1)return!0;if(String(T)===T)return!0;if(Number(T)===T)return Number.isFinite(T);if(Array.isArray(T))return T.every(p);if(Object(T)===T)return Object.values(T).every(p);return!1},MS=(T)=>p(T)&&JSON.stringify(T).length<=bS,aT=(T)=>T?.trim().slice(0,fS)??"",v=(T)=>{let b=T.id.trim().slice(0,tT),I=T.title.trim().slice(0,sT),n=T.url.trim().slice(0,eT),R=T.text?.trim().slice(0,TS),P=T.author?.trim().slice(0,SS),w=T.kind==="pull"?"pull":"issue",B={providerId:T.providerId.trim(),id:b,title:I||b,url:n,kind:w};if(R)B.text=R;if(P)B.author=P;if(w==="pull"){let c=aT(T.branches?.head),N=aT(T.branches?.base);if(c&&N)B.branches={head:c,base:N}}if(MS(T.data))B.data=T.data;return B},jT=(T)=>{let b=v(T);if(T.projectId)b.projectId=T.projectId;if(T.navigation)b.navigation=T.navigation;if(T.worktree)b.worktree=T.worktree;return b},xT=(T)=>{let b={text:T.text.trim().slice(0,rT)};if(T.send)b.send=!0;return b},PT=(T)=>{if(T===null||!Number.isFinite(T))return null;return Math.min(US,Math.max(0,Math.round(T)))};var l=(T)=>T.length>0&&T.length<=fT&&!T.includes("\x00")&&!T.includes("\\");var kT=(T)=>{if(!T.startsWith("/")||T.includes("\x00")||T.includes("\\")||T.includes("://"))return!1;if(T.length>GS)return!1;return!T.split("/").some((I)=>I==="."||I==="..")},VS=new Set(kS),wT=(T)=>Boolean(T&&"status"in T&&VS.has(String(T.status))&&!("body"in T)),XT=(T)=>Boolean(T&&"status"in T&&"body"in T&&Number.isInteger(T.status)),cT=(T)=>Boolean(T&&"content"in T&&String(T.content)===T.content),NT=(T)=>Boolean(T&&"written"in T&&T.written===!0),RT=(T)=>Boolean(T&&"entries"in T&&Array.isArray(T.entries)),DS=new Set(iT),mT=(T)=>Boolean(T&&"kind"in T&&"size"in T&&DS.has(String(T.kind))&&Number.isFinite(T.size)),HT=(T)=>Boolean(T&&"text"in T&&String(T.text)===T.text&&!("status"in T)),OS=new Set(["workspace","ready","directory","session","connection","settings","session-lifecycle","item","resolve","action"]),LS=(T)=>Object(T)===T?T:null,LT=(T)=>String(T)===T&&T.length>0,CS=(T)=>{if(!LT(T.id))return null;if(T.ok===!0){let b={channel:_,v:k,type:"result",id:T.id,ok:!0};if(Object(T.payload)===T.payload)b.payload=T.payload;return b}if(T.ok===!1&&LT(T.error))return{channel:_,v:k,type:"result",id:T.id,ok:!1,error:T.error,code:AS(LT(T.code)?T.code:void 0)};return null},hT=(T)=>{let b=LS(T);if(!b||b.channel!==_||b.v!==k)return null;if(b.type==="result")return CS(b);if(!OS.has(String(b.type))||Object(b.payload)!==b.payload)return null;return b};class G extends Error{code;constructor(T,b){super(b);this.name="HostRequestError",this.code=T}}var YS=()=>Promise.reject(new G("BAD_PATH",'Request path must start with "/" and stay on the declared origin.')),AT=()=>Promise.reject(new G("BAD_PATH",`File path must be 1 to ${fT} characters without NUL or backslash.`)),A=(T)=>{return T.value+=1,`oc-${T.value}`},qT=(T={})=>{let b=T.target??("window"in globalThis?window:null);if(!b)throw new G("HOST_UNAVAILABLE","No window. connectHost runs in a browser frame.");let I=T.acceptSource??((S)=>S===b.parent),n=T.requestTimeoutMs??ET,R=new Set,P=new Set,w=new Set,B=new Set,c=new Set,N=new Set,u=new Set,a=null,i=null,d=new Map,g=new Map,r=!1,X={value:0},M=null,j=null,nT=(S)=>{if(!S)return null;return{sessionId:S.id,phase:S.busy?"started":"completed"}},m=(S)=>{b.parent.postMessage(S,"*")},W=(S,f)=>{for(let U of S)try{U(f)}catch($){console.error($)}},uT=(S)=>{if(!(S instanceof MessageEvent))return;if(!I(S.source))return;let f=hT(S.data);if(!f)return;if(f.type==="workspace"){let $=g.get(f.payload.subscriptionId);if($)W([$],f.payload.snapshot);return}if(f.type==="ready"){if(M=f.payload,j=nT(f.payload.session),W(R,f.payload),W(P,f.payload.directory),W(w,f.payload.session),j)W(B,j);W(c,f.payload.connection),W(N,f.payload.settings),W(u,f.payload.item);return}if(f.type==="directory"){if(M)M={...M,directory:f.payload.directory};W(P,f.payload.directory);return}if(f.type==="session"){if(M)M={...M,session:f.payload.session};if(!f.payload.session)j=null;else if(j?.sessionId!==f.payload.session.id)j=nT(f.payload.session);W(w,f.payload.session);return}if(f.type==="session-lifecycle"){j=f.payload,W(B,f.payload);return}if(f.type==="connection"){if(M)M={...M,connection:f.payload.connection};W(c,f.payload.connection);return}if(f.type==="settings"){if(M)M={...M,settings:f.payload.settings};W(N,f.payload.settings);return}if(f.type==="item"){if(M)M={...M,item:f.payload.item};W(u,f.payload.item);return}if(f.type==="action"){let $=(z)=>{if(!r)m({channel:_,v:k,type:"action-result",id:f.id,payload:z})},E=i;if(!E){$({ok:!1,error:"This extension does not handle background actions."});return}Promise.resolve().then(()=>E(f.payload)).then(()=>$({ok:!0}),(z)=>{let FT=(z instanceof Error?z.message:String(z)).trim();$({ok:!1,error:(FT||"Action failed.").slice(0,_T)})});return}if(f.type==="resolve"){let $=(z)=>{m({channel:_,v:k,type:"resolve-result",id:f.id,payload:z})},E=a;if(!E){$({error:"This extension does not resolve commands."});return}Promise.resolve().then(()=>E(f.payload)).then((z)=>$({item:z?v(z):null}),(z)=>{let FT=(z instanceof Error?z.message:String(z)).trim();$({error:(FT||"Command failed.").slice(0,_T)})});return}let U=d.get(f.id);if(!U)return;if(clearTimeout(U.timer),d.delete(f.id),f.ok){U.resolve(f.payload);return}U.reject(new G(f.code,f.error))};b.addEventListener("message",uT),m({channel:_,v:k,type:"hello"});let D=(S,f=n)=>{if(r||b.parent===b)return Promise.reject(new G("HOST_UNAVAILABLE","No host frame. This page is not in an iframe."));return new Promise((U,$)=>{let E=setTimeout(()=>{d.delete(S.id),$(new G("HOST_TIMEOUT","Host did not answer in time."))},f);d.set(S.id,{resolve:U,reject:$,timer:E}),m(S)})},O=(S)=>D(S).then(()=>{return}),H={channel:_,v:k},h=(S,f=1024)=>{if(!S.trim()||S.length>f)throw new G("HOST_REJECTED",`Identity must contain 1 to ${f} characters.`)},JT=async(S)=>{if(S.kind!=="projects")h(S.projectId);let f=await D({...H,type:"workspace-read",id:A(X),payload:S});if(!f||!("kind"in f)||!("state"in f)||f.kind!==S.kind)throw new G("HOST_REJECTED","Host did not return workspace data.");return f},WT=async(S,f)=>{if(S.kind!=="projects")h(S.projectId);let U=A(X);g.set(U,f);try{await O({...H,type:"workspace-subscribe",id:A(X),payload:{subscriptionId:U,query:S}})}catch($){if(g.delete(U),!r)m({...H,type:"workspace-unsubscribe",id:A(X),payload:{subscriptionId:U}});throw $}return()=>{if(!g.delete(U)||r)return;m({...H,type:"workspace-unsubscribe",id:A(X),payload:{subscriptionId:U}})}},e=async(S)=>{if("key"in S&&(S.key.length===0||S.key.length>DT))throw new G("HOST_REJECTED","Storage key must contain 1 to 128 characters.");if(S.op==="set"&&!p(S.value))throw new G("HOST_REJECTED","Storage values must be JSON.");if(S.op==="set"&&new TextEncoder().encode(JSON.stringify(S.value)).length>OT)throw new G("HOST_REJECTED","Storage value exceeds 64 KiB.");let f=await D({...H,type:"storage",id:A(X),payload:S});if(!f||!("storage"in f)||f.op!==S.op)throw new G("HOST_REJECTED","Host did not return storage data.");return f};return{onAction:(S)=>{return i=S,()=>{if(i===S)i=null}},listProjects:async()=>{let S=await JT({kind:"projects"});if(S.kind!=="projects")throw new G("HOST_REJECTED","Expected projects.");return S},listWorktrees:async(S)=>{let f=await JT({kind:"worktrees",projectId:S});if(f.kind!=="worktrees")throw new G("HOST_REJECTED","Expected worktrees.");return f},listSessions:async(S)=>{let f=await JT({kind:"sessions",projectId:S});if(f.kind!=="sessions")throw new G("HOST_REJECTED","Expected sessions.");return f},onProjects:(S)=>WT({kind:"projects"},(f)=>{if(f.kind==="projects")S(f)}),onWorktrees:(S,f)=>WT({kind:"worktrees",projectId:S},(U)=>{if(U.kind==="worktrees")f(U)}),onSessions:(S,f)=>WT({kind:"sessions",projectId:S},(U)=>{if(U.kind==="sessions")f(U)}),openSession:async(S)=>{h(S),await O({...H,type:"open-session",id:A(X),payload:{sessionId:S}})},storage:{get:async(S)=>{let f=await e({op:"get",key:S});return f.op==="get"&&f.found?f.value:void 0},set:async(S,f)=>{await e({op:"set",key:S,value:f})},delete:async(S)=>{await e({op:"delete",key:S})},keys:async()=>{let S=await e({op:"keys"});if(S.op!=="keys")throw new G("HOST_REJECTED","Expected storage keys.");return S.keys}},onReady:(S)=>{if(R.add(S),M)S(M);return()=>{R.delete(S)}},onDirectory:(S)=>{if(P.add(S),M)S(M.directory);return()=>{P.delete(S)}},onSession:(S)=>{if(w.add(S),M)S(M.session);return()=>{w.delete(S)}},onSessionLifecycle:(S)=>{if(B.add(S),j)S(j);return()=>{B.delete(S)}},onConnection:(S)=>{if(c.add(S),M)S(M.connection);return()=>{c.delete(S)}},onSettings:(S)=>{if(N.add(S),M)S(M.settings);return()=>{N.delete(S)}},onItem:(S)=>{if(u.add(S),M)S(M.item);return()=>{u.delete(S)}},onResolve:(S)=>{return a=S,()=>{if(a===S)a=null}},toast:(S)=>{let f=S.message.trim();if(!f||f.length>TT)return Promise.reject(new G("HOST_REJECTED",`Toast message must contain 1 to ${TT} characters.`));if(S.copy&&S.copy!==!0&&(!S.copy.text.length||S.copy.text.length>ST))return Promise.reject(new G("HOST_REJECTED",`Toast copy text must contain 1 to ${ST} characters.`));return O({channel:_,v:k,type:"toast",id:A(X),payload:{...S,message:f}})},openUrl:(S)=>O({channel:_,v:k,type:"open-url",id:A(X),payload:{url:S}}),openSurface:(S)=>O({channel:_,v:k,type:"open-surface",id:A(X),payload:{surfaceId:S}}),writeClipboard:(S)=>O({channel:_,v:k,type:"clipboard-write",id:A(X),payload:{text:S}}),compose:(S)=>O({channel:_,v:k,type:"compose",id:A(X),payload:S}),attach:(S)=>O({channel:_,v:k,type:"attach",id:A(X),payload:v(S)}),startSession:async(S)=>{if(S.projectId!==void 0)h(S.projectId);let f=S.worktree;if(f&&f!==!0)if(f.kind==="existing")h(f.directory);else{if(f.name!==void 0)h(f.name,200);if(f.baseBranch!==void 0)h(f.baseBranch,200)}let U=await D({channel:_,v:k,type:"start-session",id:A(X),payload:jT(S)},T.requestTimeoutMs??180000);if(!CT(U))throw new G("HOST_REJECTED","Host did not return a session.");return U},prompt:(S)=>D({channel:_,v:k,type:"prompt",id:A(X),payload:xT(S)}).then((f)=>{if(!BT(f))throw new G("HOST_REJECTED","Host did not return a prompt result.");return f}),sessionLink:(S)=>O({channel:_,v:k,type:"session-link",id:A(X),payload:v(S)}),close:()=>O({channel:_,v:k,type:"close",id:A(X)}),oauthStart:()=>O({channel:_,v:k,type:"oauth-start",id:A(X)}),oauthDisconnect:()=>O({channel:_,v:k,type:"oauth-disconnect",id:A(X)}),request:(S)=>(kT(S.path)?D({channel:_,v:k,type:"request",id:A(X),payload:S}):YS()).then((f)=>{if(!XT(f))throw new G("HOST_REJECTED","Host request result was empty.");return f}),serviceRequest:(S)=>(kT(S.path)?D({channel:_,v:k,type:"service-request",id:A(X),payload:S}):YS()).then((f)=>{if(!XT(f))throw new G("HOST_REJECTED","Host service request result was empty.");return f}),serviceStatus:()=>D({channel:_,v:k,type:"service-status",id:A(X)}).then((S)=>{if(!wT(S))throw new G("HOST_REJECTED","Host did not return service status.");return S}),readFile:(S)=>(l(S)?D({channel:_,v:k,type:"file-read",id:A(X),payload:{path:S}}):AT()).then((f)=>{if(!cT(f))throw new G("HOST_REJECTED","Host did not return file content.");return f}),writeFile:(S,f)=>{if(!l(S))return AT();if(f.length>bT)return Promise.reject(new G("FILE_TOO_LARGE",`Content is over ${bT} characters.`));return D({channel:_,v:k,type:"file-write",id:A(X),payload:{path:S,content:f}}).then((U)=>{if(!NT(U))throw new G("HOST_REJECTED","Host did not confirm the write.");return U})},listDir:(S)=>(l(S)?D({channel:_,v:k,type:"file-list",id:A(X),payload:{path:S}}):AT()).then((f)=>{if(!RT(f))throw new G("HOST_REJECTED","Host did not return directory entries.");return f}),stat:(S)=>(l(S)?D({channel:_,v:k,type:"file-stat",id:A(X),payload:{path:S}}):AT()).then((f)=>{if(!mT(f))throw new G("HOST_REJECTED","Host did not return file status.");return f}),generate:(S)=>{let f=S.prompt.trim(),U=S.system?.trim();if(f.length===0||f.length>GT)return Promise.reject(new G("HOST_REJECTED",`Prompt must be 1 to ${GT} characters.`));if(U!==void 0&&(U.length===0||U.length>UT))return Promise.reject(new G("HOST_REJECTED",`System prompt must be 1 to ${UT} characters.`));let $=S.maxOutputTokens===void 0?void 0:Math.min(KT,Math.max(1,Math.floor(S.maxOutputTokens)));if($!==void 0&&!Number.isFinite($))return Promise.reject(new G("HOST_REJECTED","maxOutputTokens must be a number."));let E={prompt:f};if(U!==void 0)E.system=U;if($!==void 0)E.maxOutputTokens=$;return D({channel:_,v:k,type:"generate",id:A(X),payload:E},T.requestTimeoutMs??IT).then((z)=>{if(!HT(z))throw new G("HOST_REJECTED","Host did not return generated text.");return z})},setBadge:(S)=>O({channel:_,v:k,type:"badge",id:A(X),payload:{count:PT(S)}}),dispose:()=>{for(let S of g.keys())m({...H,type:"workspace-unsubscribe",id:A(X),payload:{subscriptionId:S}});g.clear(),r=!0,a=null,i=null,b.removeEventListener("message",uT);for(let S of d.values())clearTimeout(S.timer),S.reject(new G("HOST_UNAVAILABLE","Host client was disposed."));d.clear(),R.clear(),P.clear(),w.clear(),B.clear(),c.clear(),N.clear(),u.clear()}}};var BS=[["--oc-bg","background"],["--oc-elevated","elevated"],["--oc-fg","foreground"],["--oc-muted","muted"],["--oc-subtle","subtle"],["--oc-border","border"],["--oc-hover","hover"],["--oc-selection","selection"],["--oc-focus","focus"],["--oc-primary","primary"],["--oc-muted-surface","mutedSurface"],["--oc-elevated-fg","elevatedForeground"],["--oc-active","active"],["--oc-selection-fg","selectionForeground"],["--oc-primary-fg","primaryForeground"],["--oc-primary-text","primaryText"],["--oc-success-text","successText"],["--oc-warning-text","warningText"],["--oc-error-text","errorText"],["--oc-info-text","infoText"],["--oc-success","success"],["--oc-warning","warning"],["--oc-error","error"],["--oc-info","info"],["--oc-font","font"],["--oc-mono","mono"],["--oc-radius","radius"],["--surface-background","background"],["--surface-elevated","elevated"],["--surface-foreground","foreground"],["--surface-muted-foreground","muted"],["--surface-subtle","subtle"],["--interactive-border","border"],["--interactive-hover","hover"],["--interactive-selection","selection"],["--interactive-focus-ring","focus"],["--primary","primary"],["--surface-muted","mutedSurface"],["--surface-elevated-foreground","elevatedForeground"],["--interactive-active","active"],["--interactive-selection-foreground","selectionForeground"],["--primary-foreground","primaryForeground"],["--primary-text","primaryText"],["--success-text","successText"],["--warning-text","warningText"],["--error-text","errorText"],["--info-text","infoText"],["--status-success","success"],["--status-warning","warning"],["--status-error","error"],["--status-info","info"],["--font-sans","font"],["--font-mono","mono"],["--radius","radius"]],$S=(T,b)=>{b.style.colorScheme=T.mode;for(let[I,n]of BS)b.style.setProperty(I,T.tokens[n]);b.style.setProperty("font-family",T.tokens.font),b.style.setProperty("font-size","0.875rem"),b.style.setProperty("line-height","1.45"),b.style.setProperty("color",T.tokens.foreground)},yT=(T,b)=>{if($S(T.theme,b),b.dataset)b.dataset.ocSurface=T.surface,b.dataset.ocTheme=T.theme.mode};var ES={"surface-background":"bg","surface-elevated":"elevated","surface-elevated-foreground":"elevated-fg","surface-foreground":"fg","surface-muted-foreground":"muted","surface-muted":"muted-surface","surface-subtle":"subtle","interactive-border":"border","interactive-hover":"hover","interactive-active":"active","interactive-selection":"selection","interactive-selection-foreground":"selection-fg","interactive-focus-ring":"focus",primary:"primary","primary-foreground":"primary-fg","primary-text":"primary-text","success-text":"success-text","warning-text":"warning-text","error-text":"error-text","info-text":"info-text","status-success":"success","status-warning":"warning","status-error":"error","status-info":"info","font-sans":"font","font-mono":"mono",radius:"radius"},Y=(T,b)=>`var(--${T}, var(--oc-${ES[T]}, ${b}))`,q=Y("surface-background","transparent"),MT=Y("surface-elevated","transparent"),t=Y("surface-elevated-foreground","inherit"),s=Y("surface-foreground","inherit"),Q=Y("surface-muted-foreground","gray"),KS=Y("surface-muted","transparent"),C=Y("interactive-border","currentColor"),L=Y("interactive-hover","transparent"),y=Y("interactive-active","transparent"),dT=Y("interactive-selection","transparent"),gT=Y("interactive-selection-foreground","inherit"),zS=Y("interactive-focus-ring","currentColor"),K=Y("primary","currentColor"),pT=Y("primary-text","inherit"),vT=Y("error-text","inherit"),IS=Y("font-sans","inherit"),lT=Y("font-mono","monospace"),QS=Y("radius","9px"),Z=(T,b,I="transparent")=>`color-mix(in srgb, ${T} ${b}%, ${I})`,ZS=`box-shadow: 0 0 0 2px ${zS};`,YT=(T)=>{let b=Y(`status-${T}`,"currentColor");return`
.oc-sdk[data-tone="${T}"], .oc-sdk [data-tone="${T}"] { --oc-sdk-tone: ${b}; --oc-sdk-tone-text: ${Y(`${T}-text`,"inherit")}; }`},J=`
${VT}
.oc-sdk { box-sizing: border-box; color: ${s}; font-family: ${IS}; font-size: 0.875rem; line-height: 1.45; }
.oc-sdk *, .oc-sdk *::before, .oc-sdk *::after { box-sizing: border-box; }
/* :where() keeps the reset at zero specificity so every primitive class below overrides it. */
:where(.oc-sdk) :where(button, input, textarea), :where(button.oc-sdk, input.oc-sdk, textarea.oc-sdk) { font: inherit; color: inherit; margin: 0; }
:where(.oc-sdk) :where(button), :where(button.oc-sdk) { cursor: pointer; background: none; border: 0; padding: 0; }
.oc-sdk button:disabled, button.oc-sdk:disabled, .oc-sdk[aria-disabled="true"], .oc-sdk [aria-disabled="true"] { opacity: .5; pointer-events: none; }
.oc-sdk :focus-visible { outline: none; ${ZS} }
.oc-sdk-mono { font-family: ${lT}; }
.oc-sdk-muted { color: ${Q}; }
${YT("success")}${YT("warning")}${YT("error")}${YT("info")}
.oc-sdk[data-tone="primary"], .oc-sdk [data-tone="primary"] { --oc-sdk-tone: ${K}; --oc-sdk-tone-text: ${pT}; }

.oc-sdk-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 36px; padding: 0 14px; border: 1px solid transparent; border-radius: ${QS}; font-size: 0.875rem; font-weight: 500; line-height: 1; white-space: nowrap; transition: background 150ms ease-out, color 150ms ease-out; }
.oc-sdk-btn[data-size="sm"] { height: 32px; padding: 0 10px; font-size: 0.8125rem; }
.oc-sdk-btn[data-size="xs"] { height: 24px; padding: 0 8px; font-size: 0.75rem; border-radius: 6px; }
.oc-sdk-btn[data-variant="default"] { color: ${pT}; background: ${Z(K,10,q)}; border-color: ${Z(K,12)}; }
.oc-sdk-btn[data-variant="default"]:hover { background: ${Z(K,16,q)}; }
.oc-sdk-btn[data-variant="default"]:active { background: ${Z(K,22,q)}; }
.oc-sdk-btn[data-variant="secondary"] { background: ${KS}; color: var(--oc-fg); }
.oc-sdk-btn[data-variant="secondary"]:hover { background-image: linear-gradient(${L}, ${L}); }
.oc-sdk-btn[data-variant="secondary"]:active { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-btn[data-variant="outline"] { background: ${MT}; color: ${t}; border-color: ${C}; }
.oc-sdk-btn[data-variant="outline"]:hover { background-image: linear-gradient(${L}, ${L}); }
.oc-sdk-btn[data-variant="outline"]:active { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-btn[data-variant="ghost"] { background: transparent; }
.oc-sdk-btn[data-variant="ghost"]:hover { background: ${L}; }
.oc-sdk-btn[data-variant="ghost"]:active { background: ${y}; }
.oc-sdk-btn[data-variant="destructive"] { --oc-sdk-tone: ${Y("status-error","red")}; color: ${vT}; background: ${Z("var(--oc-sdk-tone)",7,q)}; border-color: ${Z("var(--oc-sdk-tone)",12)}; }
.oc-sdk-btn[data-variant="destructive"]:hover { background: ${Z("var(--oc-sdk-tone)",9,q)}; }
.oc-sdk-btn[data-variant="destructive"]:active { background: ${Z("var(--oc-sdk-tone)",11,q)}; }
.oc-sdk-btn[data-loading="true"] { opacity: .5; pointer-events: none; }
.oc-sdk-btn > .oc-sdk-spinner-ring { width: 14px; height: 14px; }

.oc-sdk-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-field-label { font-size: 0.8125rem; font-weight: 500; }
.oc-sdk-field-note { font-size: 0.75rem; color: ${Q}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-field-note { color: ${vT}; }
.oc-sdk-input { display: block; width: 100%; min-width: 0; height: 36px; padding: 0 12px; border: 0; border-radius: ${QS}; background: ${MT}; color: ${t}; font-size: 0.875rem; line-height: 1.45; appearance: none; box-shadow: inset 0 0 0 1px ${Z(C,60)}; transition: background 150ms ease-out, box-shadow 150ms ease-out; }
textarea.oc-sdk-input { height: auto; padding: 8px 12px; resize: vertical; }
.oc-sdk-input::placeholder { color: ${Q}; }
.oc-sdk-input:hover:not(:focus) { background-image: linear-gradient(${L}, ${L}); }
.oc-sdk-input:focus, .oc-sdk-input:focus-visible { box-shadow: inset 0 0 0 2px ${zS}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input { box-shadow: inset 0 0 0 1px ${Y("status-error","red")}; }
.oc-sdk-field[data-invalid="true"] .oc-sdk-input:focus { box-shadow: inset 0 0 0 2px ${Y("status-error","red")}; }
.oc-sdk-input[data-mono="true"] { font-family: ${lT}; }

.oc-sdk-search { position: relative; min-width: 0; }
.oc-sdk-search .oc-sdk-input { padding-left: 34px; padding-right: 34px; }
.oc-sdk-search-icon { position: absolute; left: 11px; top: 50%; transform: translateY(-50%); color: ${Q}; pointer-events: none; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-icon { color: ${K}; }
.oc-sdk-search-clear { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); display: none; align-items: center; justify-content: center; width: 24px; height: 24px; border-radius: 6px; color: ${Q}; }
.oc-sdk-search[data-active="true"] .oc-sdk-search-clear { display: inline-flex; }
.oc-sdk-search-clear:hover { background: ${L}; color: ${s}; }

.oc-sdk-select { position: relative; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-trigger { display: inline-flex; align-items: center; gap: 6px; width: 100%; min-width: 0; height: 32px; padding: 0 8px 0 10px; border: 1px solid ${C}; border-radius: 6px; background: ${MT}; color: ${t}; font-size: 0.8125rem; text-align: left; transition: background 150ms ease-out; }
.oc-sdk-trigger:hover { background-image: linear-gradient(${L}, ${L}); }
.oc-sdk-trigger[aria-expanded="true"] { background-image: linear-gradient(${y}, ${y}); }
.oc-sdk-trigger-value { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-trigger-value[data-empty="true"] { color: ${Q}; }
.oc-sdk-trigger-chevron { flex: 0 0 auto; color: ${Q}; }
.oc-sdk-popup { --surface-foreground: ${t}; position: fixed; z-index: 50; display: flex; flex-direction: column; gap: 2px; min-width: 160px; max-width: calc(100vw - 16px); max-height: min(320px, calc(100vh - 16px)); overflow: auto; padding: 4px; border: 1px solid ${Z(C,60)}; border-radius: 12px; background: ${MT}; color: ${t}; box-shadow: 0 8px 24px ${Z(s,12)}; }
.oc-sdk-popup-search { flex: 0 0 auto; padding: 2px 2px 4px; }
.oc-sdk-popup-search .oc-sdk-input { height: 32px; font-size: 0.8125rem; }
.oc-sdk-option { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 8px; font-size: 0.8125rem; text-align: left; }
.oc-sdk-option[data-active="true"] { background: ${L}; }
.oc-sdk-option[aria-selected="true"] { background: ${dT}; color: ${gT}; }
.oc-sdk-option[data-destructive="true"] { color: ${vT}; }
.oc-sdk-option[data-destructive="true"][data-active="true"] { background: ${Z(Y("status-error","red"),10)}; }
.oc-sdk-option-label { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-option-hint { flex: 0 0 auto; font-size: 0.75rem; color: ${Q}; }
.oc-sdk-option-check { flex: 0 0 auto; width: 12px; }
.oc-sdk-popup-empty { padding: 8px; font-size: 0.8125rem; color: ${Q}; }

.oc-sdk-check { display: inline-flex; align-items: flex-start; gap: 8px; width: 100%; text-align: left; }
.oc-sdk-check-box { flex: 0 0 auto; display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; margin-top: 3px; border: 1px solid ${C}; border-radius: 4px; color: ${K}; transition: border-color 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box { border-color: ${Z(K,65,C)}; }
.oc-sdk-check-box > svg { display: none; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-box > svg { display: block; }
.oc-sdk-check-thumb { flex: 0 0 auto; position: relative; width: 36px; height: 20px; border-radius: 9999px; background: ${C}; transition: background 150ms ease-out; }
.oc-sdk-check-thumb::after { content: ""; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px; border-radius: 9999px; background: ${q}; transition: transform 150ms ease-out; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb { background: ${K}; }
.oc-sdk-check[aria-checked="true"] .oc-sdk-check-thumb::after { transform: translateX(16px); }
.oc-sdk-check:focus-visible { box-shadow: none; }
.oc-sdk-check:focus-visible .oc-sdk-check-box, .oc-sdk-check:focus-visible .oc-sdk-check-thumb { ${ZS} }
.oc-sdk-check-text { display: flex; flex-direction: column; min-width: 0; }
.oc-sdk-check-label { font-size: 0.875rem; }
.oc-sdk-check-desc { font-size: 0.75rem; color: ${Q}; }

.oc-sdk-tabs { display: inline-flex; gap: 2px; padding: 2px; border-radius: 10px; max-width: 100%; overflow: auto; }
.oc-sdk-tabs[data-track="true"] { background: ${Z(s,4)}; }
.oc-sdk-tab { display: inline-flex; align-items: center; gap: 6px; height: 28px; padding: 0 10px; border: 1px solid transparent; border-radius: 8px; font-size: 0.8125rem; font-weight: 500; color: ${Q}; white-space: nowrap; transition: color 150ms ease-out, background 150ms ease-out; }
.oc-sdk-tab:hover { color: ${s}; }
.oc-sdk-tab[aria-selected="true"] { color: ${gT}; background: ${dT}; border-color: ${C}; }
.oc-sdk-tab-count { font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${Q}; }

.oc-sdk-badge { display: inline-flex; align-items: center; padding: 1px 6px; border-radius: 9999px; font-size: 11px; font-weight: 500; line-height: 16px; white-space: nowrap; background: ${L}; color: ${Q}; }
.oc-sdk-badge[data-tone] { color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); background: ${Z("var(--oc-sdk-tone)",15)}; }

.oc-sdk-list { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.oc-sdk-row { display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px; border-radius: 6px; text-align: left; transition: background 120ms ease-out; }
.oc-sdk-row:hover, .oc-sdk-row[data-active="true"] { background: ${L}; }
.oc-sdk-row[aria-selected="true"] { background: ${dT}; color: ${gT}; }
.oc-sdk-row-lead { flex: 0 0 auto; width: 64px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ${lT}; font-size: 0.75rem; color: ${Q}; }
.oc-sdk-row-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
.oc-sdk-row-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.oc-sdk-row-sub { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 0.75rem; color: ${Q}; }
.oc-sdk-row-meta { flex: 0 0 auto; font-size: 0.75rem; font-variant-numeric: tabular-nums; color: ${Q}; }
.oc-sdk-row[aria-selected="true"] .oc-sdk-row-lead, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-sub, .oc-sdk-row[aria-selected="true"] .oc-sdk-row-meta { color: inherit; opacity: .75; }
.oc-sdk-list-empty { padding: 16px 8px; text-align: center; font-size: 0.8125rem; color: ${Q}; }

.oc-sdk-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding: 40px 16px; text-align: center; }
.oc-sdk-empty-title { margin: 0; font-size: 0.8125rem; font-weight: 600; }
.oc-sdk-empty-body { margin: 0; max-width: 32rem; font-size: 0.8125rem; color: ${Q}; }
.oc-sdk-empty-action { margin-top: 12px; }

@keyframes oc-sdk-spin { to { transform: rotate(360deg); } }
.oc-sdk-spinner { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: ${Q}; }
.oc-sdk-spinner-ring { width: 16px; height: 16px; border: 2px solid ${C}; border-top-color: ${K}; border-radius: 9999px; animation: oc-sdk-spin .8s linear infinite; }
.oc-sdk-spinner[data-size="sm"] .oc-sdk-spinner-ring { width: 12px; height: 12px; }

.oc-sdk-banner { display: flex; align-items: flex-start; gap: 12px; padding: 8px 12px; border: 1px solid ${Z("var(--oc-sdk-tone)",40)}; border-radius: 8px; background: ${Z("var(--oc-sdk-tone)",10)}; }
.oc-sdk-banner-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.oc-sdk-banner-title { font-size: 0.8125rem; font-weight: 500; color: var(--oc-sdk-tone-text, var(--oc-sdk-tone)); }
.oc-sdk-banner-body { font-size: 0.8125rem; color: ${Q}; }
.oc-sdk-banner-action { flex: 0 0 auto; }

.oc-sdk-separator { display: flex; align-items: center; gap: 8px; width: 100%; margin: 8px 0; font-size: 0.75rem; color: ${Q}; }
.oc-sdk-separator::before, .oc-sdk-separator::after { content: ""; flex: 1 1 auto; height: 1px; background: ${Z(C,40)}; }
.oc-sdk-separator[data-labeled="false"]::after { display: none; }
.oc-sdk-popup > .oc-sdk-separator { margin: 4px 0; }

.oc-sdk-progress { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.oc-sdk-progress-label { display: flex; justify-content: space-between; font-size: 0.75rem; color: ${Q}; font-variant-numeric: tabular-nums; }
.oc-sdk-progress-track { height: 6px; border-radius: 9999px; background: ${C}; overflow: hidden; }
.oc-sdk-progress-fill { height: 100%; border-radius: 9999px; background: var(--oc-sdk-tone, ${K}); transform-origin: left; transition: transform 200ms ease-out; }

.oc-sdk-menu { position: relative; display: inline-flex; }

.oc-sdk-text { white-space: pre-wrap; overflow-wrap: anywhere; }
.oc-sdk-text a { color: ${pT}; text-decoration: underline; text-underline-offset: 2px; }
.oc-sdk-text img { display: block; max-width: 100%; margin: 8px 0; border-radius: 8px; border: 1px solid ${Z(C,60)}; }
`;var WS=qT(),cS=WS.onReady((T)=>{yT(T,document.documentElement)});window.addEventListener("unload",()=>{cS(),WS.dispose()},{once:!0});})();
