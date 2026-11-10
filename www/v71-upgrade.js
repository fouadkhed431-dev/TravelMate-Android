/* TravelMate V7.1 — Android-safe reports, receipt OCR, and receipt archive.
   Additive layer: preserves the existing V4–V7 storage keys and expense schema. */
(() => {
  "use strict";
  if (window.__travelMateV71Loaded) return;
  window.__travelMateV71Loaded = true;

  const $ = id => document.getElementById(id);
  const isAr = () => typeof settings !== "undefined" && settings.language === "ar";
  const tx = (en, ar) => isAr() ? ar : en;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const today = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
  const moneyText = n => typeof money === "function" ? money(Number(n)||0) : `${Number(n||0).toLocaleString()} ${settings?.currency||"EGP"}`;
  const saveApp = () => { if (typeof save === "function") save(); };
  const categories = [
    ["accommodation","🏨","Accommodation","الإقامة"],["food","🍽️","Food & drinks","الطعام والمشروبات"],
    ["transport","🚕","Transport","المواصلات"],["shopping","🛍️","Shopping","التسوق"],
    ["entertainment","🎟️","Entertainment","الترفيه"],["health","💊","Health","الصحة"],
    ["activities","🧭","Activities","الأنشطة"],["other","📦","Other","أخرى"]
  ];
  const catLabel = id => { const c=categories.find(x=>x[0]===id)||categories[7]; return `${c[1]} ${isAr()?c[3]:c[2]}`; };
  const makeId = () => `receipt-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  // Receipt images are kept in IndexedDB, not localStorage, to avoid exhausting app storage.
  const DB_NAME="travelmate_receipts_v71", STORE="receipts";
  function openReceiptDB(){
    return new Promise((resolve,reject)=>{
      if(!("indexedDB" in window)) return reject(new Error("IndexedDB unavailable"));
      const req=indexedDB.open(DB_NAME,1);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:"id"});};
      req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error("Could not open receipt storage"));
    });
  }
  async function putReceipt(record){const db=await openReceiptDB();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).put(record);tx.oncomplete=()=>{db.close();resolve(record.id);};tx.onerror=()=>{db.close();reject(tx.error);};});}
  async function getReceipt(id){const db=await openReceiptDB();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).get(id);r.onsuccess=()=>{db.close();resolve(r.result||null);};r.onerror=()=>{db.close();reject(r.error);};});}
  async function allReceipts(){const db=await openReceiptDB();return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>{db.close();resolve(r.result||[]);};r.onerror=()=>{db.close();reject(r.error);};});}
  async function deleteReceipt(id){const db=await openReceiptDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,"readwrite");t.objectStore(STORE).delete(id);t.oncomplete=()=>{db.close();resolve();};t.onerror=()=>{db.close();reject(t.error);};});}
  function fileAsDataURL(blob){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.readAsDataURL(blob);});}
  function dataURLAsBlob(url){const [head,data]=url.split(",");const mime=(head.match(/data:(.*?);base64/)||[])[1]||"image/jpeg";const raw=atob(data);const bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);return new Blob([bytes],{type:mime});}

  const css=document.createElement("style");css.id="tm-v71-style";css.textContent=`
    .v71-tools{display:grid;gap:10px;margin:12px 0}.v71-card{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:17px;padding:14px;box-shadow:var(--shadow)}
    .v71-row{display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap}.v71-actions{display:flex;gap:8px;flex-wrap:wrap}
    .v71-btn{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:11px;padding:10px 12px;font-weight:750;font-size:13px;min-height:42px}.v71-btn.primary{background:var(--accent);color:white;border-color:var(--accent)}
    .v71-muted{font-size:11px;color:var(--muted)}.v71-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}.v71-field{display:grid;gap:5px;min-width:0}.v71-field.wide{grid-column:1/-1}.v71-field label{font-size:11px;font-weight:800;color:var(--muted)}
    .v71-field input,.v71-field select,.v71-field textarea{box-sizing:border-box;width:100%;min-height:44px;border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg);color:var(--text);font:inherit;font-size:16px}.v71-field textarea{min-height:70px}
    .v71-overlay{position:fixed;inset:0;z-index:100050;background:#07101dcc;display:flex;align-items:flex-end;justify-content:center;padding:9px}.v71-panel{background:var(--surface);color:var(--text);width:min(100%,650px);max-height:95dvh;overflow:auto;border-radius:20px;padding:16px;box-shadow:0 15px 50px #0008}.v71-panel h2{margin:0 0 12px;font-size:19px}
    .v71-preview{display:block;max-width:100%;max-height:230px;object-fit:contain;margin:8px auto;border-radius:10px;background:var(--surface2)}.v71-progress{height:8px;background:var(--surface2);border-radius:10px;overflow:hidden}.v71-progress i{display:block;height:100%;width:0;background:var(--accent)}
    .v71-table-wrap{overflow:auto}.v71-table{border-collapse:collapse;width:100%;font-size:12px}.v71-table th,.v71-table td{padding:8px;border-bottom:1px solid var(--border);text-align:start;vertical-align:top}.v71-receipt{padding:10px 0;border-top:1px solid var(--border)}
    @media(max-width:430px){.v71-form{grid-template-columns:1fr}.v71-field.wide{grid-column:auto}.v71-panel{padding:13px}}
  `;document.head.appendChild(css);

  let selectedImage=null, selectedFileName="", ocrWorkerPromise=null;
  function ensureScannerUI(){
    const page=$("expenses"),list=$("expenseList");if(!page||!list||$("v71-receipt-tools"))return;
    const card=document.createElement("section");card.id="v71-receipt-tools";card.className="v71-card v71-tools";
    card.innerHTML=`<div class="v71-row"><div><b>🧾 ${tx("Scan invoices & receipts","مسح الفواتير والإيصالات")}</b><p class="v71-muted">${tx("Take a photo or choose an image. Review the extracted details before saving.","التقط صورة أو اخترها من المعرض، ثم راجع البيانات المستخرجة قبل الحفظ.")}</p></div><span class="v71-muted">OCR</span></div><div class="v71-actions"><button type="button" class="v71-btn primary" id="v71-camera">📷 ${tx("Use camera","التصوير بالكاميرا")}</button><button type="button" class="v71-btn" id="v71-gallery">🖼️ ${tx("Choose image","اختيار صورة")}</button></div><input id="v71-camera-file" type="file" accept="image/*" capture="environment" hidden><input id="v71-gallery-file" type="file" accept="image/*" hidden><div class="v71-muted">${tx("Arabic and English text are supported. OCR needs an internet connection the first time language data is loaded.","يدعم قراءة العربية والإنجليزية. يحتاج التعرف الضوئي إلى الإنترنت عند تحميل بيانات اللغة لأول مرة.")}</div><div id="v71-receipt-archive"></div>`;
    list.parentNode.insertBefore(card,list);
    $("v71-camera").onclick=()=>$("v71-camera-file").click();$("v71-gallery").onclick=()=>$("v71-gallery-file").click();
    ["v71-camera-file","v71-gallery-file"].forEach(id=>$(id).addEventListener("change",e=>{const f=e.target.files?.[0];e.target.value="";if(f)startScan(f);}));
  }
  function overlay(title,body){$("v71-overlay")?.remove();const root=document.createElement("div");root.id="v71-overlay";root.className="v71-overlay";root.innerHTML=`<section class="v71-panel" role="dialog" aria-modal="true"><div class="v71-row"><h2>${title}</h2><button type="button" class="v71-btn" data-v71-close>${tx("Close","إغلاق")}</button></div>${body}</section>`;document.body.appendChild(root);root.addEventListener("click",e=>{if(e.target===root||e.target.closest("[data-v71-close]"))root.remove();});return root;}
  async function loadTesseract(){
    if(window.Tesseract)return window.Tesseract;
    if(!window.__tmTesseractLoading){window.__tmTesseractLoading=new Promise((resolve,reject)=>{const s=document.createElement("script");s.src="https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";s.onload=()=>resolve(window.Tesseract);s.onerror=()=>reject(new Error(tx("Could not load the OCR engine. Check your internet connection.","تعذر تحميل محرك قراءة الفواتير. تحقق من اتصال الإنترنت.")));document.head.appendChild(s);});}
    return window.__tmTesseractLoading;
  }
  async function getWorker(progress){
    if(!ocrWorkerPromise){ocrWorkerPromise=(async()=>{const T=await loadTesseract();if(!T?.createWorker)throw new Error("OCR engine unavailable");return T.createWorker("eng+ara",1,{logger:m=>{if(m.status==="recognizing text")progress(Math.round((m.progress||0)*100));}});})().catch(e=>{ocrWorkerPromise=null;throw e;});}
    return ocrWorkerPromise;
  }
  function parseReceiptText(text){
    text=String(text||"").replace(/[٠-٩۰-۹]/g,ch=>({"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"}[ch]));
    const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
    const amountPattern=/(?:\d{1,3}(?:[,،.]\d{3})+|\d+)(?:[.,]\d{1,2})?/g;
    const totalHints=/grand\s*total|total\s*due|amount\s*due|total|الإجمالي|الاجمالي|المجموع|المطلوب|الصافي|صافى|المدفوع/i;
    let amount="";
    for(const line of lines.filter(x=>totalHints.test(x)).reverse()){
      const matches=[...line.matchAll(amountPattern)].map(m=>m[0]);if(matches.length){amount=normalizeAmount(matches[matches.length-1]);break;}
    }
    if(!amount){const all=[...text.matchAll(amountPattern)].map(m=>normalizeAmount(m[0])).filter(x=>Number(x)>0&&Number(x)<100000000);if(all.length)amount=String(Math.max(...all.map(Number)));}
    const dateMatch=text.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/);
    let date=today();if(dateMatch){const p=dateMatch[0].replace(/[/.]/g,"-").split("-");if(p[0].length===4)date=`${p[0]}-${p[1].padStart(2,"0")}-${p[2].padStart(2,"0")}`;else date=`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`;}
    const title=lines.find(x=>x.length>2&&!totalHints.test(x)&&!/^\d+[\s./-]*$/.test(x))||tx("Scanned receipt","فاتورة ممسوحة");
    const low=text.toLowerCase();let category="other";if(/hotel|room|accommodation|فندق|غرفة|إقامة/.test(low))category="accommodation";else if(/restaurant|cafe|coffee|food|مطعم|كافيه|قهوة|طعام/.test(low))category="food";else if(/taxi|uber|bus|train|fuel|petrol|بنزين|تاكسى|مواصلات/.test(low))category="transport";else if(/pharmacy|hospital|clinic|صيدلية|مستشفى|عيادة/.test(low))category="health";else if(/market|supermarket|mall|متجر|سوبر ماركت|تسوق/.test(low))category="shopping";
    return {title,amount,date,category,text};
  }
  function normalizeAmount(raw){let s=String(raw).replace(/[،\s]/g,"");if(s.includes(",")&&s.includes("."))s=s.replace(/,/g,"");else if(s.includes(","))s=s.replace(",",".");return s;}
  async function startScan(file){
    if(!file.type.startsWith("image/")){alert(tx("Please choose an image file.","يرجى اختيار ملف صورة."));return;}
    selectedImage=file;selectedFileName=file.name||"receipt-image";
    const url=URL.createObjectURL(file);const root=overlay(tx("Scan receipt","مسح فاتورة"),`<img class="v71-preview" id="v71-image-preview" src="${url}" alt="Receipt preview"><p id="v71-ocr-status" class="v71-muted">${tx("Ready to read the image.","الصورة جاهزة للقراءة.")}</p><div class="v71-progress"><i id="v71-ocr-progress"></i></div><div class="v71-actions" style="margin-top:12px"><button type="button" class="v71-btn primary" id="v71-run-ocr">✨ ${tx("Read invoice automatically","قراءة الفاتورة تلقائيًا")}</button><button type="button" class="v71-btn" id="v71-manual">${tx("Enter details manually","إدخال البيانات يدويًا")}</button></div>`);
    root.querySelector("[data-v71-close]").addEventListener("click",()=>URL.revokeObjectURL(url));
    root.querySelector("#v71-run-ocr").onclick=async()=>{
      const status=root.querySelector("#v71-ocr-status"),bar=root.querySelector("#v71-ocr-progress");status.textContent=tx("Loading Arabic and English OCR data…","جارٍ تحميل بيانات التعرف على العربية والإنجليزية…");
      try{const worker=await getWorker(p=>{bar.style.width=p+"%";status.textContent=`${tx("Reading invoice","جارٍ قراءة الفاتورة")}: ${p}%`;});const result=await worker.recognize(file);const parsed=parseReceiptText(result.data.text||"");root.remove();URL.revokeObjectURL(url);showReceiptForm(parsed,file);}
      catch(e){status.textContent=e.message||tx("Could not read this image. You can enter the details manually.","تعذرت قراءة الصورة. يمكنك إدخال البيانات يدويًا.");}
    };
    root.querySelector("#v71-manual").onclick=()=>{root.remove();URL.revokeObjectURL(url);showReceiptForm({title:"",amount:"",date:today(),category:"other",text:""},file);};
  }
  function showReceiptForm(parsed,file){
    const tripOpts=`<option value="">${tx("General / personal","عام / شخصي")}</option>`+trips.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("");
    const cats=categories.map(c=>`<option value="${c[0]}" ${parsed.category===c[0]?"selected":""}>${c[1]} ${isAr()?c[3]:c[2]}</option>`).join("");
    const root=overlay(tx("Review scanned expense","مراجعة بيانات الفاتورة"),`<p class="v71-muted">${tx("OCR suggestions may contain mistakes. Check every field before saving.","قد تحتوي القراءة التلقائية على أخطاء؛ راجع كل البيانات قبل الحفظ.")}</p><div class="v71-form"><div class="v71-field wide"><label>${tx("Merchant / description","المتجر / وصف المصروف")}</label><input id="v71-title" value="${esc(parsed.title)}" required></div><div class="v71-field"><label>${tx("Amount","المبلغ")}</label><input id="v71-amount" type="number" min="0.01" step="0.01" value="${esc(parsed.amount)}" required></div><div class="v71-field"><label>${tx("Date","التاريخ")}</label><input id="v71-date" type="date" value="${esc(parsed.date||today())}"></div><div class="v71-field"><label>${tx("Category","التصنيف")}</label><select id="v71-category">${cats}</select></div><div class="v71-field"><label>${tx("Trip","الرحلة")}</label><select id="v71-trip">${tripOpts}</select></div><div class="v71-field"><label>${tx("Paid by","دفع بواسطة")}</label><select id="v71-payer"><option value="Personal">Personal</option></select></div><div class="v71-field wide"><label>${tx("Notes","ملاحظات")}</label><textarea id="v71-notes">${esc(parsed.text||"")}</textarea></div></div><div class="v71-actions" style="margin-top:13px"><button type="button" class="v71-btn primary" id="v71-save-expense">${tx("Save expense + receipt","حفظ المصروف والفاتورة")}</button><button type="button" class="v71-btn" data-v71-close>${tx("Cancel","إلغاء")}</button></div>`);
    const trip=root.querySelector("#v71-trip"),payer=root.querySelector("#v71-payer");
    function updatePayers(){const t=trips.find(x=>x.id===trip.value);const names=t?.travelers?.length?t.travelers:["Personal"];payer.innerHTML=names.map(n=>`<option value="${esc(n)}">${esc(n)}</option>`).join("");}
    trip.addEventListener("change",updatePayers);updatePayers();
    root.querySelector("#v71-save-expense").onclick=async()=>{
      const title=root.querySelector("#v71-title").value.trim(),amount=Number(root.querySelector("#v71-amount").value);
      if(!title||!Number.isFinite(amount)||amount<=0){alert(tx("Enter a description and a valid amount.","أدخل وصفًا ومبلغًا صحيحًا."));return;}
      const id=makeId();const expenseId=typeof uid==="function"?uid():`v71-${Date.now()}`;
      try{
        await putReceipt({id,expenseId,createdAt:new Date().toISOString(),name:file.name||"receipt",type:file.type||"image/jpeg",blob:file});
        const linked=trips.find(t=>t.id===trip.value);
        expenses.push({id:expenseId,title,amount:Number(amount.toFixed(2)),category:root.querySelector("#v71-category").value,date:root.querySelector("#v71-date").value||today(),tripId:linked?.id||null,payer:payer.value||"Personal",notes:root.querySelector("#v71-notes").value.trim(),receiptId:id});
        saveApp();root.remove();refreshUI();alert(tx("Expense and receipt saved.","تم حفظ المصروف والفاتورة بنجاح."));
      }catch(e){alert(tx("Receipt storage failed. Check device storage and try again.","تعذر حفظ صورة الفاتورة. تحقق من مساحة التخزين وحاول مجددًا."));}
    };
  }
  function refreshUI(){if(typeof renderAll==="function")renderAll();if(typeof renderTrip==="function"&&currentTrip!==null)renderTrip();renderArchive();}
  async function renderArchive(){
    const host=$("v71-receipt-archive");if(!host)return;
    try{const items=await allReceipts();const linked=items.filter(r=>expenses.some(e=>e.receiptId===r.id));
      host.innerHTML=`<div style="border-top:1px solid var(--border);padding-top:10px;margin-top:4px"><div class="v71-row"><b>📁 ${tx("Saved receipts","الفواتير المحفوظة")}</b><span class="v71-muted">${linked.length}</span></div>${linked.length?linked.map(r=>{const e=expenses.find(x=>x.receiptId===r.id);return `<div class="v71-receipt"><div class="v71-row"><span><b>${esc(e?.title||r.name)}</b><br><small class="v71-muted">${esc(e?.date||"")} · ${moneyText(e?.amount||0)}</small></span><div class="v71-actions"><button class="v71-btn" data-v71-view="${esc(r.id)}">${tx("View","عرض")}</button><button class="v71-btn" data-v71-remove="${esc(r.id)}">${tx("Remove image","حذف الصورة")}</button></div></div></div>`;}).join(""):`<p class="v71-muted">${tx("No scanned receipts yet.","لا توجد فواتير ممسوحة بعد.")}</p>`}</div>`;
      host.querySelectorAll("[data-v71-view]").forEach(b=>b.onclick=()=>viewReceipt(b.dataset.v71View));
      host.querySelectorAll("[data-v71-remove]").forEach(b=>b.onclick=()=>removeReceiptImage(b.dataset.v71Remove));
    }catch(e){host.innerHTML=`<p class="v71-muted">${tx("Receipt storage is unavailable on this device.","تخزين الفواتير غير متاح على هذا الجهاز.")}</p>`;}
  }
  async function viewReceipt(id){try{const r=await getReceipt(id);if(!r)return;const url=URL.createObjectURL(r.blob);const root=overlay(tx("Receipt image","صورة الفاتورة"),`<img class="v71-preview" src="${url}" alt="Saved receipt"><p class="v71-muted">${esc(r.name||"")}</p><div class="v71-actions"><button class="v71-btn primary" id="v71-share-image">${tx("Share image","مشاركة الصورة")}</button></div>`);root.querySelector("[data-v71-close]").addEventListener("click",()=>URL.revokeObjectURL(url));root.querySelector("#v71-share-image").onclick=async()=>{try{const f=new File([r.blob],r.name||"receipt.jpg",{type:r.type||"image/jpeg"});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]})))await navigator.share({files:[f],title:tx("TravelMate receipt","فاتورة TravelMate")});else{const a=document.createElement("a");a.href=url;a.download=r.name||"receipt.jpg";a.click();}}catch(_){}};}catch(e){alert(tx("Could not open this receipt.","تعذر فتح الفاتورة."));}}
  async function removeReceiptImage(id){if(!confirm(tx("Remove this image? The expense record will remain.","حذف صورة الفاتورة؟ سيظل سجل المصروف موجودًا.")))return;try{await deleteReceipt(id);const e=expenses.find(x=>x.receiptId===id);if(e)delete e.receiptId;saveApp();renderArchive();}catch(_){alert(tx("Could not remove the image.","تعذر حذف الصورة."));}}

  function buildReportHTML(){
    const total=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const byCat=categories.map(c=>({name:isAr()?c[3]:c[2],amount:expenses.filter(e=>(e.category||"other")===c[0]).reduce((s,e)=>s+(Number(e.amount)||0),0)})).filter(x=>x.amount);
    const rows=expenses.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(e=>`<tr><td>${esc(e.date||"")}</td><td>${esc(e.title)}</td><td>${esc(catLabel(e.category||"other"))}</td><td>${esc(e.payer||"")}</td><td>${esc(trips.find(t=>t.id===e.tripId)?.name||"—")}</td><td>${moneyText(e.amount)}</td></tr>`).join("");
    return `<!doctype html><html lang="${isAr()?"ar":"en"}" dir="${isAr()?"rtl":"ltr"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TravelMate report</title><style>body{font-family:Arial,sans-serif;padding:22px;color:#18263d;line-height:1.6}h1{color:#315fba}table{border-collapse:collapse;width:100%;font-size:12px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:start}.sum{font-size:24px;font-weight:bold;margin:16px 0}</style><h1>TravelMate — ${tx("Financial report","التقرير المالي")}</h1><p>${today()}</p><div class="sum">${tx("Total expenses","إجمالي المصروفات")}: ${moneyText(total)}</div><h3>${tx("Category breakdown","تفصيل التصنيفات")}</h3><ul>${byCat.map(x=>`<li>${esc(x.name)}: ${moneyText(x.amount)}</li>`).join("")}</ul><table><thead><tr><th>${tx("Date","التاريخ")}</th><th>${tx("Description","الوصف")}</th><th>${tx("Category","التصنيف")}</th><th>${tx("Payer","الدافع")}</th><th>${tx("Trip","الرحلة")}</th><th>${tx("Amount","المبلغ")}</th></tr></thead><tbody>${rows}</tbody></table></html>`;
  }
  function openReport(){
    const html=buildReportHTML();const total=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const root=overlay(tx("Financial report","التقرير المالي"),`<div class="v71-row"><div><b>${tx("Total expenses","إجمالي المصروفات")}</b><div style="font-size:23px;font-weight:850;color:var(--accent)">${moneyText(total)}</div></div><span class="v71-muted">${expenses.length} ${tx("records","عملية")}</span></div><div class="v71-actions" style="margin:12px 0"><button class="v71-btn primary" id="v71-report-save">${tx("Save / share report","حفظ / مشاركة التقرير")}</button><button class="v71-btn" id="v71-report-copy">${tx("Copy report summary","نسخ ملخص التقرير")}</button></div><div class="v71-table-wrap"><div id="v71-report-preview"></div></div>`);
    const preview=root.querySelector("#v71-report-preview");const doc=new DOMParser().parseFromString(html,"text/html");preview.innerHTML=doc.body.innerHTML;preview.querySelectorAll("table").forEach(t=>t.classList.add("v71-table"));
    root.querySelector("#v71-report-save").onclick=async()=>{const blob=new Blob([html],{type:"text/html;charset=utf-8"});const f=new File([blob],`TravelMate-report-${today()}.html`,{type:"text/html"});try{if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[f]}))){await navigator.share({files:[f],title:tx("TravelMate financial report","التقرير المالي لـ TravelMate")});return;}}catch(e){if(e.name==="AbortError")return;}const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=f.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);};
    root.querySelector("#v71-report-copy").onclick=()=>{const summary=`TravelMate — ${tx("Financial report","التقرير المالي")}\n${today()}\n${tx("Total expenses","إجمالي المصروفات")}: ${moneyText(total)}\n`+expenses.map(e=>`${e.date||""} | ${e.title} | ${moneyText(e.amount)}`).join("\n");if(navigator.clipboard?.writeText)navigator.clipboard.writeText(summary).then(()=>alert(tx("Report summary copied.","تم نسخ ملخص التقرير."))).catch(()=>alert(summary));else alert(summary);};
  }

  // V7.1 backup carries receipt image blobs as data URLs alongside all existing data.
  async function backupWithReceipts(){
    try{const receipts=await allReceipts();const packed=[];for(const r of receipts){packed.push({id:r.id,expenseId:r.expenseId,createdAt:r.createdAt,name:r.name,type:r.type,data:await fileAsDataURL(r.blob)});}
      const payload={app:"TravelMate",version:71,exportedAt:new Date().toISOString(),trips,expenses,checklist,settings,receipts:packed};
      const blob=new Blob([JSON.stringify(payload)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`TravelMate-V7.1-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),2500);
      alert(tx("Backup created, including saved receipt images.","تم إنشاء النسخة الاحتياطية متضمنة صور الفواتير المحفوظة."));
    }catch(e){alert(tx("Could not create the backup. Check available storage.","تعذر إنشاء النسخة الاحتياطية. تحقق من مساحة التخزين."));}
  }
  async function restoreV71(file){
    if(!file)return;try{const d=JSON.parse(await file.text());if(!Array.isArray(d.trips)||!Array.isArray(d.expenses))throw new Error("Invalid backup");
      if(!confirm(tx("Replace current TravelMate data with this backup?","استبدال بيانات TravelMate الحالية بهذه النسخة الاحتياطية؟")))return;
      trips=d.trips;expenses=d.expenses;checklist=Array.isArray(d.checklist)?d.checklist:[];if(d.settings)settings={...settings,...d.settings};
      if(Array.isArray(d.receipts)){for(const r of d.receipts){if(r.data)await putReceipt({id:r.id||makeId(),expenseId:r.expenseId,createdAt:r.createdAt,name:r.name,type:r.type,blob:dataURLAsBlob(r.data)});}}
      if(typeof normalize==="function")normalize();saveApp();if(typeof applySettings==="function")applySettings();refreshUI();if(typeof showPage==="function")showPage("home");alert(tx("Backup restored.","تمت استعادة النسخة الاحتياطية."));
    }catch(e){alert(tx("The backup is invalid or could not be restored.","النسخة الاحتياطية غير صالحة أو تعذرت استعادتها."));}
  }

  function install(){
    ensureScannerUI();renderArchive();
    // Replace the popup-based V7 financial report with an in-app report viewer.
    const reportBtn=$("v7-settings-report");if(reportBtn)reportBtn.onclick=openReport;
    // Make sure the general/personal payer selector is never empty in V7 expense forms.
    // Keep the original V7 form and its validation untouched; scanner has its own complete form.
    const backupBtn=$("backupBtn");if(backupBtn)backupBtn.onclick=backupWithReceipts;
    const restoreInput=$("restoreFile");if(restoreInput)restoreInput.onchange=e=>{const f=e.target.files?.[0];restoreV71(f);e.target.value="";};
    document.querySelectorAll('[data-page="expenses"]').forEach(b=>b.addEventListener("click",()=>setTimeout(()=>{ensureScannerUI();renderArchive();},0)));
    if(typeof renderAll==="function"){const prior=window.renderAll;window.renderAll=function(){prior();ensureScannerUI();renderArchive();};}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
