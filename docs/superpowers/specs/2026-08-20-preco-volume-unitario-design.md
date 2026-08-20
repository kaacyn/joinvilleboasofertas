# Preço com volume e valor unitário (JBO)

**Data:** 2026-08-20  
**Repos:** `dev-joinvilleboasofertas` (Nuxt), `dev-snap-api` (`apps.jbo_public`)  
**Ambiente:** develop (`joinvilleboasofertas-loc-app.cacin.dev`)

## Objetivo

Exibir o preço das ofertas no padrão de lojas online:

1. Preço principal com sufixo de volume da embalagem — ex.: `R$ 3,59/330ml`
2. Em tamanho menor, abaixo: valor de comparação — ex.: `R$ 1,09/100ml`, `R$ 0,53/100g` ou `R$ 2,50/un`

Em **todo lugar** do site público que mostra preço de oferta.

## Decisões confirmadas

| Tópico | Decisão |
| --- | --- |
| Abordagem | API expõe volume bruto + front formata (espelha Snap `unitPrice`) |
| Layout | Opção C: `R$ X/volume` na linha principal; unitário muted abaixo |
| Escopo de UI | Cards, página do produto (hero + “Onde encontrar”) e qualquer outro preço de oferta |
| Dados faltantes | Omitir só o pedaço ausente; não inventar volume nem unitário |
| Normalização | Sem mudança em `compute_price_volume_min` / regras de produto |

## Fora de escopo

- Recadastrar ou corrigir volumes faltantes no catálogo
- Alterar normalização de `price_volume_min`
- Ordenar ou filtrar por preço unitário
- Mudanças no app Snap (apenas reutilizar o padrão do formatter)
- Produção (`joinvilleboasofertas.com`) nesta entrega — só develop até validar

## API (`jbo_public`)

Campos **novos** em `JboOfferSchema` / `serialize_offer`:

| Campo | Origem | Notas |
| --- | --- | --- |
| `volume_value` | `product.volume_value` | `Decimal` ou `null` |
| `volume_unit` | `product.volume_unit` | `ml` \| `l` \| `g` \| `kg` \| `un` \| `bdj` \| `m` \| `""` |

Campos **já existentes** (permanecem):

| Campo | Uso |
| --- | --- |
| `price_volume_min` | Preço por base de comparação |
| `volume_unit_min` | `g` \| `ml` \| `un` \| `m` |
| `comparison_base` | `100` (peso/volume) ou `1` (un/m) |

Nenhuma label pré-formatada no backend.

## Front (Nuxt)

### Utilitários

Arquivo sugerido: `app/utils/unitPrice.ts` (portar ideia de `snap/src/utils/unitPrice.js`).

- `formatVolumeSuffix(volumeValue, volumeUnit)` → `330ml`, `1,35L`, `1kg`, `un`, `bdj`, `m`; `null` se inválido
- `formatUnitPrice({ priceVolumeMin, volumeUnitMin, comparisonBase })` → `R$ 1,09/100ml`, `R$ 2,50/un`, `R$ 0,0667/m` (4 casas só para `m`); `null` se incompleto
- `formatOfferPrice(offer)` → `R$ 3,59/330ml` ou `R$ 3,59` se não houver sufixo

Formatação numérica: `pt-BR`. Unidades de display: `L` maiúsculo para litros; demais minúsculas (`ml`, `g`, `kg`, `un`, `bdj`, `m`). Valor `1` + `un` → sufixo `un` (sem repetir `1un` se ficar redundante — preferir `/un`).

### Layout visual

```text
R$ 3,59/330ml          ← preço + sufixo (mesmo peso tipográfico do preço atual)
R$ 1,09/100ml          ← menor, cor muted
```

Badge de clube e “média R$ …” continuam na linha do preço principal (como hoje no `OfferCard`), sem alterar regras de economia/validade.

### Pontos de integração

| Superfície | Arquivo |
| --- | --- |
| Cards de oferta | `app/components/offers/OfferCard.vue` |
| Hero do produto | `app/pages/produto/[slug]/[[loja]].vue` |
| Lista “Onde encontrar” | mesmo arquivo (`row__price`) |
| Tipo `JboOffer` | `app/utils/jboApi.ts` |

Qualquer outro componente que venha a formatar `offer.price` deve usar os mesmos utils.

### Casos especiais

| Situação | Comportamento |
| --- | --- |
| Sem `volume_value`/`volume_unit` válidos | Só `R$ X` na linha principal |
| Sem trio de comparação | Sem linha unitária |
| Venda a granel (`kg` / `by_measure`) | Sufixo `/kg` (ou unidade de venda); unitário `/100g` quando `comparison_base=100` |
| Multipack com `volume_unit_min=un` | Unitário `R$/un`; sufixo principal conforme `volume_value`/`volume_unit` do produto |
| Nome do produto já contém “330ml” | Ainda assim mostrar `/330ml` no preço (padrão e-commerce) |

## Testes

- **API:** serialize inclui `volume_value` e `volume_unit` quando o produto tem cadastro
- **Unit (Nuxt):** `formatVolumeSuffix` / `formatUnitPrice` / `formatOfferPrice` para ml, L, g, kg, un, bdj, m e ausência de dados
- **UI:** `OfferCard` e página de produto contêm `/330ml` (ou equivalente) e `/100ml` (ou equivalente) quando o fixture tem os campos

## Critério de pronto

Na home e na página de produto, uma oferta com volume e normalização (ex.: Budweiser 330ml) mostra `R$ …/330ml` e, abaixo, `R$ …/100ml`. Oferta sem volume não quebra e não inventa sufixo.
