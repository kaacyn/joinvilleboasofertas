export type Crumb = {
  label: string
  to?: string
}

/** Primeiro item da trilha em qualquer página interna. */
export const HOME_CRUMB: Crumb = { label: 'Início', to: '/' }

/** Monta a trilha com Início na frente. O último item deve ser a página atual, sem `to`. */
export function siteTrail(...rest: Crumb[]): Crumb[] {
  return [HOME_CRUMB, ...rest]
}
