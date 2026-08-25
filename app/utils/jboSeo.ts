export function absoluteUrl(siteUrl: string, path: string): string {
  const base = String(siteUrl || '').replace(/\/$/, '')
  if (!base) return ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

export function resolveOgImage(
  siteUrl: string,
  image?: string | null,
): string | undefined {
  if (!image) return undefined
  if (/^https?:\/\//i.test(image)) return image
  return absoluteUrl(siteUrl, image) || undefined
}

export function isValidLastmod(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false
  return /^\d{4}-\d{2}-\d{2}/.test(value.trim())
}
