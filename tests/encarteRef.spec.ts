import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { encarteRefCode } from '../app/utils/encarteRef'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('código de referência do encarte', () => {
  it('abreviia o UUID da scan para 8 hex maiúsculos', () => {
    expect(encarteRefCode('87bfaaa0-7cb9-4f6a-a471-4c6fd12998db')).toBe('87BFAAA0')
    expect(encarteRefCode('87BFAAA07CB94F6AA4714C6FD12998DB')).toBe('87BFAAA0')
  })

  it('devolve vazio quando não há id', () => {
    expect(encarteRefCode('')).toBe('')
    expect(encarteRefCode(null)).toBe('')
    expect(encarteRefCode(undefined)).toBe('')
  })

  it('marca o recorte do produto, o card, o lightbox e a página do encarte', () => {
    const badge = 'EncarteRefBadge'
    expect(existsSync(resolve(root, 'app/components/encartes/EncarteRefBadge.vue'))).toBe(true)
    expect(source('app/pages/produto/[slug]/[[loja]].vue')).toContain(badge)
    expect(source('app/pages/produto/[slug]/[[loja]].vue')).toContain('selected.encarte_id')
    expect(source('app/components/encartes/EncarteCard.vue')).toContain(badge)
    expect(source('app/components/encartes/EncarteCard.vue')).toContain('encarte.id')
    expect(source('app/components/encartes/EncarteLightbox.vue')).toContain(badge)
    expect(source('app/pages/encarte/[id].vue')).toContain(badge)
  })

  it('permite copiar o código no badge', () => {
    const badge = source('app/components/encartes/EncarteRefBadge.vue')
    expect(badge).toContain('navigator.clipboard')
    expect(badge).toContain('writeText')
    expect(badge).not.toContain('pointer-events: none')
    expect(badge).toContain('type="button"')
  })
})
