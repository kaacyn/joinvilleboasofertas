# JBO PWA, compartilhar encarte e sino público — Design

**Data:** 2026-08-17  
**Status:** Aprovado em conversa; aguardando revisão do arquivo  
**Base:** `docs/superpowers/specs/2026-08-16-encartes-publicos-design.md`

## Objetivo

Tornar o Joinville Boas Ofertas instalável como aplicativo (PWA), no mesmo espírito do Snap; permitir compartilhar um encarte por URL própria; e avisar o visitante — **sem login** — quando a loja que ele acompanhar publicar um encarte novo.

## Problema

- O JBO é site público (Nuxt), sem manifesto, service worker nem fluxo “Adicionar à tela inicial”.
- O card de encarte não tem ação de compartilhar; não existe URL estável por encarte (só lightbox na listagem).
- O módulo de notificações do Snap (`PushSubscription` → `User`, inbox, campanhas) exige conta. O JBO permanece público: a sessão do Snap **não** vale neste domínio (JWT em `localStorage` por origem).

## Decisões

| Tema | Decisão |
|------|--------|
| Identidade | Sem login, sem SSO, sem inbox. Preferências vivem no navegador. |
| App | PWA completa: manifesto, ícones, service worker, prompt de instalação. |
| Compartilhar | Folha nativa no celular (`navigator.share`); no desktop, copiar link. |
| URL | Página pública `/encarte/{id}` com Open Graph (não query na listagem). |
| Sino | Web Push anônimo; segue a **loja**, não o papel. |
| Pipeline | Reusar VAPID + `WebPushSender` + Celery; tabelas/rotas **novas** só do JBO. |
| Snap auth push | `PushSubscription.user` e `/api/notifications/push/*` **não mudam**. |

São três fatias independentes, nesta ordem: PWA → compartilhar → sino (o SW da fatia 1 é pré-requisito do push no iPhone).

## Fora de escopo

- Conta, cadastro, SSO com o Snap, inbox de notificações no JBO.
- App nativo (Play Store / App Store).
- Bottom nav, FAB de captura ou shell autenticado do Snap — só install + SW.
- OneSignal, FCM direto ou outro vendor de push.
- Avisar encarte já existente ou atualização de um papel antigo.
- Compartilhar atalhos explícitos de Facebook/Instagram (a folha nativa cobre as redes no celular).
- Mudar o lightbox da listagem `/encartes`.

---

## Fatia 1 — PWA

**Repo:** `dev-joinvilleboasofertas`

- Plugin `@vite-pwa/nuxt` em modo **`injectManifest`**, no mesmo espírito de `snap/vite.config.js` + `snap/src/sw/sw.js` (Workbox + handlers `push` / `notificationclick` na fatia 3).
- `display: standalone`, `lang: pt-BR`, `start_url: /`, `scope: /`.
- `theme_color` / `background_color`: `#0D131D` (já usado em `theme-color`).
- `name`: Joinville Boas Ofertas; `short_name`: JBO.
- Ícones 192 e 512 (`any` + `maskable`), gerados a partir do logo em `public/assets/` (portar `snap/scripts/generate-pwa-icons.mjs`).
- Prompt de instalação no mobile: portar o padrão `usePwaInstall` + modal iOS / fallback Android (`snap/src/composables/usePwaInstall.js`, `IosInstallModal.vue`, `AndroidInstallModal.vue`). Onde colocar o CTA: header ou banner discreto, **não** BottomNav.
- Toast de “Nova versão” no espírito de `usePwaUpdate.js` (poll do SW).
- Desktop: o site continua o mesmo; “app” = instalado na tela inicial.

O SW **não** cacheia `/api/` nem `/api/img/` (assinatura HMAC). Denylist de navegação igual ao Snap (`/api/`).

---

## Fatia 2 — Compartilhar e `/encarte/{id}`

### API (`dev-snap-api`)

`GET /api/public/jbo/encartes/{id}` (`id` UUID)

- Registrar **depois** de `GET /encartes` e `GET /encartes/stores`, para `stores` não ser capturado como id.
- Mesmo serializer do feed (`serialize_encarte`), **sem** `dataset_status`.
- 200 só se o scan passar em `eligible_encartes_qs()` (pending/approved, imagem, horizonte de 7 dias, escopo JBO). Expirado **entra** (`promo_active: false`).
- Fora do conjunto: **404**. Não distinguir “não existe” de “rejeitado”.

### Página (`dev-joinvilleboasofertas`)

`app/pages/encarte/[id].vue`

- Imagem inteira (`image_url_xl` com fallback `image_url`), loja + logo, validade, “Cadastrado há…”, sino, três pontinhos.
- `useSeoMeta` / OG: título com nome da loja, descrição curta (“Encarte válido até dd/mm/aaaa”), `og:image` absoluta apontando para `image_url_xl` no `NUXT_PUBLIC_SITE_URL`.
- 404 do Nuxt quando a API devolver 404.

### Card / lightbox

O card **deixa de ser um `<button>` único** (hoje `EncarteCard.vue` envolve tudo). Aninhar sino/⋯ aí é HTML inválido.

- Outer: `<article class="card">`.
- Abrir lightbox: botão (ou área) **irmão** das ações, não pai delas.
- Sino e três pontinhos: botões irmãos, overlay no canto da miniatura, alvo ~44px.
- Menu ⋯: padrão próximo de `HeaderMenu` / `FilterChipDropdown` (fecha fora + Escape); **sem** `role="menu"` incompleto se não houver setas.
- `navigator.share({ title, text, url })` quando existir; senão copiar `origin + /encarte/{id}` e confirmar na UI.
- Lightbox da listagem inalterado.

---

## Fatia 3 — Sino público (Web Push anônimo)

### Modelo (`dev-snap-api`)

Não alterar `apps.notifications.models.PushSubscription`.

Novas tabelas (nomes finais na implementação, responsabilidade única):

1. **Dispositivo JBO** — `endpoint` (único), `p256dh`, `auth`, `user_agent`, timestamps, `failed_count` / `last_sent_at` no mesmo espírito da subscription autenticada.
2. **Seguir loja** — FK dispositivo + `establishment_id`, `unique_together` (dispositivo, loja).
3. **Disparo** — `photo_scan_id` único (um encarte notifica no máximo uma vez, para quem seguia a loja **naquele instante**). Quem seguir depois não recebe o papel antigo.

### Rotas públicas (`auth=None`, prefixo `/api/public/jbo/push/`)

| Método | Caminho | Corpo / efeito |
|--------|---------|----------------|
| GET | `/vapid-public-key` | `{ "public_key": "<VAPID_PUBLIC_KEY>" }` — a privada **não** sai. |
| PUT | `/devices` | `{ endpoint, p256dh, auth, user_agent }` upsert do dispositivo. |
| POST | `/follows/query` | `{ endpoint }` → `{ "establishment_ids": ["…"] }` (endpoint no body, não na querystring). |
| PUT | `/follows` | `{ endpoint, establishment_id, following: bool }` liga/desliga a loja. 404 se loja fora do escopo JBO. |

Sem JWT. O `endpoint` Web Push é o segredo do dispositivo; não listar follows por `establishment_id` sem o endpoint.

Limites: recusar payload sem chaves; `establishment_id` UUID; no máximo 30 PUTs por IP por minuto (devices + follows somados).

### UI

- Sino no card e em `/encarte/{id}`, canto da mídia, irmão do botão de abrir (não filho).
- Primeiro toque: `Notification.requestPermission` → `pushManager.subscribe` (VAPID da rota pública) → `PUT /devices` → `PUT /follows` com `following: true`.
- Toques seguintes: só `PUT /follows` (toggle). Estado visual: preenchido se a loja está em `establishment_ids`.
- Permissão `denied`: aviso, sem fingir que segue.
- iOS fora de `standalone`: explicar que precisa instalar o app na tela inicial.
- Navegador sem `PushManager`: ocultar o sino ou desabilitar com o mesmo recado.

Persistência extra em `localStorage` é opcional (otimismo); a fonte da verdade é `POST /follows/query`.

### Gatilho

Quando um `PhotoScan` **passa a ser elegível** (e ainda não tem disparo registrado):

- Enfileirar tarefa Celery que resolve seguidores da `establishment_id` e chama `WebPushSender.send` por dispositivo.
- Payload: `title` = nome da loja; `body` = “Novo encarte” (validade se couber em 255); `url` = `/encarte/{id}` (path relativo; o SW do JBO prefixa a origem do JBO).
- Evento **não** entra em `EVENT_CHANNELS` autenticados; não cria `Notification` de inbox.
- 410/gone do push: incrementar falha e remover dispositivo (mesmo critério das tasks atuais de `send_push_to_subscription`).
- Não disparar no backfill de encartes já listáveis na data do deploy: só transição nova após o código entrar.

### Service worker (JBO)

- `push`: `showNotification` com title/body/url do payload JSON.
- `notificationclick`: focar janela existente ou `clients.openWindow(url)`.

---

## Erros e estados

| Situação | Comportamento |
|----------|----------------|
| API de detalhe 404 | Página 404 do Nuxt; OG não indexa lixo. |
| Share nativo rejeitado | Cai em copiar link; se clipboard falhar, mostra a URL para copiar à mão. |
| Push subscribe falha | Sino volta a inativo; mensagem curta. |
| `PUT /follows` falha depois do subscribe | Sino inativo; não deixar “ativo” só no cliente. |
| Encarte expirado | Página e card existem; sino ainda segue a **loja** (próximos papéis). |

## Testes

**API**

- Detalhe 200 para elegível (incluindo expirado); 404 para rejected / sem imagem / fora do horizonte / fora do escopo.
- VAPID public key presente; privada ausente no JSON.
- Upsert de dispositivo; toggle follow; query devolve só as lojas daquele endpoint.
- Follow de loja fora do JBO → 404.
- Transição para elegível enfileira um disparo; segunda save não duplica; loja sem seguidores não quebra.

**Frontend**

- Card: outer não é `<button>`; não há controle interativo aninhado; ⋯/sino não disparam o lightbox.
- Página `/encarte/[id].vue` existe e pede o detalhe por id.
- Manifest / `registerType` do PWA configurados (asserção de `nuxt.config` + arquivo de manifesto gerado ou config do módulo).
- Helper de share: usa `navigator.share` quando existe; senão clipboard.

## Critérios de sucesso

1. O JBO instala na tela inicial (Chrome Android e fluxo iOS documentado) com ícone e `standalone`.
2. Compartilhar um encarte gera `/encarte/{uuid}` que abre a peça inteira e mostra preview no WhatsApp (OG).
3. Sem login, o sino pede permissão, segue a loja, e um encarte **novo** elegível gera Web Push cujo clique abre essa URL.
4. Inbox, campanhas e push autenticado do Snap permanecem intactos.
5. Feed `/encartes` continua público e sem `dataset_status`.

## Repos

| Repo | Papel |
|------|--------|
| `dev-joinvilleboasofertas` | PWA, card (sino + kebab), página `/encarte/[id]`, SW de push |
| `dev-snap-api` | `GET …/encartes/{id}`, modelos/rotas JBO push, gatilho Celery |

## Ordem de implementação

1. PWA (SW + manifesto + install UI).
2. Detalhe + compartilhar.
3. Dispositivo/follow + gatilho + UI do sino.
