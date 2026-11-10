/* TravelMate V6 Ultimate — additive upgrade for the existing V4/V5 data model */
(() => {
  "use strict";
  if (window.__travelMateV6Loaded) return;
  window.__travelMateV6Loaded = true;

  const $ = id => document.getElementById(id);
  const t = () => (typeof trips !== "undefined" && currentTrip !== null) ? trips[currentTrip] : null;
  const tr6 = (en, ar) => (typeof settings !== "undefined" && settings.language === "ar") ? ar : en;
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const cash = n => (typeof money === "function" ? money(Number(n)||0) : String(Number(n)||0));
  const persist = () => { if (typeof save === "function") save(); };
  const mins = v => {
    const s=String(v||"").trim().toLowerCase().replace(/\./g,"");
    let m=/^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(s) || /^(\d{1,2})\s*(am|pm)$/.exec(s);
    if(!m) return null;
    let h=+m[1], mm=+(m[2]||0);
    if(mm>59 || h>23) return null;
    if(m[3]==="pm"&&h<12)h+=12;
    if(m[3]==="am"&&h===12)h=0;
    return h*60+mm;
  };
  const clock = n => String(Math.floor(n/60)%24).padStart(2,"0")+":"+String(n%60).padStart(2,"0");
  const ensure = trip => {
    if(!trip) return;
    if(!Array.isArray(trip.savedPlaces)) trip.savedPlaces=[];
    if(!Array.isArray(trip.journal)) trip.journal=[];
    if(!Number.isFinite(Number(trip.budget))) trip.budget=0;
  };
  const style=document.createElement("style");
  style.id="tm-v6-style";
  style.textContent=`
    .v6-wrap{display:grid;gap:12px;margin:14px 0 22px}
    .v6-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:15px;box-shadow:var(--shadow)}
    .v6-card h3{font-size:15px;margin:0 0 10px}
    .v6-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .v6-muted{color:var(--muted);font-size:11px}
    .v6-metric{font-size:24px;font-weight:850;color:var(--accent)}
    .v6-progress{height:9px;background:var(--surface2);border-radius:20px;overflow:hidden;margin:9px 0}
    .v6-progress>i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:20px}
    .v6-btn{border:0;border-radius:11px;padding:9px 12px;background:var(--surface2);color:var(--text);font-weight:750;font-size:11px}
    .v6-btn.primary{background:var(--accent);color:white}
    .v6-chip{display:inline-block;padding:4px 8px;border-radius:20px;background:var(--surface2);font-size:10px;color:var(--muted)}
    .v6-alert{padding:10px;border-radius:12px;background:rgba(218,143,37,.12);border:1px solid rgba(218,143,37,.35);margin:8px 0;font-size:11px}
    .v6-good{background:rgba(37,182,163,.1);border-color:rgba(37,182,163,.3)}
    .v6-item{padding:10px 0;border-top:1px solid var(--border)}
    .v6-item:first-of-type{border-top:0}
    .v6-modal-bg{position:fixed;inset:0;z-index:100001;background:#10182799;display:flex;align-items:flex-end;justify-content:center;padding:10px}
    .v6-modal{width:min(100%,560px);max-height:92dvh;overflow:auto;background:var(--surface);color:var(--text);border-radius:22px;padding:18px;box-shadow:0 20px 60px #0005}
    .v6-modal h2{font-size:19px;margin:0 0 14px}
    .v6-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .v6-field{display:grid;gap:5px;min-width:0}
    .v6-field.wide{grid-column:1/-1}
    .v6-field label{font-size:11px;font-weight:750;color:var(--muted)}
    .v6-field input,.v6-field textarea,.v6-field select{width:100%;box-sizing:border-box;margin:0;padding:11px;border:1px solid var(--border);border-radius:11px;background:var(--bg);color:var(--text);font:inherit;font-size:16px}
    .v6-field textarea{min-height:80px}
    .v6-actions{display:flex;gap:8px;margin-top:14px}
    .v6-actions button{flex:1;padding:12px}
    @media(max-width:420px){.v6-form{grid-template-columns:1fr}.v6-field.wide{grid-column:auto}}
  `;
  document.head.appendChild(style);

  function modal(title, fields, initial, onSave) {
    const bg=document.createElement("div"); bg.className="v6-modal-bg";
    const inputs=fields.map(f=>{
      const val=initial[f.name] ?? f.default ?? "";
      const tag=f.type==="textarea"?"textarea":"input";
      const type=f.type==="textarea"?"":` type="${esc(f.type||"text")}"`;
      return `<div class="v6-field ${f.wide?"wide":""}"><label>${esc(f.label)}</label><${tag} name="${esc(f.name)}"${type} ${f.min!==undefined?`min="${f.min}"`:""} ${f.step?`step="${f.step}"`:""} ${f.required?"required":""}>${tag==="textarea"?esc(val):""}</${tag==="textarea"?"textarea":"input"}>${tag==="input"&&f.type!=="textarea"?`<span class="v6-hidden-value" data-v6-val="${esc(f.name)}" data-value="${esc(val)}"></span>`:""}</div>`;
    }).join("");
    bg.innerHTML=`<section class="v6-modal" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><form><div class="v6-form">${inputs}</div><div class="v6-actions"><button type="button" class="v6-btn" data-cancel>${tr6("Cancel","إلغاء")}</button><button class="v6-btn primary">${tr6("Save","حفظ")}</button></div></form></section>`;
    document.body.appendChild(bg);
    fields.forEach(f=>{const el=bg.querySelector(`[name="${f.name}"]`); if(el && f.type!=="textarea")el.value=initial[f.name]??f.default??"";});
    const close=()=>bg.remove();
    bg.addEventListener("click",e=>{if(e.target===bg||e.target.closest("[data-cancel]"))close();});
    bg.querySelector("form").addEventListener("submit",e=>{
      e.preventDefault(); const obj={};
      fields.forEach(f=>obj[f.name]=bg.querySelector(`[name="${f.name}"]`)?.value ?? "");
      if(fields.some(f=>f.required&&!String(obj[f.name]).trim()))return;
      onSave(obj); close();
    });
    bg.querySelector("input,textarea")?.focus();
  }

  function conflictReport(trip, day) {
    const acts=(trip.activities||[]).filter(a=>String(a.day||"Day 1")===day);
    const pairs=[];
    acts.forEach((a,i)=>{
      const s1=mins(a.time); if(s1===null)return;
      const e1=s1+Math.max(1,Number(a.duration)||60);
      acts.slice(i+1).forEach(b=>{
        const s2=mins(b.time); if(s2===null)return;
        const e2=s2+Math.max(1,Number(b.duration)||60);
        const start=Math.max(s1,s2), end=Math.min(e1,e2);
        if(start<end)pairs.push({a,b,start,end,duration:end-start});
      });
    });
    return pairs;
  }

  function renderV6Panels() {
    const trip=t(), host=$("dayList");
    if(!trip||!host)return; ensure(trip);
    let panel=$("v6-trip-tools");
    if(!panel){panel=document.createElement("div");panel.id="v6-trip-tools";panel.className="v6-wrap";host.insertAdjacentElement("afterend",panel);}
    const days=[...new Set((trip.activities||[]).map(a=>String(a.day||"Day 1")))];
    if(!days.length) days.push("Day 1");
    const conflictGroups=days.map(day=>({day,items:conflictReport(trip,day)})).filter(g=>g.items.length);
    const conflicts=conflictGroups.flatMap(g=>g.items);
    const spent=(expenses||[]).filter(e=>e.tripId===trip.id).reduce((s,e)=>s+(Number(e.amount)||0),0);
    const budget=Number(trip.budget)||0, pct=budget>0?Math.min(100,spent/budget*100):0;
    panel.innerHTML=`
      <section class="v6-card">
        <div class="v6-row"><h3>💡 ${tr6("Smart schedule insights","تحليل الجدول الذكي")}</h3><span class="v6-chip">${conflicts.length} ${tr6("conflicts","تعارضات")}</span></div>
        ${conflicts.length?conflictGroups.map(g=>`<div class="v6-item"><b>${esc(g.day)}</b>${g.items.map(c=>`<div class="v6-alert">⚠ <b>${esc(c.a.name)}</b> ${tr6("overlaps with","يتداخل مع")} <b>${esc(c.b.name)}</b><br>${clock(c.start)}–${clock(c.end)} · ${c.duration} ${tr6("minutes","دقيقة")}</div>`).join("")}</div>`).join(""):`<div class="v6-alert v6-good">✓ ${tr6("No time overlaps detected across this trip.","لا يوجد تداخل زمني مكتشف في الرحلة.")}</div>`}
        <p class="v6-muted">${tr6("Conflict checks use activity start time and duration. Activities without a valid time are skipped.","يعتمد كشف التعارض على وقت البداية والمدة، ويتم تجاهل الأنشطة التي لا تملك وقتًا صالحًا.")}</p>
      </section>
      <section class="v6-card">
        <div class="v6-row"><h3>💰 ${tr6("Trip budget","ميزانية الرحلة")}</h3><button class="v6-btn" data-v6-budget>${tr6("Set budget","تحديد الميزانية")}</button></div>
        <div class="v6-row"><span class="v6-muted">${tr6("Spent","المنفق")}</span><b>${cash(spent)}</b></div>
        <div class="v6-row"><span class="v6-muted">${tr6("Budget","الميزانية")}</span><b>${budget?cash(budget):tr6("Not set","غير محددة")}</b></div>
        ${budget?`<div class="v6-progress"><i style="width:${pct}%"></i></div><div class="v6-row"><span class="v6-muted">${pct.toFixed(1)}% ${tr6("used","مستخدم")}</span><b>${cash(Math.max(0,budget-spent))} ${tr6("remaining","متبقي")}</b></div>`:""}
      </section>
      <section class="v6-card">
        <div class="v6-row"><h3>📍 ${tr6("Saved places","الأماكن المحفوظة")}</h3><button class="v6-btn primary" data-v6-place>＋ ${tr6("Add place","إضافة مكان")}</button></div>
        ${(trip.savedPlaces||[]).map((p,i)=>`<div class="v6-item"><div class="v6-row"><b>${esc(p.name)}</b><button class="v6-btn" data-v6-remove-place="${i}">${tr6("Remove","حذف")}</button></div><p class="v6-muted">${esc(p.note||p.address||"")}</p><button class="v6-btn" data-v6-map="${i}">${tr6("Open in Google Maps","افتح في خرائط Google")} ↗</button></div>`).join("")||`<p class="v6-muted">${tr6("Save restaurants, attractions and useful addresses for this trip.","احفظ المطاعم والمعالم والعناوين المهمة لهذه الرحلة.")}</p>`}
      </section>
      <section class="v6-card">
        <div class="v6-row"><h3>📔 ${tr6("Travel journal","يوميات الرحلة")}</h3><button class="v6-btn primary" data-v6-journal>＋ ${tr6("Add note","إضافة تدوينة")}</button></div>
        ${(trip.journal||[]).slice().reverse().map((j,i)=>`<div class="v6-item"><b>${esc(j.title)}</b><p class="v6-muted">${esc(j.date)}</p><p>${esc(j.body)}</p></div>`).join("")||`<p class="v6-muted">${tr6("Keep memories, tips and notes in one place.","احتفظ بالذكريات والنصائح والملاحظات في مكان واحد.")}</p>`}
      </section>`;
    panel.querySelector("[data-v6-budget]")?.addEventListener("click",()=>modal(tr6("Trip budget","ميزانية الرحلة"),[{name:"budget",label:tr6("Budget amount","قيمة الميزانية"),type:"number",min:0,step:"0.01",required:true}],{budget:trip.budget||""},v=>{trip.budget=Math.max(0,Number(v.budget)||0);persist();renderV6Panels();}));
    panel.querySelector("[data-v6-place]")?.addEventListener("click",()=>modal(tr6("Save a place","حفظ مكان"),[{name:"name",label:tr6("Place name","اسم المكان"),required:true,wide:true},{name:"address",label:tr6("Address / location","العنوان / الموقع"),wide:true},{name:"note",label:tr6("Notes","ملاحظات"),type:"textarea",wide:true}],{},v=>{trip.savedPlaces.push({...v,id:"p"+Date.now()});persist();renderV6Panels();}));
    panel.querySelectorAll("[data-v6-remove-place]").forEach(b=>b.addEventListener("click",()=>{trip.savedPlaces.splice(+b.dataset.v6RemovePlace,1);persist();renderV6Panels();}));
    panel.querySelectorAll("[data-v6-map]").forEach(b=>b.addEventListener("click",()=>{const p=trip.savedPlaces[+b.dataset.v6Map];if(p)window.open("https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(p.address||p.name),"_blank","noopener");}));
    panel.querySelector("[data-v6-journal]")?.addEventListener("click",()=>modal(tr6("New journal entry","تدوينة جديدة"),[{name:"title",label:tr6("Title","العنوان"),required:true,wide:true},{name:"date",label:tr6("Date","التاريخ"),type:"date",default:new Date().toISOString().slice(0,10)},{name:"body",label:tr6("Your memory or note","ذكرياتك أو ملاحظاتك"),type:"textarea",wide:true}],{},v=>{trip.journal.push({...v,id:"j"+Date.now()});persist();renderV6Panels();}));
  }

  // Preserve legacy activities while ensuring the V5.1 editor doesn't erase an existing time.
  function installEditorSafety() {
    document.addEventListener("click",e=>{
      const b=e.target.closest("[data-v5-edit]");
      if(!b)return;
      // V5.1 owns the editor; this listener intentionally does not intercept it.
    },false);
  }

  const oldRenderTrip=window.renderTrip;
  if(typeof oldRenderTrip==="function"){
    window.renderTrip=function(){oldRenderTrip();renderV6Panels();};
  }
  const oldRenderAll=window.renderAll;
  if(typeof oldRenderAll==="function"){
    window.renderAll=function(){oldRenderAll();if(t())renderV6Panels();};
  }
  document.addEventListener("DOMContentLoaded",()=>{if(t())renderV6Panels();});
  const mo=new MutationObserver(()=>{if(t()&&$("dayList")&&!$("v6-trip-tools"))renderV6Panels();});
  mo.observe(document.body,{childList:true,subtree:true});
  installEditorSafety();
})();
