const fs=require("fs"),path=require("path"),sharp=require("sharp");
const root=process.cwd(),www=path.join(root,"www"),main=path.join(root,"android","app","src","main");
const R=p=>fs.readFileSync(p,"utf8"),W=(p,s)=>fs.writeFileSync(p,s),mkdir=p=>fs.mkdirSync(p,{recursive:true});

function alphaArt(raw,w,h){
  const out=Buffer.alloc(w*h*4);
  for(let i=0;i<w*h;i++){
    const lum=raw[i*4]*.299+raw[i*4+1]*.587+raw[i*4+2]*.114;
    const a=Math.max(0,Math.min(255,Math.round((255-lum)*1.12*raw[i*4+3]/255)));
    out[i*4]=0;out[i*4+1]=0;out[i*4+2]=0;out[i*4+3]=a;
  }
  return out;
}
async function makeIcons(){
  const src=path.join(www,"travelmate-tm-falcon.png");
  if(!fs.existsSync(src))throw Error("Approved TM falcon artwork is missing.");
  const trimmed=await sharp(src).trim({background:"#fff",threshold:14}).png().toBuffer();
  // The approved artwork is a wide TM/falcon mark. Keep it deliberately small
  // so the full mark survives Android's circular/adaptive launcher masks.
  const legacy=await sharp(trimmed).resize(610,610,{fit:"contain",background:"#fff"}).png().toBuffer();
  const round=await sharp(trimmed).resize(500,500,{fit:"contain",background:"#fff"}).png().toBuffer();
  const square=await sharp({create:{width:1024,height:1024,channels:4,background:"#fff"}})
    .composite([{input:legacy,gravity:"centre"}]).png().toBuffer();
  const roundSquare=await sharp({create:{width:1024,height:1024,channels:4,background:"#fff"}})
    .composite([{input:round,gravity:"centre"}]).png().toBuffer();
  await sharp(square).resize(192,192).png().toFile(path.join(www,"travelmate-v20-192.png"));
  await sharp(square).resize(512,512).png().toFile(path.join(www,"travelmate-v20-512.png"));
  const legacySizes={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
  for(const [d,n] of Object.entries(legacySizes)){
    const dir=path.join(main,"res","mipmap-"+d);mkdir(dir);
    await sharp(square).resize(n,n).png().toFile(path.join(dir,"ic_launcher.png"));
    await sharp(roundSquare).resize(n,n).png().toFile(path.join(dir,"ic_launcher_round.png"));
  }
  const {data,info}=await sharp(trimmed).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const alpha=alphaArt(data,info.width,info.height);
  const mark=await sharp(alpha,{raw:{width:info.width,height:info.height,channels:4}})
    .resize(520,520,{fit:"contain"}).png().toBuffer();
  const fg=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
    .composite([{input:mark,gravity:"centre"}]).png().toBuffer();
  const fgSizes={mdpi:108,hdpi:162,xhdpi:216,xxhdpi:324,xxxhdpi:432};
  for(const [d,n] of Object.entries(fgSizes)){
    const dir=path.join(main,"res","drawable-"+d);mkdir(dir);
    await sharp(fg).resize(n,n).png().toFile(path.join(dir,"ic_launcher_foreground.png"));
    await sharp(fg).resize(n,n).png().toFile(path.join(dir,"ic_launcher_monochrome.png"));
  }
  const nodpi=path.join(main,"res","drawable-nodpi");mkdir(nodpi);
  await sharp(fg).png().toFile(path.join(nodpi,"ic_launcher_foreground.png"));
  await sharp(fg).png().toFile(path.join(nodpi,"ic_launcher_monochrome.png"));
  const ad=path.join(main,"res","mipmap-anydpi-v26");mkdir(ad);
  const xml='<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/><monochrome android:drawable="@drawable/ic_launcher_monochrome"/></adaptive-icon>';
  W(path.join(ad,"ic_launcher.xml"),xml);W(path.join(ad,"ic_launcher_round.xml"),xml);
  const values=path.join(main,"res","values");mkdir(values);
  W(path.join(values,"ic_launcher_background.xml"),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
  const manifest=path.join(main,"AndroidManifest.xml");
  if(!fs.existsSync(manifest))throw Error("AndroidManifest.xml missing after Capacitor add.");
  let m=R(manifest).replace(/android:icon="[^"]+"/,'android:icon="@mipmap/ic_launcher"');
  if(/android:roundIcon="[^"]+"/.test(m))m=m.replace(/android:roundIcon="[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');
  else m=m.replace("<application",'<application android:roundIcon="@mipmap/ic_launcher_round"');
  W(manifest,m);
}

function patchOcr(){
  const p=path.join(www,"v71-upgrade.js");let s=R(p);
  const wa=s.indexOf("  async function getWorker(progress){");
  const wb=s.indexOf("  function parseReceiptText(text){",wa);
  if(wa<0||wb<0)throw Error("Could not locate OCR worker safely in v71-upgrade.js.");
  const worker=`  async function getWorker(progress){
    if(!ocrWorkerPromise){
      ocrWorkerPromise=(async()=>{
        const T=await loadTesseract();
        if(!T?.createWorker)throw new Error("OCR engine unavailable");
        // Best trained models improve Arabic recognition; download once and cache in WebView.
        return T.createWorker("ara+eng",1,{
          langPath:"https://cdn.jsdelivr.net/gh/tesseract-ocr/tessdata_best@main",
          gzip:false,
          logger:m=>{if(m.status==="recognizing text")progress(Math.round((m.progress||0)*100));}
        });
      })().catch(e=>{ocrWorkerPromise=null;throw e;});
    }
    return ocrWorkerPromise;
  }
`;
  s=s.slice(0,wa)+worker+s.slice(wb);
  const pa=s.indexOf("  function parseReceiptText(text){");
  const pb=s.indexOf("  function showReceiptForm(parsed,file){",pa);
  if(pa<0||pb<0)throw Error("Could not locate receipt parser and scanner boundaries safely.");
  const replacement=String.raw`  function v20NormalizeDigits(value){
    return String(value||"")
      .replace(/[٠-٩۰-۹]/g,ch=>({"٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9","۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9"}[ch]))
      .replace(/[٬،]/g,",").replace(/٫/g,".")
      .replace(/[\u200e\u200f\u202a-\u202e]/g,"").replace(/ـ/g,"");
  }
  function normalizeAmount(raw){
    let v=v20NormalizeDigits(raw).replace(/[^\d.,]/g,"");
    if(v.includes(",")&&v.includes("."))v=v.replace(/,/g,"");
    else if(v.includes(","))v=v.replace(/,(?=\d{3}(?:\D|$))/g,"").replace(",",".");
    return v;
  }
  function parseReceiptText(text){
    const clean=v20NormalizeDigits(text);
    const lines=clean.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
    const amountRe=/(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,2})?/g;
    const totalHints=/(?:grand\s*total|total\s*due|amount\s*due|net\s*amount|total|الإجمالي|الاجمالي|الاجمالى|إجمالى|اجمالى|المجموع|المبلغ\s*المستحق|المطلوب\s*دفعه|قيمة\s*الفاتورة|صافى|الصافي|المدفوع|الإجمالي\s*شامل)/i;
    let amount="";
    for(let i=lines.length-1;i>=0&&!amount;i--){
      if(!totalHints.test(lines[i]))continue;
      const candidates=[lines[i],lines[i+1]||"",lines[i+2]||""];
      for(const line of candidates){
        const nums=[...line.matchAll(amountRe)].map(m=>m[0]).filter(v=>Number(normalizeAmount(v))>0);
        if(nums.length){amount=normalizeAmount(nums[nums.length-1]);break;}
      }
    }
    const dateMatch=clean.match(/\b(20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/);
    let date="";
    if(dateMatch){
      const parts=dateMatch[0].replace(/[/.]/g,"-").split("-");
      let y,mo,d;
      if(parts[0].length===4)[y,mo,d]=parts;else[d,mo,y]=parts;
      const mm=Number(mo),dd=Number(d),yy=Number(y);
      if(yy>=2000&&mm>=1&&mm<=12&&dd>=1&&dd<=31)date=yy+"-"+String(mm).padStart(2,"0")+"-"+String(dd).padStart(2,"0");
    }
    const title=lines.find(x=>/[A-Za-z\u0600-\u06FF]/.test(x)&&!totalHints.test(x)&&!/\d{5,}/.test(x))||tx("Scanned receipt","فاتورة ممسوحة");
    const low=clean.toLowerCase();let category="other";
    if(/hotel|room|accommodation|فندق|غرفة|إقامة/.test(low))category="accommodation";
    else if(/restaurant|cafe|coffee|food|مطعم|كافيه|قهوة|طعام/.test(low))category="food";
    else if(/taxi|uber|bus|train|fuel|petrol|بنزين|تاكسى|مواصلات/.test(low))category="transport";
    else if(/pharmacy|hospital|clinic|صيدلية|مستشفى|عيادة/.test(low))category="health";
    else if(/market|supermarket|mall|متجر|سوبر\s*ماركت|تسوق/.test(low))category="shopping";
    return {title,amount,date,category,text:String(text||"")};
  }
  async function v20ImageVariants(file){
    const url=URL.createObjectURL(file);
    try{
      const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(tx("Could not open image","تعذر فتح الصورة")));im.src=url;});
      const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
      if(!iw||!ih)throw new Error("Invalid image dimensions");
      const scale=Math.min(2.8,3200/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
      const canvas=document.createElement("canvas");canvas.width=w;canvas.height=h;
      const ctx=canvas.getContext("2d",{willReadFrequently:true});if(!ctx)throw new Error("Canvas unavailable");
      const toBlob=()=>new Promise((ok,no)=>canvas.toBlob(b=>b?ok(b):no(new Error("Image processing failed")),"image/png"));
      // 1) Original color image, enlarged without destroying fine Arabic dots.
      ctx.filter="none";ctx.drawImage(img,0,0,w,h);const original=await toBlob();
      // 2) Grayscale with moderate contrast.
      ctx.fillStyle="#fff";ctx.fillRect(0,0,w,h);ctx.filter="grayscale(1) contrast(1.35) brightness(1.04)";ctx.drawImage(img,0,0,w,h);ctx.filter="none";const gray=await toBlob();
      // 3) Otsu threshold: adaptive to the actual paper/ink brightness.
      const pixels=ctx.getImageData(0,0,w,h),d=pixels.data,hist=new Array(256).fill(0);let total=0,sum=0;
      for(let i=0;i<d.length;i+=4){const v=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);hist[v]++;sum+=v;total++;}
      let sumB=0,wB=0,max=-1,threshold=175;
      for(let t=0;t<256;t++){wB+=hist[t];if(!wB)continue;const wF=total-wB;if(!wF)break;sumB+=t*hist[t];const mB=sumB/wB,mF=(sum-sumB)/wF,between=wB*wF*(mB-mF)*(mB-mF);if(between>max){max=between;threshold=t;}}
      for(let i=0;i<d.length;i+=4){const v=(.299*d[i]+.587*d[i+1]+.114*d[i+2])>threshold?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
      ctx.putImageData(pixels,0,0);const binary=await toBlob();
      return [original,gray,binary];
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
      button.disabled=true;status.textContent=tx("Loading high-accuracy Arabic OCR…","جارٍ تحميل نموذج القراءة العربية المحسّن…");
      try{
        const worker=await getWorker(p=>{bar.style.width=p+"%";status.textContent=tx("Reading invoice","جارٍ قراءة الفاتورة")+": "+p+"%";});
        const variants=await v20ImageVariants(file),modes=["6","11"];let best={text:"",confidence:0,score:-1},pass=0;
        for(const imgVariant of variants){
          for(const mode of modes){
            try{await worker.setParameters({tessedit_pageseg_mode:mode,preserve_interword_spaces:"1",user_defined_dpi:"300"});}catch(_){}
            const result=await worker.recognize(imgVariant),txt=result?.data?.text||"",confidence=Number(result?.data?.confidence)||0;
            const arabic=(txt.match(/[\u0600-\u06FF]/g)||[]).length;
            const score=confidence+Math.min(18,txt.trim().length/35)+Math.min(8,arabic/12);
            if(txt.trim()&&score>best.score)best={text:txt,confidence,score};
            pass++;bar.style.width=Math.round(pass/6*100)+"%";
          }
        }
        const raw=best.text||"";
        root.querySelector(".v71-panel").innerHTML=\`<div class="v71-row"><h2>\${tx("Recognized text review","مراجعة النص المستخرج")}</h2><button type="button" class="v71-btn" data-v71-close>\${tx("Close","إغلاق")}</button></div>
          <p class="v71-muted">\${tx("The full text is editable. Check the amount and date before saving; missing values are left blank rather than guessed.","النص قابل للتعديل. راجع المبلغ والتاريخ قبل الحفظ؛ لن نخمن أي قيمة غير واضحة.")}</p>
          <p class="v71-muted">\${tx("OCR confidence","درجة ثقة القراءة")}: \${Math.max(0,Math.round(best.confidence))}%</p>
          <textarea id="v20-ocr-raw" dir="auto" rows="11" style="width:100%;box-sizing:border-box;min-height:210px;padding:12px;border:1px solid var(--border);border-radius:12px;background:var(--bg);color:var(--text);font:inherit;line-height:1.8;white-space:pre-wrap">\${esc(raw)}</textarea>
          <div class="v71-actions" style="margin-top:12px"><button type="button" class="v71-btn primary" id="v20-ocr-continue">\${tx("Extract details","استخراج البيانات")}</button><button type="button" class="v71-btn" id="v20-ocr-manual">\${tx("Enter manually","إدخال يدوي")}</button></div>\`;
        root.querySelector("[data-v71-close]").addEventListener("click",()=>URL.revokeObjectURL(url));
        root.querySelector("#v20-ocr-continue").onclick=()=>{
          const corrected=root.querySelector("#v20-ocr-raw").value;
          const parsed=parseReceiptText(corrected);parsed.text=corrected;parsed.confidence=Math.max(0,Math.round(best.confidence));
          root.remove();URL.revokeObjectURL(url);showReceiptForm(parsed,file);
        };
        root.querySelector("#v20-ocr-manual").onclick=()=>{root.remove();URL.revokeObjectURL(url);showReceiptForm({title:"",amount:"",date:"",category:"other",text:raw,confidence:0},file);};
      }catch(e){button.disabled=false;status.textContent=e?.message||tx("Could not read this image. Enter details manually.","تعذرت قراءة الصورة. أدخل البيانات يدويًا.");}
    };
    root.querySelector("#v71-manual").onclick=()=>{root.remove();URL.revokeObjectURL(url);showReceiptForm({title:"",amount:"",date:"",category:"other",text:"",confidence:0},file);};
  }
`;
  s=s.slice(0,pa)+replacement+s.slice(pb);
  W(p,s);
}

function patchShell(){
  const index=path.join(www,"index.html");let html=R(index);
  html=html.replace(/TravelMate V\d+[^<]*/g,"TravelMate V20");
  W(index,html);
  const sw=path.join(www,"sw.js");
  if(fs.existsSync(sw)){
    let x=R(sw).replace(/travelmate-v\d+-shell/g,"travelmate-v20-shell");
    if(!x.includes('"./travelmate-v20-192.png"'))x=x.replace(/(const CORE=\[[\s\S]*?)(\];)/,'$1,"./travelmate-v20-192.png","./travelmate-v20-512.png"$2');
    W(sw,x);
  }
  const mp=path.join(www,"manifest.webmanifest");
  if(fs.existsSync(mp)){const m=JSON.parse(R(mp));m.name="TravelMate V20";m.short_name="TravelMate";m.icons=[{src:"travelmate-v20-192.png",sizes:"192x192",type:"image/png",purpose:"any"},{src:"travelmate-v20-512.png",sizes:"512x512",type:"image/png",purpose:"any maskable"}];W(mp,JSON.stringify(m,null,2));}
}
async function run(){
  patchOcr();patchShell();await makeIcons();
  const gradle=path.join(root,"android","app","build.gradle");
  if(fs.existsSync(gradle)){let g=R(gradle).replace(/versionCode\s+\d+/,"versionCode 20").replace(/versionName\s+"[^"]+"/,'versionName "20.0.0"');W(gradle,g);}
  console.log("V20 prepared: launcher-safe full mark and higher-quality editable Arabic OCR.");
}
run().catch(e=>{console.error(e.stack||e);process.exit(1);});
