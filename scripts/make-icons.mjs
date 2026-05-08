// Generate PNG icons from public/icon.svg.
// Run: npm run icons
import sharp from 'sharp'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const svg = readFileSync(resolve('public/icon.svg'))

const targets = [
  { size: 192, file: 'public/icon-192.png' },
  { size: 512, file: 'public/icon-512.png' },
  { size: 512, file: 'public/icon-512-maskable.png' },
  { size: 180, file: 'public/apple-touch-icon.png' }
]

for (const t of targets) {
  await sharp(svg).resize(t.size, t.size).png().toFile(t.file)
  console.log('wrote', t.file)
}
