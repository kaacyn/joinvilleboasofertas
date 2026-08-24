import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('página Envie um encarte', () => {
  it('explica Instagram e tem campos obrigatórios + submit via jboSend', () => {
    const page = source('app/pages/envie-um-encarte.vue')
    expect(page).toContain('Instagram')
    expect(page).toMatch(/em desenvolvimento|sendo desenvolvido/i)
    expect(page).toContain('Nome do mercado')
    expect(page).toContain('Nome do solicitante')
    expect(page).toContain('E-mail')
    expect(page).toContain('Usuário')
    expect(page).toContain('Comerciante')
    expect(page).toContain("jboSend('POST', '/encarte-leads'")
    expect(page).toContain('Recebemos seu pedido')
    expect(page).toContain('value="user"')
    expect(page).toContain('value="merchant"')
  })
})
