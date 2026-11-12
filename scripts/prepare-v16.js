const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=process.cwd(),www=path.join(root,'www'),main=path.join(root,'android','app','src','main');
const R=p=>fs.readFileSync(p,'utf8'),W=(p,s)=>fs.writeFileSync(p,s),mkdir=p=>fs.mkdirSync(p,{recursive:true});
function alphaArt(raw,w,h){
  const out=Buffer.alloc(w*h*4);
  for(let i=0;i<w*h;i++){
    const r=raw[i*4],g=raw[i*4+1],b=raw[i*4+2],a=raw[i*4+3];
    const lum=(r*0.299+g*0.587+b*0.114);
    const opacity=Math.max(0,Math.min(255,Math.round((255-lum)*1.15)));
    out[i*4]=0;out[i*4+1]=0;out[i*4+2]=0;out[i*4+3]=Math.round(opacity*a/255);
  }
  return out;
}
async function makeIcons(){
  const src=path.join(www,'travelmate-tm-falcon.png');
  if(!fs.existsSync(src))throw Error('Missing approved falcon artwork: www/travelmate-tm-falcon.png');
  const trimmed=await sharp(src).trim({background:'#fff',threshold:14}).png().toBuffer();
  const legacyMark=await sharp(trimmed).resize(800,800,{fit:'contain',background:'#fff'}).png().toBuffer();
  const square=path.join(www,'travelmate-v16-icon-square.png');
  await sharp({create:{width:1024,height:1024,channels:4,background:'#fff'}})
    .composite([{input:legacyMark,gravity:'centre'}]).png().toFile(square);
  for(const size of [192,512]){
    await sharp(square).resize(size,size).png().toFile(path.join(www,`travelmate-v16-${size}.png`));
  }
  // Adaptive icon foreground: remove white paper pixels so Android's launcher background remains visible.
  const {data,info}=await sharp(trimmed).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const transparent=alphaArt(data,info.width,info.height);
  const fgBase=await sharp(transparent,{raw:{width:info.width,height:info.height,channels:4}})
    .resize(620,620,{fit:'contain'}).png().toBuffer();
  const fg1024=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:fgBase,gravity:'centre'}]).png().toBuffer();
  const density={mdpi:108,hdpi:162,xhdpi:216,xxhdpi:324,xxxhdpi:432};
  for(const [d,size] of Object.entries(density)){
    const dir=path.join(main,'res',`drawable-${d}`);mkdir(dir);
    await sharp(fg1024).resize(size,size).png().toFile(path.join(dir,'ic_launcher_foreground.png'));
    await sharp(fg1024).resize(size,size).png().toFile(path.join(dir,'ic_launcher_monochrome.png'));
  }
  mkdir(path.join(main,'res','mipmap-anydpi-v26'));
  const xml='<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_monochrome"/></adaptive-icon>';
  W(path.join(main,'res','mipmap-anydpi-v26','ic_launcher.xml'),xml);
  W(path.join(main,'res','mipmap-anydpi-v26','ic_launcher_round.xml'),xml);
  mkdir(path.join(main,'res','values'));
  W(path.join(main,'res','values','ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
  const dens={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
  for(const [d,size] of Object.entries(dens)){
    const dir=path.join(main,'res',`mipmap-${d}`);mkdir(dir);
    await sharp(square).resize(size,size).png().toFile(path.join(dir,'ic_launcher.png'));
    await sharp(square).resize(size,size).png().toFile(path.join(dir,'ic_launcher_round.png'));
  }
}

function patchActivityEditor(){
  const p=path.join(www,'v5-edit-modal.js');
  if(!fs.existsSync(p))throw Error('Missing www/v5-edit-modal.js; cannot repair activity editor.');
  let s=R(p);
  s=s.replaceAll('var(--card,#fff)','var(--surface,#fff)')
     .replaceAll('var(--input-bg,#fff)','var(--surface2,#fff)');
  s=s.replace('.tm-edit-dialog{width:min(100%,560px);max-height:92dvh;overflow:auto;background:var(--surface,#fff);color:var(--text,#172033);',
    '.tm-edit-dialog{width:min(100%,560px);max-height:calc(var(--tm-vv-height,100dvh) - 24px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;background:var(--surface,#fff);color:var(--text,#172033);');
  s=s.replace('.tm-edit-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.58);display:flex;align-items:flex-end;justify-content:center;padding:12px}',
    '.tm-edit-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.62);display:flex;align-items:flex-end;justify-content:center;padding:12px;overflow:hidden;touch-action:pan-y}');
  s=s.replace('color:inherit;font:inherit;font-size:16px;outline:none}',
    'color:var(--text,#172033);font:inherit;font-size:16px;outline:none}');
  s=s.replace('    .tm-edit-actions{display:flex;',
    '    .tm-edit-field input::placeholder,.tm-edit-field textarea::placeholder{color:var(--muted,#64748b);opacity:1}\n    .tm-edit-actions{display:flex;');
  if(!s.includes('function syncViewport(){')){
    const viewport = `
  function syncViewport(){
    const vv=window.visualViewport;
    const h=vv?.height||window.innerHeight;
    const top=vv?.offsetTop||0;
    document.documentElement.style.setProperty("--tm-vv-height",h+"px");
    const backdrop=document.getElementById("tm-edit-backdrop");
    if(backdrop){backdrop.style.top=top+"px";backdrop.style.height=h+"px";}
  }
  window.addEventListener("resize",syncViewport,{passive:true});
  window.visualViewport?.addEventListener("resize",syncViewport,{passive:true});
  window.visualViewport?.addEventListener("scroll",syncViewport,{passive:true});
  document.addEventListener("focusin",e=>{
    if(!e.target.closest?.(".tm-edit-dialog"))return;
    setTimeout(()=>{syncViewport();e.target.scrollIntoView({block:"nearest",behavior:"smooth"});},180);
  });
`;
    s=s.replace('  function closeModal() {',viewport+'\n  function closeModal() {');
  }
  s=s.replace('    backdrop.addEventListener("click", e => {','    syncViewport();\\n    backdrop.addEventListener("click", e => {');
  s=s.replace('    document.body.appendChild(backdrop);\\n    document.addEventListener("keydown", onKey);',
    '    document.body.appendChild(backdrop);\\n    syncViewport();\\n    document.addEventListener("keydown", onKey);');
  W(p,s);
}
function patchPrintableReports(){
  const p=path.join(www,'v12-ultimate.js');
  if(!fs.existsSync(p))throw Error('Missing www/v12-ultimate.js; cannot repair PDF layout.');
  let s=R(p);
  const printCss=`
      /* TravelMate V16 print layout normalization */
      .v7-card,.v8-card,.activity-card,.expense-card,.settings-card,.trip-cover{display:block!important;width:100%!important;margin:12px 0!important;padding:13px!important;border:1px solid #d7dee8!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}
      .v7-grid,.v8-report-summary{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important;margin:10px 0!important}
      .v7-stat,.v8-report-summary>div{display:block!important;min-width:0!important;padding:10px!important;border:1px solid #e1e7ef!important;border-radius:8px!important;background:#f7f9fc!important}
      .v7-stat b,.v8-report-summary b{display:block!important;font-size:14pt!important;margin:4px 0!important;color:#172b46!important;overflow-wrap:anywhere}
      .v7-row,.v8-row{display:flex!important;flex-direction:row!important;align-items:flex-start!important;justify-content:space-between!important;gap:10px!important;flex-wrap:wrap!important;width:100%!important}
      .v7-row>*,.v8-row>*{min-width:0!important;overflow-wrap:anywhere}
      .v7-expense{display:block!important;width:100%!important;padding:11px 0!important;margin:0!important;border:0!important;border-top:1px solid #dce3ec!important;break-inside:avoid;page-break-inside:avoid}
      .v7-expense:first-child{border-top:0!important}
      .v7-expense h4{font-size:12pt!important}
      .v7-expense p{margin:5px 0!important;font-size:9.5pt!important;line-height:1.5!important}
      .v7-chip{display:inline-block!important;padding:3px 7px!important;border-radius:20px!important;background:#eef2f7!important;color:#334155!important}
      .v7-actions,.v8-actions,button,.tm11-btn,.tm15-btn{display:none!important}
      .v7-tools{display:block!important}
      .v7-bar{height:7px!important;background:#e8edf3!important;border-radius:20px!important;overflow:hidden!important}
      .v7-bar i{display:block!important;background:#3978e8!important;height:100%!important}
      table{width:100%!important;border-collapse:collapse!important;table-layout:fixed!important;margin:12px 0!important;font-size:9pt!important}
      thead{display:table-header-group!important}tr{break-inside:avoid!important;page-break-inside:avoid!important}
      th,td{border:1px solid #d5dde7!important;padding:7px 6px!important;text-align:start!important;vertical-align:top!important;overflow-wrap:anywhere!important}
      th{background:#eaf0f7!important;color:#172b46!important;font-weight:700!important}
      @page{size:A4 portrait;margin:13mm}@media print{body{padding:0!important}}
`;
  const reportStart=s.indexOf('function reportHtml()');
  const reportEnd=s.indexOf('\n  async function printFinancialReport()',reportStart);
  if(reportStart<0||reportEnd<0)throw Error('Could not locate reportHtml safely.');
  let report=s.slice(reportStart,reportEnd);
  if(!report.includes('TravelMate V16 print layout normalization')){
    report=report.replace('</style>',printCss+'</style>');
    s=s.slice(0,reportStart)+report+s.slice(reportEnd);
  }
  const old='body{font-family:Arial;padding:18px;color:#172033}button{display:none!important}';
  const tripCss='*{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;padding:18px;color:#172033;line-height:1.55;font-size:11pt}h1,h2,h3,h4{color:#172b46;margin:0 0 9px}.v7-card,.v8-card,.trip-cover{display:block!important;width:100%!important;margin:12px 0!important;padding:13px!important;border:1px solid #d7dee8!important;border-radius:10px!important;background:#fff!important;box-shadow:none!important;break-inside:avoid;page-break-inside:avoid}.v7-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:10px!important}.v7-stat{display:block!important;padding:10px!important;border:1px solid #e1e7ef!important;background:#f7f9fc!important;border-radius:8px!important}.v7-stat b{display:block!important;font-size:14pt!important}.v7-row{display:flex!important;justify-content:space-between!important;gap:10px!important;flex-wrap:wrap!important}.v7-expense{display:block!important;border-top:1px solid #dce3ec!important;padding:11px 0!important;break-inside:avoid;page-break-inside:avoid}.v7-expense p{font-size:9.5pt!important;margin:5px 0!important}.v7-actions,button{display:none!important}.v7-muted{color:#526176!important}.v7-chip{display:inline-block!important;background:#eef2f7!important;padding:3px 7px!important;border-radius:20px!important}@page{size:A4 portrait;margin:13mm}@media print{body{padding:0}}';
  if(!s.includes('TravelMate V16 trip print layout')){
    const oldHandler="const html=`<!doctype html><html><head><meta charset=\"utf-8\"><style>"+old+"</style></head><body>${$('detail')?.innerHTML||''}</body></html>`;";
    const newHandler="const clone=$('detail')?.cloneNode(true);if(!clone)return;clone.querySelectorAll('button,input,select,textarea,[data-no-print]').forEach(x=>x.remove());const html=`<!doctype html><html lang=\"${isAr()?'ar':'en'}\" dir=\"${isAr()?'rtl':'ltr'}\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><title>TravelMate Trip Report</title><style>/* TravelMate V16 trip print layout */"+tripCss+"</style></head><body>${clone.innerHTML}</body></html>`;";
    if(!s.includes(oldHandler))throw Error('Could not locate trip PDF handler safely.');
    s=s.replace(oldHandler,newHandler);
  }
  W(p,s);
}

async function run(){
  await makeIcons();
  patchActivityEditor();
  patchPrintableReports();
  const indexPath=path.join(www,'index.html');let html=R(indexPath);
  html=html.replace(/travelmate-icon-192\.png|travelmate-v14-192\.png/g,'travelmate-v16-192.png');
  html=html.replace(/TravelMate V\d+[^<]*/g,'TravelMate V16');
  if(!html.includes('id="tm16-splash"')){
    html=html.replace('<style>',`<style>
#tm16-splash{position:fixed;inset:0;z-index:2147483000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;background:#fff;color:#111;opacity:1;visibility:visible;transition:opacity .28s ease,visibility .28s ease}
#tm16-splash img{width:min(46vw,190px);height:min(46vw,190px);object-fit:contain}
#tm16-splash strong{font:700 20px system-ui,Arial;letter-spacing:.5px}
#tm16-splash.hide{opacity:0;visibility:hidden;pointer-events:none}
</style><script>
(()=>{const started=Date.now();let done=false;window.__tm16HideSplash=()=>{if(done)return;done=true;const wait=Math.max(0,550-(Date.now()-started));setTimeout(()=>{const e=document.getElementById('tm16-splash');if(e){e.classList.add('hide');setTimeout(()=>e.remove(),350);}},wait);};document.addEventListener('tm16-app-ready',window.__tm16HideSplash,{once:true});setTimeout(window.__tm16HideSplash,5000);})();
</script><style>`);
    html=html.replace('<body>','<body>\\n  <div id="tm16-splash" aria-label="TravelMate"><img src="travelmate-v16-512.png" alt="TravelMate falcon"><strong>TravelMate</strong></div>');
  }
  if(!html.includes("tm16-app-ready"))html=html.replace('</body>','<script>window.dispatchEvent(new Event("tm16-app-ready"));</script>\\n</body>');
  W(indexPath,html);
  const mp=path.join(www,'manifest.webmanifest');
  if(fs.existsSync(mp)){const m=JSON.parse(R(mp));m.name='TravelMate V16';m.short_name='TravelMate';m.icons=[{src:'travelmate-v16-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'travelmate-v16-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}];W(mp,JSON.stringify(m,null,2));}
  const swp=path.join(www,'sw.js');
  if(fs.existsSync(swp)){let sw=R(swp).replace(/travelmate-v\d+-shell/g,'travelmate-v16-shell');if(!sw.includes('./travelmate-v16-512.png'))sw=sw.replace(/(const CORE=\[[\s\S]*?)(\];)/,'$1,"./travelmate-v16-192.png","./travelmate-v16-512.png"$2');W(swp,sw);}
  const manifest=path.join(main,'AndroidManifest.xml');let xml=R(manifest);
  xml=xml.replace(/android:icon="@[^"]+"/,'android:icon="@mipmap/ic_launcher"');
  if(/android:roundIcon="@[^"]+"/.test(xml))xml=xml.replace(/android:roundIcon="@[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');
  else xml=xml.replace('<application','<application android:roundIcon="@mipmap/ic_launcher_round"');
  W(manifest,xml);
  const gradle=path.join(root,'android','app','build.gradle');
  if(fs.existsSync(gradle))W(gradle,R(gradle).replace(/versionCode\s+\d+/,'versionCode 16').replace(/versionName\s+"[^"]+"/,'versionName "16.0.0"'));
  console.log('V16: transparent adaptive launcher foreground, correct density resources, immediate branded startup splash.');
}
run().catch(e=>{console.error(e.stack||e);process.exit(1);});
