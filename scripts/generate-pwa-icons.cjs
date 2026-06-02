const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sizes = [192, 512];
const publicDir = path.resolve(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images');
const svgPath = path.join(imagesDir, 'pwa-icon.svg');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

async function generate() {
  const svgBuffer = fs.readFileSync(svgPath);
  for (const size of sizes) {
    const padding = Math.round(size * 0.08);
    const iconSize = size - padding * 2;
    await sharp(svgBuffer)
      .resize(iconSize, iconSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 8, g: 12, b: 20, alpha: 1 },
      })
      .png()
      .toFile(path.join(imagesDir, `pwa-icon-${size}x${size}.png`));
    console.log(`Generated pwa-icon-${size}x${size}.png`);
  }
}

generate().catch(console.error);
