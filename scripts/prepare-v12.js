const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const www = path.join(root, 'www');
const androidMain = path.join(root, 'android', 'app', 'src', 'main');
const sourceLogo = path.join(www, 'travelmate-tm-falcon.png');
const squareLogo = path.join(www, 'travelmate-tm-falcon-square.png');
const mkdir = p => fs.mkdirSync(p, { recursive: true });

async function buildSquareLogo() {
  if (!fs.existsSync(sourceLogo)) throw new Error('Missing approved TM Falcon artwork: www/travelmate-tm-falcon.png');
  // Trim the white canvas, then keep the entire TM/Falcon mark inside Android's adaptive-icon safe area.
  const trimmed = await sharp(sourceLogo).trim({ background: '#ffffff', threshold: 18 }).png().toBuffer();
  const mark = await sharp(trimmed).resize(680, 680, { fit: 'contain', background: '#ffffff' }).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#ffffff' } })
    .composite([{ input: mark, gravity: 'centre' }]).png().toFile(squareLogo);
}
async function writeIcon(size, output) {
  mkdir(path.dirname(output));
  await sharp(squareLogo).resize(size, size, { fit: 'contain', background: '#ffffff' }).png().toFile(output);
}
async function run() {
  await buildSquareLogo();

  const indexPath = path.join(www, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  // The committed index is the V10 base; include V11's photo/reminder layer and V12 fixes.
  if (!html.includes('v11-ultimate.js')) html = html.replace('<script src="v10-ultimate.js"></script>', '<script src="v10-ultimate.js"></script>\\n  <script src="v11-ultimate.js"></script>');
  if (!html.includes('v12-ultimate.js')) html = html.replace('</body>', '<script src="v12-ultimate.js"></script>\\n</body>');
  html = html.replace(/travelmate-icon-192\.png/g, 'travelmate-tm-falcon-square.png');
  html = html.replace(/TravelMate V10 Ultimate/g, 'TravelMate V12 Ultimate');
  fs.writeFileSync(indexPath, html);

  await writeIcon(192, path.join(www, 'travelmate-tm-falcon-192.png'));
  await writeIcon(512, path.join(www, 'travelmate-tm-falcon-512.png'));

  const manifestPath = path.join(www, 'manifest.webmanifest');
  if (fs.existsSync(manifestPath)) {
    let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.name = 'TravelMate V12 Ultimate';
    manifest.short_name = 'TravelMate';
    manifest.icons = [
      { src: 'travelmate-tm-falcon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'travelmate-tm-falcon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ];
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  }

  const swPath = path.join(www, 'sw.js');
  if (fs.existsSync(swPath)) {
    let sw = fs.readFileSync(swPath, 'utf8').replace(/travelmate-v\d+-shell/g, 'travelmate-v12-shell');
    if (!sw.includes('./v12-ultimate.js')) sw = sw.replace('./v11-ultimate.js', './v11-ultimate.js","./v12-ultimate.js","./travelmate-tm-falcon-square.png","./travelmate-tm-falcon-192.png","./travelmate-tm-falcon-512.png');
    if (!sw.includes('./v11-ultimate.js')) sw = sw.replace('./v10-ultimate.js', './v10-ultimate.js","./v11-ultimate.js","./v12-ultimate.js","./travelmate-tm-falcon-square.png","./travelmate-tm-falcon-192.png","./travelmate-tm-falcon-512.png');
    fs.writeFileSync(swPath, sw);
  }

  const res = path.join(androidMain, 'res');
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    await writeIcon(size, path.join(res, `mipmap-${density}`, 'ic_launcher.png'));
    await writeIcon(size, path.join(res, `mipmap-${density}`, 'ic_launcher_round.png'));
  }
  await writeIcon(432, path.join(res, 'drawable', 'ic_launcher_foreground.png'));
  mkdir(path.join(res, 'mipmap-anydpi-v26'));
  fs.writeFileSync(path.join(res, 'mipmap-anydpi-v26', 'ic_launcher.xml'),
    '<?xml version="1.0" encoding="utf-8"?><adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/ic_launcher_background"/><foreground android:drawable="@drawable/ic_launcher_foreground"/></adaptive-icon>');
  mkdir(path.join(res, 'values'));
  fs.writeFileSync(path.join(res, 'values', 'ic_launcher_background.xml'),
    '<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');

  const manifest = path.join(androidMain, 'AndroidManifest.xml');
  let xml = fs.readFileSync(manifest, 'utf8');
  if (!xml.includes('android.permission.POST_NOTIFICATIONS')) {
    xml = xml.replace('<application', '<uses-permission android:name="android.permission.POST_NOTIFICATIONS"/><application');
  }
  xml = xml.replace(/android:icon="@[^"]+"/, 'android:icon="@mipmap/ic_launcher"');
  xml = xml.replace(/android:roundIcon="@[^"]+"/, 'android:roundIcon="@mipmap/ic_launcher_round"');
  fs.writeFileSync(manifest, xml);

  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (fs.existsSync(gradle)) {
    let g = fs.readFileSync(gradle, 'utf8');
    g = g.replace(/versionCode\s+\d+/, 'versionCode 12');
    g = g.replace(/versionName\s+"[^"]+"/, 'versionName "12.0.0"');
    fs.writeFileSync(gradle, g);
  }
  console.log('TravelMate V12 web assets, brand art, adaptive icons and Android metadata prepared.');
}
run().catch(error => { console.error(error); process.exit(1); });
