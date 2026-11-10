/* TravelMate V6.1 — practical editing upgrade
   Additive only: preserves the existing V4/V5/V6 storage model. */
(() => {
  "use strict";
  if (window.__travelMateV61Loaded) return;
  window.__travelMateV61Loaded = true;

  const $ = id => document.getElementById(id);
  const current = () => (typeof trips !== "undefined" && currentTrip !== null) ? trips[currentTrip] : null;
  const tr = (en, ar) => (typeof settings !== "undefined" && settings.language === "ar") ? ar : en;
  const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const localDate = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const saveData = () => { if (typeof save === "function") save(); };
  const refresh = () => {
    if (typeof renderTrip === "function") renderTrip();
    if (typeof renderAll === "function") renderAll();
  };
  const newId = prefix => prefix + Date.now().toString(36) + Math.random().toString(36).slice(2,7);

  function showForm(title, fields, values, onSave) {
    document.getElementById("tm-v61-modal")?.remove();
    const bg = document.createElement("div");
    bg.id = "tm-v61-modal";
    bg.className = "v61-backdrop";
    const fieldHtml = fields.map(f => {
      const value = values[f.name] ?? f.default ?? "";
      const tag = f.type === "textarea" ? "textarea" : "input";
      const type = f.type && f.type !== "textarea" ? ` type="${esc(f.type)}"` : "";
      return `<label class="v61-field ${f.wide ? "wide" : ""}">
        <span>${esc(f.label)}</span>
        <${tag}${type} name="${esc(f.name)}" ${f.min !== undefined ? `min="${f.min}"` : ""} ${f.step ? `step="${f.step}"` : ""} ${f.required ? "required" : ""}>${tag === "textarea" ? esc(value) : ""}</${tag}>
      </label>`;
    }).join("");
    bg.innerHTML = `<section class="v61-dialog" role="dialog" aria-modal="true">
      <h2>${esc(title)}</h2>
      <form><div class="v61-grid">${fieldHtml}</div>
        <div class="v61-actions">
          <button type="button" class="v61-cancel">${tr("Cancel","إلغاء")}</button>
          <button type="submit" class="v61-save">${tr("Save changes","حفظ التعديلات")}</button>
        </div>
      </form>
    </section>`;
    document.body.appendChild(bg);
    fields.forEach(f => {
      const el = bg.querySelector(`[name="${f.name}"]`);
      if (el) el.value = values[f.name] ?? f.default ?? "";
    });
    const close = () => bg.remove();
    bg.addEventListener("click", e => {
      if (e.target === bg || e.target.closest(".v61-cancel")) close();
    });
    bg.querySelector("form").addEventListener("submit", e => {
      e.preventDefault();
      const result = {};
      fields.forEach(f => result[f.name] = bg.querySelector(`[name="${f.name}"]`)?.value ?? "");
      if (fields.some(f => f.required && !String(result[f.name]).trim())) return;
      onSave(result);
      close();
    });
    bg.querySelector("input,textarea")?.focus();
  }

  function addActivity() {
    const trip = current();
    if (!trip) return;
    if (!Array.isArray(trip.activities)) trip.activities = [];
    const dayFromTab = document.querySelector(".v5-day-tab.active")?.textContent?.trim();
    showForm(tr("Add activity","إضافة نشاط"), [
      {name:"name",label:tr("Activity name","اسم النشاط"),required:true,wide:true},
      {name:"day",label:tr("Day","اليوم"),default:dayFromTab || "Day 1"},
      {name:"time",label:tr("Start time","وقت البداية"),type:"time"},
      {name:"duration",label:tr("Duration (minutes)","المدة (بالدقائق)"),type:"number",min:5,step:5,default:60},
      {name:"cost",label:tr("Estimated cost","التكلفة المتوقعة"),type:"number",min:0,step:"0.01",default:0},
      {name:"city",label:tr("Place / address","المكان / العنوان"),wide:true},
      {name:"notes",label:tr("Notes","ملاحظات"),type:"textarea",wide:true}
    ], {day:dayFromTab || "Day 1",duration:60,cost:0}, v => {
      trip.activities.push({
        id: typeof uid === "function" ? uid() : newId("a"),
        name:v.name.trim(),
        day:(v.day || "Day 1").trim() || "Day 1",
        time:v.time || "",
        duration:Math.max(5,Math.min(1440,Number(v.duration)||60)),
        cost:Math.max(0,Number(v.cost)||0),
        city:(v.city||"").trim(),
        notes:(v.notes||"").trim()
      });
      saveData();
      refresh();
    });
  }

  function editPlace(index) {
    const trip = current(), place = trip?.savedPlaces?.[index];
    if (!place) return;
    showForm(tr("Edit saved place","تعديل المكان المحفوظ"),[
      {name:"name",label:tr("Place name","اسم المكان"),required:true,wide:true},
      {name:"address",label:tr("Address / location","العنوان / الموقع"),wide:true},
      {name:"note",label:tr("Notes","ملاحظات"),type:"textarea",wide:true}
    ],place,v=>{
      Object.assign(place,{name:v.name.trim(),address:v.address.trim(),note:v.note.trim()});
      saveData(); refresh();
    });
  }

  function editJournal(index) {
    const trip = current(), entry = trip?.journal?.[index];
    if (!entry) return;
    showForm(tr("Edit journal entry","تعديل تدوينة"),[
      {name:"title",label:tr("Title","العنوان"),required:true,wide:true},
      {name:"date",label:tr("Date","التاريخ"),type:"date"},
      {name:"body",label:tr("Memory or note","الذكرى أو الملاحظة"),type:"textarea",wide:true}
    ],entry,v=>{
      Object.assign(entry,{title:v.title.trim(),date:v.date,body:v.body});
      saveData(); refresh();
    });
  }

  function deleteEntry(kind,index) {
    const trip = current();
    const arr = kind === "place" ? trip?.savedPlaces : trip?.journal;
    if (!Array.isArray(arr) || !arr[index]) return;
    if (!confirm(tr("Delete this item?","هل تريد حذف هذا العنصر؟"))) return;
    arr.splice(index,1);
    saveData(); refresh();
  }

  function decoratePanel() {
    const panel = $("v6-trip-tools");
    const trip = current();
    if (!panel || !trip) return;

    const placeCard = panel.children[2];
    if (placeCard) {
      placeCard.querySelectorAll(".v6-item").forEach(item => {
        const remove = item.querySelector("[data-v6-remove-place]");
        if (!remove) return;
        const index = Number(remove.dataset.v6RemovePlace);
        if (item.querySelector("[data-v61-edit-place]")) return;
        const edit = document.createElement("button");
        edit.type = "button"; edit.className = "v6-btn";
        edit.textContent = tr("Edit","تعديل");
        edit.dataset.v61EditPlace = String(index);
        remove.parentElement?.insertBefore(edit,remove);
      });
    }

    const journalCard = panel.children[3];
    if (journalCard && Array.isArray(trip.journal)) {
      journalCard.querySelectorAll(".v6-item").forEach((item,displayIndex) => {
        if (item.querySelector("[data-v61-journal-actions]")) return;
        const index = trip.journal.length - 1 - displayIndex;
        if (!trip.journal[index]) return;
        const actions = document.createElement("div");
        actions.className = "v61-entry-actions";
        actions.dataset.v61JournalActions = "1";
        actions.innerHTML = `<button type="button" class="v6-btn" data-edit>${tr("Edit","تعديل")}</button>
          <button type="button" class="v6-btn" data-delete>${tr("Delete","حذف")}</button>`;
        item.appendChild(actions);
        actions.querySelector("[data-edit]").addEventListener("click",()=>editJournal(index));
        actions.querySelector("[data-delete]").addEventListener("click",()=>deleteEntry("journal",index));
      });
    }
  }

  function install() {
    const addButton = $("addDayBtn");
    if (addButton) addButton.onclick = addActivity;

    const originalRenderTrip = window.renderTrip;
    if (typeof originalRenderTrip === "function" && !originalRenderTrip.__v61Wrapped) {
      const wrapped = function() { originalRenderTrip(); decoratePanel(); };
      wrapped.__v61Wrapped = true;
      window.renderTrip = wrapped;
    }
    const originalRenderAll = window.renderAll;
    if (typeof originalRenderAll === "function" && !originalRenderAll.__v61Wrapped) {
      const wrapped = function() { originalRenderAll(); decoratePanel(); };
      wrapped.__v61Wrapped = true;
      window.renderAll = wrapped;
    }
    decoratePanel();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",install,{once:true});
  else install();
  document.addEventListener("click",e=>{
    const edit=e.target.closest("[data-v61-edit-place]");
    if(edit){editPlace(Number(edit.dataset.v61EditPlace));return;}
  });
})();
