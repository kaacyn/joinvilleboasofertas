import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

/** Lê um arquivo do projeto como texto. */
function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('página Contato e Sugestões', () => {
  it('tem os campos, o convite ao e-mail e envia via jboSend', () => {
    const page = source('app/pages/contato.vue')
    expect(page).toContain('Contato e Sugestões')
    expect(page).toContain('Quer resposta? Deixe seu e-mail')
    expect(page).toContain('v-for="option in CONTACT_KINDS"')
    expect(page).toContain("jboSend('POST', '/contact-messages'")
    expect(page).toContain('contactBlocker(draft)')
    expect(page).toContain('contactErrorMessage(err)')
    expect(page).toContain('contactSuccessMessage(')
    expect(page).toContain('CONTACT_MESSAGE_MAX')
    expect(page).toContain("path: '/contato'")
  })

  it('honeypot fica fora da tela e fora do teclado e do leitor de tela', () => {
    const page = source('app/pages/contato.vue')
    expect(page).toContain('v-model="draft.website"')
    expect(page).toContain('tabindex="-1"')
    expect(page).toContain('autocomplete="off"')
    expect(page).toContain('aria-hidden="true"')
    expect(page).toContain('class="hp"')
  })

  it('avisa sobre o uso dos dados com link para a política', () => {
    const page = source('app/pages/contato.vue')
    expect(page).toContain('to="/privacidade"')
    expect(page).toMatch(/só para responder/i)
  })

  it('está no menu (após Envie um encarte), no sitemap e na política', () => {
    const menu = source('app/components/HeaderMenu.vue')
    expect(menu).toContain('to="/contato"')
    expect(menu).toContain('Contato e Sugestões')
    expect(menu.indexOf('to="/contato"')).toBeGreaterThan(menu.indexOf('to="/envie-um-encarte"'))
    expect(menu.indexOf('to="/contato"')).toBeLessThan(menu.indexOf('to="/perguntas-frequentes"'))
    expect(source('server/routes/sitemap.xml.ts')).toContain("'/contato',")
    expect(source('app/pages/privacidade.vue')).toMatch(/Contato e Sugestões/)
  })
})
