/* TravelMate V14 Ultimate — trip intelligence, shareable routes, packing and reliability helpers. */
(() => {
  'use strict';
  if (window.__travelMateV14Loaded) return;
  window.__travelMateV14Loaded = true;
  const $ = id => document.getElementById(id);
  const ar = () => typeof settings !== 'undefined' && settings?.language === 'ar';
  const tx = (en, a) => ar() ? a : en;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const current = () => typeof currentTrip !== 'undefined' && currentTrip !== null && trips?.[currentTrip] ? trips[currentTrip] : null;
  const css = document.createElement('style');
  css.textContent = `
    .tm14-panel{margin:14px 0;padding:14px;border:1px solid var(--border,#ddd);border-radius:16px;background:var(--surface,#fff);color:var(--text,#172033)}
    .tm14-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;margin:10px 0}
    .tm14-stat{padding:11px;border-radius:12px;background:var(--surface2,#f4f6f8);min-width:0}
    .tm14-stat b{display:block;font-size:20px;margin-bottom:3px}.tm14-muted{font-size:12px;opacity:.72}
    .tm14-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
    .tm14-btn{border:1px solid var(--border,#ddd);border-radius:10px;padding:10px 12px;background:var(--surface2,#f4f6f8);color:var(--text,#172033);font-weight:700}
    .tm14-primary{background:var(--accent,#315b80);color:#fff;border-color:transparent}
    .tm14-item{display:flex;gap:9px;align-items:flex-start;padding:9px 0;border-top:1px solid var(--border,#ddd)}
    .tm14-item input{width:auto;margin-top:4px}.tm14-item .tm14-grow{flex:1;min-width:0}
    .tm14-bar{height:7px;border-radius:9px;background:var(--surface2,#eee);overflow:hidden}.tm14-bar i{display:block;height:100%;background:var(--accent,#315b80)}
    .tm14-tag{display:inline-block;padding:3px 7px;border-radius:20px;background:var(--surface2,#eee);font-size:11px}
    @media(min-width:600px){.tm14-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
  `;
  document.head.appendChild(css);

  const packKey = 'travelmate_v14_packing';
  const readPack = () => { try { const x=JSON.parse(localStorage.getItem(packKey)||'[]'); return Array.isArray(x)?x:[]; } catch { return []; } };
  const savePack = rows => localStorage.setItem(packKey, JSON.stringify(rows));
  const uid = () => `tm14-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;

  function durationMinutes(a) { return Math.max(5, Math.min(1440, Number(a.duration)||60)); }
  function scheduleWarnings(t) {
    const rows=(t?.activities||[]).filter(a=>a.time).slice().sort((a,b)=>
      String(a.calendarDate||a.day||'').localeCompare(String(b.calendarDate||b.day||'')) || String(a.time).localeCompare(String(b.time)));
    const warnings=[];
    for(let i=1;i<rows.length;i++){
      const p=rows[i-1],n=rows[i];
      const same=String(p.calendarDate||p.day||'')===String(n.calendarDate||n.day||'');
      if(!same) continue;
      const pm=Number(String(p.time).slice(0,2))*60+Number(String(p.time).slice(3,5));
      const nm=Number(String(n.time).slice(0,2))*60+Number(String(n.time).slice(3,5));
      if(Number.isFinite(pm)&&Number.isFinite(nm)&&nm<pm+durationMinutes(p))
        warnings.push({first:p.name||'Activity',second:n.name||'Activity'});
    }
    return warnings;
  }
  function buildRoute(t) {
    const places=[];
    (t?.activities||[]).slice().sort((a,b)=>String(a.calendarDate||a.day||'').localeCompare(String(b.calendarDate||b.day||''))||String(a.time||'').localeCompare(String(b.time||'')))
      .forEach(a=>{const p=String(a.city||'').trim();if(p&&!places.some(x=>x.toLowerCase()===p.toLowerCase()))places.push(p);});
    (t?.cities||[]).forEach(c=>{const p=String(c||'').trim();if(p&&!places.some(x=>x.toLowerCase()===p.toLowerCase()))places.push(p);});
    if(places.length<2){alert(tx('Add at least two activity locations or destinations first.','أضف مكانين على الأقل للأنشطة أو الوجهات أولاً.'));return;}
    const params=new URLSearchParams({api:'1',origin:places[0],destination:places[places.length-1],travelmode:'driving'});
    if(places.length>2) params.set('waypoints',places.slice(1,-1).join('|'));
    location.href='https://www.google.com/maps/dir/?'+params.toString();
  }
  async function shareTrip(t) {
    if(!t)return;
    const acts=(t.activities||[]).slice().sort((a,b)=>String(a.calendarDate||a.day||'').localeCompare(String(b.calendarDate||b.day||''))||String(a.time||'').localeCompare(String(b.time||'')));
    const lines=[`TravelMate — ${t.name||'Trip'}`,`Dates: ${t.date||'Not set'}`,`Destinations: ${(t.cities||[]).join(', ')}`,'','ITINERARY',
      ...acts.map(a=>`${a.calendarDate||a.day||'Day'} ${a.time||''} — ${a.name||'Activity'}${a.city?' · '+a.city:''}${a.notes?' · '+a.notes:''}`)];
    const text=lines.join('\n');
    try {
      if(navigator.share){await navigator.share({title:`TravelMate — ${t.name||'Trip'}`,text});return;}
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);alert(tx('Itinerary copied to clipboard.','تم نسخ برنامج الرحلة.'));return;}
    } catch(e) { if(e?.name==='AbortError')return; }
    const modal=document.createElement('div');
    modal.style.cssText='position:fixed;inset:0;z-index:100700;background:#0009;display:grid;place-items:center;padding:14px';
    modal.innerHTML=`<section style="width:min(620px,100%);background:var(--surface,#fff);color:var(--text,#172033);padding:14px;border-radius:16px"><h3>${tx('Share itinerary','مشاركة برنامج الرحلة')}</h3><textarea style="width:100%;min-height:240px">${esc(text)}</textarea><div class="tm14-actions"><button class="tm14-btn tm14-primary" data-copy>${tx('Copy','نسخ')}</button><button class="tm14-btn" data-close>${tx('Close','إغلاق')}</button></div></section>`;
    document.body.append(modal);
    modal.querySelector('[data-close]').onclick=()=>modal.remove();
    modal.querySelector('[data-copy]').onclick=async()=>{const ta=modal.querySelector('textarea');ta.select();try{document.execCommand('copy');alert(tx('Copied.','تم النسخ.'));}catch{}};
  }

  function renderPacking(t) {
    const host=$('tm14-packing'); if(!host||!t)return;
    const rows=readPack().filter(x=>String(x.tripId)===String(t.id));
    const done=rows.filter(x=>x.done).length;
    const categories=['Documents','Clothing','Health','Electronics','Essentials','Other'];
    host.innerHTML=`<div class="tm14-panel"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>🧳 ${tx('Packing checklist','قائمة تجهيز السفر')}</b><span class="tm14-tag">${done}/${rows.length}</span></div><div class="tm14-bar" style="margin:9px 0"><i style="width:${rows.length?done/rows.length*100:0}%"></i></div><div class="tm14-actions"><button class="tm14-btn tm14-primary" data-pack-add>＋ ${tx('Add item','إضافة عنصر')}</button></div>${rows.length?rows.map(x=>`<div class="tm14-item"><input type="checkbox" data-pack-check="${esc(x.id)}" ${x.done?'checked':''}><div class="tm14-grow"><b style="${x.done?'text-decoration:line-through;opacity:.6':''}">${esc(x.title)}</b><div class="tm14-muted">${esc(x.category)}</div></div><button class="tm14-btn" data-pack-del="${esc(x.id)}">×</button></div>`).join(''):`<p class="tm14-muted">${tx('Add items you need to pack for this trip.','أضف الأشياء التي تحتاج إلى تجهيزها لهذه الرحلة.')}</p>`}</div>`;
    host.querySelector('[data-pack-add]').onclick=()=>{
      const title=prompt(tx('What do you need to pack?','ما الذي تريد إضافته لقائمة التجهيز؟'));if(!title?.trim())return;
      const category=prompt(tx('Category: Documents, Clothing, Health, Electronics, Essentials or Other','التصنيف: مستندات، ملابس، صحة، إلكترونيات، أساسيات، أخرى'))||'Other';
      const all=readPack();all.push({id:uid(),tripId:String(t.id),title:title.trim(),category:categories.find(x=>x.toLowerCase()===category.trim().toLowerCase())||category.trim(),done:false});savePack(all);renderPacking(t);
    };
    host.querySelectorAll('[data-pack-check]').forEach(b=>b.onchange=()=>{const all=readPack(),x=all.find(y=>y.id===b.dataset.packCheck);if(x)x.done=b.checked;savePack(all);renderPacking(t);});
    host.querySelectorAll('[data-pack-del]').forEach(b=>b.onclick=()=>{savePack(readPack().filter(x=>x.id!==b.dataset.packDel));renderPacking(t);});
  }

  function renderTripPanel() {
    const t=current(),detail=$('detail');if(!t||!detail)return;
    let panel=$('tm14-trip-panel');
    if(!panel){panel=document.createElement('section');panel.id='tm14-trip-panel';panel.className='tm14-panel';const cover=detail.querySelector('.trip-cover');if(cover)cover.insertAdjacentElement('afterend',panel);}
    const acts=t.activities||[],travellers=t.travelers||[];
    const estimate=acts.reduce((s,a)=>s+(Number(a.cost)||0),0);
    const warnings=scheduleWarnings(t);
    panel.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><b>✦ ${tx('Trip overview','ملخص الرحلة')}</b><span class="tm14-tag">${tx('Smart planning','تخطيط ذكي')}</span></div>
      <div class="tm14-grid"><div class="tm14-stat"><b>${acts.length}</b><span class="tm14-muted">${tx('Activities','الأنشطة')}</span></div><div class="tm14-stat"><b>${(t.cities||[]).length}</b><span class="tm14-muted">${tx('Destinations','الوجهات')}</span></div><div class="tm14-stat"><b>${travellers.length}</b><span class="tm14-muted">${tx('Travelers','المسافرون')}</span></div><div class="tm14-stat"><b>${estimate.toLocaleString()}</b><span class="tm14-muted">${tx('Estimated activity costs','تكلفة الأنشطة المتوقعة')} · ${esc(settings?.currency||'EGP')}</span></div></div>
      <div class="tm14-actions"><button class="tm14-btn tm14-primary" data-route>🗺️ ${tx('Open trip route','افتح مسار الرحلة')}</button><button class="tm14-btn" data-share>↗ ${tx('Share itinerary','مشاركة البرنامج')}</button></div>
      ${warnings.length?`<div style="margin-top:12px"><b>⚠ ${tx('Possible schedule conflicts','تعارضات محتملة في المواعيد')}</b>${warnings.map(w=>`<p class="tm14-muted">• ${esc(w.first)} ↔ ${esc(w.second)}</p>`).join('')}</div>`:`<p class="tm14-muted" style="margin-top:10px">✓ ${tx('No time overlaps detected in the current schedule.','لم يتم اكتشاف تداخل زمني في الجدول الحالي.')}</p>`}`;
    panel.querySelector('[data-route]').onclick=()=>buildRoute(t);
    panel.querySelector('[data-share]').onclick=()=>shareTrip(t);
    let packing=$('tm14-packing');
    if(!packing){packing=document.createElement('div');packing.id='tm14-packing';panel.insertAdjacentElement('afterend',packing);}
    renderPacking(t);
  }

  function addCurrencyCalculator() {
    const page=$('expenses');if(!page||$('tm14-currency'))return;
    const host=document.createElement('section');host.id='tm14-currency';host.className='tm14-panel';
    host.innerHTML=`<b>💱 ${tx('Quick currency calculator','محول عملات سريع')}</b><p class="tm14-muted">${tx('Enter a rate from a source you trust. This does not alter saved expenses.','أدخل سعر الصرف من مصدر تثق به. لا يغيّر هذا مصروفاتك المسجلة.')}</p><div class="tm14-actions"><input id="tm14-amount" type="number" min="0" step="any" placeholder="${tx('Amount','المبلغ')}" style="min-width:90px;flex:1"><select id="tm14-from"><option>USD</option><option>EUR</option><option>EGP</option><option>RUB</option></select><span>→</span><select id="tm14-to"><option>EGP</option><option>USD</option><option>EUR</option><option>RUB</option></select><input id="tm14-rate" type="number" min="0" step="any" placeholder="${tx('Rate','سعر الصرف')}" style="min-width:90px;flex:1"></div><div id="tm14-result" style="font-weight:800;margin-top:10px">—</div>`;
    const budget=page.querySelector('.budget-card');if(budget)budget.insertAdjacentElement('afterend',host);else page.prepend(host);
    const calc=()=>{const n=Number($('tm14-amount').value),r=Number($('tm14-rate').value),from=$('tm14-from').value,to=$('tm14-to').value;$('tm14-result').textContent=Number.isFinite(n)&&n>=0&&r>0?`${(n*r).toLocaleString(undefined,{maximumFractionDigits:2})} ${to} (${from} → ${to})`:'—';};
    ['tm14-amount','tm14-rate','tm14-from','tm14-to'].forEach(id=>$(id).addEventListener('input',calc));
  }

  function install() {
    addCurrencyCalculator();
    const old=window.showPage;
    if(typeof old==='function'&&!old.__tm14Wrapped){
      const wrapped=function(page){old(page);if(page==='detail')setTimeout(renderTripPanel,120);if(page==='expenses')setTimeout(addCurrencyCalculator,100);};
      wrapped.__tm14Wrapped=true;window.showPage=wrapped;
    }
    const detail=$('detail');
    if(detail&&window.MutationObserver){let timer;new MutationObserver(()=>{if(!detail.classList.contains('hidden')){clearTimeout(timer);timer=setTimeout(renderTripPanel,180);}}).observe(detail,{childList:true,subtree:true});}
    if(!detail?.classList.contains('hidden'))setTimeout(renderTripPanel,500);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
