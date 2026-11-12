const fs=require('fs'),path=require('path'),root=process.cwd(),www=path.join(root,'www');
const R=p=>fs.readFileSync(p,'utf8'),W=(p,s)=>fs.writeFileSync(p,s);
function need(s,a,b,label){if(!s.includes(a))throw Error('V15 compatibility check failed: '+label);return s.replace(a,b);}
try{
 let p=path.join(www,'v11-ultimate.js'),s=R(p);
 if(!s.includes("card.querySelector('.tm11-activity-photo')?.remove()"))throw Error('V11 photo renderer not found');
 if(!s.includes("card.querySelector('.tm15-activity-media')?.remove()"))s=s.replace("card.querySelector('.tm11-activity-photo')?.remove();","card.querySelector('.tm15-activity-media')?.remove();card.querySelector('.tm11-activity-photo')?.remove();");
 if(s.includes('card.prepend(im);'))s=s.replace('card.prepend(im);',"const media=document.createElement('div');media.className='tm15-activity-media';media.append(im);const actions=card.querySelector('.v5-actions');if(actions)actions.insertAdjacentElement('beforebegin',media);else card.append(media);");
 if(!s.includes('tm15-activity-media'))throw Error('Activity photo layout patch did not apply');W(p,s);

 p=path.join(www,'v7-ultimate.js');s=R(p);
 if(!s.includes('{name:"time",label:tx("Time","الساعة"),type:"time"}'))s=need(s,'{name:"date",label:tx("Date","التاريخ"),type:"date"},','{name:"date",label:tx("Date","التاريخ"),type:"date"},\n      {name:"time",label:tx("Time","الساعة"),type:"time"},','expense form');
 if(!s.includes('time:old.time||'))s=need(s,'date:old.date||today(), tripId:initialTrip, payer:','date:old.date||today(), time:old.time||(expense?"":new Date().toTimeString().slice(0,5)), tripId:initialTrip, payer:','expense initial time');
 if(!s.includes('time:v.time||old.time||'))s=need(s,'date:v.date||today(), tripId:linked?.id||null, payer, notes:v.notes.trim()','date:v.date||today(), time:v.time||old.time||"", tripId:linked?.id||null, payer, notes:v.notes.trim()','expense save');
 const oldSort='.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));';
 if(s.includes(oldSort))s=s.replace(oldSort,`.slice().sort((a,b)=>{const m=localStorage.getItem("tm15_expense_sort")||"newest",x=(a.date||"")+" "+(a.time||"00:00"),y=(b.date||"")+" "+(b.time||"00:00");if(m==="oldest")return x.localeCompare(y);if(m==="highest")return (Number(b.amount)||0)-(Number(a.amount)||0);if(m==="lowest")return (Number(a.amount)||0)-(Number(b.amount)||0);return y.localeCompare(x);});`);
 else if(!s.includes('tm15_expense_sort'))throw Error('Expense sort target not found');
 const tripSort='list.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""))';
 if(s.includes(tripSort))s=s.replace(tripSort,`list.slice().sort((a,b)=>{const m=localStorage.getItem("tm15_expense_sort")||"newest",x=(a.date||"")+" "+(a.time||"00:00"),y=(b.date||"")+" "+(b.time||"00:00");if(m==="oldest")return x.localeCompare(y);if(m==="highest")return (Number(b.amount)||0)-(Number(a.amount)||0);if(m==="lowest")return (Number(a.amount)||0)-(Number(b.amount)||0);return y.localeCompare(x);})`);
 const h='<div class="v7-row" style="margin:12px 0"><b>${tx("Expense records","سجل المصروفات")}</b>';
 if(!s.includes('id="tm15-expense-sort"'))s=need(s,h,`<div class="v7-row" style="margin:12px 0;gap:8px"><b>\${tx("Expense records","سجل المصروفات")}</b><select id="tm15-expense-sort" style="max-width:190px;min-height:40px"><option value="newest">\${tx("Newest first","الأحدث أولاً")}</option><option value="oldest">\${tx("Oldest first","الأقدم أولاً")}</option><option value="highest">\${tx("Highest amount","الأعلى قيمة")}</option><option value="lowest">\${tx("Lowest amount","الأقل قيمة")}</option></select>`, 'sort control');
 const bind='$("v7-exp-trip")?.addEventListener("change",e=>{filters.trip=e.target.value;renderExpenseManager();});';
 if(!s.includes('tm15SortBound'))s=need(s,bind,bind+`
 const tm15Sort=$("tm15-expense-sort");if(tm15Sort){tm15Sort.value=localStorage.getItem("tm15_expense_sort")||"newest";if(!tm15Sort.dataset.tm15SortBound){tm15Sort.dataset.tm15SortBound="1";tm15Sort.addEventListener("change",()=>{localStorage.setItem("tm15_expense_sort",tm15Sort.value);renderExpenseManager();});}}`,'sort listener');
 s=s.split('· \${esc(e.date||"")} · \${tx("Paid by","دفع بواسطة")}').join('· \${esc(e.date||"")} \${e.time?`· \${esc(e.time)}`:""} · \${tx("Paid by","دفع بواسطة")}');
 s=s.replace('["Title","Amount","Currency","Category","Date","Payer","Trip","Notes"]','["Title","Amount","Currency","Category","Date","Time","Payer","Trip","Notes"]');
 s=s.replace('e.category||"other",e.date||"",e.payer||"",','e.category||"other",e.date||"",e.time||"",e.payer||"",');
 s=s.replace('<tr><td>\${esc(e.date||"")}</td><td>\${esc(e.title)}</td>','<tr><td>\${esc(e.date||"")}</td><td>\${esc(e.time||"")}</td><td>\${esc(e.title)}</td>');
 s=s.replace('<th>\${tx("Date","التاريخ")}</th><th>\${tx("Title","الوصف")}</th>','<th>\${tx("Date","التاريخ")}</th><th>\${tx("Time","الساعة")}</th><th>\${tx("Title","الوصف")}</th>');
 W(p,s);

 p=path.join(www,'v12-ultimate.js');s=R(p).replace('version:14,exportedAt:','version:15,exportedAt:').replace('TravelMate-V14-Full-Backup-','TravelMate-V15-Full-Backup-').replace('![10,12,14].includes(Number(d.version))','![10,12,14,15].includes(Number(d.version))');
 if(!s.includes('![10,12,14,15].includes(Number(d.version))'))throw Error('Backup compatibility patch failed');W(p,s);
 p=path.join(www,'v8-ultimate.js');s=R(p).replace("['Date','Expense','Category','Payer','Trip','Amount','Currency']","['Date','Time','Expense','Category','Payer','Trip','Amount','Currency']").replace('[e.date,e.title,e.category,e.payer,','[e.date,e.time||"",e.title,e.category,e.payer,');W(p,s);

 p=path.join(www,'index.html');s=R(p);if(!s.includes('src="v15-ultimate.js"'))s=s.replace('</body>','<script src="v15-ultimate.js"></script>\n</body>');s=s.replace(/TravelMate V10 Ultimate/g,'TravelMate V15 Final Ultimate').replace(/travelmate-icon-192\.png/g,'travelmate-v14-192.png');W(p,s);
 p=path.join(www,'sw.js');s=R(p).replace(/travelmate-v\d+-shell/g,'travelmate-v15-shell');if(!s.includes('"./v15-ultimate.js"'))s=s.replace(/(const CORE=\[[\s\S]*?)(\];)/,'$1,"./v15-ultimate.js"$2');W(p,s);
 p=path.join(www,'manifest.webmanifest');let m=JSON.parse(R(p));m.name='TravelMate V15 Final Ultimate';m.short_name='TravelMate';m.icons=[{src:'travelmate-v14-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'travelmate-v14-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}];W(p,JSON.stringify(m,null,2));
 p=path.join(root,'android/app/build.gradle');if(fs.existsSync(p))W(p,R(p).replace(/versionCode\s+\d+/,'versionCode 15').replace(/versionName\s+"[^"]+"/,'versionName "15.0.0"'));
 console.log('V15 preparation completed');
}catch(e){console.error(e.stack||e);process.exit(1)}
