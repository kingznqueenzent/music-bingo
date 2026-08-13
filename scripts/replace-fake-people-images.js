/**
 * Replace stock/AI performer photos with abstract black/gold/purple
 * atmosphere art (equipment silhouettes only — no people).
 * Run: node scripts/replace-fake-people-images.js
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.join('public', 'assets')
const IMG = path.join(ROOT, 'images')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

async function abstractAtmosphere(outPath, opts = {}) {
  const w = opts.w || 1600
  const h = opts.h || 900
  const title = opts.title || ''
  const accent = '#D4AF37'
  const purple = '#5A2D91'
  const burgundy = '#6B0F1A'

  const titleEl = title
    ? `<text x="50%" y="28%" text-anchor="middle" fill="${accent}" fill-opacity="0.85" font-family="Georgia, serif" font-size="42" letter-spacing="6">${title}</text>`
    : ''

  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <radialGradient id="g1" cx="50%" cy="35%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.35"/>
      <stop offset="45%" stop-color="${purple}" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#050505" stop-opacity="1"/>
    </radialGradient>
    <radialGradient id="g2" cx="20%" cy="80%" r="40%">
      <stop offset="0%" stop-color="${burgundy}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#050505" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="g3" cx="85%" cy="70%" r="35%">
      <stop offset="0%" stop-color="${purple}" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#050505" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="beam" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="#050505"/>
  <rect width="100%" height="100%" fill="url(#g1)"/>
  <rect width="100%" height="100%" fill="url(#g2)"/>
  <rect width="100%" height="100%" fill="url(#g3)"/>
  <g opacity="0.35">
    <polygon points="${w * 0.42},0 ${w * 0.48},${h} ${w * 0.52},${h} ${w * 0.58},0" fill="url(#beam)"/>
    <polygon points="${w * 0.28},0 ${w * 0.38},${h} ${w * 0.42},${h} ${w * 0.35},0" fill="url(#beam)"/>
    <polygon points="${w * 0.65},0 ${w * 0.58},${h} ${w * 0.62},${h} ${w * 0.72},0" fill="url(#beam)"/>
  </g>
  <g opacity="0.55" transform="translate(${w * 0.28}, ${h * 0.62})">
    <rect x="0" y="0" width="${w * 0.44}" height="${h * 0.18}" rx="12" fill="#0a0a0a" stroke="${accent}" stroke-opacity="0.45" stroke-width="2"/>
    <circle cx="${w * 0.1}" cy="${h * 0.09}" r="${h * 0.055}" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="3"/>
    <circle cx="${w * 0.34}" cy="${h * 0.09}" r="${h * 0.055}" fill="none" stroke="${accent}" stroke-opacity="0.55" stroke-width="3"/>
    <rect x="${w * 0.18}" y="${h * 0.05}" width="${w * 0.08}" height="${h * 0.08}" rx="4" fill="${purple}" fill-opacity="0.55"/>
    <circle cx="${w * 0.12}" cy="${h * 0.09}" r="6" fill="${accent}" fill-opacity="0.7"/>
    <circle cx="${w * 0.32}" cy="${h * 0.09}" r="6" fill="${accent}" fill-opacity="0.7"/>
  </g>
  ${titleEl}
</svg>`)

  ensureDir(path.dirname(outPath))
  await sharp(svg).jpeg({ quality: 88, mozjpeg: true }).toFile(outPath)
  console.log('wrote', outPath, fs.statSync(outPath).size)
}

async function main() {
  await abstractAtmosphere(path.join(IMG, 'gallery/gallery-wedding-dancefloor.jpg'), {
    title: 'EVENT LIGHTING',
  })
  await abstractAtmosphere(path.join(IMG, 'backgrounds/nightclub.jpg'), {
    title: 'STAGE LIGHTING',
  })
  await abstractAtmosphere(path.join(IMG, 'events/weddings/wedding-dancefloor.jpg'), {
    title: 'DANCE FLOOR',
  })
  await abstractAtmosphere(path.join(IMG, 'events/weddings/wedding-ceremony.jpg'), {
    title: 'CELEBRATIONS',
  })
  await abstractAtmosphere(path.join(IMG, 'events/corporate/corporate-gala.jpg'), {
    title: 'CORPORATE EVENTS',
  })
  await abstractAtmosphere(path.join(IMG, 'backgrounds/gold-texture.jpg'), {
    w: 1200,
    h: 1200,
  })

  for (const d of [
    path.join(IMG, 'dj-merci'),
    path.join(IMG, 'dj-liz'),
    path.join(ROOT, 'raw/dj-merci'),
    path.join(ROOT, 'raw/dj-liz'),
  ]) {
    ensureDir(d)
  }

  console.log('done')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
