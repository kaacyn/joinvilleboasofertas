import { describe, expect, it } from 'vitest'
import { canInstallPwa } from '../app/composables/usePwaInstall'

describe('canInstallPwa', () => {
  it('oculta o CTA em standalone', () => {
    expect(canInstallPwa({
      isStandalone: true,
      platform: 'ios',
      hasPendingPrompt: true,
    })).toBe(false)
  })

  it('mostra o CTA no iOS e no Android fora de standalone', () => {
    expect(canInstallPwa({
      isStandalone: false,
      platform: 'ios',
      hasPendingPrompt: false,
    })).toBe(true)
    expect(canInstallPwa({
      isStandalone: false,
      platform: 'android',
      hasPendingPrompt: false,
    })).toBe(true)
  })

  it('no desktop só mostra o CTA com beforeinstallprompt', () => {
    expect(canInstallPwa({
      isStandalone: false,
      platform: 'desktop',
      hasPendingPrompt: false,
    })).toBe(false)
    expect(canInstallPwa({
      isStandalone: false,
      platform: 'desktop',
      hasPendingPrompt: true,
    })).toBe(true)
  })
})
