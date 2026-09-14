import { effectScope } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useShareLink } from '../app/composables/useShareLink'

const payload = {
  title: 'Ofertas em Bistek Supermercados',
  text: 'Veja as ofertas de Bistek Supermercados no Joinville Boas Ofertas',
  url: 'https://joinvilleboasofertas.com.br/loja/bistek-supermercados',
}

describe('useShareLink (compartilhar a página com retorno visível)', () => {
  let dispose: (() => void) | undefined

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    dispose?.()
    dispose = undefined
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function setup() {
    const scope = effectScope()
    const share = scope.run(() => useShareLink())!
    dispose = () => scope.stop()
    return share
  }

  it('sem folha nativa copia o link e avisa por 2 s', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    const { status, share } = setup()

    await share(payload)

    expect(writeText).toHaveBeenCalledWith(payload.url)
    expect(status.value).toBe('copied')
    vi.advanceTimersByTime(1999)
    expect(status.value).toBe('copied')
    vi.advanceTimersByTime(1)
    expect(status.value).toBe('idle')
  })

  it('com folha nativa não mostra aviso (o sistema já dá o retorno)', async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share: nativeShare, clipboard: { writeText: vi.fn() } })
    const { status, share } = setup()

    await share(payload)

    expect(nativeShare).toHaveBeenCalledWith(payload)
    expect(status.value).toBe('idle')
  })

  it('usuário fechou a folha nativa: nada de erro nem cópia', async () => {
    const writeText = vi.fn()
    const abort = new DOMException('cancelado', 'AbortError')
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(abort), clipboard: { writeText } })
    const { status, share } = setup()

    await expect(share(payload)).resolves.toBeUndefined()

    expect(writeText).not.toHaveBeenCalled()
    expect(status.value).toBe('idle')
  })

  it('sem folha nem área de transferência avisa que falhou', async () => {
    vi.stubGlobal('navigator', {})
    const { status, share } = setup()

    await share(payload)

    expect(status.value).toBe('failed')
    vi.advanceTimersByTime(2000)
    expect(status.value).toBe('idle')
  })

  it('novo compartilhamento reinicia o prazo do aviso', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
    const { status, share } = setup()

    await share(payload)
    vi.advanceTimersByTime(1500)
    await share(payload)
    vi.advanceTimersByTime(1500)

    expect(status.value).toBe('copied')
  })
})
