# Campanhas JBO para dispositivos anônimos — Design

**Data:** 2026-08-17  
**Status:** Aprovado em conversa; aguardando revisão do arquivo  
**Base:** `docs/superpowers/specs/2026-08-17-jbo-pwa-push-share-design.md` (fatia 3 — sino)  
**Repos:** `dev-snap-api`, `snap-studio`, `dev-joinvilleboasofertas`

## Objetivo

Dar ao administrador, no Snap Studio, uma área de envio e histórico para quem segue lojas no PWA Joinville Boas Ofertas — **sem login**. Inclui mensagem avulsa para uma ou várias lojas e os avisos automáticos de encarte novo, com métricas de entrega e clique.

## Problema

O sino grava `JboPushDevice` + `JboStoreFollow`. O disparo de encarte manda Web Push e só trava o scan em `JboEncartePushDispatch`. O Studio de notificações (`NotificationCampaign` → `User`) não vê esses dispositivos, não dispara para follows e não registra clique anônimo.

## Decisões

| Tema | Decisão |
|------|--------|
| Onde | Snap Studio, seletor **Usuários Snap** \| **Visitantes JBO** na mesma página `/notificacoes`. |
| Isolamento | Tabelas e rotas novas em `jbo_public`. `NotificationCampaign`, `NotificationRecipient`, `PushSubscription` e `notify()` **não mudam**. |
| Público | União dos follows das lojas escolhidas; cada dispositivo recebe **no máximo uma** vez por campanha. |
| Visualizou | Clique na notificação (`clicked`). “Banner apareceu” fica fora. |
| Destinatário na UI | `device_id` + `user_agent` + status. Sem endpoint, sem `p256dh`/`auth`. |
| Encarte automático | Cria campanha `kind=encarte` e entra no histórico. Só leitura no Studio. |
| Trava de reenvio | `JboPushCampaign.photo_scan` único substitui o papel de `JboEncartePushDispatch` nos envios novos. |
| Agendamento | Fora de v1 (envia agora). |
| Todos os dispositivos | Fora de v1 (só follows de loja). |

## Fora de escopo

- Inbox no JBO, login, SSO.
- Agendar envio JBO.
- Público “todos os dispositivos JBO”.
- Ping de `notificationshow` / visualização sem clique.
- Backfill: encartes já disparados só com `JboEncartePushDispatch` **não** viram campanha antiga.
- Misturar usuários Snap e dispositivos JBO na mesma campanha.
- OneSignal / FCM direto.

---

## Modelo (`dev-snap-api`, app `jbo_public`)

### `JboPushCampaign`

| Campo | Notas |
|-------|--------|
| `id` | UUID |
| `kind` | `manual` \| `encarte` |
| `title` | max 80, mesmo teto das campanhas Snap |
| `body` | max 240 |
| `url` | vazia ou path começando com `/` (max 255), igual às campanhas Snap |
| `status` | `sending` \| `sent` \| `failed` |
| `photo_scan` | OneToOne nullable; preenchido só em `encarte`; único |
| `created_by` | FK user, SET_NULL; vazio no automático |
| `client_request_id` | idempotência do compositor; vazio no automático |
| `created_at` / `sent_at` | |

Métricas (agregado dos destinatários, no espírito de `NotificationCampaign.metrics`):

- `target` = total de destinatários
- `delivered` = `delivered` + `clicked` (clique implica entrega)
- `clicked` = status `clicked`
- `failed` = status `failed`

### Lojas alvo (snapshot)

M2M campanha ↔ `Establishment` (tabela de ligação). Grava as lojas no momento do envio. Follows posteriores não entram nessa campanha.

Limite: no máximo **50** lojas por campanha `manual`. `encarte` tem exatamente uma (a do scan).

### `JboPushRecipient`

| Campo | Notas |
|-------|--------|
| `campaign` + `device` | `unique_together` |
| `status` | `pending` \| `delivered` \| `clicked` \| `failed` |
| `click_token` | único, opaco (`token_urlsafe`); vai no payload do push |
| `delivered_at` / `clicked_at` | |
| `failure_reason` | max 64, vazio se ok |

Sem FK para `User`. Sem `Notification` de inbox.

410/404 do push: status `failed`, motivo `gone`; o dispositivo continua podendo ser apagado como hoje (cascade remove follows; o recipient permanece com o `device_id` quebrado — usar `on_delete=SET_NULL` no device **ou** não apagar o device até o histórico não precisar dele).

**Decisão de integridade:** `device` com `on_delete=SET_NULL`, nullable. Assim o histórico da campanha sobrevive ao gone. A lista mostra `device_id` nulo + user-agent copiado no recipient no momento do envio (`user_agent` snapshot no recipient, para não perder o texto se o device sumir).

### `JboEncartePushDispatch`

Deixa de ser a trava dos **novos** disparos. `maybe_dispatch_encarte_push` faz `get_or_create` da campanha `encarte` por `photo_scan`. A tabela antiga permanece no banco (sem backfill); o código novo não escreve nela.

---

## Envio

### Manual (Studio)

1. Admin escolhe ≥1 loja do `jbo_establishments_qs()`, título, corpo, URL opcional.
2. `POST` cria a campanha `sending`, snapshot das lojas, destinatários = dispositivos distintos com follow em qualquer loja alvo.
3. Depois do `on_commit`, Celery envia um `WebPushSender.send` por recipient `pending`.
4. Payload JSON: `{ title, body, url, click_token, tag: "jbo-{campaign_id}" }`. `url` relativa permitida; o SW prefixa a origem do JBO.
5. HTTP 2xx → `delivered`. 404/410 → `failed`/`gone` e remove o `JboPushDevice`. Outros erros → `failed` + `failed_count` no device, no mesmo espírito da task atual.
6. Campanha vira `sent` quando não resta `pending`. Se todos falharam e havia alvo > 0 → `failed`. Alvo 0 (ninguém segue) → `sent` com métricas zeradas — o admin vê o envio vazio.

Loja fora do escopo JBO no `POST` → 404. Lista vazia de lojas → 400. Título/corpo/URL inválidos → 400, iguais às campanhas Snap.

Idempotência: header `X-Request-Id` (campo `client_request_id`); o mesmo id devolve a campanha já criada, como no Studio atual.

### Encarte automático

Quando o scan passa a ser elegível e tem menos de 24h (regras atuais):

- Cria campanha `kind=encarte`, `title` = nome da loja, `body` = “Novo encarte”, `url` = `/encarte/{id}`, uma loja no snapshot, destinatários = follows **dessa** loja naquele instante.
- Se a campanha já existir para o `photo_scan`, não reenvia (trava).
- Não passa pela API admin de create. Studio mostra como só leitura (sem reenviar? **reenviar falhas sim**, igual manual — o admin pode recuperar gone temporário; create/edit/cancel não).

Retry: `POST .../retry-failed` recoloca `failed` em `pending` e dispara de novo. Só `failed`. `encarte` e `manual` ambos permitem retry.

---

## APIs

Auth admin: JWT + `_require_admin`, prefixo `/api/admin/jbo`.

| Método | Caminho | Efeito |
|--------|---------|--------|
| GET | `/push-campaigns/stores` | Lojas do escopo JBO: `{ id, name }[]` para o picker. |
| GET | `/push-campaigns/preview?establishment_ids=` | `{ device_count }` união atual dos follows (query `id,id`). |
| POST | `/push-campaigns` | Cria `manual` e enfileira. Corpo: `title`, `body`, `url`, `establishment_ids`. Header `X-Request-Id`. |
| GET | `/push-campaigns` | Lista paginada. Filtros: `q`, `status`, `kind`, período (`1d`/`7d`/`30d`). |
| GET | `/push-campaigns/{id}` | Detalhe + métricas + lojas alvo. |
| GET | `/push-campaigns/{id}/recipients` | Paginado. Sem endpoint. Campos: `device_id`, `user_agent`, `status`, `delivered_at`, `clicked_at`, `failure_reason`. |
| POST | `/push-campaigns/{id}/retry-failed` | Reenvia `failed`. |

Sem `DELETE`/cancel (não há `scheduled`). Sem create de `encarte` por essa API.

Público (`auth=None`), prefixo `/api/public/jbo/push/`:

| Método | Caminho | Efeito |
|--------|---------|--------|
| POST | `/click` | `{ "token": "<click_token>" }`. Token válido e ainda não clicado → `clicked` + `clicked_at`. Já clicado → 204 sem mudar horário. Inválido → 404. |

Rate limit do click: 60/IP/min, grupo próprio (`jbo_push_click`). Não autenticado; o token é o segredo.

Rotas atuais de device/follows/vapid **não mudam**.

---

## Studio (`snap-studio`)

Página `/notificacoes`:

1. Seletor de público no header (além de Compor / Histórico): **Usuários Snap** (comportamento atual) e **Visitantes JBO**.
2. Query: `audience=jbo` (default omitido = Snap, para não quebrar links `?tab=historico`).
3. JBO / Compor: multi-select de lojas (lista `GET .../stores`), prévia `device_count`, título, corpo, URL, enviar agora. Sem e-mails, sem agendar, sem modo “todos os usuários”.
4. JBO / Histórico: cards com título, `kind` (`manual`/`encarte`), status, data, métricas alvo/entregue/clicou/falhou.
5. Detalhe: rota **separada** `/notificacoes/jbo/campanhas/:id` para não colidir UUID com campanha Snap. Lista de dispositivos. Botão reenviar falhas. Sem cancelar. Sem duplicar na v1 (YAGNI; o compositor está a um clique).

Campanha `encarte`: formulário não se aplica; o detalhe é o mesmo, campos não editáveis.

---

## PWA (`dev-joinvilleboasofertas`)

`app/sw.ts`:

- `showNotification`: `data` inclui `url` (já existe) e `click_token` quando vier no payload.
- `notificationclick`: `POST` `/api/public/jbo/push/click` com o token (URL absoluta da API JBO, a mesma base das outras rotas públicas), `keepalive` se o browser permitir; em seguida foca/abre a URL. Falha do POST não bloqueia abrir o encarte.
- Push sem `click_token` (envios antigos em cache / workers velhos): abre a URL, não chama click.
- Sem inbox, sem `notification_id` do Snap.

A base da API no SW: `self.location.origin` hoje é o JBO (proxy `/api/public/jbo/...`). O POST usa path `/api/public/jbo/push/click` na origem do PWA, igual `jboSend`.

---

## Erros e estados

| Situação | Comportamento |
|----------|----------------|
| Ninguém segue as lojas | Campanha `sent`, alvo 0, histórico visível. |
| Loja fora do JBO | 404 no create/preview. |
| Clique duplicado | 204, `clicked_at` original. |
| Device gone no meio do fan-out | Recipient `failed`; device removido; recipient guarda snapshot de UA. |
| SW offline no clique | Abre a URL; métrica pode ficar só `delivered` (aceitável). |
| Admin não-admin | 401/403, iguais às campanhas Snap. |

## Testes

**API**

- Create manual: união de duas lojas, device que segue as duas → **um** recipient.
- Preview `device_count` bate com a união.
- Create com loja fora do escopo → 404; sem lojas → 400.
- Idempotência `client_request_id`.
- Click: pending/delivered → clicked; segundo POST não altera `clicked_at`; token lixo → 404.
- Encarte: segundo `maybe_dispatch` do mesmo scan não cria segunda campanha nem segundo fan-out.
- Encarte inelegível / >24h → sem campanha (regras atuais).
- Retry-failed só mexe em `failed`.
- Admin API exige admin; rotas públicas de click sem JWT.
- Payload de listagem de recipients **não** contém `endpoint`.
- `notify()` / `Notification` / `PushSubscription` intocados (teste de não-regressão: create JBO não cria `Notification`).

**Studio**

- Seletor `audience=jbo` mostra compositor de lojas, não o de usuários.
- Histórico JBO lista `kind` encarte e manual.
- Detalhe usa a rota `/notificacoes/jbo/campanhas/:id`.

**PWA**

- SW: `notificationclick` com token chama POST click e abre URL; sem token só abre URL.

## Ordem de implementação

1. Modelos + migração + fan-out de encarte via campanha (API).  
2. Admin API + click público + testes.  
3. Studio (seletor, compositor, histórico, detalhe).  
4. SW: `click_token` no `data` e POST no clique.

Não empilhar inbox Snap nem agendamento nesta spec.
