const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=process.cwd(),www=path.join(root,'www'),main=path.join(root,'android','app','src','main');
const R=p=>fs.readFileSync(p,'utf8'),W=(p,s)=>fs.writeFileSync(p,s),mkdir=p=>fs.mkdirSync(p,{recursive:true});

async function rebuildLauncher(){
  const src=path.join(www,'travelmate-tm-falcon.png');
  if(!fs.existsSync(src))throw Error('Approved falcon artwork is missing.');
  const trimmed=await sharp(src).trim({background:'#fff',threshold:12}).png().toBuffer();
  const square=path.join(www,'travelmate-v17-icon.png');
  const mark=await sharp(trimmed).resize(850,850,{fit:'contain',background:{r:255,g:255,b:255,alpha:1}}).png().toBuffer();
  await sharp({create:{width:1024,height:1024,channels:4,background:'#fff'}}).composite([{input:mark,gravity:'centre'}]).png().toFile(square);
  for(const size of [192,512])await sharp(square).resize(size,size).png().toFile(path.join(www,`travelmate-v17-${size}.png`));

  const {data,info}=await sharp(trimmed).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=Buffer.alloc(info.width*info.height*4);
  for(let i=0;i<info.width*info.height;i++){
    const r=data[i*4],g=data[i*4+1],b=data[i*4+2],a=data[i*4+3];
    const lum=.299*r+.587*g+.114*b;
    alpha[i*4]=0;alpha[i*4+1]=0;alpha[i*4+2]=0;
    alpha[i*4+3]=Math.round(Math.max(0,Math.min(255,(248-lum)*1.4))*a/255);
  }
  const fg=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:await sharp(alpha,{raw:{width:info.width,height:info.height,channels:4}}).resize(700,700,{fit:'contain'}).png().toBuffer(),gravity:'centre'}]).png().toBuffer();
  const nodpi=path.join(main,'res','drawable-nodpi');mkdir(nodpi);
  await sharp(fg).png().toFile(path.join(nodpi,'ic_launcher_foreground.png'));
  await sharp(fg).png().toFile(path.join(nodpi,'ic_launcher_monochrome.png'));
  mkdir(path.join(main,'res','mipmap-anydpi-v26'));
  const adaptive='<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_monochrome"/></adaptive-icon>';
  W(path.join(main,'res','mipmap-anydpi-v26','ic_launcher.xml'),adaptive);
  W(path.join(main,'res','mipmap-anydpi-v26','ic_launcher_round.xml'),adaptive);
  mkdir(path.join(main,'res','values'));
  W(path.join(main,'res','values','ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
  const densities={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
  for(const [d,n] of Object.entries(densities)){
    const dir=path.join(main,'res',`mipmap-${d}`);mkdir(dir);
    await sharp(square).resize(n,n).png().toFile(path.join(dir,'ic_launcher.png'));
    await sharp(square).resize(n,n).png().toFile(path.join(dir,'ic_launcher_round.png'));
  }
  const manifest=path.join(main,'AndroidManifest.xml');
  let xml=R(manifest).replace(/android:icon="@[^"]+"/,'android:icon="@mipmap/ic_launcher"');
  if(/android:roundIcon="@[^"]+"/.test(xml))xml=xml.replace(/android:roundIcon="@[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');
  else xml=xml.replace('<application','<application android:roundIcon="@mipmap/ic_launcher_round"');
  W(manifest,xml);
}
function fixVisibleSlashN(){
  const p=path.join(www,'index.html');let html=R(p);
  html=html.replace(/\\n(?=\s*<div id="tm16-splash")/g,'\n');
  html=html.replace(/\\n(?=\s*<\/body>)/g,'\n');
  html=html.replace(/\\n(?=\s*<script>window\.dispatchEvent)/g,'\n');
  html=html.replace(/TravelMate V15/g,'TravelMate V17');
  W(p,html);
  const dash=path.join(www,'v15-ultimate.js');
  if(fs.existsSync(dash)){let d=R(dash).replace('<small>V15</small>','<small>V17</small>');W(dash,d);}
  const mp=path.join(www,'manifest.webmanifest');
  if(fs.existsSync(mp)){const m=JSON.parse(R(mp));m.name='TravelMate V17';m.short_name='TravelMate';m.icons=[{src:'travelmate-v17-192.png',sizes:'192x192',type:'image/png',purpose:'any'},{src:'travelmate-v17-512.png',sizes:'512x512',type:'image/png',purpose:'any maskable'}];W(mp,JSON.stringify(m,null,2));}
  const sw=path.join(www,'sw.js');
  if(fs.existsSync(sw)){let x=R(sw).replace(/travelmate-v\d+-shell/g,'travelmate-v17-shell');if(!x.includes('./travelmate-v17-512.png'))x=x.replace(/(const CORE=\[[\s\S]*?)(\];)/,'$1,"./travelmate-v17-192.png","./travelmate-v17-512.png"$2');W(sw,x);}
}
function improveArabicOCR(){
  const p=path.join(www,'v71-upgrade.js');let s=R(p);
  const a=s.indexOf('  async function getWorker(progress){');
  const b=s.indexOf('  function parseReceiptText(text){',a);
  if(a<0||b<0)throw Error('Could not locate OCR worker section safely.');
  const worker=`  async function getWorker(progress){
    if(!ocrWorkerPromise){
      ocrWorkerPromise=(async()=>{
        const T=await loadTesseract();
        if(!T?.createWorker)throw new Error("OCR engine unavailable");
        return T.createWorker("ara+eng",1,{logger:m=>{
          if(m.status==="recognizing text")progress(Math.round((m.progress||0)*100));
        }});
      })().catch(e=>{ocrWorkerPromise=null;throw e;});
    }
    return ocrWorkerPromise;
  }
  async function makeReceiptVariants(file){
    const bitmap=await createImageBitmap(file);
    const scale=Math.max(1,Math.min(2.4,2600/Math.max(bitmap.width,bitmap.height)));
    const w=Math.round(bitmap.width*scale);
    const h=Math.round(bitmap.height*scale);
    const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{willReadFrequently:true});
    ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);
    ctx.filter="grayscale(1) contrast(1.65) brightness(1.08)";
    ctx.drawImage(bitmap,0,0,w,h);ctx.filter="none";bitmap.close?.();
    const enhanced=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error("Image enhancement failed")),"image/png"));
    const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
    for(let i=0;i<d.length;i+=4){
      const lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      const v=lum>174?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
    ctx.putImageData(pixels,0,0);
    const binary=await new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(Error("Image thresholding failed")),"image/png"));
    return [enhanced,binary];
  }
`;
  s=s.slice(0,a)+worker+s.slice(b);
  const scanA=s.indexOf('  async function startScan(file){');
  const scanB=s.indexOf('  function showReceiptForm(parsed,file){',scanA);
  if(scanA<0||scanB<0)throw Error('Could not locate receipt scan function safely.');
  const scan=`  async function startScan(file){
    if(!file.type.startsWith("image/")){alert(tx("Please choose an image file.","يرجى اختيار ملف صورة."));return;}
    selectedImage=file;selectedFileName=file.name||"receipt-image";
    const url=URL.createObjectURL(file);
    const root=overlay(tx("Scan receipt","مسح فاتورة"),\`<img class="v71-preview" id="v71-image-preview" src="\${url}" alt="Receipt preview"><p id="v71-ocr-status" class="v71-muted">\${tx("Ready to read the image.","الصورة جاهزة للقراءة.")}</p><div class="v71-progress"><i id="v71-ocr-progress"></i></div><div class="v71-actions" style="margin-top:12px"><button type="button" class="v71-btn primary" id="v71-run-ocr">✨ \${tx("Read invoice automatically","قراءة الفاتورة تلقائيًا")}</button><button type="button" class="v71-btn" id="v71-manual">\${tx("Enter details manually","إدخال البيانات يدويًا")}</button></div>\`);
    root.querySelector("[data-v71-close]").addEventListener("click",()=>URL.revokeObjectURL(url));
    root.querySelector("#v71-run-ocr").onclick=async()=>{
      const status=root.querySelector("#v71-ocr-status"),bar=root.querySelector("#v71-ocr-progress"),button=root.querySelector("#v71-run-ocr");
      button.disabled=true;status.textContent=tx("Enhancing image and loading Arabic OCR…","جارٍ تحسين الصورة وتحميل قارئ العربية…");
      try{
        const worker=await getWorker(p=>{bar.style.width=p+"%";status.textContent=tx("Reading receipt","جارٍ قراءة الفاتورة")+": "+p+"%";});
        const variants=await makeReceiptVariants(file);let best=null;
        const modes=["6","11"];
        for(let i=0;i<variants.length;i++){
          for(const mode of modes){
            await worker.setParameters({tessedit_pageseg_mode:mode,preserve_interword_spaces:"1",user_defined_dpi:"300"});
            const result=await worker.recognize(variants[i]);
            const confidence=Number(result.data.confidence)||0;
            if(!best||confidence>best.confidence)best={text:result.data.text||"",confidence};
          }
          bar.style.width=Math.round((i+1)/variants.length*100)+"%";
        }
        const parsed=parseReceiptText(best?.text||"");
        parsed.confidence=Math.round(best?.confidence||0);
        root.remove();URL.revokeObjectURL(url);showReceiptForm(parsed,file);
      }catch(e){button.disabled=false;status.textContent=e.message||tx("Could not read this image. Enter details manually.","تعذرت قراءة الصورة. أدخل البيانات يدويًا.");}
    };
    root.querySelector("#v71-manual").onclick=()=>{root.remove();URL.revokeObjectURL(url);showReceiptForm({title:"",amount:"",date:today(),category:"other",text:"",confidence:0},file);};
  }
`;
  s=s.slice(0,scanA)+scan+s.slice(scanB);
  const note='OCR suggestions may contain mistakes. Check every field before saving.';
  const noteAr='قد تحتوي القراءة التلقائية على أخطاء؛ راجع كل البيانات قبل الحفظ.';
  s=s.replace(note+'","'+noteAr+'"',
    note+' Confidence: ${Number(parsed.confidence)||0}%. Arabic handwriting may need manual correction.","'+noteAr+' درجة الثقة: ${Number(parsed.confidence)||0}٪. قد تحتاج الكتابة اليدوية إلى تصحيح يدوي."');
  W(p,s);
}
async function run(){
  rebuildLauncher();
  fixVisibleSlashN();
  improveArabicOCR();
  const gradle=path.join(root,'android','app','build.gradle');
  if(fs.existsSync(gradle))W(gradle,R(gradle).replace(/versionCode\\s+\\d+/,'versionCode 17').replace(/versionName\\s+"[^"]+"/,'versionName "17.0.0"'));
  console.log('TravelMate V17: launcher resources, literal slash-n cleanup, enhanced Arabic receipt OCR.');
}
run().catch(e=>{console.error(e.stack||e);process.exit(1);});
