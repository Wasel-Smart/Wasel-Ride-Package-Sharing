import{b as g,j as a}from"./react-core-DNL0QBtm.js";import{u as ge}from"./feature-mobility-aarb09d5.js";import{d as ce}from"./domain-mobility-CZ1Qq9Hv.js";import"./domain-auth-CMcsj6Gd.js";import"./supabase-core-BViE_X_7.js";import"./supabase-postgrest-C4rBWbCx.js";import"./supabase-realtime-DT9zNtKT.js";import"./supabase-storage-CI7dLUiR.js";import"./supabase-auth-B6aeF5KH.js";import"./otel-api-BErZ_VAT.js";import"./otel-sdk-Cfa6rYyw.js";import"./sentry-core-Bf_CinDQ.js";import"./validation-DGGRSYbU.js";const v=720,L=560,W=.42,me="#F5EFE7",T="rgba(245, 239, 231, 0.34)",D="#F59A2C",U="rgba(245, 154, 44, 0.3)",Q=28,he=120,xe=150,O=[{id:"amman",label:"Amman",labelAr:"عمّان",lat:31.9454,lon:35.9284,tier:1,featured:!0},{id:"aqaba",label:"Aqaba",labelAr:"العقبة",lat:29.532,lon:35.0063,tier:1},{id:"irbid",label:"Irbid",labelAr:"إربد",lat:32.5556,lon:35.85,tier:1},{id:"zarqa",label:"Zarqa",labelAr:"الزرقاء",lat:32.0728,lon:36.088,tier:1},{id:"mafraq",label:"Mafraq",labelAr:"المفرق",lat:32.3406,lon:36.208,tier:2},{id:"jerash",label:"Jerash",labelAr:"جرش",lat:32.2803,lon:35.8993,tier:2,featured:!0},{id:"ajloun",label:"Ajloun",labelAr:"عجلون",lat:32.3326,lon:35.7519,tier:2},{id:"salt",label:"Salt",labelAr:"السلط",lat:32.0392,lon:35.7272,tier:2},{id:"madaba",label:"Madaba",labelAr:"مادبا",lat:31.7197,lon:35.7936,tier:2},{id:"karak",label:"Karak",labelAr:"الكرك",lat:31.1853,lon:35.7048,tier:2},{id:"tafila",label:"Tafila",labelAr:"الطفيلة",lat:30.8375,lon:35.6042,tier:3},{id:"maan",label:"Ma'an",labelAr:"معان",lat:30.1962,lon:35.736,tier:3}],fe=[{id:"amman-aqaba",from:"amman",to:"aqaba",distanceKm:335,passengerFlow:88,packageFlow:54,highlighted:!0},{id:"amman-irbid",from:"amman",to:"irbid",distanceKm:85,passengerFlow:74,packageFlow:32},{id:"amman-zarqa",from:"amman",to:"zarqa",distanceKm:25,passengerFlow:84,packageFlow:40},{id:"zarqa-mafraq",from:"zarqa",to:"mafraq",distanceKm:55,passengerFlow:52,packageFlow:38},{id:"amman-jerash",from:"amman",to:"jerash",distanceKm:48,passengerFlow:96,packageFlow:34,highlighted:!0},{id:"irbid-ajloun",from:"irbid",to:"ajloun",distanceKm:30,passengerFlow:42,packageFlow:20},{id:"amman-madaba",from:"amman",to:"madaba",distanceKm:33,passengerFlow:55,packageFlow:26},{id:"madaba-karak",from:"madaba",to:"karak",distanceKm:111,passengerFlow:48,packageFlow:28},{id:"karak-tafila",from:"karak",to:"tafila",distanceKm:74,passengerFlow:36,packageFlow:22},{id:"tafila-maan",from:"tafila",to:"maan",distanceKm:89,passengerFlow:32,packageFlow:18},{id:"maan-aqaba",from:"maan",to:"aqaba",distanceKm:114,passengerFlow:44,packageFlow:30},{id:"irbid-zarqa",from:"irbid",to:"zarqa",distanceKm:79,passengerFlow:46,packageFlow:18},{id:"amman-salt",from:"amman",to:"salt",distanceKm:32,passengerFlow:40,packageFlow:16},{id:"salt-jerash",from:"salt",to:"jerash",distanceKm:38,passengerFlow:26,packageFlow:14},{id:"ajloun-jerash",from:"ajloun",to:"jerash",distanceKm:24,passengerFlow:24,packageFlow:12}],be=[{lat:33.37,lon:35.55},{lat:32.58,lon:36.42},{lat:31.24,lon:37.12},{lat:29.62,lon:36.22},{lat:29.2,lon:35.03},{lat:31.2,lon:35.5},{lat:32.56,lon:35.55}],ue=[{x:112,y:78,r:1.6,opacity:.34},{x:178,y:108,r:1.1,opacity:.26},{x:268,y:62,r:1.4,opacity:.32},{x:334,y:96,r:1.2,opacity:.22},{x:446,y:72,r:1.5,opacity:.31},{x:528,y:122,r:1.2,opacity:.2},{x:596,y:88,r:1.9,opacity:.28},{x:622,y:154,r:1.2,opacity:.24},{x:654,y:112,r:1.1,opacity:.22}],ye={amman:{dx:18,dy:-20,anchor:"start"},aqaba:{dx:-18,dy:-20,anchor:"end"},irbid:{dx:18,dy:-18,anchor:"start"},zarqa:{dx:16,dy:24,anchor:"start"},jerash:{dx:-18,dy:-22,anchor:"end"},mafraq:{dx:-18,dy:-22,anchor:"end"},karak:{dx:16,dy:-20,anchor:"start"}},H={en:{mapLabel:"Jordan mobility simulation",passengerLegend:"Ride flow",packageLegend:"Package flow",networkLegend:"Same Mobility OS routes",srDescription:"Animated mobility map of Jordan showing rides and packages moving across the same Wasel network corridors as Mobility OS.",heroEyebrow:"Live orchestration layer",heroTitle:"Jordan network twin",heroBody:"A cinematic landing map for Mobility OS showing live fleet signals, route pressure, and corridor reuse across the country.",telemetryTitle:"Network pulse",topCorridor:"Top corridor",dispatchAction:"Dispatch action",utilization:"Utilization",congestion:"Congestion",activeFleet:"Active fleet",avgSpeed:"Avg speed",liveFeed:"Live feed",previewMode:"Preview mode",citiesMapped:"cities mapped",corridorsSynced:"corridors synced",freshPings:"fresh pings",hotCorridors:"Hot corridors",routeHealth:"Route health",updated:"Updated",awaitingSync:"Awaiting sync",rideDetail:"Network-wide ride pressure",packageDetail:"Network-wide package pressure",movements:"movements",dispatchFallback:"Rebalance demand around Amman and fan spare capacity north.",overlayOne:"Mobility OS live movement",overlayTwo:"Rides and packages share the same corridors",overlayThree:"Designed as a real-time landing twin",kmh:"km/h"},ar:{mapLabel:"محاكاة الحركة في الأردن",passengerLegend:"حركة الرحلات",packageLegend:"حركة الطرود",networkLegend:"نفس مسارات Mobility OS",srDescription:"خريطة حركة متحركة للأردن تعرض الرحلات والطرود وهي تتحرك على نفس شبكة المسارات المستخدمة داخل Mobility OS.",heroEyebrow:"طبقة تشغيل حية",heroTitle:"التوأم الحي لشبكة الأردن",heroBody:"خريطة هبوط سينمائية لـ Mobility OS تعرض إشارات الأسطول الحية وضغط المسارات وإعادة استخدام الممرات على مستوى المملكة.",telemetryTitle:"نبض الشبكة",topCorridor:"المسار الأبرز",dispatchAction:"إجراء تشغيلي",utilization:"الاستغلال",congestion:"الازدحام",activeFleet:"الأسطول النشط",avgSpeed:"متوسط السرعة",liveFeed:"تغذية حية",previewMode:"وضع المعاينة",citiesMapped:"مدن على الخريطة",corridorsSynced:"مسارات متزامنة",freshPings:"إشارات حديثة",hotCorridors:"المسارات الساخنة",routeHealth:"صحة المسار",updated:"آخر تحديث",awaitingSync:"بانتظار التحديث",rideDetail:"ضغط الرحلات على مستوى الشبكة",packageDetail:"ضغط الطرود على مستوى الشبكة",movements:"حركة",dispatchFallback:"وازن الطلب حول عمّان وادفع السعة الاحتياطية نحو الشمال.",overlayOne:"حركة Mobility OS الحية",overlayTwo:"الرحلات والطرود على نفس الممرات",overlayThree:"مصممة كتوأم هبوط حي",kmh:"كم/س"}},we=new Set(["amman","aqaba","irbid","zarqa","jerash","mafraq","karak"]),J=new Map(O.map(t=>[t.id,t]));function K(t){return Math.log(Math.tan(Math.PI/4+t*Math.PI/360))}const C=O.reduce((t,o)=>({minLat:Math.min(t.minLat,o.lat),maxLat:Math.max(t.maxLat,o.lat),minLon:Math.min(t.minLon,o.lon),maxLon:Math.max(t.maxLon,o.lon)}),{minLat:1/0,maxLat:-1/0,minLon:1/0,maxLon:-1/0});function R(t,o){const s=v*.14,l=L*.12,p=s+(o-C.minLon)/(C.maxLon-C.minLon||1)*(v-s*2),n=K(C.minLat),h=K(C.maxLat),u=l+(1-(K(t)-n)/(h-n||1))*(L-l*2);return{x:p,y:u}}function ke(t,o,s,l){const p=o.x-t.x,n=o.y-t.y,h=Math.max(1,Math.hypot(p,n)),u=l%2===0?1:-1,m=Math.min(42,12+s*10+l%5*2.4)*u;return{x:(t.x+o.x)/2-n/h*m,y:(t.y+o.y)/2+p/h*m}}function N(t,o,s,l){const p=1-l;return{x:p*p*t.x+2*p*l*o.x+l*l*s.x,y:p*p*t.y+2*p*l*o.y+l*l*s.y}}function je(t,o,s){return`M ${t.x} ${t.y} Q ${o.x} ${o.y} ${s.x} ${s.y}`}function q(t,o){return o?t.labelAr:t.label}function M(t,o,s){return Math.min(s,Math.max(o,t))}function ee(t){return M(t/xe,0,.98)}function Fe(t,o,s){const l=Math.abs(t-o)/260;return 14+t/118+o/244+s*1.08+l}function ve(t){const o=ee(t),s=he*(1-o),l=1-o**1.42*.42;return Math.max(18,s*l)}function Me(t){const o=ee(t);return M(.08+o**1.2*.9,.08,.98)}function Ce(t){const o=t.flatMap(s=>{const l=Math.max(1,Math.round((s.passengerFlow+s.packageFlow)/36));return Array.from({length:l},()=>s)});return Array.from({length:Q},(s,l)=>{const p=o[l%o.length]??t[l%t.length],n=Math.max(p.passengerFlow+p.packageFlow,1),h=p.passengerFlow/n,u=l*17%10/10<h;return{id:`landing-vehicle-${l}`,routeId:p.id,type:u?"passenger":"package",progress:l*.137%1,direction:l%4===0?-1:1,speedFactor:.82+l%7*.05,passengers:u?1+l%4:void 0,seatCapacity:u?4:void 0,packageCapacity:u?void 0:14+l%6,packageLoad:u?void 0:5+l%5}})}function Le(t,o,s){const l=Math.max(t.passengerFlow,o?.passengerFlow??0),p=Math.max(t.packageFlow,o?.packageFlow??0),n=o?.density??Fe(l,p,s);return{...t,passengerFlow:l,packageFlow:p,density:n,speedKph:o?.speedKph??ve(n),congestion:o?.congestion??Me(n)}}function $e(t,o){const s="from"in t?t.from:t.fromId,l="to"in t?t.to:t.toId,p=s?J.get(s):void 0,n=l?J.get(l):void 0;return!p||!n?o?"ممر غير معروف":"Unknown corridor":`${q(p,o)} - ${q(n,o)}`}function j(t,o){return new Intl.NumberFormat(o?"ar-JO":"en-US",{notation:t>=1e3?"compact":"standard",maximumFractionDigits:t>=1e3?1:0}).format(Math.round(t))}function A(t,o){return`${new Intl.NumberFormat(o?"ar-JO":"en-US",{maximumFractionDigits:0}).format(Math.round(M(t,0,1)*100))}%`}function Y(t,o,s){return`${new Intl.NumberFormat(o?"ar-JO":"en-US",{maximumFractionDigits:t<40?1:0}).format(Number.isFinite(t)?t:0)} ${s}`}function Se(t,o,s){if(!t)return s;const l=new Date(t);return Number.isNaN(l.getTime())?s:new Intl.DateTimeFormat(o?"ar-JO":"en-US",{hour:"numeric",minute:"2-digit",month:"short",day:"numeric"}).format(l)}function Z(t,o){return t.length*o*.62+18}function X(t){return t.passengerFlow+t.packageFlow+(t.congestion??0)*48+(t.highlighted?24:0)}function Ne(t){return t*180/Math.PI}function _e({ar:t=!1,variant:o="full"}){const{snapshot:s}=ge(t),[l,p]=g.useState(0),n=t?H.ar:H.en,h=g.useId().replace(/:/g,""),u=o==="ambient",m=g.useMemo(()=>({clip:`${h}-landing-clip`,sky:`${h}-landing-sky`,stage:`${h}-landing-stage`,land:`${h}-landing-land`,landEdge:`${h}-landing-land-edge`,ride:`${h}-landing-ride`,package:`${h}-landing-package`,cityWash:`${h}-landing-city-wash`,scan:`${h}-landing-scan`}),[h]);g.useEffect(()=>{if(typeof window>"u"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;let i=0;const r=performance.now(),d=f=>{p(f-r),i=window.requestAnimationFrame(d)};return i=window.requestAnimationFrame(d),()=>window.cancelAnimationFrame(i)},[]);const I=g.useMemo(()=>O.map(e=>({...e,point:R(e.lat,e.lon)})),[]),z=g.useMemo(()=>new Map(I.map(e=>[e.id,e])),[I]),_=g.useMemo(()=>new Map((s?.routes??[]).map(e=>[e.routeId,e])),[s?.routes]),$=g.useMemo(()=>fe.map((e,i)=>Le(e,_.get(e.id),i)),[_]),S=g.useMemo(()=>be.map((e,i)=>{const r=R(e.lat,e.lon);return`${i===0?"M":"L"} ${r.x} ${r.y}`}).join(" "),[]),x=g.useMemo(()=>$.map((e,i)=>{const r=z.get(e.from)?.point??{x:0,y:0},d=z.get(e.to)?.point??{x:0,y:0},f=(e.passengerFlow+e.packageFlow)/120,b=ke(r,d,f,i+2);return{...e,fromId:e.from,toId:e.to,from:r,to:d,control:b,path:je(r,b,d)}}),[z,$]),F=g.useMemo(()=>new Map(x.map(e=>[e.id,e])),[x]),V=g.useMemo(()=>ce()?Ce($):[],[$]),y=g.useMemo(()=>{const e=(s?.vehicles??[]).filter(d=>F.has(d.routeId)),i=Math.max(0,Q-e.length),r=V.slice(0,i);return{liveVehicles:e,syntheticVehicles:r}},[F,s?.vehicles,V]),ae=g.useMemo(()=>x.flatMap(e=>{const i=Math.max(1,Math.round(e.passengerFlow/18));return Array.from({length:i},(r,d)=>{const f=(e.speedKph??48)/Math.max(e.distanceKm,1)*W*.0038*(1.04+d*.05),b=(l*f+d/i)%1;return{id:`${e.id}-ride-${d}`,point:N(e.from,e.control,e.to,b),radius:e.highlighted?3.2:2.4}})}),[x,l]),te=g.useMemo(()=>x.flatMap(e=>{const i=Math.max(1,Math.round(e.packageFlow/12));return Array.from({length:i},(r,d)=>{const f=(e.speedKph??42)/Math.max(e.distanceKm,1)*W*.0028*(.96+d*.04),b=1-(l*f+d/i)%1;return{id:`${e.id}-pkg-${d}`,point:N(e.from,e.control,e.to,b),size:e.highlighted?5:4}})}),[x,l]),ne=g.useMemo(()=>y.syntheticVehicles.map(e=>{const i=F.get(e.routeId);if(!i)return null;const r=(l*((i.speedKph??48)/Math.max(i.distanceKm,1))*.017*W*e.speedFactor+e.progress)%1,d=e.direction===1?r:1-r;return{id:e.id,type:e.type,point:N(i.from,i.control,i.to,d)}}).filter(e=>e!==null),[F,l,y.syntheticVehicles]),P=g.useMemo(()=>y.liveVehicles.map(e=>{const i=F.get(e.routeId),r=R(e.lat,e.lng),d=i?Math.atan2(i.to.y-i.from.y,i.to.x-i.from.x):0;return{id:e.id,type:e.type,point:r,fresh:e.fresh,angle:d}}),[F,y.liveVehicles]),G=g.useMemo(()=>N({x:144,y:112},{x:584,y:128},{x:512,y:430},l*45e-6%1),[l]),B=g.useMemo(()=>P.filter(e=>e.fresh).length,[P]),E=g.useMemo(()=>{const e=Math.max(...x.map(r=>r.passengerFlow),1),i=Math.max(...x.map(r=>r.packageFlow),1);return x.slice().sort((r,d)=>X(d)-X(r)).slice(0,3).map(r=>({id:r.id,name:$e(r,t),total:j(r.passengerFlow+r.packageFlow,t),speed:Y(r.speedKph??0,t,n.kmh),congestion:A(r.congestion??0,t),passengerWidth:`${M(r.passengerFlow/e*100,18,100)}%`,packageWidth:`${M(r.packageFlow/i*100,14,100)}%`}))},[t,n.kmh,x]),c=g.useMemo(()=>{const e=x.length,i=x.reduce((w,k)=>w+k.passengerFlow,0),r=x.reduce((w,k)=>w+k.packageFlow,0),d=s?.analytics.avgSpeed??x.reduce((w,k)=>w+(k.speedKph??0),0)/Math.max(e,1),f=s?.analytics.totalVehicles??y.liveVehicles.length+y.syntheticVehicles.length,b=s?.analytics.networkUtilization??M(f/24,.06,.98),pe=s?.analytics.congestionLevel??x.reduce((w,k)=>w+(k.congestion??0),0)/Math.max(e,1);return{activeFleet:f,activePassengers:s?.analytics.activePassengers??i,activePackages:s?.analytics.activePackages??r,avgSpeed:d,networkUtilization:b,congestion:pe,liveCorridors:s?.traffic.liveCorridors??e,topCorridor:s?.analytics.topCorridor||E[0]?.name||n.awaitingSync,dispatchAction:s?.analytics.dispatchAction||n.dispatchFallback,updatedAt:s?.telemetry.latestHeartbeatAt??s?.updatedAt??null,hasRenderableLocations:!!(s?.telemetry.hasRenderableLocations||s?.routes.length||s?.vehicles.length)}},[x,E,n.awaitingSync,n.dispatchFallback,s?.analytics.activePackages,s?.analytics.activePassengers,s?.analytics.avgSpeed,s?.analytics.congestionLevel,s?.analytics.dispatchAction,s?.analytics.networkUtilization,s?.analytics.topCorridor,s?.analytics.totalVehicles,s?.routes.length,s?.telemetry.hasRenderableLocations,s?.telemetry.latestHeartbeatAt,s?.traffic.liveCorridors,s?.updatedAt,s?.vehicles.length,y.liveVehicles.length,y.syntheticVehicles.length]),se=g.useMemo(()=>Se(c.updatedAt,t,n.awaitingSync),[t,n.awaitingSync,c.updatedAt]),ie=t?[n.overlayOne,n.overlayTwo,n.overlayThree]:[n.overlayOne,n.overlayTwo,n.overlayThree],re=g.useMemo(()=>[c.hasRenderableLocations?n.liveFeed:n.previewMode,`${j(c.liveCorridors,t)} ${n.corridorsSynced}`,`${j(O.length,t)} ${n.citiesMapped}`],[t,n.citiesMapped,n.corridorsSynced,n.liveFeed,n.previewMode,c.hasRenderableLocations,c.liveCorridors]),oe=g.useMemo(()=>[{id:"fleet",label:n.activeFleet,value:j(c.activeFleet,t),detail:`${j(B,t)} ${n.freshPings}`,accent:"rgba(101, 225, 255, 0.22)",glow:"rgba(101, 225, 255, 0.18)"},{id:"speed",label:n.avgSpeed,value:Y(c.avgSpeed,t,n.kmh),detail:`${n.topCorridor}: ${c.topCorridor}`,accent:"rgba(255, 179, 87, 0.22)",glow:"rgba(245, 154, 44, 0.18)"},{id:"rides",label:n.passengerLegend,value:j(c.activePassengers,t),detail:n.rideDetail,accent:"rgba(245, 239, 231, 0.18)",glow:"rgba(245, 239, 231, 0.14)"},{id:"packages",label:n.packageLegend,value:j(c.activePackages,t),detail:n.packageDetail,accent:"rgba(245, 154, 44, 0.2)",glow:"rgba(245, 154, 44, 0.18)"}],[t,n.activeFleet,n.avgSpeed,n.freshPings,n.kmh,n.packageDetail,n.packageLegend,n.passengerLegend,n.rideDetail,n.topCorridor,c.activeFleet,c.activePackages,c.activePassengers,c.avgSpeed,c.topCorridor,B]),le=`${Math.round(c.networkUtilization*100)}%`,de=`${Math.round(c.congestion*100)}%`;return a.jsxs("figure",{"aria-label":n.mapLabel,style:{margin:0,direction:t?"rtl":"ltr"},children:[a.jsx("style",{children:`
        .landing-sim-shell {
          position: relative;
          min-height: clamp(440px, 60vw, 720px);
          border-radius: 34px;
          overflow: hidden;
          isolation: isolate;
          border: 1px solid color-mix(in srgb, var(--wasel-service-border-strong) 88%, rgba(99, 218, 255, 0.24));
          background:
            radial-gradient(circle at 14% 14%, rgba(94, 229, 255, 0.16), transparent 28%),
            radial-gradient(circle at 86% 14%, rgba(245, 154, 44, 0.14), transparent 24%),
            radial-gradient(circle at 72% 82%, rgba(128, 222, 171, 0.09), transparent 22%),
            linear-gradient(180deg, rgba(6, 16, 28, 0.98) 0%, rgba(4, 10, 18, 0.99) 52%, rgba(3, 8, 15, 1) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.05),
            0 28px 80px rgba(2, 6, 15, 0.38),
            var(--wasel-shadow-xl);
        }
        .landing-sim-shell::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0, rgba(255,255,255,0.028) 1px, transparent 1px, transparent 44px),
            repeating-linear-gradient(90deg, rgba(255,255,255,0.02) 0, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 44px),
            linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0));
          opacity: 0.45;
          pointer-events: none;
        }
        .landing-sim-shell::after {
          content: '';
          position: absolute;
          inset: 10px;
          border-radius: 26px;
          border: 1px solid rgba(153, 237, 255, 0.12);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.025),
            inset 0 24px 80px rgba(119, 229, 255, 0.03);
          pointer-events: none;
        }
        .landing-sim-shell[data-variant='ambient'] {
          background:
            radial-gradient(circle at 16% 14%, rgba(245, 176, 65, 0.12), transparent 26%),
            radial-gradient(circle at 82% 12%, rgba(230, 126, 34, 0.08), transparent 22%),
            linear-gradient(180deg, rgba(8, 15, 24, 0.96) 0%, rgba(5, 10, 18, 0.98) 52%, rgba(3, 8, 15, 1) 100%);
        }
        .landing-sim-shell[data-variant='ambient']::before {
          opacity: 0.24;
        }
        .landing-sim-shell[data-variant='ambient']::after {
          inset: 12px;
          border-color: rgba(245, 176, 65, 0.08);
          box-shadow:
            inset 0 0 0 1px rgba(255,255,255,0.018),
            inset 0 24px 80px rgba(245, 176, 65, 0.02);
        }
        .landing-sim-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
        }
        .landing-sim-shell[data-variant='ambient'] .landing-sim-svg {
          opacity: 0.92;
          filter: saturate(0.88) brightness(0.94);
        }
        .landing-sim-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 18px;
          padding: 22px;
          z-index: 1;
          pointer-events: none;
        }
        .landing-sim-shell[data-variant='ambient'] .landing-sim-overlay,
        .landing-sim-shell[data-variant='ambient'] .landing-sim-city-label-group {
          display: none;
        }
        .landing-sim-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
        }
        .landing-sim-bottom {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
        }
        .landing-sim-panel {
          pointer-events: auto;
          border-radius: 24px;
          border: 1px solid rgba(162, 232, 255, 0.14);
          background:
            linear-gradient(180deg, rgba(8, 17, 30, 0.88), rgba(6, 12, 22, 0.76)),
            radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 48%);
          backdrop-filter: blur(18px);
          box-shadow:
            inset 0 1px 0 rgba(255,255,255,0.05),
            0 24px 60px rgba(3, 8, 15, 0.24);
        }
        .landing-sim-title-panel {
          max-width: min(460px, 100%);
          padding: 20px 22px;
        }
        .landing-sim-telemetry-panel {
          width: min(360px, 100%);
          padding: 18px 20px 20px;
        }
        .landing-sim-overline {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 12px;
          border-radius: 999px;
          background: rgba(96, 230, 255, 0.12);
          border: 1px solid rgba(96, 230, 255, 0.18);
          color: rgba(220, 247, 255, 0.9);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .landing-sim-overline-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #71f5d0;
          box-shadow: 0 0 14px rgba(113, 245, 208, 0.72);
        }
        .landing-sim-title {
          margin: 14px 0 0;
          color: #f7fcff;
          font-size: clamp(1.6rem, 1.3rem + 1vw, 2.4rem);
          line-height: 1.02;
          letter-spacing: -0.045em;
          font-weight: 800;
        }
        .landing-sim-body {
          margin: 10px 0 0;
          color: rgba(218, 238, 248, 0.82);
          font-size: 0.98rem;
          line-height: 1.55;
          max-width: 38rem;
        }
        .landing-sim-meta-row,
        .landing-sim-tag-row,
        .landing-sim-status-row,
        .landing-sim-legend-row {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }
        .landing-sim-meta-row {
          margin-top: 16px;
        }
        .landing-sim-tag-row {
          margin-top: 14px;
        }
        .landing-sim-legend-row {
          margin-top: 16px;
        }
        .landing-sim-kv,
        .landing-sim-tag,
        .landing-sim-status-chip,
        .landing-sim-legend-chip {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,0.08);
          background: rgba(6, 12, 22, 0.54);
          color: rgba(223, 241, 249, 0.84);
          font-size: 0.78rem;
          font-weight: 600;
          line-height: 1;
        }
        .landing-sim-kv strong {
          color: #f7fcff;
          font-weight: 700;
        }
        .landing-sim-legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          flex: 0 0 auto;
        }
        .landing-sim-legend-line {
          width: 16px;
          height: 2px;
          border-radius: 999px;
          background: linear-gradient(90deg, rgba(247,252,255,0.92), rgba(245,154,44,0.88));
        }
        .landing-sim-telemetry-title {
          margin: 0;
          color: rgba(189, 230, 246, 0.76);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .landing-sim-telemetry-value {
          margin: 10px 0 0;
          color: #f7fcff;
          font-size: clamp(1.2rem, 1rem + 0.55vw, 1.55rem);
          line-height: 1.16;
          letter-spacing: -0.03em;
          font-weight: 780;
        }
        .landing-sim-telemetry-copy {
          margin: 10px 0 0;
          color: rgba(221, 237, 244, 0.74);
          font-size: 0.88rem;
          line-height: 1.5;
        }
        .landing-sim-meter-group {
          margin-top: 16px;
          display: grid;
          gap: 12px;
        }
        .landing-sim-meter-label {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          color: rgba(227, 240, 247, 0.82);
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .landing-sim-meter {
          position: relative;
          height: 10px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.07);
          box-shadow: inset 0 1px 1px rgba(0,0,0,0.18);
        }
        .landing-sim-meter-fill {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
        }
        .landing-sim-stat-grid {
          flex: 1 1 auto;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .landing-sim-stat-card {
          min-width: 0;
          padding: 16px 18px;
        }
        .landing-sim-stat-label {
          color: rgba(182, 221, 235, 0.72);
          font-size: 0.74rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }
        .landing-sim-stat-value {
          margin-top: 10px;
          color: #f7fcff;
          font-size: clamp(1.1rem, 0.94rem + 0.45vw, 1.52rem);
          line-height: 1.1;
          font-weight: 780;
          letter-spacing: -0.03em;
        }
        .landing-sim-stat-detail {
          margin-top: 8px;
          color: rgba(221, 237, 244, 0.7);
          font-size: 0.82rem;
          line-height: 1.45;
        }
        .landing-sim-hotspots {
          width: min(356px, 100%);
          padding: 18px 18px 20px;
        }
        .landing-sim-hotspots-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 14px;
        }
        .landing-sim-hotspots-title {
          margin: 0;
          color: #f7fcff;
          font-size: 1rem;
          font-weight: 760;
          letter-spacing: -0.02em;
        }
        .landing-sim-hotspot-list {
          display: grid;
          gap: 12px;
        }
        .landing-sim-hotspot-item {
          padding: 14px 14px 12px;
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(5, 11, 21, 0.46);
        }
        .landing-sim-hotspot-head,
        .landing-sim-hotspot-foot {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .landing-sim-hotspot-head {
          color: #f7fcff;
          font-size: 0.88rem;
          font-weight: 700;
        }
        .landing-sim-hotspot-total {
          color: rgba(255, 214, 167, 0.92);
          font-size: 0.84rem;
          font-weight: 700;
        }
        .landing-sim-track-stack {
          margin-top: 10px;
          display: grid;
          gap: 8px;
        }
        .landing-sim-track {
          position: relative;
          height: 7px;
          border-radius: 999px;
          overflow: hidden;
          background: rgba(255,255,255,0.06);
        }
        .landing-sim-track > span {
          position: absolute;
          inset: 0 auto 0 0;
          border-radius: inherit;
        }
        .landing-sim-hotspot-foot {
          margin-top: 10px;
          color: rgba(211, 234, 243, 0.72);
          font-size: 0.76rem;
          font-weight: 600;
        }
        @media (max-width: 1080px) {
          .landing-sim-top,
          .landing-sim-bottom {
            flex-direction: column;
            align-items: stretch;
          }
          .landing-sim-title-panel,
          .landing-sim-telemetry-panel,
          .landing-sim-hotspots {
            width: auto;
            max-width: none;
          }
        }
        @media (max-width: 720px) {
          .landing-sim-shell {
            min-height: clamp(540px, 122vw, 860px);
          }
          .landing-sim-overlay {
            padding: 18px;
            gap: 16px;
          }
          .landing-sim-stat-grid {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 560px) {
          .landing-sim-shell {
            border-radius: 28px;
          }
          .landing-sim-stat-grid {
            grid-template-columns: 1fr;
          }
          .landing-sim-title-panel,
          .landing-sim-telemetry-panel,
          .landing-sim-hotspots {
            padding-inline: 16px;
          }
        }
      `}),a.jsxs("div",{className:"landing-sim-shell","data-variant":o,children:[a.jsx("span",{style:{position:"absolute",width:1,height:1,padding:0,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0},children:n.srDescription}),a.jsxs("svg",{viewBox:`0 0 ${v} ${L}`,role:"img","aria-hidden":"true",className:"landing-sim-svg",children:[a.jsxs("defs",{children:[a.jsxs("linearGradient",{id:m.sky,x1:"360",y1:"0",x2:"360",y2:"560",gradientUnits:"userSpaceOnUse",children:[a.jsx("stop",{offset:"0",stopColor:"rgba(10, 22, 38, 1)"}),a.jsx("stop",{offset:"0.44",stopColor:"rgba(6, 15, 28, 1)"}),a.jsx("stop",{offset:"1",stopColor:"rgba(2, 8, 16, 1)"})]}),a.jsxs("linearGradient",{id:m.stage,x1:"360",y1:"388",x2:"360",y2:"560",gradientUnits:"userSpaceOnUse",children:[a.jsx("stop",{offset:"0",stopColor:"rgba(14, 29, 45, 0.94)"}),a.jsx("stop",{offset:"1",stopColor:"rgba(3, 8, 15, 1)"})]}),a.jsxs("linearGradient",{id:m.land,x1:"186",y1:"78",x2:"530",y2:"510",gradientUnits:"userSpaceOnUse",children:[a.jsx("stop",{offset:"0",stopColor:"rgba(18, 44, 62, 0.98)"}),a.jsx("stop",{offset:"0.44",stopColor:"rgba(10, 28, 42, 0.98)"}),a.jsx("stop",{offset:"0.76",stopColor:"rgba(7, 19, 32, 0.98)"}),a.jsx("stop",{offset:"1",stopColor:"rgba(4, 12, 22, 0.99)"})]}),a.jsxs("linearGradient",{id:m.landEdge,x1:"168",y1:"112",x2:"558",y2:"458",gradientUnits:"userSpaceOnUse",children:[a.jsx("stop",{offset:"0",stopColor:"rgba(176, 235, 255, 0.32)"}),a.jsx("stop",{offset:"0.52",stopColor:"rgba(102, 208, 255, 0.12)"}),a.jsx("stop",{offset:"1",stopColor:"rgba(255, 182, 96, 0.22)"})]}),a.jsxs("linearGradient",{id:m.ride,x1:"92",y1:"502",x2:"548",y2:"92",gradientUnits:"userSpaceOnUse",children:[a.jsx("stop",{offset:"0",stopColor:"#F7FCFF"}),a.jsx("stop",{offset:"0.52",stopColor:me}),a.jsx("stop",{offset:"1",stopColor:"#8EE8FF"})]}),a.jsxs("linearGradient",{id:m.package,x1:"118",y1:"520",x2:"584",y2:"112",gradientUnits:"userSpaceOnUse",children:[a.jsx("stop",{offset:"0",stopColor:"#FFB357"}),a.jsx("stop",{offset:"0.46",stopColor:D}),a.jsx("stop",{offset:"1",stopColor:"#FFE8BC"})]}),a.jsxs("radialGradient",{id:m.cityWash,cx:"0",cy:"0",r:"1",gradientUnits:"userSpaceOnUse",gradientTransform:"translate(366 278) rotate(90) scale(228 270)",children:[a.jsx("stop",{stopColor:"rgba(193, 248, 255, 0.13)"}),a.jsx("stop",{offset:"0.62",stopColor:"rgba(120, 225, 255, 0.06)"}),a.jsx("stop",{offset:"1",stopColor:"rgba(120, 225, 255, 0)"})]}),a.jsxs("radialGradient",{id:m.scan,cx:"0",cy:"0",r:"1",gradientUnits:"userSpaceOnUse",gradientTransform:"translate(0.5 0.5) scale(0.5)",children:[a.jsx("stop",{stopColor:"rgba(137, 232, 255, 0.26)"}),a.jsx("stop",{offset:"0.5",stopColor:"rgba(137, 232, 255, 0.12)"}),a.jsx("stop",{offset:"1",stopColor:"rgba(137, 232, 255, 0)"})]}),a.jsx("clipPath",{id:m.clip,children:a.jsx("path",{d:S})})]}),a.jsx("rect",{x:"0",y:"0",width:v,height:L,fill:`url(#${m.sky})`}),ue.map(e=>a.jsx("circle",{cx:e.x,cy:e.y,r:e.r,fill:"rgba(244, 251, 255, 0.94)",opacity:e.opacity},`${e.x}-${e.y}`)),a.jsx("path",{d:"M 34 396 L 686 396 L 720 560 L 0 560 Z",fill:`url(#${m.stage})`}),Array.from({length:10},(e,i)=>{const r=396+((i+1)/11)**1.75*148,d=34+i*8.5;return a.jsx("path",{d:`M ${d} ${r} L ${v-d} ${r}`,stroke:"rgba(220, 255, 248, 0.055)",strokeWidth:"1"},`landing-floor-row-${i}`)}),Array.from({length:12},(e,i)=>{const r=44+i*53.5,d=222+(i-5.5)*17;return a.jsx("path",{d:`M ${r} 560 L ${d} 396`,stroke:"rgba(101, 225, 255, 0.045)",strokeWidth:"1"},`landing-floor-col-${i}`)}),a.jsx("path",{d:S,fill:"rgba(0, 0, 0, 0.18)",transform:"translate(20 30) scale(1 0.964)",opacity:"0.78"}),a.jsx("path",{d:S,fill:`url(#${m.land})`,stroke:`url(#${m.landEdge})`,strokeWidth:"1.7"}),a.jsx("path",{d:S,fill:"none",stroke:"rgba(255, 255, 255, 0.05)",strokeWidth:"13",opacity:"0.18",transform:"translate(7 10)"}),a.jsxs("g",{clipPath:`url(#${m.clip})`,children:[a.jsx("rect",{x:"0",y:"0",width:v,height:L,fill:`url(#${m.cityWash})`}),a.jsx("ellipse",{cx:G.x,cy:G.y,rx:"118",ry:"88",fill:`url(#${m.scan})`,opacity:.54+Math.sin(l*.0021)*.08}),Array.from({length:7},(e,i)=>{const r=118+i*48;return a.jsx("path",{d:`M 104 ${r} C 192 ${r-26}, 286 ${r+16}, 388 ${r-12} S 556 ${r+18}, 628 ${r-6}`,stroke:"rgba(234, 248, 255, 0.05)",strokeWidth:i%2===0?1:.8,fill:"none",opacity:.68-i*.06},`landing-contour-${i}`)}),a.jsx("path",{d:"M 128 116 C 236 92, 356 128, 472 118 C 536 112, 592 122, 644 142 L 644 228 C 556 210, 462 220, 350 212 C 240 204, 178 188, 128 168 Z",fill:"rgba(126, 233, 255, 0.05)"}),a.jsx("path",{d:"M 148 248 C 238 224, 318 248, 408 238 C 500 228, 568 238, 630 272 L 630 346 C 546 316, 458 326, 344 320 C 242 314, 178 292, 148 274 Z",fill:"rgba(245, 154, 44, 0.04)"}),a.jsx("path",{d:"M 184 152 L 222 446",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"}),a.jsx("path",{d:"M 266 96 L 316 438",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"}),a.jsx("path",{d:"M 358 88 L 414 452",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"}),a.jsx("path",{d:"M 462 118 L 520 438",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"})]}),x.map(e=>{const i=e.congestion??.12,r=e.highlighted?1.4:0,d=3.1+i*1.1+r,f=11+i*5+r*2,b=6.6+i*2.4;return a.jsxs("g",{children:[a.jsx("path",{d:e.path,fill:"none",stroke:"rgba(0, 0, 0, 0.18)",strokeWidth:f+2,strokeLinecap:"round",transform:"translate(8 12)"}),a.jsx("path",{d:e.path,fill:"none",stroke:`rgba(245, 154, 44, ${.08+i*.22})`,strokeWidth:b,strokeLinecap:"round"}),a.jsx("path",{d:e.path,fill:"none",stroke:"rgba(255,255,255,0.04)",strokeWidth:f,strokeLinecap:"round"}),a.jsx("path",{d:e.path,fill:"none",stroke:`url(#${m.ride})`,strokeWidth:d,strokeLinecap:"round",opacity:e.highlighted?1:.88,style:{filter:e.highlighted?"drop-shadow(0 0 16px rgba(111, 228, 255, 0.34))":"drop-shadow(0 0 8px rgba(111, 228, 255, 0.14))"}}),a.jsx("path",{d:e.path,fill:"none",stroke:`url(#${m.package})`,strokeWidth:2.1+r,strokeLinecap:"round",strokeDasharray:`${8+e.packageFlow/18} ${8+i*18}`,strokeDashoffset:-(l*.018*(1+i)),opacity:e.highlighted?.94:.8})]},`${e.id}-route`)}),ae.map(e=>a.jsx("circle",{cx:e.point.x,cy:e.point.y,r:e.radius,fill:"#F7FCFF",style:{filter:`drop-shadow(0 0 8px ${T})`}},e.id)),te.map(e=>a.jsx("rect",{x:e.point.x-e.size/2,y:e.point.y-e.size/2,width:e.size,height:e.size,rx:"1.4",fill:D,style:{filter:`drop-shadow(0 0 8px ${U})`},transform:`rotate(45 ${e.point.x} ${e.point.y})`},e.id)),ne.map(e=>e.type==="passenger"?a.jsx("circle",{cx:e.point.x,cy:e.point.y,r:"4.7",fill:"#F7FCFF",opacity:"0.92",style:{filter:`drop-shadow(0 0 10px ${T})`}},e.id):a.jsx("rect",{x:e.point.x-3.4,y:e.point.y-3.4,width:"6.8",height:"6.8",rx:"1.8",fill:"#F7FCFF",opacity:"0.9",style:{filter:`drop-shadow(0 0 10px ${U})`},transform:`rotate(45 ${e.point.x} ${e.point.y})`},e.id)),P.map(e=>{const i=Ne(e.angle),r=e.type==="passenger"?"rgba(247, 252, 255, 0.96)":"rgba(255, 202, 122, 0.96)";return a.jsxs("g",{transform:`translate(${e.point.x} ${e.point.y})`,children:[a.jsx("circle",{r:e.fresh?11:9.5,fill:"none",stroke:e.fresh?"rgba(171, 236, 255, 0.82)":"rgba(255,179,87,0.52)",strokeWidth:"1.3",opacity:e.fresh?.96:.72}),a.jsxs("g",{transform:`rotate(${i})`,children:[a.jsx("path",{d:"M -5.4 -2.6 L 7.4 0 L -5.4 2.6 Z",fill:r,opacity:e.fresh?.94:.74}),e.type==="passenger"?a.jsx("circle",{r:e.fresh?5.1:4.5,fill:"#FFFFFF",opacity:e.fresh?1:.78,style:{filter:`drop-shadow(0 0 12px ${T})`}}):a.jsx("rect",{x:-3.9,y:-3.9,width:"7.8",height:"7.8",rx:"1.8",fill:"#F7FCFF",opacity:e.fresh?1:.78,style:{filter:`drop-shadow(0 0 12px ${U})`},transform:"rotate(45)"})]})]},e.id)}),I.map((e,i)=>{const r=q(e,t),d=ye[e.id],f=e.featured?14.2:12.8,b=e.featured?18+(Math.sin(l*.0022+i)+1)/2*8:0;return a.jsxs("g",{children:[a.jsx("ellipse",{cx:e.point.x+7,cy:e.point.y+18,rx:e.featured?20:14,ry:e.featured?6:4.8,fill:"rgba(0, 0, 0, 0.22)"}),e.featured?a.jsxs(a.Fragment,{children:[a.jsx("circle",{cx:e.point.x,cy:e.point.y,r:"28",fill:"rgba(169, 227, 255, 0.1)"}),a.jsx("circle",{cx:e.point.x,cy:e.point.y,r:b,fill:"none",stroke:"rgba(126, 233, 255, 0.22)",strokeWidth:"1.1"})]}):null,a.jsx("line",{x1:e.point.x,y1:e.point.y-(e.featured?28:22),x2:e.point.x,y2:e.point.y-5,stroke:e.featured?"rgba(169, 227, 255, 0.42)":"rgba(247, 252, 255, 0.16)",strokeWidth:e.featured?1.8:1.2}),a.jsx("circle",{cx:e.point.x,cy:e.point.y,r:e.tier===1?6:e.tier===2?5:4.4,fill:"#F7FCFF"}),a.jsx("circle",{cx:e.point.x,cy:e.point.y,r:e.featured?12:9,fill:"none",stroke:e.featured?"rgba(169, 227, 255, 0.44)":"rgba(247, 252, 255, 0.2)"}),we.has(e.id)&&d?a.jsxs("g",{className:"landing-sim-city-label-group",children:[a.jsx("rect",{x:d.anchor==="end"?e.point.x+d.dx-Z(r,f):e.point.x+d.dx-10,y:e.point.y+d.dy-16,width:Z(r,f),height:"24",rx:"999",fill:"rgba(6, 12, 22, 0.68)",stroke:e.featured?"rgba(126, 233, 255, 0.24)":"rgba(255, 255, 255, 0.08)"}),a.jsx("text",{x:e.point.x+d.dx,y:e.point.y+d.dy,textAnchor:d.anchor,fill:e.featured?"#F7FCFF":"rgba(234, 247, 255, 0.86)",fontSize:f,fontWeight:e.featured?720:620,style:{letterSpacing:"-0.02em"},children:r})]}):null]},e.id)})]}),u?null:a.jsxs("div",{className:"landing-sim-overlay",children:[a.jsxs("div",{className:"landing-sim-top",children:[a.jsxs("div",{className:"landing-sim-panel landing-sim-title-panel",children:[a.jsxs("div",{className:"landing-sim-overline",children:[a.jsx("span",{className:"landing-sim-overline-dot"}),n.heroEyebrow]}),a.jsx("h3",{className:"landing-sim-title",children:n.heroTitle}),a.jsx("p",{className:"landing-sim-body",children:n.heroBody}),a.jsxs("div",{className:"landing-sim-meta-row",children:[a.jsxs("span",{className:"landing-sim-kv",children:[a.jsx("strong",{children:n.updated}),se]}),a.jsxs("span",{className:"landing-sim-kv",children:[a.jsx("strong",{children:n.routeHealth}),A(1-c.congestion*.58,t)]})]}),a.jsx("div",{className:"landing-sim-tag-row",children:ie.map(e=>a.jsx("span",{className:"landing-sim-tag",children:e},e))}),a.jsxs("div",{className:"landing-sim-legend-row",children:[a.jsxs("span",{className:"landing-sim-legend-chip",children:[a.jsx("span",{className:"landing-sim-legend-dot",style:{background:"#F7FCFF"}}),n.passengerLegend]}),a.jsxs("span",{className:"landing-sim-legend-chip",children:[a.jsx("span",{className:"landing-sim-legend-dot",style:{background:D}}),n.packageLegend]}),a.jsxs("span",{className:"landing-sim-legend-chip",children:[a.jsx("span",{className:"landing-sim-legend-line"}),n.networkLegend]})]})]}),a.jsxs("div",{className:"landing-sim-panel landing-sim-telemetry-panel",children:[a.jsx("p",{className:"landing-sim-telemetry-title",children:n.telemetryTitle}),a.jsx("div",{className:"landing-sim-status-row",style:{marginTop:12},children:re.map(e=>a.jsx("span",{className:"landing-sim-status-chip",children:e},e))}),a.jsx("h4",{className:"landing-sim-telemetry-value",children:c.topCorridor}),a.jsxs("p",{className:"landing-sim-telemetry-copy",children:[a.jsxs("strong",{style:{color:"#F7FCFF"},children:[n.dispatchAction,":"]})," ",c.dispatchAction]}),a.jsxs("div",{className:"landing-sim-meter-group",children:[a.jsxs("div",{children:[a.jsxs("div",{className:"landing-sim-meter-label",children:[a.jsx("span",{children:n.utilization}),a.jsx("strong",{children:A(c.networkUtilization,t)})]}),a.jsx("div",{className:"landing-sim-meter",children:a.jsx("span",{className:"landing-sim-meter-fill",style:{width:le,background:"linear-gradient(90deg, rgba(120, 232, 255, 0.82), rgba(245, 239, 231, 0.94))",boxShadow:"0 0 18px rgba(120, 232, 255, 0.28)"}})})]}),a.jsxs("div",{children:[a.jsxs("div",{className:"landing-sim-meter-label",children:[a.jsx("span",{children:n.congestion}),a.jsx("strong",{children:A(c.congestion,t)})]}),a.jsx("div",{className:"landing-sim-meter",children:a.jsx("span",{className:"landing-sim-meter-fill",style:{width:de,background:"linear-gradient(90deg, rgba(255, 179, 87, 0.82), rgba(245, 154, 44, 0.96))",boxShadow:"0 0 18px rgba(245, 154, 44, 0.24)"}})})]})]})]})]}),a.jsxs("div",{className:"landing-sim-bottom",children:[a.jsx("div",{className:"landing-sim-stat-grid",children:oe.map(e=>a.jsxs("div",{className:"landing-sim-panel landing-sim-stat-card",style:{borderColor:e.accent,boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 48px ${e.glow}`},children:[a.jsx("div",{className:"landing-sim-stat-label",children:e.label}),a.jsx("div",{className:"landing-sim-stat-value",children:e.value}),a.jsx("div",{className:"landing-sim-stat-detail",children:e.detail})]},e.id))}),a.jsxs("div",{className:"landing-sim-panel landing-sim-hotspots",children:[a.jsxs("div",{className:"landing-sim-hotspots-head",children:[a.jsx("h4",{className:"landing-sim-hotspots-title",children:n.hotCorridors}),a.jsx("span",{className:"landing-sim-kv",children:n.routeHealth})]}),a.jsx("div",{className:"landing-sim-hotspot-list",children:E.map(e=>a.jsxs("div",{className:"landing-sim-hotspot-item",children:[a.jsxs("div",{className:"landing-sim-hotspot-head",children:[a.jsx("span",{children:e.name}),a.jsxs("span",{className:"landing-sim-hotspot-total",children:[e.total," ",n.movements]})]}),a.jsxs("div",{className:"landing-sim-track-stack",children:[a.jsx("div",{className:"landing-sim-track",children:a.jsx("span",{style:{width:e.passengerWidth,background:"linear-gradient(90deg, rgba(247,252,255,0.98), rgba(151,236,255,0.92))"}})}),a.jsx("div",{className:"landing-sim-track",children:a.jsx("span",{style:{width:e.packageWidth,background:"linear-gradient(90deg, rgba(255,200,116,0.96), rgba(245,154,44,0.98))"}})})]}),a.jsxs("div",{className:"landing-sim-hotspot-foot",children:[a.jsx("span",{children:e.speed}),a.jsx("span",{children:e.congestion})]})]},e.id))})]})]})]})]})]})}export{_e as MobilityOSLandingMap};
