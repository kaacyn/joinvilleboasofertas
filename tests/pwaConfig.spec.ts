import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('PWA JBO', () => {
  it('registra @vite-pwa/nuxt em injectManifest com identidade JBO', () => {
    const pkg = source('package.json')
    expect(pkg).toContain('@vite-pwa/nuxt')

    const config = source('nuxt.config.ts')
    expect(config).toContain('@vite-pwa/nuxt')
    expect(config).toContain("injectManifest")
    expect(config).toContain("short_name: 'JBO'")
    expect(config).toContain("theme_color: '#0D131D'")
    expect(config).toContain("display: 'standalone'")
    expect(config).toMatch(/denylist:[\s\S]*\/api\//)
  })

  it('tem service worker fonte para injectManifest', () => {
    expect(existsSync(resolve(root, 'app/sw.ts')) || existsSync(resolve(root, 'public/sw.js'))).toBe(true)
  })
})
