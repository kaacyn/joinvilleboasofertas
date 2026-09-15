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
const BLOCKED_HINT = 'Notificações bloqueadas. Toque no sino.'
const NOT_GRANTED_HINT = 'Permissão não concedida. Toque no sino para tentar de novo.'
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
  let loadSeq = 0

  /** Mostra um aviso na barra por alguns segundos. */
  function say(text: string) {
    flash.value = text
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      flash.value = ''
    }, FLASH_MS)
  }

  /**
   * Busca o estado no snap-api (só no cliente, com push e inscrição existentes).
   * Marca a chamada com `loadSeq`: se uma busca mais nova ou uma ação (`apply`)
   * começar antes desta responder, o resultado atrasado é ignorado.
   */
  async function load() {
    if (!import.meta.client || !productId.value || !detectPushSupport()) return
    const seq = ++loadSeq
    const endpoint = await currentPushEndpoint()
    if (!endpoint) {
      if (seq === loadSeq && !busy.value) state.value = { ...EMPTY_FOLLOW_STATE }
      return
    }
    try {
      const next = await jboSend<ProductFollowState>('POST', '/push/product-follows/query', {
        endpoint,
        product_id: productId.value,
      })
      if (seq === loadSeq && !busy.value) state.value = next
    }
    catch {
      // Mantém o estado anterior: o sino continua usável.
    }
  }

  /**
   * Endpoint para a ação: desligar usa a inscrição atual; seguir garante permissão e dispositivo.
   * Quando a permissão não veio, distingue bloqueio definitivo (`denied`) de prompt
   * apenas dispensado/adiado (`default`), que pede um recado diferente.
   */
  async function endpointFor(action: ProductFollowAction): Promise<string | null> {
    if (action === 'unfollow_store' || action === 'unfollow_all') return currentPushEndpoint()
    const ready = await ensurePushDevice(isIos.value, isStandalone.value)
    if (ready.ok) return ready.endpoint
    if (ready.hint === PUSH_HINT_DENIED) {
      say(Notification.permission === 'denied' ? BLOCKED_HINT : NOT_GRANTED_HINT)
    }
    else {
      say(ready.hint)
    }
    return null
  }

  /**
   * Aplica a ação do sino; devolve true quando a folha pode fechar (sempre,
   * exceto quando outra ação já está em andamento — a folha fica aberta e o
   * usuário vê o estado de espera). Mesmo na falha a folha fecha, para que o
   * aviso passageiro apareça na barra em vez de ficar escondido atrás do fundo.
   * Captura produto/mercado/nome ANTES de qualquer await (a permissão do
   * navegador espera o usuário) para não gravar no produto ou mercado errado
   * se a página trocar durante a espera; só atualiza `state` se a página
   * ainda for a mesma no momento em que a resposta chega. Também avança
   * `loadSeq` para invalidar uma busca (`load`) que já estava em curso.
   */
  async function apply(action: ProductFollowAction): Promise<boolean> {
    if (busy.value) return false
    busy.value = action
    loadSeq += 1
    const target = { productId: productId.value, storeId: pageStoreId.value, storeName: pageStoreName.value }
    /** True quando produto e mercado da página ainda são os de quando a ação começou. */
    const stillOnTarget = () => productId.value === target.productId && pageStoreId.value === target.storeId
    const before = state.value
    try {
      const endpoint = await endpointFor(action)
      if (!endpoint) {
        if (action === 'unfollow_store' || action === 'unfollow_all') {
          if (stillOnTarget()) state.value = { ...EMPTY_FOLLOW_STATE }
          say('Avisos desligados')
        }
        return true
      }
      const next = await jboSend<ProductFollowState>('PUT', '/push/product-follows', {
        endpoint,
        product_id: target.productId,
        establishment_id: target.storeId,
        action,
      })
      if (stillOnTarget()) state.value = next
      say(followActionMessage(action, before, target.storeName))
      return true
    }
    catch {
      say(SAVE_FAILED)
      return true
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
