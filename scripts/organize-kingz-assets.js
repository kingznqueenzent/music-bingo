/**
 * LEGACY — do not run for production.
 * Previously downloaded Unsplash/stock imagery (including people).
 * Real DJ photos must be supplied as originals under public/assets/raw/
 * and optimized copies under public/assets/images/ — never stock faces as DJ stand-ins.
 */
console.error(
  '[organize-kingz-assets] Disabled. Add real photography under public/assets/raw/ instead of stock downloads.'
)
process.exit(1)

const fs = require('fs')
const path = require('path')
const sharp = require('sharp')
const https = require('https')
const http = require('http')

const ROOT = path.join(__dirname, '..')
const ASSETS = path.join(ROOT, 'public', 'assets')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function download(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http
    lib
      .get(url, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          download(res.headers.location).then(resolve, reject)
          return
        }
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode} for ${url}`))
          return
        }
        const chunks = []
        res.on('data', (c) => chunks.push(c))
        res.on('end', () => resolve(Buffer.concat(chunks)))
      })
      .on('error', reject)
  })
}

async function saveJpg(url, dest, width) {
  ensureDir(path.dirname(dest))
  try {
    const buf = await download(url)
    await sharp(buf)
      .resize({ width, withoutEnlargement: true, fit: 'inside' })
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(dest)
    console.log('wrote', path.relative(ROOT, dest))
  } catch (err) {
    console.warn('skip', dest, err.message)
    // Fallback solid placeholder so path still resolves
    if (!fs.existsSync(dest)) {
      await sharp({
        create: { width: Math.min(width, 800), height: Math.min(width, 800), channels: 3, background: { r: 12, g: 8, b: 16 } },
      })
        .jpeg()
        .toFile(dest)
      console.log('placeholder', path.relative(ROOT, dest))
    }
  }
}

async function main() {
  // DJ profiles / heroes (current Unsplash stand-ins — replace with official photos)
  await saveJpg(
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1600&q=80',
    path.join(ASSETS, 'images/dj-liz/profile.jpg'),
    1200
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1600&q=80',
    path.join(ASSETS, 'images/dj-liz/hero.jpg'),
    1600
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=1200&q=80',
    path.join(ASSETS, 'images/dj-liz/gallery-01.jpg'),
    1200
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80',
    path.join(ASSETS, 'images/dj-liz/gallery-02.jpg'),
    1200
  )

  await saveJpg(
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=80',
    path.join(ASSETS, 'images/dj-merci/profile.jpg'),
    1200
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1600&q=80',
    path.join(ASSETS, 'images/dj-merci/hero.jpg'),
    1600
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=1200&q=80',
    path.join(ASSETS, 'images/dj-merci/gallery-01.jpg'),
    1200
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1571266028247-d7bef636ba70?w=1200&q=80',
    path.join(ASSETS, 'images/dj-merci/gallery-02.jpg'),
    1200
  )

  // Event gallery
  await saveJpg(
    'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=2000&q=80',
    path.join(ASSETS, 'images/events/weddings/gallery-01.jpg'),
    2000
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=80',
    path.join(ASSETS, 'images/events/weddings/gallery-02.jpg'),
    1600
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1511578314322-379afb476865?w=2000&q=80',
    path.join(ASSETS, 'images/events/corporate/gallery-01.jpg'),
    2000
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=80',
    path.join(ASSETS, 'images/events/corporate/gallery-02.jpg'),
    1600
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=2000&q=80',
    path.join(ASSETS, 'images/events/clubs/gallery-01.jpg'),
    2000
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=2000&q=80',
    path.join(ASSETS, 'images/events/clubs/gallery-02.jpg'),
    2000
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1598387181032-a310d89d2053?w=2000&q=80',
    path.join(ASSETS, 'images/events/birthdays/gallery-01.jpg'),
    2000
  )

  // Backgrounds
  await saveJpg(
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=2400&q=80',
    path.join(ASSETS, 'images/backgrounds/hero-bg.jpg'),
    2400
  )
  await saveJpg(
    'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=2000&q=80',
    path.join(ASSETS, 'images/backgrounds/nightclub.jpg'),
    2000
  )
  // Gold texture stand-in (warm abstract)
  await saveJpg(
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&q=80',
    path.join(ASSETS, 'images/backgrounds/gold-texture.jpg'),
    1600
  )

  // Merch placeholders (tiny dark jpg so paths resolve)
  const merchDir = path.join(ASSETS, 'merch')
  ensureDir(merchDir)
  await sharp({
    create: { width: 800, height: 800, channels: 3, background: { r: 12, g: 8, b: 16 } },
  })
    .jpeg()
    .toFile(path.join(merchDir, 'placeholder.jpg'))

  // Logo placeholders that are empty files — make valid tiny PNGs
  const logoDir = path.join(ASSETS, 'logo')
  for (const name of ['logo-black.png', 'logo-horizontal.png', 'logo-compact.png', 'apple-touch-icon.png']) {
    const p = path.join(logoDir, name)
    const size = name.includes('apple') ? 180 : 64
    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .png()
      .toFile(p)
  }

  // favicon.ico as png copy (browsers accept; replace with real .ico later)
  await sharp(path.join(logoDir, 'logo-main.png'))
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(logoDir, 'favicon.png'))

  console.log('Asset organization complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
