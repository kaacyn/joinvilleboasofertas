import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type Platform = 'ios' | 'android' | 'desktop' | 'other'

type NavigatorStand = Navigator & { standalone?: boolean }
type WindowMs = Window & { MSStream?: unknown }

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const pendingPrompt = ref<BeforeInstallPromptEvent | null>(null)
const platform = ref<Platform>('other')
const isStandalone = ref(false)
const isSafariOnIOS = ref(false)
const showIosModal = ref(false)
const showAndroidModal = ref(false)

let beforeInstallHandler: ((e: Event) => void) | null = null
let appInstalledHandler: (() => void) | null = null
let standaloneMql: MediaQueryList | null = null
let standaloneOnChange: ((e: MediaQueryListEvent) => void) | null = null
let mountedCount = 0

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  if (/iPad|iPhone|iPod/.test(ua) && !(window as WindowMs).MSStream) return 'ios'
  if (/Android/.test(ua)) return 'android'
  if (/Mac|Win|Linux/.test(ua)) return 'desktop'
  return 'other'
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const mqStandalone = window.matchMedia?.('(display-mode: standalone)').matches
  return Boolean(mqStandalone || (window.navigator as NavigatorStand).standalone)
}

function detectSafariOnIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as WindowMs).MSStream
  if (!isIOS) return false
  return !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua)
}

/**
 * Detecta se o JBO pode ser instalado e dispara o prompt nativo ou o modal de passos.
 */
export function usePwaInstall() {
  onMounted(() => {
    mountedCount++
    if (mountedCount > 1) return

    platform.value = detectPlatform()
    isStandalone.value = detectStandalone()
    isSafariOnIOS.value = detectSafariOnIOS()

    beforeInstallHandler = (e: Event) => {
      e.preventDefault()
      pendingPrompt.value = e as BeforeInstallPromptEvent
    }
    appInstalledHandler = () => {
      pendingPrompt.value = null
      isStandalone.value = true
    }
    window.addEventListener('beforeinstallprompt', beforeInstallHandler)
    window.addEventListener('appinstalled', appInstalledHandler)

    standaloneMql = window.matchMedia?.('(display-mode: standalone)') ?? null
    if (standaloneMql) {
      standaloneOnChange = (e: MediaQueryListEvent) => {
        isStandalone.value = e.matches || (window.navigator as NavigatorStand).standalone === true
      }
      standaloneMql.addEventListener?.('change', standaloneOnChange)
    }
  })

  onBeforeUnmount(() => {
    mountedCount--
    if (mountedCount > 0) return
    if (beforeInstallHandler) {
      window.removeEventListener('beforeinstallprompt', beforeInstallHandler)
    }
    if (appInstalledHandler) {
      window.removeEventListener('appinstalled', appInstalledHandler)
    }
    if (standaloneMql && standaloneOnChange) {
      standaloneMql.removeEventListener?.('change', standaloneOnChange)
    }
    beforeInstallHandler = null
    appInstalledHandler = null
    standaloneMql = null
    standaloneOnChange = null
  })

  const isIos = computed(() => platform.value === 'ios')
  const canInstall = computed(
    () => !isStandalone.value && (
      platform.value === 'ios'
      || platform.value === 'android'
      || pendingPrompt.value !== null
    ),
  )

  /**
   * No Android chama deferredPrompt.prompt(); no iOS abre o modal de passos.
   */
  async function promptInstall() {
    if (platform.value === 'android' && !isStandalone.value) {
      const deferredPrompt = pendingPrompt.value
      if (deferredPrompt) {
        pendingPrompt.value = null
        try {
          await deferredPrompt.prompt()
          await deferredPrompt.userChoice
        }
        catch {
          // Diálogo já consumido ou cancelado pelo navegador.
        }
      }
      else {
        showAndroidModal.value = true
      }
      return
    }
    if (isIos.value && !isStandalone.value) {
      showIosModal.value = true
      return
    }
    const deferredPrompt = pendingPrompt.value
    if (deferredPrompt && !isStandalone.value) {
      pendingPrompt.value = null
      try {
        await deferredPrompt.prompt()
        await deferredPrompt.userChoice
      }
      catch {
        // Diálogo já consumido ou cancelado pelo navegador.
      }
    }
  }

  function closeIosModal() {
    showIosModal.value = false
  }

  function closeAndroidModal() {
    showAndroidModal.value = false
  }

  return {
    canInstall,
    isStandalone,
    isIos,
    isSafariOnIOS,
    showIosModal,
    showAndroidModal,
    promptInstall,
    closeIosModal,
    closeAndroidModal,
  }
}
