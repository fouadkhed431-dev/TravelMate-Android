/* TravelMate V12 Ultimate — native export, reliable backup, report printing and brand/photo fixes. */
(() => {
  'use strict';
  if (window.__travelMateV12Loaded) return;
  window.__travelMateV12Loaded = true;

  const $ = id => document.getElementById(id);
  const isAr = () => typeof settings !== 'undefined' && settings?.language === 'ar';
  const tx = (en, ar) => isAr() ? ar : en;
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
  const plugins = () => window.Capacitor?.Plugins || {};
  const toast = msg => {
    let el=$('tm12-toast');
    if(!el){el=document.createElement('div');el.id='tm12-toast';el.style.cssText='position:fixed;z-index:100900;left:14px;right:14px;bottom:82px;padding:13px 15px;border-radius:13px;background:#172033;color:#fff;box-shadow:0 8px 28px #0004;font:600 13px/1.5 Arial;display:none';document.body.append(el);}
    el.textContent=msg;el.style.display='block';clearTimeout(el._timer);el._timer=setTimeout(()=>el.style.display='none',3800);
  };
  const blobData = blob => new Promise((resolve,reject)=>{
    if(!blob)return resolve(null);
    const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);
  });
  const dataBlob = url => {
    if(!url)return null;
    const parts=String(url).split(','),head=parts[0],raw=atob(parts[1]||'');
    const mime=(head.match(/data:(.*?);base64/)||[])[1]||'application/octet-stream';
    const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
    return new Blob([bytes],{type:mime});
  };
  const readStore = (dbName,storeName) => new Promise((resolve,reject)=>{
    const req=indexedDB.open(dbName);
    req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains(storeName)){db.close();resolve([]);return;}
      const r=db.transaction(storeName).objectStore(storeName).getAll();
      r.onsuccess=()=>{db.close();resolve(r.result||[]);};r.onerror=()=>{db.close();reject(r.error);};};
    req.onerror=()=>reject(req.error);
  });
  const replaceStore = (dbName,storeName,rows) => new Promise((resolve,reject)=>{
    const req=indexedDB.open(dbName);
    req.onsuccess=()=>{const db=req.result;if(!db.objectStoreNames.contains(storeName)){db.close();return reject(new Error('Missing store '+storeName));}
      const t=db.transaction(storeName,'readwrite'),s=t.objectStore(storeName);s.clear();(rows||[]).forEach(x=>s.put(x));
      t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>{db.close();reject(t.error);};};
    req.onerror=()=>reject(req.error);
  });
  const packRows = async rows => Promise.all((rows||[]).map(async x=>{
    const y={...x};if(x.blob instanceof Blob){y.fileData=await blobData(x.blob);delete y.blob;}return y;
  }));
  const unpackRows = rows => (rows||[]).map(x=>{
    const y={...x};if(y.fileData){y.blob=dataBlob(y.fileData);delete y.fileData;}return y;
  });
  const blobBase64 = async blob => {
    const buf=await blob.arrayBuffer(),bytes=new Uint8Array(buf);let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary);
  };

  async function shareBlob(blob, filename, mime, title) {
    const file=new File([blob],filename,{type:mime});
    const p=plugins();
    if(p.Filesystem?.writeFile && p.Share?.share){
      const saved=await p.Filesystem.writeFile({path:filename,data:await blobBase64(blob),directory:'CACHE',recursive:true});
      if(!saved?.uri)throw new Error('Android could not prepare the file for sharing.');
      await p.Share.share({title:title||filename,text:tx('TravelMate file — choose Files or Drive to save it.','ملف TravelMate — اختر تطبيق الملفات أو Drive لحفظه.'),url:saved.uri,dialogTitle:tx('Save or share file','حفظ الملف أو مشاركته')});
      return true;
    }
    if(navigator.share && (!navigator.canShare || navigator.canShare({files:[file]}))){
      await navigator.share({title:title||filename,files:[file]});return true;
    }
    const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=filename;a.style.display='none';document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    toast(tx('The download was requested. Check your Downloads folder.','تم طلب تنزيل الملف. تحقق من مجلد التنزيلات.'));
    return true;
  }

  async function makeFullBackup() {
    if(typeof trips==='undefined'||typeof expenses==='undefined')throw new Error('TravelMate data is not ready.');
    const [vault,receipts]=await Promise.all([
      readStore('travelmate_v10_vault','items'),
      readStore('travelmate_receipts_v71','receipts')
    ]);
    const payload={
      app:'TravelMate',version:12,exportedAt:new Date().toISOString(),
      trips,expenses,checklist:typeof checklist!=='undefined'?checklist:[],
      settings:typeof settings!=='undefined'?settings:{},
      documents:await packRows(vault),receipts:await packRows(receipts)
    };
    const json=JSON.stringify(payload);
    if(json.length>95*1024*1024)throw new Error(tx('Backup exceeds 95 MB. Remove large files or photos and try again.','حجم النسخة تجاوز 95 ميجابايت. قلّل الملفات أو الصور الكبيرة ثم أعد المحاولة.'));
    const blob=new Blob([json],{type:'application/json;charset=utf-8'});
    await shareBlob(blob,`TravelMate-V12-Full-Backup-${today()}.json`,'application/json',tx('TravelMate full backup','النسخة الاحتياطية الكاملة لـ TravelMate'));
    toast(tx('Backup file is ready. Complete the save/share step in Android.','تم تجهيز ملف النسخة الاحتياطية. أكمل خطوة الحفظ أو المشاركة من Android.'));
  }

  async function restoreFullBackup(file) {
    if(!file)return;
    try{
      const d=JSON.parse(await file.text());
      if(d.app!=='TravelMate'||![10,12].includes(Number(d.version))||!Array.isArray(d.trips)||!Array.isArray(d.expenses)||!Array.isArray(d.documents))
        throw new Error(tx('This is not a supported TravelMate full backup.','هذا ليس ملف نسخة احتياطية كاملًا مدعومًا من TravelMate.'));
      if(!confirm(tx('Replace current trips, expenses, documents, photos and receipts with this backup?','هل تريد استبدال الرحلات والمصروفات والمستندات والصور والفواتير الحالية بهذه النسخة؟')))return;
      try{localStorage.setItem('travelmate_v12_pre_restore',JSON.stringify({createdAt:new Date().toISOString(),trips,expenses,checklist,settings}));}catch(_){}
      trips=d.trips;expenses=d.expenses;checklist=Array.isArray(d.checklist)?d.checklist:[];
      if(d.settings)settings={...(typeof settings!=='undefined'?settings:{}),...d.settings};
      if(typeof normalize==='function')normalize();
      if(typeof save==='function')save();else if(typeof saveApp==='function')saveApp();else if(typeof saveNow==='function')saveNow();
      await replaceStore('travelmate_v10_vault','items',unpackRows(d.documents));
      if(Array.isArray(d.receipts))await replaceStore('travelmate_receipts_v71','receipts',unpackRows(d.receipts));
      if(typeof applySettings==='function')applySettings();
      if(typeof renderAll==='function')renderAll();
      if(typeof showPage==='function')showPage('home');
      toast(tx('Backup restored successfully.','تمت استعادة النسخة الاحتياطية بنجاح.'));
    }catch(e){alert(e.message||tx('The backup is invalid or could not be restored.','النسخة الاحتياطية غير صالحة أو تعذرت استعادتها.'));}
  }

  function reportHtml() {
    const root=$('tm-v8-report-print')||$('v71-report-preview')||$('tm-v8-report-print');
    if(!root)throw new Error(tx('Open the financial report first.','افتح التقرير المالي أولًا.'));
    const clone=root.cloneNode(true);
    clone.querySelectorAll('.v8-actions,button').forEach(x=>x.remove());
    const dir=isAr()?'rtl':'ltr';
    return `<!doctype html><html lang="${dir==='rtl'?'ar':'en'}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TravelMate Financial Report</title><style>
      *{box-sizing:border-box}body{font-family:Arial,Tahoma,sans-serif;color:#172033;background:#fff;padding:22px;line-height:1.55}
      h1,h2,h3{color:#14243b}p,small,td,th,li{color:#243247!important}
      table{width:100%;border-collapse:collapse;table-layout:auto;font-size:11px;margin:12px 0}
      th{background:#e9eef5!important;color:#14243b!important;font-weight:700}
      td,th{border:1px solid #cbd5e1;padding:7px;text-align:start;overflow-wrap:anywhere}
      .v8-report-summary{display:flex;gap:12px;flex-wrap:wrap}.v8-report-summary>div{border:1px solid #cbd5e1;padding:12px;border-radius:8px}
      @page{size:A4 landscape;margin:12mm}@media print{body{padding:0}}
    </style></head><body>${clone.innerHTML}</body></html>`;
  }
  async function printFinancialReport() {
    try{
      const html=reportHtml(),printer=plugins().Printer;
      if(printer?.printHtml){await printer.printHtml({html});return;}
      if(window.Capacitor?.isNativePlatform?.())throw new Error(tx('Native print service is missing from this build.','خدمة الطباعة الأصلية غير موجودة في هذا البناء.'));
      const w=window.open('','_blank');if(!w)throw new Error(tx('Allow pop-ups to print this report.','اسمح بالنوافذ المنبثقة لطباعة التقرير.'));
      w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),500);
    }catch(e){alert(e.message||tx('Could not open Android print dialog.','تعذر فتح نافذة الطباعة في Android.'));}
  }
  async function saveReport() {
    try{const html=reportHtml();await shareBlob(new Blob([html],{type:'text/html;charset=utf-8'}),`TravelMate-Financial-Report-${today()}.html`,'text/html',tx('TravelMate report','تقرير TravelMate'));}
    catch(e){alert(e.message||tx('Could not save the report.','تعذر حفظ التقرير.'));}
  }
  function csvCell(v){return '"'+String(v??'').replace(/"/g,'""')+'"';}
  async function exportCSV() {
    try{
      const table=$('tm-v8-report-print')?.querySelector('table');
      let rows=[];
      if(table){
        rows=[...table.querySelectorAll('tr')].map(tr=>[...tr.querySelectorAll('th,td')].map(c=>c.textContent.trim()));
      }else{
        rows=[['Date','Expense','Category','Payer','Trip','Amount','Currency'],
          ...(typeof expenses!=='undefined'?expenses:[]).map(e=>[e.date,e.title,e.category,e.payer,(typeof trips!=='undefined'?trips:[]).find(t=>String(t.id)===String(e.tripId))?.name||'',e.amount,settings?.currency||'EGP'])];
      }
      const csv='\uFEFF'+rows.map(r=>r.map(csvCell).join(',')).join('\r\n');
      await shareBlob(new Blob([csv],{type:'text/csv;charset=utf-8'}),`TravelMate-Expenses-${today()}.csv`,'text/csv',tx('TravelMate expenses CSV','ملف مصروفات TravelMate'));
    }catch(e){alert(e.message||tx('Could not export CSV.','تعذر تصدير CSV.'));}
  }

  function brandFix() {
    const logo='travelmate-tm-falcon-square.png';
    document.querySelectorAll('.brand-icon').forEach(el=>{
      el.innerHTML=`<img src="${logo}" alt="TravelMate TM Falcon">`;
      el.style.cssText='width:54px;height:54px;flex:0 0 54px;border-radius:14px;background:#fff;border:1px solid #d8dce3;overflow:hidden;display:grid;place-items:center';
    });
    document.querySelectorAll('.brand>div:not(.brand-icon)').forEach(el=>{el.style.setProperty('display','block','important');});
    const title=document.querySelector('.brand h1');if(title)title.textContent='TravelMate';
    const welcome=$('welcome');if(welcome)welcome.textContent=tx('Your journey, beautifully organized.','رحلتك، منظمة بكل سهولة.');
    const splash=$('#tm10-splash img');if(splash)splash.src=logo;
    document.querySelectorAll('footer').forEach(el=>el.textContent='TravelMate · TM Falcon');
  }
  function bindCapture() {
    document.addEventListener('click',e=>{
      const b=e.target.closest('#backupBtn,#tm10-backup,#v8-backup');
      if(b){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();makeFullBackup().catch(err=>alert(err.message||tx('Backup failed.','فشل إنشاء النسخة الاحتياطية.')));return;}
      const print=e.target.closest('#v8-report-print-btn');
      if(print){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();printFinancialReport();return;}
      const save=e.target.closest('#v8-report-save,#v71-report-save');
      if(save){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();saveReport();return;}
      const csv=e.target.closest('#v8-report-csv,#v7-export-csv,#v7-settings-csv,#v8-export-expenses');
      if(csv){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();exportCSV();return;}
      const tripPdf=e.target.closest('#exportTripBtn');
      if(tripPdf){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();const html=`<!doctype html><html><head><meta charset="utf-8"><style>body{font-family:Arial;padding:18px;color:#172033}button{display:none!important}</style></head><body>${$('detail')?.innerHTML||''}</body></html>`;const printer=plugins().Printer;if(printer?.printHtml)printer.printHtml({html}).catch(err=>alert(err.message));else toast(tx('Native print is unavailable.','الطباعة الأصلية غير متاحة.'));}
    },true);
    const restore=$('restoreFile');
    if(restore&&!restore.dataset.tm12Bound){restore.dataset.tm12Bound='1';restore.addEventListener('change',e=>{
      const f=e.target.files?.[0];if(!f)return;e.stopImmediatePropagation();e.preventDefault();e.target.value='';restoreFullBackup(f);
    },true);}
    const extraRestore=$('tm10-restore-file');
    if(extraRestore&&!extraRestore.dataset.tm12Bound){extraRestore.dataset.tm12Bound='1';extraRestore.addEventListener('change',e=>{
      const f=e.target.files?.[0];if(!f)return;e.stopImmediatePropagation();e.preventDefault();e.target.value='';restoreFullBackup(f);
    },true);}
  }

  function photoRefresh() {
    const fix=()=>{brandFix();};
    fix();
    const detail=$('detail');
    if(detail&&window.MutationObserver){
      let timer;new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(fix,120);}).observe(detail,{childList:true,subtree:true});
    }
    const old=window.showPage;
    if(typeof old==='function'&&!old.__tm12Wrapped){
      const wrapped=function(page){old(page);if(page==='detail')setTimeout(fix,250);};
      wrapped.__tm12Wrapped=true;window.showPage=wrapped;
    }
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)fix();});
  }
  function install(){
    bindCapture();photoRefresh();
    // Replace obsolete export-center labels with accurate Android save/share wording.
    const backup=$('backupBtn');if(backup)backup.textContent=tx('↓ Export full backup','↓ تصدير نسخة احتياطية كاملة');
    const about=document.querySelector('#settings .settings-card:last-child p');
    if(about)about.textContent='TravelMate V12 Ultimate · Your journey companion';
    setTimeout(brandFix,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();