const fs = require('fs')
const path = require('path')
const p = path.join(__dirname, '..', 'lib', 'kingz', 'merch.ts')
let s = fs.readFileSync(p, 'utf8')
s = s.replaceAll(
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=80',
  '/assets/images/dj-liz/profile.jpg'
)
s = s.replaceAll(
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  '/assets/images/dj-merci/profile.jpg'
)
s = s.replaceAll(
  'https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=800&q=80',
  '/assets/images/dj-liz/gallery-01.jpg'
)
s = s.replaceAll(
  'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80',
  '/assets/images/dj-merci/gallery-01.jpg'
)
s = s.replace(/image: 'https:\/\/images\.unsplash\.com\/[^']+'/g, "image: '/assets/merch/placeholder.jpg'")
if (!s.includes('FUTURE: merch product photos')) {
  s = s.replace(
    'export const FEATURED_MERCH',
    '/** FUTURE: replace /assets/merch/placeholder.jpg with product shots in public/assets/merch/ */\nexport const FEATURED_MERCH'
  )
}
fs.writeFileSync(p, s)
console.log('merch.ts paths updated')
