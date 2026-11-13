const fs=require("fs"),path=require("path"),sharp=require("sharp");
const root=process.cwd(),www=path.join(root,"www"),main=path.join(root,"android","app","src","main");
const R=p=>fs.readFileSync(p,"utf8"),W=(p,s)=>fs.writeFileSync(p,s),mkdir=p=>fs.mkdirSync(p,{recursive:true});

function alphaArt(raw,w,h){
  const out=Buffer.alloc(w*h*4);
  for(let i=0;i<w*h;i++){
    const lum=raw[i*4]*.299+raw[i*4+1]*.587+raw[i*4+2]*.114;
    const srcA=raw[i*4+3],a=Math.max(0,Math.min(255,Math.round((255-lum)*1.15*srcA/255)));
    out[i*4]=12;out[i*4+1]=18;out[i*4+2]=28;out[i*4+3]=a;
  }
  return out;
}
async function makeLauncher(){
  const src=path.join(www,"travelmate-tm-falcon.png");
  if(!fs.existsSync(src))throw Error("Approved falcon artwork missing: www/travelmate-tm-falcon.png");
  const trimmed=await sharp(src).trim({background:"#fff",threshold:14}).png().toBuffer();
  const legacyMark=await sharp(trimmed).resize(820,820,{fit:"contain",background:"#fff"}).png().toBuffer();
  const square=await sharp({create:{width:1024,height:1024,channels:4,background:"#fff"}})
    .composite([{input:legacyMark,gravity:"centre"}]).png().toBuffer();
  await sharp(square).resize(192,192).png().toFile(path.join(www,"travelmate-v19-192.png"));
  await sharp(square).resize(512,512).png().toFile(path.join(www,"travelmate-v19-512.png"));
  for(const [density,size] of Object.entries({mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192})){
    const dir=path.join(main,"res","mipmap-"+density);mkdir(dir);
    await sharp(square).resize(size,size).png().toFile(path.join(dir,"ic_launcher.png"));
    await sharp(square).resize(size,size).png().toFile(path.join(dir,"ic_launcher_round.png"));
  }
  const {data,info}=await sharp(trimmed).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=alphaArt(data,info.width,info.height);
  const fgMark=await sharp(alpha,{raw:{width:info.width,height:info.height,channels:4}})
    .resize(650,650,{fit:"contain"}).png().toBuffer();
  const fg=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:fgMark,gravity:"centre"}]).png().toBuffer();
  for(const [density,size] of Object.entries({mdpi:108,hdpi:162,xhdpi:216,xxhdpi:324,xxxhdpi:432})){
    const dir=path.join(main,"res","drawable-"+density);mkdir(dir);
    await sharp(fg).resize(size,size).png().toFile(path.join(dir,"ic_launcher_foreground.png"));
    await sharp(fg).resize(size,size).png().toFile(path.join(dir,"ic_launcher_monochrome.png"));
  }
  const ad=path.join(main,"res","mipmap-anydpi-v26");mkdir(ad);
  const xml='<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_monochrome"/></adaptive-icon>';
  W(path.join(ad,"ic_launcher.xml"),xml);W(path.join(ad,"ic_launcher_round.xml"),xml);
  const vals=path.join(main,"res","values");mkdir(vals);
  W(path.join(vals,"ic_launcher_background.xml"),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
  const manifest=path.join(main,"AndroidManifest.xml");
  if(!fs.existsSync(manifest))throw Error("AndroidManifest.xml missing");
  let m=R(manifest).replace(/android:icon="[^"]+"/,'android:icon="@mipmap/ic_launcher"');
  if(/android:roundIcon="[^"]+"/.test(m))m=m.replace(/android:roundIcon="[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');
  else m=m.replace("<application",'<application android:roundIcon="@mipmap/ic_launcher_round"');
  W(manifest,m);
}

function patchReceiptScanner(){
  const p=path.join(www,"v71-upgrade.js");let s=R(p);
  const a=s.indexOf("  async function startScan(file){"),b=s.indexOf("  function showReceiptForm(parsed,file){",a);
  if(a<0||b<0)throw Error("Cannot safely locate receipt scanner boundaries in v71-upgrade.js");
  const scanner=`  async function v19ImageVariants(file){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(tx("Could not open image","تعذر فتح الصورة")));im.src=url;});
      const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
      if(!iw||!ih)throw new Error("Invalid image dimensions");
      const scale=Math.min(2.6,2800/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
      const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas unavailable");
      ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.filter="grayscale(1) contrast(1.55) brightness(1.08)";ctx.drawImage(img,0,0,w,h);ctx.filter="none";
      const enhanced=await new Promise((ok,no)=>canvas.toBlob(v=>v?ok(v):no(new Error("Image conversion failed")),"image/png"));
      const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
      for(let i=0;i<d.length;i+=4){const lum=.299*d[i]+.587*d[i+1]+.114*d[i+2],v=lum>178?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
      ctx.putImageData(pixels,0,0);
      const binary=await new Promise((ok,no)=>canvas.toBlob(v=>v?ok(v):no(new Error("Threshold conversion failed")),"image/png"));
      return [enhanced,binary];
    }finally{URL.revokeObjectURL(url);}
  }
  async function startScan(file){
    if(!file.type.startsWith("image/")){alert(tx("Please choose an image file.","يرجى اختيار ملف صورة."));return;}
    selectedImage=file;selectedFileName=file.name||"receipt-image";
    const url=URL.createObjectURL(file);
    const root=overlay(tx("Scan receipt","مسح فاتورة"),\`<img class="v71-preview" id="v71-image-preview" src="\${url}" alt="Receipt preview"><p id="v71-ocr-status" class="v71-muted">\${tx("Ready to read the image.","الصورة جاهزة للقراءة.")}</p><div class="v71-progress"><i id="v71-ocr-progress"></i></div><div class="v71-actions" style="margin-top:12px"><button type="button" class="v71-btn primary" id="v71-run-ocr">✨ \${tx("Read invoice automatically","قراءة الفاتورة تلقائيًا")}</button><button type="button" class="v71-btn" id="v71-manual">\${tx("Enter details manually","إدخال البيانات يدويًا")}</button></div>\`);
    root.querySelector("[data-v71-close]").addEventListener("click",()=>URL.revokeObjectURL(url));
    root.querySelector("#v71-run-ocr").onclick=async()=>{
      const status=root.querySelector("#v71-ocr-status"),bar=root.querySelector("#v71-ocr-progress"),button=root.querySelector("#v71-run-ocr");
      button.disabled=true;status.textContent=tx("Preparing image and loading Arabic OCR…","جارٍ تجهيز الصورة وتحميل قارئ العربية…");
      try{
        const worker=await getWorker(p=>{bar.style.width=p+"%";status.textContent=tx("Reading invoice","جارٍ قراءة الفاتورة")+": "+p+"%";});
        const variants=await v19ImageVariants(file);let best={text:"",confidence:-1};let pass=0;
        for(const image of variants){
          for(const mode of ["6","11"]){
            try{if(worker.setParameters)await worker.setParameters({tessedit_pageseg_mode:mode,preserve_interword_spaces:"1",user_defined_dpi:"300"});}catch(_){}
            const result=await worker.recognize(image),textValue=result?.data?.text||"",confidence=Number(result?.data?.confidence)||0;
            const quality=confidence+Math.min(15,textValue.trim().length/80);
            if(textValue.trim()&&quality>(best.quality??-1))best={text:textValue,confidence,quality};
            pass++;bar.style.width=Math.round(pass/4*100)+"%";
          }
        }
        const raw=best.text||"";
        root.querySelector(".v71-panel").innerHTML=\`<div class="v71-row"><h2>\${tx("Recognized text review","مراجعة النص المستخرج")}</h2><button type="button" class="v71-btn" data-v71-close>\${tx("Close","إغلاق")}</button></div>
          <p class="v71-muted">\${tx("Check the Arabic text before extracting amount and date. You can correct it here.","راجع النص العربي قبل استخراج المبلغ والتاريخ، ويمكنك تصحيحه هنا.")}</p>
          <p class="v71-muted">\${tx("OCR confidence","درجة ثقة القراءة")}: \${Math.max(0,Math.round(best.confidence))}%</p>
          <textarea id="v19-ocr-raw" dir="auto" rows="10" style="width:100%;box-sizing:border-box;min-height:190px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);font:inherit;line-height:1.7;white-space:pre-wrap">\${esc(raw)}</textarea>
          <div class="v71-actions" style="margin-top:12px"><button type="button" class="v71-btn primary" id="v19-ocr-continue">\${tx("Extract details","استخراج البيانات")}</button><button type="button" class="v71-btn" id="v19-ocr-manual">\${tx("Enter manually","إدخال يدوي")}</button></div>\`;
        root.querySelector("#v19-ocr-continue").onclick=()=>{
          const corrected=root.querySelector("#v19-ocr-raw").value;
          const parsed=parseReceiptText(corrected);parsed.text=corrected;parsed.confidence=Math.max(0,Math.round(best.confidence));
          root.remove();URL.revokeObjectURL(url);showReceiptForm(parsed,file);
        };
        root.querySelector("#v19-ocr-manual").onclick=()=>{root.remove();URL.revokeObjectURL(url);showReceiptForm({title:"",amount:"",date:today(),category:"other",text:raw,confidence:0},file);};
      }catch(e){button.disabled=false;status.textContent=e?.message||tx("Could not read this image. Enter details manually.","تعذرت قراءة الصورة. أدخل البيانات يدويًا.");}
    };
    root.querySelector("#v71-manual").onclick=()=>{root.remove();URL.revokeObjectURL(url);showReceiptForm({title:"",amount:"",date:today(),category:"other",text:"",confidence:0},file);};
  }
`;
  s=s.slice(0,a)+scanner+s.slice(b);
  // Never guess the highest number on a receipt when no total label was recognized.
  const fallbackStart=s.indexOf("    if(!amount){const all=[...text.matchAll(amountPattern)]");
  if(fallbackStart>=0){
    const fallbackEnd=s.indexOf("    const dateMatch=",fallbackStart);
    if(fallbackEnd<0)throw Error("Could not safely remove fallback amount guess");
    s=s.slice(0,fallbackStart)+s.slice(fallbackEnd);
  }
  W(p,s);
}
function patchWebShell(){
  const index=path.join(www,"index.html");let html=R(index);
  html=html.replace(/TravelMate V\\d+[^<]*/g,"TravelMate V19 Deep Fix");
  W(index,html);
  const sw=path.join(www,"sw.js");if(fs.existsSync(sw)){
    let x=R(sw).replace(/travelmate-v\\d+-shell/g,"travelmate-v19-shell");
    if(!x.includes('"./travelmate-v19-192.png"'))x=x.replace(/(const CORE=\[[\s\S]*?)(\];)/,'$1,"./travelmate-v19-192.png","./travelmate-v19-512.png"$2');
    W(sw,x);
  }
  const mp=path.join(www,"manifest.webmanifest");
  if(fs.existsSync(mp)){const m=JSON.parse(R(mp));m.name="TravelMate V19";m.short_name="TravelMate";m.icons=[{src:"travelmate-v19-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"travelmate-v19-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}];W(mp,JSON.stringify(m,null,2));}
}
async function run(){
  patchReceiptScanner();
  patchWebShell();
  await makeLauncher();
  const gradle=path.join(root,"android","app","build.gradle");
  if(fs.existsSync(gradle)){let g=R(gradle);g=g.replace(/versionCode\\s+\\d+/,"versionCode 19").replace(/versionName\\s+"[^"]+"/,'versionName "19.0.0"');W(gradle,g);}
  console.log("V19 preparation completed: verified launcher resources and editable OCR text review.");
}
run().catch(e=>{console.error(e.stack||e);process.exit(1);});
