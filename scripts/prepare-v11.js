const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=process.cwd(),www=path.join(root,'www'),logo=path.join(www,'travelmate-tm-falcon.png'),main=path.join(root,'android/app/src/main');
const mkdir=p=>fs.mkdirSync(p,{recursive:true});
async function make(size,out,background='#ffffff'){mkdir(path.dirname(out));await sharp(logo).resize(size,size,{fit:'contain',background}).png().toFile(out);}
async function run(){
 if(!fs.existsSync(logo))throw Error('Missing TM Falcon logo in www');
 const res=path.join(main,'res'),dens={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
 for(const [d,s] of Object.entries(dens)){await make(s,path.join(res,`mipmap-${d}/ic_launcher.png`));await make(s,path.join(res,`mipmap-${d}/ic_launcher_round.png`));}
 await make(432,path.join(res,'drawable/ic_launcher_foreground.png'));
 mkdir(path.join(res,'mipmap-anydpi-v26'));
 fs.writeFileSync(path.join(res,'mipmap-anydpi-v26/ic_launcher.xml'),`<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>`);
 mkdir(path.join(res,'values'));fs.writeFileSync(path.join(res,'values/ic_launcher_background.xml'),'<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');
 const mf=path.join(main,'AndroidManifest.xml');let x=fs.readFileSync(mf,'utf8');if(!x.includes('android.permission.POST_NOTIFICATIONS'))x=x.replace('<application','<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/><application');x=x.replace(/android:icon="@[^"]+"/,'android:icon="@mipmap/ic_launcher"');fs.writeFileSync(mf,x);
 const gradle=path.join(root,'android/app/build.gradle');if(fs.existsSync(gradle)){let g=fs.readFileSync(gradle,'utf8').replace(/versionCode\s+\d+/,'versionCode 11').replace(/versionName\\s+"[^"]+"/,'versionName "11.0.0"');fs.writeFileSync(gradle,g);}
 const index=path.join(www,'index.html');let h=fs.readFileSync(index,'utf8');if(!h.includes('v11-ultimate.js'))h=h.replace('</body>','<script src="v11-ultimate.js"></script></body>');h=h.replace(/travelmate-icon-192\.png/g,'travelmate-tm-falcon.png');fs.writeFileSync(index,h);
 const sw=path.join(www,'sw.js');let s=fs.readFileSync(sw,'utf8').replace(/travelmate-v10-shell/g,'travelmate-v11-shell');if(!s.includes('./v11-ultimate.js'))s=s.replace('./v10-ultimate.js','./v10-ultimate.js","./v11-ultimate.js","./travelmate-tm-falcon.png');fs.writeFileSync(sw,s);
 console.log('V11 native launcher assets and web layer prepared.');
}
run().catch(e=>{console.error(e);process.exit(1);});