'use strict';
const $ = (s, el=document) => el.querySelector(s);
const view = $('#view'), titleEl = $('#title'), topActions = $('#topActions');
const KEY = 'etichette.records.v1', DRAFT = 'etichette.draft.v1';
const SC = 3; // fattore di scala del raddrizzamento (px per unita' del modulo)
const FW = FRAME.x2 - FRAME.x1, FH = FRAME.y2 - FRAME.y1;

/* ---------- utilita' ---------- */
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const records = () => load(KEY, []);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>t.classList.remove('show'),2600); }
function ask(msg, ok='Conferma', danger=false){
  return new Promise(res=>{
    const m=$('#modal'); m.hidden=false;
    m.innerHTML=`<div class="box"><p>${esc(msg)}</p><div class="row"><button class="sec" id="mn">Annulla</button><button class="${danger?'danger':''}" id="my">${esc(ok)}</button></div></div>`;
    $('#mn').onclick=()=>{m.hidden=true;res(false)}; $('#my').onclick=()=>{m.hidden=true;res(true)};
  });
}
function setHeader(title, actions=''){ titleEl.textContent=title; topActions.innerHTML=actions; }

/* ---------- elenco ---------- */
function showList(){
  const recs = records().sort((a,b)=>b.savedAt-a.savedAt);
  setHeader('Etichette');
  view.innerHTML = `
    <div class="card">
      <div class="row" style="align-items:center"><div><strong>${recs.length}</strong> ${recs.length===1?'etichetta salvata':'etichette salvate'}</div></div>
      <div class="row" style="margin-top:10px">
        <button id="exp" ${recs.length?'':'disabled'}>Scarica .xls</button>
        <button class="danger" id="clr" ${recs.length?'':'disabled'}>Svuota elenco</button>
      </div>
    </div>
    ${recs.length ? recs.map(r=>`
      <div class="card item" data-id="${r.id}">
        <div class="grow"><div class="num">${esc(r.v.docnum||'senza numero')} <span class="pill">${esc(r.v.part||'—')}</span></div>
        <div class="d">${esc(r.v.desc||'')}</div>
        <div class="d">SN in: ${esc(r.v.serial||'—')} · SN out: ${esc(r.v.rserial||'—')}</div></div>
        <div aria-hidden="true">›</div>
      </div>`).join('') : `<div class="empty">Nessuna etichetta ancora.<br>Premi “Scansiona etichetta” per iniziare.</div>`}
    <div class="bar"><button class="sec" id="man">Inserisci a mano</button><button class="acc" id="scan">Scansiona etichetta</button></div>`;
  $('#scan').onclick = showPicker; $('#man').onclick = () => showForm(emptyValues(), null, {});
  view.querySelectorAll('.item').forEach(el=>el.onclick=()=>{ const r=records().find(x=>x.id===el.dataset.id); showForm({...r.v}, r.id, {}); });
  const e=$('#exp'); if(e) e.onclick=exportXls;
  const c=$('#clr'); if(c) c.onclick=async()=>{ if(await ask('Eliminare tutte le etichette salvate? Scarica prima il file .xls se ti serve.','Elimina tutto',true)){ save(KEY,[]); showList(); } };
}

/* ---------- scelta foto ---------- */
function showPicker(){
  setHeader('Scansiona', '<button class="ghost" id="bk">Annulla</button>');
  $('#bk').onclick = showList;
  view.innerHTML = `
    <div class="card"><p style="margin-top:0">Fotografa l'intero modulo (etichetta Installation + Removal) con buona luce e il foglio il piu' dritto possibile. Nel passo successivo allinei i quattro angoli.</p>
    <div class="row">
      <label class="btn acc">Scatta foto<input type="file" accept="image/*" capture="environment" id="cam" hidden></label>
      <label class="btn sec">Dalla galleria<input type="file" accept="image/*" id="gal" hidden></label>
    </div></div>
    <p class="hint">Tutto avviene sul telefono: nessuna immagine viene inviata online.</p>`;
  const h = e => { const f=e.target.files[0]; if(f) openImage(f); };
  $('#cam').onchange=h; $('#gal').onchange=h;
}

/* ---------- ritaglio / angoli ---------- */
let SRC = null; // canvas sorgente
async function openImage(file){
  const url = URL.createObjectURL(file);
  const img = new Image(); img.src = url; await img.decode().catch(()=>{});
  const k = Math.min(1, 3200 / Math.max(img.naturalWidth, img.naturalHeight));
  SRC = document.createElement('canvas'); SRC.width = Math.round(img.naturalWidth*k); SRC.height = Math.round(img.naturalHeight*k);
  SRC.getContext('2d').drawImage(img,0,0,SRC.width,SRC.height); URL.revokeObjectURL(url);
  showCrop();
}
function rotateSrc(){
  const c=document.createElement('canvas'); c.width=SRC.height; c.height=SRC.width;
  const x=c.getContext('2d'); x.translate(c.width,0); x.rotate(Math.PI/2); x.drawImage(SRC,0,0); SRC=c;
}
function showCrop(){
  setHeader('Allinea gli angoli','<button class="ghost" id="bk">Annulla</button>');
  $('#bk').onclick=showList;
  view.innerHTML = `<canvas id="crop"></canvas>
    <p class="hint">Trascina i 4 punti sugli angoli esterni del riquadro nero che contiene le due etichette (sinistra in alto → destra in basso).</p>
    <div class="bar"><button class="sec" id="rot">Ruota 90°</button><button id="go" class="acc">Leggi etichetta</button></div>`;
  const cv=$('#crop'), cx=cv.getContext('2d');
  const W=Math.min(view.clientWidth||360,760), s=W/SRC.width; cv.width=W; cv.height=Math.round(SRC.height*s);
  const m=0.06; let P=[[m,m],[1-m,m],[1-m,1-m],[m,1-m]].map(([a,b])=>[a*SRC.width,b*SRC.height]);
  let drag=-1;
  const draw=()=>{
    cx.clearRect(0,0,cv.width,cv.height); cx.drawImage(SRC,0,0,cv.width,cv.height);
    cx.lineWidth=2.5; cx.strokeStyle='#ffb703'; cx.fillStyle='rgba(255,183,3,.14)'; cx.beginPath();
    P.forEach(([x,y],i)=>i?cx.lineTo(x*s,y*s):cx.moveTo(x*s,y*s)); cx.closePath(); cx.fill(); cx.stroke();
    P.forEach(([x,y])=>{cx.beginPath();cx.arc(x*s,y*s,13,0,7);cx.fillStyle='#ffb703';cx.fill();cx.strokeStyle='#14202b';cx.lineWidth=2;cx.stroke();});
  };
  const pt=e=>{const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*cv.width/r.width/s,(e.clientY-r.top)*cv.height/r.height/s];};
  cv.onpointerdown=e=>{const [x,y]=pt(e);let b=1e9;P.forEach(([px,py],i)=>{const d=Math.hypot(px-x,py-y);if(d<b){b=d;drag=i;}});cv.setPointerCapture(e.pointerId);cv.onpointermove(e);};
  cv.onpointermove=e=>{if(drag<0)return;const [x,y]=pt(e);P[drag]=[Math.max(0,Math.min(SRC.width,x)),Math.max(0,Math.min(SRC.height,y))];draw();};
  cv.onpointerup=()=>drag=-1;
  $('#rot').onclick=()=>{rotateSrc();showCrop();};
  $('#go').onclick=()=>runOcr(P);
  draw();
}

/* ---------- raddrizzamento prospettico ---------- */
function solve(A,b){ const n=b.length; for(let i=0;i<n;i++){ let p=i; for(let r=i+1;r<n;r++) if(Math.abs(A[r][i])>Math.abs(A[p][i])) p=r; [A[i],A[p]]=[A[p],A[i]]; [b[i],b[p]]=[b[p],b[i]];
  for(let r=i+1;r<n;r++){ const f=A[r][i]/A[i][i]; for(let c=i;c<n;c++) A[r][c]-=f*A[i][c]; b[r]-=f*b[i]; } }
  const x=Array(n).fill(0); for(let i=n-1;i>=0;i--){ let s=b[i]; for(let c=i+1;c<n;c++) s-=A[i][c]*x[c]; x[i]=s/A[i][i]; } return x; }
function warp(P){
  const W=FW*SC, H=FH*SC, D=[[0,0],[W,0],[W,H],[0,H]], A=[], b=[];
  for(let i=0;i<4;i++){ const [u,v]=D[i],[x,y]=P[i];
    A.push([u,v,1,0,0,0,-u*x,-v*x]); b.push(x); A.push([0,0,0,u,v,1,-u*y,-v*y]); b.push(y); }
  const h=solve(A,b), out=document.createElement('canvas'); out.width=W; out.height=H;
  const sx=SRC.getContext('2d').getImageData(0,0,SRC.width,SRC.height), sd=sx.data, sw=SRC.width, sh=SRC.height;
  const ox=out.getContext('2d'), od=ox.createImageData(W,H), o=od.data;
  for(let v=0;v<H;v++) for(let u=0;u<W;u++){
    const d=h[6]*u+h[7]*v+1, x=(h[0]*u+h[1]*v+h[2])/d, y=(h[3]*u+h[4]*v+h[5])/d, i=(v*W+u)*4;
    if(x<0||y<0||x>=sw-1||y>=sh-1){o[i]=o[i+1]=o[i+2]=255;o[i+3]=255;continue;}
    const x0=x|0,y0=y|0,fx=x-x0,fy=y-y0,j=(y0*sw+x0)*4;
    for(let c=0;c<3;c++) o[i+c]=sd[j+c]*(1-fx)*(1-fy)+sd[j+4+c]*fx*(1-fy)+sd[j+sw*4+c]*(1-fx)*fy+sd[j+sw*4+4+c]*fx*fy;
    o[i+3]=255;
  }
  ox.putImageData(od,0,0); return out;
}

/* ---------- OCR ---------- */
let worker=null;
async function getWorker(){
  if(worker) return worker;
  const abs=p=>new URL(p,location.href).href;
  worker = await Tesseract.createWorker('eng', 1, { workerPath:abs('vendor/worker.min.js'), corePath:abs('vendor/core/'), langPath:abs('vendor/lang/'), gzip:true, cacheMethod:'none' });
  return worker;
}
// Crop di un campo, isolamento del testo scuro (elimina righe tratteggiate e filigrana grigie)
function prepCrop(wc, f){
  const [x1,y1,x2,y2]=f.rect, pad=2;
  const sx=Math.round((x1+pad-FRAME.x1)*SC), sy=Math.round((y1-FRAME.y1)*SC), sw=Math.round((x2-x1-2*pad)*SC), sh=Math.round((y2-y1-pad)*SC);
  const ctx=wc.getContext('2d'), id=ctx.getImageData(Math.max(0,sx),Math.max(0,sy),Math.max(4,sw),Math.max(4,sh)), d=id.data, n=d.length/4, g=new Uint8Array(n), hist=new Uint32Array(256);
  for(let i=0;i<n;i++){ const v=(d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11)|0; g[i]=v; hist[v]++; }
  // sfocatura 3x3 (uniforma i tratteggi) e soglia relativa al bianco della carta
  const bl=new Uint8Array(n), w=id.width, h=id.height;
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let a=0,c=0; for(let dy=-1;dy<=1;dy++){const yy=y+dy; if(yy<0||yy>=h)continue; for(let dx=-1;dx<=1;dx++){const xx=x+dx; if(xx<0||xx>=w)continue; a+=g[yy*w+xx];c++;}} bl[y*w+x]=a/c; }
  hist.fill(0); for(let i=0;i<n;i++) hist[bl[i]]++;
  const pct=p=>{let a=0,t=n*p;for(let i=0;i<256;i++){a+=hist[i];if(a>=t)return i;}return 255;};
  const hi=pct(.97), T=hi*0.34; let ink=0;
  for(let i=0;i<n;i++){ const b=(bl[i]<T && hi>90); if(b)ink++; d[i*4]=d[i*4+1]=d[i*4+2]=b?0:255; }
  const m=14, c=document.createElement('canvas'); c.width=id.width+2*m; c.height=id.height+2*m;
  const x=c.getContext('2d'); x.fillStyle='#fff'; x.fillRect(0,0,c.width,c.height); x.putImageData(id,m,m);
  return {canvas:c, ink:ink/n, img:c.toDataURL('image/png')};
}
function checkRatio(wc, r){
  const [x1,y1,x2,y2]=r, ins=3, ctx=wc.getContext('2d');
  const id=ctx.getImageData(Math.round((x1+ins-FRAME.x1)*SC),Math.round((y1+ins-FRAME.y1)*SC),Math.round((x2-x1-2*ins)*SC),Math.round((y2-y1-2*ins)*SC)), d=id.data; let dark=0,n=d.length/4;
  for(let i=0;i<d.length;i+=4) if((d[i]+d[i+1]+d[i+2])/3<95) dark++; return dark/n;
}
const WL={docnum:'0123456789',ata:'0123456789',hours:'0123456789:',cycles:'0123456789',wo:'0123456789',matclass:'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
 part:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/._',rpart:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/._',serial:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/._',rserial:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/._',
 cnumber:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/._',order:'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/._'};
const DATEWL='0123456789.abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const CODE=new Set(['part','rpart','serial','rserial','cnumber','order','ata','cond','hours','cycles','wo','aircraft','station','operator']);
function fixZero(s){ return s.replace(/\S+/g,t=>((t.match(/\d/g)||[]).length>=3 ? t.replace(/O(?=\d)|(?<=\d)O/g,'0') : t)); }
const MON={JAN:'Jan',FEB:'Feb',MAR:'Mar',APR:'Apr',MAY:'May',JUN:'Jun',JUL:'Jul',AUG:'Aug',SEP:'Sep',OCT:'Oct',NOV:'Nov',DEC:'Dec'};
function fixDate(s){
  const t=s.replace(/[,;:]/g,'.').replace(/\s+/g,'').replace(/[Oo](?=\d|\.)/g,'0');
  const m=t.match(/(\d{1,2})\.?([A-Za-z]{3})\.?(\d{4})/); if(!m) return s;
  const mon=MON[m[2].toUpperCase()]||m[2]; let d=m[1].padStart(2,'0'); if(!/[0-3]/.test(d[0])) d=d.replace(/^[68]/,'0'); return d+'.'+mon+'.'+m[3];
}
function clean(f, txt){
  let s=txt.replace(/[|]/g,'I').replace(/\r/g,'').replace(/["“”]/g,'').trim();
  if(f.multi) s=s.split('\n').map(l=>l.trimEnd()).filter(l=>l.trim()).join('\n'); else s=s.replace(/\s*\n\s*/g,' ');
  if(f.date) s=fixDate(s);
  if(f.digits) s=s.replace(/\D/g,'');
  if(CODE.has(f.k)) s=fixZero(s);
  return s;
}
async function runOcr(P){
  setHeader('Lettura in corso');
  view.innerHTML=`<div class="card"><p id="st" style="margin-top:0">Preparazione…</p><div class="prog"><i id="pg"></i></div><p class="hint">Al primo avvio il motore OCR impiega qualche secondo in piu'.</p></div>`;
  const st=$('#st'), pg=$('#pg'); const tick=(m,p)=>{st.textContent=m;pg.style.width=(p*100)+'%';};
  await new Promise(r=>setTimeout(r,30));
  let values=emptyValues(), thumbs={};
  try{
    tick('Raddrizzo l\'immagine…',.05); await new Promise(r=>setTimeout(r,30));
    const wc=warp(P);
    tick('Avvio motore OCR…',.1); const w=await getWorker();
    const list=FIELDS.filter(f=>f.type!=='reason');
    for(let i=0;i<list.length;i++){
      const f=list[i]; tick(`Leggo: ${f.it}`, .12+.85*i/list.length);
      const c=prepCrop(wc,f); thumbs[f.k]=c.img;
      if(c.ink<0.004) continue;
      await w.setParameters({tessedit_pageseg_mode:f.multi?'6':'7', preserve_interword_spaces:'1', user_defined_dpi:'300', tessedit_char_whitelist: WL[f.k]||(f.date?DATEWL:'')});
      const {data}=await w.recognize(c.canvas); values[f.k]=clean(f,data.text||'');
    }
    const rf=FIELDS.find(f=>f.type==='reason'); let best=null,bv=0.1;
    for(const [name,r] of Object.entries(rf.boxes)){ const v=checkRatio(wc,r); if(v>bv){bv=v;best=name;} }
    values.reason=best||'';
    tick('Fatto',1);
  }catch(e){ console.error(e); toast('Lettura non riuscita: compila a mano'); }
  applyCarry(values);
  showForm(values,null,thumbs,true);
}

/* ---------- dati e memoria dei campi ---------- */
function emptyValues(){ const v={}; FIELDS.forEach(f=>v[f.k]=''); return v; }
function lastRecord(){ return records().sort((a,b)=>b.savedAt-a.savedAt)[0]; }
function applyCarry(v){ const l=lastRecord(); if(!l) return; FIELDS.filter(f=>f.carry).forEach(f=>{ if(!v[f.k]) v[f.k]=l.v[f.k]||''; }); }
function suggestions(k){ const c={}; records().forEach(r=>{const x=(r.v[k]||'').trim(); if(x) c[x]=(c[x]||0)+1;}); return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,40).map(e=>e[0]); }

/* ---------- modulo di verifica ---------- */
function fieldHtml(f, v, thumbs){
  const sugg = (!f.nosug && !f.multi) ? suggestions(f.k) : [];
  const lab=`<label class="fl" for="f_${f.k}">${esc(f.it)} <small>· ${esc(f.en)}</small></label>`;
  if(f.type==='reason') return `<div class="f">${lab}<div class="chips" id="reason">${Object.keys(f.boxes).map(n=>`<button type="button" class="chip ${v.reason===n?'on':''}" data-v="${n}">${n}</button>`).join('')}</div></div>`;
  const th = thumbs[f.k] ? `<img class="thumb ${f.multi?'tall':''}" src="${thumbs[f.k]}" alt="">` : '';
  const inp = f.multi ? `<textarea id="f_${f.k}" data-k="${f.k}" spellcheck="false" autocapitalize="off">${esc(v[f.k])}</textarea>`
    : `<input type="text" id="f_${f.k}" data-k="${f.k}" value="${esc(v[f.k])}" autocomplete="off" autocapitalize="off" spellcheck="false" ${f.digits?'inputmode="numeric"':''} ${sugg.length?`list="dl_${f.k}"`:''}>`;
  return `<div class="f ${f.size}">${lab}${th}${inp}${sugg.length?`<datalist id="dl_${f.k}">${sugg.map(s=>`<option value="${esc(s)}">`).join('')}</datalist>`:''}</div>`;
}
function showForm(values, id, thumbs, fresh){
  const v={...emptyValues(),...values};
  setHeader(id?'Modifica etichetta':'Verifica dati','<button class="ghost" id="bk">Annulla</button>');
  $('#bk').onclick=async()=>{ localStorage.removeItem(DRAFT); showList(); };
  const sec=(side,t)=>`<h2>${t}</h2><div class="card"><div class="grid">${FIELDS.filter(f=>f.side===side).map(f=>fieldHtml(f,v,thumbs)).join('')}</div></div>`;
  view.innerHTML = (fresh?`<p class="hint">Controlla i campi: sotto ogni etichetta vedi il ritaglio letto dalla foto. Correggi se serve, poi salva.</p>`:'') +
    sec('in','Installation / Serviceable') + sec('out','Removal / Unserviceable') +
    `<div class="bar">${id?'<button class="danger" id="del" style="flex:.6">Elimina</button>':''}<button id="sv">Salva</button>${id?'':'<button class="acc" id="sv2">Salva e scansiona</button>'}</div>`;
  const draft=()=>save(DRAFT,{v});
  view.querySelectorAll('[data-k]').forEach(el=>el.oninput=()=>{v[el.dataset.k]=el.value;draft();});
  view.querySelectorAll('#reason .chip').forEach(b=>b.onclick=()=>{ v.reason = v.reason===b.dataset.v ? '' : b.dataset.v; view.querySelectorAll('#reason .chip').forEach(x=>x.classList.toggle('on',x.dataset.v===v.reason)); draft(); });
  const commit=async next=>{
    const recs=records();
    if(!id && v.docnum && recs.some(r=>r.v.docnum===v.docnum)){ if(!await ask(`Esiste gia' un'etichetta n. ${v.docnum}. Aggiungere comunque?`,'Aggiungi')) return; }
    if(id){ const r=recs.find(x=>x.id===id); r.v=v; r.savedAt=Date.now(); } else recs.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()+Math.random()),savedAt:Date.now(),v});
    save(KEY,recs); localStorage.removeItem(DRAFT); toast('Etichetta salvata'); next?showPicker():showList();
  };
  $('#sv').onclick=()=>commit(false); const s2=$('#sv2'); if(s2) s2.onclick=()=>commit(true);
  const d=$('#del'); if(d) d.onclick=async()=>{ if(await ask('Eliminare questa etichetta?','Elimina',true)){ save(KEY,records().filter(r=>r.id!==id)); showList(); } };
  window.scrollTo(0,0);
}

/* ---------- esportazione .xls ---------- */
function exportXls(){
  const recs=records().sort((a,b)=>a.savedAt-b.savedAt); if(!recs.length) return;
  const head=['Label No.','Mat.Class'].concat(
    FIELDS.filter(f=>f.side==='in'&&!['docnum','matclass'].includes(f.k)).map(f=>f.en),
    FIELDS.filter(f=>f.side==='out').map(f=>'Removal - '+f.en)
  ); head.push('Scanned at');
  const keys=['docnum','matclass'].concat(FIELDS.filter(f=>f.side==='in'&&!['docnum','matclass'].includes(f.k)).map(f=>f.k), FIELDS.filter(f=>f.side==='out').map(f=>f.k));
  const rows=recs.map(r=>keys.map(k=>r.v[k]??'').concat([new Date(r.savedAt).toLocaleString('it-IT')]));
  const ws=XLSX.utils.aoa_to_sheet([head,...rows]);
  ws['!cols']=head.map((h,i)=>({wch:Math.min(48,Math.max(h.length+2,...rows.map(r=>String(r[i]).split('\n')[0].length+2)))}));
  const wb=XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb,ws,'Etichette');
  const out=XLSX.write(wb,{bookType:'biff8',type:'array'});
  const name='etichette_'+new Date().toISOString().slice(0,10)+'.xls';
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([out],{type:'application/vnd.ms-excel'})); a.download=name; document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},4000); toast('File '+name+' scaricato');
}

/* ---------- avvio ---------- */
(function init(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
  const d=load(DRAFT,null);
  if(d && Object.values(d.v||{}).some(Boolean)){
    view.innerHTML='';
    ask('Hai una scheda non salvata. Riprenderla?','Riprendi').then(ok=>{ if(ok) showForm(d.v,null,{}); else { localStorage.removeItem(DRAFT); showList(); } });
  } else showList();
})();
