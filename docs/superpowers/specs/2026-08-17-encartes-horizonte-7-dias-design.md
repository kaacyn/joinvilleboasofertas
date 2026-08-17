# Horizonte de 7 dias nos encartes públicos — Design

**Data:** 2026-08-17  
**Status:** Aprovado em conversa; aguardando revisão do arquivo  
**Base:** `docs/superpowers/specs/2026-08-16-encartes-publicos-design.md`

## Objetivo

Limitar o feed público de encartes para não exibir peças cuja validade ainda está longe demais, sem remover os já vencidos (selo **Expirado**).

## Decisões

| Tema | Decisão |
|------|--------|
| Regra | Incluir apenas se `promo_ends_on <= hoje + 7 dias` (data local) |
| Inclusivo | Vence exatamente no 7º dia **entra** |
| Vencidos | Continuam no feed (`promo_ends_on` no passado) |
| Onde | `eligible_encartes_qs()` na API — alimenta feed e `/encartes/stores` |
| Constante | `ENCARTE_HORIZON_DAYS = 7` no serviço de encartes |
| Frontend | Sem mudança |
| Query param | Não — regra fixa do produto |

## Critério adicional de inclusão

Além dos critérios já definidos na spec base:

5. `promo_ends_on <= timezone.localdate() + timedelta(days=7)`

Equivalente: **excluir** encartes com `promo_ends_on > hoje + 7`.

## Impacto

- `GET /api/public/jbo/encartes` — itens longínquos somem
- `GET /api/public/jbo/encartes/stores` — loja some se só tiver encartes fora do horizonte
- UI Nuxt, lightbox, selo Expirado, ordenação e paginação — inalterados

## Fora de escopo

- Horizonte configurável por query/admin
- Filtro só no frontend
- Alterar regras do Snap Studio / Instagram

## Critérios de sucesso

1. Encarte com `promo_ends_on = hoje + 8` **não** aparece no feed nem em stores.
2. Encarte com `promo_ends_on = hoje + 7` **aparece**.
3. Encarte vencido (`promo_ends_on < hoje`) **aparece** com `promo_active=false`.
4. Testes na API cobrem os três casos acima.
5. Frontend não precisa de commit para esta regra.

## Repo

| Repo | Papel |
|------|--------|
| `dev-snap-api` | Filtro em `eligible_encartes_qs` + testes |
| `dev-joinvilleboasofertas` | Spec (este arquivo) + alinhamento da spec base |
