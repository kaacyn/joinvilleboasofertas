# Atalho Ovos: Hortifruti + Mercearia — Design

**Data:** 2026-08-25  
**Status:** Aprovado em conversa (opção A: ambas as categorias)

## Objetivo

No atalho **Ovos** da home, além de buscar `q=Ovos`, filtrar pelas categorias **Hortifruti** e **Mercearia** (união), para incluir ovos cadastrados nas duas.

## Decisões

| Tema | Decisão |
|------|--------|
| Categorias do atalho Ovos | Hortifruti **e** Mercearia |
| Busca | Continua `q: 'Ovos'` |
| Modelo do atalho | `categoryName: string` → `categoryNames: string[]` |
| Demais atalhos | Um item no array (comportamento atual) |
| Toggle (clicar de novo) | Limpa `q` e `category_ids` (igual hoje) |
| Ativo | `q` igual **e** o mesmo conjunto de `category_ids` (ordem irrelevante) |
| UI / API | Sem mudança: já aceitam vários `category_ids` |

## Escopo

### Dentro

- `app/utils/storyShortcuts.ts`: tipo, lista estática, `shortcutToFilterPatch`, `isShortcutActive`
- `tests/storyShortcuts.spec.ts`: expectativas de Ovos com dois IDs; demais atalhos com um

### Fora

- Backend / facets
- UI dos Stories além do que o estado de filtros já reflete
- Mudança de copy ou imagem do atalho

## Comportamento

1. Clique em Ovos (inativo) → `q=Ovos`, `category_ids` = IDs de Hortifruti e Mercearia (os que existirem nas facets).
2. Clique de novo (ativo) → limpa busca e categorias.
3. Se uma das categorias não existir nas facets, aplica só as resolvidas; se nenhuma, `category_ids: []` com `q` ainda `Ovos`.

## Critérios de aceite

- Home: atalho Ovos seleciona Hortifruti e Mercearia no filtro de categorias.
- Feed/API recebe `category_ids` com os dois IDs (CSV).
- Outros atalhos inalterados.
- Testes unitários do util cobrem Ovos multi-categoria e toggle.
