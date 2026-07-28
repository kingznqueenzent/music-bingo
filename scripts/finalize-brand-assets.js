/**
 * Rename assets to descriptive filenames and create missing logo placeholders.
 * Run: node scripts/finalize-brand-assets.js
 */
const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

const ROOT = path.join(__dirname, '..')
const ASSETS = path.join(ROOT, 'public', 'assets')

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true })
}

function move(from, to) {
  ensureDir(path.dirname(to))
  if (!fs.existsSync(from)) {
    console.warn('missing', path.relative(ROOT, from))
    return false
  }
  if (fs.existsSync(to) && path.resolve(from) !== path.resolve(to)) {
    fs.unlinkSync(to)
  }
  fs.renameSync(from, to)
  console.log('moved', path.relative(ROOT, from), '→', path.relative(ROOT, to))
  return true
}

function copy(from, to) {
  ensureDir(path.dirname(to))
  if (!fs.existsSync(from)) return false
  fs.copyFileSync(from, to)
  console.log('copied', path.relative(ROOT, to))
  return true
}

async function emptyPng(dest, w = 64, h = 64) {
  ensureDir(path.dirname(dest))
  await sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toFile(dest)
}

async function main() {
  const img = path.join(ASSETS, 'images')

  // DJ Liz — descriptive names
  move(path.join(img, 'dj-liz/profile.jpg'), path.join(img, 'dj-liz/dj-liz-profile.jpg'))
  move(path.join(img, 'dj-liz/hero.jpg'), path.join(img, 'dj-liz/dj-liz-hero.jpg'))
  move(path.join(img, 'dj-liz/gallery-01.jpg'), path.join(img, 'dj-liz/dj-liz-live-stage.jpg'))
  move(path.join(img, 'dj-liz/gallery-02.jpg'), path.join(img, 'dj-liz/dj-liz-event.jpg'))

  // DJ Merci
  move(path.join(img, 'dj-merci/profile.jpg'), path.join(img, 'dj-merci/dj-merci-profile.jpg'))
  move(path.join(img, 'dj-merci/hero.jpg'), path.join(img, 'dj-merci/dj-merci-hero.jpg'))
  move(path.join(img, 'dj-merci/gallery-01.jpg'), path.join(img, 'dj-merci/dj-merci-live-stage.jpg'))
  move(path.join(img, 'dj-merci/gallery-02.jpg'), path.join(img, 'dj-merci/dj-merci-event.jpg'))

  // Events — descriptive names
  move(
    path.join(img, 'events/weddings/gallery-01.jpg'),
    path.join(img, 'events/weddings/wedding-dancefloor.jpg')
  )
  move(
    path.join(img, 'events/weddings/gallery-02.jpg'),
    path.join(img, 'events/weddings/wedding-ceremony.jpg')
  )
  move(
    path.join(img, 'events/corporate/gallery-01.jpg'),
    path.join(img, 'events/corporate/corporate-event-01.jpg')
  )
  move(
    path.join(img, 'events/corporate/gallery-02.jpg'),
    path.join(img, 'events/corporate/corporate-gala.jpg')
  )
  move(
    path.join(img, 'events/clubs/gallery-01.jpg'),
    path.join(img, 'events/clubs/club-performance-01.jpg')
  )
  move(
    path.join(img, 'events/clubs/gallery-02.jpg'),
    path.join(img, 'events/clubs/club-crowd.jpg')
  )
  move(
    path.join(img, 'events/birthdays/gallery-01.jpg'),
    path.join(img, 'events/birthdays/birthday-party-01.jpg')
  )

  // Gallery folder (shared curated set)
  ensureDir(path.join(img, 'gallery'))
  copy(
    path.join(img, 'events/weddings/wedding-dancefloor.jpg'),
    path.join(img, 'gallery/gallery-wedding-dancefloor.jpg')
  )
  copy(
    path.join(img, 'events/clubs/club-crowd.jpg'),
    path.join(img, 'gallery/gallery-live-event.jpg')
  )
  copy(
    path.join(img, 'events/corporate/corporate-event-01.jpg'),
    path.join(img, 'gallery/gallery-corporate-gala.jpg')
  )
  copy(
    path.join(img, 'events/clubs/club-performance-01.jpg'),
    path.join(img, 'gallery/gallery-nightlife.jpg')
  )
  copy(
    path.join(img, 'events/birthdays/birthday-party-01.jpg'),
    path.join(img, 'gallery/gallery-private-party.jpg')
  )

  // Backgrounds — descriptive
  if (fs.existsSync(path.join(img, 'backgrounds/hero-bg.jpg'))) {
    // keep hero-bg.jpg as alias name is already descriptive; also copy nightclub
  }

  // Logo placeholders
  const logoDir = path.join(ASSETS, 'logo')
  ensureDir(logoDir)
  // Ensure main exists
  if (!fs.existsSync(path.join(logoDir, 'logo-main.png')) && fs.existsSync(path.join(logoDir, 'logo-full.png'))) {
    copy(path.join(logoDir, 'logo-full.png'), path.join(logoDir, 'logo-main.png'))
  }
  // Transparent = copy of main (already transparent PNG from earlier processing)
  if (fs.existsSync(path.join(logoDir, 'logo-main.png'))) {
    copy(path.join(logoDir, 'logo-main.png'), path.join(logoDir, 'logo-transparent.png'))
  }
  for (const name of ['logo-monogram.png', 'logo-crown.png']) {
    const p = path.join(logoDir, name)
    if (!fs.existsSync(p) || fs.statSync(p).size < 100) {
      await emptyPng(p, 256, 256)
      console.log('placeholder', name)
    }
  }

  // Videos — behind the scenes
  const vid = path.join(ASSETS, 'videos')
  ensureDir(vid)
  const vids = [
    'promo-reel.mp4',
    'wedding-highlights.mp4',
    'corporate-events.mp4',
    'club-performances.mp4',
    'behind-the-scenes.mp4',
  ]
  for (const v of vids) {
    const p = path.join(vid, v)
    if (!fs.existsSync(p)) fs.writeFileSync(p, '')
  }
  // Keep legacy names as copies if they exist as empty placeholders
  console.log('Brand asset finalize complete')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
