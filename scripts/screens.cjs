/* Captura as telas do JBO em 390×844 (full page) para docs/screens/.
 * Uso: npm run build && NITRO_PORT=3111 node .output/server/index.mjs &
 *      CHROME=/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome \
 *      NODE_PATH=/root/.npm/_npx/e41f203b7505f1fb/node_modules \
 *      BASE=http://127.0.0.1:3111 node scripts/screens.cjs
 * Sem proxy /api local, aponte BASE para o compose (http://localhost:8092). */
const path = require('node:path')
const { chromium } = require('playwright')

const BASE = process.env.BASE || 'http://localhost:8092'
const OUT = path.join(__dirname, '..', 'docs', 'screens')

/** Telas: arquivo, rota e ação opcional antes da captura. */
const SHOTS = [
  ['01-home.png', '/'],
  ['02-lojas.png', '/lojas'],
  ['03-loja.png', process.env.LOJA_PATH || '/lojas'],
  ['04-categoria.png', '/categoria/mercearia'],
  ['05-produto.png', process.env.PRODUTO_PATH || '/'],
  ['06-encartes.png', '/encartes'],
  ['07-encarte.png', process.env.ENCARTE_PATH || '/encartes'],
  ['08-envie-encarte.png', '/envie-um-encarte'],
  ['09-faq.png', '/perguntas-frequentes'],
  ['10-privacidade.png', '/privacidade'],
  ['11-termos.png', '/termos'],
  ['12-menu.png', '/', async page => page.click('.hmenu__trigger')],
  ['13-filtro-categorias.png', '/', async page => page.click('.chipdd__trigger >> nth=0')],
  ['14-encarte-lightbox.png', process.env.ENCARTE_PATH || '/encartes', async page => page.click('[data-test="encarte-open"]')],
  ['15-follow-modal.png', '/lojas', async page => page.click('.store-bell__btn >> nth=0')],
  ['16-home-filtro.png', '/?q=arroz'],
  ['17-home-termina-hoje.png', '/?ends_today=1'],
]

/** Abre cada rota, executa a ação e salva a captura full-page. */
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ['--no-sandbox'] })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  for (const [file, route, action] of SHOTS) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' })
    if (action) {
      await action(page)
      await page.waitForTimeout(400)
    }
    await page.screenshot({ path: path.join(OUT, file), fullPage: true })
    console.log('ok', file)
  }
  await browser.close()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
