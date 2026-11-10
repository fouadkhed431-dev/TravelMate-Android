/* TravelMate V5.1 — Prefilled Activity Editor
   Load after app.js and v5-upgrade.js. Keeps the existing trip data model. */
(() => {
  "use strict";
  if (window.__travelMateEditModalLoaded) return;
  window.__travelMateEditModalLoaded = true;

  const style = document.createElement("style");
  style.id = "tm-edit-modal-style";
  style.textContent = `
    .tm-edit-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.58);display:flex;align-items:flex-end;justify-content:center;padding:12px}
    .tm-edit-dialog{width:min(100%,560px);max-height:92dvh;overflow:auto;background:var(--card,#fff);color:var(--text,#172033);border-radius:24px 24px 18px 18px;padding:20px;box-shadow:0 18px 60px rgba(0,0,0,.25);font-family:inherit}
    .tm-edit-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
    .tm-edit-head h2{font-size:21px;margin:0;font-weight:800}
    .tm-edit-close{border:0;background:var(--surface,#eef2f8);border-radius:12px;width:40px;height:40px;font-size:23px;color:inherit}
    .tm-edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .tm-edit-field{display:flex;flex-direction:column;gap:6px;min-width:0}
    .tm-edit-field.wide{grid-column:1/-1}
    .tm-edit-field label{font-size:13px;font-weight:700;color:var(--muted,#64748b)}
    .tm-edit-field input,.tm-edit-field textarea{box-sizing:border-box;width:100%;min-height:46px;border:1px solid var(--border,#dbe2ec);border-radius:12px;padding:11px 12px;background:var(--input-bg,#fff);color:inherit;font:inherit;font-size:16px;outline:none}
    .tm-edit-field input:focus,.tm-edit-field textarea:focus{border-color:#3979e8;box-shadow:0 0 0 3px rgba(57,121,232,.13)}
    .tm-edit-field textarea{min-height:84px;resize:vertical}
    .tm-edit-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:18px;position:sticky;bottom:-20px;background:var(--card,#fff);padding:12px 0 2px}
    .tm-edit-actions button{border:0;border-radius:13px;padding:13px 18px;font:inherit;font-weight:800;min-height:48px}
    .tm-edit-cancel{background:var(--surface,#eef2f8);color:inherit}
    .tm-edit-save{background:#3979e8;color:#fff;flex:1}
    @media(max-width:420px){.tm-edit-dialog{padding:17px}.tm-edit-grid{grid-template-columns:1fr}.tm-edit-field.wide{grid-column:auto}.tm-edit-actions button{padding:12px}}
  `;
  document.head.appendChild(style);

  const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  }[c]));

  function timeForInput(value) {
    const raw = String(value || "").trim().toLowerCase().replace(/\./g, "");
    let m = /^(\d{1,2}):(\d{2})\s*(am|pm)?$/.exec(raw);
    if (!m) m = /^(\d{1,2})\s*(am|pm)$/.exec(raw);
    if (!m) return "";
    let h = Number(m[1]), min = Number(m[2] || 0);
    if (h > 23 || min > 59) return "";
    if (m[3] === "pm" && h < 12) h += 12;
    if (m[3] === "am" && h === 12) h = 0;
    return String(h).padStart(2,"0")+":"+String(min).padStart(2,"0");
  }

  function closeModal() {
    document.getElementById("tm-edit-backdrop")?.remove();
    document.removeEventListener("keydown", onKey);
  }
  function onKey(e) {
    if (e.key === "Escape") closeModal();
  }

  function openEditor(id) {
    const trip = trips?.[currentTrip];
    const activity = trip?.activities?.find(a => String(a.id) === String(id));
    if (!activity) return;

    closeModal();
    const backdrop = document.createElement("div");
    backdrop.className = "tm-edit-backdrop";
    backdrop.id = "tm-edit-backdrop";
    backdrop.innerHTML = `
      <section class="tm-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="tm-edit-title">
        <div class="tm-edit-head">
          <h2 id="tm-edit-title">Edit activity / تعديل النشاط</h2>
          <button type="button" class="tm-edit-close" data-close aria-label="Close">×</button>
        </div>
        <form id="tm-edit-form">
          <div class="tm-edit-grid">
            <div class="tm-edit-field wide"><label for="tm-name">Activity name / اسم النشاط</label><input id="tm-name" name="name" required maxlength="120" value="${esc(activity.name)}"></div>
            <div class="tm-edit-field"><label for="tm-day">Day / اليوم</label><input id="tm-day" name="day" value="${esc(activity.day || "Day 1")}" required></div>
            <div class="tm-edit-field"><label for="tm-time">Start time / وقت البداية</label><input id="tm-time" name="time" type="time" value="${esc(timeForInput(activity.time))}"></div>
            <div class="tm-edit-field"><label for="tm-duration">Duration (minutes) / المدة بالدقائق</label><input id="tm-duration" name="duration" type="number" min="5" max="1440" step="5" value="${esc(activity.duration || 60)}"></div>
            <div class="tm-edit-field"><label for="tm-cost">Estimated cost / التكلفة</label><input id="tm-cost" name="cost" type="number" min="0" step="0.01" value="${esc(activity.cost || 0)}"></div>
            <div class="tm-edit-field wide"><label for="tm-city">Place / address / المكان</label><input id="tm-city" name="city" value="${esc(activity.city || "")}"></div>
            <div class="tm-edit-field wide"><label for="tm-notes">Notes / ملاحظات</label><textarea id="tm-notes" name="notes">${esc(activity.notes || "")}</textarea></div>
          </div>
          <div class="tm-edit-actions">
            <button type="button" class="tm-edit-cancel" data-close>Cancel</button>
            <button type="submit" class="tm-edit-save">Save changes / حفظ التعديلات</button>
          </div>
        </form>
      </section>`;
    backdrop.addEventListener("click", e => {
      if (e.target === backdrop || e.target.closest("[data-close]")) closeModal();
    });
    backdrop.querySelector("#tm-edit-form").addEventListener("submit", e => {
      e.preventDefault();
      const form = e.currentTarget;
      const fd = new FormData(form);
      const name = String(fd.get("name") || "").trim();
      if (!name) {
        form.elements.name.focus();
        return;
      }
      const duration = Number(fd.get("duration"));
      const cost = Number(fd.get("cost"));
      activity.name = name;
      activity.day = String(fd.get("day") || activity.day || "Day 1").trim() || "Day 1";
      activity.time = String(fd.get("time") || "");
      activity.duration = Number.isFinite(duration) ? Math.max(5, Math.min(1440, duration || 60)) : 60;
      activity.cost = Number.isFinite(cost) ? Math.max(0, cost) : 0;
      activity.city = String(fd.get("city") || "").trim();
      activity.notes = String(fd.get("notes") || "").trim();
      save();
      closeModal();
      if (typeof renderTrip === "function") renderTrip();
      if (typeof renderAll === "function") renderAll();
    });
    document.body.appendChild(backdrop);
    document.addEventListener("keydown", onKey);
    setTimeout(() => backdrop.querySelector("#tm-name")?.focus(), 40);
  }

  // Capture the Edit tap before the V5 prompt-based handler receives it.
  document.addEventListener("click", e => {
    const button = e.target.closest("[data-v5-edit]");
    if (!button) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    openEditor(button.getAttribute("data-v5-edit"));
  }, true);
})();
