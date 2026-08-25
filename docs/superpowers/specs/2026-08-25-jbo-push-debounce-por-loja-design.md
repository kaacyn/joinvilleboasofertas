# Design: Debounce de push de encartes por supermercado

**Data:** 2026-08-25  
**Repos:** snap-api (`apps.jbo_public`) + JBO (URL de destino já suportada)  
**Status:** Aprovado em brainstorming

## Problema

Cada encarte elegível dispara um Web Push imediato (`/encarte/{id}`). Vários encartes da mesma loja em sequência geram spam. Queremos **uma** notificação por supermercado após uma janela quieta.

## Decisões

| Tema | Decisão |
|------|--------|
| Comportamento | Sem push por encarte individual |
| Debounce | 15 min sem novos encartes **da mesma loja** (cada novo elegível reinicia o timer) |
| Destino | `/encartes?establishment_ids={uuid}` |
| Título / body | Nome da loja / `Novas ofertas` (igual hoje) |
| Audiência | Devices com `JboStoreFollow` daquela loja |
| Abordagem | Fila pendente por loja + Celery countdown (revoga/reagenda) |
| Escopo | `dev-snap-api` neste ciclo; frontend já filtra por `establishment_ids` |
| Manual admin | Campanhas manuais inalteradas |

## Fluxo

```text
PhotoScan post_save (elegível, <24h)
  → marca scan como pendente de push da loja
  → cancela countdown anterior da loja (se houver)
  → agenda flush_store_encarte_push(est_id) em 15 min

flush (após quietude)
  → coleta scans pendentes da loja ainda elegíveis
  → cria 1 JboPushCampaign (kind=encarte)
  → title/body/url do lote
  → fan-out Celery existente
  → marca scans como “já notificados” (não reentram)
```

## Modelo / trava

Hoje `JboPushCampaign.photo_scan` é OneToOne (1 campanha por scan). Com lote:

- Remover a obrigatoriedade OneToOne para o fluxo automático **ou** deixar `photo_scan` null e usar tabela de vínculo N:N / pending.
- Introduzir pendência explícita, por exemplo:
  - `JboEncartePushPending` (establishment, photo_scan unique, created_at, notified_at null|set), **ou**
  - reusar/evoluir `JboEncartePushDispatch` com estado `pending` → `sent` agregado por loja.

Estado por loja para o countdown: guardar `celery_task_id` (e `quiet_until`) em registro por establishment (ex. `JboStoreEncartePushWindow`) para poder revogar/reagendar.

Constante: `ENCARTE_PUSH_DEBOUNCE = timedelta(minutes=15)`.

## Campanha gerada no flush

| Campo | Valor |
|-------|--------|
| `kind` | `encarte` |
| `title` | nome do establishment |
| `body` | `Novas ofertas` |
| `url` | `/encartes?establishment_ids={establishment.id}` |
| establishments M2M | aquela loja |
| recipients | follows da loja |

Scans do lote ficam associados à campanha (M2M ou tabela de join) só para auditoria/idempotência — o clique do usuário **não** abre um encarte único.

## Idempotência e edge cases

- Scan já notificado (em lote enviado) não volta à fila.
- Scan que deixa de ser elegível antes do flush é omitido; se a fila ficar vazia, não envia.
- Mesmo um único encarte espera os 15 min.
- `ENCARTE_PUSH_MAX_AGE` (24h) continua: só entra na fila se o scan for recente o suficiente no momento do `post_save` (e opcionalmente revalidado no flush).
- Worker restart: countdown perdido → Beat leve (ex. a cada 5 min) ou re-schedule no próximo save; preferir **janela persistida** (`quiet_until`) + task periódica curta que faz flush das lojas com `quiet_until <= now` e pendentes — mais robusto que só countdown em memória. **Decisão de implementação:** persistir `quiet_until` por loja; Celery Beat a cada ~1–2 min chama `flush_due_store_windows()`; o “debounce” é “última atividade + 15 min”, sem depender de revoke de task. (Equivalente funcional à opção 1 com melhor resiliência.)

## Fora de escopo

- Mudar copy / quantidade no body  
- Push para `/loja/{slug}`  
- Produção (`prd-snap-api`) neste ciclo  
- Agrupar várias lojas numa única notificação  

## Critérios de aceite

1. Dois encartes da mesma loja com intervalo &lt; 15 min → **um** push, URL com `establishment_ids`.
2. Terceiro encarte 5 min após o segundo → timer reinicia; push só 15 min após o terceiro.
3. Lojas diferentes → timers/pushes independentes.
4. Não há mais push com URL `/encarte/{id}` no fluxo automático.
5. Testes cobrem debounce, flush vazio, e URL/payload da campanha.
