# Renomear mercado/estabelecimentos → loja

**Data:** 2026-08-16  
**Status:** Aprovado em conversa; aguardando revisão do arquivo

## Objetivo

Uniformizar a linguagem do site público Joinville Boas Ofertas: no menu, nos filtros e nas URLs, usar **loja / lojas** no lugar de **mercado / mercados** e **estabelecimento / estabelecimentos**.

## Decisão

- Sem redirects das URLs antigas (versão ainda não está em produção).
- Sem alteração dos nomes de campos da API (`establishment_slug`, etc.).
- Sem reescrita ampla de textos jurídicos ou SEO genéricos que não sejam labels de navegação/filtro.

## Rotas

| Antes | Depois |
|-------|--------|
| `/estabelecimentos` | `/lojas` |
| `/mercado/{slug}` | `/loja/{slug}` |

Arquivos de página:

- `app/pages/estabelecimentos.vue` → `app/pages/lojas.vue`
- `app/pages/mercado/[slug].vue` → `app/pages/loja/[slug].vue`

## UI (copy)

| Onde | Antes (exemplos) | Depois |
|------|------------------|--------|
| Menu (`HeaderMenu`) | Estabelecimentos | Lojas |
| Filtro desktop (`FilterBar`) | Mercados, buscar supermercado | Lojas, buscar loja |
| Filtro mobile (`FiltersSheet`) | idem | idem |
| Busca (`SearchBar`) | produto ou mercado | produto ou loja |
| Página de listagem | Estabelecimentos / textos de estabelecimento | Lojas / textos de loja |
| Página de detalhe | mercado | loja |
| Cards e links de oferta | `/mercado/...` | `/loja/...` |

## Outros pontos de integração

- `server/routes/sitemap.xml.ts`: paths estáticos `/lojas` no lugar de `/estabelecimentos`.
- Links internos (`OfferCard`, `oferta/[id].vue`, listagem de lojas): apontar para `/loja/{slug}`.
- README / docs operacionais da árvore de rotas: atualizar tabela de rotas se listar as URLs públicas.

## Fora de escopo

- Redirects 301/302 de `/estabelecimentos` e `/mercado/*`.
- Renomear contratos da API Snap / JBO.
- Alterar `prd-joinvilleboasofertas` ou outros ambientes além do app Nuxt em `dev-joinvilleboasofertas`.
- Reescrever docs históricas de spec/plano (2026-08-12) salvo se necessário para não confundir implementação futura.

## Critérios de sucesso

1. Menu e filtros exibem “Lojas” (e variantes coerentes de “loja”).
2. Navegação funciona em `/lojas` e `/loja/{slug}`.
3. Não restam links internos para `/estabelecimentos` ou `/mercado/`.
4. Sitemap lista `/lojas`.
5. Build/deploy do container Nuxt de desenvolvimento reflete as novas rotas.
