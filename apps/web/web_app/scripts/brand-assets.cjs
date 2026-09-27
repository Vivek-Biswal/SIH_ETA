// Package the supplied artwork at platform-required sizes without changing it.
const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');
const web = path.resolve(__dirname, '..');
const mobile = path.resolve(web, '../../mobile/flutter_app');
const source = path.join(web, 'public/brand/logo.png');
async function png(file, size) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await sharp(source).resize(size, size, { fit: 'contain', background: '#051b40' }).png().toFile(file);
}
async function main() {
  for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) await png(path.join(mobile, `android/app/src/main/res/mipmap-${density}/ic_launcher.png`), size);
  for (const platform of ['ios', 'macos']) {
    const root = path.join(mobile, `${platform}/Runner/Assets.xcassets/AppIcon.appiconset`);
    const content = JSON.parse(await fs.readFile(path.join(root, 'Contents.json'), 'utf8'));
    for (const item of content.images) if (item.filename) await png(path.join(root, item.filename), Math.round(parseFloat(item.size) * parseFloat(item.scale)));
  }
  for (const size of [192, 512]) for (const prefix of ['Icon', 'Icon-maskable']) await png(path.join(mobile, `web/icons/${prefix}-${size}.png`), size);
  await png(path.join(mobile, 'web/favicon.png'), 32);
  await png(path.join(web, 'src/app/icon.png'), 192);
  // ICO containing a PNG payload, supported by modern Windows and browsers.
  const buffer = await sharp(source).resize(256, 256, { fit: 'contain', background: '#051b40' }).ensureAlpha().png().toBuffer();
  const header = Buffer.alloc(22); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4); header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12); header.writeUInt32LE(buffer.length, 14); header.writeUInt32LE(22, 18);
  for (const file of [path.join(web, 'src/app/favicon.ico'), path.join(mobile, 'windows/runner/resources/app_icon.ico')]) await fs.writeFile(file, Buffer.concat([header, buffer]));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
