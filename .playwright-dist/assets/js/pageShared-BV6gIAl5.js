import{b as f,j as a}from"./react-core-DNL0QBtm.js";import{u as L}from"./react-router-CnQmt2AB.js";import{a as b}from"./WaselLogo-DqKHGFh4.js";import{bg as I,u as A,j as E,k as g,m as P,q as T,n as y,bh as j,R as _,a0 as W,$ as R}from"./index-Dey87KqN.js";import{a as D}from"./shared-ui-BVTtN3rd.js";import{r as O}from"./translations-CHuc5ukd.js";import{c as H}from"./icons-CIqh2VK0.js";const z={bg:"var(--ds-page)",card:"var(--wasel-panel-strong)",card2:"var(--wasel-service-card-2)",card3:"var(--wasel-service-card-3)",border:"var(--ds-border)",cyan:"var(--ds-accent)",blue:"var(--ds-accent-strong)",green:"var(--ds-accent-strong)",gold:"var(--ds-accent-strong)",red:"var(--wasel-brand-hover)",text:"var(--ds-text)",sub:"var(--ds-text-muted)",muted:"var(--ds-text-soft)",F:I,FD:"var(--wasel-font-display, 'Montserrat', 'Cairo', 'Tajawal', sans-serif)",gradC:"var(--theme-gradient-primary)",gradG:"var(--theme-gradient-primary)",shadowCard:"var(--wasel-shadow-lg)"};function o(e,s){return O(s[e])}const h=z,U=(e=12)=>`${e}px`,K=e=>({display:"inline-flex",alignItems:"center",gap:4,padding:"4px 11px",borderRadius:"999px",background:`${e}16`,border:`1px solid ${e}30`,fontSize:"0.68rem",fontWeight:800,color:e,transition:"box-shadow 0.18s ease"}),V=W;function Q(e){return R(e)}function X(e,s){return{lat:(e.lat+s.lat)/2,lng:(e.lng+s.lng)/2}}const d={checkingAccessBody:{ar:"نحمّل حساب واصل ونعيد استعادة جلستك.",en:"Loading your Wasel account and restoring your session."},checkingAccessTitle:{ar:"جارٍ التحقق من الوصول",en:"Checking access"},clearPath:{ar:"مسار واضح",en:"Clear path"},pageBriefHint:{ar:"اجعل الخطوة التالية واضحة.",en:"Keep the next action obvious."},pageBriefLabel:{ar:"ملخص الصفحة",en:"Page brief"},pageEyebrow:{ar:"صفحة واصل",en:"Wasel page"},signInBody:{ar:"سجّل الدخول للمتابعة داخل شبكة خدمات واصل.",en:"Sign in to continue with rides and packages."},signInButton:{ar:"تسجيل الدخول",en:"Sign in"},signInTitle:{ar:"تسجيل الدخول مطلوب",en:"Sign in required"}};function Z({children:e}){const{user:s,loading:r}=A(),{user:i,session:c,loading:n,isBackendConnected:p}=E(),{language:t}=g(),m=P(),l=L(),u=f.useRef(!0),{enableLocalAuth:w}=T(),x=w?s??c?.user??i:c?.user??i,v=w?r:p?n:r,N=o(t,d.checkingAccessTitle),k=o(t,d.checkingAccessBody),S=o(t,d.signInTitle),C=o(t,d.signInBody),B=o(t,d.signInButton);return f.useEffect(()=>(u.current=!0,()=>{u.current=!1}),[]),f.useEffect(()=>{!v&&!x&&u.current&&m(y("signin",j(l.pathname,l.search,l.hash)))},[v,l.hash,l.pathname,l.search,m,x]),v?a.jsx("div",{className:"wasel-auth-guard",children:a.jsxs("div",{"aria-live":"polite",className:"wasel-auth-guard__panel",role:"status",children:[a.jsx("div",{className:"wasel-auth-guard__logo",children:a.jsx(b,{size:38,variant:"full",showWordmark:!1})}),a.jsx("div",{className:"wasel-auth-guard__icon",children:"W"}),a.jsx("div",{className:"wasel-auth-guard__title",children:N}),a.jsx("div",{className:"wasel-auth-guard__body",children:k})]})}):x?a.jsx(a.Fragment,{children:e}):a.jsx("div",{className:"wasel-auth-guard",children:a.jsxs("div",{"aria-live":"polite",className:"wasel-auth-guard__panel",role:"status",children:[a.jsx("div",{className:"wasel-auth-guard__logo",children:a.jsx(b,{size:38,variant:"full",showWordmark:!1})}),a.jsx("div",{className:"wasel-auth-guard__icon wasel-auth-guard__icon--shield",children:a.jsx(H,{size:24})}),a.jsx("div",{className:"wasel-auth-guard__title",children:S}),a.jsx("div",{className:"wasel-auth-guard__body wasel-auth-guard__body--spaced",children:C}),a.jsx(_,{type:"button",onClick:()=>m(y("signin",j(l.pathname,l.search,l.hash))),children:B})]})})}function aa({children:e}){const{language:s}=g(),r=s==="ar";return a.jsxs("div",{className:"wasel-page-shell-root",dir:r?"rtl":"ltr",style:{minHeight:"100vh",background:"var(--wasel-shell-background)",color:"var(--wasel-copy-primary)",fontFamily:h.F,position:"relative",overflow:"hidden"},children:[a.jsx("style",{children:`${D}
        :root { color-scheme: inherit; }
        .w-focus:focus-visible { outline: none; box-shadow: var(--wasel-focus-ring); }
        .w-hover { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .w-hover:hover { transform: translateY(-2px); }
        @media (max-width: 1140px) {
          .sp-2col,
          .sp-profile-hero,
          .sp-profile-grid { grid-template-columns: 1fr !important; }
          .sp-3col { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .sp-4col { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .sp-head-inner { align-items: flex-start !important; }
        }
        @media (max-width: 899px) {
          .sp-inner { padding: 18px 14px 36px !important; }
          .sp-2col,
          .sp-3col,
          .sp-search-grid,
          .sp-summary-grid,
          .sp-bus-card-grid,
          .pkg-send-form-grid,
          .pkg-send-steps-grid,
          .sp-clarity-grid { grid-template-columns: 1fr !important; }
          .sp-4col { grid-template-columns: 1fr 1fr !important; }
          .sp-head { padding: 20px 18px !important; border-radius: 22px !important; }
          .sp-head-inner,
          .sp-brief,
          .sp-results-header,
          .sp-modal-price,
          .sp-modal-route { flex-direction: column !important; align-items: flex-start !important; }
          .sp-brief { display: grid !important; grid-template-columns: 1fr !important; }
          .sp-brief-label {
            border-right: none !important;
            border-left: none !important;
            border-bottom: 1px solid rgba(var(--wasel-border-rgb), 0.16) !important;
            padding-right: 0 !important;
            padding-left: 0 !important;
            padding-bottom: 10px !important;
          }
          .sp-sort-bar { overflow-x: auto !important; flex-wrap: nowrap !important; padding-bottom: 6px !important; scrollbar-width: none !important; }
          .sp-sort-bar::-webkit-scrollbar { display: none; }
          .sp-sort-btn { flex-shrink: 0 !important; white-space: nowrap !important; }
          .sp-side-column { position: static !important; }
        }
        @media (max-width: 640px) {
          .sp-4col { grid-template-columns: 1fr !important; }
          .sp-head-btn { width: 100% !important; display: flex !important; justify-content: center !important; }
          .sp-frame { padding: 18px !important; border-radius: 24px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `}),a.jsx("div",{"aria-hidden":"true",style:{position:"absolute",inset:0,background:"radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--ds-accent-strong) 18%, transparent), transparent 24%), radial-gradient(circle at 88% 14%, color-mix(in srgb, var(--ds-warning) 12%, transparent), transparent 18%), radial-gradient(circle at 52% 92%, color-mix(in srgb, var(--ds-success) 10%, transparent), transparent 22%)",pointerEvents:"none",opacity:.96}}),a.jsxs("div",{className:"sp-inner wasel-page-shell",style:{position:"relative",maxWidth:1380,margin:"0 auto",padding:"28px 20px 84px"},children:[a.jsx("div",{className:"wasel-page-shell__glow","aria-hidden":"true"}),a.jsxs("div",{className:"sp-frame wasel-page-frame",children:[a.jsx("div",{className:"wasel-page-frame__top-line","aria-hidden":"true"}),a.jsx("div",{className:"wasel-page-frame__top-wash","aria-hidden":"true"}),a.jsx("div",{className:"wasel-page-stack",children:e})]})]})]})}function ea({emoji:e,title:s,titleAr:r,sub:i,color:c=h.cyan,action:n}){const{language:p}=g(),t=o(p,d.pageEyebrow),m={"--wasel-section-tone":c};return a.jsx("div",{className:"sp-head wasel-section-head",style:m,children:a.jsxs("div",{className:"sp-head-inner wasel-section-head__inner",children:[a.jsxs("div",{className:"wasel-section-head__intro",children:[a.jsx("div",{"aria-hidden":"true",className:"wasel-section-head__icon",children:e}),a.jsxs("div",{children:[a.jsx("div",{className:"wasel-section-head__eyebrow",children:t}),a.jsx("h1",{className:"wasel-section-head__title",children:p==="ar"&&r?r:s}),i?a.jsx("div",{className:"wasel-section-head__sub",children:i}):null]})]}),n?a.jsx(_,{type:"button",onClick:n.onClick,className:"sp-head-btn",children:n.label}):null]})})}function sa({title:e,detail:s,tone:r=h.cyan}){const{language:i}=g(),c=o(i,d.pageBriefLabel),n=o(i,d.pageBriefHint),p={"--wasel-section-tone":r};return a.jsxs("div",{className:"sp-brief wasel-page-brief",style:p,children:[a.jsxs("div",{className:"sp-brief-label wasel-page-brief__label",children:[a.jsx("div",{className:"wasel-micro-label",children:c}),a.jsx("div",{className:"wasel-copy-subtle",children:n})]}),a.jsxs("div",{className:"wasel-page-brief__copy",children:[a.jsx("div",{className:"wasel-heading-sm",children:e}),a.jsx("div",{className:"wasel-copy-body",style:{maxWidth:820},children:s})]})]})}function ra({title:e,detail:s,items:r,tone:i=h.cyan}){const{language:c}=g(),n=o(c,d.clearPath),p={"--wasel-section-tone":i};return a.jsxs("div",{className:"wasel-clarity-band",style:p,children:[a.jsxs("div",{children:[a.jsx("div",{className:"wasel-micro-label",style:{marginBottom:6},children:n}),a.jsx("div",{className:"wasel-heading-sm",style:{marginBottom:4},children:e}),a.jsx("div",{className:"wasel-copy-subtle",style:{maxWidth:760},children:s})]}),a.jsx("div",{className:"sp-clarity-grid wasel-clarity-grid",children:r.map((t,m)=>a.jsxs("div",{className:"wasel-clarity-item",children:[a.jsx("div",{className:"wasel-clarity-item__index",children:m+1}),a.jsxs("div",{children:[a.jsx("div",{className:"wasel-clarity-item__label",children:t.label}),a.jsx("div",{className:"wasel-clarity-item__value",children:t.value})]})]},t.label))})]})}export{sa as C,h as D,aa as P,ea as S,Z as a,U as b,ra as c,V as d,z as e,o as g,X as m,K as p,Q as r};
