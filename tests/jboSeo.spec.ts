import { describe, expect, it } from 'vitest'
import { absoluteUrl, isValidLastmod, resolveOgImage } from '../app/utils/jboSeo'

describe('jboSeo helpers', () => {
  it('absoluteUrl junta site e path sem barra dupla', () => {
    expect(absoluteUrl('https://ex.com/', '/loja/a')).toBe('https://ex.com/loja/a')
    expect(absoluteUrl('https://ex.com', 'loja/a')).toBe('https://ex.com/loja/a')
  })

  it('absoluteUrl vazio se siteUrl vazio', () => {
    expect(absoluteUrl('', '/x')).toBe('')
  })

  it('resolveOgImage aceita absoluta e relativa', () => {
    expect(resolveOgImage('https://ex.com', 'https://cdn/x.jpg')).toBe('https://cdn/x.jpg')
    expect(resolveOgImage('https://ex.com', '/assets/a.png')).toBe('https://ex.com/assets/a.png')
    expect(resolveOgImage('https://ex.com', null)).toBeUndefined()
  })

  it('isValidLastmod', () => {
    expect(isValidLastmod('2026-08-25')).toBe(true)
    expect(isValidLastmod('2026-08-25T12:00:00Z')).toBe(true)
    expect(isValidLastmod('nope')).toBe(false)
    expect(isValidLastmod(null)).toBe(false)
  })
})
