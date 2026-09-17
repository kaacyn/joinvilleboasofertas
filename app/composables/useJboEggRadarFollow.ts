import { jboSend } from '~/utils/jboApi'
import {
  EGG_RADAR_OFF_MESSAGE,
  EGG_RADAR_ON_MESSAGE,
  EGG_RADAR_SAVE_FAILED,
  eggRadarBlockedHint,
  eggRadarPermissionHint,
  type EggRadarState,
} from '~/utils/eggRadar'
import {
  currentPushEndpoint,
  detectPushSupport,
  ensurePushDevice,
  followInstructionMode,
} from '~/utils/webPush'

const FLASH_MS = 2600

/**
 * Sino do Radar do ovo: estado do dispositivo (segue ou não), ligar/desligar
 * no snap-api (`/push/egg-radar*`) e o aviso passageiro da barra.
 */
export function useJboEggRadarFollow() {
  const following = ref(false)
  const busy = ref(false)
  const flash = ref('')
  const { isIos, isStandalone, promptInstall } = usePwaInstall()
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
   * Uma ação iniciada antes da resposta avança `loadSeq` e descarta o resultado atrasado.
   */
  async function load() {
    if (!import.meta.client || !detectPushSupport()) return
    const seq = ++loadSeq
    const endpoint = await currentPushEndpoint()
    if (!endpoint) return
    try {
      const next = await jboSend<EggRadarState>('POST', '/push/egg-radar/query', { endpoint })
      if (seq === loadSeq && !busy.value) following.value = next.following
    }
    catch {
      // Mantém o estado anterior: o sino continua usável.
    }
  }

  /** Desliga com a inscrição atual; sem inscrição, o aviso já não chegaria. */
  async function turnOff() {
    const endpoint = await currentPushEndpoint()
    if (endpoint) {
      const next = await jboSend<EggRadarState>('PUT', '/push/egg-radar', { endpoint, following: false })
      following.value = next.following
    }
    else {
      following.value = false
    }
    say(EGG_RADAR_OFF_MESSAGE)
  }

  /**
   * Liga: iPhone fora do app abre o passo a passo de instalação; navegador sem
   * push só avisa; senão pede permissão, registra o dispositivo e grava o follow.
   */
  async function turnOn() {
    const blocked = eggRadarBlockedHint(followInstructionMode(isIos.value, isStandalone.value), isIos.value)
    if (blocked) {
      say(blocked)
      if (isIos.value) await promptInstall()
      return
    }
    const ready = await ensurePushDevice(isIos.value, isStandalone.value)
    if (!ready.ok) {
      const permission = typeof Notification === 'undefined' ? '' : Notification.permission
      say(eggRadarPermissionHint(ready.hint, permission))
      return
    }
    const next = await jboSend<EggRadarState>('PUT', '/push/egg-radar', {
      endpoint: ready.endpoint,
      following: true,
    })
    following.value = next.following
    say(EGG_RADAR_ON_MESSAGE)
  }

  /** Toque no sino: alterna o estado; ignora toques enquanto uma ação roda. */
  async function toggle() {
    if (busy.value) return
    busy.value = true
    loadSeq += 1
    try {
      if (following.value) await turnOff()
      else await turnOn()
    }
    catch {
      say(EGG_RADAR_SAVE_FAILED)
    }
    finally {
      busy.value = false
    }
  }

  onMounted(() => {
    void load()
  })
  onBeforeUnmount(() => clearTimeout(flashTimer))

  return { following, busy, flash, toggle, load }
}
