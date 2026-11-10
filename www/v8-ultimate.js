/* TravelMate V8 Ultimate — unified calendar, activity dates, in-app finance reports,
   export center and Android-safe printing. Additive migration; preserves V4–V7.1 data. */
(() => {
  "use strict";
  if (window.__travelMateV8Loaded) return;
  window.__travelMateV8Loaded = true;

  const $ = id => document.getElementById(id);
  const isAr = () => typeof settings !== "undefined" && settings.language === "ar";
  const tx = (en, ar) => isAr() ? ar : en;
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const localISO = (date = new Date()) =>
    `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
  const today = () => localISO();
  const validISO = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) &&
    !Number.isNaN(new Date(`${value}T12:00:00`).getTime());
  const parseISO = value => validISO(value) ? new Date(`${value}T12:00:00`) : null;
  const fmtDate = value => {
    const d = parseISO(value);
    return d ? new Intl.DateTimeFormat(isAr() ? "ar-EG" : undefined,
      {year:"numeric",month:"short",day:"numeric"}).format(d) : (value || "");
  };
  const addDays = (value, count) => {
    const d = parseISO(value);
    if (!d) return "";
    d.setDate(d.getDate() + count);
    return localISO(d);
  };
  const id = () => typeof uid === "function" ? uid() :
    `v8-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
  const persist = () => { if (typeof save === "function") save(); };
  const refresh = () => {
    if (typeof renderAll === "function") renderAll();
    if (typeof renderTrip === "function" && typeof currentTrip !== "undefined" && currentTrip !== null) renderTrip();
  };
  const current = () => typeof trips !== "undefined" && currentTrip !== null ? trips[currentTrip] : null;

  const css = document.createElement("style");
  css.id = "tm-v8-style";
  css.textContent = `
    .v8-card{background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:17px;padding:14px;margin:12px 0;box-shadow:var(--shadow)}
    .v8-row{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}
    .v8-muted{font-size:11px;color:var(--muted)}
    .v8-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .v8-btn{border:1px solid var(--border);background:var(--surface2);color:var(--text);border-radius:11px;padding:10px 12px;min-height:42px;font-weight:750;font-size:12px}
    .v8-btn.primary{background:var(--accent);border-color:var(--accent);color:white}
    .v8-btn.danger{color:#c84d55}
    .v8-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
    .v8-field{display:grid;gap:5px;min-width:0}
    .v8-field.wide{grid-column:1/-1}
    .v8-field label{font-size:11px;font-weight:800;color:var(--muted)}
    .v8-field input,.v8-field select,.v8-field textarea{box-sizing:border-box;width:100%;min-height:46px;padding:10px 11px;border:1px solid var(--border);border-radius:11px;background:var(--bg);color:var(--text);font:inherit;font-size:16px}
    .v8-field textarea{min-height:76px}
    .v8-modal-bg{position:fixed;inset:0;z-index:100100;background:#07101dcc;display:flex;align-items:flex-end;justify-content:center;padding:9px}
    .v8-modal{width:min(100%,620px);max-height:94dvh;overflow:auto;background:var(--surface);color:var(--text);border-radius:21px;padding:16px;box-shadow:0 18px 55px #0007}
    .v8-modal h2{font-size:19px;margin:0 0 13px}
    .v8-modal-actions{display:flex;gap:8px;margin-top:13px;position:sticky;bottom:-16px;background:var(--surface);padding:10px 0 0}
    .v8-modal-actions button{flex:1}
    .v8-calendar-day{padding:10px 0;border-top:1px solid var(--border)}
    .v8-calendar-day:first-child{border-top:0}
    .v8-calendar-date{font-weight:850;color:var(--accent);margin-bottom:5px}
    .v8-calendar-activity{padding:8px 10px;margin:5px 0;border-radius:10px;background:var(--surface2);font-size:12px}
    .v8-report-table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}
    .v8-report-table th,.v8-report-table td{padding:8px 6px;border-bottom:1px solid var(--border);text-align:start;vertical-align:top}
    .v8-report-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:12px 0}
    .v8-report-summary>div{background:var(--surface2);border-radius:11px;padding:10px}
    .v8-report-summary b{display:block;font-size:16px;overflow-wrap:anywhere}
    #tm-v8-report-print{display:none}
    body.tm-v8-printing>*:not(#tm-v8-report-print){display:none!important}
    body.tm-v8-printing #tm-v8-report-print{display:block!important;position:static!important;background:white!important;color:#172033!important;padding:20px!important}
    body.tm-v8-printing #tm-v8-report-print *{color:#172033!important}
    @media print{
      body.tm-v8-printing>*:not(#tm-v8-report-print){display:none!important}
      body.tm-v8-printing #tm-v8-report-print{display:block!important}
      #tm-v8-report-print button{display:none!important}
      #tm-v8-report-print table{width:100%;border-collapse:collapse}
      #tm-v8-report-print th,#tm-v8-report-print td{border-bottom:1px solid #ddd;padding:7px;text-align:start}
    }
    @media(max-width:430px){.v8-grid{grid-template-columns:1fr}.v8-field.wide{grid-column:auto}.v8-modal{padding:13px}}
  `;
  document.head.appendChild(css);

  function openModal(title, fields, initial, onSave) {
    $("tm-v8-modal")?.remove();
    const root = document.createElement("div");
    root.id = "tm-v8-modal";
    root.className = "v8-modal-bg";
    const inputs = fields.map(f => {
      const value = initial[f.name] ?? f.default ?? "";
      const control = f.type === "textarea"
        ? `<textarea name="${esc(f.name)}" ${f.required?"required":""}>${esc(value)}</textarea>`
        : f.type === "select"
          ? `<select name="${esc(f.name)}" ${f.required?"required":""}>${f.options||""}</select>`
          : `<input name="${esc(f.name)}" type="${esc(f.type||"text")}" value="${esc(value)}" ${f.min!==undefined?`min="${f.min}"`:""} ${f.max!==undefined?`max="${f.max}"`:""} ${f.step?`step="${f.step}"`:""} ${f.required?"required":""}>`;
      return `<div class="v8-field ${f.wide?"wide":""}"><label>${esc(f.label)}</label>${control}</div>`;
    }).join("");
    root.innerHTML = `<section class="v8-modal" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><form><div class="v8-grid">${inputs}</div><div class="v8-modal-actions"><button type="button" class="v8-btn" data-close>${tx("Cancel","إلغاء")}</button><button type="submit" class="v8-btn primary">${tx("Save","حفظ")}</button></div></form></section>`;
    document.body.appendChild(root);
    fields.forEach(f => {
      const el = root.querySelector(`[name="${f.name}"]`);
      if (el) el.value = initial[f.name] ?? f.default ?? "";
    });
    const close = () => root.remove();
    root.addEventListener("click", e => {
      if (e.target === root || e.target.closest("[data-close]")) close();
    });
    root.querySelector("form").addEventListener("submit", e => {
      e.preventDefault();
      const values = {};
      fields.forEach(f => values[f.name] = root.querySelector(`[name="${f.name}"]`)?.value ?? "");
      if (fields.some(f => f.required && !String(values[f.name]).trim())) return;
      for (const f of fields.filter(x => x.type === "date")) {
        if (values[f.name] && !validISO(values[f.name])) {
          alert(tx("Please choose a valid date.","يرجى اختيار تاريخ صحيح."));
          return;
        }
      }
      onSave(values);
      close();
    });
    root.querySelector("input,select,textarea")?.focus();
  }

  function createTrip() {
    openModal(tx("Create a trip","إنشاء رحلة"),[
      {name:"name",label:tx("Trip name","اسم الرحلة"),required:true,wide:true},
      {name:"destination",label:tx("First destination","الوجهة الأولى"),required:true,wide:true},
      {name:"date",label:tx("Start date","تاريخ البداية"),type:"date"}
    ],{date:today()},v=>{
      const trip={id:id(),name:v.name.trim(),cities:[v.destination.trim()],date:v.date||"",
        activities:[],travelers:["Traveler 1"],savedPlaces:[],journal:[],budget:0};
      trips.push(trip);
      persist();
      if(typeof openTrip==="function") openTrip(trips.length-1);
      refresh();
    });
  }

  function activityDateFor(trip, activity) {
    if (validISO(activity.calendarDate)) return activity.calendarDate;
    const match = String(activity.day||"Day 1").match(/(\d+)/);
    const dayNo = match ? Math.max(1,Number(match[1])) : 1;
    return validISO(trip?.date) ? addDays(trip.date,dayNo-1) : "";
  }

  function editActivity(activityId) {
    const trip=current();
    const activity=trip?.activities?.find(a=>String(a.id)===String(activityId));
    if(!trip||!activity)return;
    openModal(tx("Edit activity","تعديل النشاط"),[
      {name:"name",label:tx("Activity name","اسم النشاط"),required:true,wide:true},
      {name:"day",label:tx("Timeline day label","اسم اليوم في الجدول")},
      {name:"calendarDate",label:tx("Actual calendar date","التاريخ الفعلي"),type:"date"},
      {name:"time",label:tx("Start time","وقت البداية"),type:"time"},
      {name:"duration",label:tx("Duration (minutes)","المدة بالدقائق"),type:"number",min:5,max:1440,step:5},
      {name:"cost",label:tx("Estimated cost","التكلفة المتوقعة"),type:"number",min:0,step:"0.01"},
      {name:"city",label:tx("Place / address","المكان / العنوان"),wide:true},
      {name:"notes",label:tx("Notes","ملاحظات"),type:"textarea",wide:true}
    ],{name:activity.name||"",day:activity.day||"Day 1",calendarDate:activityDateFor(trip,activity),
      time:activity.time||"",duration:activity.duration||60,cost:activity.cost||0,city:activity.city||"",notes:activity.notes||""},v=>{
      activity.name=v.name.trim();
      activity.day=(v.day||"Day 1").trim()||"Day 1";
      activity.calendarDate=v.calendarDate||"";
      activity.time=v.time||"";
      activity.duration=Math.max(5,Math.min(1440,Number(v.duration)||60));
      activity.cost=Math.max(0,Number(v.cost)||0);
      activity.city=(v.city||"").trim();
      activity.notes=(v.notes||"").trim();
      persist();refresh();
    });
  }

  function addActivity() {
    const trip=current(); if(!trip)return;
    const next=Array.isArray(trip.activities)?trip.activities.length+1:1;
    openModal(tx("Add activity","إضافة نشاط"),[
      {name:"name",label:tx("Activity name","اسم النشاط"),required:true,wide:true},
      {name:"day",label:tx("Timeline day label","اسم اليوم في الجدول")},
      {name:"calendarDate",label:tx("Actual calendar date","التاريخ الفعلي"),type:"date"},
      {name:"time",label:tx("Start time","وقت البداية"),type:"time"},
      {name:"duration",label:tx("Duration (minutes)","المدة بالدقائق"),type:"number",min:5,max:1440,step:5},
      {name:"cost",label:tx("Estimated cost","التكلفة المتوقعة"),type:"number",min:0,step:"0.01"},
      {name:"city",label:tx("Place / address","المكان / العنوان"),wide:true},
      {name:"notes",label:tx("Notes","ملاحظات"),type:"textarea",wide:true}
    ],{day:`Day ${next}`,calendarDate:validISO(trip.date)?addDays(trip.date,next-1):"",duration:60,cost:0},v=>{
      trip.activities=Array.isArray(trip.activities)?trip.activities:[];
      trip.activities.push({id:id(),name:v.name.trim(),day:(v.day||`Day ${next}`).trim(),
        calendarDate:v.calendarDate||"",time:v.time||"",duration:Math.max(5,Math.min(1440,Number(v.duration)||60)),
        cost:Math.max(0,Number(v.cost)||0),city:(v.city||"").trim(),notes:(v.notes||"").trim()});
      persist();refresh();
    });
  }

  function renderCalendar() {
    const trip=current(), dayList=$("dayList");
    if(!trip||!dayList)return;
    let host=$("v8-calendar");
    if(!host){host=document.createElement("section");host.id="v8-calendar";host.className="v8-card";dayList.insertAdjacentElement("afterend",host);}
    const rows=(trip.activities||[]).map(a=>({a,date:activityDateFor(trip,a)}))
      .sort((x,y)=>(x.date||"9999").localeCompare(y.date||"9999")||
        String(x.a.time||"").localeCompare(String(y.a.time||"")));
    const groups=[];
    rows.forEach(row=>{
      const key=row.date||tx("Date not set","تاريخ غير محدد");
      let g=groups.find(x=>x.key===key);if(!g){g={key,items:[]};groups.push(g);}g.items.push(row.a);
    });
    host.innerHTML=`<div class="v8-row"><b>🗓️ ${tx("Trip calendar","تقويم الرحلة")}</b><span class="v8-muted">${rows.length} ${tx("activities","أنشطة")}</span></div>
      ${groups.length?groups.map(g=>`<div class="v8-calendar-day"><div class="v8-calendar-date">${validISO(g.key)?fmtDate(g.key):esc(g.key)}</div>${g.items.map(a=>`<div class="v8-calendar-activity"><div class="v8-row"><b>${esc(a.time||"—")} · ${esc(a.name)}</b><button type="button" class="v8-btn" data-v8-set-date="${esc(a.id)}">${tx("Change date","تغيير التاريخ")}</button></div><div class="v8-muted">${esc(a.city||"")}${a.day?` · ${esc(a.day)}`:""}</div></div>`).join("")}</div>`).join(""):`<p class="v8-muted">${tx("Add activities with dates to see your calendar here.","أضف أنشطة وحدد تواريخها لعرضها هنا.")}</p>`}`;
    host.querySelectorAll("[data-v8-set-date]").forEach(button=>button.addEventListener("click",()=>{
      const a=trip.activities.find(x=>String(x.id)===button.dataset.v8SetDate);if(!a)return;
      openModal(tx("Change activity date","تغيير تاريخ النشاط"),[
        {name:"calendarDate",label:tx("Actual calendar date","التاريخ الفعلي"),type:"date"}
      ],{calendarDate:activityDateFor(trip,a)},v=>{a.calendarDate=v.calendarDate||"";persist();renderCalendar();});
    }));
  }

  // V8 finance report lives inside the current WebView. No window.open / popup.
  let activeReport = null;
  function reportRows(filters) {
    return (expenses||[]).filter(e=>{
      const date=String(e.date||"");
      const trip=trips.find(t=>t.id===e.tripId);
      return (!filters.from||date>=filters.from)&&(!filters.to||date<=filters.to)&&
        (filters.trip==="all"||(filters.trip==="general"?!e.tripId:e.tripId===filters.trip))&&
        (filters.payer==="all"||(e.payer||"Unspecified")===filters.payer);
    }).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
  }
  const amountText = n => typeof money==="function" ? money(Number(n)||0) :
    `${Number(n||0).toLocaleString()} ${settings?.currency||"EGP"}`;

  function buildReport(filters) {
    const list=reportRows(filters),total=list.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const cats=[...new Set(list.map(e=>e.category||"other"))].map(key=>{
      const sum=list.filter(e=>(e.category||"other")===key).reduce((s,e)=>s+(Number(e.amount)||0),0);
      return {key,sum};
    }).sort((a,b)=>b.sum-a.sum);
    const rows=list.map(e=>`<tr><td>${esc(e.date||"—")}</td><td>${esc(e.title||"")}</td><td>${esc(e.category||"other")}</td><td>${esc(e.payer||"—")}</td><td>${esc(trips.find(t=>t.id===e.tripId)?.name||"—")}</td><td>${esc(amountText(e.amount))}</td></tr>`).join("");
    let comparison="";
    if(validISO(filters.from)&&validISO(filters.to)){
      const start=parseISO(filters.from),end=parseISO(filters.to);
      const span=Math.round((end-start)/86400000)+1;
      const prevEnd=addDays(filters.from,-1),prevStart=addDays(filters.from,-span);
      const prevTotal=(expenses||[]).filter(e=>e.date>=prevStart&&e.date<=prevEnd&&
        (filters.trip==="all"||(filters.trip==="general"?!e.tripId:e.tripId===filters.trip))&&
        (filters.payer==="all"||(e.payer||"Unspecified")===filters.payer))
        .reduce((sum,e)=>sum+(Number(e.amount)||0),0);
      const delta=prevTotal?((total-prevTotal)/prevTotal*100):null;
      comparison=`<div class="v8-card"><b>${tx("Compared with previous equal period","مقارنة بالفترة السابقة المماثلة")}</b><p>${tx("Previous period","الفترة السابقة")}: ${esc(fmtDate(prevStart))} – ${esc(fmtDate(prevEnd))}</p><b>${esc(amountText(prevTotal))}</b><p class="v8-muted">${delta===null?tx("No previous-period records for percentage comparison.","لا توجد بيانات سابقة لحساب نسبة التغير."):((delta>0?"+":"")+delta.toFixed(1)+"% "+tx("change","تغير"))}</p></div>`;
    }
    const from=filters.from?fmtDate(filters.from):tx("Any date","كل التواريخ");
    const to=filters.to?fmtDate(filters.to):tx("Any date","كل التواريخ");
    return `<div class="v8-row"><div><h2>TravelMate — ${tx("Financial report","التقرير المالي")}</h2><p class="v8-muted">${tx("Period","الفترة")}: ${esc(from)} – ${esc(to)}</p></div><b>${esc(settings?.currency||"EGP")}</b></div>
      <div class="v8-report-summary"><div><small>${tx("Total spending","إجمالي الإنفاق")}</small><b>${esc(amountText(total))}</b></div><div><small>${tx("Number of expenses","عدد المصروفات")}</small><b>${list.length}</b></div></div>${comparison}
      <h3>${tx("Category breakdown","التوزيع حسب التصنيف")}</h3><ul>${cats.map(c=>`<li>${esc(c.key)} — ${esc(amountText(c.sum))}</li>`).join("")||`<li>${tx("No records in this period","لا توجد مصروفات في هذه الفترة")}</li>`}</ul>
      <table class="v8-report-table"><thead><tr><th>${tx("Date","التاريخ")}</th><th>${tx("Expense","المصروف")}</th><th>${tx("Category","التصنيف")}</th><th>${tx("Payer","الدافع")}</th><th>${tx("Trip","الرحلة")}</th><th>${tx("Amount","المبلغ")}</th></tr></thead><tbody>${rows||`<tr><td colspan="6">${tx("No records","لا توجد بيانات")}</td></tr>`}</tbody></table>`;
  }

  function showReport() {
    const people=[...new Set((expenses||[]).map(e=>e.payer||"Unspecified"))];
    openModal(tx("Financial report","التقرير المالي"),[
      {name:"from",label:tx("From date","من تاريخ"),type:"date"},
      {name:"to",label:tx("To date","إلى تاريخ"),type:"date"},
      {name:"trip",label:tx("Trip","الرحلة"),type:"select",options:`<option value="all">${tx("All trips","كل الرحلات")}</option><option value="general">${tx("General expenses","مصروفات عامة")}</option>`+trips.map(t=>`<option value="${esc(t.id)}">${esc(t.name)}</option>`).join("")},
      {name:"payer",label:tx("Payer","الدافع"),type:"select",options:`<option value="all">${tx("All payers","كل الدافعين")}</option>`+people.map(p=>`<option value="${esc(p)}">${esc(p)}</option>`).join("")}
    ],{from:"",to:"",trip:"all",payer:"all"},v=>{
      if(v.from&&v.to&&v.from>v.to){alert(tx("The start date must be before the end date.","يجب أن يكون تاريخ البداية قبل تاريخ النهاية."));return;}
      activeReport={...v};
      renderReportOverlay();
    });
  }

  function renderReportOverlay() {
    $("tm-v8-report-print")?.remove();
    const root=document.createElement("section");root.id="tm-v8-report-print";root.dir=isAr()?"rtl":"ltr";
    root.innerHTML=`<div class="v8-actions" style="margin-bottom:12px"><button class="v8-btn" id="v8-report-back">${tx("Back","رجوع")}</button><button class="v8-btn primary" id="v8-report-print-btn">${tx("Print / Save PDF","طباعة / حفظ PDF")}</button><button class="v8-btn" id="v8-report-save">${tx("Save report","حفظ التقرير")}</button><button class="v8-btn" id="v8-report-csv">${tx("Export CSV","تصدير CSV")}</button></div>${buildReport(activeReport)}`;
    document.body.appendChild(root);
    $("v8-report-back").onclick=()=>{root.remove();document.body.classList.remove("tm-v8-printing");};
    $("v8-report-print-btn").onclick=()=>{
      document.body.classList.add("tm-v8-printing");
      const done=()=>document.body.classList.remove("tm-v8-printing");
      window.addEventListener("afterprint",done,{once:true});
      window.print();
      setTimeout(done,2500);
    };
    $("v8-report-save").onclick=()=>saveReportFile("html");
    $("v8-report-csv").onclick=()=>saveReportFile("csv");
  }

  function csvEscape(v){return `"${String(v??"").replace(/"/g,'""')}"`;}
  function saveReportFile(kind) {
    const list=reportRows(activeReport||{from:"",to:"",trip:"all",payer:"all"});
    let content="",mime="",filename="";
    if(kind==="csv"){
      const data=[["Date","Expense","Category","Payer","Trip","Amount","Currency"],
        ...list.map(e=>[e.date,e.title,e.category,e.payer,trips.find(t=>t.id===e.tripId)?.name||"",e.amount,settings?.currency||"EGP"])];
      content="\uFEFF"+data.map(row=>row.map(csvEscape).join(",")).join("\r\n");
      mime="text/csv;charset=utf-8";filename=`TravelMate-Expenses-${today()}.csv`;
    }else{
      const report=$("tm-v8-report-print")?.innerHTML||buildReport(activeReport);
      content=`<!doctype html><html lang="${isAr()?"ar":"en"}" dir="${isAr()?"rtl":"ltr"}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TravelMate report</title><style>body{font-family:Arial;padding:20px;color:#172033}table{width:100%;border-collapse:collapse;font-size:12px}td,th{padding:8px;border-bottom:1px solid #ddd;text-align:start}.v8-actions{display:none}</style>${report}</html>`;
      mime="text/html;charset=utf-8";filename=`TravelMate-Financial-Report-${today()}.html`;
    }
    const blob=new Blob([content],{type:mime});
    const file=new File([blob],filename,{type:mime});
    if(navigator.canShare?.({files:[file]})&&navigator.share){
      navigator.share({files:[file],title:filename}).catch(()=>downloadBlob(blob,filename));
    }else downloadBlob(blob,filename);
  }
  function downloadBlob(blob,filename){
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=filename;a.style.display="none";document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),3000);
  }

  function ensureExportCenter() {
    const settingsPage=$("settings");if(!settingsPage||$("v8-export-center"))return;
    const card=document.createElement("div");card.className="settings-card";card.id="v8-export-center";
    card.innerHTML=`<h3>📦 ${tx("Export center","مركز التصدير")}</h3><p>${tx("Create filtered financial reports and export your data.","أنشئ تقارير مالية محددة الفترة وصدّر بياناتك.")}</p><button class="secondary full-btn" id="v8-open-report">${tx("Financial report","التقرير المالي")}</button><button class="secondary full-btn" id="v8-export-expenses">${tx("Export expenses CSV","تصدير المصروفات CSV")}</button><button class="secondary full-btn" id="v8-backup">${tx("Backup including receipts","نسخة احتياطية تشمل الفواتير")}</button></div>`;
    settingsPage.appendChild(card);
    $("v8-open-report").onclick=showReport;
    $("v8-export-expenses").onclick=()=>{
      activeReport={from:"",to:"",trip:"all",payer:"all"};
      saveReportFile("csv");
    };
    $("v8-backup").onclick=()=>$("backupBtn")?.click();
  }

  function install() {
    // Replace the old prompt-based trip creation with a native Android date picker form.
    ["newTripBtn","addTripBtn"].forEach(buttonId=>{
      $(buttonId)?.addEventListener("click",e=>{
        e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();createTrip();
      },true);
    });
    // Own the add/edit activity forms so each activity can carry a real calendar date.
    $("addDayBtn")?.addEventListener("click",e=>{
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();addActivity();
    },true);
    document.addEventListener("click",e=>{
      const edit=e.target.closest("[data-v5-edit]");
      if(edit){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();editActivity(edit.getAttribute("data-v5-edit"));}
    },true);

    const oldTrip=window.renderTrip;
    if(typeof oldTrip==="function")window.renderTrip=function(){oldTrip();renderCalendar();};
    const oldAll=window.renderAll;
    if(typeof oldAll==="function")window.renderAll=function(){oldAll();ensureExportCenter();if(current())renderCalendar();};
    ensureExportCenter();
    if(current())renderCalendar();

    // Intercept both V7 report entry points before their popup-based handler.
    document.addEventListener("click",e=>{
      const button=e.target.closest("#v7-report,#v7-settings-report");
      if(!button)return;
      e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();showReport();
    },true);
    // Keep V8 report available if V7 dynamically rebuilds the settings card.
    const observer=new MutationObserver(()=>ensureExportCenter());
    observer.observe(document.body,{childList:true,subtree:true});
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();