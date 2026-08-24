import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('página Perguntas frequentes', () => {
  it('tem seções, accordion e links úteis', () => {
    const page = source('app/pages/perguntas-frequentes.vue')
    expect(page).toContain('Perguntas frequentes')
    expect(page).toContain('Para quem compra')
    expect(page).toContain('Para lojas / comerciantes')
    expect(page).toContain('<details')
    expect(page).toContain('<summary')
    expect(page).toContain('O que é o Joinville Boas Ofertas?')
    expect(page).toContain('Quais regras para o encarte ser divulgado')
    expect(page).toContain('to="/envie-um-encarte"')
    expect(page).toContain('instagram.com/joinvilleboasofertas')
    expect(page).not.toMatch(/API|Django|migration|rate.?limit|endpoint/i)
    expect(source('server/routes/sitemap.xml.ts')).toContain('/perguntas-frequentes')
  })
})
