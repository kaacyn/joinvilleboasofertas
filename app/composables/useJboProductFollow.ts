import type { Ref } from 'vue'
import { jboSend } from '~/utils/jboApi'
import {
  EMPTY_FOLLOW_STATE,
  followActionMessage,
  type ProductFollowAction,
  type ProductFollowState,
} from '~/utils/productFollow'
import {
  PUSH_HINT_DENIED,
  currentPushEndpoint,
  detectPushSupport,
  ensurePushDevice,
} from '~/utils/webPush'

const FLASH_MS = 2200
const BLOCKED_HINT = 'Notificações bloqueadas. Toque no sino para ver como liberar.'
const SAVE_FAILED = 'Não foi possível salvar. Tente de novo.'

/**
 * Sino do produto: estado do dispositivo para o produto (none, all ou stores),
 * ações a partir do mercado da página e o aviso passageiro da barra.
 */
export function useJboProductFollow(
  productId: Ref<string>,
  pageStoreId: Ref<string>,
  pageStoreName: Ref<string>,
) {
  const state = ref<ProductFollowState>({ ...EMPTY_FOLLOW_STATE })
  const busy = ref<ProductFollowAction | ''>('')
  const flash = ref('')
  const { isIos, isStandalone } = usePwaInstall()
  let flashTimer: ReturnType<typeof setTimeout> | undefined

  /** Mostra um aviso na barra por alguns segundos. */
  function say(text: string) {
    flash.value = text
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      flash.value = ''
    }, FLASH_MS)
  }

  /** Busca o estado no snap-api (só no cliente, com push e inscrição existentes). */
  async function load() {
    if (!import.meta.client || !productId.value || !detectPushSupport()) return
    const endpoint = await currentPushEndpoint()
    if (!endpoint) {
      state.value = { ...EMPTY_FOLLOW_STATE }
      return
    }
    try {
      state.value = await jboSend<ProductFollowState>('POST', '/push/product-follows/query', {
        endpoint,
        product_id: productId.value,
      })
    }
    catch {
      // Mantém o estado anterior: o sino continua usável.
    }
  }

  /** Endpoint para a ação: desligar usa a inscrição atual; seguir garante permissão e dispositivo. */
  async function endpointFor(action: ProductFollowAction): Promise<string | null> {
    if (action === 'unfollow_store' || action === 'unfollow_all') return currentPushEndpoint()
    const ready = await ensurePushDevice(isIos.value, isStandalone.value)
    if (ready.ok) return ready.endpoint
    say(ready.hint === PUSH_HINT_DENIED ? BLOCKED_HINT : ready.hint)
    return null
  }

  /** Aplica a ação do sino; devolve true quando a folha pode fechar. */
  async function apply(action: ProductFollowAction): Promise<boolean> {
    if (busy.value) return false
    busy.value = action
    const before = state.value
    try {
      const endpoint = await endpointFor(action)
      if (!endpoint) {
        if (action === 'unfollow_store' || action === 'unfollow_all') {
          state.value = { ...EMPTY_FOLLOW_STATE }
        }
        return true
      }
      state.value = await jboSend<ProductFollowState>('PUT', '/push/product-follows', {
        endpoint,
        product_id: productId.value,
        establishment_id: pageStoreId.value,
        action,
      })
      say(followActionMessage(action, before, pageStoreName.value))
      return true
    }
    catch {
      say(SAVE_FAILED)
      return false
    }
    finally {
      busy.value = ''
    }
  }

  onMounted(() => {
    void load()
  })
  watch([productId, pageStoreId], () => {
    void load()
  })
  onBeforeUnmount(() => clearTimeout(flashTimer))

  return { state, busy, flash, apply, load }
}
