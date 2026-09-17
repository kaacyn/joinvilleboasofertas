import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  detectPwaStandalone,
  hasPwaBackGuard,
  JBO_PWA_BACK_GUARD,
  nextPwaBackAction,
  pushPwaBackGuard,
} from '../app/utils/pwaBackGuard'

const root = resolve(import.meta.dirname, '..')
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('pwaBackGuard', () => {
  it('detecta standalone via media query ou navigator.standalone', () => {
    expect(detectPwaStandalone({
      matchMedia: () => ({ matches: true }),
      navigator: {},
    })).toBe(true)
    expect(detectPwaStandalone({
      matchMedia: () => ({ matches: false }),
      navigator: { standalone: true },
    })).toBe(true)
    expect(detectPwaStandalone({
      matchMedia: () => ({ matches: false }),
      navigator: {},
    })).toBe(false)
  })

  it('identifica e empilha o estado-sentinela sem apagar o state anterior', () => {
    const pushState = vi.fn()
    const history = {
      state: { position: 3, custom: true },
      pushState,
    } as unknown as History

    expect(hasPwaBackGuard(null)).toBe(false)
    expect(hasPwaBackGuard({ [JBO_PWA_BACK_GUARD]: true })).toBe(true)

    pushPwaBackGuard(history, 'https://jbo.test/produto/melancia')
    expect(pushState).toHaveBeenCalledOnce()
    const [state, title, url] = pushState.mock.calls[0]
    expect(title).toBe('')
    expect(url).toBe('https://jbo.test/produto/melancia')
    expect(state).toMatchObject({
      position: 3,
      custom: true,
      [JBO_PWA_BACK_GUARD]: true,
    })
  })

  it('na home em standalone rearma; fora dela só manda à home se o histórico acabou', () => {
    expect(nextPwaBackAction({
      isStandalone: false,
      pathname: '/',
      historyLength: 1,
    })).toBe('noop')

    expect(nextPwaBackAction({
      isStandalone: true,
      pathname: '/',
      historyLength: 2,
    })).toBe('arm')

    expect(nextPwaBackAction({
      isStandalone: true,
      pathname: '/produto/melancia/frutaria-boa-vista',
      historyLength: 3,
    })).toBe('noop')

    expect(nextPwaBackAction({
      isStandalone: true,
      pathname: '/produto/melancia/frutaria-boa-vista',
      historyLength: 1,
    })).toBe('go-home')
  })

  it('ativa o guarda no shell do app em modo cliente', () => {
    expect(source('app/composables/usePwaBackGuard.ts')).toContain('nextPwaBackAction')
    expect(source('app/composables/usePwaBackGuard.ts')).toContain('pushPwaBackGuard')
    expect(source('app/composables/usePwaBackGuard.ts')).toContain('popstate')
    expect(source('app/app.vue')).toContain('usePwaBackGuard')
  })
})
