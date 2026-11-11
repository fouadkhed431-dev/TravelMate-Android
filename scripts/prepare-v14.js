const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=process.cwd(),www=path.join(root,'www'),main=path.join(root,'android','app','src','main');
const read=p=>fs.readFileSync(p,'utf8'),write=(p,s)=>fs.writeFileSync(p,s);
const mkdir=p=>fs.mkdirSync(p,{recursive:true});
async function icons(){
  const src=path.join(www,'travelmate-tm-falcon.png');
  if(!fs.existsSync(src))throw new Error('Missing approved falcon artwork: www/travelmate-tm-falcon.png');
  const trimmed=await sharp(src).trim({background:'#fff',threshold:18}).png().toBuffer();
  const mark=await sharp(trimmed).resize(760,760,{fit:'contain',background:{r:255,g:255,b:255,alpha:0}}).png().toBuffer();
  const square=path.join(www,'travelmate-v14-icon-square.png');
  await sharp({create:{width:1024,height:1024,channels:4,background:'#fff'}}).composite([{input:mark,gravity:'centre'}]).png().toFile(square);
  fs.copyFileSync(square,path.join(www,'travelmate-tm-falcon-square.png'));
  const fg=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:await sharp(trimmed).resize(650,650,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).png().toBuffer(),gravity:'centre'}]).png().toBuffer();
  for(const size of [192,512])await sharp(square).resize(size,size).png().toFile(path.join(www,`travelmate-v14-${size}.png`));
  const dens={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
  for(const [d,s] of Object.entries(dens)){
    mkdir(path.join(main,'res',`mipmap-${d}`));
    await sharp(square).resize(s,s).png().toFile(path.join(main,'res',`mipmap-${d}`,'ic_launcher.png'));
    await sharp(square).resize(s,s).png().toFile(path.join(main,'res',`mipmap-${d}`,'ic_launcher_round.png'));
  }
  mkdir(path.join(main,'res','drawable'));
  await sharp(fg).resize(432,432).png().toFile(path.join(main,'res','drawable','ic_launcher_foreground.png'));
  mkdir(path.join(main,'res','mipmap-anydpi-v26'));
  write(path.join(main,'res','mipmap-anydpi-v26','ic_launcher.xml'),'<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>');
  write(path.join(main,'res','mipmap-anydpi-v26','ic_launcher_round.xml'),'<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>');
  mkdir(path.join(main,'res','values'));write(path.join(main,'res','values','ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
}
function patchPhotoChooser(){
  const p=path.join(www,'v11-ultimate.js');let s=read(p);
  const start=s.indexOf('function choose(kind,aid){'),end=s.indexOf('\nlet rendering=false;',start);
  if(start<0||end<0)throw new Error('Could not locate the V11 photo chooser safely; refusing to overwrite it.');
  const replacement=`function choose(kind,aid){
    const t=trip();if(!t)return alert(tx('Open a trip first.','افتح رحلة أولاً.'));
    const layer=document.createElement('div');layer.style.cssText='position:fixed;inset:0;z-index:100600;background:#0009;display:grid;place-items:center;padding:16px';
    layer.innerHTML=\`<section style="width:min(380px,100%);background:var(--surface);color:var(--text);padding:18px;border-radius:18px"><h3>\${tx('Add a photo','إضافة صورة')}</h3><p style="opacity:.75;font-size:13px">\${tx('Choose an image source','اختر مصدر الصورة')}</p><div class="tm11-row"><button class="tm11-btn tm11-primary" data-gallery>\${tx('Choose from Gallery','اختيار من المعرض')}</button><button class="tm11-btn" data-camera>\${tx('Take a photo','التقاط صورة')}</button><button class="tm11-btn" data-cancel>\${tx('Cancel','إلغاء')}</button></div></section>\`;
    document.body.append(layer);
    const pick=camera=>{const i=document.createElement('input');i.type='file';i.accept='image/*';if(camera)i.setAttribute('capture','environment');i.onchange=async()=>{if(!i.files?.[0])return;try{const blob=await compress(i.files[0]);await put({id:\`tm11-media-\${t.id}-\${kind==='cover'?'cover':aid}\`,kind:'media',mediaType:kind,tripId:String(t.id),activityId:aid||null,blob,mime:'image/jpeg',updatedAt:new Date().toISOString()});await render();}catch(e){alert(e.message||tx('Could not save photo.','تعذر حفظ الصورة.'));}};i.click();};
    layer.querySelector('[data-gallery]').onclick=()=>{layer.remove();pick(false);};
    layer.querySelector('[data-camera]').onclick=()=>{layer.remove();pick(true);};
    layer.querySelector('[data-cancel]').onclick=()=>layer.remove();
  }`;
  s=s.slice(0,start)+replacement+s.slice(end);write(p,s);
}
async function run(){
  patchPhotoChooser();
  const v12=path.join(www,'v12-ultimate.js');
  let v12js=read(v12);
  v12js=v12js.replace('version:12,exportedAt:', 'version:14,exportedAt:')
    .replace('TravelMate-V12-Full-Backup-', 'TravelMate-V14-Full-Backup-')
    .replace('![10,12].includes(Number(d.version))', '![10,12,14].includes(Number(d.version))');
  v12js=v12js.replace("settings:typeof settings!=='undefined'?settings:{},\n      documents:", "settings:typeof settings!=='undefined'?settings:{},\n      packing:(()=>{try{return JSON.parse(localStorage.getItem('travelmate_v14_packing')||'[]')}catch(_){return []}})(),\n      documents:");
  v12js=v12js.replace("trips=d.trips;expenses=d.expenses;checklist=Array.isArray(d.checklist)?d.checklist:[];", "trips=d.trips;expenses=d.expenses;checklist=Array.isArray(d.checklist)?d.checklist:[];if(Array.isArray(d.packing))localStorage.setItem('travelmate_v14_packing',JSON.stringify(d.packing));");
  write(v12,v12js);
  let html=read(path.join(www,'index.html'));
  const ensure=(needle,tag)=>{if(!html.includes(needle))html=html.replace('</body>',tag+'\n</body>');};
  ensure('src="v11-ultimate.js"','<script src="v11-ultimate.js"></script>');
  ensure('src="v12-ultimate.js"','<script src="v12-ultimate.js"></script>');
  ensure('src="v14-ultimate.js"','<script src="v14-ultimate.js"></script>');
  html=html.replace(/TravelMate V10 Ultimate/g,'TravelMate V14 Ultimate');
  html=html.replace(/travelmate-icon-192\.png/g,'travelmate-v14-192.png');
  html=html.replace(/travelmate-tm-falcon-square\.png/g,'travelmate-v14-icon-square.png');
  write(path.join(www,'index.html'),html);
  await icons();
  const mp=path.join(www,'manifest.webmanifest');if(fs.existsSync(mp)){const m=JSON.parse(read(mp));m.name='TravelMate V14 Ultimate';m.short_name='TravelMate';m.icons=[{src:'travelmate-v14-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'travelmate-v14-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}];write(mp,JSON.stringify(m,null,2));}
  const swp=path.join(www,'sw.js');if(fs.existsSync(swp)){let sw=read(swp).replace(/travelmate-v\d+-shell/g,'travelmate-v14-shell');sw=sw.replace(/const CORE=\[[\s\S]*?\];/,`const CORE=["./","./index.html","./style.css","./v5-upgrade.css","./v6-ultimate.css","./v61-upgrade.css","./v7-ultimate.css","./v10-ultimate.css","./app.js","./v5-upgrade.js","./v5-edit-modal.js","./v6-ultimate.js","./v61-upgrade.js","./v7-ultimate.js","./v71-upgrade.js","./v8-ultimate.js","./v9-ultimate.js","./v10-ultimate.js","./v11-ultimate.js","./v12-ultimate.js","./v14-ultimate.js","./manifest.webmanifest","./travelmate-v14-192.png","./travelmate-v14-512.png","./travelmate-v14-icon-square.png"];`);write(swp,sw);}
  const manifest=path.join(main,'AndroidManifest.xml');let xml=read(manifest);
  if(!xml.includes('android.permission.POST_NOTIFICATIONS'))xml=xml.replace('<application','<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/><application');
  xml=xml.replace(/android:icon="@[^"]+"/,'android:icon="@mipmap/ic_launcher"').replace(/android:roundIcon="@[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');write(manifest,xml);
  const gradle=path.join(root,'android','app','build.gradle');if(fs.existsSync(gradle)){let g=read(gradle).replace(/versionCode\s+\d+/,'versionCode 14').replace(/versionName\s+"[^"]+"/,'versionName "14.0.0"');write(gradle,g);}
  console.log('TravelMate V14 prepared: V11 gallery/camera chooser, V14 features, app assets and native launcher icons.');
}
run().catch(e=>{console.error(e);process.exit(1);});
