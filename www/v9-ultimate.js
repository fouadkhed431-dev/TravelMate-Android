/* TravelMate V9 Ultimate — Android report repair, practical exports, global search and restore safety.
   Additive only: keeps V4–V8 storage keys and expense/trip schemas unchanged. */
(() => {
  "use strict";
  if (window.__travelMateV9Loaded) return;
  window.__travelMateV9Loaded = true;

  const ar = () => typeof settings !== "undefined" && settings.language === "ar";
  const t = (en, a) => ar() ? a : en;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const $ = id => document.getElementById(id);
  const css = document.createElement("style");
  css.id = "tm-v9-style";
  css.textContent = `
    /* V8 created the report but left it hidden outside print mode. */
    #tm-v8-report-print{
      display:block!important;position:fixed!important;inset:0!important;z-index:100000!important;
      overflow:auto!important;box-sizing:border-box!important;padding:18px!important;
      background:var(--bg,#f5f7fb)!important;color:var(--text,#172033)!important;
      width:100%!important;height:100%!important;
    }
    #tm-v8-report-print .v8-actions{display:flex;flex-wrap:wrap;gap:8px}
    #tm-v8-report-print .v8-actions button{flex:1 1 130px;min-height:42px}
    #tm-v8-report-print .v8-report-table{min-width:620px}
    .tm-v9-dialog-backdrop{position:fixed;inset:0;z-index:100010;background:#101827aa;display:flex;align-items:center;justify-content:center;padding:14px}
    .tm-v9-dialog{width:min(680px,100%);max-height:90vh;overflow:auto;background:var(--surface,#fff);color:var(--text,#172033);border:1px solid var(--border,#ddd);border-radius:18px;padding:16px;box-shadow:0 18px 60px #0005}
    .tm-v9-dialog h3{margin:0 0 8px}.tm-v9-dialog p{line-height:1.5}
    .tm-v9-dialog textarea{width:100%;min-height:190px;box-sizing:border-box;padding:12px;border:1px solid var(--border,#ccc);border-radius:10px;background:var(--bg,#fff);color:var(--text,#172033);font:12px/1.5 monospace}
    .tm-v9-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .tm-v9-actions button{flex:1 1 125px;min-height:42px;border:0;border-radius:10px;padding:9px 12px;background:var(--surface2,#edf1f7);color:var(--text,#172033);font-weight:700}
    .tm-v9-actions button.primary{background:var(--accent,#315efb);color:#fff}
    .tm-v9-search{margin:18px 0;padding:14px;border:1px solid var(--border);border-radius:16px;background:var(--surface)}
    .tm-v9-search input{width:100%;box-sizing:border-box;padding:13px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);font-size:16px}
    .tm-v9-results{display:grid;gap:7px;margin-top:10px}
    .tm-v9-result{width:100%;text-align:start;padding:11px;border:1px solid var(--border);border-radius:10px;background:var(--surface2);color:var(--text)}
    .tm-v9-result small{display:block;opacity:.7;margin-top:3px}
    .tm-v9-note{padding:10px;border-radius:10px;background:var(--surface2);margin:8px 0}
    body.tm-v8-printing #tm-v8-report-print{position:static!important;inset:auto!important;width:auto!important;height:auto!important;overflow:visible!important}
    @media print{
      #tm-v8-report-print{position:static!important;inset:auto!important;width:auto!important;height:auto!important;overflow:visible!important;background:#fff!important;color:#172033!important}
      #tm-v8-report-print .v8-actions{display:none!important}
      body.tm-v8-printing>*:not(#tm-v8-report-print){display:none!important}
    }
  `;
  document.head.appendChild(css);

  function csvFromReport(){
    const table = $("tm-v8-report-print")?.querySelector("table");
    if(!table) return "";
    const rows = [...table.querySelectorAll("tr")].map(tr =>
      [...tr.querySelectorAll("th,td")].map(cell => {
        const value = (cell.innerText || cell.textContent || "").replace(/\s+/g," ").trim();
        return `"${value.replace(/"/g,'""')}"`;
      }).join(",")
    );
    return "\uFEFF" + rows.join("\r\n");
  }
  function reportHtml(){
    const root = $("tm-v8-report-print");
    if(!root) return "";
    const clone = root.cloneNode(true);
    clone.querySelector(".v8-actions")?.remove();
    return `<!doctype html><html lang="${ar()?"ar":"en"}" dir="${ar()?"rtl":"ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TravelMate financial report</title><style>body{font-family:Arial,sans-serif;padding:20px;color:#172033}table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:start}h2,h3{margin-top:18px}</style></head><body>${clone.innerHTML}</body></html>`;
  }
  function downloadText(content, filename, mime){
    try{
      const blob = new Blob([content],{type:mime});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href=url;a.download=filename;a.rel="noopener";a.style.display="none";
      document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),15000);
      return true;
    }catch(e){return false;}
  }
  async function copyText(value, textarea){
    try{
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(value);return true;}
    }catch(e){}
    if(textarea){
      textarea.focus();textarea.select();textarea.setSelectionRange(0,textarea.value.length);
      try{return document.execCommand("copy");}catch(e){}
    }
    return false;
  }
  function closeDialog(){document.querySelector(".tm-v9-dialog-backdrop")?.remove();}
  function showExportDialog(kind){
    closeDialog();
    const csv = kind==="csv";
    const content = csv ? csvFromReport() : reportHtml();
    const filename = csv ? `TravelMate-Expenses-${new Date().toISOString().slice(0,10)}.csv`
                         : `TravelMate-Financial-Report-${new Date().toISOString().slice(0,10)}.html`;
    const mime = csv ? "text/csv;charset=utf-8" : "text/html;charset=utf-8";
    if(!content){alert(t("There is no report data to export.","لا توجد بيانات تقرير لتصديرها."));return;}
    const back=document.createElement("div");back.className="tm-v9-dialog-backdrop";
    back.innerHTML=`<div class="tm-v9-dialog" role="dialog" aria-modal="true">
      <h3>${csv?t("Export expenses CSV","تصدير المصروفات CSV"):t("Save financial report","حفظ التقرير المالي")}</h3>
      <p>${csv?t("The report is ready. Copy it or share it if downloading is unavailable in this Android app.","التقرير جاهز. يمكنك نسخه أو مشاركته إذا لم يعمل تنزيل الملفات داخل التطبيق."):t("Save the report as an HTML file, or share its content.","احفظ التقرير كملف HTML أو شارك محتواه.")}</p>
      <textarea id="tm-v9-export-text" readonly spellcheck="false"></textarea>
      <div class="tm-v9-actions">
        <button class="primary" id="tm-v9-copy">${t("Copy","نسخ")}</button>
        <button id="tm-v9-share">${t("Share","مشاركة")}</button>
        <button id="tm-v9-download">${t("Download file","تنزيل الملف")}</button>
        <button id="tm-v9-close">${t("Close","إغلاق")}</button>
      </div>
      <p class="tm-v9-note" id="tm-v9-export-status">${t("If file download does not start, use Copy or Share.","إذا لم يبدأ التنزيل، استخدم النسخ أو المشاركة.")}</p>
    </div>`;
    document.body.appendChild(back);
    const area=$("tm-v9-export-text");area.value=content;
    $("tm-v9-copy").onclick=async()=>{
      const ok=await copyText(content,area);
      $("tm-v9-export-status").textContent=ok?t("Copied successfully.","تم النسخ بنجاح."):t("Select the text above and copy it manually.","حدد النص أعلاه وانسخه يدويًا.");
    };
    $("tm-v9-share").onclick=async()=>{
      try{
        if(navigator.share){await navigator.share({title:filename,text:content});}
        else {const ok=await copyText(content,area);$("tm-v9-export-status").textContent=ok?t("Copied; you can paste it into any app.","تم النسخ؛ يمكنك لصقه في أي تطبيق."):t("Sharing is unavailable. Use Copy.","المشاركة غير متاحة. استخدم النسخ.");}
      }catch(e){
        if(e?.name!=="AbortError")$("tm-v9-export-status").textContent=t("Sharing was not completed. Use Copy or Download.","لم تكتمل المشاركة. استخدم النسخ أو التنزيل.");
      }
    };
    $("tm-v9-download").onclick=()=>{
      const ok=downloadText(content,filename,mime);
      $("tm-v9-export-status").textContent=ok?t("Download was requested. If no file appears, use Copy or Share.","تم طلب تنزيل الملف. إذا لم يظهر، استخدم النسخ أو المشاركة."):t("Download is unavailable here. Use Copy or Share.","التنزيل غير متاح هنا. استخدم النسخ أو المشاركة.");
    };
    $("tm-v9-close").onclick=closeDialog;
    back.addEventListener("click",e=>{if(e.target===back)closeDialog();});
  }

  function reportClickHandler(e){
    const btn=e.target.closest("#v8-report-csv,#v8-report-save");
    if(!btn)return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();
    showExportDialog(btn.id==="v8-report-csv"?"csv":"html");
  }
  document.addEventListener("click",reportClickHandler,true);

  function addSearch(){
    const home=$("home");
    if(!home||$("tm-v9-search"))return;
    const box=document.createElement("section");box.className="tm-v9-search";box.id="tm-v9-search";
    box.innerHTML=`<h3>${t("Search everything","بحث شامل")}</h3><input id="tm-v9-search-input" type="search" placeholder="${t("Search trips, places, activities and expenses…","ابحث في الرحلات والأماكن والأنشطة والمصروفات…")}" autocomplete="off"><div id="tm-v9-search-results" class="tm-v9-results"></div>`;
    const hero=home.querySelector(".hero");
    if(hero)hero.insertAdjacentElement("afterend",box);else home.prepend(box);
    $("tm-v9-search-input").addEventListener("input",renderSearch);
  }
  function renderSearch(){
    const q=($("tm-v9-search-input")?.value||"").trim().toLocaleLowerCase();
    const host=$("tm-v9-search-results");if(!host)return;
    if(q.length<2){host.innerHTML=`<small>${t("Enter at least 2 characters.","أدخل حرفين على الأقل.")}</small>`;return;}
    const results=[];
    (Array.isArray(trips)?trips:[]).forEach((trip,index)=>{
      const add=(kind,label,detail,action)=>{if((label+" "+detail).toLocaleLowerCase().includes(q))results.push({kind,label,detail,action});};
      add("trip",trip.name||t("Untitled trip","رحلة بلا اسم"),(trip.cities||[]).join(" "),()=>{currentTrip=index;showPage("detail");renderTrip();});
      (trip.cities||[]).forEach(city=>add("place",city,trip.name||"",()=>{currentTrip=index;showPage("detail");renderTrip();}));
      (trip.activities||[]).forEach(activity=>add("activity",activity.name||activity.title||t("Activity","نشاط"),`${trip.name||""} ${activity.city||""} ${activity.date||""} ${activity.notes||""}`,()=>{currentTrip=index;showPage("detail");renderTrip();}));
    });
    (Array.isArray(expenses)?expenses:[]).forEach(exp=>addExpenseResult(exp,results,q));
    host.innerHTML="";
    if(!results.length){host.innerHTML=`<small>${t("No matches found.","لا توجد نتائج مطابقة.")}</small>`;return;}
    results.slice(0,30).forEach(r=>{
      const b=document.createElement("button");b.type="button";b.className="tm-v9-result";
      b.innerHTML=`<strong>${esc(r.label)}</strong><small>${esc(r.kind)} · ${esc(r.detail)}</small>`;
      b.onclick=()=>{try{r.action();}catch(e){showPage("trips");} };
      host.appendChild(b);
    });
  }
  function addExpenseResult(exp,results,q){
    const trip=trips.find(x=>x.id===exp.tripId);
    const label=exp.title||t("Expense","مصروف");
    const detail=[exp.category,exp.payer,trip?.name,exp.date,exp.notes].filter(Boolean).join(" ");
    if((label+" "+detail).toLocaleLowerCase().includes(q)){
      results.push({kind:t("expense","مصروف"),label,detail,action:()=>{showPage("expenses");$("expenseList")?.scrollIntoView({behavior:"smooth",block:"start"});}});
    }
  }

  function snapshotBeforeRestore(e){
    const file=e.target?.files?.[0];if(!file)return;
    try{
      const snap={app:"TravelMate",version:9,createdAt:new Date().toISOString(),
        trips:JSON.parse(JSON.stringify(trips||[])),expenses:JSON.parse(JSON.stringify(expenses||[])),
        checklist:JSON.parse(JSON.stringify(checklist||[])),settings:JSON.parse(JSON.stringify(settings||{}))};
      localStorage.setItem("travelmate_v9_pre_restore",JSON.stringify(snap));
      localStorage.setItem("travelmate_v9_pre_restore_time",snap.createdAt);
      const status=$("tm-v9-restore-status");
      if(status)status.textContent=t("A safety snapshot of current trip and expense data was saved before restore.","تم حفظ نسخة أمان من بيانات الرحلات والمصروفات الحالية قبل الاستعادة.");
    }catch(err){
      alert(t("Could not create a safety snapshot. Free some device storage before restoring.","تعذر إنشاء نسخة أمان. أفرغ بعض مساحة الجهاز قبل الاستعادة."));
      e.stopImmediatePropagation();e.preventDefault();
    }
  }
  function restoreSnapshot(){
    let snap;
    try{snap=JSON.parse(localStorage.getItem("travelmate_v9_pre_restore")||"null");}catch(e){}
    if(!snap||!Array.isArray(snap.trips)||!Array.isArray(snap.expenses)){
      alert(t("No pre-restore safety snapshot is available on this device.","لا توجد نسخة أمان سابقة للاستعادة على هذا الجهاز."));return;
    }
    if(!confirm(t("Restore the data that was on this device immediately before the last backup restore?","هل تريد استعادة البيانات التي كانت على الجهاز قبل آخر عملية استعادة للنسخة الاحتياطية؟")))return;
    try{
      trips=snap.trips;expenses=snap.expenses;checklist=Array.isArray(snap.checklist)?snap.checklist:[];
      if(snap.settings)settings={...settings,...snap.settings};
      if(typeof save==="function")save();
      if(typeof normalize==="function")normalize();
      if(typeof applySettings==="function")applySettings();
      if(typeof renderAll==="function")renderAll();
      if(typeof showPage==="function")showPage("home");
      alert(t("Your pre-restore data has been recovered. Receipt images are not included in this safety snapshot.","تمت استعادة بياناتك السابقة. صور الفواتير غير مشمولة في نسخة الأمان هذه."));
    }catch(e){alert(t("Could not restore the safety snapshot.","تعذرت استعادة نسخة الأمان."));}
  }
  function addRestoreSafety(){
    const card=document.querySelector("#settings .settings-card");
    if(!card||$("tm-v9-restore-safety"))return;
    const panel=document.createElement("div");panel.className="settings-card";panel.id="tm-v9-restore-safety";
    panel.innerHTML=`<h3>🛡️ ${t("Restore safety","حماية الاستعادة")}</h3><p id="tm-v9-restore-status">${t("Before importing a backup, TravelMate V9 saves a local snapshot of your current trips and expenses. You can recover it here if needed.","قبل استيراد نسخة احتياطية، يحفظ TravelMate V9 نسخة محلية من رحلاتك ومصروفاتك الحالية. يمكنك استعادتها من هنا عند الحاجة.")}</p><button class="secondary full-btn" id="tm-v9-restore-snapshot">${t("Recover previous data","استعادة البيانات السابقة")}</button>`;
    card.insertAdjacentElement("afterend",panel);
    $("tm-v9-restore-snapshot").onclick=restoreSnapshot;
  }

  function install(){
    addSearch();addRestoreSafety();
    document.addEventListener("change",e=>{if(e.target?.id==="restoreFile")snapshotBeforeRestore(e);},true);
    const observer=new MutationObserver(()=>{addSearch();addRestoreSafety();});
    observer.observe(document.body,{childList:true,subtree:true});
    // Repaint the report if another V8/V7 component recreated it.
    const reportObserver=new MutationObserver(()=>{
      const root=$("tm-v8-report-print");
      if(root){root.style.setProperty("display","block","important");}
    });
    reportObserver.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();