import{b as f,j as e}from"./react-core-DNL0QBtm.js";import{s as O}from"./index-Dey87KqN.js";import{a as Ca}from"./runtimePolicy-62LKL-vO.js";import"./react-dom-client-BJnfjULs.js";import"./react-dom-CgenQkdY.js";import"./supabase-B-jIxwbw.js";import"./validation-DGGRSYbU.js";import"./otel-RIFKmzU_.js";import"./monitoring-Bc4YW3DB.js";import"./translations-CHuc5ukd.js";import"./tanstack-react-BW5BQemJ.js";import"./tanstack-core-CvlbMX4H.js";import"./react-router-CnQmt2AB.js";import"./ui-toast-B1RTzoyE.js";import"./css-utils-Ce1ZTWB2.js";import"./radix-primitives-DVMWWKKi.js";import"./cva-CKM8ozc-.js";import"./icons-CIqh2VK0.js";import"./motion-Cvla0EDA.js";const U=[{routeId:"amman-aqaba",from:"amman",to:"aqaba",label:"Amman -> Aqaba",labelAr:"عمّان ← العقبة"},{routeId:"amman-irbid",from:"amman",to:"irbid",label:"Amman -> Irbid",labelAr:"عمّان ← إربد"},{routeId:"amman-zarqa",from:"amman",to:"zarqa",label:"Amman -> Zarqa",labelAr:"عمّان ← الزرقاء"},{routeId:"zarqa-mafraq",from:"zarqa",to:"mafraq",label:"Zarqa -> Mafraq",labelAr:"الزرقاء ← المفرق"},{routeId:"amman-jerash",from:"amman",to:"jerash",label:"Amman -> Jerash",labelAr:"عمّان ← جرش"},{routeId:"irbid-ajloun",from:"irbid",to:"ajloun",label:"Irbid -> Ajloun",labelAr:"إربد ← عجلون"},{routeId:"amman-madaba",from:"amman",to:"madaba",label:"Amman -> Madaba",labelAr:"عمّان ← مادبا"},{routeId:"madaba-karak",from:"madaba",to:"karak",label:"Madaba -> Karak",labelAr:"مادبا ← الكرك"},{routeId:"karak-tafila",from:"karak",to:"tafila",label:"Karak -> Tafila",labelAr:"الكرك ← الطفيلة"},{routeId:"tafila-maan",from:"tafila",to:"maan",label:"Tafila -> Ma'an",labelAr:"الطفيلة ← معان"},{routeId:"maan-aqaba",from:"maan",to:"aqaba",label:"Ma'an -> Aqaba",labelAr:"معان ← العقبة"},{routeId:"irbid-zarqa",from:"irbid",to:"zarqa",label:"Irbid -> Zarqa",labelAr:"إربد ← الزرقاء"},{routeId:"amman-salt",from:"amman",to:"salt",label:"Amman -> Salt",labelAr:"عمّان ← السلط"},{routeId:"salt-jerash",from:"salt",to:"jerash",label:"Salt -> Jerash",labelAr:"السلط ← جرش"},{routeId:"ajloun-jerash",from:"ajloun",to:"jerash",label:"Ajloun -> Jerash",labelAr:"عجلون ← جرش"}],Sa={amman:"amman","amman governorate":"amman",عمان:"amman",عمّان:"amman",aqaba:"aqaba",العقبة:"aqaba",irbid:"irbid",اربد:"irbid",إربد:"irbid",zarqa:"zarqa",الزرقاء:"zarqa",mafraq:"mafraq",المفرق:"mafraq",jerash:"jerash",jarash:"jerash",جرش:"jerash",ajloun:"ajloun",ajlun:"ajloun",عجلون:"ajloun",madaba:"madaba",مادبا:"madaba",karak:"karak",الكرك:"karak",tafila:"tafila",tafilah:"tafila",الطفيلة:"tafila",maan:"maan","ma'an":"maan",معان:"maan",salt:"salt",السلط:"salt"},da={amman:{lat:31.9454,lng:35.9284},aqaba:{lat:29.532,lng:35.0063},irbid:{lat:32.5556,lng:35.85},zarqa:{lat:32.0728,lng:36.088},mafraq:{lat:32.3406,lng:36.208},jerash:{lat:32.2803,lng:35.8993},ajloun:{lat:32.3326,lng:35.7519},madaba:{lat:31.7197,lng:35.7936},karak:{lat:31.1853,lng:35.7048},tafila:{lat:30.8375,lng:35.6042},maan:{lat:30.1962,lng:35.736},salt:{lat:32.0392,lng:35.7272}},La=120*1e3,ca=new Map,pa="".trim().toLowerCase()==="true";function Na(){if(!O)return!1;if(typeof window>"u")return pa;const t=window.location.hostname;return pa||!(t==="localhost"||t==="127.0.0.1")}function ga(t){const i=String(t??"").trim().toLowerCase();if(!i)return null;const n=i.replace(/[’']/g,"").replace(/\s+/g," ").replace(/-/g," ");return Sa[n]??null}function ma(t,i){const n=ga(t),r=ga(i);if(!n||!r||n===r)return null;const p=U.find(m=>m.from===n&&m.to===r);return p?p.routeId:U.find(m=>m.from===r&&m.to===n)?.routeId??null}function ha(t,i){const n=U.find(r=>r.routeId===t);return n?i?n.labelAr:n.label:t}function ua(t,i){return Math.max(0,Number(t?.active_passengers??i)||0)}function fa(t,i){return Math.max(0,Number(t?.active_packages??i)||0)}function ba(t){if(!t||typeof t!="object")return!1;const i=Number(t.lat),n=Number(t.lng??t.lon);return Number.isFinite(i)&&Number.isFinite(n)}function xa(t){if(!t)return!1;const i=new Date(t).getTime();return Number.isNaN(i)?!1:Date.now()-i<=300*1e3}function Ia(){const t="<YOUR_GOOGLE_MAPS_API_KEY>".trim();return!t||t==="your-google-maps-api-key-here"?null:t}function ya(t){if(!t)return null;const i=/^([0-9]+(?:\.[0-9]+)?)s$/.exec(t.trim());if(!i)return null;const n=Number(i[1]);return Number.isFinite(n)?n:null}async function $a(t,i,n){const r=Ia();if(!r)return null;const p=da[i],o=da[n];if(!p||!o)return null;const m=ca.get(t);if(m&&m.expiresAt>Date.now())return m.snapshot;try{const u=await fetch("https://routes.googleapis.com/directions/v2:computeRoutes",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":r,"X-Goog-FieldMask":"routes.duration,routes.staticDuration,routes.distanceMeters"},body:JSON.stringify({origin:{location:{latLng:{latitude:p.lat,longitude:p.lng}}},destination:{location:{latLng:{latitude:o.lat,longitude:o.lng}}},travelMode:"DRIVE",routingPreference:"TRAFFIC_AWARE",departureTime:new Date().toISOString()})});if(!u.ok)return null;const h=await u.json(),w=Array.isArray(h?.routes)?h.routes[0]:null,v=ya(w?.duration),_=ya(w?.staticDuration),C=Number(w?.distanceMeters??0);if(!v||C<=0)return null;const j=Math.max(18,Math.round(C/v*3.6)),y=_&&_>0?v/_:1,F=Math.max(.05,Math.min(.98,(y-1)/.65)),S={speedKph:j,congestion:F,updatedAt:new Date().toISOString()};return ca.set(t,{expiresAt:Date.now()+La,snapshot:S}),S}catch{return null}}function Ta(t,i,n,r,p){const o=Math.max(i+n,1),m=Math.max(r+p,1),u=i/o,h=r/m;return Math.max(.08,Math.min(.98,t*.12+u*.52+h*.22))}function Pa(t){return Math.max(28,Math.round(110-t*62))}function Oa(t,i){const n=U.find(p=>p.routeId===t);if(!n)return i?"مراجعة التوزيع التشغيلي":"Review operational distribution";const r=i?n.labelAr.split(" ← ")[0]:n.label.split(" -> ")[1];return i?`إعادة توجيه العرض باتجاه ${r}`:`Reposition supply toward ${r}`}async function Ea(t){if(!O)return null;const[{data:i},{data:n},{data:r},{data:p}]=await Promise.all([O.from("trips").select("trip_id, origin_city, destination_city, available_seats, total_seats, package_capacity, package_slots_remaining, departure_time, trip_status, allow_packages").is("deleted_at",null).in("trip_status",["open","booked","in_progress"]),O.from("bookings").select("trip_id, seats_requested, booking_status, status").in("booking_status",["confirmed","pending_driver"]).order("created_at",{ascending:!1}),O.from("packages").select("trip_id, origin_name, origin_location, destination_name, destination_location, package_status, status").in("package_status",["created","assigned","in_transit"]),O.from("trip_presence").select("trip_id, active_passengers, active_packages, last_location, last_heartbeat_at")]),o=Array.isArray(i)?i:[];if(o.length===0)return null;const m=Array.isArray(n)?n:[],u=Array.isArray(r)?r:[],h=Array.isArray(p)?p:[],w=new Map;m.forEach(s=>{const g=w.get(s.trip_id)??[];g.push(s),w.set(s.trip_id,g)});const v=new Map;u.forEach(s=>{if(!s.trip_id)return;const g=v.get(s.trip_id)??[];g.push(s),v.set(s.trip_id,g)});const _=new Map;h.forEach(s=>{s.trip_id&&_.set(s.trip_id,s)});const C=new Map;o.forEach(s=>{s.trip_id&&C.set(s.trip_id,s)});const j=new Map;if(o.forEach(s=>{const g=ma(s.origin_city,s.destination_city);if(!g||!s.trip_id)return;const N=U.find(ea=>ea.routeId===g);if(!N)return;const l=(w.get(s.trip_id)??[]).reduce((ea,_a)=>ea+Math.max(1,Number(_a.seats_requested??1)||1),0),c=(v.get(s.trip_id)??[]).length,x=_.get(s.trip_id),k=Math.max(0,Number(s.available_seats??0)||0),E=Math.max(k+l,Number(s.total_seats??0)||0),A=Math.max(Number(s.package_capacity??0)||0,Number(s.package_slots_remaining??0)||0),L=Math.max(0,Number(s.package_slots_remaining??Math.max(A-c,0))||0),aa=Math.max(0,Math.max(A-L,c)),I=j.get(g)??{routeId:g,from:N.from,to:N.to,trips:0,activeTrips:0,seatsOpen:0,seatsFilled:0,packageSlotsOpen:0,packageSlotsFilled:0,activePassengers:0,activePackages:0};I.trips+=1,I.activeTrips+=1,I.seatsOpen+=k,I.seatsFilled+=Math.max(l,E-k),I.packageSlotsOpen+=L,I.packageSlotsFilled+=aa,I.activePassengers+=ua(x,l),I.activePackages+=fa(x,c),j.set(g,I)}),j.size===0)return null;const y=await Promise.all(Array.from(j.values()).map(async s=>{const g=await $a(s.routeId,s.from,s.to);return[s.routeId,g]})),F=new Map(y.filter(s=>s[1]).map(s=>[s[0],s[1]])),S=Array.from(j.values()).map(s=>{const g=Ta(s.activeTrips,s.seatsFilled,s.seatsOpen,s.packageSlotsFilled,s.packageSlotsOpen),N=F.get(s.routeId);return{routeId:s.routeId,passengerFlow:s.activePassengers,packageFlow:s.activePackages,density:Math.round(s.activeTrips*10+s.seatsFilled*1.5+s.packageSlotsFilled*2),speedKph:N?.speedKph??Pa(g),congestion:N?.congestion??g}}),M=Array.from(j.values()).reduce((s,g)=>(s.totalVehicles+=g.activeTrips,s.activePassengers+=g.activePassengers,s.activePackages+=g.activePackages,s.seatAvailability+=g.seatsOpen,s.packageCapacity+=g.packageSlotsOpen,s),{totalVehicles:0,activePassengers:0,activePackages:0,seatAvailability:0,packageCapacity:0}),T=h.filter(s=>!!s.trip_id),V=T.length,B=T.filter(s=>xa(s.last_heartbeat_at)).length,R=Math.max(0,V-B),G=T.map(s=>s.last_heartbeat_at).filter(s=>!!s).sort((s,g)=>new Date(g).getTime()-new Date(s).getTime())[0]??null,H=T.some(s=>ba(s.last_location)),D=T.flatMap(s=>{const g=C.get(s.trip_id);if(!g)return[];const N=ma(g.origin_city,g.destination_city);if(!N||!ba(s.last_location))return[];const a=Number(s.last_location?.lat),l=Number(s.last_location?.lng??s.last_location?.lon),d=(w.get(s.trip_id)??[]).reduce((L,aa)=>L+Math.max(1,Number(aa.seats_requested??1)||1),0),c=v.get(s.trip_id)??[],x=Math.max(Number(g.package_capacity??0)||0,c.length),k=Math.max(Number(g.total_seats??0)||0,d+Math.max(0,Number(g.available_seats??0)||0)),E=ua(s,d),A=fa(s,c.length);return[{id:`live-${s.trip_id}`,tripId:s.trip_id,routeId:N,lat:a,lng:l,type:A>E?"package":"passenger",passengers:E,seatCapacity:k||void 0,packageCapacity:x||void 0,packageLoad:A||void 0,fresh:xa(s.last_heartbeat_at)}]}),b=S.reduce((s,g)=>s+g.speedKph,0)/Math.max(S.length,1),X=S.reduce((s,g)=>s+g.congestion,0)/Math.max(S.length,1),$=S.slice().sort((s,g)=>g.passengerFlow+g.packageFlow-(s.passengerFlow+s.packageFlow))[0],Q=Math.max(.05,Math.min(1,M.totalVehicles/24));return{source:"supabase",updatedAt:new Date().toISOString(),routes:S,vehicles:D,telemetry:{totalTripsWithTelemetry:V,freshTripsWithTelemetry:B,staleTripsWithTelemetry:R,latestHeartbeatAt:G,hasRenderableLocations:H},traffic:{provider:F.size>0?"google-routes":"none",enabled:F.size>0,liveCorridors:F.size,updatedAt:F.size>0?Array.from(F.values()).map(s=>s.updatedAt).sort().slice(-1)[0]??null:null},analytics:{totalVehicles:M.totalVehicles,activePassengers:M.activePassengers,activePackages:M.activePackages,seatAvailability:M.seatAvailability,packageCapacity:M.packageCapacity,avgSpeed:b,networkUtilization:Q,congestionLevel:X,topCorridor:$?ha($.routeId,t):"",recommendedPath:$?ha($.routeId,t):"",dispatchAction:$?Oa($.routeId,t):t?"مراجعة التوزيع التشغيلي":"Review operational distribution"}}}function qa(t){const[i,n]=f.useState(null),[r,p]=f.useState(!0);return f.useEffect(()=>{if(!Na()){n(null),p(!1);return}let o=!1,m=!1;const u=async()=>{if(!m){m=!0;try{const j=await Ea(t);o||n(j)}finally{m=!1,o||p(!1)}}};u();const h=O;if(!h)return()=>{o=!0};const w=typeof window<"u"?window.setInterval(()=>{u()},15e3):null,v=()=>{document.visibilityState==="visible"&&u()},_=()=>{u()};typeof window<"u"&&(window.addEventListener("focus",_),document.addEventListener("visibilitychange",v));const C=h.channel(`mobility-os-live-${t?"ar":"en"}`).on("postgres_changes",{event:"*",schema:"public",table:"trips"},()=>{u()}).on("postgres_changes",{event:"*",schema:"public",table:"bookings"},()=>{u()}).on("postgres_changes",{event:"*",schema:"public",table:"packages"},()=>{u()}).on("postgres_changes",{event:"*",schema:"public",table:"trip_presence"},()=>{u()}).subscribe();return()=>{o=!0,w!==null&&typeof window<"u"&&(window.clearInterval(w),window.removeEventListener("focus",_),document.removeEventListener("visibilitychange",v)),h.removeChannel(C)}},[t]),{snapshot:i,loading:r}}const q=720,K=560,ta=.42,za="#F5EFE7",na="rgba(245, 239, 231, 0.34)",sa="#F59A2C",ia="rgba(245, 154, 44, 0.3)",Ma=28,Ra=120,Da=150,Z=[{id:"amman",label:"Amman",labelAr:"عمّان",lat:31.9454,lon:35.9284,tier:1,featured:!0},{id:"aqaba",label:"Aqaba",labelAr:"العقبة",lat:29.532,lon:35.0063,tier:1},{id:"irbid",label:"Irbid",labelAr:"إربد",lat:32.5556,lon:35.85,tier:1},{id:"zarqa",label:"Zarqa",labelAr:"الزرقاء",lat:32.0728,lon:36.088,tier:1},{id:"mafraq",label:"Mafraq",labelAr:"المفرق",lat:32.3406,lon:36.208,tier:2},{id:"jerash",label:"Jerash",labelAr:"جرش",lat:32.2803,lon:35.8993,tier:2,featured:!0},{id:"ajloun",label:"Ajloun",labelAr:"عجلون",lat:32.3326,lon:35.7519,tier:2},{id:"salt",label:"Salt",labelAr:"السلط",lat:32.0392,lon:35.7272,tier:2},{id:"madaba",label:"Madaba",labelAr:"مادبا",lat:31.7197,lon:35.7936,tier:2},{id:"karak",label:"Karak",labelAr:"الكرك",lat:31.1853,lon:35.7048,tier:2},{id:"tafila",label:"Tafila",labelAr:"الطفيلة",lat:30.8375,lon:35.6042,tier:3},{id:"maan",label:"Ma'an",labelAr:"معان",lat:30.1962,lon:35.736,tier:3}],Wa=[{id:"amman-aqaba",from:"amman",to:"aqaba",distanceKm:335,passengerFlow:88,packageFlow:54,highlighted:!0},{id:"amman-irbid",from:"amman",to:"irbid",distanceKm:85,passengerFlow:74,packageFlow:32},{id:"amman-zarqa",from:"amman",to:"zarqa",distanceKm:25,passengerFlow:84,packageFlow:40},{id:"zarqa-mafraq",from:"zarqa",to:"mafraq",distanceKm:55,passengerFlow:52,packageFlow:38},{id:"amman-jerash",from:"amman",to:"jerash",distanceKm:48,passengerFlow:96,packageFlow:34,highlighted:!0},{id:"irbid-ajloun",from:"irbid",to:"ajloun",distanceKm:30,passengerFlow:42,packageFlow:20},{id:"amman-madaba",from:"amman",to:"madaba",distanceKm:33,passengerFlow:55,packageFlow:26},{id:"madaba-karak",from:"madaba",to:"karak",distanceKm:111,passengerFlow:48,packageFlow:28},{id:"karak-tafila",from:"karak",to:"tafila",distanceKm:74,passengerFlow:36,packageFlow:22},{id:"tafila-maan",from:"tafila",to:"maan",distanceKm:89,passengerFlow:32,packageFlow:18},{id:"maan-aqaba",from:"maan",to:"aqaba",distanceKm:114,passengerFlow:44,packageFlow:30},{id:"irbid-zarqa",from:"irbid",to:"zarqa",distanceKm:79,passengerFlow:46,packageFlow:18},{id:"amman-salt",from:"amman",to:"salt",distanceKm:32,passengerFlow:40,packageFlow:16},{id:"salt-jerash",from:"salt",to:"jerash",distanceKm:38,passengerFlow:26,packageFlow:14},{id:"ajloun-jerash",from:"ajloun",to:"jerash",distanceKm:24,passengerFlow:24,packageFlow:12}],Ka=[{lat:33.37,lon:35.55},{lat:32.58,lon:36.42},{lat:31.24,lon:37.12},{lat:29.62,lon:36.22},{lat:29.2,lon:35.03},{lat:31.2,lon:35.5},{lat:32.56,lon:35.55}],Ua=[{x:112,y:78,r:1.6,opacity:.34},{x:178,y:108,r:1.1,opacity:.26},{x:268,y:62,r:1.4,opacity:.32},{x:334,y:96,r:1.2,opacity:.22},{x:446,y:72,r:1.5,opacity:.31},{x:528,y:122,r:1.2,opacity:.2},{x:596,y:88,r:1.9,opacity:.28},{x:622,y:154,r:1.2,opacity:.24},{x:654,y:112,r:1.1,opacity:.22}],Va={amman:{dx:18,dy:-20,anchor:"start"},aqaba:{dx:-18,dy:-20,anchor:"end"},irbid:{dx:18,dy:-18,anchor:"start"},zarqa:{dx:16,dy:24,anchor:"start"},jerash:{dx:-18,dy:-22,anchor:"end"},mafraq:{dx:-18,dy:-22,anchor:"end"},karak:{dx:16,dy:-20,anchor:"start"}},ka={en:{mapLabel:"Jordan mobility simulation",passengerLegend:"Ride flow",packageLegend:"Package flow",networkLegend:"Same Mobility OS routes",srDescription:"Animated mobility map of Jordan showing rides and packages moving across the same Wasel network corridors as Mobility OS.",heroEyebrow:"Live orchestration layer",heroTitle:"Jordan network twin",heroBody:"A cinematic landing map for Mobility OS showing live fleet signals, route pressure, and corridor reuse across the country.",telemetryTitle:"Network pulse",topCorridor:"Top corridor",dispatchAction:"Dispatch action",utilization:"Utilization",congestion:"Congestion",activeFleet:"Active fleet",avgSpeed:"Avg speed",liveFeed:"Live feed",modeledNetwork:"Modeled network",citiesMapped:"cities mapped",corridorsSynced:"corridors synced",freshPings:"fresh pings",hotCorridors:"Hot corridors",routeHealth:"Route health",updated:"Updated",awaitingSync:"Awaiting sync",rideDetail:"Network-wide ride pressure",packageDetail:"Network-wide package pressure",movements:"movements",dispatchFallback:"Rebalance demand around Amman and fan spare capacity north.",overlayOne:"Mobility OS live movement",overlayTwo:"Rides and packages share the same corridors",overlayThree:"Designed as a real-time landing twin",kmh:"km/h"},ar:{mapLabel:"محاكاة الحركة في الأردن",passengerLegend:"حركة الرحلات",packageLegend:"حركة الطرود",networkLegend:"نفس مسارات Mobility OS",srDescription:"خريطة حركة متحركة للأردن تعرض الرحلات والطرود وهي تتحرك على نفس شبكة المسارات المستخدمة داخل Mobility OS.",heroEyebrow:"طبقة تشغيل حية",heroTitle:"التوأم الحي لشبكة الأردن",heroBody:"خريطة هبوط سينمائية لـ Mobility OS تعرض إشارات الأسطول الحية وضغط المسارات وإعادة استخدام الممرات على مستوى المملكة.",telemetryTitle:"نبض الشبكة",topCorridor:"المسار الأبرز",dispatchAction:"إجراء تشغيلي",utilization:"الاستغلال",congestion:"الازدحام",activeFleet:"الأسطول النشط",avgSpeed:"متوسط السرعة",liveFeed:"تغذية حية",modeledNetwork:"شبكة مُنمذجة",citiesMapped:"مدن على الخريطة",corridorsSynced:"مسارات متزامنة",freshPings:"إشارات حديثة",hotCorridors:"المسارات الساخنة",routeHealth:"صحة المسار",updated:"آخر تحديث",awaitingSync:"بانتظار التحديث",rideDetail:"ضغط الرحلات على مستوى الشبكة",packageDetail:"ضغط الطرود على مستوى الشبكة",movements:"حركة",dispatchFallback:"وازن الطلب حول عمّان وادفع السعة الاحتياطية نحو الشمال.",overlayOne:"حركة Mobility OS الحية",overlayTwo:"الرحلات والطرود على نفس الممرات",overlayThree:"مصممة كتوأم هبوط حي",kmh:"كم/س"}},Ba=new Set(["amman","aqaba","irbid","zarqa","jerash","mafraq","karak"]),wa=new Map(Z.map(t=>[t.id,t]));function oa(t){return Math.log(Math.tan(Math.PI/4+t*Math.PI/360))}const W=Z.reduce((t,i)=>({minLat:Math.min(t.minLat,i.lat),maxLat:Math.max(t.maxLat,i.lat),minLon:Math.min(t.minLon,i.lon),maxLon:Math.max(t.maxLon,i.lon)}),{minLat:1/0,maxLat:-1/0,minLon:1/0,maxLon:-1/0});function ra(t,i){const n=q*.14,r=K*.12,p=n+(i-W.minLon)/(W.maxLon-W.minLon||1)*(q-n*2),o=oa(W.minLat),m=oa(W.maxLat),u=r+(1-(oa(t)-o)/(m-o||1))*(K-r*2);return{x:p,y:u}}function Ga(t,i,n,r){const p=i.x-t.x,o=i.y-t.y,m=Math.max(1,Math.hypot(p,o)),u=r%2===0?1:-1,h=Math.min(42,12+n*10+r%5*2.4)*u;return{x:(t.x+i.x)/2-o/m*h,y:(t.y+i.y)/2+p/m*h}}function Y(t,i,n,r){const p=1-r;return{x:p*p*t.x+2*p*r*i.x+r*r*n.x,y:p*p*t.y+2*p*r*i.y+r*r*n.y}}function Ha(t,i,n){return`M ${t.x} ${t.y} Q ${i.x} ${i.y} ${n.x} ${n.y}`}function la(t,i){return i?t.labelAr:t.label}function z(t,i,n){return Math.min(n,Math.max(i,t))}function Aa(t){return z(t/Da,0,.98)}function Ya(t,i,n){const r=Math.abs(t-i)/260;return 14+t/118+i/244+n*1.08+r}function Ja(t){const i=Aa(t),n=Ra*(1-i),r=1-i**1.42*.42;return Math.max(18,n*r)}function Za(t){const i=Aa(t);return z(.08+i**1.2*.9,.08,.98)}function Xa(t){const i=t.flatMap(n=>{const r=Math.max(1,Math.round((n.passengerFlow+n.packageFlow)/36));return Array.from({length:r},()=>n)});return Array.from({length:Ma},(n,r)=>{const p=i[r%i.length]??t[r%t.length],o=Math.max(p.passengerFlow+p.packageFlow,1),m=p.passengerFlow/o,u=r*17%10/10<m;return{id:`landing-vehicle-${r}`,routeId:p.id,type:u?"passenger":"package",progress:r*.137%1,direction:r%4===0?-1:1,speedFactor:.82+r%7*.05,passengers:u?1+r%4:void 0,seatCapacity:u?4:void 0,packageCapacity:u?void 0:14+r%6,packageLoad:u?void 0:5+r%5}})}function Qa(t,i,n){const r=Math.max(t.passengerFlow,i?.passengerFlow??0),p=Math.max(t.packageFlow,i?.packageFlow??0),o=i?.density??Ya(r,p,n);return{...t,passengerFlow:r,packageFlow:p,density:o,speedKph:i?.speedKph??Ja(o),congestion:i?.congestion??Za(o)}}function ae(t,i){const n="from"in t?t.from:t.fromId,r="to"in t?t.to:t.toId,p=n?wa.get(n):void 0,o=r?wa.get(r):void 0;return!p||!o?i?"ممر غير معروف":"Unknown corridor":`${la(p,i)} - ${la(o,i)}`}function P(t,i){return new Intl.NumberFormat(i?"ar-JO":"en-US",{notation:t>=1e3?"compact":"standard",maximumFractionDigits:t>=1e3?1:0}).format(Math.round(t))}function J(t,i){return`${new Intl.NumberFormat(i?"ar-JO":"en-US",{maximumFractionDigits:0}).format(Math.round(z(t,0,1)*100))}%`}function va(t,i,n){return`${new Intl.NumberFormat(i?"ar-JO":"en-US",{maximumFractionDigits:t<40?1:0}).format(Number.isFinite(t)?t:0)} ${n}`}function ee(t,i,n){if(!t)return n;const r=new Date(t);return Number.isNaN(r.getTime())?n:new Intl.DateTimeFormat(i?"ar-JO":"en-US",{hour:"numeric",minute:"2-digit",month:"short",day:"numeric"}).format(r)}function ja(t,i){return t.length*i*.62+18}function Fa(t){return t.passengerFlow+t.packageFlow+(t.congestion??0)*48+(t.highlighted?24:0)}function te(t){return t*180/Math.PI}function ve({ar:t=!1,variant:i="full"}){const{snapshot:n}=qa(t),[r,p]=f.useState(0),o=t?ka.ar:ka.en,m=f.useId().replace(/:/g,""),u=i==="ambient",h=f.useMemo(()=>({clip:`${m}-landing-clip`,sky:`${m}-landing-sky`,stage:`${m}-landing-stage`,land:`${m}-landing-land`,landEdge:`${m}-landing-land-edge`,ride:`${m}-landing-ride`,package:`${m}-landing-package`,cityWash:`${m}-landing-city-wash`,scan:`${m}-landing-scan`}),[m]);f.useEffect(()=>{if(typeof window>"u"||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;let l=0;const d=performance.now(),c=x=>{p(x-d),l=window.requestAnimationFrame(c)};return l=window.requestAnimationFrame(c),()=>window.cancelAnimationFrame(l)},[]);const w=f.useMemo(()=>Z.map(a=>({...a,point:ra(a.lat,a.lon)})),[]),v=f.useMemo(()=>new Map(w.map(a=>[a.id,a])),[w]),_=f.useMemo(()=>new Map((n?.routes??[]).map(a=>[a.routeId,a])),[n?.routes]),C=f.useMemo(()=>Wa.map((a,l)=>Qa(a,_.get(a.id),l)),[_]),j=f.useMemo(()=>Ka.map((a,l)=>{const d=ra(a.lat,a.lon);return`${l===0?"M":"L"} ${d.x} ${d.y}`}).join(" "),[]),y=f.useMemo(()=>C.map((a,l)=>{const d=v.get(a.from)?.point??{x:0,y:0},c=v.get(a.to)?.point??{x:0,y:0},x=(a.passengerFlow+a.packageFlow)/120,k=Ga(d,c,x,l+2);return{...a,fromId:a.from,toId:a.to,from:d,to:c,control:k,path:Ha(d,k,c)}}),[v,C]),F=f.useMemo(()=>new Map(y.map(a=>[a.id,a])),[y]),S=f.useMemo(()=>Ca()?Xa(C):[],[C]),M=f.useMemo(()=>{const a=(n?.vehicles??[]).filter(c=>F.has(c.routeId)),l=Math.max(0,Ma-a.length),d=S.slice(0,l);return{liveVehicles:a,syntheticVehicles:d}},[F,n?.vehicles,S]),T=f.useMemo(()=>y.flatMap(a=>{const l=Math.max(1,Math.round(a.passengerFlow/18));return Array.from({length:l},(d,c)=>{const x=(a.speedKph??48)/Math.max(a.distanceKm,1)*ta*.0038*(1.04+c*.05),k=(r*x+c/l)%1;return{id:`${a.id}-ride-${c}`,point:Y(a.from,a.control,a.to,k),radius:a.highlighted?3.2:2.4}})}),[y,r]),V=f.useMemo(()=>y.flatMap(a=>{const l=Math.max(1,Math.round(a.packageFlow/12));return Array.from({length:l},(d,c)=>{const x=(a.speedKph??42)/Math.max(a.distanceKm,1)*ta*.0028*(.96+c*.04),k=1-(r*x+c/l)%1;return{id:`${a.id}-pkg-${c}`,point:Y(a.from,a.control,a.to,k),size:a.highlighted?5:4}})}),[y,r]),B=f.useMemo(()=>M.syntheticVehicles.map(a=>{const l=F.get(a.routeId);if(!l)return null;const d=(r*((l.speedKph??48)/Math.max(l.distanceKm,1))*.017*ta*a.speedFactor+a.progress)%1,c=a.direction===1?d:1-d;return{id:a.id,type:a.type,point:Y(l.from,l.control,l.to,c)}}).filter(a=>a!==null),[F,r,M.syntheticVehicles]),R=f.useMemo(()=>M.liveVehicles.map(a=>{const l=F.get(a.routeId),d=ra(a.lat,a.lng),c=l?Math.atan2(l.to.y-l.from.y,l.to.x-l.from.x):0;return{id:a.id,type:a.type,point:d,fresh:a.fresh,angle:c}}),[F,M.liveVehicles]),G=f.useMemo(()=>Y({x:144,y:112},{x:584,y:128},{x:512,y:430},r*45e-6%1),[r]),H=f.useMemo(()=>R.filter(a=>a.fresh).length,[R]),D=f.useMemo(()=>{const a=Math.max(...y.map(d=>d.passengerFlow),1),l=Math.max(...y.map(d=>d.packageFlow),1);return y.slice().sort((d,c)=>Fa(c)-Fa(d)).slice(0,3).map(d=>({id:d.id,name:ae(d,t),total:P(d.passengerFlow+d.packageFlow,t),speed:va(d.speedKph??0,t,o.kmh),congestion:J(d.congestion??0,t),passengerWidth:`${z(d.passengerFlow/a*100,18,100)}%`,packageWidth:`${z(d.packageFlow/l*100,14,100)}%`}))},[t,o.kmh,y]),b=f.useMemo(()=>{const a=y.length,l=y.reduce((A,L)=>A+L.passengerFlow,0),d=y.reduce((A,L)=>A+L.packageFlow,0),c=n?.analytics.avgSpeed??y.reduce((A,L)=>A+(L.speedKph??0),0)/Math.max(a,1),x=n?.analytics.totalVehicles??M.liveVehicles.length+M.syntheticVehicles.length,k=n?.analytics.networkUtilization??z(x/24,.06,.98),E=n?.analytics.congestionLevel??y.reduce((A,L)=>A+(L.congestion??0),0)/Math.max(a,1);return{activeFleet:x,activePassengers:n?.analytics.activePassengers??l,activePackages:n?.analytics.activePackages??d,avgSpeed:c,networkUtilization:k,congestion:E,liveCorridors:n?.traffic.liveCorridors??a,topCorridor:n?.analytics.topCorridor||D[0]?.name||o.awaitingSync,dispatchAction:n?.analytics.dispatchAction||o.dispatchFallback,updatedAt:n?.telemetry.latestHeartbeatAt??n?.updatedAt??null,hasRenderableLocations:!!(n?.telemetry.hasRenderableLocations||n?.routes.length||n?.vehicles.length)}},[y,D,o.awaitingSync,o.dispatchFallback,n?.analytics.activePackages,n?.analytics.activePassengers,n?.analytics.avgSpeed,n?.analytics.congestionLevel,n?.analytics.dispatchAction,n?.analytics.networkUtilization,n?.analytics.topCorridor,n?.analytics.totalVehicles,n?.routes.length,n?.telemetry.hasRenderableLocations,n?.telemetry.latestHeartbeatAt,n?.traffic.liveCorridors,n?.updatedAt,n?.vehicles.length,M.liveVehicles.length,M.syntheticVehicles.length]),X=f.useMemo(()=>ee(b.updatedAt,t,o.awaitingSync),[t,o.awaitingSync,b.updatedAt]),$=t?[o.overlayOne,o.overlayTwo,o.overlayThree]:[o.overlayOne,o.overlayTwo,o.overlayThree],Q=f.useMemo(()=>[b.hasRenderableLocations?o.liveFeed:o.modeledNetwork,`${P(b.liveCorridors,t)} ${o.corridorsSynced}`,`${P(Z.length,t)} ${o.citiesMapped}`],[t,o.citiesMapped,o.corridorsSynced,o.liveFeed,o.modeledNetwork,b.hasRenderableLocations,b.liveCorridors]),s=f.useMemo(()=>[{id:"fleet",label:o.activeFleet,value:P(b.activeFleet,t),detail:`${P(H,t)} ${o.freshPings}`,accent:"rgba(101, 225, 255, 0.22)",glow:"rgba(101, 225, 255, 0.18)"},{id:"speed",label:o.avgSpeed,value:va(b.avgSpeed,t,o.kmh),detail:`${o.topCorridor}: ${b.topCorridor}`,accent:"rgba(255, 179, 87, 0.22)",glow:"rgba(245, 154, 44, 0.18)"},{id:"rides",label:o.passengerLegend,value:P(b.activePassengers,t),detail:o.rideDetail,accent:"rgba(245, 239, 231, 0.18)",glow:"rgba(245, 239, 231, 0.14)"},{id:"packages",label:o.packageLegend,value:P(b.activePackages,t),detail:o.packageDetail,accent:"rgba(245, 154, 44, 0.2)",glow:"rgba(245, 154, 44, 0.18)"}],[t,o.activeFleet,o.avgSpeed,o.freshPings,o.kmh,o.packageDetail,o.packageLegend,o.passengerLegend,o.rideDetail,o.topCorridor,b.activeFleet,b.activePackages,b.activePassengers,b.avgSpeed,b.topCorridor,H]),g=`${Math.round(b.networkUtilization*100)}%`,N=`${Math.round(b.congestion*100)}%`;return e.jsxs("figure",{"aria-label":o.mapLabel,style:{margin:0,direction:t?"rtl":"ltr"},children:[e.jsx("style",{children:`
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
      `}),e.jsxs("div",{className:"landing-sim-shell","data-variant":i,children:[e.jsx("span",{style:{position:"absolute",width:1,height:1,padding:0,overflow:"hidden",clip:"rect(0, 0, 0, 0)",whiteSpace:"nowrap",border:0},children:o.srDescription}),e.jsxs("svg",{viewBox:`0 0 ${q} ${K}`,role:"img","aria-hidden":"true",className:"landing-sim-svg",children:[e.jsxs("defs",{children:[e.jsxs("linearGradient",{id:h.sky,x1:"360",y1:"0",x2:"360",y2:"560",gradientUnits:"userSpaceOnUse",children:[e.jsx("stop",{offset:"0",stopColor:"rgba(10, 22, 38, 1)"}),e.jsx("stop",{offset:"0.44",stopColor:"rgba(6, 15, 28, 1)"}),e.jsx("stop",{offset:"1",stopColor:"rgba(2, 8, 16, 1)"})]}),e.jsxs("linearGradient",{id:h.stage,x1:"360",y1:"388",x2:"360",y2:"560",gradientUnits:"userSpaceOnUse",children:[e.jsx("stop",{offset:"0",stopColor:"rgba(14, 29, 45, 0.94)"}),e.jsx("stop",{offset:"1",stopColor:"rgba(3, 8, 15, 1)"})]}),e.jsxs("linearGradient",{id:h.land,x1:"186",y1:"78",x2:"530",y2:"510",gradientUnits:"userSpaceOnUse",children:[e.jsx("stop",{offset:"0",stopColor:"rgba(18, 44, 62, 0.98)"}),e.jsx("stop",{offset:"0.44",stopColor:"rgba(10, 28, 42, 0.98)"}),e.jsx("stop",{offset:"0.76",stopColor:"rgba(7, 19, 32, 0.98)"}),e.jsx("stop",{offset:"1",stopColor:"rgba(4, 12, 22, 0.99)"})]}),e.jsxs("linearGradient",{id:h.landEdge,x1:"168",y1:"112",x2:"558",y2:"458",gradientUnits:"userSpaceOnUse",children:[e.jsx("stop",{offset:"0",stopColor:"rgba(176, 235, 255, 0.32)"}),e.jsx("stop",{offset:"0.52",stopColor:"rgba(102, 208, 255, 0.12)"}),e.jsx("stop",{offset:"1",stopColor:"rgba(255, 182, 96, 0.22)"})]}),e.jsxs("linearGradient",{id:h.ride,x1:"92",y1:"502",x2:"548",y2:"92",gradientUnits:"userSpaceOnUse",children:[e.jsx("stop",{offset:"0",stopColor:"#F7FCFF"}),e.jsx("stop",{offset:"0.52",stopColor:za}),e.jsx("stop",{offset:"1",stopColor:"#8EE8FF"})]}),e.jsxs("linearGradient",{id:h.package,x1:"118",y1:"520",x2:"584",y2:"112",gradientUnits:"userSpaceOnUse",children:[e.jsx("stop",{offset:"0",stopColor:"#FFB357"}),e.jsx("stop",{offset:"0.46",stopColor:sa}),e.jsx("stop",{offset:"1",stopColor:"#FFE8BC"})]}),e.jsxs("radialGradient",{id:h.cityWash,cx:"0",cy:"0",r:"1",gradientUnits:"userSpaceOnUse",gradientTransform:"translate(366 278) rotate(90) scale(228 270)",children:[e.jsx("stop",{stopColor:"rgba(193, 248, 255, 0.13)"}),e.jsx("stop",{offset:"0.62",stopColor:"rgba(120, 225, 255, 0.06)"}),e.jsx("stop",{offset:"1",stopColor:"rgba(120, 225, 255, 0)"})]}),e.jsxs("radialGradient",{id:h.scan,cx:"0",cy:"0",r:"1",gradientUnits:"userSpaceOnUse",gradientTransform:"translate(0.5 0.5) scale(0.5)",children:[e.jsx("stop",{stopColor:"rgba(137, 232, 255, 0.26)"}),e.jsx("stop",{offset:"0.5",stopColor:"rgba(137, 232, 255, 0.12)"}),e.jsx("stop",{offset:"1",stopColor:"rgba(137, 232, 255, 0)"})]}),e.jsx("clipPath",{id:h.clip,children:e.jsx("path",{d:j})})]}),e.jsx("rect",{x:"0",y:"0",width:q,height:K,fill:`url(#${h.sky})`}),Ua.map(a=>e.jsx("circle",{cx:a.x,cy:a.y,r:a.r,fill:"rgba(244, 251, 255, 0.94)",opacity:a.opacity},`${a.x}-${a.y}`)),e.jsx("path",{d:"M 34 396 L 686 396 L 720 560 L 0 560 Z",fill:`url(#${h.stage})`}),Array.from({length:10},(a,l)=>{const d=396+((l+1)/11)**1.75*148,c=34+l*8.5;return e.jsx("path",{d:`M ${c} ${d} L ${q-c} ${d}`,stroke:"rgba(220, 255, 248, 0.055)",strokeWidth:"1"},`landing-floor-row-${l}`)}),Array.from({length:12},(a,l)=>{const d=44+l*53.5,c=222+(l-5.5)*17;return e.jsx("path",{d:`M ${d} 560 L ${c} 396`,stroke:"rgba(101, 225, 255, 0.045)",strokeWidth:"1"},`landing-floor-col-${l}`)}),e.jsx("path",{d:j,fill:"rgba(0, 0, 0, 0.18)",transform:"translate(20 30) scale(1 0.964)",opacity:"0.78"}),e.jsx("path",{d:j,fill:`url(#${h.land})`,stroke:`url(#${h.landEdge})`,strokeWidth:"1.7"}),e.jsx("path",{d:j,fill:"none",stroke:"rgba(255, 255, 255, 0.05)",strokeWidth:"13",opacity:"0.18",transform:"translate(7 10)"}),e.jsxs("g",{clipPath:`url(#${h.clip})`,children:[e.jsx("rect",{x:"0",y:"0",width:q,height:K,fill:`url(#${h.cityWash})`}),e.jsx("ellipse",{cx:G.x,cy:G.y,rx:"118",ry:"88",fill:`url(#${h.scan})`,opacity:.54+Math.sin(r*.0021)*.08}),Array.from({length:7},(a,l)=>{const d=118+l*48;return e.jsx("path",{d:`M 104 ${d} C 192 ${d-26}, 286 ${d+16}, 388 ${d-12} S 556 ${d+18}, 628 ${d-6}`,stroke:"rgba(234, 248, 255, 0.05)",strokeWidth:l%2===0?1:.8,fill:"none",opacity:.68-l*.06},`landing-contour-${l}`)}),e.jsx("path",{d:"M 128 116 C 236 92, 356 128, 472 118 C 536 112, 592 122, 644 142 L 644 228 C 556 210, 462 220, 350 212 C 240 204, 178 188, 128 168 Z",fill:"rgba(126, 233, 255, 0.05)"}),e.jsx("path",{d:"M 148 248 C 238 224, 318 248, 408 238 C 500 228, 568 238, 630 272 L 630 346 C 546 316, 458 326, 344 320 C 242 314, 178 292, 148 274 Z",fill:"rgba(245, 154, 44, 0.04)"}),e.jsx("path",{d:"M 184 152 L 222 446",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"}),e.jsx("path",{d:"M 266 96 L 316 438",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"}),e.jsx("path",{d:"M 358 88 L 414 452",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"}),e.jsx("path",{d:"M 462 118 L 520 438",stroke:"rgba(101, 225, 255, 0.05)",strokeWidth:"1"})]}),y.map(a=>{const l=a.congestion??.12,d=a.highlighted?1.4:0,c=3.1+l*1.1+d,x=11+l*5+d*2,k=6.6+l*2.4;return e.jsxs("g",{children:[e.jsx("path",{d:a.path,fill:"none",stroke:"rgba(0, 0, 0, 0.18)",strokeWidth:x+2,strokeLinecap:"round",transform:"translate(8 12)"}),e.jsx("path",{d:a.path,fill:"none",stroke:`rgba(245, 154, 44, ${.08+l*.22})`,strokeWidth:k,strokeLinecap:"round"}),e.jsx("path",{d:a.path,fill:"none",stroke:"rgba(255,255,255,0.04)",strokeWidth:x,strokeLinecap:"round"}),e.jsx("path",{d:a.path,fill:"none",stroke:`url(#${h.ride})`,strokeWidth:c,strokeLinecap:"round",opacity:a.highlighted?1:.88,style:{filter:a.highlighted?"drop-shadow(0 0 16px rgba(111, 228, 255, 0.34))":"drop-shadow(0 0 8px rgba(111, 228, 255, 0.14))"}}),e.jsx("path",{d:a.path,fill:"none",stroke:`url(#${h.package})`,strokeWidth:2.1+d,strokeLinecap:"round",strokeDasharray:`${8+a.packageFlow/18} ${8+l*18}`,strokeDashoffset:-(r*.018*(1+l)),opacity:a.highlighted?.94:.8})]},`${a.id}-route`)}),T.map(a=>e.jsx("circle",{cx:a.point.x,cy:a.point.y,r:a.radius,fill:"#F7FCFF",style:{filter:`drop-shadow(0 0 8px ${na})`}},a.id)),V.map(a=>e.jsx("rect",{x:a.point.x-a.size/2,y:a.point.y-a.size/2,width:a.size,height:a.size,rx:"1.4",fill:sa,style:{filter:`drop-shadow(0 0 8px ${ia})`},transform:`rotate(45 ${a.point.x} ${a.point.y})`},a.id)),B.map(a=>a.type==="passenger"?e.jsx("circle",{cx:a.point.x,cy:a.point.y,r:"4.7",fill:"#F7FCFF",opacity:"0.92",style:{filter:`drop-shadow(0 0 10px ${na})`}},a.id):e.jsx("rect",{x:a.point.x-3.4,y:a.point.y-3.4,width:"6.8",height:"6.8",rx:"1.8",fill:"#F7FCFF",opacity:"0.9",style:{filter:`drop-shadow(0 0 10px ${ia})`},transform:`rotate(45 ${a.point.x} ${a.point.y})`},a.id)),R.map(a=>{const l=te(a.angle),d=a.type==="passenger"?"rgba(247, 252, 255, 0.96)":"rgba(255, 202, 122, 0.96)";return e.jsxs("g",{transform:`translate(${a.point.x} ${a.point.y})`,children:[e.jsx("circle",{r:a.fresh?11:9.5,fill:"none",stroke:a.fresh?"rgba(171, 236, 255, 0.82)":"rgba(255,179,87,0.52)",strokeWidth:"1.3",opacity:a.fresh?.96:.72}),e.jsxs("g",{transform:`rotate(${l})`,children:[e.jsx("path",{d:"M -5.4 -2.6 L 7.4 0 L -5.4 2.6 Z",fill:d,opacity:a.fresh?.94:.74}),a.type==="passenger"?e.jsx("circle",{r:a.fresh?5.1:4.5,fill:"#FFFFFF",opacity:a.fresh?1:.78,style:{filter:`drop-shadow(0 0 12px ${na})`}}):e.jsx("rect",{x:-3.9,y:-3.9,width:"7.8",height:"7.8",rx:"1.8",fill:"#F7FCFF",opacity:a.fresh?1:.78,style:{filter:`drop-shadow(0 0 12px ${ia})`},transform:"rotate(45)"})]})]},a.id)}),w.map((a,l)=>{const d=la(a,t),c=Va[a.id],x=a.featured?14.2:12.8,k=a.featured?18+(Math.sin(r*.0022+l)+1)/2*8:0;return e.jsxs("g",{children:[e.jsx("ellipse",{cx:a.point.x+7,cy:a.point.y+18,rx:a.featured?20:14,ry:a.featured?6:4.8,fill:"rgba(0, 0, 0, 0.22)"}),a.featured?e.jsxs(e.Fragment,{children:[e.jsx("circle",{cx:a.point.x,cy:a.point.y,r:"28",fill:"rgba(169, 227, 255, 0.1)"}),e.jsx("circle",{cx:a.point.x,cy:a.point.y,r:k,fill:"none",stroke:"rgba(126, 233, 255, 0.22)",strokeWidth:"1.1"})]}):null,e.jsx("line",{x1:a.point.x,y1:a.point.y-(a.featured?28:22),x2:a.point.x,y2:a.point.y-5,stroke:a.featured?"rgba(169, 227, 255, 0.42)":"rgba(247, 252, 255, 0.16)",strokeWidth:a.featured?1.8:1.2}),e.jsx("circle",{cx:a.point.x,cy:a.point.y,r:a.tier===1?6:a.tier===2?5:4.4,fill:"#F7FCFF"}),e.jsx("circle",{cx:a.point.x,cy:a.point.y,r:a.featured?12:9,fill:"none",stroke:a.featured?"rgba(169, 227, 255, 0.44)":"rgba(247, 252, 255, 0.2)"}),Ba.has(a.id)&&c?e.jsxs("g",{className:"landing-sim-city-label-group",children:[e.jsx("rect",{x:c.anchor==="end"?a.point.x+c.dx-ja(d,x):a.point.x+c.dx-10,y:a.point.y+c.dy-16,width:ja(d,x),height:"24",rx:"999",fill:"rgba(6, 12, 22, 0.68)",stroke:a.featured?"rgba(126, 233, 255, 0.24)":"rgba(255, 255, 255, 0.08)"}),e.jsx("text",{x:a.point.x+c.dx,y:a.point.y+c.dy,textAnchor:c.anchor,fill:a.featured?"#F7FCFF":"rgba(234, 247, 255, 0.86)",fontSize:x,fontWeight:a.featured?720:620,style:{letterSpacing:"-0.02em"},children:d})]}):null]},a.id)})]}),u?null:e.jsxs("div",{className:"landing-sim-overlay",children:[e.jsxs("div",{className:"landing-sim-top",children:[e.jsxs("div",{className:"landing-sim-panel landing-sim-title-panel",children:[e.jsxs("div",{className:"landing-sim-overline",children:[e.jsx("span",{className:"landing-sim-overline-dot"}),o.heroEyebrow]}),e.jsx("h3",{className:"landing-sim-title",children:o.heroTitle}),e.jsx("p",{className:"landing-sim-body",children:o.heroBody}),e.jsxs("div",{className:"landing-sim-meta-row",children:[e.jsxs("span",{className:"landing-sim-kv",children:[e.jsx("strong",{children:o.updated}),X]}),e.jsxs("span",{className:"landing-sim-kv",children:[e.jsx("strong",{children:o.routeHealth}),J(1-b.congestion*.58,t)]})]}),e.jsx("div",{className:"landing-sim-tag-row",children:$.map(a=>e.jsx("span",{className:"landing-sim-tag",children:a},a))}),e.jsxs("div",{className:"landing-sim-legend-row",children:[e.jsxs("span",{className:"landing-sim-legend-chip",children:[e.jsx("span",{className:"landing-sim-legend-dot",style:{background:"#F7FCFF"}}),o.passengerLegend]}),e.jsxs("span",{className:"landing-sim-legend-chip",children:[e.jsx("span",{className:"landing-sim-legend-dot",style:{background:sa}}),o.packageLegend]}),e.jsxs("span",{className:"landing-sim-legend-chip",children:[e.jsx("span",{className:"landing-sim-legend-line"}),o.networkLegend]})]})]}),e.jsxs("div",{className:"landing-sim-panel landing-sim-telemetry-panel",children:[e.jsx("p",{className:"landing-sim-telemetry-title",children:o.telemetryTitle}),e.jsx("div",{className:"landing-sim-status-row",style:{marginTop:12},children:Q.map(a=>e.jsx("span",{className:"landing-sim-status-chip",children:a},a))}),e.jsx("h4",{className:"landing-sim-telemetry-value",children:b.topCorridor}),e.jsxs("p",{className:"landing-sim-telemetry-copy",children:[e.jsxs("strong",{style:{color:"#F7FCFF"},children:[o.dispatchAction,":"]})," ",b.dispatchAction]}),e.jsxs("div",{className:"landing-sim-meter-group",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"landing-sim-meter-label",children:[e.jsx("span",{children:o.utilization}),e.jsx("strong",{children:J(b.networkUtilization,t)})]}),e.jsx("div",{className:"landing-sim-meter",children:e.jsx("span",{className:"landing-sim-meter-fill",style:{width:g,background:"linear-gradient(90deg, rgba(120, 232, 255, 0.82), rgba(245, 239, 231, 0.94))",boxShadow:"0 0 18px rgba(120, 232, 255, 0.28)"}})})]}),e.jsxs("div",{children:[e.jsxs("div",{className:"landing-sim-meter-label",children:[e.jsx("span",{children:o.congestion}),e.jsx("strong",{children:J(b.congestion,t)})]}),e.jsx("div",{className:"landing-sim-meter",children:e.jsx("span",{className:"landing-sim-meter-fill",style:{width:N,background:"linear-gradient(90deg, rgba(255, 179, 87, 0.82), rgba(245, 154, 44, 0.96))",boxShadow:"0 0 18px rgba(245, 154, 44, 0.24)"}})})]})]})]})]}),e.jsxs("div",{className:"landing-sim-bottom",children:[e.jsx("div",{className:"landing-sim-stat-grid",children:s.map(a=>e.jsxs("div",{className:"landing-sim-panel landing-sim-stat-card",style:{borderColor:a.accent,boxShadow:`inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 48px ${a.glow}`},children:[e.jsx("div",{className:"landing-sim-stat-label",children:a.label}),e.jsx("div",{className:"landing-sim-stat-value",children:a.value}),e.jsx("div",{className:"landing-sim-stat-detail",children:a.detail})]},a.id))}),e.jsxs("div",{className:"landing-sim-panel landing-sim-hotspots",children:[e.jsxs("div",{className:"landing-sim-hotspots-head",children:[e.jsx("h4",{className:"landing-sim-hotspots-title",children:o.hotCorridors}),e.jsx("span",{className:"landing-sim-kv",children:o.routeHealth})]}),e.jsx("div",{className:"landing-sim-hotspot-list",children:D.map(a=>e.jsxs("div",{className:"landing-sim-hotspot-item",children:[e.jsxs("div",{className:"landing-sim-hotspot-head",children:[e.jsx("span",{children:a.name}),e.jsxs("span",{className:"landing-sim-hotspot-total",children:[a.total," ",o.movements]})]}),e.jsxs("div",{className:"landing-sim-track-stack",children:[e.jsx("div",{className:"landing-sim-track",children:e.jsx("span",{style:{width:a.passengerWidth,background:"linear-gradient(90deg, rgba(247,252,255,0.98), rgba(151,236,255,0.92))"}})}),e.jsx("div",{className:"landing-sim-track",children:e.jsx("span",{style:{width:a.packageWidth,background:"linear-gradient(90deg, rgba(255,200,116,0.96), rgba(245,154,44,0.98))"}})})]}),e.jsxs("div",{className:"landing-sim-hotspot-foot",children:[e.jsx("span",{children:a.speed}),e.jsx("span",{children:a.congestion})]})]},a.id))})]})]})]})]})]})}export{ve as MobilityOSLandingMap};
