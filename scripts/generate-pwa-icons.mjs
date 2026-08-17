import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const srcPng = resolve(root, 'public/assets/logo.png')
const srcWebp = resolve(root, 'public/assets/logo.webp')
const src = existsSync(srcPng) ? srcPng : srcWebp
const out = (name) => resolve(root, 'public', name)

const BRAND = '#0D131D'

if (!existsSync(src)) {
  throw new Error('Logo source missing: public/assets/logo.png or public/assets/logo.webp')
}

const srcBuffer = readFileSync(src)

async function renderAny(size, file) {
  const png = await sharp(srcBuffer)
    .resize(size, size, { fit: 'contain', background: BRAND })
    .flatten({ background: BRAND })
    .png()
    .toBuffer()
  writeFileSync(out(file), png)
  console.log(`✓ ${file}  (${size}×${size})`)
}

async function renderMaskable(size, file) {
  const inner = Math.round(size * 0.7)
  const offset = Math.round((size - inner) / 2)
  const symbol = await sharp(srcBuffer)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const png = await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND },
  })
    .composite([{ input: symbol, top: offset, left: offset }])
    .flatten({ background: BRAND })
    .png()
    .toBuffer()

  writeFileSync(out(file), png)
  console.log(`✓ ${file}  (${size}×${size}, maskable)`)
}

await renderAny(192, 'pwa-192x192.png')
await renderAny(512, 'pwa-512x512.png')
await renderMaskable(512, 'pwa-maskable-512x512.png')
await renderAny(180, 'apple-touch-icon.png')

console.log('\nDone. Commit the PNGs in public/.')
