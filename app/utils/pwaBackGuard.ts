/** Marcador no history.state para o botão voltar não encerrar o PWA. */
export const JBO_PWA_BACK_GUARD = 'jboPwaBackGuard'

type StandaloneWindow = {
  matchMedia?: (query: string) => { matches: boolean }
  navigator: { standalone?: boolean }
}

/** True em display-mode standalone ou iOS “Adicionar à Tela de Início”. */
export function detectPwaStandalone(win: StandaloneWindow): boolean {
  const mqStandalone = win.matchMedia?.('(display-mode: standalone)').matches
  return Boolean(mqStandalone || win.navigator.standalone)
}

export function hasPwaBackGuard(state: unknown): boolean {
  return Boolean(
    state
    && typeof state === 'object'
    && (state as Record<string, unknown>)[JBO_PWA_BACK_GUARD] === true,
  )
}

/**
 * Empilha uma entrada-sentinela na URL atual, preservando o state do vue-router.
 */
export function pushPwaBackGuard(history: History, locationHref: string): void {
  const prev = history.state
  const base = prev && typeof prev === 'object' ? { ...(prev as object) } : {}
  history.pushState({ ...base, [JBO_PWA_BACK_GUARD]: true }, '', locationHref)
}

export type PwaBackAction = 'arm' | 'go-home' | 'noop'

/**
 * Decide o que fazer após um popstate no PWA standalone.
 * - home → rearmar sentinela (voltar não fecha o app)
 * - rota profunda com histórico esgotado → ir para a home em vez de sair
 */
export function nextPwaBackAction(opts: {
  isStandalone: boolean
  pathname: string
  historyLength: number
}): PwaBackAction {
  if (!opts.isStandalone) return 'noop'
  if (opts.pathname === '/' || opts.pathname === '') return 'arm'
  if (opts.historyLength <= 1) return 'go-home'
  return 'noop'
}
