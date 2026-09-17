import { onBeforeUnmount, onMounted } from 'vue'
import {
  detectPwaStandalone,
  hasPwaBackGuard,
  nextPwaBackAction,
  pushPwaBackGuard,
} from '~/utils/pwaBackGuard'

/**
 * No Android (PWA standalone), o botão voltar fecha o app quando o histórico acaba.
 * Mantém uma sentinela na home e, em deep link sem histórico, volta para `/`.
 */
export function usePwaBackGuard() {
  const router = useRouter()
  const route = useRoute()

  let stopAfterEach: (() => void) | null = null
  let handlePopState: (() => void) | null = null

  onMounted(() => {
    if (!detectPwaStandalone(window)) return

    function arm() {
      if (hasPwaBackGuard(window.history.state)) return
      pushPwaBackGuard(window.history, window.location.href)
    }

    handlePopState = () => {
      requestAnimationFrame(() => {
        const action = nextPwaBackAction({
          isStandalone: detectPwaStandalone(window),
          pathname: route.path,
          historyLength: window.history.length,
        })
        if (action === 'arm') {
          arm()
          return
        }
        if (action === 'go-home') {
          void router.replace('/').then(() => arm())
        }
      })
    }

    arm()

    stopAfterEach = router.afterEach((to) => {
      if (to.path === '/') {
        requestAnimationFrame(() => arm())
      }
    })

    window.addEventListener('popstate', handlePopState)
  })

  onBeforeUnmount(() => {
    stopAfterEach?.()
    if (handlePopState) {
      window.removeEventListener('popstate', handlePopState)
    }
    stopAfterEach = null
    handlePopState = null
  })
}
