const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = process.cwd();
const www = path.join(root, 'www');
const main = path.join(root, 'android', 'app', 'src', 'main');
const exists = p => fs.existsSync(p);
const mkdir = p => fs.mkdirSync(p, { recursive: true });
const write = (p, data) => fs.writeFileSync(p, data);

async function mainTask() {
  const source = path.join(www, 'travelmate-tm-falcon.png');
  if (!exists(source)) throw new Error('Approved launcher artwork missing: www/travelmate-tm-falcon.png');

  const trimmed = await sharp(source)
    .trim({ background: '#fff', threshold: 12 })
    .png().toBuffer();

  // Standard launcher icon: white square with the approved falcon artwork centered.
  const art = await sharp(trimmed).resize(410, 410, { fit: 'inside' }).png().toBuffer();
  const square = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: '#ffffff' }
  }).composite([{ input: art, gravity: 'centre' }]).png().toBuffer();

  // Adaptive foreground: convert the dark artwork to alpha, preserving its silhouette.
  const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const alpha = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < info.width * info.height; i++) {
    const k = i * 4;
    const luminance = data[k] * 0.299 + data[k + 1] * 0.587 + data[k + 2] * 0.114;
    alpha[k] = alpha[k + 1] = alpha[k + 2] = 0;
    alpha[k + 3] = Math.max(0, Math.min(255,
      Math.round((255 - luminance) * 1.18 * data[k + 3] / 255)));
  }

  const foreground = await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
  }).composite([{
    input: await sharp(alpha, { raw: { width: info.width, height: info.height, channels: 4 } })
      .resize(340, 340, { fit: 'inside' }).png().toBuffer(),
    gravity: 'centre'
  }]).png().toBuffer();

  const res = path.join(main, 'res');
  const densities = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
  for (const [density, size] of Object.entries(densities)) {
    const dir = path.join(res, `mipmap-${density}`);
    mkdir(dir);
    await sharp(square).resize(size, size).png().toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(square).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_round.png'));
  }

  const foregroundSizes = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
  for (const [density, size] of Object.entries(foregroundSizes)) {
    const dir = path.join(res, `drawable-${density}`);
    mkdir(dir);
    await sharp(foreground).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_foreground.png'));
    await sharp(foreground).resize(size, size).png().toFile(path.join(dir, 'ic_launcher_monochrome.png'));
  }

  const nodpi = path.join(res, 'drawable-nodpi');
  mkdir(nodpi);
  await sharp(foreground).png().toFile(path.join(nodpi, 'ic_launcher_foreground.png'));
  await sharp(foreground).png().toFile(path.join(nodpi, 'ic_launcher_monochrome.png'));

  const adaptiveDir = path.join(res, 'mipmap-anydpi-v26');
  mkdir(adaptiveDir);
  const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@color/ic_launcher_background" />
  <foreground android:drawable="@drawable/ic_launcher_foreground" />
  <monochrome android:drawable="@drawable/ic_launcher_monochrome" />
</adaptive-icon>`;
  write(path.join(adaptiveDir, 'ic_launcher.xml'), adaptiveXml);
  write(path.join(adaptiveDir, 'ic_launcher_round.xml'), adaptiveXml);

  const values = path.join(res, 'values');
  mkdir(values);
  write(path.join(values, 'ic_launcher_background.xml'),
    '<resources><color name="ic_launcher_background">#FFFFFF</color></resources>');

  const manifestPath = path.join(main, 'AndroidManifest.xml');
  if (!exists(manifestPath)) throw new Error('AndroidManifest.xml missing after Capacitor sync');
  let manifest = fs.readFileSync(manifestPath, 'utf8');
  if (!/<application\b/.test(manifest)) throw new Error('Could not locate application tag in AndroidManifest.xml');
  manifest = manifest.replace(/android:icon="[^"]+"/, 'android:icon="@mipmap/ic_launcher"');
  if (/android:roundIcon="[^"]+"/.test(manifest)) {
    manifest = manifest.replace(/android:roundIcon="[^"]+"/, 'android:roundIcon="@mipmap/ic_launcher_round"');
  } else {
    manifest = manifest.replace(/<application\b/, '<application android:roundIcon="@mipmap/ic_launcher_round"');
  }
  if (!/android:icon="@mipmap\/ic_launcher"/.test(manifest) ||
      !/android:roundIcon="@mipmap\/ic_launcher_round"/.test(manifest)) {
    throw new Error('Launcher icon references were not applied to AndroidManifest.xml');
  }
  write(manifestPath, manifest);

  // Also refresh the web/PWA icon files so both install surfaces use the same artwork.
  for (const [name, size] of [['travelmate-icon-192.png', 192], ['travelmate-icon-512.png', 512],
                              ['travelmate-v21-192.png', 192], ['travelmate-v21-512.png', 512]]) {
    await sharp(square).resize(size, size).png().toFile(path.join(www, name));
  }

  // Ensure Android treats this as an upgrade over the previously distributed V23 build.
  const gradle = path.join(root, 'android', 'app', 'build.gradle');
  if (exists(gradle)) {
    const current = fs.readFileSync(gradle, 'utf8');
    const updated = current
      .replace(/versionCode\s+\d+/, 'versionCode 24')
      .replace(/versionName\s+"[^"]+"/, 'versionName "24.0.0"');
    if (updated === current) throw new Error('Could not update Android versionCode/versionName');
    write(gradle, updated);
  } else {
    throw new Error('android/app/build.gradle missing');
  }

  // Hard checks: all density icons exist and are valid PNGs with the expected dimensions.
  for (const [density, size] of Object.entries(densities)) {
    for (const name of ['ic_launcher.png', 'ic_launcher_round.png']) {
      const file = path.join(res, `mipmap-${density}`, name);
      if (!exists(file) || (await sharp(file).metadata()).width !== size) {
        throw new Error(`Invalid launcher resource: ${file}`);
      }
    }
  }
  for (const file of [
    path.join(res, 'drawable-nodpi', 'ic_launcher_foreground.png'),
    path.join(res, 'drawable-nodpi', 'ic_launcher_monochrome.png'),
    path.join(adaptiveDir, 'ic_launcher.xml'),
    path.join(adaptiveDir, 'ic_launcher_round.xml')
  ]) if (!exists(file) || fs.statSync(file).size === 0) throw new Error(`Missing launcher resource: ${file}`);

  console.log('✓ TravelMate V24 launcher icons regenerated after cap sync');
  console.log('✓ Standard, round, adaptive and monochrome resources verified');
  console.log('✓ AndroidManifest launcher references verified');
}

mainTask().catch(error => {
  console.error(error.stack || error);
  process.exit(1);
});
