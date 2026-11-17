// Vista «Oficina»: el equipo de agentes dibujado en una oficina isométrica (canvas 2D).
// Solo lee datos reales (/api/status, /api/productions, /api/logs); no cambia nada.
import { api, esc, icon, pill } from "../lib.js";
import { agentName, debounce, refreshStatus } from "../store.js";

/* ---------- Oficina: el equipo de agentes en una oficina isométrica ----------
   Dibuja con canvas 2D (sin librerías). Los estados salen de los datos reales:
   /api/status (agentes + tareas en marcha), /api/productions y /api/logs. */

var OF_W=10,OF_D=8,OF_ALTO=2.2,
  // Un puesto por agente, en el orden de la cadena. x, y = esquina del escritorio (en casillas).
  OF_PUESTOS={
    "trend-researcher":{x:.8,y:1,corto:"Investigador",shirt:"#4f7cff",hair:"#2b1d14",skin:"#f1c9a5"},
    "audience-analyst":{x:3,y:1,corto:"Audiencia",shirt:"#3ecf8e",hair:"#141414",skin:"#c98e64"},
    scriptwriter:{x:5.2,y:1,corto:"Guionista",shirt:"#b46cff",hair:"#7a3b12",skin:"#f3d2b3"},
    narrator:{x:.8,y:3.7,corto:"Narrador",shirt:"#ff8a3d",hair:"#e8c27a",skin:"#e8b48f"},
    "thumbnail-designer":{x:3,y:3.7,corto:"Miniaturas",shirt:"#ff4fa3",hair:"#1d1d2b",skin:"#a86f4c"},
    producer:{x:5.2,y:3.7,corto:"Productor",shirt:"#2ec4d6",hair:"#3a2a1e",skin:"#f0c4a0"},
    "performance-analyst":{x:.8,y:6.2,corto:"Rendimiento",shirt:"#ffd23f",hair:"#5b5b5b",skin:"#d9a27c"}
  },
  OF_LIBRES=[{x:3,y:6.2},{x:5.2,y:6.2}],// por si el registro trae agentes nuevos
  OF_HACIENDO={"trend-researcher":"Investigando tendencias",
    "audience-analyst":"Analizando a la audiencia",scriptwriter:"Escribiendo el guion",
    narrator:"Grabando la voz","thumbnail-designer":"Dise\xF1ando miniaturas",producer:"Montando el video",
    "performance-analyst":"Leyendo m\xE9tricas"},
  OF_RANGO={pending:1,failed:2,awaiting_approval:3,running:4},
  OF_PANTALLA={running:["#ff7a45","#f04e23"],awaiting_approval:["#ffd36b","#f5b544"],failed:["#ff8080","#c93636"],pending:["#7aa7ff","#3a5bb8"],idle:["#26407a","#16264d"],planned:["#0b0f1a","#0b0f1a"]},
  OF_ICONO={running:"#f04e23",awaiting_approval:"#f5b544",failed:"#ff6b6b"};

var of={root:null,datos:null,sel:null,raf:0,ro:null,S:1,ox:0,oy:0,puestos:[],quieto:!1,t0:0};

function ofSombra(e,t){let a=parseInt(e.slice(1),16),n=o=>Math.max(0,Math.min(255,Math.round(o*t)));return`rgb(${n(a>>16&255)},${n(a>>8&255)},${n(a&255)})`}
function ofP(e,t,a){return[of.ox+(e-t)*32*of.S,of.oy+((e+t)*16-a*36)*of.S]}
function ofPoli(e,t,a){e.beginPath(),t.forEach(([n,o,s],i)=>{let[d,c]=ofP(n,o,s);i?e.lineTo(d,c):e.moveTo(d,c)}),e.closePath(),e.fillStyle=a,e.fill()}
// Caja con las tres caras visibles: arriba, +x (derecha) y +y (izquierda).
function ofCaja(e,t,a,n,o,s,i,d,c={}){let r=t+o,f=a+s,l=n+i;ofPoli(e,[[t,f,n],[r,f,n],[r,f,l],[t,f,l]],c.izq??ofSombra(d,.62)),ofPoli(e,[[r,a,n],[r,f,n],[r,f,l],[r,a,l]],c.der??ofSombra(d,.8)),ofPoli(e,[[t,a,l],[r,a,l],[r,f,l],[t,f,l]],c.top??d)}

function ofEstados(e,t,a){let n=new Map(t.map(r=>[r.id,r])),o=new Map;for(let r of e.agents)o.set(r.id,{agent:r,state:r.implemented?"idle":"planned",prod:null,taskId:null,log:null});for(let r of t)if(r.status!=="cancelled")for(let f of r.tasks||[]){let l=o.get(f.agentId);l&&l.agent.implemented&&OF_RANGO[f.status]>(OF_RANGO[l.state]||0)&&Object.assign(l,{state:f.status,prod:r})}for(let r of e.activity||[]){let f=o.get(r.agentId);f&&Object.assign(f,{state:"running",prod:n.get(r.productionId)??f.prod,taskId:r.id})}let s=[...a].reverse();for(let r of o.values()){let f=s.find(l=>l.agentId===r.agent.id&&(!r.taskId||l.taskId===r.taskId));f&&(r.log=f)}return o}

function ofTexto(e){let t=e.agent;return e.state==="running"?e.log?.message||`${OF_HACIENDO[t.id]??"Trabajando"}…`:e.state==="awaiting_approval"?"Termin\xF3. Espera tu aprobaci\xF3n.":e.state==="failed"?"No pudo terminar. Rev\xEDsalo.":e.state==="pending"?"En cola: empieza cuando le pasen el trabajo.":e.state==="planned"?t.unavailableReason?"Disponible en la versi\xF3n con servidor.":`Llega en la fase ${t.phase}.`:"Libre. Esperando una tarea."}
function ofEtiqueta(e){let t=e.agent;return e.state==="idle"?pill("pending","Libre"):e.state==="planned"?pill("planned",t.unavailableReason?"Solo con servidor":`Fase ${t.phase}`):pill(e.state)}

function ofArmarPuestos(){let e=0;of.puestos=of.datos.agents.map(t=>{let a=OF_PUESTOS[t.id]??{...OF_LIBRES[e++%OF_LIBRES.length],corto:t.name.split(" ")[0],shirt:"#94a1bf",hair:"#333",skin:"#e0b08a"};return{...a,id:t.id,cx:a.x+.7,cy:a.y+1.02}})}

/* --- Personaje de bloques --- */
function ofPersona(e,t,a,{z:n=0,sentado:o=!0,mira:s="atras",shirt:i,hair:d,skin:c,teclea:r=0,cabeza:f=0}){let l=o?.36:.32,p=l+.36+f;o||ofCaja(e,t-.13,a-.1,n,.26,.2,.32,"#2a3350");ofCaja(e,t-.17,a-.12,n+l,.34,.24,.36,i);if(o){let m=n+l+.14+r;ofCaja(e,t-.25,a-.26,m,.08,.3,.08,i),ofCaja(e,t+.17,a-.26,n+l+.14+(r?.03-r:0),.08,.3,.08,i)}else ofCaja(e,t-.25,a-.08,n+l+.04,.08,.16,.28,i),ofCaja(e,t+.17,a-.08,n+l+.04,.08,.16,.28,i);ofCaja(e,t-.15,a-.15,n+p,.3,.3,.3,c);ofCaja(e,t-.16,a-.16,n+p+.22,.32,.32,.1,d);s==="atras"?ofCaja(e,t-.155,a+.13,n+p+.06,.31,.035,.18,d):(ofCaja(e,t-.09,a+.15,n+p+.13,.05,.01,.06,"#1a1a1a"),ofCaja(e,t+.04,a+.15,n+p+.13,.05,.01,.06,"#1a1a1a"));return n+p+.32}

function ofEscritorio(e,t,a,n,{apagado:o=!1}={}){ofCaja(e,t,a,0,.06,.7,.42,"#6b4a33"),ofCaja(e,t+1.34,a,0,.06,.7,.42,"#6b4a33"),ofCaja(e,t,a,.42,1.4,.7,.06,"#a8764f"),ofCaja(e,t+.62,a+.12,.48,.16,.1,.1,"#20263a"),ofCaja(e,t+.32,a+.1,.58,.76,.06,.44,"#20263a");let[s,i]=OF_PANTALLA[n]??OF_PANTALLA.idle,d=[[t+.36,a+.161,.62],[t+1.04,a+.161,.62],[t+1.04,a+.161,.98],[t+.36,a+.161,.98]];if(e.save(),ofPoli(e,d,s),!o){let c=ofP(t+.36,a+.161,.98),r=ofP(t+1.04,a+.161,.62),f=e.createLinearGradient(c[0],c[1],r[0],r[1]);f.addColorStop(0,s),f.addColorStop(1,i),e.fillStyle=f,e.fill(),e.shadowColor=s,e.shadowBlur=n==="idle"?6:18*of.S,e.fill()}e.restore();if(n==="running"||n==="awaiting_approval"){e.save(),e.globalAlpha=.55;let c=(performance.now()-of.t0)/1e3*(n==="running"?.8:0);for(let r=0;r<4;r++){let f=.66+(r*.075+c)%.3,l=.45+r*37%5/10*.4;ofPoli(e,[[t+.42,a+.17,f],[t+.42+l*.6,a+.17,f],[t+.42+l*.6,a+.17,f+.025],[t+.42,a+.17,f+.025]],"#fff")}e.restore()}o||ofCaja(e,t+.45,a+.44,.48,.5,.16,.025,"#3a4363")}

function ofSilla(e,t,a,n){ofCaja(e,t-.03,a-.03,0,.06,.06,.24,"#151a2b"),ofCaja(e,t-.2,a-.18,.24,.4,.36,.08,"#2c3550"),n&&ofCaja(e,t-.2,a+.16,.3,.4,.06,.28,"#2c3550")}

function ofPlanta(e,t,a,n=1){ofCaja(e,t,a,0,.32,.32,.3,"#b5643c"),ofCaja(e,t+.04,a+.04,.3,.24,.24,.22*n,"#2f9e5b"),ofCaja(e,t-.04,a+.08,.48*n,.22,.2,.2,"#3cbf6e"),ofCaja(e,t+.14,a-.02,.56*n,.2,.22,.24,"#27884d")}

function ofIcono(e,t,a,n,o){let s=OF_ICONO[n];if(!s)return;let[i,d]=ofP(t,a,n==="running"?o+.05:o+.1+Math.sin(performance.now()/260)*.04),c=11*Math.max(.8,of.S);if(n==="running"){let r=performance.now()/1e3;for(let f=0;f<3;f++){let l=(r*.7+f/3)%1;e.globalAlpha=1-l,e.fillStyle=s,e.fillRect(i-c*.9+f*c*.7,d-l*22*of.S-c*.2,c*.42,c*.42)}e.globalAlpha=1;return}e.save(),e.fillStyle=s,e.shadowColor=s,e.shadowBlur=12,e.beginPath(),e.moveTo(i,d-c*1.25),e.lineTo(i+c,d),e.lineTo(i,d+c*1.25),e.lineTo(i-c,d),e.closePath(),e.fill(),e.restore(),e.fillStyle="#1a1200",e.font=`800 ${Math.round(c*1.3)}px ${"system-ui, sans-serif"}`,e.textAlign="center",e.textBaseline="middle",e.fillText("!",i,d+1),e.textAlign="left"}

function ofLetrero(e){let t=ofP(2.4,0,1.95),a=of.S;e.save(),e.setTransform(32*a/100*devicePixelRatio,16*a/100*devicePixelRatio,0,36*a/100*devicePixelRatio,t[0]*devicePixelRatio,t[1]*devicePixelRatio),e.font='42px "Anton", Impact, sans-serif',e.textBaseline="top",e.fillStyle="#f04e23",e.shadowColor="#f04e23",e.shadowBlur=10,e.fillText("ERA",0,0),e.fillStyle="#e9edf7",e.shadowColor="rgba(233,237,247,.6)",e.fillText("FACTORY",e.measureText("ERA ").width+8,0),e.restore()}

function ofDibujar(){let e=of.root?.querySelector("#of-canvas");if(!e||!of.datos)return;let t=e.getContext("2d"),a=devicePixelRatio||1;t.setTransform(a,0,0,a,0,0),t.clearRect(0,0,e.width,e.height);let n=performance.now()/1e3;
  // Suelo y paredes
  ofPoli(t,[[0,0,0],[OF_W,0,0],[OF_W,OF_D,0],[0,OF_D,0]],"#1b2542");t.strokeStyle="rgba(148,161,191,.07)",t.lineWidth=1;for(let s=1;s<OF_W;s++){let[i,d]=ofP(s,0,0),[c,r]=ofP(s,OF_D,0);t.beginPath(),t.moveTo(i,d),t.lineTo(c,r),t.stroke()}for(let s=1;s<OF_D;s++){let[i,d]=ofP(0,s,0),[c,r]=ofP(OF_W,s,0);t.beginPath(),t.moveTo(i,d),t.lineTo(c,r),t.stroke()}
  ofCaja(t,0,-.18,0,OF_W,.18,OF_ALTO,"#2a3658",{izq:"#26314f"}),ofCaja(t,-.18,-.18,0,.18,OF_D+.18,OF_ALTO,"#2a3658",{der:"#202a45"});
  for(let[s,i]of[[1,2.4],[3.6,5]])ofPoli(t,[[0,s,.9],[0,i,.9],[0,i,1.85],[0,s,1.85]],"#0d1a3a"),ofPoli(t,[[0,s+.05,1.6],[0,i-.05,1.6],[0,i-.05,1.8],[0,s+.05,1.8]],"rgba(122,167,255,.18)");
  ofPoli(t,[[7.6,0,.9],[9.7,0,.9],[9.7,0,1.85],[7.6,0,1.85]],"#0d1a3a");ofLetrero(t);
  // Dirección: alfombra, mampara de cristal, sofá y escritorio grande
  ofPoli(t,[[7.5,.7,.005],[9.85,.7,.005],[9.85,4.7,.005],[7.5,4.7,.005]],"#e5c33a"),ofPoli(t,[[7.62,.82,.01],[9.73,.82,.01],[9.73,4.58,.01],[7.62,4.58,.01]],"#7a1f2b");
  let o=[];
  // Cada cosa del mapa: [orden de profundidad, función que la dibuja]
  o.push([0.3,()=>ofPlanta(t,.15,.15)]),o.push([9.6+.5,()=>ofPlanta(t,9.45,.25,1.2)]);
  o.push([1.9+7.1,()=>{t.save(),t.globalAlpha=.28,ofCaja(t,7.1,0,0,.06,1.9,1.15,"#9cc4ff"),t.restore()}]);
  o.push([4.3+7.1,()=>{t.save(),t.globalAlpha=.28,ofCaja(t,7.1,3.1,0,.06,2.4,1.15,"#9cc4ff"),t.restore()}]);
  let s=of.datos.summary?.awaitingApproval??0;
  o.push([8.85+1.6,()=>{ofSilla(t,8.85,1.55,!1),ofPersona(t,8.85,1.55,{mira:"frente",shirt:"#f04e23",hair:"#1b120c",skin:"#e6b48c",cabeza:Math.sin(n*1.3)*.008})}]);
  o.push([8.85+2.4,()=>{ofCaja(t,8,2,0,1.7,.8,.46,"#5a3b28"),ofCaja(t,8,2,.46,1.7,.8,.06,"#8a5a3b"),ofCaja(t,8.55,2.12,.52,.6,.06,.4,"#20263a"),s&&ofCaja(t,8.2,2.45,.52,.22,.3,.04,"#f5b544")}]);
  o.push([8.8+4.3,()=>{ofCaja(t,7.9,4,0,1.8,.6,.28,"#3a4166"),ofCaja(t,7.9,4.42,0,1.8,.2,.62,"#454e7a"),ofCaja(t,7.75,4,0,.18,.62,.44,"#454e7a"),ofCaja(t,9.7,4,0,.18,.62,.44,"#454e7a")}]);
  // Zona de descanso
  o.push([6.3+6.6,()=>{ofCaja(t,6.2,6.2,0,.8,.6,1.55,"#2a3658"),ofPoli(t,[[6.28,6.8,.25],[6.92,6.8,.25],[6.92,6.8,1.45],[6.28,6.8,1.45]],"#f04e23"),ofPoli(t,[[6.36,6.8,.7],[6.84,6.8,.7],[6.84,6.8,1.36],[6.36,6.8,1.36]],"#ffb089")}]);
  o.push([4.2+6.7,()=>{ofCaja(t,4.05,6.55,0,.34,.34,.82,"#dfe6f5"),ofCaja(t,4.1,6.6,.82,.24,.24,.32,"#7aa7ff",{top:"#a8c6ff"})}]);
  o.push([5.4+6.9,()=>ofPlanta(t,5.3,6.75,1.1)]);
  // Puestos de los agentes
  for(let i of of.puestos){let d=of.datos.estados.get(i.id);if(!d)continue;let c=d.state,r=c==="planned",f=of.sel===i.id;o.push([i.cx+i.cy,()=>{if(f){let l=.55+Math.sin(n*4)*.06;t.save(),t.globalAlpha=.9,t.lineWidth=2.5,t.strokeStyle="#f04e23",t.beginPath(),[[i.cx-l,i.cy],[i.cx,i.cy-l],[i.cx+l,i.cy],[i.cx,i.cy+l]].forEach(([g,S],A)=>{let[y,C]=ofP(g,S,.01);A?t.lineTo(y,C):t.moveTo(y,C)}),t.closePath(),t.stroke(),t.restore()}r&&(t.save(),t.globalAlpha=.5);ofEscritorio(t,i.x,i.y,c,{apagado:r});let l=c==="awaiting_approval",p=c!=="planned"&&!l;ofSilla(t,i.cx,i.cy,!1);let m=i.cy;if(p){let g=c==="running"?Math.abs(Math.sin(n*14))*.04:0;i.top=ofPersona(t,i.cx,i.cy-.04,{...i,teclea:g,cabeza:c==="failed"?-.08:c==="running"?Math.sin(n*7)*.012:Math.sin(n*1.6)*.006})}ofSilla(t,i.cx,i.cy,!0)||0;if(l){let g=i.x+1.65,S=i.y+.85;i.top=ofPersona(t,g,S,{...i,cabeza:0,sentado:!1,mira:"frente",z:Math.abs(Math.sin(n*3))*.05}),i.hx=g,i.hy=S}else i.hx=i.cx,i.hy=m;r&&(i.top=.9,t.restore(),ofCaja(t,i.x+1.05,i.y+.25,.48,.22,.16,.2,"#f5b544"));ofIcono(t,i.hx,i.hy,c,i.top)}])}
  o.sort((i,d)=>i[0]-d[0]).forEach(([,i])=>i());
  // Etiquetas HTML encima de cada personaje
  let a2=of.root.querySelectorAll("[data-of-tag]");a2.forEach(i=>{let d=of.puestos.find(f=>f.id===i.dataset.ofTag)??(i.dataset.ofTag==="tu"?{hx:8.85,hy:1.55,top:1.04}:null);if(!d)return;let[c,r]=ofP(d.hx??d.cx,d.hy??d.cy,(d.top??1)+.5);i.style.transform=`translate(${Math.round(c)}px,${Math.round(r)}px) translate(-50%,-100%)`})}

function ofBucle(){of.raf=0;if(!of.root)return;ofDibujar(),of.quieto||(of.raf=requestAnimationFrame(ofBucle))}
function ofAnimar(){of.raf||(of.raf=requestAnimationFrame(ofBucle))}

function ofMedir(){let e=of.root?.querySelector("#of-escena"),t=of.root?.querySelector("#of-canvas");if(!e||!t)return;let a=e.clientWidth,n=(OF_W+OF_D)*32,o=Math.max(a/n,a<600?.82:.5);o=Math.min(o,1.6),of.S=o;let s=Math.ceil(n*o),i=Math.ceil(((OF_W+OF_D)*16+OF_ALTO*36+44)*o);of.ox=OF_D*32*o,of.oy=(OF_ALTO*36+44)*o;let d=devicePixelRatio||1;t.width=s*d,t.height=i*d,t.style.width=`${s}px`,t.style.height=`${i}px`,e.querySelector(".of-capa").style.width=`${s}px`,e.querySelector(".of-capa").style.height=`${i}px`,s>a&&!e.dataset.centrado&&(e.dataset.centrado="1",e.scrollLeft=(s-a)*.38),of.quieto?ofDibujar():ofAnimar()}

function ofFicha(){let e=of.sel&&of.datos.estados.get(of.sel);if(!e)return`<section class="card"><div class="core"><p class="muted" style="margin:0">Toca a un agente para ver su ficha.</p></div></section>`;let t=e.agent,a=e.prod;return`<section class="card" aria-live="polite"><div class="core">
    <div class="agent${e.state==="running"?" busy":""}${e.state==="planned"?" planned":""}">
      <div class="avatar">${icon(t.id)}</div>
      <div class="grow">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap"><strong>${esc(t.name)}</strong>${ofEtiqueta(e)}</div>
        <div class="doing">${esc(t.role??"")}</div>
      </div>
    </div>
    <p style="margin:12px 0 4px">${esc(ofTexto(e))}</p>
    ${a?`<p class="src" style="margin:0 0 10px">Producci\xF3n: ${esc(a.title)}${a.channelName?` \xB7 ${esc(a.channelName)}`:""}</p>`:""}
    <p class="muted" style="font-size:13.5px;margin:10px 0 0">${esc(t.description)}</p>
    <p class="muted" style="font-size:12.5px;margin:8px 0 0">${t.dependsOn?.length?`Recibe de: ${t.dependsOn.map(n=>esc(agentName(n))).join(", ")}`:"Primer eslab\xF3n de la cadena."}${t.requiresApproval?" \xB7 Necesita tu aprobaci\xF3n":""}</p>
    ${a?`<div class="actions" style="margin-top:14px"><a class="btn small primary" href="#produccion-${esc(a.id)}">${icon(e.state==="awaiting_approval"?"check":"play")}${e.state==="awaiting_approval"?"Revisar y aprobar":e.state==="failed"?"Ver qu\xE9 fall\xF3":"Ver producci\xF3n"}</a></div>`:""}
  </div></section>`}

function ofEtiquetas(){let e=of.datos,t=e.summary?.awaitingApproval??0;return of.puestos.map(a=>{let n=e.estados.get(a.id);if(!n)return"";let o=of.sel===a.id;return`<button type="button" class="of-tag ${esc(n.state)}${o?" sel":""}" data-of-tag="${esc(a.id)}" aria-pressed="${o}" aria-label="${esc(n.agent.name)}: ${esc(ofTexto(n))}">
      ${o?`<span class="of-globo">${esc(ofTexto(n))}</span>`:""}<span class="of-nombre"><i></i>${esc(a.corto)}</span></button>`}).join("")+`<a class="of-tag tu${t?" awaiting_approval":""}" data-of-tag="tu" href="${t?"#producciones":"#centro"}" aria-label="T\xFA, direcci\xF3n${t?`: ${t} esperan tu aprobaci\xF3n`:""}"><span class="of-nombre"><i></i>T\xFA${t?` \xB7 ${t} por aprobar`:""}</span></a>`}

function ofResumen(){let e=[...of.datos.estados.values()],t=a=>e.filter(n=>n.state===a).length;return[[t("running"),"trabajando","running"],[t("awaiting_approval"),"esperan tu aprobaci\xF3n","awaiting_approval"],[t("failed"),"con fallos","failed"],[t("idle")+t("pending"),"libres","pending"]].filter(([a])=>a).map(([a,n,o])=>`<span class="pill st-${o}">${a} ${n}</span>`).join(" ")||'<span class="pill">Sin agentes</span>'}

function ofPintar(){let e=of.root;if(!e)return;e.querySelector("#of-resumen").innerHTML=ofResumen(),e.querySelector(".of-capa").innerHTML=ofEtiquetas(),e.querySelector("#of-ficha").innerHTML=ofFicha(),of.quieto?ofDibujar():ofAnimar()}

async function ofCargar(){let[e,t,a]=await Promise.all([refreshStatus(),api("GET","/api/productions"),api("GET","/api/logs?limit=80").catch(()=>[])]);of.datos={...e,estados:ofEstados(e,t,a)},of.puestos.length!==e.agents.length&&ofArmarPuestos();if(of.sel===null){let n=[...of.datos.estados.values()].find(o=>["awaiting_approval","failed","running"].includes(o.state));of.sel=n?.agent.id??!1}}

var ofRefrescar=debounce(async()=>{if(!of.root)return;try{await ofCargar(),ofPintar()}catch{}},400)
export const oficina={async render(e){Object.assign(of,{root:e,sel:null,puestos:[],t0:performance.now(),quieto:matchMedia("(prefers-reduced-motion: reduce)").matches}),await ofCargar();e.innerHTML=`
      <header class="page-head"><div><h1>Oficina</h1><p>Tu equipo trabajando en vivo. Toca a un agente para ver su ficha.</p></div></header>
      <div id="of-resumen" class="chips" style="margin:-6px 0 14px"></div>
      <div class="of-escena" id="of-escena"><canvas id="of-canvas" aria-hidden="true"></canvas><div class="of-capa"></div></div>
      <p class="hint muted of-pista">Desliza para recorrer la oficina.</p>
      <div id="of-ficha" style="margin-top:14px"></div>`,ofPintar(),ofMedir(),of.ro=new ResizeObserver(()=>ofMedir()),of.ro.observe(e.querySelector("#of-escena"));let t=e.querySelector("#of-escena");t.addEventListener("click",a=>{let n=a.target.closest("button[data-of-tag]"),o=n?.dataset.ofTag;if(!o&&a.target.id==="of-canvas"){let s=t.querySelector("#of-canvas").getBoundingClientRect(),i=a.clientX-s.left,d=a.clientY-s.top,c=1/0;for(let r of of.puestos){let[f,l]=ofP(r.hx??r.cx,r.hy??r.cy,(r.top??1)-.35),p=Math.hypot(f-i,l-d);p<c&&p<60*of.S&&(c=p,o=r.id)}}o&&(of.sel=of.sel===o?!1:o,ofPintar())})},onEvent:()=>ofRefrescar(),leave(){cancelAnimationFrame(of.raf),of.raf=0,of.ro?.disconnect(),of.ro=null,of.root=null}};
