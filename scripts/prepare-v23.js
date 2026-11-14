const fs = require('fs');
const file = 'www/v21-receipts.js';
if (!fs.existsSync(file)) throw new Error('V22 generated receipt module not found');
let s = fs.readFileSync(file, 'utf8');
const parseStart = s.indexOf('function parse(raw){');
const parseEnd = s.indexOf('\nasync function loadTesseract', parseStart);
if (parseStart < 0 || parseEnd < 0) throw new Error('Could not locate V22 parser safely');
const parser = String.raw`function parse(raw){
const text=normalizeDigits(raw),lines=text.split(/\r?\n/).map(x=>x.trim()).filter(Boolean),low=text.toLowerCase();
const numRe=/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/g;
const vals=line=>[...String(line||'').matchAll(numRe)].map(m=>Number(m[0].replace(/,/g,''))).filter(Number.isFinite);
const labeled=(re)=>{for(let i=lines.length-1;i>=0;i--){if(re.test(lines[i])){for(const candidate of [lines[i],lines[i+1]||'',lines[i+2]||'']){const a=vals(candidate);if(a.length)return a[a.length-1].toFixed(2)}}}return ''};
const amount=labeled(/\btotal\b|grand\s*total|amount\s*due|payable|الإجمالي|الاجمالي|المجموع|المطلوب/i);
const subtotal=labeled(/sub\s*total|subtotal|المجموع\s*الفرعي/i);
const service=labeled(/service\s*charge|service\s*fee|خدمة/i);
const vat=labeled(/\bvat\b|\btax\b|sales\s*tax|ضريبة/i);
const date=parseDate(text);
const merchant=lines.find(x=>/czn\s*burak|burak/i.test(x))||lines.slice(0,6).find(x=>/[A-Za-z\u0600-\u06FF]/.test(x)&&!/^\d/.test(x))||'';
let category='other';if(/restaurant|cafe|food|مطعم|كافيه|طعام/i.test(low))category='food';else if(/taxi|uber|bus|fuel|بنزين|مواصلات/i.test(low))category='transport';else if(/hotel|فندق|إقامة/i.test(low))category='accommodation';else if(/pharmacy|clinic|صيدلية|عيادة/i.test(low))category='health';else if(/market|supermarket|سوبر ماركت|تسوق/i.test(low))category='shopping';
const sum=[subtotal,service,vat].every(Boolean)?Number(subtotal)+Number(service)+Number(vat):null;
const consistent=sum!==null&&amount!==''&&Math.abs(sum-Number(amount))<=0.03;
const totalLabel=/\btotal\b|grand\s*total|amount\s*due|payable|الإجمالي|الاجمالي|المجموع|المطلوب/i.test(text);
const score=(amount?38:0)+(date?10:0)+(subtotal?6:0)+(service?5:0)+(vat?5:0)+(consistent?30:0)+(totalLabel?8:0)+(/czn\s*burak|restaurant|مطعم/i.test(low)?12:0)+(vals(text).length>5?8:0);
return{merchant,amount,date,category,raw,subtotal,service,vat,consistent,totalLabel,score};
}`;
s = s.slice(0, parseStart) + parser + s.slice(parseEnd);
const recStart = s.indexOf('async function recognize(file,status){');
const recEnd = s.indexOf('\nfunction showRaw', recStart);
if (recStart < 0 || recEnd < 0) throw new Error('Could not locate V22 OCR recognition function safely');
const recognize = String.raw`async function recognize(file,status){
const imgs=await variants(file),results=[];
for(const lang of ['eng+tur','eng+ara']){
 status(tx('Loading '+lang+' language data…','تحميل بيانات اللغة '+lang+'…'));
 const worker=await workerFor(lang,p=>status(tx('Reading '+lang+'… ','قراءة '+lang+'… ')+p+'%'));
 try{await worker.setParameters({tessedit_pageseg_mode:'6',preserve_interword_spaces:'1'})}catch(e){}
 for(let i=0;i<imgs.length;i++){
  status(tx('Testing '+lang+' image version '+(i+1)+'/2…','اختبار الصورة '+(i+1)+' من 2 للغة '+lang+'…'));
  const r=await worker.recognize(imgs[i]),p=parse(r.data.text||'');
  p.confidence=Number(r.data.confidence)||0;p.lang=lang;p.score+=p.confidence*.35;results.push(p);
 }
}
if(!results.length)return parse('');
const best=(key)=>results.filter(x=>x[key]!==''&&x[key]!=null).sort((a,b)=>((b.consistent?1:0)*100+b.confidence*.2+b.score)-((a.consistent?1:0)*100+a.confidence*.2+a.score))[0];
const ranked=[...results].sort((a,b)=>((b.consistent?1:0)*100+b.confidence*.2+b.score)-((a.consistent?1:0)*100+a.confidence*.2+a.score));
const base=ranked[0],parts=[...new Set(results.map(x=>x.raw).filter(Boolean))];
const merged={...base,raw:parts.join('\n\n──────── OCR attempt ────────\n\n')};
for(const key of ['merchant','amount','date','subtotal','service','vat','category']){const p=best(key);if(p)merged[key]=p[key]}
merged.consistent=!!(merged.subtotal&&merged.service&&merged.vat&&merged.amount&&Math.abs(Number(merged.subtotal)+Number(merged.service)+Number(merged.vat)-Number(merged.amount))<=0.03);
merged.confidence=base.confidence;merged.lang=base.lang;return merged;
}`;
s = s.slice(0, recStart) + recognize + s.slice(recEnd);
// Show arithmetic validation prominently during review; never silently replace a detected total.
s = s.replace("breakdown=[p.subtotal?'Subtotal: '+p.subtotal:'',p.service?'Service charge: '+p.service:'',p.vat?'VAT: '+p.vat:''].filter(Boolean).join(' · ')", "const breakdown=[p.subtotal?'Subtotal: '+p.subtotal:'',p.service?'Service charge: '+p.service:'',p.vat?'VAT: '+p.vat:''].filter(Boolean).join(' · '), arithmeticWarning=(p.subtotal&&p.service&&p.vat&&p.amount&&!p.consistent)?tx('⚠ Amounts do not add up. Please verify the subtotal, service, VAT and final total manually.','⚠ المبالغ لا تتطابق حسابيًا. يرجى مراجعة المجموع الفرعي والخدمة والضريبة والإجمالي يدويًا.'):(p.consistent?tx('✓ Subtotal + service + VAT matches the total.','✓ المجموع الفرعي + الخدمة + الضريبة يساوي الإجمالي.'):'')");
s = s.replace("'<div class=\"tm22-grid grid\"><div class=\"wide\">", "'<div class=\"tm22-status\" id=\"tm22-arithmetic\">'+esc(arithmeticWarning)+'</div><div class=\"tm22-grid grid\"><div class=\"wide\">");
fs.writeFileSync(file,s);
console.log('V23 field-merged OCR and arithmetic validation patch applied');
const gradle='android/app/build.gradle';
if(fs.existsSync(gradle)){let g=fs.readFileSync(gradle,'utf8').replace(/versionCode\s+\d+/,'versionCode 23').replace(/versionName\s+"[^"]+"/,'versionName "23.0.0"');fs.writeFileSync(gradle,g)}
const sw='www/sw.js';if(fs.existsSync(sw)){let w=fs.readFileSync(sw,'utf8').replace(/travelmate-v22-shell/g,'travelmate-v23-shell');fs.writeFileSync(sw,w)}
const manifest='www/manifest.webmanifest';if(fs.existsSync(manifest)){let m=JSON.parse(fs.readFileSync(manifest,'utf8'));m.name='TravelMate V23';fs.writeFileSync(manifest,JSON.stringify(m,null,2))}
