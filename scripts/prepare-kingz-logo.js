/**
 * One-off: optimize official Kingz & Queenz logo into public/assets/logo/
 * Run: node scripts/prepare-kingz-logo.js
 */
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const SRC =
  'C:/Users/archi/Downloads/Kingz & Queenz Logos & Photos/KingznQueenzENT Logo.png'
const OUT = path.join(__dirname, '..', 'public', 'assets', 'logo')

async function main() {
  fs.mkdirSync(OUT, { recursive: true })

  const meta = await sharp(SRC).metadata()
  console.log('source', meta.width, 'x', meta.height)

  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    if (r > 245 && g > 245 && b > 245) {
      data[i + 3] = 0
    } else if (r > 230 && g > 230 && b > 230) {
      const avg = (r + g + b) / 3
      data[i + 3] = Math.max(0, Math.min(255, Math.round((255 - avg) * 8)))
    }
  }

  const maxW = Math.min(info.width, 1200)
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
    .resize({ width: maxW, withoutEnlargement: true, fit: 'inside' })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toFile(path.join(OUT, 'logo-full.png'))

  const fullMeta = await sharp(path.join(OUT, 'logo-full.png')).metadata()
  const size = fs.statSync(path.join(OUT, 'logo-full.png')).size
  console.log('logo-full.png', fullMeta.width, 'x', fullMeta.height, `${Math.round(size / 1024)}KB`)

  // PLACEHOLDER: logo.svg — replace with official vector when available
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${fullMeta.width}" height="${fullMeta.height}" viewBox="0 0 ${fullMeta.width} ${fullMeta.height}">
  <!-- PLACEHOLDER: Replace with official Kingz & Queenz SVG logo -->
  <rect width="100%" height="100%" fill="none"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" fill="#D4AF37" font-family="Georgia, serif" font-size="42">KINGZ &amp; QUEENZ</text>
</svg>
`
  fs.writeFileSync(path.join(OUT, 'logo.svg'), svg)

  // PLACEHOLDER: logo-white.png — white/monochrome logo for dark overlays
  await sharp({
    create: {
      width: fullMeta.width,
      height: fullMeta.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toFile(path.join(OUT, 'logo-white.png'))

  // PLACEHOLDER: logo-gold.png — gold-only flat mark for icons/favicons
  await sharp({
    create: {
      width: fullMeta.width,
      height: fullMeta.height,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toFile(path.join(OUT, 'logo-gold.png'))

  console.log('Placeholders written: logo-white.png, logo-gold.png, logo.svg')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
