# Atalho Ovos: Hortifruti + Mercearia — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao clicar no atalho Ovos na home, filtrar por `q=Ovos` e pelas categorias Hortifruti **e** Mercearia.

**Architecture:** Generalizar `StoryShortcut` de `categoryName: string` para `categoryNames: string[]`. `shortcutToFilterPatch` resolve todos os nomes para IDs; `isShortcutActive` compara conjuntos (ordem irrelevante). Ovos passa a `['Hortifruti', 'Mercearia']`; demais atalhos ficam com um item.

**Tech Stack:** Nuxt 4 / TypeScript (`dev-joinvilleboasofertas`), Vitest

**Spec:** `docs/superpowers/specs/2026-08-25-ovos-hortifruti-mercearia-design.md`

## Global Constraints

- Ovos: Hortifruti **e** Mercearia (não trocar, juntar)
- Demais atalhos: comportamento atual (uma categoria)
- Toggle ativo → limpa `q` e `category_ids`
- Não alterar UI/API além do util de atalhos e testes
- Preservar WIP alheio no working tree; stage só arquivos desta feature

## File map

| File | Responsibility |
|------|----------------|
| `app/utils/storyShortcuts.ts` | Tipo, lista estática, patch/active/toggle |
| `tests/storyShortcuts.spec.ts` | Expectativas TDD do util |

`StoryShortcuts.vue` / `index.vue` já consomem `nextShortcutPatch` / `isShortcutActive` — sem mudança obrigatória.

---

### Task 1: Multi-categoria em `storyShortcuts`

**Files:**
- Modify: `app/utils/storyShortcuts.ts`
- Modify: `tests/storyShortcuts.spec.ts`

**Interfaces:**
- Consumes: `FacetCategory`, `findCategoryId`, facets da home
- Produces:
  - `StoryShortcut.categoryNames: string[]`
  - `shortcutToFilterPatch(shortcut, categories): { q: string, category_ids: string[] }`
  - `isShortcutActive` / `nextShortcutPatch` com comparação de conjunto

- [ ] **Step 1: Atualizar testes para RED**

Em `tests/storyShortcuts.spec.ts`, trocar o caso de Ovos e o de toggle:

```ts
it('Ovos aplica busca e Hortifruti+Mercearia; Açougue só a categoria', () => {
  const ovos = STORY_SHORTCUTS.find(s => s.id === 'ovos')!
  const acougue = STORY_SHORTCUTS.find(s => s.id === 'acougue')!
  const empty = { q: '', category_ids: [] as string[] }

  expect(nextShortcutPatch(ovos, empty, facets)).toEqual({
    q: 'Ovos',
    category_ids: ['cat-horti', 'cat-merc'],
  })
  expect(nextShortcutPatch(acougue, empty, facets)).toEqual({
    q: '',
    category_ids: ['cat-acougue'],
  })
})

it('clicar de novo no atalho ativo limpa busca e categoria', () => {
  const ovos = STORY_SHORTCUTS.find(s => s.id === 'ovos')!
  const state = { q: 'Ovos', category_ids: ['cat-merc', 'cat-horti'] }
  expect(isShortcutActive(ovos, state, facets)).toBe(true)
  expect(nextShortcutPatch(ovos, state, facets)).toEqual({
    q: '',
    category_ids: [],
  })
})
```

Adicionar (ou ajustar) um assert da lista estática:

```ts
it('Ovos declara Hortifruti e Mercearia', () => {
  const ovos = STORY_SHORTCUTS.find(s => s.id === 'ovos')!
  expect(ovos.categoryNames).toEqual(['Hortifruti', 'Mercearia'])
})
```

- [ ] **Step 2: Rodar testes e confirmar RED**

Run: `npm test -- tests/storyShortcuts.spec.ts`

Expected: FAIL (ainda `categoryName` / só `cat-horti`)

- [ ] **Step 3: Implementar**

Em `app/utils/storyShortcuts.ts`:

1. Trocar o tipo:

```ts
export type StoryShortcut = {
  id: string
  label: string
  q: string
  categoryNames: string[]
  image: string
}
```

2. Atualizar `STORY_SHORTCUTS` — Ovos com duas categorias; demais com um item:

```ts
export const STORY_SHORTCUTS: StoryShortcut[] = [
  { id: 'ovos', label: 'Ovos', q: 'Ovos', categoryNames: ['Hortifruti', 'Mercearia'], image: '/shortcuts/ovos.webp' },
  { id: 'cafe', label: 'Café', q: 'Café', categoryNames: ['Mercearia'], image: '/shortcuts/cafe.webp' },
  { id: 'leite', label: 'Leite', q: 'Leite', categoryNames: ['Laticínios'], image: '/shortcuts/leite.webp' },
  { id: 'arroz', label: 'Arroz', q: 'Arroz', categoryNames: ['Mercearia'], image: '/shortcuts/arroz.webp' },
  { id: 'feijao', label: 'Feijão', q: 'Feijão', categoryNames: ['Mercearia'], image: '/shortcuts/feijao.webp' },
  { id: 'oleo', label: 'Óleo', q: 'Óleo', categoryNames: ['Mercearia'], image: '/shortcuts/oleo.webp' },
  { id: 'frango', label: 'Frango', q: 'Frango', categoryNames: ['Açougue'], image: '/shortcuts/frango.webp' },
  { id: 'acougue', label: 'Açougue', q: '', categoryNames: ['Açougue'], image: '/shortcuts/acougue.webp' },
]
```

3. Patch resolve todos os nomes (pula ausentes):

```ts
export function shortcutToFilterPatch(
  shortcut: StoryShortcut,
  categories: FacetCategory[],
): { q: string, category_ids: string[] } {
  const category_ids = shortcut.categoryNames
    .map(name => findCategoryId(categories, name))
    .filter((id): id is string => Boolean(id))
  return {
    q: shortcut.q,
    category_ids,
  }
}
```

4. Ativo = mesmo `q` e mesmo conjunto de IDs (ordem irrelevante):

```ts
export function isShortcutActive(
  shortcut: StoryShortcut,
  state: { q: string, category_ids: string[] },
  categories: FacetCategory[],
): boolean {
  const patch = shortcutToFilterPatch(shortcut, categories)
  if ((state.q || '') !== patch.q) return false
  if (patch.category_ids.length !== state.category_ids.length) return false
  if (patch.category_ids.length === 0) return true
  const want = new Set(patch.category_ids)
  return state.category_ids.every(id => want.has(id))
}
```

`nextShortcutPatch` permanece igual (usa `isShortcutActive` + `shortcutToFilterPatch`).

- [ ] **Step 4: Rodar testes e confirmar GREEN**

Run: `npm test -- tests/storyShortcuts.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add app/utils/storyShortcuts.ts tests/storyShortcuts.spec.ts
git commit -m "$(cat <<'EOF'
feat: atalho Ovos filtra Hortifruti e Mercearia

EOF
)"
```

---

## Self-review (plan vs spec)

| Spec | Task |
|------|------|
| Ovos → Hortifruti + Mercearia | Task 1 Step 3 lista |
| `categoryNames: string[]` | Task 1 Steps 1–3 |
| Toggle limpa | Task 1 teste + `nextShortcutPatch` |
| Ativo ordem-irrelevante | Task 1 `isShortcutActive` + teste com `cat-merc, cat-horti` |
| Demais atalhos intactos | Task 1 lista com um item cada |
| Fora de escopo UI/API | Nenhum outro arquivo no commit |
