/* TravelMate V7 Ultimate — integrated upgrade, additive to V4/V5/V6/V6.1 */
(() => {
  "use strict";
  if (window.__travelMateV7Loaded) return;
  window.__travelMateV7Loaded = true;

  const $ = id => document.getElementById(id);
  const ar = () => typeof settings !== "undefined" && settings.language === "ar";
  const tx = (en, a) => ar() ? a : en;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const fmt = n => typeof money === "function" ? money(Number(n)||0) :
    `${Number(n||0).toLocaleString()} ${settings?.currency || "EGP"}`;
  const saveNow = () => { if (typeof save === "function") save(); };
  const tripNow = () => typeof currentTrip !== "undefined" && currentTrip !== null ? trips[currentTrip] : null;
  const cats = [
    ["accommodation","🏨","Accommodation","الإقامة"],
    ["food","🍽️","Food & drinks","الطعام والمشروبات"],
    ["transport","🚕","Transport","المواصلات"],
    ["shopping","🛍️","Shopping","التسوق"],
    ["entertainment","🎟️","Entertainment","الترفيه"],
    ["health","💊","Health","الصحة"],
    ["activities","🧭","Activities","الأنشطة"],
    ["other","📦","Other","أخرى"]
  ];
  const catName = key => {
    const c = cats.find(x => x[0] === key) || cats[cats.length-1];
    return `${c[1]} ${ar() ? c[3] : c[2]}`;
  };
  const catOptions = selected => cats.map(c =>
    `<option value="${c[0]}" ${selected===c[0]?"selected":""}>${c[1]} ${ar()?c[3]:c[2]}</option>`
  ).join("");

  // Safe, additive migration: retain all existing expense fields and IDs.
  if (Array.isArray(expenses)) expenses.forEach(e => {
    if (!e.category) e.category = "other";
    if (!e.date) e.date = today();
    if (typeof e.notes !== "string") e.notes = "";
  });

  const style = document.createElement("style");
  style.id = "tm-v7-style";
  style.textContent = `
    .v7-tools{display:grid;gap:12px;margin:12px 0}
    .v7-card{background:var(--surface);border:1px solid var(--border);border-radius:18px;padding:15px;box-shadow:var(--shadow)}
    .v7-row{display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}
    .v7-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}
    .v7-btn{border:1px solid var(--border);border-radius:10px;background:var(--surface2);color:var(--text);padding:9px 11px;font-weight:750;font-size:12px}
    .v7-btn.primary{background:var(--accent);border-color:var(--accent);color:white}
    .v7-btn.danger{color:#c84d55}
    .v7-muted{color:var(--muted);font-size:11px}
    .v7-amount{font-size:21px;font-weight:850;color:var(--accent);overflow-wrap:anywhere}
    .v7-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
    .v7-stat{background:var(--surface2);border-radius:13px;padding:11px;min-width:0}
    .v7-stat b{display:block;font-size:17px;overflow-wrap:anywhere}
    .v7-stat small{color:var(--muted);font-size:10px}
    .v7-bar{height:9px;background:var(--surface2);border-radius:20px;overflow:hidden;margin:7px 0}
    .v7-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--accent),var(--accent2));border-radius:20px}
    .v7-break-row{display:grid;grid-template-columns:minmax(85px,1fr) 2fr auto;gap:8px;align-items:center;margin:9px 0;font-size:11px}
    .v7-break-track{height:8px;border-radius:20px;background:var(--surface2);overflow:hidden}
    .v7-break-track i{display:block;height:100%;background:var(--accent);border-radius:20px}
    .v7-filter{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    .v7-filter input,.v7-filter select,.v7-field input,.v7-field select,.v7-field textarea{width:100%;min-width:0;box-sizing:border-box;margin:0;min-height:44px;padding:10px 11px;border-radius:11px;border:1px solid var(--border);background:var(--bg);color:var(--text);font:inherit;font-size:16px}
    .v7-filter .wide,.v7-field.wide{grid-column:1/-1}
    .v7-expense{padding:12px 0;border-top:1px solid var(--border)}
    .v7-expense:first-child{border-top:0}
    .v7-expense h4{margin:0;font-size:14px}
    .v7-modal-bg{position:fixed;inset:0;z-index:100020;background:#0b1424aa;display:flex;align-items:flex-end;justify-content:center;padding:10px;backdrop-filter:blur(4px)}
    .v7-modal{width:min(100%,590px);max-height:94dvh;overflow:auto;background:var(--surface);color:var(--text);border-radius:22px;padding:18px;box-shadow:0 20px 60px #0006}
    .v7-modal h2{font-size:19px;margin:0 0 14px}
    .v7-form{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .v7-field{display:grid;gap:5px;min-width:0}
    .v7-field label{font-size:11px;font-weight:800;color:var(--muted)}
    .v7-field textarea{min-height:75px}
    .v7-modal-actions{display:flex;gap:8px;margin-top:14px;position:sticky;bottom:-18px;background:var(--surface);padding:10px 0 0}
    .v7-modal-actions button{flex:1;min-height:46px}
    .v7-empty{padding:18px;text-align:center;color:var(--muted);font-size:12px}
    .v7-chip{display:inline-flex;padding:4px 8px;border-radius:20px;background:var(--surface2);font-size:10px;color:var(--muted)}
    .v7-trip-tools{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}
    .v7-check-row{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 0;border-bottom:1px solid var(--border)}
    .v7-check-row label{display:flex;align-items:center;gap:8px;min-width:0}
    .v7-check-row input{width:18px;min-height:18px;margin:0}
    @media(max-width:420px){.v7-form,.v7-filter{grid-template-columns:1fr}.v7-filter .wide,.v7-field.wide{grid-column:auto}.v7-break-row{grid-template-columns:95px 1fr auto}}
  `;
  document.head.appendChild(style);

  function modal(title, fields, initial, onSave) {
    $("tm-v7-modal")?.remove();
    const bg = document.createElement("div");
    bg.id = "tm-v7-modal";
    bg.className = "v7-modal-bg";
    const fieldHtml = fields.map(f => {
      const value = initial[f.name] ?? f.default ?? "";
      let control = "";
      if (f.type === "textarea") control = `<textarea name="${esc(f.name)}" ${f.required?"required":""}>${esc(value)}</textarea>`;
      else if (f.type === "select") control = `<select name="${esc(f.name)}" ${f.required?"required":""}>${f.options || ""}</select>`;
      else control = `<input name="${esc(f.name)}" type="${esc(f.type||"text")}" value="${esc(value)}" ${f.min!==undefined?`min="${f.min}"`:""} ${f.step?`step="${f.step}"`:""} ${f.max?`max="${f.max}"`:""} ${f.required?"required":""} ${f.placeholder?`placeholder="${esc(f.placeholder)}"`:""}>`;
      return `<div class="v7-field ${f.wide?"wide":""}"><label>${esc(f.label)}</label>${control}</div>`;
    }).join("");
    bg.innerHTML = `<section class="v7-modal" role="dialog" aria-modal="true"><h2>${esc(title)}</h2><form><div class="v7-form">${fieldHtml}</div><div class="v7-modal-actions"><button type="button" class="v7-btn" data-cancel>${tx("Cancel","إلغاء")}</button><button class="v7-btn primary" type="submit">${tx("Save","حفظ")}</button></div></form></section>`;
    document.body.appendChild(bg);
    fields.forEach(f => {
      const el = bg.querySelector(`[name="${f.name}"]`);
      if (el && f.type === "select") el.value = initial[f.name] ?? f.default ?? "";
    });
    const close = () => bg.remove();
    bg.addEventListener("click", e => { if (e.target === bg || e.target.closest("[data-cancel]")) close(); });
    bg.querySelector("form").addEventListener("submit", e => {
      e.preventDefault();
      const values = {};
      fields.forEach(f => values[f.name] = bg.querySelector(`[name="${f.name}"]`)?.value ?? "");
      if (fields.some(f => f.required && !String(values[f.name]).trim())) return;
      onSave(values);
      close();
    });
    bg.querySelector("input,select,textarea")?.focus();
  }

  function tripOptions(selected) {
    return `<option value="">${tx("General / personal","عام / شخصي")}</option>` +
      trips.map(t => `<option value="${esc(t.id)}" ${selected===t.id?"selected":""}>${esc(t.name)}</option>`).join("");
  }
  function payerOptions(trip, selected) {
    const names = trip?.travelers?.length ? trip.travelers : ["Personal"];
    return names.map(n => `<option value="${esc(n)}" ${selected===n?"selected":""}>${esc(n)}</option>`).join("");
  }

  function expenseForm(expense) {
    const old = expense || {};
    const initialTrip = old.tripId || tripNow()?.id || "";
    const linkedTrip = trips.find(t => t.id === initialTrip);
    const fields = [
      {name:"title",label:tx("Expense title","اسم المصروف"),required:true,wide:true},
      {name:"amount",label:tx("Amount","المبلغ"),type:"number",min:0.01,step:"0.01",required:true},
      {name:"category",label:tx("Category","التصنيف"),type:"select",options:catOptions(old.category||"other")},
      {name:"date",label:tx("Date","التاريخ"),type:"date"},
      {name:"tripId",label:tx("Trip","الرحلة"),type:"select",options:tripOptions(initialTrip),wide:true},
      {name:"payer",label:tx("Paid by","دفع بواسطة"),type:"select",options:payerOptions(linkedTrip,old.payer||linkedTrip?.travelers?.[0]||"Personal")},
      {name:"notes",label:tx("Notes","ملاحظات"),type:"textarea",wide:true}
    ];
    modal(expense ? tx("Edit expense","تعديل المصروف") : tx("Add expense","إضافة مصروف"), fields, {
      title:old.title||"", amount:old.amount??"", category:old.category||"other",
      date:old.date||today(), tripId:initialTrip, payer:old.payer||linkedTrip?.travelers?.[0]||"Personal", notes:old.notes||""
    }, v => {
      const amount = Number(v.amount);
      if (!Number.isFinite(amount) || amount <= 0) { alert(tx("Enter an amount greater than zero.","أدخل مبلغًا أكبر من صفر.")); return; }
      const linked = trips.find(t => t.id === v.tripId);
      const payer = linked ? (linked.travelers.includes(v.payer) ? v.payer : linked.travelers[0]) : (v.payer || "Personal");
      const record = {
        ...old, id:old.id || (typeof uid==="function"?uid():`v7-${Date.now()}`),
        title:v.title.trim(), amount:Number(amount.toFixed(2)), category:v.category||"other",
        date:v.date||today(), tripId:linked?.id||null, payer, notes:v.notes.trim()
      };
      if (expense) {
        const i = expenses.findIndex(e => e.id === expense.id);
        if (i >= 0) expenses[i] = record;
      } else expenses.push(record);
      saveNow(); refreshAll();
    });
    // When trip changes, refresh payer choices without losing other form values.
    const selectTrip = $("tm-v7-modal")?.querySelector('[name="tripId"]');
    selectTrip?.addEventListener("change", () => {
      const form = $("tm-v7-modal")?.querySelector("form");
      const payer = form?.querySelector('[name="payer"]');
      const selectedTrip = trips.find(t => t.id === selectTrip.value);
      if (payer) payer.innerHTML = payerOptions(selectedTrip, selectedTrip?.travelers?.[0] || "Personal");
    });
  }

  function removeExpense(id) {
    const e = expenses.find(x => String(x.id) === String(id));
    if (!e || !confirm(tx(`Delete "${e.title}"?` , `حذف المصروف «${e.title}»؟`))) return;
    expenses = expenses.filter(x => String(x.id) !== String(id));
    saveNow(); refreshAll();
  }

  let filters = {q:"",category:"all",trip:"all"};
  function renderExpenseManager() {
    const host = $("expenseList");
    if (!host) return;
    const total = expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
    if ($("totalExpenses")) $("totalExpenses").textContent = fmt(total);
    if ($("expenseCount")) $("expenseCount").textContent = `${expenses.length} ${tx("expenses","مصروفات")}`;
    const filtered = expenses.filter(e => {
      const trip = trips.find(t=>t.id===e.tripId);
      const hay = `${e.title||""} ${e.payer||""} ${e.notes||""} ${trip?.name||""}`.toLowerCase();
      return (!filters.q || hay.includes(filters.q.toLowerCase())) &&
        (filters.category==="all" || (e.category||"other")===filters.category) &&
        (filters.trip==="all" || (filters.trip==="general" ? !e.tripId : e.tripId===filters.trip));
    }).slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));
    const max = Math.max(1,...cats.map(c=>expenses.filter(e=>(e.category||"other")===c[0]).reduce((s,e)=>s+(Number(e.amount)||0),0)));
    const breakdown = cats.map(c => {
      const amount = expenses.filter(e=>(e.category||"other")===c[0]).reduce((s,e)=>s+(Number(e.amount)||0),0);
      if (!amount) return "";
      return `<div class="v7-break-row"><span>${c[1]} ${ar()?c[3]:c[2]}</span><div class="v7-break-track"><i style="width:${amount/max*100}%"></i></div><b>${fmt(amount)}</b></div>`;
    }).join("");
    const tripBreak = trips.map(t=>({name:t.name,amount:expenses.filter(e=>e.tripId===t.id).reduce((s,e)=>s+(Number(e.amount)||0),0)})).filter(x=>x.amount>0);
    const general = expenses.filter(e=>!e.tripId).reduce((s,e)=>s+(Number(e.amount)||0),0);
    const payerBreak = [...new Set(expenses.map(e=>e.payer||"Unspecified"))].map(name=>({
      name, amount:expenses.filter(e=>(e.payer||"Unspecified")===name).reduce((s,e)=>s+(Number(e.amount)||0),0)
    })).filter(x=>x.amount>0).sort((a,b)=>b.amount-a.amount);
    const dailyBreak = [...new Set(expenses.map(e=>e.date||"Undated"))].sort().reverse().slice(0,7).map(date=>({
      date, amount:expenses.filter(e=>(e.date||"Undated")===date).reduce((s,e)=>s+(Number(e.amount)||0),0)
    }));
    const maxPayer = Math.max(1,...payerBreak.map(x=>x.amount));
    const maxDaily = Math.max(1,...dailyBreak.map(x=>x.amount));
    host.innerHTML = `
      <section class="v7-card v7-tools">
        <div class="v7-row"><b>${tx("Spending overview","ملخص الإنفاق")}</b><span class="v7-chip">${expenses.length} ${tx("records","عملية")}</span></div>
        <div class="v7-grid">
          <div class="v7-stat"><small>${tx("Total expenses","إجمالي المصروفات")}</small><b>${fmt(total)}</b></div>
          <div class="v7-stat"><small>${tx("Average expense","متوسط المصروف")}</small><b>${fmt(expenses.length?total/expenses.length:0)}</b></div>
        </div>
        <div><b>${tx("By category","حسب التصنيف")}</b>${breakdown||`<p class="v7-muted">${tx("No category data yet.","لا توجد بيانات تصنيفات بعد.")}</p>`}</div>
        ${tripBreak.length||general?`<div><b>${tx("By trip","حسب الرحلة")}</b>${tripBreak.map(x=>`<div class="v7-row v7-expense"><span>${esc(x.name)}</span><b>${fmt(x.amount)}</b></div>`).join("")}${general?`<div class="v7-row"><span>${tx("General expenses","مصروفات عامة")}</span><b>${fmt(general)}</b></div>`:""}</div>`:""}
        ${payerBreak.length?`<div><b>${tx("By payer / traveler","حسب الدافع / المسافر")}</b>${payerBreak.map(x=>`<div class="v7-break-row"><span>${esc(x.name)}</span><div class="v7-break-track"><i style="width:${x.amount/maxPayer*100}%"></i></div><b>${fmt(x.amount)}</b></div>`).join("")}</div>`:""}
        ${dailyBreak.length?`<div><b>${tx("Daily spending (latest 7 dates)","الإنفاق اليومي (آخر 7 تواريخ)")}</b>${dailyBreak.map(x=>`<div class="v7-break-row"><span>${esc(x.date)}</span><div class="v7-break-track"><i style="width:${x.amount/maxDaily*100}%"></i></div><b>${fmt(x.amount)}</b></div>`).join("")}</div>`:""}
        <div class="v7-actions"><button class="v7-btn primary" id="v7-add-expense">＋ ${tx("Add expense","إضافة مصروف")}</button><button class="v7-btn" id="v7-export-csv">${tx("Export CSV","تصدير CSV")}</button><button class="v7-btn" id="v7-report">${tx("Financial report","تقرير مالي")}</button></div>
      </section>
      <section class="v7-card">
        <div class="v7-filter">
          <input class="wide" id="v7-exp-search" placeholder="${tx("Search title, payer, trip...","ابحث بالاسم أو الدافع أو الرحلة...")}" value="${esc(filters.q)}">
          <select id="v7-exp-category"><option value="all">${tx("All categories","كل التصنيفات")}</option>${catOptions(filters.category)}</select>
          <select id="v7-exp-trip"><option value="all">${tx("All trips","كل الرحلات")}</option><option value="general" ${filters.trip==="general"?"selected":""}>${tx("General","عام")}</option>${trips.map(t=>`<option value="${esc(t.id)}" ${filters.trip===t.id?"selected":""}>${esc(t.name)}</option>`).join("")}</select>
        </div>
        <div class="v7-row" style="margin:12px 0"><b>${tx("Expense records","سجل المصروفات")}</b><span class="v7-chip">${filtered.length} ${tx("shown","معروض")}</span></div>
        ${filtered.map(e=>{
          const trip=trips.find(t=>t.id===e.tripId);
          return `<article class="v7-expense" data-v7-expense="${esc(e.id)}">
            <div class="v7-row"><h4>${esc(e.title)}</h4><b class="v7-amount">${fmt(e.amount)}</b></div>
            <p class="v7-muted">${catName(e.category||"other")} · ${esc(e.date||"")} · ${tx("Paid by","دفع بواسطة")} ${esc(e.payer||"—")}${trip?` · ${esc(trip.name)}`:""}</p>
            ${e.notes?`<p>${esc(e.notes)}</p>`:""}
            <div class="v7-actions"><button class="v7-btn" data-v7-edit="${esc(e.id)}">${tx("Edit","تعديل")}</button><button class="v7-btn danger" data-v7-delete="${esc(e.id)}">${tx("Delete","حذف")}</button></div>
          </article>`;
        }).join("") || `<div class="v7-empty">${tx("No matching expenses. Add your first expense.","لا توجد مصروفات مطابقة. أضف أول مصروف.")}</div>`}
      </section>`;
    $("v7-add-expense")?.addEventListener("click",()=>expenseForm(null));
    $("v7-export-csv")?.addEventListener("click",exportCSV);
    $("v7-report")?.addEventListener("click",printFinancialReport);
    $("v7-exp-search")?.addEventListener("input",e=>{filters.q=e.target.value;const p=e.target.selectionStart;renderExpenseManager();const n=$("v7-exp-search");n?.focus();n?.setSelectionRange(p,p);});
    $("v7-exp-category")?.addEventListener("change",e=>{filters.category=e.target.value;renderExpenseManager();});
    $("v7-exp-trip")?.addEventListener("change",e=>{filters.trip=e.target.value;renderExpenseManager();});
    host.querySelectorAll("[data-v7-edit]").forEach(b=>b.addEventListener("click",()=>expenseForm(expenses.find(e=>String(e.id)===b.dataset.v7Edit))));
    host.querySelectorAll("[data-v7-delete]").forEach(b=>b.addEventListener("click",()=>removeExpense(b.dataset.v7Delete)));
  }

  function renderTripExpensesV7() {
    const trip = tripNow();
    const host = $("tripExpenses");
    if (!trip || !host) return;
    const list = expenses.filter(e=>e.tripId===trip.id);
    const total = list.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const budget = Number(trip.budget)||0;
    const pct = budget>0 ? total/budget*100 : 0;
    const settlement = typeof calculateSettlement==="function" ? calculateSettlement(trip) : {total,share:0,balances:{},payments:[]};
    host.innerHTML = `
      <section class="v7-card v7-tools">
        <div class="v7-grid">
          <div class="v7-stat"><small>${tx("Spent","المنفق")}</small><b>${fmt(total)}</b></div>
          <div class="v7-stat"><small>${tx("Budget","الميزانية")}</small><b>${budget?fmt(budget):tx("Not set","غير محددة")}</b></div>
        </div>
        ${budget?`<div class="v7-bar"><i style="width:${Math.min(100,pct)}%"></i></div><p class="v7-muted">${pct.toFixed(1)}% ${tx("used","مستخدم")} · ${fmt(Math.max(0,budget-total))} ${tx("remaining","متبقي")}${pct>100?` · ⚠ ${tx("Over budget","تجاوزت الميزانية")}`:""}</p>`:""}
        <div class="v7-actions"><button class="v7-btn primary" id="v7-trip-add-expense">＋ ${tx("Add expense","إضافة مصروف")}</button></div>
      </section>
      <section class="v7-card">
        <b>${tx("Settlement between travelers","تسوية حسابات المسافرين")}</b>
        <p class="v7-muted">${tx("Expenses are divided equally between the current travelers. Paid amounts are credited to the payer.","يتم تقسيم المصروفات بالتساوي بين المسافرين الحاليين، ويُخصم ما دفعه كل شخص من نصيبه.")}</p>
        <div class="v7-grid">${(trip.travelers||[]).map(name=>{
          const balance=settlement.balances?.[name]||0;
          return `<div class="v7-stat"><small>${esc(name)}</small><b>${balance>=0?`＋${fmt(balance)}`:`−${fmt(Math.abs(balance))}`}</b><small>${balance>=0?tx("Receives","له"):tx("Owes","عليه")}</small></div>`;
        }).join("")}</div>
        ${(settlement.payments||[]).map(p=>`<div class="v7-row v7-expense"><span>${esc(p.from)} → ${esc(p.to)}</span><b>${fmt(p.amount)}</b></div>`).join("")||`<p class="v7-muted">${tx("Everyone is settled up.","الحسابات متساوية.")}</p>`}
      </section>
      <section class="v7-card">
        <div class="v7-row"><b>${tx("Trip expense records","مصروفات الرحلة")}</b><span class="v7-chip">${list.length}</span></div>
        ${list.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(e=>`<article class="v7-expense"><div class="v7-row"><b>${esc(e.title)}</b><strong>${fmt(e.amount)}</strong></div><p class="v7-muted">${catName(e.category||"other")} · ${esc(e.date||"")} · ${tx("Paid by","دفع بواسطة")} ${esc(e.payer||"—")}</p>${e.notes?`<p>${esc(e.notes)}</p>`:""}<div class="v7-actions"><button class="v7-btn" data-v7-trip-edit="${esc(e.id)}">${tx("Edit","تعديل")}</button><button class="v7-btn danger" data-v7-trip-delete="${esc(e.id)}">${tx("Delete","حذف")}</button></div></article>`).join("")||`<p class="v7-empty">${tx("No expenses for this trip yet.","لا توجد مصروفات لهذه الرحلة بعد.")}</p>`}
      </section>`;
    $("v7-trip-add-expense")?.addEventListener("click",()=>expenseForm(null));
    host.querySelectorAll("[data-v7-trip-edit]").forEach(b=>b.addEventListener("click",()=>expenseForm(expenses.find(e=>String(e.id)===b.dataset.v7TripEdit))));
    host.querySelectorAll("[data-v7-trip-delete]").forEach(b=>b.addEventListener("click",()=>removeExpense(b.dataset.v7TripDelete)));
  }

  function editTrip() {
    const trip=tripNow(); if(!trip)return;
    modal(tx("Edit trip details","تعديل بيانات الرحلة"),[
      {name:"name",label:tx("Trip name","اسم الرحلة"),required:true,wide:true},
      {name:"date",label:tx("Start date","تاريخ البداية"),type:"date"},
      {name:"budget",label:tx("Budget","الميزانية"),type:"number",min:0,step:"0.01"}
    ],{name:trip.name,date:trip.date||"",budget:trip.budget||0},v=>{
      trip.name=v.name.trim();trip.date=v.date;trip.budget=Math.max(0,Number(v.budget)||0);
      saveNow();refreshAll();
    });
  }
  function deleteTrip() {
    const trip=tripNow();if(!trip)return;
    if(!confirm(tx(`Delete "${trip.name}" and its trip data? Expenses linked to it will become general expenses.`,`حذف الرحلة «${trip.name}»؟ ستتحول مصروفاتها إلى مصروفات عامة.`)))return;
    expenses.forEach(e=>{if(e.tripId===trip.id)e.tripId=null;});
    trips=trips.filter(t=>t.id!==trip.id);currentTrip=null;
    saveNow();refreshAll();if(typeof showPage==="function")showPage("trips");
  }
  function decorateTrip() {
    const detail=$("detail");if(!detail||!tripNow())return;
    let tools=$("v7-trip-actions");
    if(!tools){tools=document.createElement("div");tools.id="v7-trip-actions";tools.className="v7-trip-tools";$("detailTitle")?.insertAdjacentElement("afterend",tools);}
    tools.innerHTML=`<button class="v7-btn" id="v7-edit-trip">${tx("Edit trip","تعديل الرحلة")}</button><button class="v7-btn danger" id="v7-delete-trip">${tx("Delete trip","حذف الرحلة")}</button>`;
    $("v7-edit-trip")?.addEventListener("click",editTrip);
    $("v7-delete-trip")?.addEventListener("click",deleteTrip);
    // Destination editing without altering the existing cities array format.
    const cityHost=$("cityList");
    if(cityHost){
      cityHost.innerHTML=(tripNow().cities||[]).map((city,i)=>`<div class="activity-card"><strong>📍 ${esc(city)}</strong><div class="v7-actions"><button class="v7-btn" data-v7-city-edit="${i}">${tx("Edit","تعديل")}</button><button class="v7-btn danger" data-v7-city-delete="${i}">${tx("Remove","حذف")}</button></div></div>`).join("")||`<p class="v7-empty">${tx("No destinations yet.","لا توجد وجهات بعد.")}</p>`;
      cityHost.querySelectorAll("[data-v7-city-edit]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.v7CityEdit;const old=tripNow()?.cities[i];if(old===undefined)return;modal(tx("Edit destination","تعديل الوجهة"),[{name:"city",label:tx("Destination","الوجهة"),required:true,wide:true}],{city:old},v=>{tripNow().cities[i]=v.city.trim();saveNow();refreshAll();});}));
      cityHost.querySelectorAll("[data-v7-city-delete]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.v7CityDelete;if(!confirm(tx("Remove this destination?","حذف هذه الوجهة؟")))return;tripNow().cities.splice(i,1);saveNow();refreshAll();}));
    }
  }

  function editTraveler(index) {
    const trip=tripNow(),old=trip?.travelers?.[index];if(!trip||!old)return;
    modal(tx("Rename traveler","تعديل اسم المسافر"),[{name:"name",label:tx("Traveler name","اسم المسافر"),required:true,wide:true}],{name:old},v=>{
      const name=v.name.trim();if(trip.travelers.some((n,i)=>i!==index&&n.toLowerCase()===name.toLowerCase())){alert(tx("This traveler already exists.","هذا المسافر موجود بالفعل."));return;}
      trip.travelers[index]=name;expenses.forEach(e=>{if(e.tripId===trip.id&&e.payer===old)e.payer=name;});saveNow();refreshAll();
    });
  }
  function decorateTravelers() {
    const trip=tripNow(),host=$("travelerList");if(!trip||!host)return;
    host.querySelectorAll(".activity-card").forEach((card,i)=>{
      if(card.querySelector("[data-v7-traveler-edit]"))return;
      const b=document.createElement("button");b.className="v7-btn";b.textContent=tx("Rename","تعديل الاسم");b.dataset.v7TravelerEdit=String(i);card.appendChild(b);
      b.addEventListener("click",()=>editTraveler(i));
    });
  }

  function renderChecklistV7() {
    const host=$("checklist");if(!host)return;
    host.innerHTML=checklist.map((item,i)=>`<div class="v7-check-row"><label><input type="checkbox" data-v7-check="${i}" ${item.done?"checked":""}><span style="${item.done?"text-decoration:line-through;opacity:.6":""}">${esc(item.title)}</span></label><div class="v7-actions"><button class="v7-btn" data-v7-check-edit="${i}">${tx("Edit","تعديل")}</button><button class="v7-btn danger" data-v7-check-delete="${i}">${tx("Delete","حذف")}</button></div></div>`).join("")||`<p class="v7-empty">${tx("Your checklist is empty.","قائمة التجهيز فارغة.")}</p>`;
    host.querySelectorAll("[data-v7-check]").forEach(b=>b.addEventListener("change",()=>{checklist[+b.dataset.v7Check].done=b.checked;saveNow();renderChecklistV7();}));
    host.querySelectorAll("[data-v7-check-edit]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.v7CheckEdit;const item=checklist[i];if(!item)return;modal(tx("Edit checklist item","تعديل عنصر القائمة"),[{name:"title",label:tx("Item","العنصر"),required:true,wide:true}],{title:item.title},v=>{item.title=v.title.trim();saveNow();renderChecklistV7();});}));
    host.querySelectorAll("[data-v7-check-delete]").forEach(b=>b.addEventListener("click",()=>{const i=+b.dataset.v7CheckDelete;if(!confirm(tx("Delete this checklist item?","حذف هذا العنصر؟")))return;checklist.splice(i,1);saveNow();renderChecklistV7();}));
  }

  function exportCSV() {
    const rows=[["Title","Amount","Currency","Category","Date","Payer","Trip","Notes"]];
    expenses.forEach(e=>rows.push([e.title,e.amount,settings.currency||"EGP",e.category||"other",e.date||"",e.payer||"",trips.find(t=>t.id===e.tripId)?.name||"",e.notes||""]));
    const csv="\uFEFF"+rows.map(r=>r.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
    downloadBlob(csv,"TravelMate-expenses.csv","text/csv;charset=utf-8");
  }
  function downloadBlob(content,name,type) {
    const blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1200);
  }
  function printFinancialReport() {
    const total=expenses.reduce((s,e)=>s+(Number(e.amount)||0),0);
    const byCat=cats.map(c=>({name:ar()?c[3]:c[2],amount:expenses.filter(e=>(e.category||"other")===c[0]).reduce((s,e)=>s+(Number(e.amount)||0),0)})).filter(x=>x.amount);
    const rows=expenses.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(e=>`<tr><td>${esc(e.date||"")}</td><td>${esc(e.title)}</td><td>${esc(catName(e.category||"other"))}</td><td>${esc(e.payer||"")}</td><td>${esc(trips.find(t=>t.id===e.tripId)?.name||"—")}</td><td>${fmt(e.amount)}</td></tr>`).join("");
    const w=window.open("","_blank");if(!w){alert(tx("Allow pop-ups to create the report.","اسمح بالنوافذ المنبثقة لإنشاء التقرير."));return;}
    w.document.write(`<!doctype html><html dir="${ar()?"rtl":"ltr"}"><meta charset="utf-8"><title>TravelMate financial report</title><style>body{font-family:Arial;padding:24px;color:#18263d}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:start}.sum{font-size:24px;font-weight:bold;margin:16px 0}@media print{button{display:none}}</style><h1>TravelMate — ${tx("Financial report","التقرير المالي")}</h1><p>${today()}</p><div class="sum">${tx("Total","الإجمالي")}: ${fmt(total)}</div><h3>${tx("Category breakdown","تفصيل التصنيفات")}</h3><ul>${byCat.map(x=>`<li>${esc(x.name)}: ${fmt(x.amount)}</li>`).join("")}</ul><table><thead><tr><th>${tx("Date","التاريخ")}</th><th>${tx("Title","الوصف")}</th><th>${tx("Category","التصنيف")}</th><th>${tx("Payer","الدافع")}</th><th>${tx("Trip","الرحلة")}</th><th>${tx("Amount","المبلغ")}</th></tr></thead><tbody>${rows}</tbody></table><button onclick="window.print()">${tx("Print / Save PDF","طباعة / حفظ PDF")}</button></html>`);
    w.document.close();
  }

  // Versioned, backwards-compatible backup including all V6/V6.1 fields.
  function backupV7() {
    const payload={app:"TravelMate",version:7,exportedAt:new Date().toISOString(),trips,expenses,checklist,settings};
    downloadBlob(JSON.stringify(payload,null,2),`TravelMate-V7-backup-${today()}.json`,"application/json");
  }
  function restoreV7(file) {
    if(!file)return;
    const reader=new FileReader();
    reader.onload=()=>{
      try{
        const d=JSON.parse(reader.result);
        if(!Array.isArray(d.trips)||!Array.isArray(d.expenses))throw new Error("Invalid");
        if(!confirm(tx("Replace all current TravelMate data with this backup?","استبدال جميع بيانات TravelMate الحالية بهذه النسخة الاحتياطية؟")))return;
        trips=d.trips;expenses=d.expenses;checklist=Array.isArray(d.checklist)?d.checklist:[];
        if(d.settings)settings={...settings,...d.settings};
        if(typeof normalize==="function")normalize();else saveNow();
        currentTrip=null;
        if(typeof applySettings==="function")applySettings();
        refreshAll();if(typeof showPage==="function")showPage("home");
        alert(tx("Backup restored successfully.","تمت استعادة النسخة الاحتياطية بنجاح."));
      }catch(_){alert(tx("This backup file is invalid or damaged.","ملف النسخة الاحتياطية غير صالح أو تالف."));}
    };
    reader.readAsText(file);
  }

  function refreshAll() {
    if(typeof renderAll==="function")renderAll();
    if(typeof renderTrip==="function"&&tripNow())renderTrip();
    renderExpenseManager();
    renderChecklistV7();
  }

  function install() {
    // Replace legacy prompt-based expense entry and the legacy rendering layer.
    if($("addExpenseBtn"))$("addExpenseBtn").onclick=()=>expenseForm(null);
    if($("tripExpenseBtn"))$("tripExpenseBtn").onclick=()=>expenseForm(null);
    if(typeof renderExpenses==="function"){
      const old=window.renderExpenses;
      window.renderExpenses=function(){if(old)old();renderExpenseManager();};
    }
    if(typeof renderTripExpenses==="function")window.renderTripExpenses=renderTripExpensesV7;
    const oldTrip=window.renderTrip;
    if(typeof oldTrip==="function")window.renderTrip=function(){oldTrip();decorateTrip();decorateTravelers();};
    const oldAll=window.renderAll;
    if(typeof oldAll==="function")window.renderAll=function(){oldAll();renderExpenseManager();renderChecklistV7();if(tripNow())decorateTrip();};
    if($("backupBtn"))$("backupBtn").onclick=backupV7;
    if($("restoreFile"))$("restoreFile").onchange=e=>{restoreV7(e.target.files[0]);e.target.value="";};
    if($("addChecklistBtn"))$("addChecklistBtn").onclick=()=>{
      modal(tx("Add checklist item","إضافة عنصر للقائمة"),[{name:"title",label:tx("Item","العنصر"),required:true,wide:true}],{},v=>{checklist.push({id:typeof uid==="function"?uid():`c${Date.now()}`,title:v.title.trim(),done:false});saveNow();renderChecklistV7();});
    };
    // Add a financial export shortcut in settings.
    const settingsPage=$("settings");
    if(settingsPage&&!$("v7-settings-export")){
      const card=document.createElement("div");card.className="settings-card";card.id="v7-settings-export";
      card.innerHTML=`<h3>${tx("Financial tools","الأدوات المالية")}</h3><p>${tx("Export your expenses or create a printable financial report.","صدّر المصروفات أو أنشئ تقريرًا ماليًا قابلًا للطباعة.")}</p><button class="secondary full-btn" id="v7-settings-csv">${tx("Export expenses CSV","تصدير المصروفات CSV")}</button><button class="secondary full-btn" id="v7-settings-report">${tx("Create financial report","إنشاء تقرير مالي")}</button>`;
      settingsPage.appendChild(card);
      $("v7-settings-csv").onclick=exportCSV;$("v7-settings-report").onclick=printFinancialReport;
    }
    // Keep expense screen up to date when opened.
    document.querySelectorAll('[data-page="expenses"]').forEach(b=>b.addEventListener("click",()=>setTimeout(renderExpenseManager,0)));
    refreshAll();
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
})();