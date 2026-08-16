/**
 * Generate short royalty-free-style SFX MP3s into public/sfx/.
 * Run: node scripts/generate-sfx-mp3s.js
 */
const fs = require('fs')
const path = require('path')

let Mp3Encoder
try {
  // lamejs needs these globals under modern Node
  global.MPEGMode = require('lamejs/src/js/MPEGMode.js')
  global.Lame = require('lamejs/src/js/Lame.js')
  global.Presets = require('lamejs/src/js/Presets.js')
  global.BitStream = require('lamejs/src/js/BitStream.js')
  const lamejs = require('lamejs')
  Mp3Encoder = lamejs.Mp3Encoder
} catch (e) {
  console.error('lamejs required. Run: npm install --no-save lamejs')
  console.error(e)
  process.exit(1)
}

const SAMPLE_RATE = 44100
const OUT_DIR = path.join(__dirname, '..', 'public', 'sfx')

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n))
}

function writeMp3(filename, samples) {
  const encoder = new Mp3Encoder(1, SAMPLE_RATE, 128)
  const int16 = new Int16Array(samples.length)
  for (let i = 0; i < samples.length; i++) {
    const s = clamp(samples[i], -1, 1)
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }

  const chunks = []
  const block = 1152
  for (let i = 0; i < int16.length; i += block) {
    const slice = int16.subarray(i, Math.min(i + block, int16.length))
    const buf = encoder.encodeBuffer(slice)
    if (buf.length > 0) chunks.push(Buffer.from(buf))
  }
  const end = encoder.flush()
  if (end.length > 0) chunks.push(Buffer.from(end))

  const out = path.join(OUT_DIR, filename)
  fs.writeFileSync(out, Buffer.concat(chunks))
  console.log('wrote', out, `(${(fs.statSync(out).size / 1024).toFixed(1)} KB)`)
}

function alloc(seconds) {
  return new Float32Array(Math.floor(SAMPLE_RATE * seconds))
}

function env(t, attack, release, dur) {
  if (t < attack) return t / attack
  if (t > dur - release) return Math.max(0, (dur - t) / release)
  return 1
}

/** DJ-style airhorn: descending saw + burst */
function genAirhorn() {
  const dur = 0.85
  const out = alloc(dur)
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    const f = 420 * Math.pow(0.35, t / dur)
    const saw = ((t * f) % 1) * 2 - 1
    const noise = (Math.random() * 2 - 1) * (t < 0.08 ? 0.35 : 0.05)
    out[i] = (saw * 0.55 + noise) * env(t, 0.01, 0.2, dur) * 0.9
  }
  return out
}

/** Vinyl scratch / rewind */
function genVinylScratch() {
  const dur = 0.75
  const out = alloc(dur)
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    const f = 1200 * Math.pow(0.08, t / dur)
    const tone = Math.sin(2 * Math.PI * f * t)
    const grit = ((t * f * 3) % 1) * 2 - 1
    const scratch = (Math.random() * 2 - 1) * (0.15 + 0.25 * Math.sin(t * 40))
    out[i] = (tone * 0.35 + grit * 0.25 + scratch) * env(t, 0.005, 0.12, dur) * 0.85
  }
  return out
}

/** Game-show wrong buzzer */
function genWrongBuzzer() {
  const dur = 0.55
  const out = alloc(dur)
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    const f1 = 180
    const f2 = 190
    const buzz =
      Math.sin(2 * Math.PI * f1 * t) * 0.45 +
      Math.sin(2 * Math.PI * f2 * t) * 0.45 +
      (((t * 90) % 1) * 2 - 1) * 0.15
    out[i] = buzz * env(t, 0.005, 0.08, dur) * 0.95
  }
  return out
}

/** Victory chime + soft cheer bed */
function genBingoWin() {
  const dur = 1.35
  const out = alloc(dur)
  const notes = [523.25, 659.25, 783.99, 1046.5] // C5 E5 G5 C6
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    let s = 0
    for (let n = 0; n < notes.length; n++) {
      const start = n * 0.12
      if (t < start) continue
      const lt = t - start
      const noteDur = 0.55
      if (lt > noteDur) continue
      s += Math.sin(2 * Math.PI * notes[n] * lt) * env(lt, 0.01, 0.25, noteDur) * 0.28
    }
    // soft crowd bed
    const cheer = (Math.random() * 2 - 1) * Math.exp(-t * 1.2) * 0.18
    out[i] = clamp(s + cheer, -1, 1)
  }
  return out
}

/** Tension drumroll */
function genDrumroll() {
  const dur = 1.2
  const out = alloc(dur)
  const hits = 18
  for (let h = 0; h < hits; h++) {
    const start = (h / hits) * (dur - 0.08)
    const hitLen = 0.045
    for (let i = 0; i < out.length; i++) {
      const t = i / SAMPLE_RATE
      if (t < start || t > start + hitLen) continue
      const lt = t - start
      const noise = (Math.random() * 2 - 1) * Math.exp(-lt * 55)
      const thump = Math.sin(2 * Math.PI * (140 + h * 6) * lt) * Math.exp(-lt * 40)
      out[i] = clamp(out[i] + (noise * 0.55 + thump * 0.4) * 0.85, -1, 1)
    }
  }
  // final hit
  const fin = dur - 0.12
  for (let i = 0; i < out.length; i++) {
    const t = i / SAMPLE_RATE
    if (t < fin) continue
    const lt = t - fin
    out[i] = clamp(
      out[i] +
        Math.sin(2 * Math.PI * 90 * lt) * Math.exp(-lt * 12) * 0.7 +
        (Math.random() * 2 - 1) * Math.exp(-lt * 20) * 0.35,
      -1,
      1
    )
  }
  return out
}

fs.mkdirSync(OUT_DIR, { recursive: true })

writeMp3('airhorn.mp3', genAirhorn())
writeMp3('vinyl-scratch.mp3', genVinylScratch())
writeMp3('wrong-buzzer.mp3', genWrongBuzzer())
writeMp3('bingo-win.mp3', genBingoWin())
writeMp3('drumroll.mp3', genDrumroll())

console.log('Done.')
