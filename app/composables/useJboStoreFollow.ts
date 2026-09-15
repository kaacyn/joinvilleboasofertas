import { jboSend } from '~/utils/jboApi'
import {
  PUSH_HINT_INSTALL_IOS,
  currentPushEndpoint,
  detectPushSupport,
  ensurePushDevice,
  followInstructionMode,
  type FollowInstructionMode,
} from '~/utils/webPush'

let loadPromise: Promise<void> | null = null
const inFlight = new Map<string, Promise<void>>()

/**
 * Seguir loja no Web Push anônimo: follows compartilhados entre cards.
 * Permissão, inscrição e dispositivo ficam em `utils/webPush.ts`.
 */
export function useJboStoreFollow() {
  const followedIds = useState<string[]>('jbo:followed-stores', () => [])
  const hint = useState('jbo:follow-hint', () => '')
  const hintFor = useState('jbo:follow-hint-for', () => '')
  const pushSupported = useState('jbo:push-supported', () => true)
  const confirmOpen = useState('jbo:follow-confirm-open', () => false)
  const confirmStoreId = useState('jbo:follow-confirm-id', () => '')
  const confirmStoreName = useState('jbo:follow-confirm-name', () => '')
  const { isIos, isStandalone, promptInstall } = usePwaInstall()

  const instructionMode = computed<FollowInstructionMode>(() =>
    followInstructionMode(isIos.value, isStandalone.value),
  )

  /** Marca ou desmarca a loja na lista local (compartilhada entre os sinos). */
  function applyFollow(establishmentId: string, following: boolean) {
    if (following) {
      if (!followedIds.value.includes(establishmentId)) {
        followedIds.value = [...followedIds.value, establishmentId]
      }
      return
    }
    followedIds.value = followedIds.value.filter(id => id !== establishmentId)
  }

  /** Lê uma vez por sessão as lojas seguidas por este dispositivo. */
  async function loadOnce() {
    if (!import.meta.client) return
    if (!loadPromise) {
      loadPromise = (async () => {
        pushSupported.value = detectPushSupport()
        if (!pushSupported.value) return
        const endpoint = await currentPushEndpoint()
        if (!endpoint) return
        const q = await jboSend<{ establishment_ids: string[] }>(
          'POST',
          '/push/follows/query',
          { endpoint },
        )
        followedIds.value = q.establishment_ids || []
      })().catch(() => {
        loadPromise = null
      })
    }
    await loadPromise
  }

  onMounted(() => {
    void loadOnce()
  })

  /** True quando o dispositivo segue a loja. */
  function isFollowing(establishmentId: string): boolean {
    return followedIds.value.includes(establishmentId)
  }

  /** Fecha o modal de confirmação e limpa a loja pendente. */
  function closeConfirm() {
    confirmOpen.value = false
    confirmStoreId.value = ''
    confirmStoreName.value = ''
  }

  /** Abre confirmação ao seguir; deixa de seguir sem modal. */
  async function requestToggle(establishmentId: string, storeName: string): Promise<void> {
    hint.value = ''
    hintFor.value = establishmentId
    await loadOnce()

    if (isFollowing(establishmentId)) {
      await toggle(establishmentId)
      return
    }

    confirmStoreId.value = establishmentId
    confirmStoreName.value = storeName.trim() || 'esta loja'
    confirmOpen.value = true
  }

  /** Confirmação do modal: instala no iPhone, orienta se bloqueado, senão segue. */
  async function confirmFollow(): Promise<void> {
    const establishmentId = confirmStoreId.value
    const mode = instructionMode.value
    closeConfirm()
    if (!establishmentId) return

    if (mode === 'ios-install') {
      hintFor.value = establishmentId
      hint.value = 'Depois de instalar o app, toque no sino novamente para seguir a loja.'
      await promptInstall()
      return
    }

    if (mode === 'permission-denied') {
      hintFor.value = establishmentId
      hint.value = 'Ative as notificações nas configurações do site e tente de novo.'
      return
    }

    await toggle(establishmentId)
  }

  /** "Agora não" no modal. */
  function cancelFollow() {
    closeConfirm()
  }

  /** Permissão + inscrição + dispositivo; sem sucesso, grava o recado e devolve null. */
  async function readyEndpoint(): Promise<string | null> {
    const ready = await ensurePushDevice(isIos.value, isStandalone.value)
    if (ready.ok) return ready.endpoint
    if (ready.hint === PUSH_HINT_INSTALL_IOS) pushSupported.value = detectPushSupport()
    hint.value = ready.hint
    return null
  }

  /** Liga/desliga o follow da loja; reverte a marcação local se o PUT falhar. */
  async function toggle(establishmentId: string): Promise<void> {
    hint.value = ''
    hintFor.value = establishmentId

    await loadOnce()

    const pending = inFlight.get(establishmentId)
    if (pending) {
      await pending
      return
    }

    const run = (async () => {
      const following = !followedIds.value.includes(establishmentId)
      try {
        const endpoint = await readyEndpoint()
        if (!endpoint) return

        applyFollow(establishmentId, following)

        await jboSend('PUT', '/push/follows', {
          endpoint,
          establishment_id: establishmentId,
          following: following,
        })
      }
      catch {
        applyFollow(establishmentId, !following)
        if (!hint.value) hint.value = 'Não foi possível salvar. Tente de novo.'
      }
    })()

    inFlight.set(establishmentId, run)
    try {
      await run
    }
    finally {
      inFlight.delete(establishmentId)
    }
  }

  return {
    isFollowing,
    toggle,
    requestToggle,
    confirmFollow,
    cancelFollow,
    hint,
    hintFor,
    pushSupported,
    confirmOpen,
    confirmStoreId,
    confirmStoreName,
    instructionMode,
  }
}
