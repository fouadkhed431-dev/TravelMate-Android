const fs=require("fs"),path=require("path"),sharp=require("sharp");
const root=process.cwd(),www=path.join(root,"www"),main=path.join(root,"android","app","src","main");
const read=p=>fs.readFileSync(p,"utf8"),write=(p,s)=>fs.writeFileSync(p,s),mkdir=p=>fs.mkdirSync(p,{recursive:true});

async function icon(){
 const src=path.join(www,"travelmate-tm-falcon.png");
 if(!fs.existsSync(src))throw Error("Missing approved falcon artwork: "+src);
 const tile=await sharp({create:{width:1024,height:1024,channels:3,background:"#FFFFFF"}})
  .composite([{input:await sharp(src).rotate().flatten({background:"#FFFFFF"}).resize(760,760,{fit:"contain",background:"#FFFFFF"}).png().toBuffer(),gravity:"centre"}]).png().toBuffer();
 const res=path.join(main,"res"),dens={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
 for(const [d,n] of Object.entries(dens)){
  const dir=path.join(res,"mipmap-"+d);mkdir(dir);
  await sharp(tile).resize(n,n).png().toFile(path.join(dir,"ic_launcher.png"));
  await sharp(tile).resize(n,n).png().toFile(path.join(dir,"ic_launcher_round.png"));
 }
 const fg=await sharp({create:{width:1024,height:1024,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
  .composite([{input:await sharp(src).rotate().flatten({background:"#FFFFFF"}).resize(620,620,{fit:"contain",background:"#FFFFFF"}).png().toBuffer(),gravity:"centre"}]).png().toBuffer();
 const nd=path.join(res,"drawable-nodpi");mkdir(nd);await sharp(fg).png().toFile(path.join(nd,"ic_launcher_foreground.png"));
 const ad=path.join(res,"mipmap-anydpi-v26");mkdir(ad);
 const xml='<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>';
 write(path.join(ad,"ic_launcher.xml"),xml);write(path.join(ad,"ic_launcher_round.xml"),xml);
 const vals=path.join(res,"values");mkdir(vals);write(path.join(vals,"ic_launcher_background.xml"),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
 const mf=path.join(main,"AndroidManifest.xml");if(!fs.existsSync(mf))throw Error("AndroidManifest.xml missing");
 let m=read(mf);
 m=m.replace(/android:icon="[^"]+"/,'android:icon="@mipmap/ic_launcher"');
 if(/android:roundIcon="[^"]+"/.test(m))m=m.replace(/android:roundIcon="[^"]+"/,'android:roundIcon="@mipmap/ic_launcher_round"');
 else m=m.replace("<application", '<application android:roundIcon="@mipmap/ic_launcher_round"');
 write(mf,m);
}

function ocr(){
 const p=path.join(www,"v71-upgrade.js");let s=read(p);
 const anchor="  async function startScan(file){";
 if(!s.includes(anchor))throw Error("Receipt scanner function not found; no OCR changes made.");
 if(!s.includes("async function v18DecodeReceiptImage")){
  const helper=`  async function v18DecodeReceiptImage(file){
   const u=URL.createObjectURL(file);
   try{
    const img=await new Promise((ok,no)=>{const x=new Image();x.onload=()=>ok(x);x.onerror=()=>no(new Error(tx("The image could not be opened. Try JPG or PNG.","تعذر فتح الصورة. جرّب JPG أو PNG.")));x.src=u;});
    const iw=img.naturalWidth||img.width,ih=img.naturalHeight||img.height;
    if(!iw||!ih)throw new Error("Invalid image dimensions");
    const scale=Math.min(2.5,2800/Math.max(iw,ih)),w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(ih*scale));
    const c=document.createElement("canvas");c.width=w;c.height=h;const x=c.getContext("2d",{willReadFrequently:true});
    if(!x)throw new Error("Canvas is unavailable");
    x.fillStyle="#fff";x.fillRect(0,0,w,h);x.filter="grayscale(1) contrast(1.5) brightness(1.08)";x.drawImage(img,0,0,w,h);x.filter="none";
    const enhanced=c.toDataURL("image/png"),im=x.getImageData(0,0,w,h),d=im.data;
    for(let i=0;i<d.length;i+=4){const v=(.299*d[i]+.587*d[i+1]+.114*d[i+2])>176?255:0;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;}
    x.putImageData(im,0,0);return [enhanced,c.toDataURL("image/png")];
   }finally{URL.revokeObjectURL(u);}
  }
`;
  s=s.replace(anchor,helper+anchor);
 }
 const old='const result=await worker.recognize(file);const parsed=parseReceiptText(result.data.text||"");root.remove();URL.revokeObjectURL(url);showReceiptForm(parsed,file);';
 if(!s.includes(old))throw Error("Expected direct OCR call not found; refusing unsafe patch.");
 const rep=`const variants=await v18DecodeReceiptImage(file);let best={text:"",confidence:-1};let pass=0;
        for(const imageData of variants){for(const mode of ["6","11"]){
         if(worker.setParameters)await worker.setParameters({tessedit_pageseg_mode:mode,preserve_interword_spaces:"1",user_defined_dpi:"300"});
         const result=await worker.recognize(imageData),confidence=Number(result?.data?.confidence)||0,txt=result?.data?.text||"";
         if(txt.trim()&&confidence>best.confidence)best={text:txt,confidence};
         pass++;bar.style.width=Math.round(pass/4*100)+"%";
        }}
        const parsed=parseReceiptText(best.text||"");parsed.confidence=Math.max(0,Math.round(best.confidence));
        root.remove();URL.revokeObjectURL(url);showReceiptForm(parsed,file);`;
 s=s.replace(old,rep);
 s=s.replace('Loading Arabic and English OCR data…','Preparing image for Arabic and English OCR…')
  .replace('جارٍ تحميل بيانات التعرف على العربية والإنجليزية…','جارٍ تجهيز الصورة للتعرف على العربية والإنجليزية…');
 write(p,s);
}

async function runV18(){
 ocr();await icon();
 const gp=path.join(root,"android","app","build.gradle");if(!fs.existsSync(gp))throw Error("app/build.gradle missing");
 let g=read(gp);if(!/versionCode\s+\d+/.test(g))throw Error("versionCode missing");
 g=g.replace(/versionCode\s+\d+/,"versionCode 18").replace(/versionName\s+"[^"]+"/,'versionName "18.0.0"');write(gp,g);
 const sw=path.join(www,"sw.js");if(fs.existsSync(sw))write(sw,read(sw).replace(/travelmate-v\d+-shell/g,"travelmate-v18-shell"));
 console.log("V18 preparation completed.");
}
runV18().catch(e=>{console.error(e.stack||e);process.exit(1);});
