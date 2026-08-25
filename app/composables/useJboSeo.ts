import { absoluteUrl, resolveOgImage } from '~/utils/jboSeo'

type MaybeFn<T> = T | (() => T)

type JboSeoOpts = {
  title: MaybeFn<string>
  description: MaybeFn<string>
  path: MaybeFn<string>
  image?: MaybeFn<string | null | undefined>
  jsonLd?: MaybeFn<
    | Record<string, unknown>
    | Record<string, unknown>[]
    | null
    | undefined
  >
  ogType?: string
}

function resolve<T>(v: MaybeFn<T>): T {
  return typeof v === 'function' ? (v as () => T)() : v
}

/**
 * Meta SEO canônica: title/desc, OG, Twitter, canonical e JSON-LD opcional.
 */
export function useJboSeo(opts: JboSeoOpts) {
  const config = useRuntimeConfig()
  const site = String(config.public.siteUrl || '').replace(/\/$/, '')

  useSeoMeta({
    title: () => resolve(opts.title),
    description: () => resolve(opts.description),
    ogTitle: () => resolve(opts.title),
    ogDescription: () => resolve(opts.description),
    ogUrl: () => {
      if (!site) return undefined
      return absoluteUrl(site, resolve(opts.path)) || undefined
    },
    ogImage: () => {
      if (opts.image === undefined) return undefined
      return resolveOgImage(site, resolve(opts.image) ?? null)
    },
    ogType: opts.ogType || 'website',
    twitterCard: 'summary_large_image',
    twitterTitle: () => resolve(opts.title),
    twitterDescription: () => resolve(opts.description),
    twitterImage: () => {
      if (opts.image === undefined) return undefined
      return resolveOgImage(site, resolve(opts.image) ?? null)
    },
  })

  useHead(() => {
    const path = resolve(opts.path)
    const canonical = site ? absoluteUrl(site, path) : ''
    const ld = opts.jsonLd === undefined ? null : resolve(opts.jsonLd)
    const head: {
      link?: { rel: string, href: string }[]
      script?: { type: string, children: string }[]
    } = {}
    if (canonical) {
      head.link = [{ rel: 'canonical', href: canonical }]
    }
    if (ld) {
      head.script = [
        {
          type: 'application/ld+json',
          children: JSON.stringify(ld),
        },
      ]
    }
    return head
  })
}
