import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

describe('shareEncarte', () => {
  it('usa navigator.share quando existe', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText: vi.fn() } })
    const { shareEncarte } = await import('../app/utils/shareEncarte')
    await expect(shareEncarte({
      title: 'Loja',
      text: 'Encarte',
      url: 'https://example.com/encarte/1',
    })).resolves.toBe('shared')
    expect(share).toHaveBeenCalled()
  })

  it('copia o link quando navigator.share rejeita', async () => {
    const share = vi.fn().mockRejectedValue(new Error('fail'))
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share, clipboard: { writeText } })
    const { shareEncarte } = await import('../app/utils/shareEncarte')
    await expect(shareEncarte({
      title: 'Loja',
      text: 'Encarte',
      url: 'https://example.com/encarte/1',
    })).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.com/encarte/1')
  })

  it('copia o link quando navigator.share não existe', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { shareEncarte } = await import('../app/utils/shareEncarte')
    await expect(shareEncarte({
      title: 'Loja',
      text: 'Encarte',
      url: 'https://example.com/encarte/1',
    })).resolves.toBe('copied')
    expect(writeText).toHaveBeenCalledWith('https://example.com/encarte/1')
  })
})
