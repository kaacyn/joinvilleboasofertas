# Menção “Cadastrado há…” nos cards de encarte — Design

**Data:** 2026-08-17  
**Status:** Aprovado em conversa; aguardando revisão do arquivo  
**Base:** `docs/superpowers/specs/2026-08-16-encartes-publicos-design.md`

## Objetivo

Mostrar em cada card do feed público quando o encarte foi cadastrado, em linguagem relativa e intuitiva (ex.: “Cadastrado há 5 minutos”).

## Decisões

| Tema | Decisão |
|------|--------|
| Onde | Só no `EncarteCard` (não no lightbox) |
| Fonte | `PhotoScan.created_at` |
| API | Novo campo `created_at` (ISO-8601) no item do feed |
| Formatação | No Nuxt, a partir de `created_at` |
| Prefixo | `Cadastrado há …` (exceto “agora”) |
| Escala | &lt; 1 min → `Cadastrado agora`; minutos; horas; dias; ≥ 30 dias → `Cadastrado em dd/mm/aaaa` |
| Plural | Português correto (`minuto`/`minutos`, `hora`/`horas`, `dia`/`dias`) |
| Lightbox | Sem mudança |

## API

Em `serialize_encarte` / `JboEncarteSchema`:

```json
"created_at": "2026-08-17T12:34:56.789012-03:00"
```

(ISO com timezone, o mesmo instante já usado no cursor de paginação.)

## UI

No card, abaixo de “Válido até …”:

```
Cadastrado há 2 horas
```

Estilo: tipografia secundária (mesma família de `.card__dates` / muted).

## Fora de escopo

- Texto relativo gerado na API
- Menção no lightbox ou em outras páginas
- Ordenação do feed por `created_at` (continua por `promo_ends_on`)

## Critérios de sucesso

1. JSON do feed inclui `created_at` em cada item.
2. Card mostra menção relativa coerente com o instante de cadastro.
3. Encartes com ≥ 30 dias mostram data absoluta `Cadastrado em dd/mm/aaaa`.
4. Lightbox inalterado.
5. Testes API cobrem presença de `created_at`; testes Nuxt cobrem a formatação relativa.

## Repos

| Repo | Papel |
|------|--------|
| `dev-snap-api` | Campo no schema/serialize + teste |
| `dev-joinvilleboasofertas` | Tipo, helper relativo, `EncarteCard`, testes |
