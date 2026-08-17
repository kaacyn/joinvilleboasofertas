import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')

function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('prompt de instalação PWA', () => {
  it('expõe o CTA de instalar no header e os modais iOS/Android', () => {
    const header = source('app/components/AppHeader.vue')
    expect(header).toContain('InstallAppButton')
    expect(existsSync(resolve(root, 'app/composables/usePwaInstall.ts'))).toBe(true)
    expect(source('app/composables/usePwaInstall.ts')).toContain('beforeinstallprompt')
    expect(source('app/composables/usePwaInstall.ts')).toContain('display-mode: standalone')
  })

  it('coloca o botão à esquerda do HeaderMenu, fora do link da marca', () => {
    const header = source('app/components/AppHeader.vue')
    const brandClose = header.indexOf('</NuxtLink>')
    const install = header.indexOf('InstallAppButton')
    const menu = header.indexOf('HeaderMenu')

    expect(install).toBeGreaterThan(brandClose)
    expect(install).toBeLessThan(menu)
  })

  it('não detecta plataforma no escopo do módulo para evitar mismatch de hidratação', () => {
    const composable = source('app/composables/usePwaInstall.ts')

    expect(composable).not.toMatch(/ref(?:<[^>]+>)?\(detectPlatform\(\)\)/)
    expect(composable).not.toMatch(/ref(?:<[^>]+>)?\(detectStandalone\(\)\)/)
    expect(composable).not.toMatch(/ref(?:<[^>]+>)?\(detectSafariOnIOS\(\)\)/)
    expect(composable).toMatch(/platform = ref(?:<Platform>)?\(['"]other['"]\)/)
    expect(composable).toMatch(/isStandalone = ref\(false\)/)
    expect(composable).toMatch(/isSafariOnIOS = ref\(false\)/)
  })

  it('expõe canInstall, isStandalone, isIos e promptInstall sem auth', () => {
    const composable = source('app/composables/usePwaInstall.ts')

    expect(composable).toContain('canInstall')
    expect(composable).toContain('isStandalone')
    expect(composable).toContain('isIos')
    expect(composable).toContain('promptInstall')
    expect(composable).toContain('deferredPrompt.prompt()')
    expect(composable).not.toMatch(/\b(auth|login|jwt)\b/i)
  })

  it('oculta o CTA em standalone e tem alvo de toque de pelo menos 44px', () => {
    const btn = source('app/components/pwa/InstallAppButton.vue')

    expect(btn).toMatch(/v-if="(!isStandalone|canInstall)"/)
    expect(btn).toMatch(/(?:min-width|width):\s*44px/)
    expect(btn).toMatch(/(?:min-height|height):\s*44px/)
    expect(btn).toContain('IosInstallModal')
    expect(btn).toContain('AndroidInstallModal')
  })

  it('ensina Adicionar à Tela de Início no modal iOS e o fallback Android', () => {
    expect(existsSync(resolve(root, 'app/components/pwa/IosInstallModal.vue'))).toBe(true)
    expect(existsSync(resolve(root, 'app/components/pwa/AndroidInstallModal.vue'))).toBe(true)
    expect(source('app/components/pwa/IosInstallModal.vue')).toContain('Adicionar à Tela de Início')
    expect(source('app/components/pwa/AndroidInstallModal.vue')).toContain('Adicionar à tela inicial')
    expect(source('app/components/pwa/InstallAppButton.vue')).toContain('--yellow')
    expect(source('app/components/pwa/IosInstallModal.vue')).toContain('--navy')
  })
})
