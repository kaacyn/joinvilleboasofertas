import { onScopeDispose, ref } from 'vue'
import { shareEncarte, type SharePayload } from '~/utils/shareEncarte'

export type ShareLinkStatus = 'idle' | 'copied' | 'failed'

const FEEDBACK_MS = 2000

/**
 * Compartilha pela folha nativa ou copia o link. `status` fica em `copied`
 * ou `failed` por 2 s para a tela avisar; a folha nativa já é o retorno.
 */
export function useShareLink() {
  const status = ref<ShareLinkStatus>('idle')
  let timer: ReturnType<typeof setTimeout> | undefined

  function flash(next: Exclude<ShareLinkStatus, 'idle'>) {
    status.value = next
    clearTimeout(timer)
    timer = setTimeout(() => {
      status.value = 'idle'
    }, FEEDBACK_MS)
  }

  async function share(payload: SharePayload): Promise<void> {
    try {
      const result = await shareEncarte(payload)
      if (result === 'copied') flash('copied')
    }
    catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      flash('failed')
    }
  }

  onScopeDispose(() => clearTimeout(timer))

  return { status, share }
}
