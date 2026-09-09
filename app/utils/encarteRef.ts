/** Código curto do encarte (prefixo do UUID da PhotoScan) para achar no Studio. */

export function encarteRefCode(id: string | null | undefined): string {
  const compact = String(id || '').replace(/-/g, '').toUpperCase()
  if (!compact) return ''
  return compact.slice(0, 8)
}
