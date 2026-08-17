export type SharePayload = {
  title: string
  text: string
  url: string
}

export type ShareResult = 'shared' | 'copied'

function canUseNativeShare(payload: SharePayload): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return false
  }
  if (typeof navigator.canShare !== 'function') return true
  try {
    return navigator.canShare(payload)
  }
  catch {
    return true
  }
}

async function copyUrl(url: string): Promise<'copied'> {
  if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
    throw new Error('Compartilhar indisponível')
  }
  await navigator.clipboard.writeText(url)
  return 'copied'
}

/** Folha nativa quando existir; senão copia o link. Só no cliente. */
export async function shareEncarte(payload: SharePayload): Promise<ShareResult> {
  if (import.meta.server || typeof navigator === 'undefined') {
    throw new Error('shareEncarte só roda no cliente')
  }

  if (canUseNativeShare(payload)) {
    try {
      await navigator.share(payload)
      return 'shared'
    }
    catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
    }
  }

  return copyUrl(payload.url)
}
