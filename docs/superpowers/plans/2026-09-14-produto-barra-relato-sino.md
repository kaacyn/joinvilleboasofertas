# Página do produto: barra com reportar erro, compartilhar e sino por mercado (JBO) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** acima do título da página `/produto/{slug}/{loja}`, uma barra com três ícones — Reportar um erro (folha com motivo, comentário e contato), Compartilhar e Sino (seguir o produto só no mercado da página ou em todos) — com a UX aprovada no protótipo.

**Architecture:** o código de Web Push sai de `useJboStoreFollow` para `app/utils/webPush.ts` (sem mudar o comportamento da loja) e passa a servir também o produto. A lógica do sino e do relato fica em utils puros (`productFollow.ts`, `offerReport.ts`) com testes de comportamento; componentes e composable seguem o padrão do repo (teste por asserção no código-fonte). `ProductActionsBar` concentra os três botões, a linha de avisos e as duas folhas.

**Tech Stack:** Nuxt 4 (auto-import de `composables/`), Vue 3.5, `$fetch`, Vitest 2 + happy-dom.

**Spec:** `/root/Docker/projetos/dev-snap-api/docs/superpowers/specs/2026-09-14-jbo-produto-relatos-e-sino-design.md` (seção 3). Protótipo: https://claude.ai/code/artifact/456d9411-bbb9-41fb-91d5-70c456237544. **Etapa 4 de 4**; depende das Etapas 1 e 3 publicadas no snap-api de dev (`POST /offer-reports`, `/push/product-follows*`).

## Global Constraints

- Repo `/root/Docker/projetos/dev-joinvilleboasofertas`, branch `develop` (é um git worktree; rode tudo a partir dele). Antes: `git -C /root/Docker/projetos/dev-joinvilleboasofertas pull --ff-only origin develop`. Os commits locais `286d0b4` e `5071681` (home) sobem junto no primeiro push — autorizado pelo usuário.
- Commit direto na `develop` + `git push origin develop`; mensagens terminam com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- JSDoc em português em toda função nova/alterada; imports só no topo.
- Testes: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- <arquivo>` (não use `npm test`). Build: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas build`.
- O container de dev embute o build: no fim, `docker compose -f /root/Docker/projetos/dev-joinvilleboasofertas/docker-compose.yml up -d --build app`.
- Tokens visuais (`app/assets/css/tokens.css`): `--surface`, `--line`, `--bg`, `--ink`, `--ink-2`, `--ink-3`, `--yellow`, `--yellow-soft`, `--yellow-ink`, `--red`, `--red-soft`, `--green`, `--green-soft`, `--shadow`, `--head`, `--body`. Folhas: sobem de baixo no celular e viram janela centralizada a partir de 560 px (padrão `StoreAddressesSheet`), com `useDialogLock`.
- Botões da barra: 44×44, só ícone, nome em `aria-label`/`title`; ordem **Reportar um erro · Compartilhar · Sino**.
- Textos do sino (aprovados): opções "Só no {mercado}" / "Também no {mercado}" e "Em todos os mercados"; nenhuma pré-selecionada; tocar ativa; legendas "Avisos neste mercado", "Avisos aqui e em mais N mercado(s)", "Avisos em todos os mercados", "Você segue em outro mercado".
- Moeda nos testes: `formatMoney` usa espaço não separável (`const nbsp = ' '`, como em `tests/offerPrice.spec.ts`).

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/utils/webPush.ts` (novo) | suporte, instruções, registration, endpoint, `ensurePushDevice` |
| `app/composables/useJboStoreFollow.ts` | passa a usar `webPush.ts` (mesmo comportamento) |
| `app/components/PushInstructions.vue` (novo) | passo a passo iPhone/bloqueado, compartilhado |
| `app/components/StoreFollowConfirmModal.vue` | usa `PushInstructions` |
| `app/sw.ts` | respeita `renotify` do payload |
| `app/utils/offerReport.ts` (novo) | motivos, validação, payload e mensagens do relato |
| `app/components/offers/ReportOfferSheet.vue` (novo) | folha "Reportar um erro" |
| `app/utils/productFollow.ts` (novo) | estado, legendas, textos da folha e mensagens do sino |
| `app/composables/useJboProductFollow.ts` (novo) | estado do produto no snap-api e ações |
| `app/components/offers/ProductFollowSheet.vue` (novo) | folha do sino |
| `app/components/offers/ProductActionsBar.vue` (novo) | barra + folhas |
| `app/pages/produto/[slug]/[[loja]].vue` | barra acima do título; sai o compartilhar antigo |
| `README.md` | página do produto |
| Testes | `tests/webPush.spec.ts`, `tests/jboStoreFollow.spec.ts`, `tests/offerReport.spec.ts`, `tests/productFollow.spec.ts`, `tests/productActionsBar.spec.ts`, `tests/productPage.spec.ts`, `tests/offerTitle.spec.ts` |

---

### Task 1: `webPush.ts` compartilhado (refatoração sem mudar a loja) + `renotify` no SW

**Files:**
- Create: `app/utils/webPush.ts`, `app/components/PushInstructions.vue`, `tests/webPush.spec.ts`
- Modify: `app/composables/useJboStoreFollow.ts`, `app/components/StoreFollowConfirmModal.vue`, `app/sw.ts`, `tests/jboStoreFollow.spec.ts`

**Interfaces:**
- Produces (`app/utils/webPush.ts`): `PUSH_HINT_INSTALL_IOS`, `PUSH_HINT_DENIED`, `type FollowInstructionMode`, `type PushReady = { ok: true, endpoint: string } | { ok: false, hint: string }`, `urlBase64ToUint8Array(s)`, `detectPushSupport()`, `getPushRegistration()`, `currentPushEndpoint()`, `followInstructionMode(isIos, isStandalone)`, `ensurePushDevice(isIos, isStandalone): Promise<PushReady>`.
- Produces: `PushInstructions` — props `mode: 'ios-install' | 'permission-denied'`, `goal?: string` (padrão "seguir a loja").
- `useJboStoreFollow` mantém o mesmo retorno (a loja não muda); deixa de exportar `urlBase64ToUint8Array`/`followInstructionMode` (evita nome duplicado no auto-import do Nuxt).

- [ ] **Step 1: Teste de comportamento que falha**

`tests/webPush.spec.ts`:

```ts
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PUSH_HINT_DENIED,
  PUSH_HINT_INSTALL_IOS,
  ensurePushDevice,
  urlBase64ToUint8Array,
} from '../app/utils/webPush'

type StubOptions = { permission?: string, requestResult?: string, existing?: unknown }

/** Navegador com Notification, PushManager, service worker e $fetch falsos. */
function stubBrowser({ permission = 'granted', requestResult = 'granted', existing = null }: StubOptions = {}) {
  const requestPermission = vi.fn(async () => requestResult)
  vi.stubGlobal('Notification', { permission, requestPermission })
  vi.stubGlobal('PushManager', class {})
  const subscription = {
    endpoint: 'https://push.example/1',
    toJSON: () => ({ endpoint: 'https://push.example/1', keys: { p256dh: 'p', auth: 'a' } }),
  }
  const pushManager = {
    getSubscription: vi.fn(async () => existing),
    subscribe: vi.fn(async () => subscription),
  }
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: vi.fn(async () => ({ pushManager })), ready: new Promise(() => {}) },
  })
  const fetchMock = vi.fn(async (url: string) =>
    url.endsWith('/push/vapid-public-key') ? { public_key: 'AQID' } : { ok: true },
  )
  vi.stubGlobal('$fetch', fetchMock)
  // jboApi chama useRuntimeConfig() mesmo no browser (auto-import do Nuxt, ausente no vitest).
  vi.stubGlobal('useRuntimeConfig', () => ({ apiBase: '', apiToken: '' }))
  return { requestPermission, pushManager, fetchMock }
}

afterEach(() => {
  vi.unstubAllGlobals()
  delete (navigator as unknown as Record<string, unknown>).serviceWorker
})

describe('webPush', () => {
  it('converte VAPID base64url em bytes', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })

  it('iPhone fora do app: recado de instalação sem pedir permissão', async () => {
    const { requestPermission } = stubBrowser({ permission: 'default' })
    expect(await ensurePushDevice(true, false)).toEqual({ ok: false, hint: PUSH_HINT_INSTALL_IOS })
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('permissão negada no prompt: recado e nenhuma inscrição', async () => {
    const { pushManager } = stubBrowser({ permission: 'default', requestResult: 'denied' })
    expect(await ensurePushDevice(false, false)).toEqual({ ok: false, hint: PUSH_HINT_DENIED })
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })

  it('com permissão: inscreve com a chave VAPID e registra o dispositivo', async () => {
    const { pushManager, fetchMock } = stubBrowser({ permission: 'default' })
    const ready = await ensurePushDevice(false, false)
    expect(ready).toEqual({ ok: true, endpoint: 'https://push.example/1' })
    const options = pushManager.subscribe.mock.calls[0][0] as { userVisibleOnly: boolean, applicationServerKey: Uint8Array }
    expect(options.userVisibleOnly).toBe(true)
    expect(Array.from(options.applicationServerKey)).toEqual([1, 2, 3])
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/public/jbo/push/devices',
      expect.objectContaining({
        method: 'PUT',
        body: expect.objectContaining({ endpoint: 'https://push.example/1', p256dh: 'p', auth: 'a' }),
      }),
    )
  })

  it('reaproveita a inscrição existente', async () => {
    const existing = {
      endpoint: 'https://push.example/old',
      toJSON: () => ({ endpoint: 'https://push.example/old', keys: { p256dh: 'p', auth: 'a' } }),
    }
    const { pushManager } = stubBrowser({ existing })
    expect(await ensurePushDevice(false, true)).toEqual({ ok: true, endpoint: 'https://push.example/old' })
    expect(pushManager.subscribe).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/webPush.spec.ts`
Expected: FAIL (`Failed to resolve import "../app/utils/webPush"`).

- [ ] **Step 3: `app/utils/webPush.ts`**

```ts
/** Web Push anônimo do JBO: suporte, permissão, inscrição e dispositivo no snap-api. */

import { jboGet, jboSend } from '~/utils/jboApi'

const SW_READY_MS = 4000

export const PUSH_HINT_INSTALL_IOS = 'Para receber avisos no iPhone, instale o app na tela inicial.'
export const PUSH_HINT_DENIED = 'Permissão de notificação negada.'

export type FollowInstructionMode =
  | 'ios-install'
  | 'request-permission'
  | 'permission-denied'
  | 'ready'

export type PushReady = { ok: true, endpoint: string } | { ok: false, hint: string }

let vapidKey = ''

/** Converte a chave VAPID pública (base64url) em bytes para o PushManager. */
export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const b64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

/** True quando o navegador tem Notification, PushManager e service worker. */
export function detectPushSupport(): boolean {
  return typeof window !== 'undefined'
    && 'Notification' in window
    && 'PushManager' in window
    && 'serviceWorker' in navigator
}

/** Registration atual, ou `ready` com timeout — `ready` sozinho nunca rejeita. */
export async function getPushRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const existing = await navigator.serviceWorker.getRegistration()
  if (existing) return existing
  const timeout = new Promise<null>((resolve) => {
    setTimeout(() => resolve(null), SW_READY_MS)
  })
  return Promise.race([navigator.serviceWorker.ready, timeout])
}

/** Endpoint da inscrição push atual; null sem inscrição ou sem service worker. */
export async function currentPushEndpoint(): Promise<string | null> {
  try {
    const reg = await getPushRegistration()
    if (!reg) return null
    const sub = await reg.pushManager.getSubscription()
    return sub?.endpoint || null
  }
  catch {
    return null
  }
}

/** Define o passo a passo conforme plataforma e permissão atual do navegador. */
export function followInstructionMode(
  isIos: boolean,
  isStandalone: boolean,
): FollowInstructionMode {
  if (typeof window === 'undefined') return 'request-permission'
  if (!detectPushSupport() || (isIos && !isStandalone)) return 'ios-install'
  if (Notification.permission === 'denied') return 'permission-denied'
  if (Notification.permission === 'default') return 'request-permission'
  return 'ready'
}

/** Chave VAPID pública do snap-api (uma busca por sessão). */
async function publicVapidKey(): Promise<string> {
  if (!vapidKey) {
    const vapid = await jboGet<{ public_key: string }>('/push/vapid-public-key')
    vapidKey = vapid.public_key || ''
  }
  return vapidKey
}

/**
 * Garante permissão, inscrição e dispositivo registrado no snap-api.
 * Checa suporte e iPhone fora do app antes de pedir permissão; devolve o
 * endpoint ou o recado para a tela. Falha de rede/SW sobe como exceção.
 */
export async function ensurePushDevice(isIos: boolean, isStandalone: boolean): Promise<PushReady> {
  if (!detectPushSupport() || (isIos && !isStandalone)) {
    return { ok: false, hint: PUSH_HINT_INSTALL_IOS }
  }
  if (Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return { ok: false, hint: PUSH_HINT_DENIED }
  }
  const reg = await getPushRegistration()
  if (!reg) throw new Error('Service worker indisponível')
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(await publicVapidKey()),
    })
  }
  const json = sub.toJSON()
  const endpoint = json.endpoint
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!endpoint || !p256dh || !auth) throw new Error('incomplete')
  await jboSend('PUT', '/push/devices', {
    endpoint,
    p256dh,
    auth,
    user_agent: navigator.userAgent,
  })
  return { ok: true, endpoint }
}
```

- [ ] **Step 4: `useJboStoreFollow.ts` usando o `webPush.ts`**

Substituir o arquivo inteiro por:

```ts
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
```

- [ ] **Step 5: `PushInstructions.vue` e o modal da loja**

`app/components/PushInstructions.vue`:

```vue
<template>
  <ol class="push-steps" data-test="push-instructions">
    <template v-if="mode === 'ios-install'">
      <li>Instale o app na <strong>tela inicial</strong> do celular (menu Instalar app).</li>
      <li>Abra o app instalado e toque no sino novamente.</li>
      <li>Permita as notificações quando o iPhone pedir.</li>
    </template>
    <template v-else>
      <li>As notificações estão <strong>bloqueadas</strong> neste navegador.</li>
      <li>Abra as configurações do site (ícone de cadeado na barra de endereço).</li>
      <li>Ative <strong>Notificações</strong> e volte aqui para {{ goal }}.</li>
    </template>
  </ol>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  mode: 'ios-install' | 'permission-denied'
  goal?: string
}>(), {
  goal: 'seguir a loja',
})
</script>

<style scoped>
.push-steps {
  margin: 0;
  padding-left: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  color: var(--muted);
  font-size: 0.88rem;
  line-height: 1.4;
}

.push-steps strong {
  color: var(--ink);
  font-weight: 700;
}
</style>
```

Em `app/components/StoreFollowConfirmModal.vue`, trocar os dois primeiros `<ol>` (modos `ios-install` e `permission-denied`) por:

```html
          <PushInstructions
            v-if="instructionMode === 'ios-install' || instructionMode === 'permission-denied'"
            :mode="instructionMode"
          />
```

e o `<ol v-else-if="instructionMode === 'request-permission'"` seguinte passa a ser `<ol v-else-if="instructionMode === 'request-permission'" class="follow-modal__list">` (sem mudança) — ou seja, a cadeia fica `PushInstructions v-if` → `ol v-else-if request-permission` → `ol v-else`.

- [ ] **Step 6: `renotify` no service worker**

Em `app/sw.ts`: acrescentar `renotify?: boolean` ao tipo `PushPayload` e, no objeto de `showNotification`, depois de `tag: payload?.tag,`:

```ts
    renotify: Boolean(payload?.tag && payload?.renotify),
```

- [ ] **Step 7: Atualizar as asserções da loja para o arquivo novo**

Em `tests/jboStoreFollow.spec.ts`, substituir os testes afetados:

```ts
  it('tem composable com follow compartilhado e toggle; VAPID no webPush', () => {
    const path = 'app/composables/useJboStoreFollow.ts'
    expect(existsSync(resolve(root, path))).toBe(true)

    const src = source(path)
    expect(src).toContain("useState<string[]>('jbo:followed-stores'")
    expect(src).toContain('isFollowing')
    expect(src).toContain('function toggle')
    expect(src).toContain('requestToggle')
    expect(src).toContain('confirmFollow')
    expect(src).toContain("useState('jbo:follow-confirm-open'")
    expect(src).toContain("'/push/follows/query'")
    expect(src).toContain('ensurePushDevice')
    expect(src).toContain('usePwaInstall')
    const push = source('app/utils/webPush.ts')
    expect(push).toContain("'/push/vapid-public-key'")
    expect(push).toContain('urlBase64ToUint8Array')
  })

  it('toggle pede permissão, registra device e grava o follow', () => {
    const push = source('app/utils/webPush.ts')
    expect(push).toContain('Notification.requestPermission')
    expect(push).toContain('userVisibleOnly: true')
    expect(push).toContain('applicationServerKey')
    expect(push).toContain("'/push/devices'")
    expect(push).toContain('p256dh')
    expect(push).toContain('user_agent')
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain("'/push/follows'")
    expect(src).toContain('following:')
  })

  it('não finge follow se a permissão for negada', () => {
    const push = source('app/utils/webPush.ts')
    expect(push).toMatch(/!== ['"]granted['"]/)
    expect(push).toContain('Permissão de notificação negada')
    const toggleFn = source('app/composables/useJboStoreFollow.ts').slice(
      source('app/composables/useJboStoreFollow.ts').indexOf('async function toggle'),
    )
    expect(toggleFn.indexOf('if (!endpoint) return')).toBeLessThan(toggleFn.indexOf('applyFollow('))
  })

  it('checa iOS e PushManager antes de pedir permissão', () => {
    const push = source('app/utils/webPush.ts')
    const ensure = push.slice(push.indexOf('export async function ensurePushDevice'))
    const ios = ensure.indexOf('isIos && !isStandalone')
    const support = ensure.indexOf('detectPushSupport()')
    const perm = ensure.indexOf('Notification.requestPermission')
    expect(ios).toBeGreaterThan(-1)
    expect(support).toBeGreaterThan(-1)
    expect(ios).toBeLessThan(perm)
    expect(support).toBeLessThan(perm)
  })

  it('não espera serviceWorker.ready sem limite', () => {
    const push = source('app/utils/webPush.ts')
    expect(push).toContain('getRegistration')
    expect(push).toMatch(/Promise\.race|setTimeout/)
  })

  it('mostra recado no iOS fora de standalone e sem PushManager', () => {
    const src = source('app/composables/useJboStoreFollow.ts')
    expect(src).toContain('isIos')
    expect(src).toContain('isStandalone')
    const push = source('app/utils/webPush.ts')
    expect(push).toContain('PushManager')
    expect(push).toContain('instale o app na tela inicial')
  })
```

Apagar o teste `'converte VAPID base64url em bytes'` deste arquivo (foi para `tests/webPush.spec.ts`). No teste do SW, acrescentar `expect(sw).toContain('renotify: Boolean(payload?.tag && payload?.renotify)')`. No teste do modal, acrescentar `expect(modal).toContain('<PushInstructions')`.

- [ ] **Step 8: Rodar e ver passar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/webPush.spec.ts tests/jboStoreFollow.spec.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git -C /root/Docker/projetos/dev-joinvilleboasofertas add app/utils/webPush.ts app/composables/useJboStoreFollow.ts app/components/PushInstructions.vue app/components/StoreFollowConfirmModal.vue app/sw.ts tests/webPush.spec.ts tests/jboStoreFollow.spec.ts
git -C /root/Docker/projetos/dev-joinvilleboasofertas commit -m "refactor(push): Web Push em utils/webPush para servir loja e produto

Permissão, inscrição e dispositivo saem do useJboStoreFollow sem mudar o
comportamento da loja; passo a passo iPhone/bloqueado vira componente e
o SW respeita renotify.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git -C /root/Docker/projetos/dev-joinvilleboasofertas push origin develop
```

---

### Task 2: Relato de erro (utils + folha)

**Files:**
- Create: `app/utils/offerReport.ts`, `app/components/offers/ReportOfferSheet.vue`, `tests/offerReport.spec.ts`

**Interfaces:**
- Produces (`offerReport.ts`): `type ReportReason`, `REPORT_REASONS`, `REPORT_COMMENT_MAX = 500`, `REPORT_CONTACT_MAX = 120`, `type ReportDraft`, `commentRequired(reason)`, `reportBlocker(draft) -> string`, `reportPayload(offerId, draft)`, `reportErrorMessage(error) -> string`.
- Produces: `ReportOfferSheet` — props `open`, `offerId`, `productTitle`, `storeName`; emit `close`.

- [ ] **Step 1: Testes que falham**

`tests/offerReport.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  REPORT_REASONS,
  commentRequired,
  reportBlocker,
  reportErrorMessage,
  reportPayload,
} from '../app/utils/offerReport'

const root = resolve(import.meta.dirname, '..')
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('relato de erro da oferta', () => {
  it('tem os quatro motivos na ordem aprovada', () => {
    expect(REPORT_REASONS.map(r => r.value)).toEqual(['price', 'product', 'unavailable', 'other'])
    expect(REPORT_REASONS[0].label).toBe('Preço diferente do encarte ou da loja')
    expect(REPORT_REASONS[3].label).toBe('Outro')
  })

  it('bloqueia envio sem motivo e sem comentário em "Outro"', () => {
    expect(reportBlocker({ reason: '', comment: '', contact: '' })).toBe('Escolha o que está errado.')
    expect(reportBlocker({ reason: 'other', comment: '   ', contact: '' })).toBe('Conte o que está errado.')
    expect(reportBlocker({ reason: 'other', comment: 'foto errada', contact: '' })).toBe('')
    expect(reportBlocker({ reason: 'price', comment: '', contact: '' })).toBe('')
    expect(reportBlocker({ reason: 'price', comment: 'x'.repeat(501), contact: '' })).toBe('Comentário acima de 500 caracteres.')
    expect(reportBlocker({ reason: 'price', comment: '', contact: 'x'.repeat(121) })).toBe('Contato acima de 120 caracteres.')
    expect(commentRequired('other')).toBe(true)
    expect(commentRequired('price')).toBe(false)
  })

  it('monta o corpo do POST com texto aparado', () => {
    expect(reportPayload('o1', { reason: 'price', comment: '  está 2,49 ', contact: ' (47) 99999-0000 ' })).toEqual({
      offer_id: 'o1', reason: 'price', comment: 'está 2,49', contact: '(47) 99999-0000',
    })
  })

  it('traduz falhas do envio', () => {
    expect(reportErrorMessage({ statusCode: 429 })).toBe('Muitos relatos em pouco tempo. Tente de novo mais tarde.')
    expect(reportErrorMessage({ statusCode: 404 })).toBe('Esta oferta não está mais no ar.')
    expect(reportErrorMessage({ statusCode: 422, data: { detail: 'Conte o que está errado.' } })).toBe('Conte o que está errado.')
    expect(reportErrorMessage(new Error('rede'))).toBe('Não foi possível enviar agora. Tente de novo.')
  })

  it('folha envia pelo jboSend, trava o foco e mostra o agradecimento', () => {
    const sheet = source('app/components/offers/ReportOfferSheet.vue')
    expect(sheet).toContain("jboSend('POST', '/offer-reports'")
    expect(sheet).toContain('useDialogLock')
    expect(sheet).toContain('Reportar um erro')
    expect(sheet).toContain('Obrigado! Vamos conferir.')
    expect(sheet).toContain('O que está errado?')
    expect(sheet).toContain('Só se quiser que a gente responda.')
    expect(sheet).toContain('placeholder="E-mail ou WhatsApp"')
    expect(sheet).toContain('data-test="report-submit"')
    expect(sheet).toContain('@media (min-width: 560px)')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/offerReport.spec.ts`
Expected: FAIL (`Failed to resolve import "../app/utils/offerReport"`).

- [ ] **Step 3: `app/utils/offerReport.ts`**

```ts
/** Relato de erro de uma oferta (página do produto): motivos, validação e mensagens. */

export type ReportReason = 'price' | 'product' | 'unavailable' | 'other'

export const REPORT_REASONS: { value: ReportReason, label: string }[] = [
  { value: 'price', label: 'Preço diferente do encarte ou da loja' },
  { value: 'product', label: 'Produto ou foto não confere' },
  { value: 'unavailable', label: 'Oferta vencida ou não existe na loja' },
  { value: 'other', label: 'Outro' },
]

export const REPORT_COMMENT_MAX = 500
export const REPORT_CONTACT_MAX = 120

export type ReportDraft = {
  reason: ReportReason | ''
  comment: string
  contact: string
}

type FetchFailure = {
  statusCode?: number
  status?: number
  data?: { detail?: unknown }
}

/** Comentário é obrigatório só no motivo "Outro". */
export function commentRequired(reason: string): boolean {
  return reason === 'other'
}

/** Motivo que impede o envio ('' quando pode enviar). */
export function reportBlocker(draft: ReportDraft): string {
  if (!draft.reason) return 'Escolha o que está errado.'
  if (commentRequired(draft.reason) && !draft.comment.trim()) return 'Conte o que está errado.'
  if (draft.comment.trim().length > REPORT_COMMENT_MAX) return 'Comentário acima de 500 caracteres.'
  if (draft.contact.trim().length > REPORT_CONTACT_MAX) return 'Contato acima de 120 caracteres.'
  return ''
}

/** Corpo do `POST /offer-reports` com texto aparado. */
export function reportPayload(offerId: string, draft: ReportDraft) {
  return {
    offer_id: offerId,
    reason: draft.reason,
    comment: draft.comment.trim(),
    contact: draft.contact.trim(),
  }
}

/** Mensagem da folha quando o envio falha (limite, oferta fora do ar, validação ou rede). */
export function reportErrorMessage(error: unknown): string {
  const failure = (error || {}) as FetchFailure
  const status = failure.statusCode ?? failure.status
  if (status === 429) return 'Muitos relatos em pouco tempo. Tente de novo mais tarde.'
  if (status === 404) return 'Esta oferta não está mais no ar.'
  const detail = failure.data?.detail
  if (status === 422 && typeof detail === 'string' && detail) return detail
  return 'Não foi possível enviar agora. Tente de novo.'
}
```

- [ ] **Step 4: `app/components/offers/ReportOfferSheet.vue`**

```vue
<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="report-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-sheet-title"
      data-test="report-sheet"
    >
      <div class="report-sheet__backdrop" aria-hidden="true" @click="onClose" />
      <div class="report-sheet__panel">
        <header class="report-sheet__head">
          <div class="report-sheet__heading">
            <h2 id="report-sheet-title" class="report-sheet__title">
              {{ sent ? 'Obrigado! Vamos conferir.' : 'Reportar um erro' }}
            </h2>
            <p class="report-sheet__sub">{{ productTitle }} · {{ storeName }}</p>
          </div>
          <button ref="closeButton" type="button" class="report-sheet__close" aria-label="Fechar" @click="onClose">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <div v-if="sent" class="report-sheet__done" data-test="report-done">
          <span class="report-sheet__check" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26"><path d="M5 12.5l4.2 4L19 7" /></svg>
          </span>
          <p>{{ sentContact ? 'Se precisarmos de algo, falamos com você pelo contato que deixou.' : 'A equipe revisa cada relato.' }}</p>
          <button type="button" class="report-sheet__primary" @click="onClose">Fechar</button>
        </div>

        <form v-else class="report-sheet__form" novalidate @submit.prevent="onSubmit">
          <fieldset class="report-sheet__reasons">
            <legend>O que está errado?</legend>
            <label
              v-for="reason in REPORT_REASONS"
              :key="reason.value"
              class="report-reason"
              :class="{ 'report-reason--checked': draft.reason === reason.value }"
            >
              <input
                v-model="draft.reason"
                type="radio"
                name="report-reason"
                :value="reason.value"
                :data-test="`report-reason-${reason.value}`"
              >
              {{ reason.label }}
            </label>
          </fieldset>

          <div class="report-sheet__field">
            <label for="report-comment">
              Comentário <span>{{ commentRequired(draft.reason) ? '(obrigatório)' : '(opcional)' }}</span>
            </label>
            <textarea
              id="report-comment"
              v-model="draft.comment"
              rows="3"
              :maxlength="REPORT_COMMENT_MAX"
              placeholder="Ex.: no encarte está R$ 2,49"
            />
            <small>
              <span class="report-sheet__warn">{{ commentHint }}</span>
              <span>{{ draft.comment.length }}/{{ REPORT_COMMENT_MAX }}</span>
            </small>
          </div>

          <div class="report-sheet__field">
            <label for="report-contact">Seu contato <span>(opcional)</span></label>
            <input
              id="report-contact"
              v-model="draft.contact"
              type="text"
              :maxlength="REPORT_CONTACT_MAX"
              placeholder="E-mail ou WhatsApp"
              autocomplete="email"
            >
            <small>Só se quiser que a gente responda.</small>
          </div>

          <p v-if="error" class="report-sheet__error" role="alert" data-test="report-error">{{ error }}</p>

          <button
            type="submit"
            class="report-sheet__primary"
            data-test="report-submit"
            :disabled="sending || Boolean(blocker)"
          >
            {{ sending ? 'Enviando…' : 'Enviar' }}
          </button>
          <button type="button" class="report-sheet__ghost" @click="onClose">Cancelar</button>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { jboSend } from '~/utils/jboApi'
import {
  REPORT_COMMENT_MAX,
  REPORT_CONTACT_MAX,
  REPORT_REASONS,
  commentRequired,
  reportBlocker,
  reportErrorMessage,
  reportPayload,
  type ReportDraft,
} from '~/utils/offerReport'

const props = defineProps<{
  open: boolean
  offerId: string
  productTitle: string
  storeName: string
}>()

const emit = defineEmits<{
  close: []
}>()

const draft = reactive<ReportDraft>({ reason: '', comment: '', contact: '' })
const sending = ref(false)
const sent = ref(false)
const sentContact = ref(false)
const error = ref('')
const overlay = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

const blocker = computed(() => reportBlocker(draft))
const commentHint = computed(() =>
  commentRequired(draft.reason) && !draft.comment.trim() ? 'Conte o que está errado.' : '',
)

/** Limpa o formulário (nova abertura depois de um envio ou outra oferta). */
function reset() {
  draft.reason = ''
  draft.comment = ''
  draft.contact = ''
  sent.value = false
  sentContact.value = false
  error.value = ''
}

watch(() => props.open, (isOpen) => {
  if (isOpen && sent.value) reset()
})
watch(() => props.offerId, reset)

/** Fecha a folha (Escape, fundo, X, Cancelar ou Fechar). */
function onClose() {
  emit('close')
}

/** Envia o relato; em erro mantém o que foi digitado e mostra o motivo. */
async function onSubmit() {
  if (sending.value || blocker.value) return
  sending.value = true
  error.value = ''
  try {
    await jboSend('POST', '/offer-reports', reportPayload(props.offerId, draft))
    sentContact.value = Boolean(draft.contact.trim())
    sent.value = true
  }
  catch (e) {
    error.value = reportErrorMessage(e)
  }
  finally {
    sending.value = false
  }
}

useDialogLock(toRef(props, 'open'), overlay, closeButton, onClose)
</script>

<style scoped>
.report-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.report-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.report-sheet__panel {
  position: relative;
  width: 100%;
  max-height: min(90dvh, 720px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 1.1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  box-shadow: var(--shadow);
  animation: report-sheet-in 0.18s ease-out;
}

@media (min-width: 560px) {
  .report-sheet {
    align-items: center;
    padding: 1rem;
  }

  .report-sheet__panel {
    width: min(480px, 100%);
    border-bottom: 1px solid var(--line);
    border-radius: 18px;
  }
}

@keyframes report-sheet-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .report-sheet__panel {
    animation: none;
  }
}

.report-sheet__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.report-sheet__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.2;
}

.report-sheet__sub {
  margin: 0.25rem 0 0;
  color: var(--ink-3);
  font-size: 0.85rem;
}

.report-sheet__close {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.report-sheet__close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.report-sheet__form {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.report-sheet__reasons {
  margin: 0;
  padding: 0;
  border: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.report-sheet__reasons legend {
  margin-bottom: 0.45rem;
  padding: 0;
  font-family: var(--head);
  font-size: 0.9rem;
  font-weight: 800;
}

.report-reason {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  min-height: 44px;
  padding: 0.55rem 0.8rem;
  border: 1.5px solid var(--line);
  border-radius: 11px;
  font-size: 0.92rem;
  cursor: pointer;
}

.report-reason--checked {
  border-color: var(--yellow);
  background: var(--yellow-soft);
}

.report-reason input {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--ink);
}

.report-sheet__field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.report-sheet__field label {
  font-size: 0.88rem;
  font-weight: 700;
}

.report-sheet__field label span {
  color: var(--ink-3);
  font-weight: 400;
}

.report-sheet__field textarea,
.report-sheet__field input {
  width: 100%;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-size: 0.95rem;
  resize: vertical;
}

.report-sheet__field small {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  color: var(--ink-3);
  font-size: 0.78rem;
}

.report-sheet__warn,
.report-sheet__error {
  color: var(--red);
}

.report-sheet__error {
  margin: 0;
  font-size: 0.85rem;
}

.report-sheet__primary,
.report-sheet__ghost {
  min-height: 46px;
  border-radius: 11px;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.report-sheet__primary {
  border: none;
  background: var(--yellow);
  color: var(--ink);
}

.report-sheet__primary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.report-sheet__ghost {
  border: 1px solid var(--line);
  background: var(--surface);
  color: var(--ink);
}

.report-sheet__done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  text-align: center;
  color: var(--ink-2);
}

.report-sheet__done p {
  margin: 0;
}

.report-sheet__done .report-sheet__primary {
  align-self: stretch;
}

.report-sheet__check {
  width: 54px;
  height: 54px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--green-soft);
  color: var(--green);
}

.report-sheet__check svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 2.2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.report-sheet__close:focus-visible,
.report-sheet__primary:focus-visible,
.report-sheet__ghost:focus-visible,
.report-reason:focus-within {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/offerReport.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /root/Docker/projetos/dev-joinvilleboasofertas add app/utils/offerReport.ts app/components/offers/ReportOfferSheet.vue tests/offerReport.spec.ts
git -C /root/Docker/projetos/dev-joinvilleboasofertas commit -m "feat(produto): folha Reportar um erro

Motivo, comentário (obrigatório em Outro) e contato opcional; envia para
POST /offer-reports e agradece na própria folha.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git -C /root/Docker/projetos/dev-joinvilleboasofertas push origin develop
```

---

### Task 3: Regras do sino por mercado (`productFollow.ts`)

**Files:**
- Create: `app/utils/productFollow.ts`, `tests/productFollow.spec.ts`

**Interfaces:**
- Consumes: `formatMoney`, `formatOfferPrice`, `offerMainPrice` (`offerPrice.ts`); `isPromoExpired` (`promoPhase.ts`); `type FollowInstructionMode` (Task 1).
- Produces: tipos `ProductFollowScope`, `ProductFollowState`, `ProductFollowAction`, `FollowPick`, `FollowSheetMode`, `FollowOptionView`, `FollowOffView`, `FollowSheetView`; `EMPTY_FOLLOW_STATE`; `followsHere(state, pageStoreId)`, `otherStoreIds(state, pageStoreId)`, `joinNames(names)`, `followCaption(state, pageStoreId) -> { text, on }`, `followBellLabel(state, pageStoreId)`, `followSheetMode(state, pageStoreId, instructionMode)`, `marketSummary(offers, now?)`, `followSheetView({ state, pageStoreId, pageStoreName, offers, instructionMode, now? })`, `pickAction(pick)`, `followActionMessage(action, before, storeName)`, `followBusyText(instructionMode)`, `followPriceLine(offer)`.

- [ ] **Step 1: Testes que falham**

`tests/productFollow.spec.ts`:

```ts
import { describe, expect, it } from 'vitest'
import type { JboOffer } from '../app/utils/jboApi'
import {
  EMPTY_FOLLOW_STATE,
  followActionMessage,
  followBellLabel,
  followBusyText,
  followCaption,
  followPriceLine,
  followSheetMode,
  followSheetView,
  followsHere,
  marketSummary,
  pickAction,
  type ProductFollowState,
} from '../app/utils/productFollow'

const nbsp = ' '
const NOW = new Date('2026-09-14T15:00:00-03:00')
const K = 'komprao'
const C = 'carolina'

function offer(partial: Partial<JboOffer> & Pick<JboOffer, 'id' | 'establishment_id' | 'establishment_name'>): JboOffer {
  return {
    product_id: 'milho',
    product_name: 'Milho Verde',
    product_slug: 'bonare-milho-verde',
    establishment_slug: partial.establishment_id,
    price: '2.49',
    recorded_at: '2026-09-14T00:00:00Z',
    promo_starts_on: '2026-09-10',
    promo_ends_on: '2026-09-20',
    ...partial,
  }
}

const OFFERS = [
  offer({ id: '1', establishment_id: K, establishment_name: 'Komprão Koch Atacadista', price: '2.29', club_price: '1.99' }),
  offer({ id: '2', establishment_id: C, establishment_name: 'Supermercado Carolina', price: '2.49' }),
  offer({ id: '3', establishment_id: 'mini', establishment_name: 'Mini Preço Supermercados', price: '2.99' }),
  offer({ id: '4', establishment_id: 'velho', establishment_name: 'Mercado Vencido', price: '1.00', promo_ends_on: '2026-09-01' }),
]

const stores = (...ids: string[]): ProductFollowState => ({ scope: 'stores', establishment_ids: ids })
const ALL: ProductFollowState = { scope: 'all', establishment_ids: [] }

function view(state: ProductFollowState, instructionMode: 'request-permission' | 'ready' | 'ios-install' | 'permission-denied' = 'ready') {
  return followSheetView({
    state, pageStoreId: K, pageStoreName: 'Komprão Koch Atacadista', offers: OFFERS, instructionMode, now: NOW,
  })
}

describe('sino por mercado: estado e legenda', () => {
  it('sabe se o aviso vale para o mercado da página', () => {
    expect(followsHere(EMPTY_FOLLOW_STATE, K)).toBe(false)
    expect(followsHere(ALL, K)).toBe(true)
    expect(followsHere(stores(K), K)).toBe(true)
    expect(followsHere(stores(C), K)).toBe(false)
  })

  it('legenda ao lado do sino em cada situação', () => {
    expect(followCaption(EMPTY_FOLLOW_STATE, K)).toEqual({ text: '', on: false })
    expect(followCaption(stores(K), K)).toEqual({ text: 'Avisos neste mercado', on: true })
    expect(followCaption(stores(K, C), K)).toEqual({ text: 'Avisos aqui e em mais 1 mercado', on: true })
    expect(followCaption(stores(K, C, 'mini'), K).text).toBe('Avisos aqui e em mais 2 mercados')
    expect(followCaption(ALL, K)).toEqual({ text: 'Avisos em todos os mercados', on: true })
    expect(followCaption(stores(C), K)).toEqual({ text: 'Você segue em outro mercado', on: false })
    expect(followCaption(stores(C, 'mini'), K).text).toBe('Você segue em 2 outros mercados')
  })

  it('rótulo acessível do sino', () => {
    expect(followBellLabel(EMPTY_FOLLOW_STATE, K)).toBe('Receber avisos deste produto')
    expect(followBellLabel(stores(K), K)).toBe('Avisos ativos neste mercado. Toque para mudar')
    expect(followBellLabel(ALL, K)).toBe('Avisos ativos em todos os mercados. Toque para mudar')
  })

  it('modo da folha: gerenciar vence as instruções; iPhone e bloqueio antes da escolha', () => {
    expect(followSheetMode(stores(K), K, 'permission-denied')).toBe('manage')
    expect(followSheetMode(EMPTY_FOLLOW_STATE, K, 'ios-install')).toBe('ios')
    expect(followSheetMode(stores(C), K, 'permission-denied')).toBe('denied')
    expect(followSheetMode(EMPTY_FOLLOW_STATE, K, 'request-permission')).toBe('choose')
  })
})

describe('sino por mercado: textos da folha', () => {
  it('resumo dos mercados usa só ofertas vigentes e o menor preço principal', () => {
    expect(marketSummary(OFFERS, NOW)).toBe(`Hoje em 3 mercados, a partir de R$${nbsp}1,99.`)
    expect(marketSummary([OFFERS[1]], NOW)).toBe('Hoje só o Supermercado Carolina tem oferta; avisamos quando outro publicar.')
    expect(marketSummary([OFFERS[3]], NOW)).toBe('Avisamos quando qualquer mercado publicar.')
  })

  it('primeira vez: duas opções sem marcação e rodapé da permissão', () => {
    const v = view(EMPTY_FOLLOW_STATE, 'request-permission')
    expect(v.mode).toBe('choose')
    expect(v.title).toBe('Onde você quer acompanhar?')
    expect(v.note).toBe('')
    expect(v.options.map(o => [o.key, o.title, o.active])).toEqual([
      ['here', 'Só no Komprão Koch Atacadista', false],
      ['all', 'Em todos os mercados', false],
    ])
    expect(v.options[0].description).toBe('Quando este mercado publicar encarte com o produto.')
    expect(v.options[1].description).toBe(`Hoje em 3 mercados, a partir de R$${nbsp}1,99.`)
    expect(v.footnote).toBe('Na primeira vez, o navegador pede permissão. Para mudar ou desligar, toque no sino.')
  })

  it('já segue em outro mercado: "Também no" e nota com o nome quando conhecido', () => {
    const v = view(stores(C))
    expect(v.note).toBe('Você já recebe avisos deste produto no Supermercado Carolina.')
    expect(v.options[0].title).toBe('Também no Komprão Koch Atacadista')
    expect(v.options[0].description).toBe('Continua avisando no Supermercado Carolina.')
    expect(v.options[1].description).toBe(`Hoje em 3 mercados, a partir de R$${nbsp}1,99. Substitui a sua lista.`)
    expect(view(stores('desconhecido')).note).toBe('Você já recebe avisos deste produto em outro mercado.')
  })

  it('gerenciar: opção ativa marcada, troca explicada e desligar certo', () => {
    const here = view(stores(K))
    expect(here.mode).toBe('manage')
    expect(here.title).toBe('Avisos deste produto')
    expect(here.lead).toBe('Você recebe um aviso quando o Komprão Koch Atacadista publicar oferta nova ou mudar o preço.')
    expect(here.options.map(o => [o.title, o.active, o.description])).toEqual([
      ['No Komprão Koch Atacadista', true, 'Só este mercado.'],
      ['Em todos os mercados', false, 'Troca: passa a avisar de qualquer mercado.'],
    ])
    expect(here.offActions).toEqual([{ action: 'unfollow_all', label: 'Desligar avisos deste produto' }])

    const both = view(stores(K, C))
    expect(both.lead).toBe('Você recebe avisos deste produto no Komprão Koch Atacadista e no Supermercado Carolina.')
    expect(both.options[0].description).toBe('Também no Supermercado Carolina.')
    expect(both.offActions).toEqual([
      { action: 'unfollow_store', label: 'Desligar no Komprão Koch Atacadista' },
      { action: 'unfollow_all', label: 'Desligar em todos' },
    ])

    const all = view(ALL)
    expect(all.options.map(o => [o.title, o.active, o.description])).toEqual([
      ['Só no Komprão Koch Atacadista', false, 'Troca: deixa de avisar dos outros mercados.'],
      ['Em todos os mercados', true, 'Qualquer mercado de Joinville.'],
    ])
    expect(all.offActions).toEqual([{ action: 'unfollow_all', label: 'Desligar avisos deste produto' }])
  })

  it('iPhone e bloqueio têm título e texto próprios, sem opções', () => {
    expect(view(EMPTY_FOLLOW_STATE, 'ios-install')).toMatchObject({ mode: 'ios', title: 'Instale o app para receber avisos', options: [] })
    expect(view(EMPTY_FOLLOW_STATE, 'permission-denied')).toMatchObject({ mode: 'denied', title: 'Notificações bloqueadas', options: [] })
  })
})

describe('sino por mercado: ações e avisos', () => {
  it('opção vira ação da API', () => {
    expect(pickAction('here')).toBe('follow_store')
    expect(pickAction('all')).toBe('follow_all')
  })

  it('aviso passageiro de cada ação', () => {
    const store = 'Komprão Koch Atacadista'
    expect(followActionMessage('follow_store', EMPTY_FOLLOW_STATE, store)).toBe('Pronto! Avisos no Komprão Koch Atacadista')
    expect(followActionMessage('follow_store', ALL, store)).toBe('Avisos agora só no Komprão Koch Atacadista')
    expect(followActionMessage('follow_all', EMPTY_FOLLOW_STATE, store)).toBe('Pronto! Avisos em todos os mercados')
    expect(followActionMessage('follow_all', stores(C), store)).toBe('Avisos agora em todos os mercados')
    expect(followActionMessage('unfollow_store', stores(K, C), store)).toBe('Avisos desligados no Komprão Koch Atacadista')
    expect(followActionMessage('unfollow_all', ALL, store)).toBe('Avisos desligados')
  })

  it('texto de espera e linha de preço do cabeçalho', () => {
    expect(followBusyText('request-permission')).toBe('Aguardando a permissão do navegador…')
    expect(followBusyText('ready')).toBe('Ativando…')
    expect(followPriceLine(OFFERS[0])).toBe(`R$${nbsp}1,99 com clube no Komprão Koch Atacadista`)
    expect(followPriceLine(OFFERS[1])).toBe(`R$${nbsp}2,49 no Supermercado Carolina`)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/productFollow.spec.ts`
Expected: FAIL (`Failed to resolve import "../app/utils/productFollow"`).

- [ ] **Step 3: `app/utils/productFollow.ts`**

```ts
/** Sino do produto por mercado: estado, legendas, textos da folha e avisos (puro). */

import type { JboOffer } from '~/utils/jboApi'
import { formatMoney, formatOfferPrice, offerMainPrice } from '~/utils/offerPrice'
import { isPromoExpired } from '~/utils/promoPhase'
import type { FollowInstructionMode } from '~/utils/webPush'

export type ProductFollowScope = 'none' | 'all' | 'stores'
export type ProductFollowState = { scope: ProductFollowScope, establishment_ids: string[] }
export type ProductFollowAction = 'follow_store' | 'follow_all' | 'unfollow_store' | 'unfollow_all'
export type FollowPick = 'here' | 'all'
export type FollowSheetMode = 'choose' | 'manage' | 'ios' | 'denied'
export type FollowOptionView = { key: FollowPick, title: string, description: string, active: boolean }
export type FollowOffView = { action: ProductFollowAction, label: string }
export type FollowSheetView = {
  mode: FollowSheetMode
  title: string
  lead: string
  note: string
  options: FollowOptionView[]
  offActions: FollowOffView[]
  footnote: string
}

export const EMPTY_FOLLOW_STATE: ProductFollowState = { scope: 'none', establishment_ids: [] }

/** True quando o aviso vale para o mercado da página (todos ou lista com ele). */
export function followsHere(state: ProductFollowState, pageStoreId: string): boolean {
  if (state.scope === 'all') return true
  return state.scope === 'stores' && state.establishment_ids.includes(pageStoreId)
}

/** Mercados seguidos além do mercado da página. */
export function otherStoreIds(state: ProductFollowState, pageStoreId: string): string[] {
  return state.scope === 'stores'
    ? state.establishment_ids.filter(id => id !== pageStoreId)
    : []
}

/** "A", "A e B", "A, B e C". */
export function joinNames(names: string[]): string {
  if (names.length < 2) return names[0] || ''
  return `${names.slice(0, -1).join(', ')} e ${names[names.length - 1]}`
}

/** "mercado" ou "mercados" conforme a quantidade. */
function markets(count: number): string {
  return count === 1 ? 'mercado' : 'mercados'
}

/** Legenda persistente ao lado do sino; `on` pinta com a cor do sino ligado. */
export function followCaption(state: ProductFollowState, pageStoreId: string): { text: string, on: boolean } {
  if (state.scope === 'all') return { text: 'Avisos em todos os mercados', on: true }
  const others = otherStoreIds(state, pageStoreId).length
  if (followsHere(state, pageStoreId)) {
    return {
      text: others ? `Avisos aqui e em mais ${others} ${markets(others)}` : 'Avisos neste mercado',
      on: true,
    }
  }
  if (others === 1) return { text: 'Você segue em outro mercado', on: false }
  if (others > 1) return { text: `Você segue em ${others} outros mercados`, on: false }
  return { text: '', on: false }
}

/** Rótulo acessível (e `title`) do botão do sino. */
export function followBellLabel(state: ProductFollowState, pageStoreId: string): string {
  if (state.scope === 'all') return 'Avisos ativos em todos os mercados. Toque para mudar'
  if (followsHere(state, pageStoreId)) return 'Avisos ativos neste mercado. Toque para mudar'
  return 'Receber avisos deste produto'
}

/** Qual folha abrir: gerenciar (já segue aqui), instruções (iPhone/bloqueado) ou escolha. */
export function followSheetMode(
  state: ProductFollowState,
  pageStoreId: string,
  instructionMode: FollowInstructionMode,
): FollowSheetMode {
  if (followsHere(state, pageStoreId)) return 'manage'
  if (instructionMode === 'ios-install') return 'ios'
  if (instructionMode === 'permission-denied') return 'denied'
  return 'choose'
}

/** "no Supermercado Carolina" quando todos os nomes são conhecidos; senão "em outro mercado". */
function elsewhere(ids: string[], offers: JboOffer[]): string {
  const names = ids
    .map(id => offers.find(o => o.establishment_id === id)?.establishment_name || '')
    .filter(Boolean)
  if (names.length === ids.length) return `no ${joinNames(names)}`
  return ids.length === 1 ? 'em outro mercado' : `em ${ids.length} outros mercados`
}

/** "Hoje em 3 mercados, a partir de R$ 1,99." com as ofertas vigentes da página. */
export function marketSummary(offers: JboOffer[], now = new Date()): string {
  const storesWithOffer = new Map<string, string>()
  let lowest: number | null = null
  for (const item of offers) {
    if (isPromoExpired(item, now)) continue
    storesWithOffer.set(item.establishment_id, item.establishment_name)
    const main = offerMainPrice(item)
    if (main && (lowest == null || main.value < lowest)) lowest = main.value
  }
  if (storesWithOffer.size === 0) return 'Avisamos quando qualquer mercado publicar.'
  if (storesWithOffer.size === 1) {
    const [name] = storesWithOffer.values()
    return `Hoje só o ${name} tem oferta; avisamos quando outro publicar.`
  }
  return `Hoje em ${storesWithOffer.size} mercados, a partir de ${formatMoney(lowest)}.`
}

/** Textos da folha do sino para o estado atual (protótipo aprovado). */
export function followSheetView(input: {
  state: ProductFollowState
  pageStoreId: string
  pageStoreName: string
  offers: JboOffer[]
  instructionMode: FollowInstructionMode
  now?: Date
}): FollowSheetView {
  const { state, pageStoreId, offers } = input
  const store = input.pageStoreName
  const mode = followSheetMode(state, pageStoreId, input.instructionMode)
  const others = otherStoreIds(state, pageStoreId)
  const empty = { note: '', options: [], offActions: [], footnote: '' }

  if (mode === 'ios') {
    return {
      mode,
      title: 'Instale o app para receber avisos',
      lead: 'No iPhone, os avisos chegam pelo app instalado na tela de início.',
      ...empty,
    }
  }
  if (mode === 'denied') {
    return {
      mode,
      title: 'Notificações bloqueadas',
      lead: 'Este navegador está bloqueando os avisos do Joinville Boas Ofertas.',
      ...empty,
    }
  }
  if (mode === 'manage') {
    const all = state.scope === 'all'
    let lead = `Você recebe um aviso quando o ${store} publicar oferta nova ou mudar o preço.`
    if (all) lead = 'Você recebe um aviso quando qualquer mercado publicar oferta nova ou mudar o preço.'
    else if (others.length) lead = `Você recebe avisos deste produto no ${store} e ${elsewhere(others, offers)}.`
    let hereDescription = 'Só este mercado.'
    if (all) hereDescription = 'Troca: deixa de avisar dos outros mercados.'
    else if (others.length) hereDescription = `Também ${elsewhere(others, offers)}.`
    return {
      mode,
      title: 'Avisos deste produto',
      lead,
      note: '',
      options: [
        { key: 'here', title: `${all ? 'Só no' : 'No'} ${store}`, description: hereDescription, active: !all },
        {
          key: 'all',
          title: 'Em todos os mercados',
          description: all ? 'Qualquer mercado de Joinville.' : 'Troca: passa a avisar de qualquer mercado.',
          active: all,
        },
      ],
      offActions: !all && others.length
        ? [
            { action: 'unfollow_store', label: `Desligar no ${store}` },
            { action: 'unfollow_all', label: 'Desligar em todos' },
          ]
        : [{ action: 'unfollow_all', label: 'Desligar avisos deste produto' }],
      footnote: '',
    }
  }

  const followsElsewhere = others.length > 0
  const summary = marketSummary(offers, input.now)
  const firstTime = input.instructionMode === 'request-permission'
    ? 'Na primeira vez, o navegador pede permissão. '
    : ''
  return {
    mode,
    title: 'Onde você quer acompanhar?',
    lead: 'Avisamos quando sair oferta nova ou o preço mudar.',
    note: followsElsewhere ? `Você já recebe avisos deste produto ${elsewhere(others, offers)}.` : '',
    options: [
      {
        key: 'here',
        title: `${followsElsewhere ? 'Também no' : 'Só no'} ${store}`,
        description: followsElsewhere
          ? `Continua avisando ${elsewhere(others, offers)}.`
          : 'Quando este mercado publicar encarte com o produto.',
        active: false,
      },
      {
        key: 'all',
        title: 'Em todos os mercados',
        description: followsElsewhere ? `${summary} Substitui a sua lista.` : summary,
        active: false,
      },
    ],
    offActions: [],
    footnote: `${firstTime}Para mudar ou desligar, toque no sino.`,
  }
}

/** Opção da folha → ação da API. */
export function pickAction(pick: FollowPick): ProductFollowAction {
  return pick === 'all' ? 'follow_all' : 'follow_store'
}

/** Aviso passageiro da barra depois de uma ação que deu certo. */
export function followActionMessage(
  action: ProductFollowAction,
  before: ProductFollowState,
  storeName: string,
): string {
  if (action === 'follow_store') {
    return before.scope === 'all' ? `Avisos agora só no ${storeName}` : `Pronto! Avisos no ${storeName}`
  }
  if (action === 'follow_all') {
    return before.scope === 'stores' ? 'Avisos agora em todos os mercados' : 'Pronto! Avisos em todos os mercados'
  }
  if (action === 'unfollow_store') return `Avisos desligados no ${storeName}`
  return 'Avisos desligados'
}

/** Texto da opção enquanto a ação roda. */
export function followBusyText(instructionMode: FollowInstructionMode): string {
  return instructionMode === 'request-permission' ? 'Aguardando a permissão do navegador…' : 'Ativando…'
}

/** "R$ 1,99 com clube no Komprão…" para o cabeçalho da folha. */
export function followPriceLine(offer: JboOffer): string {
  const club = offerMainPrice(offer)?.isClub ? ' com clube' : ''
  return `${formatOfferPrice(offer)}${club} no ${offer.establishment_name}`
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/productFollow.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git -C /root/Docker/projetos/dev-joinvilleboasofertas add app/utils/productFollow.ts tests/productFollow.spec.ts
git -C /root/Docker/projetos/dev-joinvilleboasofertas commit -m "feat(produto): regras e textos do sino por mercado

Legenda, modo da folha, opções sem pré-seleção, resumo dos mercados e
avisos de cada ação, com o texto do protótipo aprovado.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git -C /root/Docker/projetos/dev-joinvilleboasofertas push origin develop
```

---

### Task 4: Composable e folha do sino

**Files:**
- Create: `app/composables/useJboProductFollow.ts`, `app/components/offers/ProductFollowSheet.vue`
- Test: `tests/productActionsBar.spec.ts` (criado aqui com os testes do sino; a Task 5 acrescenta os da barra)

**Interfaces:**
- Consumes: Task 1 (`ensurePushDevice`, `currentPushEndpoint`, `detectPushSupport`, `PUSH_HINT_DENIED`), Task 3 (tipos, `EMPTY_FOLLOW_STATE`, `followActionMessage`).
- Produces:
  - `useJboProductFollow(productId: Ref<string>, pageStoreId: Ref<string>, pageStoreName: Ref<string>) -> { state: Ref<ProductFollowState>, busy: Ref<ProductFollowAction | ''>, flash: Ref<string>, apply(action): Promise<boolean>, load(): Promise<void> }` — `apply` devolve `true` quando a folha pode fechar.
  - `ProductFollowSheet` — props `open`, `view: FollowSheetView`, `productTitle`, `priceLine`, `imageUrl?`, `busy`, `waitingText`; emits `pick(FollowPick)`, `off(ProductFollowAction)`, `install`, `close`.

- [ ] **Step 1: Testes que falham**

`tests/productActionsBar.spec.ts`:

```ts
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const source = (path: string) => readFileSync(resolve(root, path), 'utf8')

describe('sino do produto', () => {
  it('composable consulta e grava no snap-api pelo endpoint do push', () => {
    const src = source('app/composables/useJboProductFollow.ts')
    expect(src).toContain("'/push/product-follows/query'")
    expect(src).toContain("'/push/product-follows'")
    expect(src).toContain('ensurePushDevice')
    expect(src).toContain('currentPushEndpoint')
    expect(src).toContain('establishment_id: pageStoreId.value')
    expect(src).toContain('followActionMessage')
    expect(src).toContain('Notificações bloqueadas. Toque no sino para ver como liberar.')
  })

  it('desligar não pede permissão; seguir pede', () => {
    const src = source('app/composables/useJboProductFollow.ts')
    const fn = src.slice(src.indexOf('async function endpointFor'))
    expect(fn.indexOf("action === 'unfollow_store' || action === 'unfollow_all'")).toBeLessThan(fn.indexOf('ensurePushDevice'))
  })

  it('folha mostra opções como botões que já ativam, com selo Ativo e desligar', () => {
    const sheet = source('app/components/offers/ProductFollowSheet.vue')
    expect(sheet).toContain('v-for="option in view.options"')
    expect(sheet).toContain(':aria-current="option.active ? \'true\' : undefined"')
    expect(sheet).toContain('Ativo')
    expect(sheet).toContain("emit('pick', option.key)")
    expect(sheet).toContain('v-for="off in view.offActions"')
    expect(sheet).toContain('<PushInstructions')
    expect(sheet).toContain('goal="ativar os avisos"')
    expect(sheet).toContain('useDialogLock')
    expect(sheet).toContain('@media (min-width: 560px)')
    expect(sheet).not.toContain('Confirmar')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/productActionsBar.spec.ts`
Expected: FAIL (`ENOENT` ao ler `useJboProductFollow.ts`).

- [ ] **Step 3: `app/composables/useJboProductFollow.ts`**

```ts
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
const BLOCKED_HINT = 'Notificações bloqueadas. Toque no sino para ver como liberar.'
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

  /** Mostra um aviso na barra por alguns segundos. */
  function say(text: string) {
    flash.value = text
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => {
      flash.value = ''
    }, FLASH_MS)
  }

  /** Busca o estado no snap-api (só no cliente, com push e inscrição existentes). */
  async function load() {
    if (!import.meta.client || !productId.value || !detectPushSupport()) return
    const endpoint = await currentPushEndpoint()
    if (!endpoint) {
      state.value = { ...EMPTY_FOLLOW_STATE }
      return
    }
    try {
      state.value = await jboSend<ProductFollowState>('POST', '/push/product-follows/query', {
        endpoint,
        product_id: productId.value,
      })
    }
    catch {
      // Mantém o estado anterior: o sino continua usável.
    }
  }

  /** Endpoint para a ação: desligar usa a inscrição atual; seguir garante permissão e dispositivo. */
  async function endpointFor(action: ProductFollowAction): Promise<string | null> {
    if (action === 'unfollow_store' || action === 'unfollow_all') return currentPushEndpoint()
    const ready = await ensurePushDevice(isIos.value, isStandalone.value)
    if (ready.ok) return ready.endpoint
    say(ready.hint === PUSH_HINT_DENIED ? BLOCKED_HINT : ready.hint)
    return null
  }

  /** Aplica a ação do sino; devolve true quando a folha pode fechar. */
  async function apply(action: ProductFollowAction): Promise<boolean> {
    if (busy.value) return false
    busy.value = action
    const before = state.value
    try {
      const endpoint = await endpointFor(action)
      if (!endpoint) {
        if (action === 'unfollow_store' || action === 'unfollow_all') {
          state.value = { ...EMPTY_FOLLOW_STATE }
        }
        return true
      }
      state.value = await jboSend<ProductFollowState>('PUT', '/push/product-follows', {
        endpoint,
        product_id: productId.value,
        establishment_id: pageStoreId.value,
        action,
      })
      say(followActionMessage(action, before, pageStoreName.value))
      return true
    }
    catch {
      say(SAVE_FAILED)
      return false
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
```

- [ ] **Step 4: `app/components/offers/ProductFollowSheet.vue`**

```vue
<template>
  <Teleport to="body">
    <div
      v-if="open"
      ref="overlay"
      class="follow-sheet"
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-sheet-title"
      data-test="product-follow-sheet"
    >
      <div class="follow-sheet__backdrop" aria-hidden="true" @click="emit('close')" />
      <div class="follow-sheet__panel">
        <header class="follow-sheet__product">
          <img v-if="imageUrl" class="follow-sheet__thumb" :src="imageUrl" alt="">
          <div class="follow-sheet__product-text">
            <p class="follow-sheet__product-title">{{ productTitle }}</p>
            <p class="follow-sheet__price">{{ priceLine }}</p>
          </div>
          <button ref="closeButton" type="button" class="follow-sheet__close" aria-label="Fechar" @click="emit('close')">
            <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </header>

        <p v-if="view.note" class="follow-sheet__note">
          <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
          </svg>
          <span>{{ view.note }}</span>
        </p>
        <h2 id="follow-sheet-title" class="follow-sheet__title">{{ view.title }}</h2>
        <p class="follow-sheet__lead">{{ view.lead }}</p>

        <template v-if="view.mode === 'ios' || view.mode === 'denied'">
          <PushInstructions
            :mode="view.mode === 'ios' ? 'ios-install' : 'permission-denied'"
            goal="ativar os avisos"
          />
          <button
            v-if="view.mode === 'ios'"
            type="button"
            class="follow-sheet__btn follow-sheet__btn--primary"
            @click="emit('install')"
          >
            Como instalar o app
          </button>
          <button type="button" class="follow-sheet__btn" @click="emit('close')">
            {{ view.mode === 'ios' ? 'Agora não' : 'Entendi' }}
          </button>
        </template>

        <template v-else>
          <div class="follow-sheet__options">
            <button
              v-for="option in view.options"
              :key="option.key"
              type="button"
              class="follow-option"
              :class="{
                'follow-option--active': option.active,
                'follow-option--busy': busyKey === option.key,
              }"
              :aria-current="option.active ? 'true' : undefined"
              :aria-busy="busyKey === option.key ? 'true' : undefined"
              :disabled="Boolean(busy) && busyKey !== option.key"
              :data-test="`follow-option-${option.key}`"
              @click="onPick(option)"
            >
              <span class="follow-option__icon" aria-hidden="true">
                <svg v-if="option.key === 'here'" viewBox="0 0 24 24" width="20" height="20">
                  <path d="M4.5 11v9h15v-9" />
                  <path d="M3 10l1.8-5.5h14.4L21 10c0 1.3-1 2.2-2.2 2.2s-2.3-.9-2.3-2.2c0 1.3-1 2.2-2.2 2.2S12 11.3 12 10c0 1.3-1 2.2-2.3 2.2S7.5 11.3 7.5 10c0 1.3-1 2.2-2.2 2.2S3 11.3 3 10z" />
                  <path d="M10 20v-4.5h4V20" />
                </svg>
                <svg v-else viewBox="0 0 24 24" width="20" height="20">
                  <path d="M9 4.5 3.5 6.5v13l5.5-2 6 2 5.5-2v-13l-5.5 2-6-2z" />
                  <path d="M9 4.5v13M15 6.5v13" />
                </svg>
              </span>
              <span class="follow-option__text">
                <strong>{{ option.title }}</strong>
                <span>{{ busyKey === option.key ? waitingText : option.description }}</span>
              </span>
              <span class="follow-option__end" aria-hidden="true">
                <span v-if="option.active" class="follow-option__pill">Ativo</span>
                <svg v-else viewBox="0 0 24 24" width="18" height="18"><path d="M9 6l6 6-6 6" /></svg>
              </span>
            </button>
          </div>

          <div v-if="view.offActions.length" class="follow-sheet__off">
            <button
              v-for="off in view.offActions"
              :key="off.action"
              type="button"
              class="follow-sheet__off-btn"
              :disabled="Boolean(busy)"
              :data-test="`follow-${off.action}`"
              @click="emit('off', off.action)"
            >
              {{ off.label }}
            </button>
          </div>

          <p v-if="view.footnote" class="follow-sheet__foot">{{ view.footnote }}</p>
          <button type="button" class="follow-sheet__btn" @click="emit('close')">
            {{ view.mode === 'manage' ? 'Fechar' : 'Agora não' }}
          </button>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import type {
  FollowOptionView,
  FollowPick,
  FollowSheetView,
  ProductFollowAction,
} from '~/utils/productFollow'

const props = defineProps<{
  open: boolean
  view: FollowSheetView
  productTitle: string
  priceLine: string
  imageUrl?: string | null
  busy: ProductFollowAction | ''
  waitingText: string
}>()

const emit = defineEmits<{
  pick: [pick: FollowPick]
  off: [action: ProductFollowAction]
  install: []
  close: []
}>()

const overlay = ref<HTMLElement | null>(null)
const closeButton = ref<HTMLButtonElement | null>(null)

/** Opção que mostra o texto de espera enquanto a ação roda. */
const busyKey = computed<FollowPick | ''>(() => {
  if (props.busy === 'follow_all') return 'all'
  if (props.busy === 'follow_store') return 'here'
  return ''
})

/** Tocar numa opção já ativa o aviso; a opção ativa não responde. */
function onPick(option: FollowOptionView) {
  if (option.active || props.busy) return
  emit('pick', option.key)
}

useDialogLock(toRef(props, 'open'), overlay, closeButton, () => emit('close'))
</script>

<style scoped>
.follow-sheet {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.follow-sheet__backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.62);
  cursor: pointer;
}

.follow-sheet__panel {
  position: relative;
  width: 100%;
  max-height: min(90dvh, 720px);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  padding: 1rem 1.1rem calc(1.1rem + env(safe-area-inset-bottom));
  background: var(--surface);
  color: var(--ink);
  border: 1px solid var(--line);
  border-bottom: none;
  border-radius: 18px 18px 0 0;
  box-shadow: var(--shadow);
  animation: follow-sheet-in 0.18s ease-out;
}

@media (min-width: 560px) {
  .follow-sheet {
    align-items: center;
    padding: 1rem;
  }

  .follow-sheet__panel {
    width: min(480px, 100%);
    border-bottom: 1px solid var(--line);
    border-radius: 18px;
  }
}

@keyframes follow-sheet-in {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .follow-sheet__panel {
    animation: none;
  }
}

.follow-sheet__product {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding-bottom: 0.8rem;
  border-bottom: 1px solid var(--line);
}

.follow-sheet__thumb {
  flex: 0 0 auto;
  width: 48px;
  height: 48px;
  object-fit: contain;
  border-radius: 10px;
  background: var(--bg);
}

.follow-sheet__product-text {
  flex: 1;
  min-width: 0;
}

.follow-sheet__product-title {
  margin: 0;
  font-family: var(--head);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
}

.follow-sheet__price {
  margin: 0.15rem 0 0;
  color: var(--ink-3);
  font-size: 0.82rem;
}

.follow-sheet__close {
  flex: 0 0 auto;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.follow-sheet__close svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.follow-sheet__note {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin: 0;
  padding: 0.6rem 0.7rem;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink-2);
  font-size: 0.85rem;
}

.follow-sheet__note svg {
  flex: 0 0 auto;
  margin-top: 1px;
  fill: var(--yellow-ink);
}

.follow-sheet__title {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.2;
}

.follow-sheet__lead {
  margin: -0.35rem 0 0;
  color: var(--ink-2);
  font-size: 0.9rem;
}

.follow-sheet__options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.follow-option {
  width: 100%;
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.65rem;
  padding: 0.7rem 0.8rem;
  border: 1.5px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.follow-option:hover {
  border-color: var(--ink-3);
}

.follow-option:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.follow-option__icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--bg);
  color: var(--ink-2);
}

.follow-option__icon svg,
.follow-option__end svg {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.follow-option__text strong {
  display: block;
  font-family: var(--head);
  font-size: 0.92rem;
  font-weight: 800;
  line-height: 1.25;
}

.follow-option__text span {
  display: block;
  margin-top: 0.15rem;
  color: var(--ink-3);
  font-size: 0.82rem;
  line-height: 1.35;
}

.follow-option__end {
  color: var(--ink-3);
  display: grid;
  place-items: center;
}

.follow-option--active,
.follow-option--active:hover {
  border-color: var(--yellow);
  background: var(--yellow-soft);
  cursor: default;
}

.follow-option--active .follow-option__icon {
  background: var(--surface);
  color: var(--yellow-ink);
}

.follow-option--active .follow-option__text span {
  color: var(--yellow-ink);
}

.follow-option--busy {
  cursor: progress;
}

.follow-option--busy .follow-option__text span {
  color: var(--ink-2);
  font-weight: 600;
}

.follow-option__pill {
  padding: 0.3rem 0.45rem;
  border-radius: 999px;
  background: var(--yellow);
  color: var(--ink);
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.follow-sheet__off {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
}

.follow-sheet__off-btn {
  min-height: 40px;
  padding: 0 0.8rem;
  border: 0;
  border-radius: 10px;
  background: none;
  color: var(--red);
  font: inherit;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.follow-sheet__off-btn:hover {
  background: var(--red-soft);
}

.follow-sheet__foot {
  margin: 0;
  color: var(--ink-3);
  font-size: 0.78rem;
  text-align: center;
}

.follow-sheet__btn {
  min-height: 46px;
  border: 1px solid var(--line);
  border-radius: 11px;
  background: var(--surface);
  color: var(--ink);
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

.follow-sheet__btn--primary {
  border: none;
  background: var(--yellow);
}

.follow-option:focus-visible,
.follow-sheet__btn:focus-visible,
.follow-sheet__off-btn:focus-visible,
.follow-sheet__close:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/productActionsBar.spec.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git -C /root/Docker/projetos/dev-joinvilleboasofertas add app/composables/useJboProductFollow.ts app/components/offers/ProductFollowSheet.vue tests/productActionsBar.spec.ts
git -C /root/Docker/projetos/dev-joinvilleboasofertas commit -m "feat(produto): folha e composable do sino por mercado

Opções que já ativam o aviso, selo Ativo, troca de escopo e desligar;
desligar usa a inscrição atual e seguir garante permissão e dispositivo.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git -C /root/Docker/projetos/dev-joinvilleboasofertas push origin develop
```

---

### Task 5: Barra na página do produto, docs e verificação

**Files:**
- Create: `app/components/offers/ProductActionsBar.vue`
- Modify: `app/pages/produto/[slug]/[[loja]].vue`, `README.md`, `tests/productActionsBar.spec.ts`, `tests/productPage.spec.ts`, `tests/offerTitle.spec.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–4; `useShareLink` (existente).
- Produces: `ProductActionsBar` — props `offer: JboOffer` (oferta em foco), `offers: JboOffer[]` (todas da página), `productTitle: string`, `sharePath: string`.

- [ ] **Step 1: Testes que falham**

Acrescentar ao fim de `tests/productActionsBar.spec.ts`:

```ts
describe('barra de ações do produto', () => {
  it('três botões na ordem Reportar · Compartilhar · Sino, só ícone e 44px', () => {
    const bar = source('app/components/offers/ProductActionsBar.vue')
    const report = bar.indexOf('data-test="product-report"')
    const share = bar.indexOf('data-test="product-share"')
    const bell = bar.indexOf('data-test="product-follow"')
    expect(report).toBeGreaterThan(-1)
    expect(report).toBeLessThan(share)
    expect(share).toBeLessThan(bell)
    expect(bar).toContain('aria-label="Reportar um erro"')
    expect(bar).toContain('aria-label="Compartilhar oferta"')
    expect(bar).toContain(':aria-label="bellLabel"')
    expect(bar).toContain(':aria-pressed=')
    expect(bar).toMatch(/width:\s*44px/)
  })

  it('linha de avisos: compartilhar e sino antes da legenda, legenda abre a folha', () => {
    const bar = source('app/components/offers/ProductActionsBar.vue')
    expect(bar).toContain("'Link copiado'")
    expect(bar).toContain('useShareLink')
    expect(bar).toContain('followCaption')
    expect(bar).toContain('data-test="product-follow-caption"')
    expect(bar).toContain('aria-live="polite"')
    expect(bar).toContain('followInstructionMode(isIos.value, isStandalone.value)')
  })

  it('usa as duas folhas e o composable do sino', () => {
    const bar = source('app/components/offers/ProductActionsBar.vue')
    expect(bar).toContain('<ReportOfferSheet')
    expect(bar).toContain('<ProductFollowSheet')
    expect(bar).toContain('useJboProductFollow(productId, pageStoreId, pageStoreName)')
    expect(bar).toContain('title: props.productTitle')
  })
})
```

Em `tests/productPage.spec.ts`, trocar o teste `'compartilha a oferta ao lado do título'` por:

```ts
  it('barra de ações fica acima do título, sem o compartilhar antigo', () => {
    const page = source('app/pages/produto/[slug]/[[loja]].vue')
    expect(page).toContain('<ProductActionsBar')
    expect(page.indexOf('<ProductActionsBar')).toBeLessThan(page.indexOf('<h1>'))
    expect(page).toContain(':offer="selected"')
    expect(page).toContain(':offers="data.offers"')
    expect(page).toContain(':share-path="sharePath"')
    expect(page).not.toContain('data-test="product-share"')
    expect(page).not.toContain('class="heading"')
    expect(page).not.toContain('shareEncarte')
  })
```

Em `tests/offerTitle.spec.ts`, no teste `'página do produto usa o título completo no h1, SEO, share e JSON-LD'`, trocar `expect(page).toContain('title: productTitle.value')` por:

```ts
    expect(page).toContain(':product-title="productTitle"')
    expect(source('app/components/offers/ProductActionsBar.vue')).toContain('title: props.productTitle')
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test -- tests/productActionsBar.spec.ts tests/productPage.spec.ts tests/offerTitle.spec.ts`
Expected: FAIL (barra não existe; página ainda tem o compartilhar antigo).

- [ ] **Step 3: `app/components/offers/ProductActionsBar.vue`**

```vue
<template>
  <div class="product-actions">
    <p class="product-actions__status" aria-live="polite">
      <button
        v-if="showCaption"
        type="button"
        class="product-actions__caption"
        :class="{ 'product-actions__caption--on': caption.on }"
        data-test="product-follow-caption"
        @click="openFollow"
      >
        {{ caption.text }}
      </button>
      <template v-else>{{ transientText }}</template>
    </p>
    <div class="product-actions__bar" role="group" aria-label="Ações da oferta">
      <button
        type="button"
        class="product-actions__btn"
        aria-label="Reportar um erro"
        title="Reportar um erro"
        aria-haspopup="dialog"
        data-test="product-report"
        @click="reportOpen = true"
      >
        <svg class="product-actions__icon" viewBox="0 0 24 24" width="21" height="21" aria-hidden="true">
          <path d="M5.5 21V4.5" />
          <path d="M5.5 4.5h11.2l-2.3 4 2.3 4H5.5" />
        </svg>
      </button>
      <button
        type="button"
        class="product-actions__btn"
        aria-label="Compartilhar oferta"
        title="Compartilhar"
        data-test="product-share"
        @click="onShare"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
          <circle cx="18" cy="5" r="2.5" fill="currentColor" />
          <circle cx="6" cy="12" r="2.5" fill="currentColor" />
          <circle cx="18" cy="19" r="2.5" fill="currentColor" />
          <path
            d="M8.4 10.8 15.6 6.7M8.4 13.2l7.2 4.1"
            fill="none"
            stroke="currentColor"
            stroke-width="1.7"
            stroke-linecap="round"
          />
        </svg>
      </button>
      <button
        type="button"
        class="product-actions__btn product-actions__bell"
        :aria-label="bellLabel"
        :title="bellLabel"
        :aria-pressed="followsHere(state, pageStoreId) ? 'true' : 'false'"
        aria-haspopup="dialog"
        data-test="product-follow"
        @click="openFollow"
      >
        <svg class="product-actions__icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path class="product-actions__bell-body" d="M12 3a6 6 0 0 0-6 6v2.7L4.2 15a1.2 1.2 0 0 0 1 1.9h13.6a1.2 1.2 0 0 0 1-1.9L18 11.7V9a6 6 0 0 0-6-6zm0 18a2.8 2.8 0 0 1-2.7-2h5.4A2.8 2.8 0 0 1 12 21z" />
        </svg>
      </button>
    </div>

    <ReportOfferSheet
      :open="reportOpen"
      :offer-id="offer.id"
      :product-title="productTitle"
      :store-name="offer.establishment_name"
      @close="reportOpen = false"
    />
    <ProductFollowSheet
      :open="followOpen"
      :view="sheetView"
      :product-title="productTitle"
      :price-line="followPriceLine(offer)"
      :image-url="offer.image_url"
      :busy="busy"
      :waiting-text="followBusyText(instruction)"
      @pick="onPick"
      @off="onOff"
      @install="onInstall"
      @close="followOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import type { JboOffer } from '~/utils/jboApi'
import {
  followBellLabel,
  followBusyText,
  followCaption,
  followPriceLine,
  followSheetView,
  followsHere,
  pickAction,
  type FollowPick,
  type ProductFollowAction,
} from '~/utils/productFollow'
import { followInstructionMode, type FollowInstructionMode } from '~/utils/webPush'

const props = defineProps<{
  offer: JboOffer
  offers: JboOffer[]
  productTitle: string
  sharePath: string
}>()

const productId = computed(() => props.offer.product_id)
const pageStoreId = computed(() => props.offer.establishment_id)
const pageStoreName = computed(() => props.offer.establishment_name)
const { state, busy, flash, apply } = useJboProductFollow(productId, pageStoreId, pageStoreName)
const { isIos, isStandalone, promptInstall } = usePwaInstall()
const { status: shareStatus, share } = useShareLink()

const reportOpen = ref(false)
const followOpen = ref(false)
const instruction = ref<FollowInstructionMode>('request-permission')

const caption = computed(() => followCaption(state.value, pageStoreId.value))
const bellLabel = computed(() => followBellLabel(state.value, pageStoreId.value))

/** Aviso passageiro: compartilhar tem prioridade, depois o resultado do sino. */
const transientText = computed(() => {
  if (shareStatus.value === 'copied') return 'Link copiado'
  if (shareStatus.value === 'failed') return 'Não foi possível compartilhar agora.'
  return flash.value
})
const showCaption = computed(() => !transientText.value && Boolean(caption.value.text))

const sheetView = computed(() => followSheetView({
  state: state.value,
  pageStoreId: pageStoreId.value,
  pageStoreName: pageStoreName.value,
  offers: props.offers,
  instructionMode: instruction.value,
}))

/** Abre a folha do sino lendo a permissão do navegador agora (não fica em cache). */
function openFollow() {
  instruction.value = followInstructionMode(isIos.value, isStandalone.value)
  followOpen.value = true
}

/** Opção escolhida: aplica e fecha a folha quando der certo. */
async function onPick(pick: FollowPick) {
  if (await apply(pickAction(pick))) followOpen.value = false
}

/** Desligar aqui ou em todos. */
async function onOff(action: ProductFollowAction) {
  if (await apply(action)) followOpen.value = false
}

/** iPhone fora do app: fecha a folha e mostra como instalar. */
async function onInstall() {
  followOpen.value = false
  await promptInstall()
}

/** Folha nativa ou copiar a URL do produto neste mercado. */
async function onShare() {
  const origin = import.meta.client ? window.location.origin : ''
  await share({
    title: props.productTitle,
    text: `Oferta em ${props.offer.establishment_name}`,
    url: `${origin}${props.sharePath}`,
  })
}
</script>

<style scoped>
/* Aviso à esquerda dos botões, no espaço livre da linha: não empurra o título. */
.product-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.75rem;
  min-height: 44px;
}

.product-actions__status {
  flex: 1;
  min-width: 0;
  margin: 0;
  color: var(--ink-3);
  font-size: 0.82rem;
  font-weight: 600;
  line-height: 1.3;
  text-align: right;
}

.product-actions__caption {
  padding: 0.25rem 0;
  border: 0;
  background: none;
  color: var(--ink-3);
  font: inherit;
  text-align: right;
  cursor: pointer;
}

.product-actions__caption--on {
  color: var(--yellow-ink);
}

.product-actions__bar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.product-actions__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: 10px;
  background: var(--surface);
  color: var(--ink-2);
  cursor: pointer;
}

.product-actions__icon {
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linejoin: round;
  stroke-linecap: round;
}

.product-actions__bell[aria-pressed="true"] {
  background: var(--yellow-soft);
  border-color: var(--yellow);
  color: var(--yellow-ink);
}

.product-actions__bell[aria-pressed="true"] .product-actions__bell-body {
  fill: currentColor;
}

.product-actions__btn:hover {
  border-color: var(--ink-3);
}

.product-actions__btn:focus-visible,
.product-actions__caption:focus-visible {
  outline: 2px solid var(--yellow);
  outline-offset: 2px;
}
</style>
```

- [ ] **Step 4: Página do produto**

Em `app/pages/produto/[slug]/[[loja]].vue`:

1. Trocar o bloco do template

```html
      <div class="heading">
        <h1>{{ productTitle }}</h1>
        <button ... data-test="product-share" ...> ... </button>
      </div>
      <p class="copied" aria-live="polite">{{ copied ? 'Link copiado' : '' }}</p>
```

por

```html
      <ProductActionsBar
        v-if="selected"
        :offer="selected"
        :offers="data.offers"
        :product-title="productTitle"
        :share-path="sharePath"
      />
      <h1>{{ productTitle }}</h1>
```

2. No `<script setup>`: remover o import `import { shareEncarte } from '~/utils/shareEncarte'`, as variáveis `copied` e `copiedTimer` e a função `onShare`; acrescentar, depois de `productTitle`:

```ts
/** Caminho canônico do produto no mercado em foco (compartilhar). */
const sharePath = computed(() => productOfferPath({
  product_id: data.value?.product.id || '',
  product_slug: data.value?.product.slug,
  establishment_slug: selected.value?.establishment_slug || lojaSlug.value || '',
}))
```

3. No `<style scoped>`: remover as regras `.heading`, `.share`, `.share__icon`, `.share:hover`, `.share:focus-visible`, `.copied` e `.copied:empty`; trocar `h1 { flex: 1; margin: 0; ... }` por `h1 { margin: 0; ... }` (sem o `flex: 1`) e acrescentar:

```css
.page__main :deep(.product-actions) {
  margin-bottom: -0.5rem;
}
```

- [ ] **Step 5: README**

Na tabela de rotas do `README.md`, trocar a linha de `/produto/{slug}/{loja}` por:

```markdown
| `/produto/{slug}/{loja}` | Produto + preço na loja, recorte do encarte e preços por loja; barra acima do título com Reportar um erro, Compartilhar e Sino (este mercado ou todos) |
```

E, depois da seção "Ofertas (contrato do snap-api)", acrescentar:

```markdown
## Página do produto — barra de ações

`ProductActionsBar` (acima do `h1`) tem três botões só com ícone: **Reportar um erro**
(`ReportOfferSheet`: motivo, comentário — obrigatório em "Outro" — e contato opcional;
`POST /api/public/jbo/offer-reports`), **Compartilhar** (`useShareLink`) e **Sino**
(`ProductFollowSheet`). O sino segue o produto **só no mercado da página** ou **em todos os
mercados** (`/push/product-follows*`); nenhuma opção vem marcada e tocar já ativa. Mercados
escolhidos em páginas diferentes se somam; "todos" substitui a lista. A linha à esquerda
mostra onde o aviso vale ("Avisos neste mercado", "Avisos em todos os mercados"…) e os avisos
passageiros. Regras e textos em `app/utils/productFollow.ts`; Web Push compartilhado com a
loja em `app/utils/webPush.ts`.
```

- [ ] **Step 6: Suite completa e build**

```bash
npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas test
npm run --prefix /root/Docker/projetos/dev-joinvilleboasofertas build
```

Expected: todos os testes PASS; build sem erro.

- [ ] **Step 7: Container de dev e verificação visual**

```bash
docker compose -f /root/Docker/projetos/dev-joinvilleboasofertas/docker-compose.yml up -d --build app
```

Script de captura em `<scratchpad>/produto-barra.cjs` (Playwright do cache do npx + chromium-1228, como na memória do workspace):

```js
const { chromium } = require('/root/.npm/_npx/e41f203b7505f1fb/node_modules/playwright')

;(async () => {
  const out = process.argv[2]
  const browser = await chromium.launch({
    executablePath: '/root/.cache/ms-playwright/chromium-1228/chrome-linux64/chrome',
    args: ['--no-sandbox'],
  })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
  await page.goto('http://localhost:8092/produto/bonare-milho-verde/komprao-koch-atacadista', { waitUntil: 'networkidle' })
  await page.screenshot({ path: `${out}/1-barra.png` })
  await page.click('[data-test="product-report"]')
  await page.click('[data-test="report-reason-other"]')
  await page.screenshot({ path: `${out}/2-relato.png` })
  await page.keyboard.press('Escape')
  await page.click('[data-test="product-follow"]')
  await page.screenshot({ path: `${out}/3-sino.png` })
  await browser.close()
})()
```

Run: `node <scratchpad>/produto-barra.cjs <scratchpad>`. Olhar as três imagens: barra com os três ícones acima do título; folha de relato com "Outro" marcado e "(obrigatório)"; folha do sino com "Só no Komprão Koch Atacadista" e "Em todos os mercados", nenhuma marcada, e "Hoje em 3 mercados, a partir de R$ 1,99.".

Verificação manual com push real (no celular, pelo usuário): no Chrome Android em `https://joinvilleboasofertas-loc-app.cacin.dev/produto/bonare-milho-verde/komprao-koch-atacadista`, tocar no sino → "Só no Komprão…" → permitir → legenda "Avisos neste mercado"; tocar de novo → folha "Avisos deste produto" → "Em todos os mercados" → legenda muda. Conferir também que o sino da página da loja (`/loja/komprao-koch-atacadista`) continua seguindo e deixando de seguir como antes.

- [ ] **Step 8: Commit**

```bash
git -C /root/Docker/projetos/dev-joinvilleboasofertas add app/components/offers/ProductActionsBar.vue "app/pages/produto/[slug]/[[loja]].vue" README.md tests/productActionsBar.spec.ts tests/productPage.spec.ts tests/offerTitle.spec.ts
git -C /root/Docker/projetos/dev-joinvilleboasofertas commit -m "feat(produto): barra com reportar erro, compartilhar e sino acima do título

O compartilhar sai do lado do título e vai para a barra, junto do relato
de erro e do sino por mercado (este mercado ou todos).

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
git -C /root/Docker/projetos/dev-joinvilleboasofertas push origin develop
```
