/* TravelMate V5 — Timeline Upgrade
   Additive enhancement: keeps V4 storage and trip data intact. */
(() => {
  "use strict";
  if (window.__travelMateV5Loaded) return;
  window.__travelMateV5Loaded = true;

  const $v5 = id => document.getElementById(id);
  let activeDay = "Day 1";
  let draggedActivityId = null;

  const tr5 = (en, ar) => (typeof settings !== "undefined" && settings.language === "ar") ? ar : en;
  const escape5 = value => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));
  const toMinutes = value => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""));
    if (!m) return null;
    const h = Number(m[1]), min = Number(m[2]);
    return h < 24 && min < 60 ? h * 60 + min : null;
  };
  const money5 = n => {
    try { return Number(n || 0).toLocaleString(settings.language === "ar" ? "ar-EG" : "en-US", {maximumFractionDigits:2}) + " " + (settings.currency || "EGP"); }
    catch (_) { return String(n || 0); }
  };
  const trip5 = () => (typeof currentTrip !== "undefined" && currentTrip !== null) ? trips[currentTrip] : null;
  const dayKey = s => String(s || "Day 1").trim() || "Day 1";

  function ensureStyles() {
    if ($v5("v5-inline-style")) return;
    const link = document.createElement("link");
    link.id = "v5-inline-style";
    link.rel = "stylesheet";
    link.href = "v5-upgrade.css";
    document.head.appendChild(link);
  }

  function renderTimeline() {
    const trip = trip5();
    const host = $v5("dayList");
    if (!trip || !host) return;

    const activities = Array.isArray(trip.activities) ? trip.activities : [];
    const days = [...new Set(["Day 1", ...activities.map(a => dayKey(a.day))])].sort((a,b) => {
      const na = Number((a.match(/\d+/)||[])[0] || 9999);
      const nb = Number((b.match(/\d+/)||[])[0] || 9999);
      return na - nb || a.localeCompare(b);
    });
    if (!days.includes(activeDay)) activeDay = days[0];

    const visible = activities
      .map((a, index) => ({...a, _index:index}))
      .filter(a => dayKey(a.day) === activeDay)
      .sort((a,b) => (toMinutes(a.time) ?? 9999) - (toMinutes(b.time) ?? 9999));

    const clashes = new Set();
    for (let i=0; i<visible.length; i++) {
      const a = visible[i], startA = toMinutes(a.time);
      if (startA === null) continue;
      const endA = startA + Math.max(1, Number(a.duration) || 60);
      for (let j=i+1; j<visible.length; j++) {
        const b = visible[j], startB = toMinutes(b.time);
        if (startB === null) continue;
        const endB = startB + Math.max(1, Number(b.duration) || 60);
        if (startA < endB && startB < endA) {
          clashes.add(String(a.id)); clashes.add(String(b.id));
        }
      }
    }

    const totalCost = visible.reduce((sum,a) => sum + (Number(a.cost)||0), 0);
    host.innerHTML = `
      <div class="v5-panel">
        <div class="v5-toolbar">
          <div><span class="v5-kicker">${tr5("YOUR DAY","يومك")}</span><strong>${escape5(activeDay)}</strong></div>
          <span class="v5-day-total">${tr5("Planned","مخطط")}: ${money5(totalCost)}</span>
        </div>
        <div class="v5-day-tabs" role="tablist">
          ${days.map(d=>`<button type="button" class="v5-day-tab ${d===activeDay?"active":""}" data-v5-day="${escape5(d)}">${escape5(d)}</button>`).join("")}
          <button type="button" class="v5-day-tab v5-add-day" id="v5AddDay">＋ ${tr5("Day","يوم")}</button>
        </div>
        ${clashes.size ? `<div class="v5-warning">⚠ ${tr5("Some activities overlap in time. Review the highlighted items.","هناك تداخل في مواعيد بعض الأنشطة. راجع العناصر المحددة.")}</div>` : ""}
        <div class="v5-timeline">
          ${visible.map(a=>`
            <article class="v5-event ${clashes.has(String(a.id))?"conflict":""}" draggable="true" data-v5-id="${escape5(a.id)}">
              <div class="v5-time">${escape5(a.time || "—")}</div>
              <div class="v5-rail"><i></i></div>
              <div class="v5-event-card">
                <div class="v5-event-head">
                  <strong>${escape5(a.name)}</strong>
                  <span class="v5-grip" aria-label="Drag to reorder">⠿</span>
                </div>
                <div class="v5-meta">📍 ${escape5(a.city || tr5("Location not set","لم يحدد المكان"))}</div>
                <div class="v5-meta">◷ ${Number(a.duration)||60} ${tr5("min","دقيقة")}${a.cost ? ` · ${money5(a.cost)}` : ""}</div>
                ${a.notes ? `<p class="v5-notes">${escape5(a.notes)}</p>` : ""}
                <div class="v5-actions">
                  ${a.city ? `<button type="button" data-v5-map="${escape5(a.city)}">↗ ${tr5("Map","الخريطة")}</button>` : ""}
                  <button type="button" data-v5-edit="${escape5(a.id)}">${tr5("Edit","تعديل")}</button>
                  <button type="button" data-v5-delete="${escape5(a.id)}">${tr5("Delete","حذف")}</button>
                </div>
              </div>
            </article>
          `).join("") || `<div class="v5-empty">✦<strong>${tr5("A day waiting to happen","يوم جديد في انتظارك")}</strong><span>${tr5("Add your first activity to build the timeline.","أضف أول نشاط لبناء جدول رحلتك.")}</span></div>`}
        </div>
        <div class="v5-footnote">${tr5("Tip: drag an activity to change its order. Time clashes are highlighted automatically.","نصيحة: اسحب النشاط لتغيير ترتيبه. يتم تمييز تداخل المواعيد تلقائياً.")}</div>
      </div>`;

    host.querySelectorAll("[data-v5-day]").forEach(btn => btn.addEventListener("click", () => {
      activeDay = btn.dataset.v5Day; renderTimeline();
    }));
    $v5("v5AddDay")?.addEventListener("click", () => {
      const name = prompt(tr5("Enter day label (e.g. Day 2)","اكتب اسم اليوم (مثلاً Day 2)"), `Day ${days.length+1}`);
      if (name && name.trim()) { activeDay = dayKey(name); renderTimeline(); }
    });
    host.querySelectorAll("[data-v5-edit]").forEach(btn => btn.addEventListener("click", () => editV5(btn.dataset.v5Edit)));
    host.querySelectorAll("[data-v5-delete]").forEach(btn => btn.addEventListener("click", () => deleteV5(btn.dataset.v5Delete)));
    host.querySelectorAll("[data-v5-map]").forEach(btn => btn.addEventListener("click", () => {
      const url = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(btn.dataset.v5Map);
      window.open(url, "_blank", "noopener");
    }));
    host.querySelectorAll(".v5-event").forEach(card => {
      card.addEventListener("dragstart", e => { draggedActivityId = card.dataset.v5Id; card.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; });
      card.addEventListener("dragend", () => { card.classList.remove("dragging"); draggedActivityId=null; });
      card.addEventListener("dragover", e => { e.preventDefault(); card.classList.add("drag-over"); });
      card.addEventListener("dragleave", () => card.classList.remove("drag-over"));
      card.addEventListener("drop", e => {
        e.preventDefault(); card.classList.remove("drag-over");
        const targetId = card.dataset.v5Id;
        if (!draggedActivityId || draggedActivityId === targetId) return;
        const from = activities.findIndex(x=>String(x.id)===String(draggedActivityId));
        const to = activities.findIndex(x=>String(x.id)===String(targetId));
        if (from<0 || to<0) return;
        const [item] = activities.splice(from,1); activities.splice(to,0,item);
        save(); renderTimeline();
      });
    });
  }

  function addV5() {
    const trip = trip5(); if (!trip) return;
    const name = prompt(tr5("Activity name","اسم النشاط"));
    if (!name || !name.trim()) return;
    const day = prompt(tr5("Day (e.g. Day 1)","اليوم (مثلاً Day 1)"), activeDay) || activeDay;
    const time = prompt(tr5("Start time (HH:MM, 24-hour)","وقت البداية (HH:MM)"), "09:00") || "";
    const durationRaw = prompt(tr5("Duration in minutes","المدة بالدقائق"), "60");
    const duration = Math.max(5, Math.min(1440, Number(durationRaw)||60));
    const city = prompt(tr5("Place / address","المكان / العنوان"), trip.cities?.[0] || "") || "";
    const cost = Math.max(0, Number(prompt(tr5("Estimated cost (optional)","التكلفة المتوقعة (اختياري)"), "0")) || 0);
    const notes = prompt(tr5("Notes (optional)","ملاحظات (اختياري)"), "") || "";
    trip.activities.push({id:uid(),name:name.trim(),day:dayKey(day),time,duration,cost,city,notes});
    activeDay=dayKey(day); save(); renderTrip(); renderAll();
  }

  function editV5(id) {
    const trip=trip5(); if(!trip) return;
    const a=trip.activities.find(x=>String(x.id)===String(id)); if(!a) return;
    const name=prompt(tr5("Activity name","اسم النشاط"),a.name); if(!name || !name.trim()) return;
    a.name=name.trim();
    a.day=dayKey(prompt(tr5("Day","اليوم"),a.day)||a.day);
    a.time=prompt(tr5("Start time (HH:MM)","وقت البداية (HH:MM)"),a.time||"") ?? a.time;
    a.duration=Math.max(5,Math.min(1440,Number(prompt(tr5("Duration in minutes","المدة بالدقائق"),String(a.duration||60)))||60));
    a.city=prompt(tr5("Place / address","المكان / العنوان"),a.city||"") ?? a.city;
    a.cost=Math.max(0,Number(prompt(tr5("Estimated cost","التكلفة المتوقعة"),String(a.cost||0)))||0);
    a.notes=prompt(tr5("Notes","ملاحظات"),a.notes||"") ?? a.notes;
    activeDay=a.day; save(); renderTrip(); renderAll();
  }

  function deleteV5(id) {
    const trip=trip5(); if(!trip) return;
    if(!confirm(tr5("Delete this activity?","هل تريد حذف هذا النشاط؟"))) return;
    trip.activities=trip.activities.filter(x=>String(x.id)!==String(id));
    save(); renderTrip(); renderAll();
  }

  function enhance() {
    ensureStyles();
    if (typeof addActivity === "function") addActivity = addV5;
    if (typeof renderActivities === "function") renderActivities = renderTimeline;
    if (typeof editActivity === "function") editActivity = editV5;
    if (typeof removeActivity === "function") removeActivity = deleteV5;
    const title = $v5("detail")?.querySelector(".section-heading");
    if (title && $v5("dayList")) {
      const heading = [...$v5("detail").querySelectorAll(".section-heading")].find(el => el.nextElementSibling?.id === "dayList");
      if (heading) {
        const h = heading.querySelector("h3"); if (h) h.textContent = tr5("Trip timeline","الجدول الزمني للرحلة");
        const add = $v5("addDayBtn"); if (add) add.textContent = "＋ " + tr5("Activity","نشاط");
      }
    }
    if (trip5()) renderTimeline();
  }

  // V4 calls renderTrip on every trip refresh. Re-render timeline after its normal UI update.
  const originalRenderTrip = renderTrip;
  renderTrip = function() { originalRenderTrip(); renderTimeline(); };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", enhance);
  else enhance();
})();
