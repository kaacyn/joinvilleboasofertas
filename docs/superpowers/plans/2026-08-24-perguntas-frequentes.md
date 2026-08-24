# Perguntas frequentes (FAQ) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Página pública `/perguntas-frequentes` com FAQ em accordion (usuários + lojas), link no menu e no sitemap.

**Architecture:** Página Nuxt estática no padrão de `/termos`, conteúdo das Q&A no template, accordion com `<details>`/`<summary>`. Sem API/CMS.

**Tech Stack:** Nuxt 3 / Vue 3, Vitest (contratos por source)

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-24-perguntas-frequentes-design.md`
- Rota: `/perguntas-frequentes`
- Título: **Perguntas frequentes**
- Seções: **Para quem compra** e **Para lojas / comerciantes**
- UI: accordion; layout ~720px como termos/privacidade
- Copy inicial da spec (ajustes depois ok); sem jargão técnico/admin
- Link para `/envie-um-encarte` na seção de lojas
- Contato Instagram `@joinvilleboasofertas`
- Menu: item **Perguntas frequentes** junto a Termos/Privacidade
- Incluir path no sitemap estático do Nuxt

## File map

| Arquivo | Responsabilidade |
|---------|------------------|
| `app/pages/perguntas-frequentes.vue` | Página FAQ + accordion + SEO |
| `app/components/HeaderMenu.vue` | Link do menu |
| `server/routes/sitemap.xml.ts` | Path `/perguntas-frequentes` |
| `README.md` | Linha na tabela de rotas |
| `tests/perguntasFrequentesPage.spec.ts` | Contratos da página |
| `tests/navigationIntegration.spec.ts` | Link no menu |

---

### Task 1: Página `/perguntas-frequentes`

**Repo:** `/root/Docker/projetos/dev-joinvilleboasofertas`

**Files:**
- Create: `app/pages/perguntas-frequentes.vue`
- Create: `tests/perguntasFrequentesPage.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Produz: rota file-based `/perguntas-frequentes` com duas seções e 13 itens da spec em `<details>`

- [ ] **Step 1: Write the failing test**

Create `tests/perguntasFrequentesPage.spec.ts`:

```typescript
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
function source(path: string): string {
  return readFileSync(resolve(root, path), 'utf8')
}

describe('página Perguntas frequentes', () => {
  it('tem seções, accordion e links úteis', () => {
    const page = source('app/pages/perguntas-frequentes.vue')
    expect(page).toContain('Perguntas frequentes')
    expect(page).toContain('Para quem compra')
    expect(page).toContain('Para lojas / comerciantes')
    expect(page).toContain('<details')
    expect(page).toContain('<summary')
    expect(page).toContain('O que é o Joinville Boas Ofertas?')
    expect(page).toContain('Quais regras para o encarte ser divulgado')
    expect(page).toContain('to="/envie-um-encarte"')
    expect(page).toContain('instagram.com/joinvilleboasofertas')
    expect(page).not.toMatch(/API|Django|migration|rate.?limit|endpoint/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /root/Docker/projetos/dev-joinvilleboasofertas
npx vitest run tests/perguntasFrequentesPage.spec.ts
```

Expected: FAIL (página ausente).

- [ ] **Step 3: Implement the page**

Create `app/pages/perguntas-frequentes.vue`. Use layout/styles próximos a `termos.vue`. Incluir **todas** as 13 Q&A da spec verbatim (perguntas + respostas). Estrutura mínima:

```vue
<template>
  <div class="page">
    <AppHeader />
    <main class="page__main">
      <h1>Perguntas frequentes</h1>
      <p class="lead">
        Respostas rápidas para quem consulta ofertas e para lojas que querem aparecer no Joinville Boas Ofertas.
      </p>

      <section aria-labelledby="faq-compradores">
        <h2 id="faq-compradores">Para quem compra</h2>
        <!-- 7× <details class="faq"><summary>…</summary><p>…</p></details> -->
      </section>

      <section aria-labelledby="faq-lojas">
        <h2 id="faq-lojas">Para lojas / comerciantes</h2>
        <!-- item 8: incluir <NuxtLink to="/envie-um-encarte">Envie um encarte</NuxtLink> -->
        <!-- item 12: <a href="https://instagram.com/joinvilleboasofertas" …>@joinvilleboasofertas</a> -->
        <!-- demais itens 9–13 -->
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
useSeoMeta({
  title: 'Perguntas frequentes | Joinville Boas Ofertas',
  description: 'Dúvidas frequentes para quem compra e para lojas no Joinville Boas Ofertas.',
})
</script>
```

CSS sugerido (scoped):

```css
.page__main {
  max-width: 720px;
  margin: 0 auto;
  padding: 1.25rem 1rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}
h1 { margin: 0; font-size: 1.5rem; font-weight: 900; }
.lead { margin: 0; color: var(--muted); line-height: 1.5; }
h2 { margin: 0 0 0.65rem; font-size: 1.05rem; color: var(--yellow); }
.faq {
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--navy-light);
  padding: 0.55rem 0.85rem;
  margin: 0 0 0.5rem;
}
.faq summary {
  cursor: pointer;
  font-weight: 700;
  list-style: none;
}
.faq summary::-webkit-details-marker { display: none; }
.faq p {
  margin: 0.55rem 0 0.25rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.92rem;
}
.faq a { color: var(--yellow); }
```

Coloque o texto completo de cada resposta da spec dentro dos `<p>` (ou múltiplos `<p>` se necessário). No item 8, a frase que cita a página deve usar `NuxtLink` para `/envie-um-encarte`.

- [ ] **Step 4: Update README**

Add: `| \`/perguntas-frequentes\` | Perguntas frequentes (FAQ) |`

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/perguntasFrequentesPage.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/pages/perguntas-frequentes.vue tests/perguntasFrequentesPage.spec.ts README.md
git commit -m "$(cat <<'EOF'
feat: página Perguntas frequentes com accordion

EOF
)"
```

---

### Task 2: Menu + sitemap

**Repo:** `/root/Docker/projetos/dev-joinvilleboasofertas`

**Files:**
- Modify: `app/components/HeaderMenu.vue`
- Modify: `server/routes/sitemap.xml.ts`
- Modify: `tests/navigationIntegration.spec.ts`

**Interfaces:**
- Consome: rota `/perguntas-frequentes` da Task 1
- Produz: link de menu + path no sitemap fallback

- [ ] **Step 1: Extend navigation test (failing)**

In `tests/navigationIntegration.spec.ts`, no teste do HeaderMenu, adicionar:

```typescript
expect(headerMenu).toContain('to="/perguntas-frequentes"')
expect(headerMenu).toContain('Perguntas frequentes')
```

Opcional no mesmo arquivo ou em `perguntasFrequentesPage.spec.ts`:

```typescript
expect(source('server/routes/sitemap.xml.ts')).toContain('/perguntas-frequentes')
```

- [ ] **Step 2: Run to verify fail**

```bash
npx vitest run tests/navigationIntegration.spec.ts
```

Expected: FAIL nas novas asserts.

- [ ] **Step 3: Add menu link**

In `HeaderMenu.vue`, before Privacidade (or after Termos — prefer **antes de Privacidade**):

```vue
      <NuxtLink
        to="/perguntas-frequentes"
        class="hmenu__item"
        role="menuitem"
        @click="close"
      >
        Perguntas frequentes
      </NuxtLink>
```

- [ ] **Step 4: Add sitemap path**

In `server/routes/sitemap.xml.ts`, include `'/perguntas-frequentes'` in the default `paths` array and in any duplicate static list that also lists `/termos` / `/privacidade`.

- [ ] **Step 5: Run tests**

```bash
npx vitest run tests/perguntasFrequentesPage.spec.ts tests/navigationIntegration.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/HeaderMenu.vue server/routes/sitemap.xml.ts tests/navigationIntegration.spec.ts
git commit -m "$(cat <<'EOF'
feat: link FAQ no menu e no sitemap

EOF
)"
```

---

## Spec coverage (self-review)

| Spec | Task |
|------|------|
| Página + 2 seções + 13 itens | 1 |
| Accordion | 1 |
| Link envie-um-encarte + Instagram | 1 |
| Menu | 2 |
| Sitemap | 2 |
| Sem CMS/técnico | 1 (assert negativa no teste) |

Placeholders: nenhum. Nomes estáveis: `/perguntas-frequentes`, rótulos de seção da spec.
