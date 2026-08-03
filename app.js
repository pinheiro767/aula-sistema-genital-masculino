'use strict';
const CONFIG={maxNumberedImages:45,stopAfterMissing:45,imageFolder:'assets/img/',pdfName:'atlas-sistema-genital-45-paginas.pdf'};
const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)];
const state={pages:[],index:0,scale:1,x:0,y:0,fitScale:1,drawing:false,erasing:false,history:[],pointer:null,last:{x:0,y:0},speech:null,ocrWorker:null};
const els={img:$('#pageImage'),canvas:$('#annotationCanvas'),layer:$('#transformLayer'),stage:$('#stage'),thumbs:$('#thumbs'),counter:$('#counter'),loading:$('#loading'),note:$('#note'),ocr:$('#ocrText'),ocrStatus:$('#ocrStatus'),zoom:$('#zoomRange'),zoomLabel:$('#zoomLabel'),drawMode:$('#drawMode'),color:$('#penColor'),size:$('#penSize'),tools:$('#toolsPanel'),sidebar:$('#sidebar'),toast:$('#toast')};
const keyFor=(type,i=state.index)=>`atlas:${type}:${state.pages[i]?.id||i}`;
function toast(msg){els.toast.textContent=msg;els.toast.classList.add('show');clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove('show'),2300)}
function pageTitle(p,i){return p.title||`Página ${i+1}`}
async function discoverNumbered(){let missing=0;const found=[];for(let n=1;n<=CONFIG.maxNumberedImages&&missing<CONFIG.stopAfterMissing;n++){const src=`${CONFIG.imageFolder}${n}.png`;const ok=await imageExists(src);if(ok){found.push({id:`n${n}`,src,title:`Página ${n}`,alt:`Material didático, página ${n}`});missing=0}else missing++}return found}
function imageExists(src){return new Promise(r=>{const im=new Image();im.onload=()=>r(true);im.onerror=()=>r(false);im.src=src+`?v=1`})}
async function init(){state.pages=await discoverNumbered();if(!state.pages.length){toast('Nenhuma imagem encontrada em assets/img/');return}renderThumbs();bind();await showPage(0);if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});}
function renderThumbs(){els.thumbs.innerHTML='';state.pages.forEach((p,i)=>{const b=document.createElement('button');b.className='thumb';b.type='button';b.role='listitem';b.setAttribute('aria-label',`Abrir ${pageTitle(p,i)}`);b.innerHTML=`<img src="${p.src}" alt=""><span>${i+1}</span>`;b.onclick=()=>showPage(i);els.thumbs.appendChild(b)})}
async function showPage(i){if(!state.pages.length)return;saveNote();saveCanvas();state.index=(i+state.pages.length)%state.pages.length;state.history=[];els.loading.hidden=false;const p=state.pages[state.index];els.img.alt=p.alt||pageTitle(p,state.index);els.img.src=p.src;await els.img.decode().catch(()=>{});setupCanvas();fit();loadCanvas();els.note.value=localStorage.getItem(keyFor('note'))||'';els.ocr.value=localStorage.getItem(keyFor('ocr'))||'';els.ocrStatus.textContent=els.ocr.value?'Texto OCR salvo nesta página.':'Use OCR para extrair o texto desta imagem.';els.counter.textContent=`${state.index+1} de ${state.pages.length}`;$$('.thumb').forEach((t,n)=>t.classList.toggle('active',n===state.index));$$('.thumb')[state.index]?.scrollIntoView({block:'nearest'});els.loading.hidden=true;announce(`Página ${state.index+1} de ${state.pages.length}`)}
function setupCanvas(){const w=els.img.naturalWidth,h=els.img.naturalHeight;els.img.width=w;els.img.height=h;els.canvas.width=w;els.canvas.height=h;els.layer.style.width=w+'px';els.layer.style.height=h+'px'}
function fit(){const pad=45;const sx=(els.stage.clientWidth-pad*2)/els.img.naturalWidth;const sy=(els.stage.clientHeight-pad*2)/els.img.naturalHeight;state.fitScale=Math.min(sx,sy);state.scale=state.fitScale;state.x=0;state.y=0;updateTransform()}
function updateTransform(){els.layer.style.transform=`translate(-50%,-50%) translate(${state.x}px,${state.y}px) scale(${state.scale})`;const pct=Math.round(state.scale/state.fitScale*100);els.zoom.value=Math.max(50,Math.min(500,pct));els.zoomLabel.value=els.zoomLabel.textContent=`${pct}%`}
function setZoom(ratio,center){const ns=Math.max(state.fitScale*.5,Math.min(state.fitScale*5,ratio));if(center){const rect=els.stage.getBoundingClientRect();const cx=center.x-rect.left-rect.width/2,cy=center.y-rect.top-rect.height/2;const f=ns/state.scale;state.x=cx-(cx-state.x)*f;state.y=cy-(cy-state.y)*f}state.scale=ns;updateTransform()}
function saveNote(){if(!state.pages.length)return;localStorage.setItem(keyFor('note'),els.note.value)}
let noteTimer;els.note?.addEventListener('input',()=>{clearTimeout(noteTimer);$('#saveState').textContent='Salvando…';noteTimer=setTimeout(()=>{saveNote();$('#saveState').textContent='Salvo automaticamente'},400)});
function saveCanvas(){if(!state.pages.length||!els.canvas.width)return;try{localStorage.setItem(keyFor('ink'),els.canvas.toDataURL('image/png'))}catch(e){toast('Armazenamento cheio; exporte o PDF e limpe anotações antigas.') }}
function loadCanvas(){const ctx=els.canvas.getContext('2d');ctx.clearRect(0,0,els.canvas.width,els.canvas.height);const data=localStorage.getItem(keyFor('ink'));if(data){const im=new Image();im.onload=()=>ctx.drawImage(im,0,0);im.src=data}}
function snapshot(){try{state.history.push(els.canvas.toDataURL());if(state.history.length>15)state.history.shift()}catch{}}
function canvasPoint(e){const r=els.canvas.getBoundingClientRect();return{x:(e.clientX-r.left)*els.canvas.width/r.width,y:(e.clientY-r.top)*els.canvas.height/r.height}}
function drawStart(e){if(!els.drawMode.checked)return;snapshot();state.drawing=true;els.canvas.setPointerCapture(e.pointerId);state.last=canvasPoint(e);e.preventDefault()}
function drawMove(e){if(!state.drawing)return;const p=canvasPoint(e),ctx=els.canvas.getContext('2d');ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=+els.size.value;ctx.strokeStyle=els.color.value;ctx.globalCompositeOperation=state.erasing?'destination-out':'source-over';ctx.beginPath();ctx.moveTo(state.last.x,state.last.y);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.restore();state.last=p;e.preventDefault()}
function drawEnd(){if(state.drawing){state.drawing=false;saveCanvas()}}
function undo(){const data=state.history.pop();if(!data)return;const ctx=els.canvas.getContext('2d'),im=new Image();ctx.clearRect(0,0,els.canvas.width,els.canvas.height);im.onload=()=>{ctx.drawImage(im,0,0);saveCanvas()};im.src=data}
function speak(text){speechSynthesis.cancel();if(!text.trim())return toast('Não há texto para ler.');const u=new SpeechSynthesisUtterance(text);u.lang='pt-BR';u.rate=.92;speechSynthesis.speak(u)}
function readPage(){const p=state.pages[state.index];speak(`${pageTitle(p,state.index)}. ${p.alt||''}. ${els.ocr.value||''}. Anotações: ${els.note.value||'sem anotações'}`)}
const OCR_CDNS=[
 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js',
 'https://unpkg.com/tesseract.js@5/dist/tesseract.min.js',
 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/tesseract.min.js'
];
async function ensureTesseract(){
 if(window.Tesseract?.createWorker)return window.Tesseract;
 let lastError;
 for(const src of OCR_CDNS){
  try{await loadScript(src,20000);if(window.Tesseract?.createWorker)return window.Tesseract}
  catch(e){lastError=e}
 }
 throw lastError||new Error('Biblioteca OCR indisponível');
}
function ocrSource(){
 const c=document.createElement('canvas'),ctx=c.getContext('2d',{willReadFrequently:true});
 const max=2200,ratio=Math.min(1,max/Math.max(els.img.naturalWidth,els.img.naturalHeight));
 c.width=Math.max(1,Math.round(els.img.naturalWidth*ratio));c.height=Math.max(1,Math.round(els.img.naturalHeight*ratio));
 ctx.drawImage(els.img,0,0,c.width,c.height);
 const data=ctx.getImageData(0,0,c.width,c.height),d=data.data;
 for(let i=0;i<d.length;i+=4){const y=.299*d[i]+.587*d[i+1]+.114*d[i+2];const v=y>150?255:Math.max(0,Math.min(255,(y-55)*1.45));d[i]=d[i+1]=d[i+2]=v}
 ctx.putImageData(data,0,0);return c;
}
async function runOCR(){
 const button=$('#ocrBtn');button.disabled=true;els.ocrStatus.textContent='Preparando o OCR…';
 let worker;
 try{
  const T=await ensureTesseract();
  const logger=m=>{if(typeof m.progress==='number'){const labels={'loading tesseract core':'Carregando mecanismo','initializing tesseract':'Inicializando','loading language traineddata':'Baixando idioma português','initializing api':'Preparando idioma','recognizing text':'Lendo a imagem'};els.ocrStatus.textContent=`${labels[m.status]||m.status}: ${Math.round(m.progress*100)}%`}};
  els.ocrStatus.textContent='Carregando idioma português…';
  worker=await T.createWorker('por',1,{logger});
  await worker.setParameters({preserve_interword_spaces:'1'});
  const result=await worker.recognize(ocrSource());
  const text=(result?.data?.text||'').replace(/\n{3,}/g,'\n\n').trim();
  if(!text)throw new Error('Nenhum texto foi reconhecido');
  els.ocr.value=text;localStorage.setItem(keyFor('ocr'),text);
  els.ocrStatus.textContent='Reconhecimento concluído e salvo nesta página.';toast('OCR concluído');
 }catch(e){
  console.error('Falha no OCR:',e);
  const local=location.protocol==='file:';
  els.ocrStatus.textContent=local?'Abra o projeto por um servidor local ou GitHub Pages. O OCR não funciona ao abrir index.html diretamente.':'Não foi possível baixar/iniciar o OCR. Verifique a internet, bloqueadores de conteúdo e tente novamente.';
  toast('Falha no OCR — veja a mensagem no painel');
 }finally{try{await worker?.terminate()}catch{}button.disabled=false}
}
function loadScript(src,timeout=20000){return new Promise((res,rej)=>{if([...document.scripts].some(x=>x.src===src)){return window.Tesseract?res():rej(new Error('Script carregado sem Tesseract'))}const s=document.createElement('script');const timer=setTimeout(()=>{s.remove();rej(new Error('Tempo esgotado ao carregar '+src))},timeout);s.src=src;s.crossOrigin='anonymous';s.referrerPolicy='no-referrer';s.onload=()=>{clearTimeout(timer);res()};s.onerror=()=>{clearTimeout(timer);s.remove();rej(new Error('Falha ao carregar '+src))};document.head.appendChild(s)})}
function addLocalImages(files){[...files].forEach((f,n)=>{const id=`local-${Date.now()}-${n}`;state.pages.push({id,src:URL.createObjectURL(f),title:f.name,alt:`Imagem adicionada: ${f.name}`})});renderThumbs();showPage(state.pages.length-files.length);toast(`${files.length} imagem(ns) adicionada(s) nesta sessão`)}
function bind(){
 $('#prevBtn').onclick=()=>showPage(state.index-1);$('#nextBtn').onclick=()=>showPage(state.index+1);$('#fitBtn').onclick=fit;
 $('#zoomInBtn').onclick=()=>setZoom(state.scale*1.2);$('#zoomOutBtn').onclick=()=>setZoom(state.scale/1.2);els.zoom.oninput=()=>setZoom(state.fitScale*(+els.zoom.value/100));
 els.stage.addEventListener('wheel',e=>{e.preventDefault();setZoom(state.scale*(e.deltaY<0?1.12:.89),{x:e.clientX,y:e.clientY})},{passive:false});
 let pan=false,start={};els.stage.addEventListener('pointerdown',e=>{if(els.drawMode.checked)return;pan=true;start={x:e.clientX-state.x,y:e.clientY-state.y};els.stage.setPointerCapture(e.pointerId)});els.stage.addEventListener('pointermove',e=>{if(pan){state.x=e.clientX-start.x;state.y=e.clientY-start.y;updateTransform()}});els.stage.addEventListener('pointerup',()=>pan=false);
 els.canvas.addEventListener('pointerdown',drawStart);els.canvas.addEventListener('pointermove',drawMove);els.canvas.addEventListener('pointerup',drawEnd);els.canvas.addEventListener('pointercancel',drawEnd);
 els.drawMode.onchange=()=>{els.canvas.style.pointerEvents=els.drawMode.checked?'auto':'none';toast(els.drawMode.checked?'Modo desenho ativado':'Modo navegação ativado')};els.canvas.style.pointerEvents='none';
 $('#eraserBtn').onclick=()=>{state.erasing=!state.erasing;$('#eraserBtn').textContent=state.erasing?'Borracha ativa':'Borracha';toast(state.erasing?'Borracha ativada':'Caneta ativada')};$('#undoBtn').onclick=undo;$('#clearBtn').onclick=()=>{if(confirm('Apagar as anotações desta página?')){snapshot();els.canvas.getContext('2d').clearRect(0,0,els.canvas.width,els.canvas.height);saveCanvas()}};
 $('#readBtn').onclick=readPage;$('#readOcrBtn').onclick=()=>speak(els.ocr.value);$('#ocrBtn').onclick=runOCR;$('#copyOcrBtn').onclick=async()=>{await navigator.clipboard.writeText(els.ocr.value);toast('Texto copiado')};
 $('#fullscreenBtn').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();
 $('#addImagesBtn').onclick=()=>$('#imageInput').click();$('#imageInput').onchange=e=>addLocalImages(e.target.files);
 $('#menuBtn').onclick=()=>els.tools.classList.toggle('open');
 $('#pdfBtn').onclick=()=>$('#pdfDialog').showModal();$('#confirmPdfBtn').onclick=generatePDF;
 window.addEventListener('resize',()=>{const ratio=state.scale/state.fitScale;const old=state.fitScale;const pad=45;state.fitScale=Math.min((els.stage.clientWidth-pad*2)/els.img.naturalWidth,(els.stage.clientHeight-pad*2)/els.img.naturalHeight);if(Math.abs(state.scale-old)<.01)fit();else setZoom(state.fitScale*ratio)});
 document.addEventListener('keydown',e=>{if(['TEXTAREA','INPUT'].includes(document.activeElement.tagName))return;if(e.key==='ArrowRight')showPage(state.index+1);if(e.key==='ArrowLeft')showPage(state.index-1);if(e.key==='+')setZoom(state.scale*1.2);if(e.key==='-')setZoom(state.scale/1.2);if(e.key==='0')fit();if(e.key.toLowerCase()==='d'){els.drawMode.checked=!els.drawMode.checked;els.drawMode.onchange()}if(e.key.toLowerCase()==='r')readPage()});
}
function announce(t){let a=$('#srAnnounce');if(!a){a=document.createElement('div');a.id='srAnnounce';a.className='skip-link';a.setAttribute('aria-live','polite');document.body.appendChild(a)}a.textContent=t}
async function composePage(pageIndex,includeNote){const p=state.pages[pageIndex];const im=await loadImage(p.src);const max=1600,scale=Math.min(1,max/im.width);const note=includeNote?(localStorage.getItem(`atlas:note:${p.id}`)||'').trim():'';const noteH=note?Math.max(150,Math.ceil(note.length/75)*38+65):0;const c=document.createElement('canvas');c.width=Math.round(im.width*scale);c.height=Math.round(im.height*scale)+noteH;const ctx=c.getContext('2d');ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(im,0,0,c.width,Math.round(im.height*scale));const ink=localStorage.getItem(`atlas:ink:${p.id}`);if(ink){const ai=await loadImage(ink);ctx.drawImage(ai,0,0,c.width,Math.round(im.height*scale))}if(note){ctx.fillStyle='#111';ctx.font='28px system-ui';ctx.fillText(`Anotações — ${pageTitle(p,pageIndex)}`,32,Math.round(im.height*scale)+48);ctx.font='22px system-ui';wrapText(ctx,note,32,Math.round(im.height*scale)+88,c.width-64,32)}return c.toDataURL('image/jpeg',.88)}
function loadImage(src){return new Promise((res,rej)=>{const i=new Image();i.crossOrigin='anonymous';i.onload=()=>res(i);i.onerror=rej;i.src=src})}
function wrapText(ctx,text,x,y,maxWidth,lineHeight){const words=text.split(/\s+/);let line='';for(const w of words){const test=line+w+' ';if(ctx.measureText(test).width>maxWidth&&line){ctx.fillText(line,x,y);line=w+' ';y+=lineHeight}else line=test}ctx.fillText(line,x,y)}
async function generatePDF(){saveNote();saveCanvas();const all=$('input[name="pdfScope"]:checked').value==='all';const idx=all?state.pages.map((_,i)=>i):[state.index];const prog=$('#pdfProgress');prog.textContent='Preparando páginas…';const jpegs=[];for(let k=0;k<idx.length;k++){prog.textContent=`Processando ${k+1} de ${idx.length}…`;jpegs.push(await composePage(idx[k],$('#pdfNotes').checked));await new Promise(r=>setTimeout(r,0))}prog.textContent='Montando PDF…';const blob=buildPdf(jpegs);const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=CONFIG.pdfName;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),3000);prog.textContent='PDF criado.';setTimeout(()=>$('#pdfDialog').close(),500);toast('PDF gerado com sucesso')}
function buildPdf(dataUrls){const enc=new TextEncoder();const parts=[],offsets=[0];let len=0;const push=s=>{const b=typeof s==='string'?enc.encode(s):s;parts.push(b);len+=b.length};push('%PDF-1.4\n%âãÏÓ\n');const objects=[];const pageIds=[],imgIds=[];let id=1;const catalog=id++,pages=id++;for(let i=0;i<dataUrls.length;i++){pageIds.push(id++);imgIds.push(id++);id++}const addObj=(oid,chunks)=>{offsets[oid]=len;push(`${oid} 0 obj\n`);chunks.forEach(push);push('\nendobj\n')};addObj(catalog,[`<< /Type /Catalog /Pages ${pages} 0 R >>`]);addObj(pages,[`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map(x=>`${x} 0 R`).join(' ')}] >>`]);for(let i=0;i<dataUrls.length;i++){const raw=atob(dataUrls[i].split(',')[1]);const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const dims=jpegDims(bytes);const page=pageIds[i],img=imgIds[i],content=img+1;const pw=595.28,ph=841.89,ratio=Math.min(pw/dims.w,ph/dims.h),w=dims.w*ratio,h=dims.h*ratio,x=(pw-w)/2,y=(ph-h)/2;addObj(page,[`<< /Type /Page /Parent ${pages} 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i} ${img} 0 R >> >> /Contents ${content} 0 R >>`]);addObj(img,[`<< /Type /XObject /Subtype /Image /Width ${dims.w} /Height ${dims.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`,bytes,'\nendstream']);const stream=`q\n${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm\n/Im${i} Do\nQ`;addObj(content,[`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}\nendstream`])}const xref=len;push(`xref\n0 ${id}\n0000000000 65535 f \n`);for(let i=1;i<id;i++)push(String(offsets[i]).padStart(10,'0')+' 00000 n \n');push(`trailer\n<< /Size ${id} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);return new Blob(parts,{type:'application/pdf'})}
function jpegDims(b){let i=2;while(i<b.length){if(b[i]!==0xFF){i++;continue}const marker=b[i+1],len=(b[i+2]<<8)+b[i+3];if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker))return{h:(b[i+5]<<8)+b[i+6],w:(b[i+7]<<8)+b[i+8]};i+=2+len}return{w:1200,h:1200}}
init();
